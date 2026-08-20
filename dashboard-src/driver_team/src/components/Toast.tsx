import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, AlertCircle, Info } from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';

export default function Toast() {
  const { isToastVisible, toastMessage, toastType } = useUIStore();

  const icons = {
    success: <CheckCircle size={18} className="text-success-500" />,
    error: <AlertCircle size={18} className="text-error-500" />,
    info: <Info size={18} className="text-brand-500" />,
  };

  return (
    <AnimatePresence>
      {isToastVisible && toastMessage && (
        <motion.div
          initial={{ y: -60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -60, opacity: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="fixed top-16 left-1/2 -translate-x-1/2 z-[9999] max-w-[90%]"
        >
          <div className="flex items-center gap-2 rounded-xl bg-gray-900 px-5 py-3.5 text-white shadow-elevated">
            {icons[toastType]}
            <span className="text-sm font-medium">{toastMessage}</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
