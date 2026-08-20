import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  CheckCircle,
  RefreshCw,
  Trash2,
  Wifi,
  XCircle,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useUIStore } from '@/stores/uiStore';

type Diagnostics = {
  api: boolean | null;
  auth: boolean | null;
  storage: string | null;
};

export default function ConnectionDiagnosticsScreen() {
  const navigate = useNavigate();
  const isOffline = useUIStore((s) => s.isOffline);
  const pendingSyncCount = useUIStore((s) => s.pendingSyncCount);
  const syncActions = useUIStore((s) => s.syncOfflineActions);
  const showToast = useUIStore((s) => s.showToast);

  const [isTesting, setIsTesting] = useState(false);
  const [lastTested, setLastTested] = useState<string | null>(null);
  const [diagnostics, setDiagnostics] = useState<Diagnostics>({
    api: null,
    auth: null,
    storage: null,
  });

  const handleTestConnection = async () => {
    setIsTesting(true);
    try {
      const [{ data, error }, storageEstimate] = await Promise.all([
        supabase.auth.getSession(),
        navigator.storage?.estimate?.() ?? Promise.resolve(null),
      ]);

      const storage =
        storageEstimate?.usage != null && storageEstimate.quota != null
          ? `${(storageEstimate.usage / 1024 / 1024).toFixed(2)} ميجابايت / ${(storageEstimate.quota / 1024 / 1024).toFixed(0)} ميجابايت`
          : null;

      setDiagnostics({
        api: !error,
        auth: Boolean(data.session),
        storage,
      });
      setLastTested(new Date().toLocaleTimeString('ar-EG'));
      showToast('اكتمل فحص الاتصال');
    } catch (error) {
      setDiagnostics((current) => ({ ...current, api: false }));
      showToast(error instanceof Error ? error.message : String(error), 'error');
    } finally {
      setIsTesting(false);
    }
  };

  const handleForceSync = async () => {
    showToast('جار المزامنة...', 'info');
    try {
      await syncActions();
      showToast('تمت مزامنة كل التغييرات');
    } catch (error) {
      showToast(error instanceof Error ? error.message : String(error), 'error');
    }
  };

  const handleClearCache = () => {
    try {
      localStorage.clear();
      showToast('تم مسح التخزين المحلي', 'success');
    } catch {
      showToast('تعذر مسح التخزين المحلي', 'error');
    }
  };

  const diagnosticRows: Array<{
    label: string;
    value?: boolean | null;
    text?: string;
  }> = [
    { label: 'اتصال الإنترنت', value: !isOffline },
    { label: 'خادم البيانات', value: diagnostics.api },
    { label: 'تسجيل الدخول', value: diagnostics.auth },
    { label: 'تغييرات معلقة', text: String(pendingSyncCount) },
    ...(diagnostics.storage ? [{ label: 'استخدام التخزين', text: diagnostics.storage }] : []),
  ];

  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
      <div className="sticky top-0 z-[100] bg-white border-b border-app-border">
        <div className="flex items-center px-4 h-14">
          <button
            onClick={() => navigate('/settings')}
            className="flex items-center gap-1 text-app-dark active:opacity-70"
          >
            <ArrowLeft size={22} />
            <span className="text-base font-medium">الإعدادات</span>
          </button>
        </div>
        <div className="px-4 pb-3">
          <h1 className="text-xl font-semibold text-app-text">فحص الاتصال</h1>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex-1 overflow-y-auto no-scrollbar px-4 py-4 pb-8"
      >
        <div className="bg-white rounded-xl p-5 shadow-card">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${isOffline ? 'bg-app-error' : 'bg-app-success'} ${!isOffline ? 'animate-pulse-dot' : ''}`} />
            <div>
              <h3 className="text-lg font-semibold text-app-text">
                {isOffline ? 'غير متصل' : 'متصل'}
              </h3>
            </div>
          </div>
          {lastTested && (
            <p className="text-xs text-gray-400 mt-2">آخر فحص: {lastTested}</p>
          )}
        </div>

        <div className="bg-white rounded-xl p-4 shadow-card mt-4">
          {diagnosticRows.map((row, i) => (
            <div
              key={row.label}
              className={`flex items-center justify-between py-3 ${
                i < diagnosticRows.length - 1 ? 'border-b border-gray-50' : ''
              }`}
            >
              <span className="text-sm text-app-text-secondary">{row.label}</span>
              <div className="flex items-center gap-2">
                {row.text != null ? (
                  <span className="text-sm font-medium text-app-text">{row.text}</span>
                ) : row.value == null ? (
                  <span className="text-sm font-medium text-app-text-secondary">لم يتم الفحص</span>
                ) : (
                  <>
                    <span className="text-sm font-medium text-app-text">
                      {row.value ? 'متصل' : 'غير متصل'}
                    </span>
                    {row.value ? (
                      <CheckCircle size={16} className="text-app-success" />
                    ) : (
                      <XCircle size={16} className="text-app-error" />
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-3 mt-6">
          <button
            onClick={handleTestConnection}
            disabled={isTesting}
            className="w-full h-[52px] bg-app-dark text-white rounded-xl font-semibold flex items-center justify-center gap-2 active:scale-[0.96] disabled:opacity-60 transition-all"
          >
            {isTesting ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Wifi size={18} />
                فحص الاتصال
              </>
            )}
          </button>

          <button
            onClick={handleForceSync}
            className="w-full h-[52px] border border-app-dark text-app-dark rounded-xl font-semibold flex items-center justify-center gap-2 active:bg-app-light transition-all"
          >
            <RefreshCw size={18} />
            مزامنة الآن
          </button>

          <button
            onClick={handleClearCache}
            className="w-full h-12 text-error-600 font-semibold flex items-center justify-center gap-2 active:bg-error-50 rounded-xl transition-all"
          >
            <Trash2 size={16} />
            مسح التخزين المحلي
          </button>
        </div>
      </motion.div>
    </div>
  );
}
