import { useEffect, useState } from 'react';
import { CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import AppHeader from '../components/AppHeader';

interface CheckResult {
  name: string;
  status: 'ok' | 'error' | 'loading';
  message: string;
}

export default function ConnectionDiagnosticsScreen() {
  const [checks, setChecks] = useState<CheckResult[]>([]);

  useEffect(() => {
    runChecks();
  }, []);

  const runChecks = async () => {
    const results: CheckResult[] = [];

    results.push({ name: 'الاتصال بالإنترنت', status: 'loading', message: 'جاري الفحص...' });
    setChecks([...results]);

    results[0] = {
      name: 'الاتصال بالإنترنت',
      status: navigator.onLine ? 'ok' : 'error',
      message: navigator.onLine ? 'متصل' : 'غير متصل',
    };
    setChecks([...results]);

    results.push({ name: 'Supabase', status: 'loading', message: 'جاري الفحص...' });
    setChecks([...results]);

    try {
      const { error } = await supabase.from('profiles').select('id').limit(1);
      results[results.length - 1] = {
        name: 'Supabase',
        status: error ? 'error' : 'ok',
        message: error ? error.message : 'متصل',
      };
    } catch {
      results[results.length - 1] = { name: 'Supabase', status: 'error', message: 'فشل الاتصال' };
    }
    setChecks([...results]);
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
      <AppHeader title="الاتصال بالخادم" />
      <div className="flex-1 overflow-y-auto no-scrollbar pb-6">
        <div className="mx-4 mt-4 bg-white rounded-xl shadow-card overflow-hidden">
          {checks.map((check, i) => (
            <div key={check.name} className={`px-4 py-4 flex items-center justify-between ${i < checks.length - 1 ? 'border-b border-gray-50' : ''}`}>
              <div className="flex items-center gap-3">
                {check.status === 'ok' ? <CheckCircle size={18} className="text-app-success" /> : check.status === 'error' ? <XCircle size={18} className="text-app-error" /> : <div className="w-4 h-4 animate-spin rounded-full border-2 border-gray-300 border-t-app-accent" />}
                <span className="text-sm font-medium text-app-text">{check.name}</span>
              </div>
              <span className={`text-xs font-medium ${check.status === 'ok' ? 'text-app-success' : check.status === 'error' ? 'text-app-error' : 'text-app-text-secondary'}`}>
                {check.message}
              </span>
            </div>
          ))}
        </div>
        <button onClick={runChecks} className="mx-4 mt-4 w-full h-12 bg-app-dark text-white rounded-xl font-semibold active:scale-[0.96] transition-transform">
          إعادة الفحص
        </button>
      </div>
    </div>
  );
}

