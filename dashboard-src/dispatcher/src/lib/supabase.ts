import { createClient } from '@supabase/supabase-js';

const supabaseUrl = String(import.meta.env.VITE_SUPABASE_URL ?? '').trim();
const supabaseAnonKey = String(
  import.meta.env.VITE_SUPABASE_ANON_KEY ??
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
    import.meta.env.VITE_SUPABASE_KEY ??
    ''
).trim();

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables for dispatcher app. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'
  );
}

const DISPATCHER_AUTH_STORAGE_KEY = 'dispatcher-workspace-auth';

function createSupabaseBrowserClient() {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
      flowType: 'pkce',
      storageKey: DISPATCHER_AUTH_STORAGE_KEY,
    },
    realtime: {
      params: { eventsPerSecond: 10 },
    },
  });
}

const driverGlobal = globalThis as typeof globalThis & {
  __dispatcherWorkspaceSupabase__?: ReturnType<typeof createSupabaseBrowserClient>;
};

export const supabase =
  driverGlobal.__dispatcherWorkspaceSupabase__ ??= createSupabaseBrowserClient();

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return String(error ?? '');
}

export function isSupabaseInvalidSessionError(error: unknown) {
  const message = getErrorMessage(error).toLowerCase();
  return (
    message.includes('invalid refresh token') ||
    message.includes('refresh token not found') ||
    message.includes('session from session_id claim in jwt does not exist')
  );
}

export function isSupabaseLockAcquireError(error: unknown) {
  const message = getErrorMessage(error).toLowerCase();
  return (
    message.includes('navigatorlockacquiretimeouterror') ||
    (message.includes('auth-token') && message.includes('another request stole it'))
  );
}

export type Database = import('../types/supabase-generated').Database;

export async function clearSupabaseBrowserSession() {
  try {
    await supabase.auth.signOut({ scope: 'local' });
  } catch {
    // Local cleanup below still removes the cached browser session.
  }

  try {
    globalThis.localStorage?.removeItem(DISPATCHER_AUTH_STORAGE_KEY);
  } catch {
    // Storage may be unavailable in private browsing or restricted contexts.
  }
}

export async function withSupabaseLockRetry<T>(
  operation: () => PromiseLike<T>,
  maxAttempts = 2
): Promise<T> {
  let attempt = 0;

  while (true) {
    try {
      return await operation();
    } catch (error) {
      if (!isSupabaseLockAcquireError(error) || attempt >= maxAttempts - 1) {
        throw error;
      }

      attempt += 1;
      await new Promise((resolve) => globalThis.setTimeout(resolve, 75 * attempt));
    }
  }
}
