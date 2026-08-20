// Floating AI Button — opens the AI assistant panel
import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { AiAssistantPanel } from './AiAssistantPanel';

const AiFloatingButton: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 left-6 z-40 w-14 h-14 rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-lg hover:shadow-xl hover:from-blue-700 hover:to-indigo-800 transition-all duration-200 flex items-center justify-center group"
          title="مساعد المبيعات الذكي"
        >
          <Sparkles className="w-6 h-6 group-hover:scale-110 transition-transform" />
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full border-2 border-white animate-pulse" />
        </button>
      )}

      {/* Panel */}
      <AiAssistantPanel isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
};

export default AiFloatingButton;
