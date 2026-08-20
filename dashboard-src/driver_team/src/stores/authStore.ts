import type { Session } from '@supabase/supabase-js';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Driver } from '@/types';
import type { DriverProfile } from '@/types/driverBackend';
import {
  clearSupabaseBrowserSession,
  isSupabaseInvalidSessionError,
  supabase,
  withSupabaseLockRetry,
} from '@/lib/supabase';
import { resolveDriverProfile } from '@/services/driverAccess';

interface AuthState {
  user: Driver | null;
  token: string | null;
  session: Session | null;
  profile: DriverProfile | null;
  isAuthenticated: boolean;
  requiresPasswordChange: boolean;
  isLoading: boolean;
  isChangingPassword: boolean;
  login: (phone: string, password: string) => Promise<boolean>;
  changeTemporaryPassword: (password: string) => Promise<string | null>;
  logout: () => void;
  initializeAuth: () => () => void;
}

function toDriver(profile: DriverProfile): Driver {
  const nameParts = profile.name.trim().split(/\s+/).filter(Boolean);
  const firstName = nameParts[0] ?? null;
  const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : null;

  return {
    id: profile.profileId,
    firstName,
    lastName,
    phone: profile.mobilePhone ?? profile.workPhone ?? null,
    email: profile.email,
  };
}

function normalizePhone(input: string) {
  const trimmed = input.trim();
  if (trimmed.startsWith('+')) return trimmed.replace(/\s+/g, '');
  const digits = trimmed.replace(/[^\d]/g, '');
  if (digits.startsWith('0')) return '+20' + digits;
  if (digits.startsWith('20')) return '+' + digits;
  return '+20' + digits;
}

type ProfileAuthCheck = {
  valid?: boolean;
  requiresPasswordChange?: boolean;
};

function toTemporaryPasswordDriver(session: Session): Driver {
  const email = session.user.email ?? null;
  const phone = session.user.phone ?? null;

  return {
    id: session.user.id,
    firstName: email?.split('@')[0]?.replace(/[._-]+/g, ' ') ?? null,
    lastName: null,
    phone,
    email,
  };
}

function setTemporaryPasswordSession(session: Session, set: (state: Partial<AuthState>) => void) {
  set({
    user: toTemporaryPasswordDriver(session),
    token: session.access_token,
    session,
    profile: null,
    isAuthenticated: true,
    requiresPasswordChange: true,
  });
}

function profileAuthPayloadFromSession(session: Session) {
  const email = session.user.email?.trim();
  const phone = session.user.phone?.trim();

  if (email) return { email };
  if (phone) return { phone };
  return null;
}

async function checkProfileAuth(payload: { email?: string; phone?: string }) {
  const { data, error } = await supabase.functions.invoke<ProfileAuthCheck>('profiles-auth', {
    body: payload,
  });

  if (error || !data?.valid) {
    return null;
  }

  return data;
}

async function trySignIn(phone: string, password: string) {
  const e164 = normalizePhone(phone);
  const local = phone.trim().replace(/[^\d]/g, '');

  const first = await supabase.auth.signInWithPassword({ phone: e164, password });
  if (!first.error || first.data.session) return first;

  if (e164 !== local) {
    const second = await supabase.auth.signInWithPassword({ phone: local, password });
    if (!second.error || second.data.session) return second;
  }

  return first;
}

async function resolveAndSetDriver(session: Session | null, set: (state: Partial<AuthState>) => void) {
  if (!session?.user) {
    set({
      user: null,
      token: null,
      session: null,
      profile: null,
      isAuthenticated: false,
      requiresPasswordChange: false,
    });
    return;
  }

  const profile = await resolveDriverProfile(session.user);
  set({
    user: toDriver(profile),
    token: session.access_token,
    session,
    profile,
    isAuthenticated: true,
    requiresPasswordChange: profile.requiresPasswordChange,
  });
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      session: null,
      profile: null,
      isAuthenticated: false,
      requiresPasswordChange: false,
      isLoading: true,
      isChangingPassword: false,

      login: async (phone: string, password: string) => {
        set({ isLoading: true });

        try {
          const identifier = phone.trim();
          const isEmail = identifier.includes('@');

          const profilePayload = isEmail
            ? { email: identifier }
            : { phone: normalizePhone(identifier) };

          const profileCheck = await checkProfileAuth(profilePayload);

          if (!profileCheck) {
            set({ isLoading: false });
            return false;
          }

          const credentials = isEmail
            ? { email: identifier, password }
            : undefined;

          const { data, error } = isEmail
            ? await supabase.auth.signInWithPassword(credentials!)
            : await trySignIn(identifier, password);

          if (error || !data.session) {
            set({ isLoading: false });
            return false;
          }

          if (profileCheck.requiresPasswordChange) {
            setTemporaryPasswordSession(data.session, set);
            set({ isLoading: false });
            return true;
          }

          await resolveAndSetDriver(data.session, set);
          set({ isLoading: false });
          return true;
        } catch {
          await supabase.auth.signOut().catch(() => undefined);
          set({
            user: null,
            token: null,
            session: null,
            profile: null,
            isAuthenticated: false,
            requiresPasswordChange: false,
            isLoading: false,
          });
          return false;
        }
      },

      changeTemporaryPassword: async (password: string) => {
        set({ isLoading: true, isChangingPassword: true });

        try {
          const { error: updateError } = await supabase.auth.updateUser({ password });
          if (updateError) {
            set({ isLoading: false, isChangingPassword: false });
            return updateError.message || 'Failed to update password.';
          }

          const { error: rpcError } = await supabase.rpc('complete_forced_password_change');
          if (rpcError) {
            set({ isLoading: false, isChangingPassword: false });
            return rpcError.message || 'Failed to complete password change.';
          }

          const { data } = await withSupabaseLockRetry(() => supabase.auth.getSession());
          await resolveAndSetDriver(data.session, set);
          set({ requiresPasswordChange: false, isLoading: false, isChangingPassword: false });
          return null;
        } catch (e: unknown) {
          set({ isLoading: false, isChangingPassword: false });
          return (e instanceof Error ? e.message : null) || 'An unexpected error occurred.';
        }
      },

      logout: () => {
        void supabase.auth.signOut().finally(() => {
          set({
            user: null,
            token: null,
            session: null,
            profile: null,
            isAuthenticated: false,
            requiresPasswordChange: false,
            isLoading: false,
          });
        });
      },

      initializeAuth: () => {
        let mounted = true;
        set({ isLoading: true });

        const syncSession = async (session: Session | null) => {
          if (!mounted) return;
          if (get().isChangingPassword) return;
          try {
            if (session) {
              const profilePayload = profileAuthPayloadFromSession(session);
              const profileCheck = profilePayload ? await checkProfileAuth(profilePayload) : null;
              if (profileCheck?.requiresPasswordChange) {
                setTemporaryPasswordSession(session, set);
                return;
              }
            }

            await resolveAndSetDriver(session, set);
          } catch (error) {
            if (isSupabaseInvalidSessionError(error)) {
              await clearSupabaseBrowserSession();
            } else {
              await supabase.auth.signOut().catch(() => undefined);
            }
            if (mounted) {
              set({
                user: null,
                token: null,
                session: null,
                profile: null,
                isAuthenticated: false,
                requiresPasswordChange: false,
              });
            }
          } finally {
            if (mounted) {
              set({ isLoading: false });
            }
          }
        };

        const {
          data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
          void syncSession(session);
        });

        void withSupabaseLockRetry(() => supabase.auth.getSession())
          .then(({ data }) => syncSession(data.session))
          .catch(async (error) => {
            if (isSupabaseInvalidSessionError(error)) {
              await clearSupabaseBrowserSession();
            }
            if (mounted) {
              set({
                user: null,
                token: null,
                session: null,
                profile: null,
                isAuthenticated: false,
                requiresPasswordChange: false,
                isLoading: false,
              });
            }
          });

        return () => {
          mounted = false;
          subscription.unsubscribe();
        };
      },
    }),
    {
      name: 'horeca-auth-storage',
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<AuthState> | null;

        return {
          ...currentState,
          user: persisted?.user ?? null,
          profile: persisted?.profile ?? null,
          requiresPasswordChange: currentState.requiresPasswordChange,
        };
      },
      partialize: (state) => ({
        user: state.user,
        profile: state.profile,
      }),
    }
  )
);

const authGlobal = globalThis as typeof globalThis & {
  __horecaDriverAuthCleanup__?: () => void;
};

if (typeof window !== 'undefined' && !authGlobal.__horecaDriverAuthCleanup__) {
  authGlobal.__horecaDriverAuthCleanup__ = useAuthStore.getState().initializeAuth();
}
