import type { ConnectionStatus } from "../../hooks/useConnectionStatus";

interface ConnectionStatusBarProps {
  status: ConnectionStatus;
  pendingCount?: number;
}

function statusColor(status: ConnectionStatus) {
  if (status === "offline") return "bg-red-500";
  if (status === "syncing") return "bg-amber-500";
  return "bg-emerald-500";
}

function statusLabel(status: ConnectionStatus) {
  if (status === "offline") return "غير متصل - البيانات المخزنة مؤقتاً";
  if (status === "syncing") return "جاري مزامنة البيانات...";
  return "متصل";
}

export default function ConnectionStatusBar({ status, pendingCount = 0 }: ConnectionStatusBarProps) {
  if (status === "online" && pendingCount === 0) return null;

  return (
    <div
      className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium ${
        status === "offline"
          ? "bg-red-50 text-red-700 border border-red-200"
          : status === "syncing"
          ? "bg-amber-50 text-amber-700 border border-amber-200"
          : "bg-emerald-50 text-emerald-700 border border-emerald-200"
      }`}
    >
      <span className={`h-2.5 w-2.5 rounded-full ${statusColor(status)} ${status === "offline" ? "animate-pulse" : ""}`} />
      <span>{statusLabel(status)}</span>
      {pendingCount > 0 && (
        <span className="rounded-full bg-white/60 px-2 py-0.5 text-xs font-bold">
          {pendingCount} إجراء معلق
        </span>
      )}
    </div>
  );
}
