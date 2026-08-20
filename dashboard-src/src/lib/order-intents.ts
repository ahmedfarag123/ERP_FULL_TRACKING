import { supabase } from "./supabase";

export type OrderIntentStatus = "pending" | "reviewing" | "converted" | "dismissed" | "cancelled";

export type OrderIntentSelectedProfile = {
  customer_type_key?: string;
  customer_type_name_ar?: string;
  speciality_key?: string;
  speciality_name_ar?: string;
  brand_key?: string;
  brand_name_ar?: string;
  category_key?: string;
  category_name_ar?: string;
  subcategory_key?: string;
  subcategory_name_ar?: string;
  product_external_id?: string;
  product_name?: string;
  matched_product_count?: number;
  in_stock_product_count?: number;
  total_quantity_on_hand?: number;
  low_stock_product_names?: string[];
};

export interface OrderIntentRow {
  id: string;
  visit_id: string | null;
  customer_id: string;
  sales_profile_id: string;
  status: OrderIntentStatus;
  priority: "low" | "medium" | "high" | "urgent";
  summary: string;
  estimated_value: number | string | null;
  requested_delivery_date: string | null;
  decision_maker_status: string | null;
  interest_level: string | null;
  next_action: string;
  selected_customer_profiles: OrderIntentSelectedProfile[] | null;
  admin_notes: string | null;
  converted_order_id: string | null;
  created_at: string;
  updated_at: string;
  customer_name?: string | null;
  sales_rep_name?: string | null;
}

type CustomerRow = {
  id: string;
  customer_name: string | null;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
  email: string | null;
};

function uniqueIds(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value))));
}

export async function fetchOrderIntents(status: OrderIntentStatus | "all" = "pending") {
  let query = supabase
    .from("order_intents")
    .select(
      "id, visit_id, customer_id, sales_profile_id, status, priority, summary, estimated_value, requested_delivery_date, decision_maker_status, interest_level, next_action, selected_customer_profiles, admin_notes, converted_order_id, created_at, updated_at",
    )
    .order("created_at", { ascending: false })
    .limit(100);

  if (status !== "all") {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const intents = (data ?? []) as OrderIntentRow[];
  const customerIds = uniqueIds(intents.map((intent) => intent.customer_id));
  const profileIds = uniqueIds(intents.map((intent) => intent.sales_profile_id));

  const [customersRes, profilesRes] = await Promise.all([
    customerIds.length
      ? supabase.from("customers").select("id, customer_name").in("id", customerIds)
      : Promise.resolve({ data: [], error: null }),
    profileIds.length
      ? supabase.from("profiles").select("id, full_name, email").in("id", profileIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (customersRes.error) throw new Error(customersRes.error.message);
  if (profilesRes.error) throw new Error(profilesRes.error.message);

  const customerById = new Map(((customersRes.data ?? []) as CustomerRow[]).map((row) => [row.id, row]));
  const profileById = new Map(((profilesRes.data ?? []) as ProfileRow[]).map((row) => [row.id, row]));

  return intents.map((intent) => {
    const profile = profileById.get(intent.sales_profile_id);
    return {
      ...intent,
      customer_name: customerById.get(intent.customer_id)?.customer_name ?? null,
      sales_rep_name: profile?.full_name ?? profile?.email ?? null,
    };
  });
}

export async function updateOrderIntentStatus(input: {
  id: string;
  status: OrderIntentStatus;
  adminNotes?: string | null;
  convertedOrderId?: string | null;
}) {
  const resolvedAt = ["converted", "dismissed", "cancelled"].includes(input.status)
    ? new Date().toISOString()
    : null;

  const { error } = await supabase
    .from("order_intents")
    .update({
      status: input.status,
      admin_notes: input.adminNotes ?? null,
      converted_order_id: input.convertedOrderId ?? null,
      resolved_at: resolvedAt,
    })
    .eq("id", input.id);

  if (error) throw new Error(error.message);
}
