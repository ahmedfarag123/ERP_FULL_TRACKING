import React, { useState } from "react";
import { supabase } from "../../lib/supabase";
import Button from "../ui/button/Button";
import { BoltIcon } from "../../icons";

interface SyncStatusProps {
  functionName: string;
  label: string;
  scheduleLabel?: string;
}

export const SyncStatus: React.FC<SyncStatusProps> = ({
  functionName,
  label,
  scheduleLabel = "Runs automatically every minute.",
}) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastResult, setLastResult] = useState<{ success: boolean; count?: number; error?: string } | null>(null);

  const handleSync = async () => {
    setIsSyncing(true);
    setLastResult(null);

    try {
      const { data, error } = await supabase.functions.invoke(functionName, {
        method: "POST",
      });

      if (error) throw error;
      setLastResult({ success: true, count: data.count });
    } catch (err) {
      setLastResult({ success: false, error: err instanceof Error ? err.message : String(err) });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-gray-200 dark:bg-gray-900 dark:border-gray-800 shadow-sm">
      <div>
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white">{label}</h4>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {lastResult?.success 
            ? `Manual run synced ${lastResult.count} records.` 
            : lastResult?.error 
            ? `Error: ${lastResult.error}` 
            : scheduleLabel}
        </p>
      </div>
      <Button 
        size="sm" 
        variant="outline" 
        onClick={handleSync} 
        disabled={isSyncing}
        startIcon={<BoltIcon className={isSyncing ? "animate-spin" : ""} />}
      >
        {isSyncing ? "Syncing..." : "Run Now"}
      </Button>
    </div>
  );
};
