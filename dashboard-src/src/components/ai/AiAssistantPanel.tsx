// AI Assistant Panel — Self-contained chat UI for Horeca Smart
// Adapted from reference AiAssistantPanel.tsx

import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles, X, Send, Bot, User, Loader2, RotateCcw, AlertCircle,
  HelpCircle, ChevronDown, ChevronUp, ArrowRight, TrendingUp, Users,
  Package, UserCheck, RefreshCw, ShoppingBag, CornerDownLeft,
} from 'lucide-react';
import { sendAiChatMessage, buildExecutiveAIContext, trimChatHistory } from '../../lib/ai/contextBuilder';
import { resolveAiIntent, intentRequiresCustomer, intentRequiresProduct, getDeterministicIntentResponse } from '../../lib/ai/intentClassifier';
import {
  getSmartSuggestedQuestions, getAllAvailableQuestions, getSuggestedFollowUps,
  buildScopeBadgeLabel, getAnalysisBadgeLabel, AI_QUESTION_CATEGORIES,
} from '../../lib/ai/questionsPack';
import type { AiChatMessage, AiQueryIntent, AiContextMode, ExecutiveAIContext, ExecutiveDrillDownContext } from '../../lib/ai/types';

interface FilterState {
  customerId?: number | null;
  productId?: number | null;
  customerName?: string;
  productName?: string;
  dateRange?: { label: string };
  periodMode?: string;
  startDate?: string;
  endDate?: string;
  companyName?: string;
  salesperson?: string;
  governorate?: string;
  area?: string;
}

interface AiAssistantPanelProps {
  isOpen: boolean;
  onClose: () => void;
  filters?: FilterState;
}

export const AiAssistantPanel: React.FC<AiAssistantPanelProps> = ({ isOpen, onClose, filters = {} }) => {
  const isAr = true;

  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingStatusText, setLoadingStatusText] = useState('');
  const [lastFailedPrompt, setLastFailedPrompt] = useState<{ text: string; intent?: AiQueryIntent } | null>(null);
  const [showFullLibrary, setShowFullLibrary] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('SALES');

  const initialGreeting: AiChatMessage = {
    role: 'model',
    text: 'مرحباً بك في المساعد الذكي لتحليل المبيعات.\nأنا جاهز لتحليل مبيعات هوريكا سمارت ومؤشرات النمو وسلوك العملاء والمنتجات والمناديب.',
    timestamp: 'الآن',
    intent: 'EXECUTIVE_SUMMARY',
    contextMode: 'AGGREGATED',
  };

  const [messages, setMessages] = useState<AiChatMessage[]>([initialGreeting]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen, loading]);

  const smartQuestions = getSmartSuggestedQuestions(filters);
  const fullQuestionsCatalog = getAllAvailableQuestions(filters);
  const scopeBadge = buildScopeBadgeLabel(filters);

  const getLoadingMessage = (intent?: AiQueryIntent): string => {
    if (intent === 'CUSTOMER_RECENT_ORDERS') return 'جاري تحميل تفاصيل الأوردرات...';
    if (intent === 'CUSTOMER_ANALYSIS' || intent === 'CUSTOMER_PRODUCT_HISTORY' || intent === 'CROSS_SELL') return 'جاري تحليل بيانات العميل...';
    if (intent === 'PRODUCT_ANALYSIS' || intent === 'PRODUCT_CUSTOMERS') return 'جاري تحليل بيانات المنتج...';
    return 'جاري تحليل البيانات...';
  };

  const handleSendMessage = async (customText?: string, explicitIntent?: AiQueryIntent) => {
    const textToSend = (customText || inputMessage).trim();
    if (!textToSend || loading) return;

    const timeStr = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
    const userMsg: AiChatMessage = { role: 'user', text: textToSend, timestamp: timeStr };

    setMessages((prev) => [...prev, userMsg]);
    if (!customText) setInputMessage('');
    setLoading(true);
    setLastFailedPrompt(null);
    setLoadingStatusText(getLoadingMessage(explicitIntent));

    try {
      // 1. Classify intent
      const intent = resolveAiIntent({ message: textToSend, filters, shortcutIntent: explicitIntent });
      setLoadingStatusText(getLoadingMessage(intent));

      // 2. Deterministic short-circuit
      const detResponse = getDeterministicIntentResponse(intent);
      if (detResponse) {
        setMessages((prev) => [...prev, { role: 'model', text: detResponse, timestamp: timeStr, intent, contextMode: 'AGGREGATED' }]);
        return;
      }

      // 3. Build context
      let analyticsContext: ExecutiveAIContext | undefined;
      let drillDownContext: ExecutiveDrillDownContext | undefined;
      let contextMode: AiContextMode = 'AGGREGATED';

      // For aggregated intents, build the executive context
      if (!intentRequiresCustomer(intent) && !intentRequiresProduct(intent)) {
        analyticsContext = await buildExecutiveAIContext(filters);
      }

      // 4. Send to backend
      const currentHistory = trimChatHistory(messages.filter((m) => !m.error));
      const aiReplyText = await sendAiChatMessage({
        message: textToSend,
        history: currentHistory,
        filters,
        analyticsContext,
        drillDownContext,
        contextMode,
        intent,
        language: 'ar',
      });

      setMessages((prev) => [...prev, {
        role: 'model', text: aiReplyText, timestamp: timeStr, intent, contextMode,
      }]);
    } catch (err: any) {
      console.error('AI chat error:', err);
      setLastFailedPrompt({ text: textToSend, intent: explicitIntent });
      setMessages((prev) => [...prev, {
        role: 'model',
        text: 'تعذر الاتصال بالمساعد الذكي حاليًا. حاول مرة أخرى.',
        timestamp: timeStr,
        error: true,
      }]);
    } finally {
      setLoading(false);
      setLoadingStatusText('');
    }
  };

  const handleClearHistory = () => { setMessages([initialGreeting]); setLastFailedPrompt(null); };
  const handleRetry = () => { if (lastFailedPrompt) handleSendMessage(lastFailedPrompt.text, lastFailedPrompt.intent); };

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'SALES': return <TrendingUp className="w-3.5 h-3.5" />;
      case 'CUSTOMERS': return <Users className="w-3.5 h-3.5" />;
      case 'PRODUCTS': return <Package className="w-3.5 h-3.5" />;
      case 'SALES_REPS': return <UserCheck className="w-3.5 h-3.5" />;
      case 'RECOVERY_GROWTH': return <RefreshCw className="w-3.5 h-3.5" />;
      case 'ORDERS': return <ShoppingBag className="w-3.5 h-3.5" />;
      default: return <HelpCircle className="w-3.5 h-3.5" />;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 ltr:right-0 rtl:left-0 z-50 w-full sm:w-[540px] bg-white dark:bg-slate-900 border-l rtl:border-l-0 rtl:border-r border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col transition-all duration-300">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-900 text-white flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center backdrop-blur-md border border-white/20">
              <Sparkles className="w-4 h-4 text-amber-300" />
            </div>
            <div>
              <h3 className="font-bold text-sm leading-tight flex items-center gap-1.5">
                <span>AI Sales Copilot</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-medium">
                  مساعد المبيعات
                </span>
              </h3>
              <div className="text-[11px] text-blue-100/80 font-medium">تحليلات ذكية واستفسارات تنفيذية</div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={handleClearHistory} title="مسح المحادثة" className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors">
              <RotateCcw className="w-4 h-4" />
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-black/20 border border-white/10 text-xs text-blue-100 font-medium">
          <span className="truncate">{scopeBadge}</span>
        </div>
      </div>

      {/* Smart Questions */}
      <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-slate-800 space-y-2">
        <div className="flex items-center justify-between">
          <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>أسئلة مقترحة حسب تحليلك الحالي</span>
          </div>
          <button onClick={() => setShowFullLibrary(!showFullLibrary)} className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 flex items-center gap-1 transition-colors px-1.5 py-0.5 rounded hover:bg-blue-50 dark:hover:bg-blue-900/30">
            <span>{showFullLibrary ? 'إخفاء' : 'كل الأسئلة'}</span>
            {showFullLibrary ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {!showFullLibrary && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-0.5">
            {smartQuestions.map((q) => (
              <button key={q.id} onClick={() => handleSendMessage(q.textAr, q.targetIntent)} disabled={loading}
                className="p-2 text-start rounded-lg bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-900/40 text-[11px] font-medium text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-all flex items-start justify-between gap-1.5 shadow-sm hover:border-blue-300 dark:hover:border-blue-600 disabled:opacity-50 group">
                <span className="leading-snug">{q.textAr}</span>
                <CornerDownLeft className="w-3 h-3 text-slate-400 group-hover:text-blue-600 shrink-0 mt-0.5 rtl:scale-x-[-1]" />
              </button>
            ))}
          </div>
        )}

        {showFullLibrary && (
          <div className="mt-2 p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3 shadow-inner">
            <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none border-b border-slate-100 dark:border-slate-800">
              {AI_QUESTION_CATEGORIES.map((cat) => {
                const isSelected = selectedCategory === cat.category;
                const count = (fullQuestionsCatalog as any)[cat.category]?.length || 0;
                return (
                  <button key={cat.category} onClick={() => setSelectedCategory(cat.category)}
                    className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 shrink-0 ${
                      isSelected ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}>
                    {getCategoryIcon(cat.category)}
                    <span>{cat.titleAr}</span>
                    <span className={`text-[9px] px-1.5 py-0.2 rounded-full ${isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'}`}>{count}</span>
                  </button>
                );
              })}
            </div>
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {((fullQuestionsCatalog as any)[selectedCategory] || []).map((q: any) => (
                <button key={q.id} onClick={() => { setShowFullLibrary(false); handleSendMessage(q.textAr, q.targetIntent); }} disabled={loading}
                  className="w-full text-start p-2 rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-900/40 text-[11px] font-medium text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700 flex items-center justify-between gap-2 transition-colors disabled:opacity-50 group">
                  <span>{q.textAr}</span>
                  <CornerDownLeft className="w-3 h-3 text-slate-400 group-hover:text-blue-600 shrink-0 rtl:scale-x-[-1]" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4 text-xs">
        {messages.map((msg, idx) => {
          const isUser = msg.role === 'user';
          const followUps = !isUser && !msg.error ? getSuggestedFollowUps({ intent: msg.intent, filters }) : [];
          const analysisBadge = !isUser && !msg.error ? getAnalysisBadgeLabel(msg.intent, msg.contextMode) : null;

          return (
            <div key={idx} className="space-y-2">
              <div className={`flex items-start gap-2.5 ${isUser ? 'flex-row-reverse' : ''}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                  isUser ? 'bg-blue-600 text-white' : msg.error ? 'bg-rose-100 text-rose-600 border border-rose-200' : 'bg-indigo-100 text-indigo-600'
                }`}>
                  {isUser ? <User className="w-4 h-4" /> : msg.error ? <AlertCircle className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>
                <div className={`max-w-[88%] p-3.5 rounded-2xl text-xs leading-relaxed ${
                  isUser ? 'bg-blue-600 text-white rounded-tr-none' : msg.error ? 'bg-rose-50 text-rose-900 border border-rose-200 rounded-tl-none' : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700/80 rounded-tl-none whitespace-pre-line'
                }`}>
                  {analysisBadge && (
                    <div className="mb-2"><span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 text-[10px] font-semibold border border-blue-200">{analysisBadge}</span></div>
                  )}
                  <div className="whitespace-pre-wrap">{msg.text}</div>
                  {msg.error && lastFailedPrompt && (
                    <div className="mt-2 pt-2 border-t border-rose-200 flex items-center justify-end">
                      <button onClick={handleRetry} disabled={loading} className="px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-medium flex items-center gap-1 transition-colors disabled:opacity-50">
                        <RotateCcw className="w-3 h-3" /><span>إعادة المحاولة</span>
                      </button>
                    </div>
                  )}
                  <div className={`text-[9px] mt-1.5 font-mono ${isUser ? 'text-blue-200 text-left' : msg.error ? 'text-rose-400 text-right' : 'text-slate-400 text-right'}`}>{msg.timestamp}</div>
                </div>
              </div>
              {!isUser && !msg.error && followUps.length > 0 && (
                <div className="mr-9 ml-9 mt-1 p-2.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800 space-y-1.5">
                  <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    <HelpCircle className="w-3 h-3 text-blue-500" /><span>ممكن تسأل كمان:</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {followUps.map((fu) => (
                      <button key={fu.id} onClick={() => handleSendMessage(fu.textAr, fu.targetIntent)} disabled={loading}
                        className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-900/40 text-[11px] font-medium text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors flex items-center gap-1 disabled:opacity-50 shadow-xs hover:border-blue-300">
                        <span>{fu.textAr}</span><ArrowRight className="w-3 h-3 text-slate-400 rtl:rotate-180" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {loading && (
          <div className="flex items-center gap-2.5 text-slate-500 text-xs p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/60 animate-pulse">
            <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
            <span className="font-medium">{loadingStatusText || 'جاري تحليل البيانات...'}</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Footer Input */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="relative flex items-center">
          <input type="text" value={inputMessage} onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="اكتب سؤالك التحليلي..." disabled={loading}
            className="w-full ltr:pr-10 rtl:pl-10 px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50" />
          <button onClick={() => handleSendMessage()} disabled={loading || !inputMessage.trim()}
            className="absolute ltr:right-2 rtl:left-2 p-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white transition-colors">
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
