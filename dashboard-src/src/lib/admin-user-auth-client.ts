import { supabase } from "./supabase";

function extractErrorMessage(payload: unknown, status: number): string {
  if (!payload || typeof payload !== "object") {
    return `HTTP ${status}`;
  }

  if ("error" in payload && typeof payload.error === "string" && payload.error.trim()) {
    return payload.error;
  }

  if ("message" in payload && typeof payload.message === "string" && payload.message.trim()) {
    return payload.message;
  }

  if ("code" in payload && typeof payload.code === "string" && payload.code.trim()) {
    return payload.code;
  }

  return `HTTP ${status}`;
}

async function getAccessToken(forceRefresh = false): Promise<string | null> {
  if (forceRefresh) {
    const {
      data: { session },
      error,
    } = await supabase.auth.refreshSession();

    if (error) {
      return null;
    }

    return session?.access_token ?? null;
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  return session?.access_token ?? null;
}

async function postAdminUserAuth(
  body: Record<string, unknown>,
  accessToken: string,
) {
  return fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-user-auth`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
    },
    body: JSON.stringify(body),
  });
}

export async function invokeAdminUserAuth<T>(
  body: Record<string, unknown>,
): Promise<T> {
  const initialAccessToken = await getAccessToken();
  if (!initialAccessToken) {
    const refreshedAccessToken = await getAccessToken(true);
    if (!refreshedAccessToken) {
      throw new Error("Your session expired. Sign in again.");
    }

    const refreshedResponse = await postAdminUserAuth(body, refreshedAccessToken);
    const refreshedPayload = await refreshedResponse.json().catch(() => null);
    if (!refreshedResponse.ok) {
      throw new Error(extractErrorMessage(refreshedPayload, refreshedResponse.status));
    }

    return refreshedPayload as T;
  }

  let response = await postAdminUserAuth(body, initialAccessToken);
  let payload = await response.json().catch(() => null);

  if (response.status === 401) {
    const refreshedAccessToken = await getAccessToken(true);
    if (!refreshedAccessToken) {
      throw new Error("Your session expired. Sign in again.");
    }

    response = await postAdminUserAuth(body, refreshedAccessToken);
    payload = await response.json().catch(() => null);
  }

  if (!response.ok) {
    throw new Error(extractErrorMessage(payload, response.status));
  }

  return payload as T;
}
