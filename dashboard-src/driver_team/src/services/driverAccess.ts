import type { User } from '@supabase/supabase-js';
import type { DriverProfile } from '@/types/driverBackend';
import { supabase } from '@/lib/supabase';

const DRIVER_KEYWORDS = [
  'driver',
  'delivery',
  'courier',
  'fleet',
  '\u0633\u0627\u0626\u0642',
  '\u062a\u0648\u0635\u064a\u0644',
  '\u0645\u0646\u062f\u0648\u0628',
  '\u0634\u062d\u0646',
];

const MANAGEMENT_ROLES = new Set(['admin', 'manager', 'spv', 'dispatcher', 'supervisor']);

function isDriverLogisticsUser(input: {
  job_title?: string | null;
  activity_type_name?: string | null;
  department_name?: string | null;
}) {
  const haystack = [input.job_title, input.activity_type_name, input.department_name]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return DRIVER_KEYWORDS.some((keyword) => haystack.includes(keyword));
}

async function resolveManagementProfile(authUser: User): Promise<DriverProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, status, requires_password_change')
    .eq('id', authUser.id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) return null;

  const status = String(data.status ?? '').trim().toLowerCase();
  const role = String(data.role ?? '').trim().toLowerCase();
  if (status !== 'active' || !MANAGEMENT_ROLES.has(role)) {
    return null;
  }

  const email = String(data.email ?? authUser.email ?? '').trim() || null;
  const fallbackName = email?.split('@')[0]?.replace(/[._-]+/g, ' ') ?? 'Admin';

  return {
    profileId: authUser.id,
    logisticsUserId: authUser.id,
    employeeCode: role,
    name: String(data.full_name ?? '').trim() || fallbackName,
    email,
    workPhone: null,
    mobilePhone: authUser.phone ?? null,
    jobTitle: role,
    workLocation: null,
    companyName: null,
    requiresPasswordChange: Boolean(data.requires_password_change),
  };
}

export async function resolveDriverProfile(authUser: User): Promise<DriverProfile> {
  // Primary source: profiles table
  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, status, requires_password_change')
    .eq('id', authUser.id)
    .maybeSingle();

  if (profileError) {
    throw new Error(profileError.message);
  }

  if (!profileData) {
    throw new Error('هذا الحساب غير موجود في النظام.');
  }

  const profileStatus = String(profileData.status ?? '').trim().toLowerCase();
  if (profileStatus !== 'active') {
    throw new Error('هذا الحساب غير نشط.');
  }

  // Check for linked logistics_users record for driver-specific metadata
  const { data: logisticsData, error: logisticsError } = await supabase
    .from('logistics_users')
    .select(
      'id, employee_name, work_email, work_phone, mobile_phone, employee_code, job_title, work_location, company_name, department_name, activity_type_name, status'
    )
    .eq('linked_profile_id', authUser.id)
    .eq('status', 'active')
    .maybeSingle();

  if (logisticsError) {
    throw new Error(logisticsError.message);
  }

  // If user has a logistics_users record, verify they are a driver
  if (logisticsData) {
    if (
      !isDriverLogisticsUser({
        job_title: logisticsData.job_title,
        activity_type_name: logisticsData.activity_type_name,
        department_name: logisticsData.department_name,
      })
    ) {
      // Not a driver — try management profile fallback
      const managementProfile = await resolveManagementProfile(authUser);
      if (managementProfile) return managementProfile;
      throw new Error('هذا الحساب لا يملك صلاحية دخول مساحة السائق.');
    }

    const employeeName = logisticsData.employee_name || String(profileData.full_name ?? '').trim();
    if (!employeeName) {
      throw new Error('سجل السائق لا يحتوي على اسم الموظف.');
    }

    return {
      profileId: authUser.id,
      logisticsUserId: String(logisticsData.id),
      employeeCode: logisticsData.employee_code ?? null,
      name: employeeName,
      email: logisticsData.work_email ?? profileData.email ?? authUser.email ?? null,
      workPhone: logisticsData.work_phone ?? null,
      mobilePhone: logisticsData.mobile_phone ?? null,
      jobTitle: logisticsData.job_title ?? null,
      workLocation: logisticsData.work_location ?? null,
      companyName: logisticsData.company_name ?? null,
      requiresPasswordChange: Boolean(profileData.requires_password_change),
    };
  }

  // No logistics_users record — check if profile role allows management access
  const profileRole = String(profileData.role ?? '').trim().toLowerCase();
  if (MANAGEMENT_ROLES.has(profileRole)) {
    const email = String(profileData.email ?? authUser.email ?? '').trim() || null;
    const fallbackName = email?.split('@')[0]?.replace(/[._-]+/g, ' ') ?? 'Admin';

    return {
      profileId: authUser.id,
      logisticsUserId: authUser.id,
      employeeCode: profileRole,
      name: String(profileData.full_name ?? '').trim() || fallbackName,
      email,
      workPhone: null,
      mobilePhone: authUser.phone ?? null,
      jobTitle: profileRole,
      workLocation: null,
      companyName: null,
      requiresPasswordChange: Boolean(profileData.requires_password_change),
    };
  }

  throw new Error('هذا الحساب غير مرتبط بسجل سائق لوجستيات نشط.');
}
