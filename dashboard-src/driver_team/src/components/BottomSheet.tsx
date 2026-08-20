import type { ReactNode } from 'react';
import { motion, useDragControls } from 'framer-motion';
import { X } from 'lucide-react';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: ReactNode;
  showHandle?: boolean;
}

export default function BottomSheet({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  showHandle = true,
}: BottomSheetProps) {
  const dragControls = useDragControls();

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[900] bg-black/40"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
        className="absolute bottom-0 left-0 right-0 bg-white rounded-t-[20px] max-h-[85vh] flex flex-col"
      >
        {showHandle && (
          <motion.div
            className="flex justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing shrink-0"
            onPointerDown={(e: React.PointerEvent) => dragControls.start(e)}
            drag="y"
            dragControls={dragControls}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.2}
            onDragEnd={(_, info) => {
              if (info.offset.y > 100) {
                onClose();
              }
            }}
          >
            <div className="w-10 h-1 bg-gray-200 rounded-full" />
          </motion.div>
        )}

        <div className="px-4 pb-6 overflow-y-auto flex-1 min-h-0">
          {(title || subtitle) && (
            <div className="flex items-start justify-between mb-4">
              <div>
                {title && <h2 className="text-xl font-semibold text-app-text">{title}</h2>}
                {subtitle && <p className="text-sm text-app-text-secondary mt-1">{subtitle}</p>}
              </div>
              <button
                onClick={onClose}
                className="p-1 rounded-full hover:bg-brand-25/70 active:bg-gray-200 transition-colors"
              >
                <X size={20} className="text-gray-400" />
              </button>
            </div>
          )}

          {children}
        </div>
      </motion.div>
    </motion.div>
  );
}
