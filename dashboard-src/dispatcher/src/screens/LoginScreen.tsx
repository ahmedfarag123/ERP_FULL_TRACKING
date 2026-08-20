import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Smartphone, Lock, Eye, EyeOff } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { useUIStore } from '../stores/uiStore';
import { dispatcherAsset } from '../lib/appAssets';

export default function LoginScreen() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const login = useAuthStore((s) => s.login);
  const isLoading = useAuthStore((s) => s.isLoading);
  const navigate = useNavigate();
  const showToast = useUIStore((s) => s.showToast);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!identifier.trim() || !password.trim()) {
      setError('أدخل البريد الإلكتروني أو رقم الهاتف وكلمة المرور');
      return;
    }
    const success = await login(identifier, password);
    if (success) {
      showToast('تم تسجيل الدخول');
      navigate(useAuthStore.getState().requiresPasswordChange ? '/force-password-change' : '/dashboard');
    } else {
      setError('بيانات الدخول غير صحيحة');
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-white relative overflow-y-auto no-scrollbar">
      <div className="absolute top-0 left-0 right-0 h-[40vh] bg-gradient-to-b from-app-light to-white pointer-events-none" />
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }} className="flex-1 flex flex-col px-6 pt-[15vh] relative z-10">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.4, ease: 'easeOut' }} className="flex flex-col items-center">
          <img src={dispatcherAsset('logo.png')} alt="هوريكا سمارت" className="w-44 h-auto object-contain" />
          <p className="text-lg font-medium text-app-text-secondary mt-2">تطبيق المخزن</p>
        </motion.div>
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1, duration: 0.4 }} className="mt-10">
          <h1 className="text-[28px] font-semibold text-app-text leading-tight">تسجيل الدخول</h1>
          <p className="text-base text-app-text-secondary mt-1">أدخل بياناتك للمتابعة</p>
        </motion.div>
        <motion.form initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2, duration: 0.4 }} onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          <div>
            <label className="text-sm font-medium text-app-text mb-1.5 block">البريد الإلكتروني أو رقم الهاتف</label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-gray-400"><Mail size={17} /><Smartphone size={17} /></div>
              <input type="text" value={identifier} onChange={(e) => setIdentifier(e.target.value)} placeholder="البريد الإلكتروني أو رقم الهاتف" autoComplete="username" className={`w-full h-[52px] bg-gray-100 rounded-xl pl-20 pr-4 text-base text-app-text placeholder:text-gray-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-app-accent transition-all ${error ? 'ring-2 ring-app-error' : ''}`} />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-app-text mb-1.5 block">كلمة المرور</label>
            <div className="relative">
              <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="أدخل كلمة المرور" autoComplete="current-password" className={`w-full h-[52px] bg-gray-100 rounded-xl pl-12 pr-12 text-base text-app-text placeholder:text-gray-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-app-accent transition-all ${error ? 'ring-2 ring-app-error' : ''}`} />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          {error && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-app-error animate-shake">{error}</motion.p>}
          <button type="submit" disabled={isLoading} className="w-full h-[52px] bg-app-dark text-white rounded-xl font-semibold text-base active:scale-[0.96] active:bg-brand-600 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center mt-2">
            {isLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'تسجيل الدخول'}
          </button>
          <button type="button" className="text-sm text-app-accent font-medium self-center mt-1">نسيت كلمة المرور؟</button>
        </motion.form>
        <p className="text-xs text-gray-400 text-center mt-auto mb-8">الإصدار 1.0.0</p>
      </motion.div>
    </div>
  );
}

