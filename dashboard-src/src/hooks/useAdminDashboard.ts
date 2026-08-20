import { startTransition, useEffect, useMemo, useState } from "react";
import { fetchAdminDashboardSummary } from "../lib/admin-dashboard-data";
import { supabase } from "../lib/supabase";
import type { DashboardSummary } from "../types/admin-dashboard";

interface UseAdminDashboardState {
  data: DashboardSummary | null;
  isLoading: boolean;
  error: string | null;
}

const dashboardCache = new Map<string, DashboardSummary>();
const dashboardRequests = new Map<string, Promise<DashboardSummary>>();

async function loadDashboardSummary(
  cacheKey: string,
  rangeStart: Date,
  rangeEnd: Date,
) {
  const cachedRequest = dashboardRequests.get(cacheKey);
  if (cachedRequest) {
    return cachedRequest;
  }

  const request = fetchAdminDashboardSummary({ rangeStart, rangeEnd }).finally(() => {
    dashboardRequests.delete(cacheKey);
  });

  dashboardRequests.set(cacheKey, request);
  const summary = await request;
  dashboardCache.set(cacheKey, summary);
  return summary;
}

export function useAdminDashboard(rangeStart: Date, rangeEnd: Date): UseAdminDashboardState {
  const cacheKey = useMemo(
    () => `${rangeStart.toISOString()}::${rangeEnd.toISOString()}`,
    [rangeEnd, rangeStart],
  );
  const [data, setData] = useState<DashboardSummary | null>(() => dashboardCache.get(cacheKey) ?? null);
  const [isLoading, setIsLoading] = useState(() => !dashboardCache.has(cacheKey));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    let refreshTimeout: ReturnType<typeof setTimeout> | null = null;

    const load = async ({ background = false } = {}) => {
      const cached = dashboardCache.get(cacheKey);

      if (cached && isMounted) {
        setData(cached);
        if (!background) {
          setIsLoading(false);
        }
      } else if (!background) {
        setIsLoading(true);
      }

      setError(null);

      try {
        const summary = await loadDashboardSummary(cacheKey, rangeStart, rangeEnd);
        if (!isMounted) return;
        startTransition(() => {
          setData(summary);
        });
      } catch (loadError) {
        if (!isMounted) return;
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Failed to load admin dashboard data.",
        );
      } finally {
        if (isMounted && !background) {
          setIsLoading(false);
        }
      }
    };

    void load();

    const scheduleRefresh = () => {
      if (refreshTimeout) {
        clearTimeout(refreshTimeout);
      }

      refreshTimeout = setTimeout(() => {
        void load({ background: true });
      }, 250);
    };

    const channel = supabase
      .channel("dashboard-live-activity")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        scheduleRefresh,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "calls" },
        scheduleRefresh,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "visits" },
        scheduleRefresh,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "order_intents" },
        scheduleRefresh,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles" },
        scheduleRefresh,
      )
      .subscribe();

    return () => {
      isMounted = false;
      if (refreshTimeout) {
        clearTimeout(refreshTimeout);
      }
      void supabase.removeChannel(channel);
    };
  }, [cacheKey, rangeEnd, rangeStart]);

  return { data, isLoading, error };
}
