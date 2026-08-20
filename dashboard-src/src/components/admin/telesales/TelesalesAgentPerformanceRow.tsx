import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import TelesalesAgentPerformanceCard from "./TelesalesAgentPerformanceCard";
import type { TelesalesAgentStats } from "./TelesalesAgentPerformanceCard";

interface TelesalesAgentPerformanceRowProps {
  selectedAgentId: string | null;
  onSelectAgent: (userId: string | null) => void;
  startISO: string;
  endISO: string;
}

function calculateAchievement(stats: {
  totalCalls: number;
  completedCalls: number;
  totalTickets: number;
  solvedTickets: number;
  linkedOrders: number;
  followUpNotDone: number;
  totalFollowUps: number;
}): number {
  let score = 0;

  if (stats.totalCalls > 0) {
    score += Math.min(30, (stats.completedCalls / stats.totalCalls) * 30);
  }
  score += Math.min(25, stats.solvedTickets * 5);
  score += Math.min(20, stats.linkedOrders * 10);
  if (stats.totalFollowUps > 0) {
    const followUpDoneRate = 1 - stats.followUpNotDone / stats.totalFollowUps;
    score += Math.max(0, followUpDoneRate) * 15;
  } else {
    score += 15;
  }
  if (stats.totalCalls >= 5 || stats.totalTickets >= 3) score += 10;
  else if (stats.totalCalls >= 2 || stats.totalTickets >= 1) score += 5;

  return Math.round(Math.min(score, 100));
}

export default function TelesalesAgentPerformanceRow({
  selectedAgentId,
  onSelectAgent,
  startISO,
  endISO,
}: TelesalesAgentPerformanceRowProps) {
  const [agents, setAgents] = useState<TelesalesAgentStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadAgentStats() {
      try {
        setIsLoading(true);

        const [callsUsersRes, interactionsUsersRes] = await Promise.all([
          supabase
            .from("calls")
            .select("user_id")
            .gte("created_at", startISO)
            .lte("created_at", endISO),
          supabase
            .from("customer_interactions")
            .select("actor_user_id")
            .gte("created_at", startISO)
            .lte("created_at", endISO),
        ]);

        if (cancelled) return;

        const callUserIds = new Set<string>(
          (callsUsersRes.data ?? []).map((r: { user_id: string }) => r.user_id).filter(Boolean)
        );
        const interactionUserIds = new Set<string>(
          (interactionsUsersRes.data ?? []).map((r: { actor_user_id: string }) => r.actor_user_id).filter(Boolean)
        );
        const allUserIds = [...new Set([...callUserIds, ...interactionUserIds])];

        if (allUserIds.length === 0) {
          setAgents([]);
          return;
        }

        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", allUserIds);

        if (cancelled) return;

        const nameMap = new Map<string, string>();
        for (const p of profiles ?? []) nameMap.set(p.id, p.full_name ?? "غير معروف");

        const [callsRes, ticketsRes] = await Promise.all([
          supabase
            .from("calls")
            .select("user_id, call_status, linked_order_id, callback_at")
            .in("user_id", allUserIds)
            .gte("created_at", startISO)
            .lte("created_at", endISO),
          supabase
            .from("order_tickets")
            .select("assigned_to, status")
            .in("assigned_to", allUserIds),
        ]);

        if (cancelled) return;

        const calls = (callsRes.data ?? []) as Array<{
          user_id: string;
          call_status: string | null;
          linked_order_id: string | null;
          callback_at: string | null;
        }>;

        const tickets = (ticketsRes.data ?? []) as Array<{
          assigned_to: string | null;
          status: string;
        }>;

        const agentMap = new Map<string, TelesalesAgentStats>();

        for (const uid of allUserIds) {
          agentMap.set(uid, {
            userId: uid,
            userName: nameMap.get(uid) || "بدون اسم",
            totalCalls: 0,
            completedCalls: 0,
            totalTickets: 0,
            solvedTickets: 0,
            linkedOrders: 0,
            reachability: 0,
            followUpNotDone: 0,
            achievementPercent: 0,
          });
        }

        const linkedOrderSets = new Map<string, Set<string>>();
        const followUpCounts = new Map<string, { total: number; notDone: number }>();
        const now = new Date();

        for (const call of calls) {
          const stats = agentMap.get(call.user_id);
          if (!stats) continue;
          stats.totalCalls++;
          if (call.call_status === "completed") stats.completedCalls++;

          if (call.linked_order_id) {
            const set = linkedOrderSets.get(call.user_id) ?? new Set<string>();
            set.add(call.linked_order_id);
            linkedOrderSets.set(call.user_id, set);
          }

          if (call.callback_at) {
            const entry = followUpCounts.get(call.user_id) ?? { total: 0, notDone: 0 };
            entry.total += 1;
            if (new Date(call.callback_at) <= now && call.call_status !== "completed") {
              entry.notDone += 1;
            }
            followUpCounts.set(call.user_id, entry);
          }
        }

        for (const ticket of tickets) {
          if (!ticket.assigned_to) continue;
          const stats = agentMap.get(ticket.assigned_to);
          if (!stats) continue;
          stats.totalTickets++;
          if (["resolved", "closed"].includes(ticket.status)) {
            stats.solvedTickets++;
          }
        }

        for (const [userId, stats] of agentMap) {
          const orders = linkedOrderSets.get(userId);
          stats.linkedOrders = orders ? orders.size : 0;

          const fu = followUpCounts.get(userId);
          stats.followUpNotDone = fu ? fu.notDone : 0;

          stats.reachability = stats.totalCalls > 0
            ? Math.round((stats.completedCalls / stats.totalCalls) * 100)
            : 0;

          stats.achievementPercent = calculateAchievement({
            totalCalls: stats.totalCalls,
            completedCalls: stats.completedCalls,
            totalTickets: stats.totalTickets,
            solvedTickets: stats.solvedTickets,
            linkedOrders: stats.linkedOrders,
            followUpNotDone: stats.followUpNotDone,
            totalFollowUps: fu ? fu.total : 0,
          });
        }

        const sorted = Array.from(agentMap.values())
          .filter((a) => a.totalCalls > 0 || a.totalTickets > 0)
          .sort((a, b) => b.achievementPercent - a.achievementPercent);

        if (!cancelled) setAgents(sorted);
      } catch {
        if (!cancelled) setAgents([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void loadAgentStats();
    return () => { cancelled = true; };
  }, [startISO, endISO]);

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
          أداء فريق المكالمات
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
          <TelesalesAgentPerformanceCard
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
