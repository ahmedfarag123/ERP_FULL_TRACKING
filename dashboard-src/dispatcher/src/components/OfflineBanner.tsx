import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff } from 'lucide-react';
import { useUIStore } from '../stores/uiStore';

export default function OfflineBanner() {
  const isOffline = useUIStore((s) => s.isOffline);
  return (
    <AnimatePresence>
      {isOffline && (
        <motion.div initial={{ y: -40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -40, opacity: 0 }} transition={{ duration: 0.2 }} className="sticky top-14 z-[99] bg-app-error text-white px-4 py-2 flex items-center gap-2">
          <WifiOff size={14} />
          <span className="text-xs font-medium">أنت غير متصل. ستتم مزامنة التغييرات عند عودة الاتصال.</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

