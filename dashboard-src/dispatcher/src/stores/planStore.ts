import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabase';
import type {
  DispatcherPlan,
  DispatcherPlanItem,
  DispatcherPlanOrder,
  PlanPreparationStatus,
  PlanBucket,
  OverdueReason,
  UnavailabilityReason,
} from '../types';

interface PlanState {
  plans: DispatcherPlan[];
  selectedPlanId: string | null;
  planItems: DispatcherPlanItem[];
  planOrders: DispatcherPlanOrder[];
  isLoading: boolean;
  error: string | null;
  statusFilter: string;
  searchQuery: string;
  planBucketFilter: import('../types').PlanBucket;
  loadPlans: () => Promise<void>;
  loadPlanDetail: (planId: string) => Promise<void>;
  selectPlan: (id: string | null) => void;
  startPlanPreparation: (planId: string) => Promise<void>;
  confirmPlanItem: (
    planPreparationId: string,
    itemId: string,
    approvedQty: number,
    reason?: UnavailabilityReason | null,
    note?: string,
    barcode?: string,
  ) => Promise<void>;
  completePlanPreparation: (planId: string) => Promise<void>;
  bulkMarkAllReady: (planId: string) => Promise<number>;
  setStatusFilter: (filter: string) => void;
  setSearchQuery: (query: string) => void;
  setPlanBucketFilter: (bucket: import('../types').PlanBucket) => void;
  getFilteredPlans: () => DispatcherPlan[];
  getStats: () => { total: number; pending: number; preparing: number; ready: number; missed: number; completed: number; overdueDriver: number; overdueDispatcher: number };
}

type PlanRow = {
  id: string;
  plan_id: string;
  status: string;
  started_at: string;
  completed_at: string | null;
  duration_seconds: number | null;
  dispatcher_profile_id: string | null;
};

type PlanInfoRow = {
  id: string;
  plan_reference: string | null;
  planned_date: string | null;
  plan_status: string | null;
  assigned_profile_id: string | null;
  logistics_user_id: string | null;
};

type DriverRow = {
  id: string;
  employee_name: string | null;
};

function mapPlanPreparationStatus(
  planStatus: string | null | undefined,
  preparationStatus: string | null | undefined,
): PlanPreparationStatus {
  const prep = String(preparationStatus ?? '').toLowerCase();
  const plan = String(planStatus ?? '').toLowerCase();

  if (plan === 'cancelled' || prep === 'cancelled') return 'cancelled';
  if (prep === 'ready') return 'ready';
  if (prep === 'preparing') return 'preparing';
  return 'pending';
}

async function getCurrentProfileId() {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function requirePlanId(planId: string) {
  if (!isUuid(planId)) {
    throw new Error(`Invalid plan id for dispatcher preparation: ${planId || '(empty)'}`);
  }
}

function formatRpcError(error: { message?: string; code?: string; details?: string | null; hint?: string | null }, context: Record<string, unknown>) {
  const parts = [error.message, error.details, error.hint].filter(Boolean);
  const message = parts.join(' ');
  return `${message || 'Supabase RPC failed'} [code=${error.code ?? 'unknown'} context=${JSON.stringify(context)}]`;
}

async function logDispatcherActivity(input: {
  action: string;
  planId: string;
  planReference: string | null;
  itemName?: string;
  details?: Record<string, unknown>;
}) {
  try {
    const actorProfileId = await getCurrentProfileId();
    await supabase.from('dispatcher_activity_log').insert({
      action: input.action,
      actor_profile_id: actorProfileId,
      entity_type: 'plan',
      entity_id: input.planId,
      entity_number: input.planReference,
      product_name: input.itemName ?? null,
      details: input.details ?? null,
    });
  } catch {
    // Activity logging should not block warehouse work.
  }
}

export const usePlanStore = create<PlanState>()(
  persist(
    (set, get) => ({
      plans: [],
      selectedPlanId: null,
      planItems: [],
      planOrders: [],
      isLoading: false,
      error: null,
      statusFilter: 'all',
      searchQuery: '',
      planBucketFilter: 'active' as import('../types').PlanBucket,

      loadPlans: async () => {
        set({ isLoading: true, error: null });
        try {
          const todayStr = new Date().toISOString().slice(0, 10);

          const { data: preparations, error: prepError } = await supabase
            .from('dispatcher_plan_preparations')
            .select('id, plan_id, status, started_at, completed_at, duration_seconds, dispatcher_profile_id');

          if (prepError) throw new Error(prepError.message);

          const preparationByPlan = new Map<string, PlanRow>();
          for (const prep of (preparations ?? []) as PlanRow[]) {
            if (prep.status !== 'cancelled') {
              preparationByPlan.set(prep.plan_id, prep);
            }
          }

          const { data: plans, error: planError } = await supabase
            .from('logistics_delivery_plans')
            .select('id, plan_reference, planned_date, plan_status, assigned_profile_id, logistics_user_id')
            .order('planned_date', { ascending: false });

          if (planError) throw new Error(planError.message);

          const planInfoMap = new Map<string, PlanInfoRow>();
          for (const p of (plans ?? []) as PlanInfoRow[]) {
            planInfoMap.set(p.id, p);
          }

          const driverIds = [...new Set(
            (plans ?? [])
              .map((p: PlanInfoRow) => p.logistics_user_id)
              .filter(Boolean),
          )] as string[];

          let driverMap = new Map<string, string>();
          if (driverIds.length > 0) {
            const { data: drivers } = await supabase
              .from('logistics_users')
              .select('id, employee_name')
              .in('id', driverIds);
            driverMap = new Map(
              (drivers ?? []).map((d: DriverRow) => [d.id, d.employee_name ?? '']),
            );
          }

          const planIdsWithPreps = [...preparationByPlan.keys()];
          let itemCountsByPlan = new Map<string, { total: number; confirmed: number; hasShortages: boolean }>();

          if (planIdsWithPreps.length > 0) {
            const { data: itemStats } = await supabase
              .from('dispatcher_plan_item_preparations')
              .select('plan_id, status')
              .in('plan_id', planIdsWithPreps);

            for (const row of (itemStats ?? []) as { plan_id: string; status: string }[]) {
              const current = itemCountsByPlan.get(row.plan_id) ?? { total: 0, confirmed: 0, hasShortages: false };
              current.total += 1;
              if (row.status !== 'pending') current.confirmed += 1;
              if (row.status === 'partial' || row.status === 'unavailable') current.hasShortages = true;
              itemCountsByPlan.set(row.plan_id, current);
            }
          }

          let ordersCountByPlan = new Map<string, number>();
          if (planIdsWithPreps.length > 0) {
            const { data: orderCounts } = await supabase
              .from('logistics_shipments')
              .select('plan_id')
              .in('plan_id', planIdsWithPreps)
              .not('linked_order_id', 'is', null);

            for (const row of (orderCounts ?? []) as { plan_id: string }[]) {
              ordersCountByPlan.set(row.plan_id, (ordersCountByPlan.get(row.plan_id) ?? 0) + 1);
            }
          }

          const result: DispatcherPlan[] = (plans ?? []).map((info: PlanInfoRow) => {
            const prep = preparationByPlan.get(info.id);
            const stats = itemCountsByPlan.get(info.id);
            const driverName = info.logistics_user_id ? driverMap.get(info.logistics_user_id) ?? null : null;
            const prepStatus = String(prep?.status ?? '').toLowerCase();
            const isPast = info.planned_date != null && info.planned_date < todayStr;

            let bucket: PlanBucket;
            let overdueReason: OverdueReason = null;

            if (info.plan_status === 'completed' || info.plan_status === 'returned') {
              bucket = 'completed';
            } else if (isPast && !prep) {
              bucket = 'missed';
              overdueReason = 'dispatcher';
            } else {
              bucket = 'active';
              if (isPast && prepStatus === 'ready') {
                overdueReason = 'driver';
              } else if (isPast && prepStatus !== 'ready') {
                overdueReason = 'dispatcher';
              }
            }

            return {
              id: prep?.id ?? info.id,
              plan_id: info.id,
              plan_reference: info.plan_reference ?? null,
              driver_name: driverName,
              planned_date: info.planned_date ?? null,
              preparation_status: mapPlanPreparationStatus(info.plan_status, prep?.status),
              total_items: stats?.total ?? 0,
              confirmed_items: stats?.confirmed ?? 0,
              orders_count: ordersCountByPlan.get(info.id) ?? 0,
              has_shortages: stats?.hasShortages ?? false,
              plan_bucket: bucket,
              overdue_reason: overdueReason,
            };
          });

          result.sort((a, b) => {
            const bucketOrder: Record<string, number> = { active: 0, missed: 1, completed: 2 };
            const ba = bucketOrder[a.plan_bucket] ?? 0;
            const bb = bucketOrder[b.plan_bucket] ?? 0;
            if (ba !== bb) return ba - bb;
            const statusOrder: Record<string, number> = { pending: 0, preparing: 1, ready: 2, cancelled: 3 };
            const sa = statusOrder[a.preparation_status] ?? 0;
            const sb = statusOrder[b.preparation_status] ?? 0;
            if (sa !== sb) return sa - sb;
            return (b.planned_date ?? '').localeCompare(a.planned_date ?? '');
          });

          set({ plans: result, isLoading: false });
        } catch (err) {
          set({ error: err instanceof Error ? err.message : 'Unknown error', isLoading: false });
        }
      },

      loadPlanDetail: async (planId) => {
        try {
          set({ isLoading: true });

          // Fetch or create preparation
          const { data: prep, error: prepError } = await supabase
            .from('dispatcher_plan_preparations')
            .select('id, plan_id, status, started_at, completed_at, duration_seconds, dispatcher_profile_id')
            .eq('plan_id', planId)
            .maybeSingle();

          if (prepError) throw new Error(prepError.message);

          // Fetch plan info
          const { data: planInfo } = await supabase
            .from('logistics_delivery_plans')
            .select('id, plan_reference, planned_date, plan_status, assigned_profile_id, logistics_user_id')
            .eq('id', planId)
            .maybeSingle();

          // Fetch driver name
          let driverName: string | null = null;
          if (planInfo?.logistics_user_id) {
            const { data: driver } = await supabase
              .from('logistics_users')
              .select('employee_name')
              .eq('id', planInfo.logistics_user_id)
              .maybeSingle();
            driverName = driver?.employee_name ?? null;
          }

          // Fetch items
          let { data: itemsJson } = await supabase.rpc('dispatcher_get_plan_items', { p_plan_id: planId });
          let items = (itemsJson ?? []) as DispatcherPlanItem[];

          // Auto-reseed if preparation is active but items are empty (race condition fix)
          if (items.length === 0 && prep?.status === 'preparing') {
            await supabase.rpc('dispatcher_resync_plan_items', { p_plan_id: planId });
            const { data: resyncedJson } = await supabase.rpc('dispatcher_get_plan_items', { p_plan_id: planId });
            items = (resyncedJson ?? []) as DispatcherPlanItem[];
          }

          // Fetch orders
          const { data: ordersJson } = await supabase.rpc('dispatcher_get_plan_orders', { p_plan_id: planId });
          const orders = (ordersJson ?? []) as DispatcherPlanOrder[];

          const confirmedCount = items.filter((i) => i.preparation_status !== 'pending').length;
          const hasShortages = items.some((i) => i.preparation_status === 'partial' || i.preparation_status === 'unavailable');

          const plan: DispatcherPlan = {
            id: prep?.id ?? planId,
            plan_id: planId,
            plan_reference: planInfo?.plan_reference ?? null,
            driver_name: driverName,
            planned_date: planInfo?.planned_date ?? null,
            preparation_status: mapPlanPreparationStatus(planInfo?.plan_status, prep?.status),
            total_items: items.length,
            confirmed_items: confirmedCount,
            orders_count: orders.length,
            has_shortages: hasShortages,
            plan_bucket: 'active',
            overdue_reason: null,
          };

          set((state) => ({
            plans: state.plans.some((p) => p.plan_id === planId)
              ? state.plans.map((p) => (p.plan_id === planId ? plan : p))
              : [plan, ...state.plans],
            planItems: items,
            planOrders: orders,
            isLoading: false,
          }));
        } catch (err) {
          set({ error: err instanceof Error ? err.message : 'Unknown error', isLoading: false });
        }
      },

      selectPlan: (id) => set({ selectedPlanId: id }),

      startPlanPreparation: async (planId) => {
        requirePlanId(planId);
        const { error } = await supabase.rpc('dispatcher_start_plan_preparation', {
          p_plan_id: planId,
        });
        if (error) throw new Error(formatRpcError(error, { rpc: 'dispatcher_start_plan_preparation', p_plan_id: planId }));

        await logDispatcherActivity({
          action: 'start_plan_preparation',
          planId,
          planReference: get().plans.find((p) => p.plan_id === planId)?.plan_reference ?? null,
        });

        await get().loadPlanDetail(planId);
      },

      confirmPlanItem: async (planPreparationId, itemId, approvedQty, reason, note, barcode) => {
        const item = get().planItems.find((i) => i.id === itemId);
        if (!item) throw new Error('Plan item not found');

        const { data, error } = await supabase.rpc('dispatcher_confirm_plan_item', {
          p_plan_preparation_id: planPreparationId,
          p_item_id: itemId,
          p_approved_quantity: approvedQty,
          p_shortage_reason: reason ?? null,
          p_note: note ?? null,
          p_barcode: barcode ?? null,
        });
        if (error) throw new Error(error.message);

        const result = data as { status: string; approved_quantity: number };

        await logDispatcherActivity({
          action: result.status === 'ready' ? 'confirm_plan_item_ready' : 'confirm_plan_item_shortage',
          planId: item.plan_id,
          planReference: get().plans.find((p) => p.plan_id === item.plan_id)?.plan_reference ?? null,
          itemName: item.product_name,
          details: { approved_quantity: result.approved_quantity, reason: result.status === 'ready' ? null : reason, note: note ?? null },
        });

        await get().loadPlanDetail(item.plan_id);
      },

      completePlanPreparation: async (planId) => {
        const items = get().planItems;
        if (items.some((i) => i.preparation_status === 'pending')) {
          throw new Error('يجب تجهيز كل المنتجات قبل إكمال الخطة');
        }

        if (!items.some((i) => i.approved_quantity > 0 && i.preparation_status !== 'unavailable')) {
          throw new Error('Cannot complete preparation without at least one available item');
        }

        const { data, error } = await supabase.rpc('dispatcher_complete_plan_preparation', {
          p_plan_id: planId,
        });
        if (error) throw new Error(error.message);

        const result = data as { duration_seconds: number; has_shortage: boolean };

        await logDispatcherActivity({
          action: 'complete_plan_preparation',
          planId,
          planReference: get().plans.find((p) => p.plan_id === planId)?.plan_reference ?? null,
          details: {
            duration_seconds: result.duration_seconds,
            has_shortage: result.has_shortage,
            approved_items: items.map((i) => ({
              product_name: i.product_name,
              approved_quantity: i.approved_quantity,
              shortage_reason: i.shortage_reason,
            })),
          },
        });

        await get().loadPlanDetail(planId);
      },

      bulkMarkAllReady: async (planId: string) => {
        const { data, error } = await supabase.rpc('dispatcher_bulk_mark_all_ready', {
          p_plan_id: planId,
        });
        if (error) throw new Error(error.message);

        const result = data as { updated: number };
        await get().loadPlanDetail(planId);
        return result.updated ?? 0;
      },

      setStatusFilter: (filter) => set({ statusFilter: filter }),
      setSearchQuery: (query) => set({ searchQuery: query }),
      setPlanBucketFilter: (bucket) => set({ planBucketFilter: bucket, statusFilter: 'all' }),

      getFilteredPlans: () => {
        const { plans, statusFilter, searchQuery, planBucketFilter } = get();
        let filtered = plans.filter((p) => p.plan_bucket === planBucketFilter);
        if (statusFilter !== 'all') {
          filtered = filtered.filter((plan) => plan.preparation_status === statusFilter);
        }
        if (searchQuery.trim()) {
          const q = searchQuery.trim().toLowerCase();
          filtered = filtered.filter(
            (plan) =>
              plan.plan_reference?.toLowerCase().includes(q) ||
              plan.driver_name?.toLowerCase().includes(q),
          );
        }
        return filtered;
      },

      getStats: () => {
        const { plans } = get();
        const active = plans.filter((p) => p.plan_bucket === 'active');
        const missed = plans.filter((p) => p.plan_bucket === 'missed');
        const completed = plans.filter((p) => p.plan_bucket === 'completed');
        return {
          total: active.length,
          pending: active.filter((p) => p.preparation_status === 'pending').length,
          preparing: active.filter((p) => p.preparation_status === 'preparing').length,
          ready: active.filter((p) => p.preparation_status === 'ready').length,
          missed: missed.length,
          completed: completed.length,
          overdueDriver: active.filter((p) => p.overdue_reason === 'driver').length,
          overdueDispatcher: active.filter((p) => p.overdue_reason === 'dispatcher').length,
        };
      },
    }),
    {
      name: 'dispatcher-plan-storage',
      partialize: (state) => ({ statusFilter: state.statusFilter, searchQuery: state.searchQuery }),
    },
  ),
);
