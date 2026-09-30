import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

const GOOGLE_TRANSLATE_URL = "https://clients5.google.com/translate_a/t";

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}
function requireEnv(name) {
  const value = Deno.env.get(name)?.trim();
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

const UNIT_MAP_AR_TO_EN = {
  "كجم": "kg", "جم": "g", "لتر": "L", "مل": "ml", "قطعه": "pc", "عبوه": "Pack"
};

async function googleTranslate(text, target = "en", source = "ar") {
  if (!text?.trim()) return null;
  const url = `${GOOGLE_TRANSLATE_URL}?client=dict-chrome-ex&sl=${encodeURIComponent(source)}&tl=${encodeURIComponent(target)}&q=${encodeURIComponent(text)}`;
  try {
    const response = await fetch(url, { headers: { "Accept": "application/json" }, signal: AbortSignal.timeout(15000) });
    if (!response.ok) return { __err: `HTTP ${response.status}` };
    const data = await response.json();
    const parts = [];
    if (Array.isArray(data)) {
      for (const item of data) {
        if (Array.isArray(item)) {
          if (typeof item[0] === "string") parts.push(item[0]);
        } else if (typeof item === "string") {
          parts.push(item);
        }
      }
    }
    const result = parts.join(" ").trim();
    return result || { __err: `empty` };
  } catch (err) {
    return { __err: String(err?.message ?? err) };
  }
}

async function translateField(text, fromScript) {
  if (!text?.trim()) return null;
  if (fromScript === "arabic") return await googleTranslate(text, "en", "ar");
  return await googleTranslate(text, "ar", "en");
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return jsonResponse({ error: "Method not allowed." }, 405);

  try {
    const authorization = request.headers.get("Authorization")?.trim();
    if (!authorization) return jsonResponse({ error: "Unauthorized." }, 401);

    const supabaseUrl = requireEnv("SUPABASE_URL");
    const callerClient = createClient(supabaseUrl, requireEnv("SUPABASE_ANON_KEY"), {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: authorization } }
    });
    const { data: userData, error: userError } = await callerClient.auth.getUser();
    if (userError || !userData.user) return jsonResponse({ error: "Unauthorized." }, 401);

    const body = await request.json();
    const brand = (body?.brand ?? "").toString().trim();
    const product = (body?.product ?? "").toString().trim();
    const fromScript = body?.from_script === "latin" ? "latin" : "arabic";

    const translatedBrand = await translateField(brand, fromScript);
    const translatedProduct = product ? await translateField(product, fromScript) : null;

    const brandOk = translatedBrand && typeof translatedBrand === "string";
    const productOk = translatedProduct && typeof translatedProduct === "string";
    const translationError = (translatedBrand?.__err || translatedProduct?.__err) || null;

    return jsonResponse({
      brand: brandOk ? translatedBrand : brand,
      product: productOk ? translatedProduct : product,
      translationError
    });
  } catch (err) {
    return jsonResponse({ error: "Translate failed.", detail: String(err?.message ?? err) }, 500);
  }
});