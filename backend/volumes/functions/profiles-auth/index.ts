import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")?.trim() ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim() ?? "";
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing Supabase function environment variables.");
}
const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});
function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json"
    }
  });
}
function normalizeEmail(value) {
  return String(value ?? "").trim().toLowerCase();
}
function normalizePhoneE164(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  if (raw.startsWith("+")) return raw.replace(/\s+/g, "");
  const digits = raw.replace(/[^\d]/g, "");
  if (digits.startsWith("0")) return "+20" + digits;
  if (digits.startsWith("20")) return "+" + digits;
  return "+20" + digits;
}
function phoneLookupVariants(value) {
  const raw = String(value ?? "").trim();
  const digits = raw.replace(/[^\d]/g, "");
  if (!digits) return [];
  const variants = new Set();
  if (raw) variants.add(raw.replace(/\s+/g, ""));
  variants.add(digits);
  if (digits.startsWith("0")) {
    variants.add("+20" + digits.slice(1));
    variants.add("20" + digits.slice(1));
  } else if (digits.startsWith("20")) {
    variants.add("+" + digits);
    variants.add("0" + digits.slice(2));
  } else {
    variants.add("+20" + digits);
    variants.add("20" + digits);
    variants.add("0" + digits);
  }
  const e164 = normalizePhoneE164(value);
  if (e164) variants.add(e164);
  return Array.from(variants).filter(Boolean);
}
async function findProfileByPhone(phoneVariants) {
  if (phoneVariants.length === 0) return null;
  const { data: directProfiles, error: directProfileError } = await adminClient.from("profiles").select("id, email, status, force_logout_at, requires_password_change").in("phone", phoneVariants).limit(1);
  if (directProfileError) {
    throw directProfileError;
  }
  if (directProfiles?.[0]) {
    return directProfiles[0];
  }
  const inList = phoneVariants.map((item)=>`"${item.replace(/"/g, '\\"')}"`).join(",");
  const { data: logisticsUsers, error: logisticsError } = await adminClient.from("logistics_users").select("linked_profile_id, mobile_phone, work_phone").eq("status", "active").not("linked_profile_id", "is", null).or(`mobile_phone.in.(${inList}),work_phone.in.(${inList})`).limit(1);
  if (logisticsError) {
    throw logisticsError;
  }
  const linkedProfileId = logisticsUsers?.[0]?.linked_profile_id;
  if (!linkedProfileId) return null;
  const { data: linkedProfile, error: linkedProfileError } = await adminClient.from("profiles").select("id, email, status, force_logout_at, requires_password_change").eq("id", linkedProfileId).maybeSingle();
  if (linkedProfileError) {
    throw linkedProfileError;
  }
  return linkedProfile ?? null;
}
Deno.serve(async (request)=>{
  if (request.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders
    });
  }
  try {
    const body = await request.json();
    const email = normalizeEmail(body.email);
    const phone = normalizePhoneE164(body.phone);
    if (!email && !phone) {
      return jsonResponse({
        valid: false,
        error: "Email or phone is required."
      }, 400);
    }
    let profile = null;
    if (email) {
      const { data, error: profileError } = await adminClient.from("profiles").select("id, email, status, force_logout_at, requires_password_change").eq("email", email).maybeSingle();
      if (profileError) {
        return jsonResponse({
          valid: false,
          error: "Unable to verify account."
        }, 500);
      }
      profile = data;
    } else {
      profile = await findProfileByPhone(phoneLookupVariants(body.phone));
    }
    if (!profile) {
      return jsonResponse({
        valid: false,
        error: "No account found with this email or phone."
      }, 403);
    }
    if (String(profile.status ?? "").trim().toLowerCase() !== "active") {
      return jsonResponse({
        valid: false,
        error: "This account is inactive."
      }, 403);
    }
    if (profile.force_logout_at) {
      return jsonResponse({
        valid: false,
        error: "This account has been force-logged out."
      }, 403);
    }
    const authEmail = normalizeEmail(profile.email);
    if (!authEmail) {
      return jsonResponse({
        valid: false,
        error: "This account has no email login configured."
      }, 403);
    }
    return jsonResponse({
      valid: true,
      authEmail,
      requiresPasswordChange: Boolean(profile.requires_password_change)
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error.";
    return jsonResponse({
      valid: false,
      error: message
    }, 500);
  }
});
