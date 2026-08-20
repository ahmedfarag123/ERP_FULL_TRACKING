import { useAuthStore } from '../stores/authStore';
import AppHeader from '../components/AppHeader';

export default function EditProfileScreen() {
  const user = useAuthStore((s) => s.user);

  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
      <AppHeader title="الملف الشخصي" />
      <div className="flex-1 overflow-y-auto no-scrollbar pb-6">
        <div className="mx-4 mt-4 bg-white rounded-xl p-4 shadow-card">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-full bg-app-light flex items-center justify-center">
              <span className="text-2xl font-bold text-app-dark">{user?.full_name?.charAt(0) ?? '?'}</span>
            </div>
            <div>
              <p className="text-lg font-semibold text-app-text">{user?.full_name ?? ''}</p>
              <p className="text-sm text-app-text-secondary">{user?.email ?? ''}</p>
            </div>
          </div>
        </div>

        <div className="mx-4 mt-3 bg-white rounded-xl shadow-card overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-app-text">المعلومات الشخصية</h3>
          </div>
          {[
            { label: 'الاسم', value: user?.full_name ?? '-' },
            { label: 'البريد الإلكتروني', value: user?.email ?? '-' },
            { label: 'رقم الهاتف', value: user?.phone ?? '-' },
            { label: 'الدور', value: user?.role === 'warehouse_manager' ? 'مدير المخزن' : user?.role === 'warehouse_supervisor' ? 'مشرف المخزن' : 'موزع' },
          ].map((row, i, arr) => (
            <div key={row.label} className={`px-4 py-3 flex items-center justify-between ${i < arr.length - 1 ? 'border-b border-gray-50' : ''}`}>
              <span className="text-sm text-app-text-secondary">{row.label}</span>
              <span className="text-sm font-medium text-app-text">{row.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

