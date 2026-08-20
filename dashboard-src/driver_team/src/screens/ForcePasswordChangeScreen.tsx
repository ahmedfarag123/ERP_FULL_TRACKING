import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Lock } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore } from '@/stores/uiStore';

export default function ForcePasswordChangeScreen() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const isLoading = useAuthStore((s) => s.isLoading);
  const changeTemporaryPassword = useAuthStore((s) => s.changeTemporaryPassword);
  const showToast = useUIStore((s) => s.showToast);
  const navigate = useNavigate();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    if (password.trim().length < 8) {
      setError('يجب أن تكون كلمة المرور 8 أحرف على الأقل.');
      return;
    }

    if (password !== confirmPassword) {
      setError('كلمتا المرور غير متطابقتين.');
      return;
    }

    const errorMessage = await changeTemporaryPassword(password.trim());
    if (errorMessage) {
      setError(errorMessage);
      return;
    }

    showToast('تم تحديث كلمة المرور');
    navigate('/dashboard', { replace: true });
  };

  return (
    <div className="flex min-h-screen flex-col bg-white px-6 pt-[15vh]">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="mx-auto w-full max-w-sm"
      >
        <div className="mb-8 flex h-14 w-14 items-center justify-center rounded-2xl bg-app-light text-app-accent">
          <Lock size={26} />
        </div>
        <h1 className="text-[26px] font-semibold leading-tight text-app-text">تعيين كلمة مرور جديدة</h1>
        <p className="mt-2 text-base text-app-text-secondary">
          يرجى تغيير كلمة المرور المؤقتة قبل الدخول إلى تطبيق السائق.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
          <input type="text" name="username" autoComplete="username" className="hidden" tabIndex={-1} aria-hidden="true" />
          <div>
            <label className="mb-1.5 block text-sm font-medium text-app-text">كلمة المرور الجديدة</label>
            <div className="relative">
              <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="new-password"
                className="h-[52px] w-full rounded-xl bg-gray-100 pl-12 pr-12 text-base text-app-text transition-all focus:bg-white focus:outline-none focus:ring-2 focus:ring-app-accent"
              />
              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-app-text">تأكيد كلمة المرور</label>
            <input
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              autoComplete="new-password"
              className="h-[52px] w-full rounded-xl bg-gray-100 px-4 text-base text-app-text transition-all focus:bg-white focus:outline-none focus:ring-2 focus:ring-app-accent"
            />
          </div>

          {error ? <p className="text-sm text-app-error">{error}</p> : null}

          <button
            type="submit"
            disabled={isLoading}
            className="mt-2 flex h-[52px] w-full items-center justify-center rounded-xl bg-app-dark text-base font-semibold text-white transition-all active:scale-[0.96] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : 'حفظ كلمة المرور'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
