import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { User, Shield, MapPin, Bell, LogOut, Settings, Sun, Moon } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { useAppStore } from '../store/appStore'
import { getIOSInstallInstructions, usePWAStore } from '../store/pwaStore'
import { requestNotificationPermission } from '../lib/notificationService'
import { cn } from '../lib/utils'

type LocationPermissionState = 'granted' | 'denied' | 'prompt'
type SettingsIcon = React.ComponentType<{ size?: number; className?: string }>

const getBrowserNotificationPermission = (): NotificationPermission => {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'denied'
  return Notification.permission
}

const getBrowserLocationPermission = async (): Promise<LocationPermissionState> => {
  if (!('geolocation' in navigator)) return 'denied'
  if (!('permissions' in navigator) || typeof navigator.permissions.query !== 'function') return 'prompt'

  try {
    const result = await navigator.permissions.query({ name: 'geolocation' as PermissionName })
    if (result.state === 'granted' || result.state === 'denied' || result.state === 'prompt') {
      return result.state
    }
  } catch (error) {
    console.warn('Could not read geolocation permission state.', error)
  }

  return 'prompt'
}

const requestRequiredLocationPermission = async (): Promise<LocationPermissionState> => {
  if (!('geolocation' in navigator)) return 'denied'

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      () => resolve('granted'),
      () => resolve('denied'),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 12000 }
    )
  })
}

interface NativeSwitchProps {
  checked: boolean
  disabled?: boolean
  loading?: boolean
  onChange?: (nextChecked: boolean) => void
  ariaLabel: string
}

function NativeSwitch({ checked, disabled = false, loading = false, onChange, ariaLabel }: NativeSwitchProps) {
  const isDisabled = disabled || loading

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      aria-disabled={isDisabled}
      onClick={() => {
        if (!isDisabled) onChange?.(!checked)
      }}
      className={cn(
        'relative inline-flex h-7 w-12 items-center rounded-full transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2',
        checked ? 'bg-brand-500' : 'bg-gray-200',
        isDisabled ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'
      )}
    >
      <span
        className={cn(
          'inline-flex h-5 w-5 items-center justify-center rounded-full bg-white shadow transition-transform',
          checked ? 'translate-x-6' : 'translate-x-1'
        )}
      >
        {loading && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-500" />}
      </span>
    </button>
  )
}

const roleLabels: Record<string, string> = {
  user: 'مستخدم',
  sales_team: 'فريق المبيعات',
  admin: 'مدير',
  manager: 'مدير',
  supervisor: 'مشرف',
  full_admin: 'مدير كامل',
  telesales: 'مبيعات هاتفية'
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 px-1 text-xs font-semibold text-app-text-secondary">{title}</h2>
      <div className="overflow-hidden rounded-xl bg-white shadow-card">{children}</div>
    </section>
  )
}

function SettingRow({
  icon: Icon,
  label,
  value,
  action
}: {
  icon: SettingsIcon
  label: string
  value?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-3 border-b border-gray-200 px-4 py-3 last:border-b-0">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-100 text-gray-600">
        <Icon size={16} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-app-text">{label}</p>
        {value ? <p className="mt-0.5 text-xs text-app-text-secondary">{value}</p> : null}
      </div>
      {action}
    </div>
  )
}

export default function SettingsPage() {
  const user = useAuthStore((state) => state.user)
  const signOut = useAuthStore((state) => state.signOut)
  const { canInstall, isInstalled, isIOS, install } = usePWAStore()
  const locationPermission = useAppStore((state) => state.locationPermission)
  const setLocationPermission = useAppStore((state) => state.setLocationPermission)
  const notificationsEnabled = useAppStore((state) => state.notificationsEnabled)
  const setNotificationsEnabled = useAppStore((state) => state.setNotificationsEnabled)
  const themeMode = useAppStore((state) => state.themeMode)
  const setThemeMode = useAppStore((state) => state.setThemeMode)

  const [locationLoading, setLocationLoading] = useState(false)
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(getBrowserNotificationPermission)
  const [notificationLoading, setNotificationLoading] = useState(false)
  const [showIOSInstallGuide, setShowIOSInstallGuide] = useState(false)

  const ensureLocationIsEnabled = useCallback(async () => {
    setLocationLoading(true)
    const nextLocationPermission = await requestRequiredLocationPermission()
    setLocationPermission(nextLocationPermission)
    setLocationLoading(false)
    return nextLocationPermission
  }, [setLocationPermission])

  useEffect(() => {
    let mounted = true

    const initializeLocationRequirement = async () => {
      const currentPermission = await getBrowserLocationPermission()
      if (!mounted) return

      setLocationPermission(currentPermission)
      if (currentPermission !== 'granted') {
        void ensureLocationIsEnabled()
      }
    }

    void initializeLocationRequirement()

    return () => {
      mounted = false
    }
  }, [ensureLocationIsEnabled, setLocationPermission])

  const handleNotificationToggle = async (nextEnabled: boolean) => {
    if (notificationLoading) return
    if (!nextEnabled) {
      setNotificationsEnabled(false)
      return
    }

    setNotificationLoading(true)
    const permission = await requestNotificationPermission()
    setNotificationPermission(permission)
    setNotificationsEnabled(permission === 'granted')
    setNotificationLoading(false)
  }

  const notificationsStatus = useMemo(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'غير مدعومة على هذا الجهاز'
    }

    if (notificationPermission === 'denied') return 'محظورة من المتصفح'
    if (!notificationsEnabled) return 'معطلة داخل التطبيق'
    return 'مفعلة'
  }, [notificationPermission, notificationsEnabled])

  const locationStatus = useMemo(() => {
    if (locationLoading) return 'جار تفعيل الموقع...'
    if (locationPermission === 'granted') return 'مفعل (إجباري)'
    if (locationPermission === 'denied') return 'الموقع مطلوب لاستخدام التطبيق. فعله من إعدادات المتصفح.'
    return 'في انتظار إذن الموقع'
  }, [locationLoading, locationPermission])

  const installStatus = useMemo(() => {
    if (isInstalled) return 'مثبت ويعمل كتطبيق'
    if (canInstall) return 'جاهز للتثبيت'
    if (isIOS) return 'استخدم مشاركة سفاري ثم إضافة إلى الشاشة الرئيسية'
    return 'خيار التثبيت غير متاح بعد'
  }, [canInstall, isIOS, isInstalled])

  const iosInstallInstructions = useMemo(() => getIOSInstallInstructions(), [])

  return (
    <div className="flex flex-col min-h-full">
      {/* Profile Card */}
      {user && (
        <div className="mx-4 mt-4 rounded-xl bg-white shadow-card p-4">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-brand-50 text-brand-500">
              <User size={24} />
            </div>
            <div className="min-w-0">
              <p className="truncate text-base font-semibold text-app-text">{user.full_name}</p>
              <p className="truncate text-sm text-app-text-secondary">{user.email}</p>
              <span className="mt-2 inline-flex rounded-lg bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-500">
                {roleLabels[user.role] ?? user.role}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Settings Sections */}
      <div className="flex-1 px-4 mt-4 space-y-4 pb-6">
        <Section title="المظهر">
          <SettingRow
            icon={themeMode === 'dark' ? Moon : Sun}
            label="السمة"
            value={themeMode === 'dark' ? 'الوضع الداكن مفعل' : 'الوضع الفاتح مفعل'}
            action={
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setThemeMode('light')}
                  className={cn(
                    'rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors',
                    themeMode === 'light'
                      ? 'bg-brand-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  )}
                >
                  فاتح
                </button>
                <button
                  type="button"
                  onClick={() => setThemeMode('dark')}
                  className={cn(
                    'rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors',
                    themeMode === 'dark'
                      ? 'bg-brand-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  )}
                >
                  داكن
                </button>
              </div>
            }
          />
        </Section>

        <Section title="الموقع">
          <SettingRow
            icon={MapPin}
            label="إذن الموقع"
            value={locationStatus}
            action={
              <div className="flex items-center gap-2">
                <NativeSwitch checked disabled loading={locationLoading} ariaLabel="تفعيل إذن الموقع المطلوب" />
                {locationPermission !== 'granted' && (
                  <button
                    type="button"
                    onClick={() => void ensureLocationIsEnabled()}
                    className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-semibold text-app-text hover:text-brand-500"
                  >
                    إعادة المحاولة
                  </button>
                )}
              </div>
            }
          />
          <SettingRow icon={Shield} label="حد المسافة" value="١٠٠ متر من نقطة البداية" />
        </Section>

        <Section title="التنبيهات">
          <SettingRow
            icon={Bell}
            label="تنبيهات التطبيق"
            value={notificationsStatus}
            action={
              <NativeSwitch
                checked={notificationsEnabled && notificationPermission === 'granted'}
                disabled={notificationPermission === 'denied'}
                loading={notificationLoading}
                ariaLabel="تفعيل تنبيهات التطبيق"
                onChange={(nextChecked) => {
                  void handleNotificationToggle(nextChecked)
                }}
              />
            }
          />
          {notificationPermission === 'denied' && (
            <div className="px-4 py-3 text-xs text-warning-600">
              تم حظر التنبيهات من المتصفح. فعّلها من إعدادات الموقع ثم أعد تحميل الصفحة.
            </div>
          )}
        </Section>

        <Section title="الحساب">
          <SettingRow icon={Settings} label="الإصدار" value="1.0.0 - تطبيق هوريكا سمارت للمبيعات" />
        </Section>

        <Section title="تثبيت التطبيق">
          <SettingRow
            icon={Settings}
            label="تثبيت التطبيق"
            value={installStatus}
            action={
              <>
                {isInstalled && (
                  <span className="rounded-lg bg-success-50 px-2.5 py-1 text-xs font-semibold text-success-600">
                    مثبت
                  </span>
                )}

                {!isInstalled && canInstall && (
                  <button
                    type="button"
                    onClick={() => void install()}
                    className="rounded-lg bg-brand-500 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-brand-600"
                  >
                    تثبيت
                  </button>
                )}

                {!isInstalled && !canInstall && isIOS && (
                  <button
                    type="button"
                    onClick={() => setShowIOSInstallGuide((value) => !value)}
                    className="rounded-lg bg-gray-100 px-3 py-2 text-xs font-semibold text-app-text transition-colors hover:text-brand-500"
                  >
                    خطوات iOS
                  </button>
                )}
              </>
            }
          />

          {isIOS && showIOSInstallGuide && !isInstalled && (
            <div className="px-4 py-3 text-xs text-app-text-secondary">
              <p className="whitespace-pre-line">{iosInstallInstructions}</p>
            </div>
          )}
        </Section>

        <button
          onClick={signOut}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-error-200 bg-error-50 py-3.5 text-sm font-semibold text-error-600 transition-colors hover:bg-error-100"
        >
          <LogOut size={16} />
          تسجيل الخروج
        </button>
      </div>
    </div>
  )
}
