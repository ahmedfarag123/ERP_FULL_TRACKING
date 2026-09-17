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
  scope?: TicketScope;
  assigned_departments?: string[];
  assigned_user_ids?: string[];
}

export type TicketScope = "order" | "products";

export interface TicketItem {
  id: string;
  ticket_id: string;
  order_line_item_id: string | null;
  product_name: string;
  product_code: string | null;
  category: string | null;
  priority: TicketPriority;
  description: string | null;
  due_date: string | null;
  assigned_departments: string[];
  assigned_user_ids: string[];
  status: TicketStatus;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderLineItemOption {
  id: string;
  product_name: string;
  product_code: string | null;
  ordered_quantity: number;
  unit_price: number;
  total_amount: number;
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
  searchTerm?: string;
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
  if (filters?.search || filters?.searchTerm) {
    const term = (filters.search || filters.searchTerm || "").trim();
    if (term) {
      const cleanTerm = term.replace(/^#/, "").toLowerCase();
      const { data: rpcIds } = await supabase.rpc("search_tickets", { p_term: cleanTerm }).select("id").limit(500);
      const rpcArray = Array.isArray(rpcIds) ? rpcIds : rpcIds ? [rpcIds] : [];
      const matchedIds = rpcArray.map((r: { id: string }) => r.id);
      if (matchedIds.length > 0) {
        query = query.in("id", matchedIds);
      } else {
        query = query.eq("id", "00000000-0000-0000-0000-000000000000");
      }
    }
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
      order_number: (order?.odoo_order_name as string) || (order?.external_order_id as string) || (row.raw_payload as Record<string, unknown>)?.order_reference as string || (row.raw_payload as Record<string, unknown>)?.order_name as string || null,
      order_customer_name: (order?.customer_name as string) || (row.raw_payload as Record<string, unknown>)?.customer_name_xl as string || (row.raw_payload as Record<string, unknown>)?.customer_name as string || (row.assigned_to_full_name as string) || null,
      order_amount: (order?.total_amount as number) ?? null,
      order_delivery_status: (order?.delivery_status as string) || null,
      order_commitment_date: (order?.commitment_date as string) || (row.raw_payload as Record<string, unknown>)?.due_date_excel as string || (row.raw_payload as Record<string, unknown>)?.due_date as string || null,
      creator_name: (creator?.full_name as string) || (row.raw_payload as Record<string, unknown>)?.created_by_name as string || null,
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
  scope?: TicketScope;
  assignedDepartments?: string[];
  assignedUserIds?: string[];
  items?: Array<{
    orderLineItemId: string;
    productName: string;
    productCode?: string;
    category?: string;
    priority: TicketPriority;
    description?: string;
    assignedDepartments?: string[];
    assignedUserIds?: string[];
  }>;
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
      scope: input.scope ?? "order",
      assigned_departments: input.assignedDepartments ?? [],
      assigned_user_ids: input.assignedUserIds ?? [],
      raw_payload: input.dueDate ? { due_date: input.dueDate } : null,
    })
    .select("*")
    .single();

  if (error) throw error;
  const ticket = data as unknown as OrderTicket;

  if (input.items && input.items.length > 0) {
    const ticketItems = input.items.map((item) => ({
      ticket_id: ticket.id,
      order_line_item_id: item.orderLineItemId,
      product_name: item.productName,
      product_code: item.productCode ?? null,
      category: item.category ?? null,
      priority: item.priority,
      description: item.description ?? null,
      assigned_departments: item.assignedDepartments ?? [],
      assigned_user_ids: item.assignedUserIds ?? [],
      status: "open" as const,
    }));

    const { error: itemsError } = await supabase
      .from("ticket_items")
      .insert(ticketItems);
    if (itemsError) throw itemsError;
  }

  return ticket;
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

export async function fetchOrderLineItems(orderId: string): Promise<OrderLineItemOption[]> {
  const { data, error } = await supabase
    .from("order_line_items")
    .select("id, product_name, product_code, ordered_quantity, unit_price, total_amount, display_type")
    .eq("order_id", orderId)
    .is("display_type", null)
    .gte("ordered_quantity", 1)
    .order("sort_order");
  if (error) throw error;
  return (data ?? []) as OrderLineItemOption[];
}

export async function fetchTicketItems(ticketId: string): Promise<TicketItem[]> {
  const { data, error } = await supabase
    .from("ticket_items")
    .select("*")
    .eq("ticket_id", ticketId)
    .order("created_at");
  if (error) throw error;
  return (data ?? []) as TicketItem[];
}

export async function fetchTicketsForExport(filters?: {
  status?: TicketStatus | "all";
  priority?: TicketPriority | "all";
  search?: string;
  searchTerm?: string;
}) {
  const term = (filters?.search || filters?.searchTerm || "").trim().toLowerCase();
  let query = supabase
    .from("order_tickets")
    .select("id, subject, description, status, priority, category, created_at, updated_at, resolved_at, closed_at, order:orders(id, odoo_order_name, external_order_id, customer_name, total_amount, delivery_status), creator:profiles!order_tickets_created_by_fkey(full_name), assignee:profiles!order_tickets_assigned_to_fkey(full_name)")
    .order("created_at", { ascending: false });
  if (filters?.status && filters.status !== "all") query = query.eq("status", filters.status);
  if (filters?.priority && filters.priority !== "all") query = query.eq("priority", filters.priority);
  if (term) {
    query = query.or(`subject.ilike.%${term}%,description.ilike.%${term}%`);
  }
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function deleteTicket(ticketId: string) {
  const { error } = await supabase.from("order_tickets").delete().eq("id", ticketId);
  if (error) throw error;
}

export interface CustomerServiceProductStat {
  product_code: string | null;
  product_name: string;
  ticket_count: number;
  order_count: number;
  tickets: Array<{ id: string; subject: string; status: string; created_at: string }>;
}

function chunkValues<T>(values: T[], size = 200) {
  const chunks: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }
  return chunks;
}

export async function fetchCustomerServiceProductAnalytics(startISO: string, endISO: string): Promise<CustomerServiceProductStat[]> {
  // 1) Tickets in range with order reference
  const { data: ticketRows, error: ticketError } = await supabase
    .from("order_tickets")
    .select("id, subject, status, created_at, order_id")
    .gte("created_at", startISO)
    .lte("created_at", endISO);
  if (ticketError) throw ticketError;
  const tickets = (ticketRows ?? []) as Array<{ id: string; subject: string; status: string; created_at: string; order_id: string | null }>;

  const orderIds = Array.from(new Set(tickets.map((t) => t.order_id).filter((x): x is string => Boolean(x))));

  // 2) Order lines (products) for the linked orders
  const orderIdIndex = (id: string | null) => id;

  // Group line items by order_id
  const linesByOrder = new Map<string, Array<{ product_code: string | null; product_name: string }>>();
  for (const chunk of chunkValues(orderIds)) {
    const { data, error } = await supabase
      .from("order_line_items")
      .select("order_id, product_code, product_name, display_type, ordered_quantity")
      .in("order_id", chunk);
    if (error) throw error;
    for (const row of (data ?? []) as Array<{ order_id: string; product_code: string | null; product_name: string; display_type?: string | null; ordered_quantity?: number | null }>) {
      const displayType = String(row.display_type ?? "").trim();
      if (displayType && displayType !== "product") continue;
      if (Number(row.ordered_quantity ?? 0) <= 0) continue;
      const name = String(row.product_name ?? "").trim();
      if (!name) continue;
      const existing = linesByOrder.get(row.order_id) ?? [];
      existing.push({ product_code: row.product_code, product_name: name });
      linesByOrder.set(row.order_id, existing);
    }
  }

  // 3) Aggregate by product (key = code if present else normalized name)
  const productMap = new Map<string, CustomerServiceProductStat>();
  const keyFor = (line: { product_code: string | null; product_name: string }) => {
    const code = (line.product_code ?? "").trim();
    if (code) return `code:${code}`;
    return `name:${line.product_name}`;
  };

  for (const ticket of tickets) {
    if (!ticket.order_id) continue;
    const orderKey = orderIdIndex(ticket.order_id);
    const lines = linesByOrder.get(orderKey ?? "");
    if (!lines) continue;
    for (const line of lines) {
      const key = keyFor(line);
      let stat = productMap.get(key);
      if (!stat) {
        stat = {
          product_code: line.product_code,
          product_name: line.product_name,
          ticket_count: 0,
          order_count: 0,
          tickets: [],
        };
        productMap.set(key, stat);
      }
      const isNewTicket = !stat.tickets.some((t) => t.id === ticket.id);
      if (isNewTicket) {
        stat.ticket_count += 1;
        stat.tickets.push({ id: ticket.id, subject: ticket.subject, status: ticket.status, created_at: ticket.created_at });
      }
    }
  }

  // Order count: unique orders per product
  const orderCountMap = new Map<string, Set<string>>();
  for (const ticket of tickets) {
    if (!ticket.order_id) continue;
    const lines = linesByOrder.get(orderIdIndex(ticket.order_id) ?? "");
    if (!lines) continue;
    for (const line of lines) {
      const key = keyFor(line);
      let set = orderCountMap.get(key);
      if (!set) { set = new Set(); orderCountMap.set(key, set); }
      set.add(ticket.order_id);
    }
  }
  for (const [key, stat] of productMap) {
    stat.order_count = orderCountMap.get(key)?.size ?? 0;
  }

  return Array.from(productMap.values())
    .sort((a, b) => b.ticket_count - a.ticket_count)
    .slice(0, 20);
}

export async function fetchCustomerServiceAnalytics(startISO: string, endISO: string) {
  const [categoryRes, deptRes, deliveryRes, dailyRes, agentRes, ticketRows] = await Promise.all([
    supabase.from("order_tickets").select("category").gte("created_at", startISO).lte("created_at", endISO),
    supabase.from("order_tickets").select("assigned_departments").gte("created_at", startISO).lte("created_at", endISO),
    supabase.from("order_tickets").select("order:orders(delivery_status), raw_payload").gte("created_at", startISO).lte("created_at", endISO),
    supabase.from("order_tickets").select("created_at").gte("created_at", startISO).lte("created_at", endISO),
    supabase.from("order_tickets").select("created_by, status, resolved_at, created_at").gte("created_at", startISO).lte("created_at", endISO),
    supabase.from("order_tickets")
      .select("id, status, created_at, resolved_at, closed_at")
      .gte("created_at", startISO)
      .lte("created_at", endISO),
  ]);
  const isResolved = (row: { status: string; resolved_at: string | null; closed_at: string | null }) =>
    row.status === "resolved" || row.status === "closed" || Boolean(row.resolved_at || row.closed_at);
  const rangeStart = new Date(startISO).getTime();
  const rangeEnd = new Date(endISO).getTime();
  const tickets = ((ticketRows?.data ?? []) as Array<{ id: string; status: string; created_at: string; resolved_at: string | null; closed_at: string | null }>)
    .filter((row) => {
      if (row.status === "resolved" || row.status === "closed") return true;
      const t = new Date(row.created_at).getTime();
      return Number.isFinite(t) && t >= rangeStart && t <= rangeEnd;
    });
  const total = tickets.length;
  const resolved = tickets.filter(isResolved).length;
  const categoryRows = (categoryRes.data ?? []) as Array<{ category: string | null }>;
  const byCategory: Record<string, number> = {};
  for (const row of categoryRows) { const key = row.category || "other"; byCategory[key] = (byCategory[key] || 0) + 1; }
  const deptRows = (deptRes.data ?? []) as Array<{ assigned_departments: string[] | null }>;
  const byDepartment: Record<string, number> = {};
  for (const row of deptRows) { for (const d of (row.assigned_departments ?? [])) { byDepartment[d] = (byDepartment[d] || 0) + 1; } }
  const deliveryRows = (deliveryRes.data ?? []) as Array<{ order: { delivery_status: string | null } | { delivery_status: string | null }[] | null; raw_payload: Record<string, unknown> | null }>;
  const byDelivery: Record<string, number> = {};
  const deliveryLabels: Record<string, string> = { full: "تم بالكامل", partial: "ارجاع جزئي", cancelled: "ارجاع كلي", pending: "قيد الانتظار", other_delivery: "أخرى", unknown: "غير معروف" };
  for (const row of deliveryRows) {
    const o = Array.isArray(row.order) ? row.order[0] : row.order;
    const xlStatus = row.raw_payload?.delivery_status_xl;
    let key = "unknown";
    if (xlStatus) {
      if (xlStatus === "بالكامل") key = "full";
      else if (xlStatus === "مرتجع جزئى") key = "partial";
      else if (["مرتجع كلى بعد الوصول","مرتجع كلى قبل الوصول","مرتجع كلي","مرتجع كلى","الغاء","مرتجع"].includes(String(xlStatus))) key = "cancelled";
      else key = "other_delivery";
    } else {
      key = o?.delivery_status || "unknown";
      if (key === "false") key = "cancelled";
    }
    byDelivery[key] = (byDelivery[key] || 0) + 1;
  }
  const dailyRows = (dailyRes.data ?? []) as Array<{ created_at: string }>;
  const byDay: Record<string, number> = {};
  for (const row of dailyRows) { const day = row.created_at.slice(0, 10); byDay[day] = (byDay[day] || 0) + 1; }
  const agentRows = (agentRes.data ?? []) as Array<{ created_by: string; status: string; resolved_at: string | null; created_at: string }>;
  const agentMap: Record<string, { total: number; resolved: number; totalTime: number; count: number }> = {};
  for (const row of agentRows) { const a = row.created_by; if (!agentMap[a]) agentMap[a] = { total: 0, resolved: 0, totalTime: 0, count: 0 }; agentMap[a].total++; if (row.status === "resolved" || row.status === "closed") { agentMap[a].resolved++; if (row.resolved_at) { agentMap[a].totalTime += new Date(row.resolved_at).getTime() - new Date(row.created_at).getTime(); agentMap[a].count++; } } }
  return { total, resolved, percentage: total > 0 ? Math.round((resolved / total) * 100) : 0, byCategory, byDepartment, byDelivery, byDay, agentMap, deliveryLabels };
}

