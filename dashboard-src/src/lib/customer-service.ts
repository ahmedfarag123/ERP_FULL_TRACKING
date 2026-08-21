import { supabase } from "./supabase";

// ─── Types ───────────────────────────────────────────────────────────────────

export type TicketStatus = "open" | "pending" | "in_progress" | "resolved" | "closed";
export type TicketPriority = "low" | "medium" | "high" | "urgent";

export interface OrderTicket {
  id: string;
  order_id: string;
  customer_id: string | null;
  subject: string;
  description: string | null;
  status: TicketStatus;
  priority: TicketPriority;
  category: string | null;
  assigned_to: string | null;
  created_by: string;
  resolved_at: string | null;
  closed_at: string | null;
  raw_payload: unknown;
  created_at: string;
  updated_at: string;
}

export interface TicketComment {
  id: string;
  ticket_id: string;
  author_id: string;
  body: string;
  is_internal: boolean;
  created_at: string;
}

export interface TicketWithDetails extends OrderTicket {
  order_number: string | null;
  order_customer_name: string | null;
  order_amount: number | null;
  order_delivery_status: string | null;
  order_commitment_date: string | null;
  creator_name: string | null;
  assignee_name: string | null;
  comment_count: number;
}

// ─── Options ─────────────────────────────────────────────────────────────────

export const TICKET_STATUS_OPTIONS: { value: TicketStatus; label: string }[] = [
  { value: "open", label: "مفتوح" },
  { value: "pending", label: "معلق" },
  { value: "in_progress", label: "قيد المعالجة" },
  { value: "resolved", label: "تم الحل" },
  { value: "closed", label: "مغلق" },
];

export const TICKET_PRIORITY_OPTIONS: { value: TicketPriority; label: string }[] = [
  { value: "low", label: "منخفضة" },
  { value: "medium", label: "متوسطة" },
  { value: "high", label: "عالية" },
  { value: "urgent", label: "عاجلة" },
];

export const TICKET_CATEGORY_OPTIONS: { value: string; label: string }[] = [
  { value: "delivery_issue", label: "مشكلة في التسليم" },
  { value: "order_change", label: "تغيير الطلب" },
  { value: "payment_issue", label: "مشكلة في الدفع" },
  { value: "product_quality", label: "جودة المنتج" },
  { value: "return_request", label: "طلب إرجاع" },
  { value: "customer_complaint", label: "شكوى عميل" },
  { value: "inquiry", label: "استفسار" },
  { value: "other", label: "أخرى" },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function resolveStatusTone(status: TicketStatus) {
  switch (status) {
    case "open":
      return { label: "مفتوح", tone: "blue" as const };
    case "pending":
      return { label: "معلق", tone: "yellow" as const };
    case "in_progress":
      return { label: "قيد المعالجة", tone: "purple" as const };
    case "resolved":
      return { label: "تم الحل", tone: "green" as const };
    case "closed":
      return { label: "مغلق", tone: "gray" as const };
  }
}

export function resolvePriorityTone(priority: TicketPriority) {
  switch (priority) {
    case "low":
      return { label: "منخفضة", tone: "gray" as const };
    case "medium":
      return { label: "متوسطة", tone: "blue" as const };
    case "high":
      return { label: "عالية", tone: "orange" as const };
    case "urgent":
      return { label: "عاجلة", tone: "red" as const };
  }
}

export function formatOptionLabel(
  options: { value: string; label: string }[],
  value: string | null | undefined,
) {
  if (!value) return null;
  return options.find((o) => o.value === value)?.label ?? value;
}

// ─── Data Fetching ───────────────────────────────────────────────────────────

export async function fetchTickets(filters?: {
  status?: TicketStatus | "all";
  priority?: TicketPriority | "all";
  assignedTo?: string;
  search?: string;
  limit?: number;
  offset?: number;
}) {
  const limit = filters?.limit ?? 50;
  const offset = filters?.offset ?? 0;

  let query = supabase
    .from("order_tickets")
    .select(
      `
      *,
      order:orders(id, odoo_order_name, external_order_id, customer_name, total_amount, delivery_status, commitment_date),
      creator:profiles!order_tickets_created_by_fkey(full_name),
      assignee:profiles!order_tickets_assigned_to_fkey(full_name),
      comments:order_ticket_comments(count)
    `,
      { count: "exact" },
    )
    .order("created_at", { ascending: false });

  if (filters?.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }
  if (filters?.priority && filters.priority !== "all") {
    query = query.eq("priority", filters.priority);
  }
  if (filters?.assignedTo) {
    query = query.eq("assigned_to", filters.assignedTo);
  }
  if (filters?.search) {
    const term = filters.search.trim().toLowerCase();
    const conditions = [`subject.ilike.%${term}%`, `description.ilike.%${term}%`];
    // Also search by order number: find matching order IDs first
    const { data: matchedOrders } = await supabase
      .from("orders")
      .select("id")
      .or(`odoo_order_name.ilike.%${term}%,external_order_id.ilike.%${term}%,customer_name.ilike.%${term}%`)
      .limit(500);
    const matchedOrderIds = (matchedOrders ?? []).map((o: { id: string }) => o.id);
    if (matchedOrderIds.length > 0) {
      conditions.push(`order_id.in.(${matchedOrderIds.join(",")})`);
    }
    query = query.or(conditions.join(","));
  }

  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;
  if (error) throw error;

  const tickets: TicketWithDetails[] = (data ?? []).map((row: Record<string, unknown>) => {
    const order = row.order as Record<string, unknown> | null;
    const creator = row.creator as Record<string, unknown> | null;
    const assignee = row.assignee as Record<string, unknown> | null;
    const comments = row.comments as Array<{ count: number }> | undefined;
    return {
      ...(row as unknown as OrderTicket),
      order_number: (order?.odoo_order_name as string) || (order?.external_order_id as string) || null,
      order_customer_name: (order?.customer_name as string) || null,
      order_amount: (order?.total_amount as number) ?? null,
      order_delivery_status: (order?.delivery_status as string) || null,
      order_commitment_date: (order?.commitment_date as string) || null,
      creator_name: (creator?.full_name as string) || null,
      assignee_name: (assignee?.full_name as string) || null,
      comment_count: comments?.[0]?.count ?? 0,
    };
  });

  return { tickets, total: count ?? 0 };
}

export async function fetchTicketById(ticketId: string) {
  const { data, error } = await supabase
    .from("order_tickets")
    .select(
      `
      *,
      order:orders(id, odoo_order_name, external_order_id, customer_name, customer_id, total_amount, delivery_status, commitment_date),
      creator:profiles!order_tickets_created_by_fkey(full_name, email),
      assignee:profiles!order_tickets_assigned_to_fkey(full_name, email)
    `,
    )
    .eq("id", ticketId)
    .single();

  if (error) throw error;
  return data as Record<string, unknown>;
}

export async function fetchTicketComments(ticketId: string) {
  const { data, error } = await supabase
    .from("order_ticket_comments")
    .select(
      `
      *,
      author:profiles!order_ticket_comments_author_id_fkey(full_name, email, avatar_url)
    `,
    )
    .eq("ticket_id", ticketId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as Array<TicketComment & { author: Record<string, unknown> }>;
}

export async function fetchAssignableUsers() {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, email, role")
    .eq("status", "active")
    .order("full_name", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function fetchOrdersForTicket() {
  const { data, error } = await supabase
    .from("orders")
    .select("id, odoo_order_name, external_order_id, customer_name, total_amount, delivery_status, create_date")
    .not("odoo_order_name", "is", null)
    .order("create_date", { ascending: false })
    .limit(20000);

  if (error) throw error;
  return data ?? [];
}

// ─── Mutations ───────────────────────────────────────────────────────────────

export async function createTicket(input: {
  orderId: string;
  customerId?: string | null;
  subject: string;
  description?: string;
  priority: TicketPriority;
  category?: string;
  assignedTo?: string | null;
  createdBy: string;
  dueDate?: string | null;
}) {
  const { data, error } = await supabase
    .from("order_tickets")
    .insert({
      order_id: input.orderId,
      customer_id: input.customerId ?? null,
      subject: input.subject,
      description: input.description ?? null,
      priority: input.priority,
      category: input.category ?? null,
      assigned_to: input.assignedTo ?? null,
      created_by: input.createdBy,
      status: "open",
      raw_payload: input.dueDate ? { due_date: input.dueDate } : null,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data as unknown as OrderTicket;
}

export async function updateTicketStatus(ticketId: string, status: TicketStatus) {
  const updatePayload: Record<string, unknown> = { status };
  if (status === "resolved") updatePayload.resolved_at = new Date().toISOString();
  if (status === "closed") updatePayload.closed_at = new Date().toISOString();

  const { error } = await supabase
    .from("order_tickets")
    .update(updatePayload)
    .eq("id", ticketId);

  if (error) throw error;
}

export async function assignTicket(ticketId: string, assignedTo: string | null) {
  const { error } = await supabase
    .from("order_tickets")
    .update({ assigned_to: assignedTo })
    .eq("id", ticketId);

  if (error) throw error;
}

export async function addTicketComment(input: {
  ticketId: string;
  authorId: string;
  body: string;
  isInternal?: boolean;
}) {
  const { data, error } = await supabase
    .from("order_ticket_comments")
    .insert({
      ticket_id: input.ticketId,
      author_id: input.authorId,
      body: input.body,
      is_internal: input.isInternal ?? false,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data as TicketComment;
}

export async function updateTicket(ticketId: string, updates: {
  subject?: string;
  description?: string;
  priority?: TicketPriority;
  category?: string;
  assignedTo?: string | null;
}) {
  const updatePayload: Record<string, unknown> = {};
  if (updates.subject !== undefined) updatePayload.subject = updates.subject;
  if (updates.description !== undefined) updatePayload.description = updates.description;
  if (updates.priority !== undefined) updatePayload.priority = updates.priority;
  if (updates.category !== undefined) updatePayload.category = updates.category;
  if (updates.assignedTo !== undefined) updatePayload.assigned_to = updates.assignedTo;

  const { error } = await supabase
    .from("order_tickets")
    .update(updatePayload)
    .eq("id", ticketId);

  if (error) throw error;
}

export async function fetchTicketStats() {
  const { data, error } = await supabase
    .from("order_tickets")
    .select("status, priority");

  if (error) throw error;

  const rows = data ?? [];
  return {
    total: rows.length,
    open: rows.filter((r) => r.status === "open").length,
    pending: rows.filter((r) => r.status === "pending").length,
    inProgress: rows.filter((r) => r.status === "in_progress").length,
    resolved: rows.filter((r) => r.status === "resolved").length,
    closed: rows.filter((r) => r.status === "closed").length,
    urgent: rows.filter((r) => r.priority === "urgent").length,
  };
}
