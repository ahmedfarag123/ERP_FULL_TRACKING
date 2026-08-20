import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Eye, EyeOff } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { useUIStore } from '../stores/uiStore';

export default function ForcePasswordChangeScreen() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const changeTemporaryPassword = useAuthStore((s) => s.changeTemporaryPassword);
  const isChangingPassword = useAuthStore((s) => s.isChangingPassword);
  const navigate = useNavigate();
  const showToast = useUIStore((s) => s.showToast);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (newPassword.length < 6) { setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل'); return; }
    if (newPassword !== confirmPassword) { setError('كلمتا المرور غير متطابقتين'); return; }
    const success = await changeTemporaryPassword(newPassword);
    if (success) { showToast('تم تغيير كلمة المرور'); navigate('/dashboard'); }
    else { setError('تعذر تغيير كلمة المرور'); }
  };

  return (
    <div className="flex flex-col min-h-screen bg-white px-6 pt-[15vh]">
      <div className="flex flex-col items-center mb-8">
        <div className="w-16 h-16 rounded-2xl bg-app-light flex items-center justify-center mb-4"><Lock size={28} className="text-app-dark" /></div>
        <h1 className="text-2xl font-semibold text-app-text">تغيير كلمة المرور</h1>
        <p className="text-sm text-app-text-secondary mt-1 text-center">يجب تغيير كلمة المرور المؤقتة للمتابعة</p>
      </div>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="text-sm font-medium text-app-text mb-1.5 block">كلمة المرور الجديدة</label>
          <div className="relative">
            <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type={showPassword ? 'text' : 'password'} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="أدخل كلمة المرور الجديدة" className="w-full h-[52px] bg-gray-100 rounded-xl pl-12 pr-12 text-base text-app-text placeholder:text-gray-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-app-accent transition-all" />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>
        <div>
          <label className="text-sm font-medium text-app-text mb-1.5 block">تأكيد كلمة المرور</label>
          <input type={showPassword ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="أعد إدخال كلمة المرور" className="w-full h-[52px] bg-gray-100 rounded-xl px-4 text-base text-app-text placeholder:text-gray-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-app-accent transition-all" />
        </div>
        {error && <p className="text-sm text-app-error animate-shake">{error}</p>}
        <button type="submit" disabled={isChangingPassword} className="w-full h-[52px] bg-app-dark text-white rounded-xl font-semibold text-base active:scale-[0.96] transition-all disabled:opacity-60 flex items-center justify-center mt-2">
          {isChangingPassword ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'تغيير كلمة المرور'}
        </button>
      </form>
    </div>
  );
}

