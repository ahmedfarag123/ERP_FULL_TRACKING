import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Camera } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore } from '@/stores/uiStore';

export default function EditProfileScreen() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const showToast = useUIStore((s) => s.showToast);

  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [email, setEmail] = useState(user?.email || '');
  const [isSaving, setIsSaving] = useState(false);

  const hasChanges =
    firstName !== (user?.firstName || '') ||
    lastName !== (user?.lastName || '') ||
    phone !== (user?.phone || '') ||
    email !== (user?.email || '');

  const handleSave = async () => {
    setIsSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 800));
    setIsSaving(false);
    showToast('تم تحديث الملف الشخصي');
    navigate('/settings');
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
      {/* Header */}
      <div className="sticky top-0 z-[100] bg-white border-b border-app-border">
        <div className="flex items-center justify-between px-4 h-14">
          <button
            onClick={() => navigate('/settings')}
            className="flex items-center gap-1 text-app-dark active:opacity-70"
          >
            <ArrowLeft size={22} />
            <span className="text-base font-medium">الإعدادات</span>
          </button>
          <button
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
            className={`text-sm font-semibold ${
              hasChanges ? 'text-app-dark' : 'text-gray-400'
            }`}
          >
            {isSaving ? 'جار الحفظ...' : 'حفظ'}
          </button>
        </div>
        <div className="px-4 pb-3">
          <h1 className="text-xl font-semibold text-app-text">تعديل الملف الشخصي</h1>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex-1 overflow-y-auto no-scrollbar pb-8"
      >
        {/* Avatar Section */}
        <div className="bg-white py-6 flex flex-col items-center">
          <div className="w-20 h-20 rounded-full bg-app-dark flex items-center justify-center text-white text-2xl font-semibold relative">
            {firstName?.[0]}{lastName?.[0]}
            <button className="absolute -bottom-1 -right-1 w-7 h-7 bg-app-accent rounded-full flex items-center justify-center shadow-md">
              <Camera size={14} className="text-white" />
            </button>
          </div>
          <button className="text-sm text-app-accent font-medium mt-3">تغيير الصورة</button>
        </div>

        {/* Form Fields */}
        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="mx-4 mt-4 bg-white rounded-xl p-4 shadow-card"
        >
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-app-text mb-1.5 block">الاسم الأول</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full h-[52px] bg-gray-100 rounded-xl px-4 text-base text-app-text placeholder:text-gray-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-app-accent transition-all"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-app-text mb-1.5 block">اسم العائلة</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full h-[52px] bg-gray-100 rounded-xl px-4 text-base text-app-text placeholder:text-gray-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-app-accent transition-all"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-app-text mb-1.5 block">رقم الهاتف</label>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 border-r border-app-border pr-3">
                  <span className="text-sm text-app-text-secondary">+966</span>
                </div>
                <input
                  type="tel"
                  value={phone.replace('+966 ', '')}
                  onChange={(e) => setPhone('+966 ' + e.target.value)}
                  className="w-full h-[52px] bg-gray-100 rounded-xl pl-20 pr-4 text-base text-app-text placeholder:text-gray-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-app-accent transition-all"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-app-text mb-1.5 block">البريد الإلكتروني (اختياري)</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="أدخل البريد الإلكتروني"
                className="w-full h-[52px] bg-gray-100 rounded-xl px-4 text-base text-app-text placeholder:text-gray-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-app-accent transition-all"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-app-text mb-1.5 block">رقم السائق</label>
              <input
                type="text"
                value={user?.id || ''}
                readOnly
                className="w-full h-[52px] bg-gray-200 rounded-xl px-4 text-base text-app-text-secondary cursor-not-allowed"
              />
            </div>
          </div>
        </motion.div>

        {/* Save Button */}
        <div className="mx-4 mt-6">
          <button
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
            className="w-full h-[52px] bg-app-dark text-white rounded-xl font-semibold flex items-center justify-center gap-2 active:scale-[0.96] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isSaving ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              'حفظ التغييرات'
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
