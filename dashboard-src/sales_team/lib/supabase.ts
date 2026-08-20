import { createClient } from '@supabase/supabase-js'

const supabaseUrl = String(import.meta.env.VITE_SUPABASE_URL ?? '').trim()
const supabaseAnonKey = String(
  import.meta.env.VITE_SUPABASE_ANON_KEY ??
    import.meta.env.VITE_SUPABASE_KEY ??
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY ??
    ''
).trim()

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables for sales app. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (or VITE_SUPABASE_KEY).'
  )
}

const SALES_AUTH_STORAGE_KEY = 'sales-workspace-auth'

function getSupabaseProjectRef() {
  try {
    return new URL(supabaseUrl).hostname.split('.')[0] ?? ''
  } catch {
    return ''
  }
}

function migrateLegacySessionStorage() {
  if (typeof window === 'undefined') return

  const projectRef = getSupabaseProjectRef()
  if (!projectRef) return

  const legacyStorageKey = `sb-${projectRef}-auth-token`

  try {
    const nextSession = window.localStorage.getItem(SALES_AUTH_STORAGE_KEY)
    if (nextSession) return

    const legacySession = window.localStorage.getItem(legacyStorageKey)
    if (legacySession) {
      window.localStorage.setItem(SALES_AUTH_STORAGE_KEY, legacySession)
    }
  } catch {}
}

function createSupabaseBrowserClient() {
  migrateLegacySessionStorage()

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
      storageKey: SALES_AUTH_STORAGE_KEY
    },
    realtime: {
      params: { eventsPerSecond: 10 }
    }
  })
}

const salesGlobal = globalThis as typeof globalThis & {
  __salesWorkspaceSupabase__?: ReturnType<typeof createSupabaseBrowserClient>
}

export const supabase = salesGlobal.__salesWorkspaceSupabase__ ??= createSupabaseBrowserClient()

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  return String(error ?? '')
}

export function isSupabaseInvalidSessionError(error: unknown) {
  const message = getErrorMessage(error).toLowerCase()
  return (
    message.includes('invalid refresh token') ||
    message.includes('refresh token not found') ||
    message.includes('session from session_id claim in jwt does not exist')
  )
}

export function isSupabaseLockAcquireError(error: unknown) {
  const message = getErrorMessage(error).toLowerCase()
  return (
    message.includes('navigatorlockacquiretimeouterror') ||
    (message.includes('auth-token') && message.includes('another request stole it'))
  )
}

export async function clearSupabaseBrowserSession() {
  try {
    await supabase.auth.signOut({ scope: 'local' })
  } catch {}

  try {
    globalThis.localStorage?.removeItem(SALES_AUTH_STORAGE_KEY)
  } catch {}
}

export async function withSupabaseLockRetry<T>(operation: () => PromiseLike<T>, maxAttempts = 2): Promise<T> {
  let attempt = 0

  while (true) {
    try {
      return await operation()
    } catch (error) {
      if (!isSupabaseLockAcquireError(error) || attempt >= maxAttempts - 1) {
        throw error
      }

      attempt += 1
      await new Promise((resolve) => globalThis.setTimeout(resolve, 75 * attempt))
    }
  }
}

export type Database = import('../../supabase/types-generated').Database
