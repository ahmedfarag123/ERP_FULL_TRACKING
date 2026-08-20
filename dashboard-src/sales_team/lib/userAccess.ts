import { supabase, withSupabaseLockRetry } from './supabase'
import { useAuthStore } from '../store/authStore'
import { findProfileByAuthUser } from '../../lib/profileIdentity'

const PRIVILEGED_ROLES = new Set(['admin', 'full_admin', 'telesales'])

export type ScopedUserContext = {
  id: string
  email: string
  role: string
  isPrivileged: boolean
}

export async function getScopedUserContext(): Promise<ScopedUserContext | null> {
  const persistedUser = useAuthStore.getState().user

  if (persistedUser?.id && persistedUser.email) {
    const role = typeof persistedUser.role === 'string' && persistedUser.role.trim().length > 0 ? persistedUser.role : 'user'

    return {
      id: persistedUser.id,
      email: persistedUser.email,
      role,
      isPrivileged: PRIVILEGED_ROLES.has(role)
    }
  }

  const {
    data: { session },
    error: sessionError
  } = await withSupabaseLockRetry(() => supabase.auth.getSession())

  const user = session?.user

  if (sessionError || !user?.id || !user.email) {
    return null
  }

  let role = 'user'
  const profile = await findProfileByAuthUser<Record<string, unknown>>(supabase, user).catch(() => null)

  if (typeof profile?.role === 'string' && profile.role.trim().length > 0) {
    role = profile.role
  }

  return {
    id: String(profile?.id ?? user.id),
    email: String(profile?.email ?? user.email),
    role,
    isPrivileged: PRIVILEGED_ROLES.has(role)
  }
}
