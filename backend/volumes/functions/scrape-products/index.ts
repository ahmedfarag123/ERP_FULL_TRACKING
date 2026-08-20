import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
function parseCsv(text, delimiter) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  let i = 0;
  while(i < text.length){
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += c;
      i++;
      continue;
    }
    if (c === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (c === delimiter) {
      row.push(field);
      field = "";
      i++;
      continue;
    }
    if (c === "\r") {
      i++;
      continue;
    }
    if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      i++;
      continue;
    }
    field += c;
    i++;
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r)=>!(r.length === 1 && r[0] === ""));
}
const BASE_URL = Deno.env.get("SUPPLIER_BASE_URL") || "https://my.cartona.com";
const LOGIN_URL = `${BASE_URL}/supplier/login`;
const EXPORT_URL = `${BASE_URL}/supplier/product_suppliers.csv?scope=all`;
const EMAIL = Deno.env.get("SUPPLIER_EMAIL") || "";
const PASSWORD = Deno.env.get("SUPPLIER_PASSWORD") || "";
const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "ar,en-US;q=0.9,en;q=0.8"
};
function extractCookies(resp, jar) {
  const setCookieHeader = resp.headers.get("set-cookie");
  if (!setCookieHeader) return;
  const cookies = setCookieHeader.split(/,(?=[^;]+=[^;])/);
  for (const sc of cookies){
    const eqIdx = sc.indexOf("=");
    if (eqIdx <= 0) continue;
    const k = sc.substring(0, eqIdx).trim();
    const rest = sc.substring(eqIdx + 1);
    const v = rest.split(";")[0].trim();
    if (k) jar[k] = v;
  }
}
function cookieString(jar) {
  return Object.entries(jar).map(([k, v])=>`${k}=${v}`).join("; ");
}
async function login(jar) {
  const r1 = await fetch(LOGIN_URL, {
    headers: {
      ...HEADERS,
      Cookie: ""
    },
    redirect: "manual"
  });
  extractCookies(r1, jar);
  const html = await r1.text();
  const csrfMatch = html.match(/name="authenticity_token"[^>]*value="([^"]+)"/);
  const csrfToken = csrfMatch ? csrfMatch[1] : "";
  const payload = new URLSearchParams();
  payload.append("supplier_user[email]", EMAIL);
  payload.append("supplier_user[password]", PASSWORD);
  payload.append("supplier_user[remember_me]", "1");
  if (csrfToken) payload.append("authenticity_token", csrfToken);
  const r2 = await fetch(LOGIN_URL, {
    method: "POST",
    headers: {
      ...HEADERS,
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: cookieString(jar),
      Referer: LOGIN_URL
    },
    body: payload.toString(),
    redirect: "manual"
  });
  extractCookies(r2, jar);
  if (![
    301,
    302,
    303,
    307
  ].includes(r2.status)) {
    throw new Error(`Login failed with status ${r2.status}`);
  }
  const loc = r2.headers.get("location");
  if (loc) {
    const followUrl = loc.startsWith("http") ? loc : BASE_URL + loc;
    const r3 = await fetch(followUrl, {
      headers: {
        ...HEADERS,
        Cookie: cookieString(jar)
      },
      redirect: "manual"
    });
    extractCookies(r3, jar);
  }
}
async function fetchCsv(jar) {
  let resp = await fetch(EXPORT_URL, {
    headers: {
      ...HEADERS,
      Cookie: cookieString(jar)
    },
    redirect: "manual"
  });
  extractCookies(resp, jar);
  let hops = 0;
  while([
    301,
    302,
    303,
    307
  ].includes(resp.status) && hops < 5){
    const loc = resp.headers.get("location");
    if (!loc) break;
    const followUrl = loc.startsWith("http") ? loc : BASE_URL + loc;
    resp = await fetch(followUrl, {
      headers: {
        ...HEADERS,
        Cookie: cookieString(jar)
      },
      redirect: "manual"
    });
    extractCookies(resp, jar);
    hops++;
  }
  if (!resp.ok) {
    throw new Error(`CSV export request failed with status ${resp.status}`);
  }
  const text = await resp.text();
  if (text.trim().startsWith("<") || text.includes("<html")) {
    throw new Error("CSV export returned HTML instead of CSV — session likely not authenticated");
  }
  return text;
}
function stripBom(text) {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}
function detectDelimiter(firstLine) {
  // Prefer tab if present anywhere in the line (most reliable).
  if (firstLine.includes("\t")) return "\t";
  // Otherwise fall back to counting commas.
  const commas = (firstLine.match(/,/g) || []).length;
  return commas > 0 ? "," : "\t";
}
function toBool(v) {
  const s = (v || "").trim().toLowerCase();
  if (s === "true") return true;
  if (s === "false") return false;
  return null;
}
function toNumber(v) {
  const s = (v || "").trim();
  if (s === "") return null;
  const n = Number(s);
  return Number.isNaN(n) ? null : n;
}
function toTimestamp(v) {
  const s = (v || "").trim();
  if (s === "") return null;
  const iso = s.replace(" UTC", "Z").replace(" ", "T");
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}
const HEADER_MAP = {
  "الرقم المسلسل": "serial_id",
  "المورد": "supplier_name",
  "رقم المنتج الداخلي": "internal_product_id",
  "الأسم": "full_name",
  "الوحدة": "unit",
  "المنتج": "product_name",
  "الصنف": "category",
  "السعر(بعد الضريبة)": "price_after_tax",
  "أفضل سعر": "best_price",
  "منشور": "published",
  "يوجد مخزون": "in_stock",
  "أقل عدد للطلبية": "min_order_qty",
  "أقصي عدد للطلبية": "max_order_qty",
  "Sold amount": "sold_amount",
  "أنشأ في": "created_at",
  "ملاحظات": "notes"
};
function rowToRecord(headerRow, row) {
  const record = {};
  headerRow.forEach((rawHeader, i)=>{
    const header = rawHeader.trim();
    const col = HEADER_MAP[header];
    if (!col) return;
    const raw = row[i] ?? "";
    switch(col){
      case "serial_id":
      case "internal_product_id":
      case "min_order_qty":
      case "max_order_qty":
      case "sold_amount":
        record[col] = toNumber(raw);
        break;
      case "price_after_tax":
      case "best_price":
        record[col] = toNumber(raw);
        break;
      case "published":
      case "in_stock":
        record[col] = toBool(raw);
        break;
      case "created_at":
        record[col] = toTimestamp(raw);
        break;
      default:
        record[col] = raw.trim() === "" ? null : raw.trim();
    }
  });
  record.scraped_at = new Date().toISOString();
  return record;
}
serve(async (_req)=>{
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const supabase = createClient(supabaseUrl, supabaseKey);
  try {
    const jar = {};
    await login(jar);
    const csvText = stripBom(await fetchCsv(jar));
    const firstLine = csvText.split(/\r?\n/).find((l)=>l.trim().length > 0) || "";
    const delimiter = detectDelimiter(firstLine);
    const rows = parseCsv(csvText, delimiter);
    if (!rows.length) throw new Error("CSV export was empty");
    const [headerRow, ...dataRows] = rows;
    const records = dataRows.filter((r)=>r.length > 1 || (r[0] ?? "").trim() !== "").map((r)=>rowToRecord(headerRow, r)).filter((r)=>r.serial_id != null);
    for(let i = 0; i < records.length; i += 50){
      const batch = records.slice(i, i + 50);
      const { error } = await supabase.from("product_suppliers").upsert(batch, {
        onConflict: "serial_id"
      });
      if (error) throw new Error(`Supabase upsert error: ${error.message}`);
    }
    await supabase.from("scrape_logs").insert({
      products_count: records.length,
      pages_scraped: 1,
      status: "success"
    });
    return new Response(JSON.stringify({
      success: true,
      products: records.length,
      delimiter,
      headerColumns: headerRow.length
    }), {
      headers: {
        "Content-Type": "application/json"
      }
    });
  } catch (err) {
    await supabase.from("scrape_logs").insert({
      products_count: 0,
      pages_scraped: 0,
      status: "error",
      error_message: err instanceof Error ? err.message : String(err)
    });
    return new Response(JSON.stringify({
      success: false,
      error: err instanceof Error ? err.message : String(err)
    }), {
      status: 500,
      headers: {
        "Content-Type": "application/json"
      }
    });
  }
});
