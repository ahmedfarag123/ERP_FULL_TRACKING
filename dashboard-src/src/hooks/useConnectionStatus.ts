import { useCallback, useEffect, useState } from "react";
import {
  getPendingWrites,
  removePendingWrite,
  type PendingWrite,
} from "../lib/offlineCache";
import { supabase } from "../lib/supabase";

export type ConnectionStatus = "online" | "offline" | "syncing";

interface UseConnectionStatusReturn {
  status: ConnectionStatus;
  isOffline: boolean;
  pendingCount: number;
}

export function useConnectionStatus(): UseConnectionStatusReturn {
  const [status, setStatus] = useState<ConnectionStatus>(
    () => (navigator.onLine ? "online" : "offline"),
  );
  const [pendingCount, setPendingCount] = useState(0);

  const syncPendingWrites = useCallback(async () => {
    const pending = await getPendingWrites();
    if (pending.length === 0) return;

    setStatus("syncing");

    for (const write of pending) {
      try {
        await applyWrite(write);
        await removePendingWrite(write.id);
      } catch {
        // Will retry on next connection restore
      }
    }

    const remaining = await getPendingWrites();
    setPendingCount(remaining.length);
    setStatus("online");
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      setStatus("online");
      void syncPendingWrites();
    };
    const handleOffline = () => setStatus("offline");

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Check pending writes count on mount
    void getPendingWrites().then((writes: PendingWrite[]) => setPendingCount(writes.length));

    // If we come back online, sync immediately
    if (navigator.onLine) {
      void syncPendingWrites();
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [syncPendingWrites]);

  return { status, isOffline: status === "offline", pendingCount };
}

async function applyWrite(write: PendingWrite) {
  if (write.operation === "delete") {
    const payload = write.payload as { id: string };
    await supabase.from(write.table).delete().eq("id", payload.id);
  } else if (write.operation === "upsert") {
    await supabase.from(write.table).upsert(write.payload as Record<string, unknown>);
  } else if (write.operation === "update") {
    const p = write.payload as { id: string; data: Record<string, unknown> };
    await supabase.from(write.table).update(p.data).eq("id", p.id);
  } else {
    await supabase.from(write.table).insert(write.payload as Record<string, unknown>);
  }
}
