import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import CustomerServiceAgentPerformanceCard from "./CustomerServiceAgentPerformanceCard";
import type { CustomerServiceAgentStats } from "./CustomerServiceAgentPerformanceCard";

interface CustomerServiceAgentPerformanceRowProps {
  selectedAgentId: string | null;
  onSelectAgent: (userId: string | null) => void;
  startISO: string;
  endISO: string;
}

function calculateAchievement(stats: {
  totalTickets: number;
  solvedTickets: number;
  linkedOrders: number;
  responseRate: number;
  followUpNotDone: number;
  totalFollowUps: number;
}): number {
  let score = 0;

  score += Math.min(30, stats.responseRate * 0.3);
  score += Math.min(25, stats.solvedTickets * 5);
  score += Math.min(20, stats.linkedOrders * 10);
  if (stats.totalFollowUps > 0) {
    const followUpDoneRate = 1 - stats.followUpNotDone / stats.totalFollowUps;
    score += Math.max(0, followUpDoneRate) * 15;
  } else {
    score += 15;
  }
  if (stats.totalTickets >= 5) score += 10;
  else if (stats.totalTickets >= 2) score += 5;

  return Math.round(Math.min(score, 100));
}

export default function CustomerServiceAgentPerformanceRow({
  selectedAgentId,
  onSelectAgent,
  startISO,
  endISO,
}: CustomerServiceAgentPerformanceRowProps) {
  const [agents, setAgents] = useState<CustomerServiceAgentStats[]>([]);
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

        const [profilesRes, ticketsRes, commentsRes, callsRes] = await Promise.all([
          supabase.from("profiles").select("id, full_name").in("id", allUserIds),
          supabase
            .from("order_tickets")
            .select("id, assigned_to, status, order_id, created_at")
            .in("assigned_to", allUserIds)
            .gte("created_at", startISO)
            .lte("created_at", endISO),
          supabase
            .from("order_ticket_comments")
            .select("ticket_id, author_id")
            .in("author_id", allUserIds),
          supabase
            .from("calls")
            .select("user_id, callback_at, call_status")
            .in("user_id", allUserIds)
            .gte("created_at", startISO)
            .lte("created_at", endISO),
        ]);

        if (cancelled) return;

        const nameMap = new Map<string, string>();
        for (const p of profilesRes.data ?? []) nameMap.set(p.id, p.full_name ?? "غير معروف");

        const ticketRows = (ticketsRes.data ?? []) as Array<{
          id: string;
          assigned_to: string | null;
          status: string;
          order_id: string | null;
          created_at: string;
        }>;

        const respondedTicketsByUser = new Map<string, Set<string>>();
        for (const c of commentsRes.data ?? []) {
          if (!c.author_id) continue;
          const set = respondedTicketsByUser.get(c.author_id) ?? new Set<string>();
          set.add(c.ticket_id);
          respondedTicketsByUser.set(c.author_id, set);
        }

        const followUpCounts = new Map<string, { total: number; notDone: number }>();
        const now = new Date();
        for (const call of callsRes.data ?? []) {
          if (!call.callback_at) continue;
          const entry = followUpCounts.get(call.user_id) ?? { total: 0, notDone: 0 };
          entry.total += 1;
          if (new Date(call.callback_at) <= now && call.call_status !== "completed") {
            entry.notDone += 1;
          }
          followUpCounts.set(call.user_id, entry);
        }

        const agentMap = new Map<string, CustomerServiceAgentStats>();

        for (const uid of allUserIds) {
          agentMap.set(uid, {
            userId: uid,
            userName: nameMap.get(uid) ?? "غير معروف",
            totalTickets: 0,
            solvedTickets: 0,
            linkedOrders: 0,
            reachability: 0,
            followUpNotDone: 0,
            achievementPercent: 0,
          });
        }

        const linkedOrderSets = new Map<string, Set<string>>();

        for (const ticket of ticketRows) {
          if (!ticket.assigned_to) continue;
          const stats = agentMap.get(ticket.assigned_to);
          if (!stats) continue;
          stats.totalTickets++;
          if (["resolved", "closed"].includes(ticket.status)) {
            stats.solvedTickets++;
          }
          if (ticket.order_id) {
            const set = linkedOrderSets.get(ticket.assigned_to) ?? new Set<string>();
            set.add(ticket.order_id);
            linkedOrderSets.set(ticket.assigned_to, set);
          }
        }

        for (const [userId, stats] of agentMap) {
          const orders = linkedOrderSets.get(userId);
          stats.linkedOrders = orders ? orders.size : 0;

          const responded = respondedTicketsByUser.get(userId);
          stats.reachability = stats.totalTickets > 0
            ? Math.round(((responded?.size ?? 0) / stats.totalTickets) * 100)
            : 0;

          const fu = followUpCounts.get(userId);
          stats.followUpNotDone = fu ? fu.notDone : 0;

          stats.achievementPercent = calculateAchievement({
            totalTickets: stats.totalTickets,
            solvedTickets: stats.solvedTickets,
            linkedOrders: stats.linkedOrders,
            responseRate: stats.reachability,
            followUpNotDone: stats.followUpNotDone,
            totalFollowUps: fu ? fu.total : 0,
          });
        }

        const sorted = Array.from(agentMap.values())
          .filter((a) => a.totalTickets > 0)
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
          أداء فريق خدمة العملاء
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
          <CustomerServiceAgentPerformanceCard
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
