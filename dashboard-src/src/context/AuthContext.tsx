import type { Session, User } from "@supabase/supabase-js";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { supabase } from "../lib/supabase";
import { isManagementRole } from "../lib/admin-operations-data";
import type { LegacyRole } from "../types/admin-operations";

interface AdminProfile {
  id: string;
  email: string;
  fullName: string;
  role: LegacyRole;
  avatarUrl: string | null;
  requiresPasswordChange: boolean;
  source: "profiles";
}

interface AuthContextValue {
  session: Session | null;
  authUser: User | null;
  profile: AdminProfile | null;
  isAuthenticated: boolean;
  requiresPasswordChange: boolean;
  isLoading: boolean;
  error: string;
  signIn: (
    email: string,
    password: string,
  ) => Promise<{ error: string | null; requiresPasswordChange: boolean }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function localizeSupabaseError(message: string): string {
  const normalized = message.toLowerCase();
  if (normalized.includes("invalid login credentials")) {
    return "The email or password is incorrect.";
  }
  if (normalized.includes("email not confirmed")) {
    return "This email address has not been confirmed yet.";
  }
  if (normalized.includes("too many requests")) {
    return "Too many attempts. Try again in a moment.";
  }
  return message;
}

function buildFallbackName(email: string): string {
  return email.split("@")[0]?.replace(/[._-]+/g, " ") || email;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [session, setSession] = useState<Session | null>(null);
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const profileRequestCacheRef = useRef(new Map<string, Promise<AdminProfile>>());

  const resolveProfile = useCallback(async (user: User): Promise<AdminProfile> => {
    const email = String(user.email ?? "").trim().toLowerCase();

    const { data, error: profileError } = await supabase
      .from("profiles")
      .select("id, email, full_name, role, avatar_url, force_logout_at, status, requires_password_change")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      throw new Error(profileError.message);
    }
    if (!data) {
      throw new Error("Admin profile not found in Supabase.");
    }
    if (String(data.status ?? "").trim().toLowerCase() !== "active") {
      throw new Error("This account is inactive.");
    }
    if (data.force_logout_at) {
      throw new Error("This account has been force-logged out.");
    }

    const role = String(data.role ?? "").trim().toLowerCase() as LegacyRole;
    if (!isManagementRole(role)) {
      throw new Error("This account does not have access to the admin workspace.");
    }

    return {
      id: String(data.id),
      email: String(data.email ?? email).trim().toLowerCase(),
      fullName: String(data.full_name ?? "").trim() || buildFallbackName(email),
      role,
      avatarUrl: String(data.avatar_url ?? "").trim() || null,
      requiresPasswordChange: Boolean(data.requires_password_change),
      source: "profiles",
    };
  }, []);

  const resolveProfileCached = useCallback(
    (user: User) => {
      const cachedRequest = profileRequestCacheRef.current.get(user.id);
      if (cachedRequest) {
        return cachedRequest;
      }

      const request = resolveProfile(user).finally(() => {
        if (profileRequestCacheRef.current.get(user.id) === request) {
          profileRequestCacheRef.current.delete(user.id);
        }
      });

      profileRequestCacheRef.current.set(user.id, request);
      return request;
    },
    [resolveProfile],
  );

  const hydrate = useCallback(
    async (nextSession: Session | null) => {
      setSession(nextSession);
      setAuthUser(nextSession?.user ?? null);

      if (!nextSession?.user) {
        setProfile(null);
        setError("");
        setIsLoading(false);
        return;
      }

      try {
        const nextProfile = await resolveProfileCached(nextSession.user);
        setProfile(nextProfile);
        setError("");
      } catch (hydrateError) {
        const message =
          hydrateError instanceof Error
            ? hydrateError.message
            : "Unable to verify account permissions.";
        setProfile(null);
        setError(message);
        await supabase.auth.signOut();
        setSession(null);
        setAuthUser(null);
      } finally {
        setIsLoading(false);
      }
    },
    [resolveProfileCached],
  );

  useEffect(() => {
    let isMounted = true;

    const boot = async () => {
      setIsLoading(true);
      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession();

      if (isMounted) {
        await hydrate(currentSession);
      }
    };

    void boot();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      void hydrate(nextSession);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [hydrate]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      setError("");

      const normalizedEmail = email.trim().toLowerCase();

      const { data: profileCheck, error: profileCheckError } =
        await supabase.functions.invoke("profiles-auth", {
          body: { email: normalizedEmail },
        });

      if (profileCheckError || !profileCheck?.valid) {
        const message =
          profileCheck?.error ||
          profileCheckError?.message ||
          "Unable to verify account.";
        return { error: message, requiresPasswordChange: false };
      }

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (signInError) {
        return {
          error: localizeSupabaseError(signInError.message),
          requiresPasswordChange: false,
        };
      }

      try {
        const nextProfile = await resolveProfileCached(data.user);
        setSession(data.session);
        setAuthUser(data.user);
        setProfile(nextProfile);
        return {
          error: null,
          requiresPasswordChange: nextProfile.requiresPasswordChange,
        };
      } catch (resolveError) {
        await supabase.auth.signOut();
        const message =
          resolveError instanceof Error
            ? resolveError.message
            : "Unable to verify the admin account.";
        setError(message);
        return { error: message, requiresPasswordChange: false };
      }
    },
    [resolveProfileCached],
  );

  const signOut = useCallback(async () => {
    profileRequestCacheRef.current.clear();
    await supabase.auth.signOut();
    setSession(null);
    setAuthUser(null);
    setProfile(null);
    setError("");
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!authUser) return;
    setIsLoading(true);
    try {
      const nextProfile = await resolveProfileCached(authUser);
      setProfile(nextProfile);
      setError("");
    } catch (refreshError) {
      const message =
        refreshError instanceof Error
          ? refreshError.message
          : "Unable to refresh account details.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [authUser, resolveProfileCached]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      authUser,
      profile,
      isAuthenticated: Boolean(session && profile),
      requiresPasswordChange: Boolean(profile?.requiresPasswordChange),
      isLoading,
      error,
      signIn,
      signOut,
      refreshProfile,
    }),
    [
      authUser,
      error,
      isLoading,
      profile,
      refreshProfile,
      session,
      signIn,
      signOut,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
