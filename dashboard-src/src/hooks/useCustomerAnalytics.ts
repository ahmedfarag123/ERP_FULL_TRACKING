import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";

export interface CustomerAnalytics {
  firstTimePurchasers: number;
  firstTimePurchasersLastMonth: number;
  lostCustomers: number;
  lostCustomersLastMonth: number;
  newlyCreatedCustomers: number;
  newlyCreatedCustomersLastMonth: number;
}

function monthStart(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1).toISOString();
}

function monthEnd(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999).toISOString();
}

function prevMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() - 1, 1);
}

function twoMonthsAgo(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() - 2, 1);
}

function parseDate(value: string | null | undefined) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getOrderActivityDate(order: OrderCustomerDateRow) {
  return parseDate(order.order_date ?? order.create_date ?? order.created_at);
}

function isWithin(date: Date | null, fromIso: string, toIso: string) {
  const time = date?.getTime();
  return Number.isFinite(time) && time! >= Date.parse(fromIso) && time! <= Date.parse(toIso);
}

type OrderCustomerDateRow = {
  id: string;
  customer_id: string | null;
  created_at: string;
  order_date: string | null;
  create_date: string | null;
};

async function fetchOrderCustomerDates(): Promise<OrderCustomerDateRow[]> {
  const rows: OrderCustomerDateRow[] = [];
  let from = 0;
  const PAGE = 1000;

  while (true) {
    const { data, error } = await supabase
      .from("orders")
      .select("id, customer_id, created_at, order_date, create_date")
      .not("customer_id", "is", null)
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .range(from, from + PAGE - 1);

    if (error) {
      throw new Error(`Customer analytics orders query failed: ${error.message}`);
    }

    const batch = (data ?? []) as OrderCustomerDateRow[];
    rows.push(...batch);

    if (batch.length < PAGE) break;
    from += PAGE;
  }

  return rows;
}

function customerSetForRange(rows: OrderCustomerDateRow[], fromIso: string, toIso: string) {
  const customers = new Set<string>();
  for (const row of rows) {
    if (!row.customer_id) continue;
    if (isWithin(getOrderActivityDate(row), fromIso, toIso)) {
      customers.add(row.customer_id);
    }
  }
  return customers;
}

function earliestOrderByCustomer(rows: OrderCustomerDateRow[]) {
  const earliest = new Map<string, number>();
  for (const row of rows) {
    if (!row.customer_id) continue;
    const date = getOrderActivityDate(row);
    const time = date?.getTime();
    if (!Number.isFinite(time)) continue;
    const existing = earliest.get(row.customer_id);
    if (existing === undefined || time! < existing) {
      earliest.set(row.customer_id, time!);
    }
  }
  return earliest;
}

async function computeMetrics(now: Date) {
  // Current month
  const curStart = monthStart(now);
  const curEnd = now.toISOString(); // up to now

  // Previous month
  const prev = prevMonth(now);
  const prevStart = monthStart(prev);
  const prevEnd = monthEnd(prev);

  // Two months ago (for last month's lost calculation)
  const twoMo = twoMonthsAgo(now);
  const twoMoStart = monthStart(twoMo);
  const twoMoEnd = monthEnd(twoMo);

  const orderRows = await fetchOrderCustomerDates();
  const curOrders = customerSetForRange(orderRows, curStart, curEnd);
  const prevOrders = customerSetForRange(orderRows, prevStart, prevEnd);
  const twoMoOrders = customerSetForRange(orderRows, twoMoStart, twoMoEnd);
  const earliestByCustomer = earliestOrderByCustomer(orderRows);

  // --- Lost customers this month ---
  // Customers who ordered last month but NOT this month
  let lostThisMonth = 0;
  for (const cid of prevOrders.keys()) {
    if (!curOrders.has(cid)) lostThisMonth++;
  }

  // --- Lost customers last month ---
  // Customers who ordered two months ago but NOT last month
  let lostLastMonth = 0;
  for (const cid of twoMoOrders.keys()) {
    if (!prevOrders.has(cid)) lostLastMonth++;
  }

  // --- First-time purchasers this month ---
  // Customers whose earliest known order is inside the selected month.
  let firstTimeThisMonth = 0;
  let firstTimeLastMonth = 0;
  for (const cid of curOrders) {
    const earliest = earliestByCustomer.get(cid);
    if (earliest === undefined || earliest < Date.parse(curStart)) continue;
    firstTimeThisMonth++;
  }
  for (const cid of prevOrders) {
    const earliest = earliestByCustomer.get(cid);
    if (earliest === undefined || earliest < Date.parse(prevStart) || earliest > Date.parse(prevEnd)) continue;
    firstTimeLastMonth++;
  }

  return {
    lostCustomers: lostThisMonth,
    lostCustomersLastMonth: lostLastMonth,
    firstTimePurchasers: firstTimeThisMonth,
    firstTimePurchasersLastMonth: firstTimeLastMonth,
  };
}

async function fetchNewlyCreatedCustomers(now: Date) {
  const curStart = monthStart(now);
  const curEnd = monthEnd(now);
  const prev = prevMonth(now);
  const prevStart = monthStart(prev);
  const prevEnd = monthEnd(prev);

  const [cur, previous] = await Promise.all([
    supabase.from("customers").select("id", { count: "exact", head: true }).gte("created_at", curStart).lte("created_at", curEnd),
    supabase.from("customers").select("id", { count: "exact", head: true }).gte("created_at", prevStart).lte("created_at", prevEnd),
  ]);

  if (cur.error) {
    throw new Error(`Current-month customers query failed: ${cur.error.message}`);
  }
  if (previous.error) {
    throw new Error(`Previous-month customers query failed: ${previous.error.message}`);
  }

  return {
    newlyCreatedCustomers: cur.count ?? 0,
    newlyCreatedCustomersLastMonth: previous.count ?? 0,
  };
}

export function useCustomerAnalytics() {
  const { isLoading: isAuthLoading, session } = useAuth();
  const [data, setData] = useState<CustomerAnalytics>({
    firstTimePurchasers: 0,
    firstTimePurchasersLastMonth: 0,
    lostCustomers: 0,
    lostCustomersLastMonth: 0,
    newlyCreatedCustomers: 0,
    newlyCreatedCustomersLastMonth: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    if (isAuthLoading) return;
    if (!session) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const now = new Date();
      const [metrics, newCustomers] = await Promise.all([
        computeMetrics(now),
        fetchNewlyCreatedCustomers(now),
      ]);
      setData({ ...metrics, ...newCustomers });
    } catch (err) {
      console.warn("Failed to load customer analytics:", err);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthLoading, session]);

  useEffect(() => {
    void load();
  }, [load]);

  return { data, isLoading, refetch: load };
}
