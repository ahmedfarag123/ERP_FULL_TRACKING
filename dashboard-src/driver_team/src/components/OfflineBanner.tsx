import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, RefreshCw } from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';
import type { ConnectionStatus } from '@/stores/uiStore';

function statusColor(status: ConnectionStatus) {
  if (status === 'offline') return 'bg-red-500';
  if (status === 'syncing') return 'bg-amber-500';
  return 'bg-emerald-500';
}

function statusLabel(status: ConnectionStatus) {
  if (status === 'offline') return 'غير متصل';
  if (status === 'syncing') return 'جاري المزامنة...';
  return 'متصل';
}

export default function OfflineBanner() {
  const connectionStatus = useUIStore((s) => s.connectionStatus);
  const isOffline = useUIStore((s) => s.isOffline);
  const pendingSyncCount = useUIStore((s) => s.pendingSyncCount);

  return (
    <>
      {/* Persistent connection status dot - always visible */}
      <div className="fixed top-16 left-4 z-[200] flex items-center gap-2 rounded-full bg-white px-3 py-1.5 shadow-md border border-gray-100">
        <span className={`h-2.5 w-2.5 rounded-full ${statusColor(connectionStatus)} ${connectionStatus === 'offline' ? 'animate-pulse' : ''}`} />
        <span className="text-xs font-medium text-gray-600">{statusLabel(connectionStatus)}</span>
        {pendingSyncCount > 0 && (
          <span className="ml-1 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">
            {pendingSyncCount}
          </span>
        )}
      </div>

      {/* Offline banner */}
      <AnimatePresence>
        {isOffline && (
          <motion.div
            initial={{ y: -40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -40, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="sticky top-14 z-[99] bg-red-500 text-white px-4 py-2 flex items-center gap-2"
          >
            <WifiOff size={14} />
            <span className="text-xs font-medium">
              أنت غير متصل. ستتم مزامنة التغييرات عند عودة الاتصال.
              {pendingSyncCount > 0 && ` (${pendingSyncCount} إجراء معلق)`}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Syncing banner */}
      <AnimatePresence>
        {connectionStatus === 'syncing' && (
          <motion.div
            initial={{ y: -40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -40, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="sticky top-14 z-[99] bg-amber-500 text-white px-4 py-2 flex items-center gap-2"
          >
            <RefreshCw size={14} className="animate-spin" />
            <span className="text-xs font-medium">جاري مزامنة البيانات...</span>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
