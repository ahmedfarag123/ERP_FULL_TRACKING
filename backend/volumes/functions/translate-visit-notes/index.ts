import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};
const MAX_VISITS_PER_REQUEST = 12;
const LATIN_LETTER = /[A-Za-z]/;
function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json"
    }
  });
}
function requireEnv(name) {
  const value = Deno.env.get(name)?.trim();
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}
function optionalEnv(name) {
  return Deno.env.get(name)?.trim() || null;
}
function parseVisitIds(value) {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.filter((id)=>typeof id === "string").map((id)=>id.trim()).filter((id)=>/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(id)))).slice(0, MAX_VISITS_PER_REQUEST);
}
function isArabicOnly(text) {
  return Boolean(text.trim()) && !LATIN_LETTER.test(text);
}
async function translateToArabic(text) {
  const key = optionalEnv("TRANSLATION_API_KEY") || optionalEnv("OPENAI_API_KEY");
  const url = optionalEnv("TRANSLATION_API_URL") || (key ? "https://api.openai.com/v1/chat/completions" : null);
  const model = optionalEnv("TRANSLATION_MODEL") || "gpt-4o-mini";
  if (!key || !url) return null;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "system",
          content: "Translate the visit note into clear Modern Standard Arabic. Return only Arabic text. Translate or transliterate every English word, name, acronym, and brand so the response contains no Latin letters."
        },
        {
          role: "user",
          content: text
        }
      ],
      temperature: 0.1
    })
  });
  if (!response.ok) return null;
  const data = await response.json();
  const translated = data?.choices?.[0]?.message?.content;
  return typeof translated === "string" && isArabicOnly(translated) ? translated.trim() : null;
}
Deno.serve(async (request)=>{
  if (request.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders
    });
  }
  if (request.method !== "POST") {
    return jsonResponse({
      error: "Method not allowed."
    }, 405);
  }
  try {
    const authorization = request.headers.get("Authorization")?.trim();
    if (!authorization) return jsonResponse({
      error: "Unauthorized."
    }, 401);
    const supabaseUrl = requireEnv("SUPABASE_URL");
    const callerClient = createClient(supabaseUrl, requireEnv("SUPABASE_ANON_KEY"), {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      },
      global: {
        headers: {
          Authorization: authorization
        }
      }
    });
    const { data: userData, error: userError } = await callerClient.auth.getUser();
    if (userError || !userData.user) return jsonResponse({
      error: "Unauthorized."
    }, 401);
    const body = await request.json();
    const visitIds = parseVisitIds(body?.visitIds);
    if (visitIds.length === 0) return jsonResponse({
      translations: []
    });
    // This RLS-scoped read prevents callers from translating notes they cannot view.
    const { data: visitRows, error: visitError } = await callerClient.from("visits").select("id, note").in("id", visitIds);
    if (visitError) throw visitError;
    const notes = (visitRows ?? []).filter((visit)=>typeof visit.note === "string" && LATIN_LETTER.test(visit.note));
    if (notes.length === 0) return jsonResponse({
      translations: []
    });
    const adminClient = createClient(supabaseUrl, requireEnv("SUPABASE_SERVICE_ROLE_KEY"), {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });
    const { data: cachedRows, error: cacheError } = await adminClient.from("visit_note_translations").select("visit_id, source_note, translated_note").in("visit_id", notes.map((visit)=>visit.id));
    if (cacheError) throw cacheError;
    const cached = new Map((cachedRows ?? []).filter((row)=>row.source_note && isArabicOnly(row.translated_note ?? "")).map((row)=>[
        row.visit_id,
        row
      ]));
    const translations = [];
    for (const visit of notes){
      const existing = cached.get(visit.id);
      if (existing?.source_note === visit.note) {
        translations.push({
          visitId: visit.id,
          note: existing.translated_note
        });
        continue;
      }
      const translated = await translateToArabic(visit.note);
      if (!translated) continue;
      const { error: upsertError } = await adminClient.from("visit_note_translations").upsert({
        visit_id: visit.id,
        source_note: visit.note,
        translated_note: translated
      });
      if (upsertError) throw upsertError;
      translations.push({
        visitId: visit.id,
        note: translated
      });
    }
    return jsonResponse({
      translations
    });
  } catch (error) {
    console.error("Unable to translate visit notes.", error);
    return jsonResponse({
      error: "Unable to translate visit notes."
    }, 500);
  }
});
