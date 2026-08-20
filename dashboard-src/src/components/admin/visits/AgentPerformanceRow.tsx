import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { buildOdooToProfileMap, resolveOrderUserId } from "../../../lib/order-user-resolver";
import AgentPerformanceCard from "./AgentPerformanceCard";
import type { AgentStats } from "./AgentPerformanceCard";

interface AgentPerformanceRowProps {
  selectedAgentId: string | null;
  onSelectAgent: (userId: string | null) => void;
  startIso: string | null;
  endIso: string | null;
}

export default function AgentPerformanceRow({
  selectedAgentId,
  onSelectAgent,
  startIso,
  endIso,
}: AgentPerformanceRowProps) {
  const [agents, setAgents] = useState<AgentStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadAgentStats() {
      try {
        setIsLoading(true);

        const { data: profiles, error: profilesError } = await supabase
          .from("profiles")
          .select("id, full_name, odoo_user_id")
          .eq("role", "sales_agent")
          .eq("status", "active");

        if (profilesError) throw profilesError;
        if (cancelled) return;

        const profileList = (profiles ?? []) as Array<{ id: string; full_name: string | null; odoo_user_id: string | null }>;

        const ADMIN_EXCEPTION_IDS = ["d6e0f49a-e0c4-4f9d-9244-a4f369de7557"];
        const { data: adminProfiles } = await supabase
          .from("profiles")
          .select("id, full_name, odoo_user_id")
          .in("id", ADMIN_EXCEPTION_IDS);
        if (adminProfiles) {
          for (const ap of adminProfiles) {
            if (!profileList.some((p) => p.id === ap.id)) {
              profileList.push(ap as { id: string; full_name: string | null; odoo_user_id: string | null });
            }
          }
        }

        const userIds = profileList.map((p) => p.id);
        if (userIds.length === 0) {
          setAgents([]);
          return;
        }

        let query = supabase
          .from("visits")
          .select("id, user_id, started_at, checked_in_at, completed_at, visit_result, visit_mode, raw_form_payload, within_geofence")
          .in("user_id", userIds);
        if (startIso) query = query.gte("checked_in_at", startIso);
        if (endIso) query = query.lte("checked_in_at", endIso);

        const { data: todayVisits, error: visitsError } = await query.order("checked_in_at", { ascending: false });

        if (visitsError) throw visitsError;
        if (cancelled) return;

        const odooToProfileId = buildOdooToProfileMap(profileList);

        let ordersQuery = supabase
          .from("orders")
          .select("id, assigned_user_id, user_id")
          .gte("order_date", startIso ?? "1970-01-01")
          .lte("order_date", endIso ?? "2099-12-31");
        const { data: ordersRows, error: ordersError } = await ordersQuery;
        if (ordersError) throw ordersError;
        if (cancelled) return;

        const ordersByUser = new Map<string, number>();
        for (const row of (ordersRows ?? []) as Array<{ id: string; assigned_user_id: string | null; user_id: string | null }>) {
          const uid = resolveOrderUserId(row, odooToProfileId);
          if (uid) ordersByUser.set(uid, (ordersByUser.get(uid) ?? 0) + 1);
        }

        const visits = (todayVisits ?? []) as Array<{
          id: string;
          user_id: string;
          started_at: string | null;
          checked_in_at: string;
          completed_at: string | null;
          visit_result: string | null;
          visit_mode: string | null;
          raw_form_payload: Record<string, unknown> | null;
          within_geofence: boolean | null;
        }>;

        const profileMap = new Map(profileList.map((p) => [p.id, p.full_name || "بدون اسم"]));

        const agentStatsMap = new Map<string, AgentStats>();

        for (const profile of profileList) {
          agentStatsMap.set(profile.id, {
            userId: profile.id,
            userName: profile.full_name || "بدون اسم",
            totalVisits: 0,
            productiveVisits: 0,
            quotations: 0,
            orders: 0,
            followUps: 0,
            avgDurationMinutes: 0,
            gpsCompliance: 0,
            manualOverrides: 0,
            photoCaptureRate: 0,
          });
        }

        let totalDurationMs = 0;
        let durationCount = 0;

        for (const visit of visits) {
          const stats = agentStatsMap.get(visit.user_id);
          if (!stats) continue;

          stats.totalVisits++;

          if (visit.within_geofence === true) stats.gpsCompliance++;

          if (visit.visit_mode === "manual") stats.manualOverrides++;

          if (visit.started_at && visit.completed_at) {
            const ms = new Date(visit.completed_at).getTime() - new Date(visit.started_at).getTime();
            if (ms > 0) {
              totalDurationMs += ms;
              durationCount++;
              stats.avgDurationMinutes = Math.round(ms / 60000);
            }
          }

          let parsedPayload: Record<string, unknown> | undefined;
          if (typeof visit.raw_form_payload === "string") {
            try { parsedPayload = JSON.parse(visit.raw_form_payload); } catch { /* not JSON */ }
          } else if (visit.raw_form_payload && typeof visit.raw_form_payload === "object") {
            parsedPayload = visit.raw_form_payload as Record<string, unknown>;
          }
          const outcome = typeof parsedPayload?.visit_outcome === "string" ? parsedPayload.visit_outcome : "";

          if (outcome === "quotation_requested") stats.quotations++;
          if (outcome === "order_expected" || (visit.visit_result ?? "").toLowerCase().includes("order")) stats.orders++;
          if (outcome === "follow_up_required") stats.followUps++;
          if (
            outcome === "quotation_requested" ||
            outcome === "order_expected" ||
            outcome === "meeting_completed"
          ) {
            stats.productiveVisits++;
          }
        }

        for (const stats of agentStatsMap.values()) {
          if (stats.totalVisits > 0) {
            stats.gpsCompliance = Math.round((stats.gpsCompliance / stats.totalVisits) * 100);
          }
          const realOrderCount = ordersByUser.get(stats.userId) ?? 0;
          if (realOrderCount > 0) {
            stats.orders = realOrderCount;
          }
        }

        const sorted = Array.from(agentStatsMap.values()).sort((a, b) => {
          const aIsAdmin = ADMIN_EXCEPTION_IDS.includes(a.userId);
          const bIsAdmin = ADMIN_EXCEPTION_IDS.includes(b.userId);
          if (aIsAdmin && !bIsAdmin) return -1;
          if (!aIsAdmin && bIsAdmin) return 1;
          return b.totalVisits - a.totalVisits;
        });

        if (!cancelled) setAgents(sorted);
      } catch {
        if (!cancelled) setAgents([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void loadAgentStats();
    return () => { cancelled = true; };
  }, [startIso, endIso]);

  function handleSelect(userId: string) {
    onSelectAgent(selectedAgentId === userId ? null : userId);
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-4 overflow-hidden pb-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-52 animate-pulse rounded-2xl bg-brand-25 dark:bg-white/[0.02]"
          />
        ))}
      </div>
    );
  }

  if (agents.length === 0) return null;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">
          أداء فريق المبيعات
        </h2>
        {selectedAgentId && (
          <button
            type="button"
            onClick={() => onSelectAgent(null)}
            className="text-sm font-medium text-blue-600 hover:text-blue-800"
          >
            عرض الكل
          </button>
        )}
      </div>
      <div className="grid grid-cols-3 gap-4">
        {agents.map((agent) => (
          <AgentPerformanceCard
            key={agent.userId}
            agent={agent}
            isSelected={selectedAgentId === agent.userId}
            onSelect={handleSelect}
          />
        ))}
      </div>
    </div>
  );
}
