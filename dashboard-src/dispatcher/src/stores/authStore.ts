import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { clearSupabaseBrowserSession, isSupabaseInvalidSessionError, supabase, withSupabaseLockRetry } from '../lib/supabase';
import type { DispatcherUser } from '../types';

interface AuthState {
  user: DispatcherUser | null;
  session: Awaited<ReturnType<typeof supabase.auth.getSession>>['data']['session'];
  isAuthenticated: boolean;
  requiresPasswordChange: boolean;
  isLoading: boolean;
  isChangingPassword: boolean;
  login: (identifier: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  changeTemporaryPassword: (password: string) => Promise<boolean>;
  initializeAuth: () => () => void;
}

function normalizePhone(input: string): string {
  const trimmed = input.trim();
  if (/^\+\d{10,15}$/.test(trimmed)) return trimmed;
  const digits = trimmed.replace(/\D/g, '');
  if (digits.startsWith('20') && digits.length >= 12) return `+${digits}`;
  if (digits.length === 11 && digits.startsWith('0')) return `+20${digits.slice(1)}`;
  if (digits.length === 10) return `+20${digits}`;
  return trimmed;
}

async function resolveDispatcherProfile(userId: string): Promise<DispatcherUser | null> {
  const { data } = await supabase.from('profiles').select('id, email, full_name, role, phone, avatar_url, requires_password_change').eq('id', userId).maybeSingle();
  if (!data) return null;
  return {
    id: data.id,
    email: data.email ?? '',
    full_name: data.full_name ?? '',
    role: (data.role as DispatcherUser['role']) ?? 'dispatcher',
    phone: data.phone ?? null,
    avatar_url: data.avatar_url ?? null,
    requires_password_change: data.requires_password_change ?? false,
  };
}

let initStarted = false;

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      session: null,
      isAuthenticated: false,
      requiresPasswordChange: false,
      isLoading: true,
      isChangingPassword: false,

      initializeAuth: () => {
        if (initStarted) return () => undefined;
        initStarted = true;

        let mounted = true;
        const syncSession = async (session: AuthState['session']) => {
          if (!mounted) return;

          try {
            if (session?.user) {
              const profile = await resolveDispatcherProfile(session.user.id);
              set({
                session,
                isAuthenticated: true,
                user: profile,
                requiresPasswordChange: profile?.requires_password_change ?? false,
              });
            } else {
              set({
                session: null,
                isAuthenticated: false,
                user: null,
                requiresPasswordChange: false,
              });
            }
          } catch (error) {
            if (isSupabaseInvalidSessionError(error)) {
              await clearSupabaseBrowserSession();
            }
            set({
              session: null,
              isAuthenticated: false,
              user: null,
              requiresPasswordChange: false,
            });
          } finally {
            if (mounted) set({ isLoading: false });
          }
        };

        withSupabaseLockRetry(() => supabase.auth.getSession())
          .then(({ data: { session } }) => syncSession(session))
          .catch(async (error) => {
            if (isSupabaseInvalidSessionError(error)) {
              await clearSupabaseBrowserSession();
            }
            if (mounted) {
              set({
                session: null,
                isAuthenticated: false,
                user: null,
                requiresPasswordChange: false,
                isLoading: false,
              });
            }
          });

        const {
          data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
          void syncSession(session);
        });

        return () => {
          mounted = false;
          initStarted = false;
          subscription.unsubscribe();
        };
      },

      login: async (identifier, password) => {
        set({ isLoading: true });
        const isEmail = identifier.includes('@');
        const loginId = isEmail ? identifier.trim() : normalizePhone(identifier);

        const profilePayload = isEmail
          ? { email: loginId }
          : { phone: loginId };

        const { data: profileCheck, error: profileCheckError } =
          await supabase.functions.invoke('profiles-auth', { body: profilePayload });

        if (profileCheckError || !profileCheck?.valid) {
          set({ isLoading: false });
          return false;
        }

        const signInPayload = isEmail
          ? { email: loginId, password }
          : { phone: loginId, password };

        const { error } = await supabase.auth.signInWithPassword(signInPayload as { email: string; password: string });
        if (error) {
          set({ isLoading: false });
          return false;
        }
        return true;
      },

      logout: async () => {
        await supabase.auth.signOut();
        set({ user: null, session: null, isAuthenticated: false, requiresPasswordChange: false });
        initStarted = false;
      },

      changeTemporaryPassword: async (password) => {
        set({ isChangingPassword: true });
        const { error } = await supabase.auth.updateUser({ password });
        if (error) {
          set({ isChangingPassword: false });
          return false;
        }
        const user = get().user;
        if (user) {
          await supabase.from('profiles').update({ requires_password_change: false }).eq('id', user.id);
          set({ user: { ...user, requires_password_change: false }, requiresPasswordChange: false, isChangingPassword: false });
        }
        return true;
      },
    }),
    {
      name: 'dispatcher-auth-storage',
      partialize: (state) => ({ user: state.user }),
    }
  )
);

const authGlobal = globalThis as typeof globalThis & {
  __dispatcherAuthCleanup__?: () => void;
};

if (typeof window !== 'undefined' && !authGlobal.__dispatcherAuthCleanup__) {
  authGlobal.__dispatcherAuthCleanup__ = useAuthStore.getState().initializeAuth();
}

