import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";

const CSV_PATH = "supabase/scripts/CST.CSV";
const OLD_PROFILES_PATH = "output/old-supabase-export/profiles.json";
const DEFAULT_MIGRATION_PATH = "supabase/migrations/20260720084434_import_cst_customers_assignments.sql";

const OLD_PROFILE_EMAIL_OVERRIDES = new Map([
  ["03431105-2354-49ad-8e14-f0eaaf3d846f", "abdoamin1@hs.com"],
  ["5c35c1cf-8008-4dd3-a8de-02900f2dd524", "islammahmoud11@hs.com"],
  ["5c35c1cf-8008-4dd3-a8d0-02900f2dd524", "islammahmoud11@hs.com"],
  ["5b5bdce7-5217-45e1-9925-311a2127cbee", "ahmedadel22@hs.com"],
  ["baee2375-6fc2-4675-8e07-c16c7103bba4", "ahmedalaa11@hs.com"],
  ["5d7d5227-37a3-4d62-9c3c-fa53a7cee487", "abdelrahman12@hs.com"],
]);

const OLD_TO_LIVE_EMAIL_CORRECTIONS = new Map([
  ["ahmedade122@hs.com", "ahmedadel22@hs.com"],
  ["ahmedalaa1lehs.com", "ahmedalaa11@hs.com"],
  ["mohamedkhalied1@hs.com", "mohamedkhaled11@hs.com"],
]);

function loadLocalEnv() {
  const envPath = path.resolve(".env");
  if (!fs.existsSync(envPath)) return;

  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const match = /^\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)\s*$/.exec(line);
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, "");
  }
}

function requireEnv(...names) {
  for (const name of names) {
    const value = String(process.env[name] ?? "").trim();
    if (value) return value;
  }
  throw new Error(`Missing required environment variable: ${names.join(" or ")}`);
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let value = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === "\"") {
      if (inQuotes && next === "\"") {
        value += "\"";
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (!inQuotes && char === ",") {
      row.push(value);
      value = "";
      continue;
    }

    if (!inQuotes && (char === "\n" || char === "\r")) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(value);
      value = "";
      if (row.some((cell) => cell !== "")) rows.push(row);
      row = [];
      continue;
    }

    value += char;
  }

  if (value.length > 0 || row.length > 0) {
    row.push(value);
    if (row.some((cell) => cell !== "")) rows.push(row);
  }

  return rows;
}

function toObjectRows(csvText) {
  const rows = parseCsv(csvText);
  const [header, ...body] = rows;
  if (!header?.length) return [];

  return body.map((cells, index) => {
    const row = { __line: index + 2 };
    header.forEach((name, cellIndex) => {
      row[name] = String(cells[cellIndex] ?? "").trim();
    });
    return row;
  });
}

function firstNonEmpty(...values) {
  for (const value of values) {
    const trimmed = String(value ?? "").trim();
    if (trimmed) return trimmed;
  }
  return null;
}

function parseNullableNumber(value) {
  const trimmed = firstNonEmpty(value);
  if (!trimmed) return null;
  const number = Number(trimmed);
  return Number.isFinite(number) ? number : null;
}

function parseNullableInteger(value) {
  const number = parseNullableNumber(value);
  return Number.isInteger(number) ? number : null;
}

function parseNullableJson(value, fallback) {
  const trimmed = firstNonEmpty(value);
  if (!trimmed) return fallback;
  return JSON.parse(trimmed);
}

function validEnum(value, allowed, fallback = null) {
  const normalized = String(value ?? "").trim().toLowerCase();
  return allowed.has(normalized) ? normalized : fallback;
}

function toTimestamp(value) {
  return firstNonEmpty(value);
}

function latestRow(left, right) {
  const fields = ["updated_at", "last_sync_at", "created_at"];
  const leftTime = Math.max(...fields.map((field) => Date.parse(left[field] || "") || 0));
  const rightTime = Math.max(...fields.map((field) => Date.parse(right[field] || "") || 0));
  return leftTime >= rightTime ? left : right;
}

function normalizeEmail(value) {
  const email = String(value ?? "").trim().toLowerCase();
  return OLD_TO_LIVE_EMAIL_CORRECTIONS.get(email) ?? email;
}

async function fetchAll(supabase, table, columns) {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from(table).select(columns).range(from, from + 999);
    if (error) throw error;
    rows.push(...data);
    if (data.length < 1000) return rows;
  }
}

function buildProfileResolver(oldProfiles, liveProfiles) {
  const oldEmailById = new Map(oldProfiles.map((profile) => [profile.id, profile.email]));
  const liveEmailById = new Map(liveProfiles.map((profile) => [profile.id, profile.email]));
  const liveIdByEmail = new Map(liveProfiles.map((profile) => [normalizeEmail(profile.email), profile.id]));

  return (profileId) => {
    const trimmed = firstNonEmpty(profileId);
    if (!trimmed) return { id: null, email: null, source: "blank" };
    if (liveEmailById.has(trimmed)) {
      return { id: trimmed, email: normalizeEmail(liveEmailById.get(trimmed)), source: "already_live" };
    }

    const email = normalizeEmail(OLD_PROFILE_EMAIL_OVERRIDES.get(trimmed) ?? oldEmailById.get(trimmed));
    const liveId = liveIdByEmail.get(email) ?? null;
    return { id: liveId, email: email || null, source: liveId ? "mapped" : "unresolved" };
  };
}

function dedupeRows(rows) {
  const byKey = new Map();
  for (const row of rows) {
    const id = firstNonEmpty(row.id);
    const externalCustomerId = firstNonEmpty(row.external_customer_id);
    const key = id ? `id:${id}` : externalCustomerId ? `external:${externalCustomerId}` : `line:${row.__line}`;
    const current = byKey.get(key);
    byKey.set(key, current ? latestRow(row, current) : row);
  }
  return [...byKey.values()];
}

function toImportRow(row, resolveProfile) {
  const assigned = resolveProfile(row.assigned_user_id);
  const createdBy = resolveProfile(row.created_by);
  const updatedBy = resolveProfile(row.updated_by);

  if (!firstNonEmpty(row.id)) {
    throw new Error(`CSV line ${row.__line} is missing customers.id`);
  }

  const customerName = firstNonEmpty(row.customer_name);
  if (!customerName) {
    throw new Error(`CSV line ${row.__line} is missing customer_name`);
  }

  return {
    id: row.id,
    external_customer_id: firstNonEmpty(row.external_customer_id),
    customer_name: customerName,
    phone_number: firstNonEmpty(row.phone_number),
    customer_email: firstNonEmpty(row.customer_email),
    whatsapp_number: firstNonEmpty(row.whatsapp_number),
    governorate: firstNonEmpty(row.governorate),
    district: firstNonEmpty(row.district),
    place: firstNonEmpty(row.place),
    address_line: firstNonEmpty(row.address_line),
    customer_type: firstNonEmpty(row.customer_type),
    status: validEnum(row.status, new Set(["active", "inactive", "archived"]), "active"),
    priority: validEnum(row.priority, new Set(["low", "medium", "high"]), "medium"),
    size: validEnum(row.size, new Set(["small", "medium", "large"])),
    product_interests: parseNullableJson(row.product_interests, []),
    notes: firstNonEmpty(row.notes),
    lat: parseNullableNumber(row.lat),
    lng: parseNullableNumber(row.lng),
    geofence_radius_meters: parseNullableInteger(row.geofence_radius_meters) ?? 150,
    assigned_user_id: assigned.id,
    assigned_user_email: assigned.email,
    created_by: createdBy.id,
    updated_by: updatedBy.id,
    last_visit_at: toTimestamp(row.last_visit_at),
    created_at: toTimestamp(row.created_at),
    updated_at: toTimestamp(row.updated_at),
    last_sync_at: toTimestamp(row.last_sync_at),
    source: firstNonEmpty(row.source) ?? "cst_csv_import",
    raw_payload: parseNullableJson(row.raw_payload, {}),
    customer_location: firstNonEmpty(row.customer_location),
    google_maps_url: firstNonEmpty(row.google_maps_url),
    source_csv_line: row.__line,
  };
}

function sqlString(value) {
  return value == null ? "null" : `'${String(value).replace(/'/g, "''")}'`;
}

function buildMigrationSql(importRows, stats) {
  const json = JSON.stringify(importRows);

  return `-- Import CST.CSV customers and assignments.
-- Generated by scripts/generate-cst-customer-assignment-migration.mjs.
-- Source rows: ${stats.csvRows}; imported rows after dedupe: ${stats.importRows}; duplicate CSV customer keys collapsed: ${stats.duplicateRowsCollapsed}.
-- Old profile emails are resolved to live public.profiles IDs before insertion.

create temp table tmp_cst_customer_import (
  id uuid primary key,
  external_customer_id text,
  customer_name text not null,
  phone_number text,
  customer_email citext,
  whatsapp_number text,
  governorate text,
  district text,
  place text,
  address_line text,
  customer_type text,
  status public.record_status not null,
  priority public.customer_priority not null,
  size public.customer_size,
  product_interests jsonb not null,
  notes text,
  lat double precision,
  lng double precision,
  geofence_radius_meters integer not null,
  assigned_user_id uuid references public.profiles(id) on delete set null,
  assigned_user_email citext,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  last_visit_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz,
  last_sync_at timestamptz,
  source text not null,
  raw_payload jsonb not null,
  customer_location text,
  google_maps_url text,
  source_csv_line integer not null
) on commit drop;

insert into tmp_cst_customer_import (
  id,
  external_customer_id,
  customer_name,
  phone_number,
  customer_email,
  whatsapp_number,
  governorate,
  district,
  place,
  address_line,
  customer_type,
  status,
  priority,
  size,
  product_interests,
  notes,
  lat,
  lng,
  geofence_radius_meters,
  assigned_user_id,
  assigned_user_email,
  created_by,
  updated_by,
  last_visit_at,
  created_at,
  updated_at,
  last_sync_at,
  source,
  raw_payload,
  customer_location,
  google_maps_url,
  source_csv_line
)
select
  id,
  external_customer_id,
  customer_name,
  phone_number,
  customer_email,
  whatsapp_number,
  governorate,
  district,
  place,
  address_line,
  customer_type,
  status,
  priority,
  size,
  product_interests,
  notes,
  lat,
  lng,
  geofence_radius_meters,
  assigned_user_id,
  assigned_user_email,
  created_by,
  updated_by,
  last_visit_at,
  created_at,
  updated_at,
  last_sync_at,
  source,
  raw_payload,
  customer_location,
  google_maps_url,
  source_csv_line
from jsonb_to_recordset($cst_customer_import$${json}$cst_customer_import$::jsonb) as rows (
  id uuid,
  external_customer_id text,
  customer_name text,
  phone_number text,
  customer_email citext,
  whatsapp_number text,
  governorate text,
  district text,
  place text,
  address_line text,
  customer_type text,
  status public.record_status,
  priority public.customer_priority,
  size public.customer_size,
  product_interests jsonb,
  notes text,
  lat double precision,
  lng double precision,
  geofence_radius_meters integer,
  assigned_user_id uuid,
  assigned_user_email citext,
  created_by uuid,
  updated_by uuid,
  last_visit_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz,
  last_sync_at timestamptz,
  source text,
  raw_payload jsonb,
  customer_location text,
  google_maps_url text,
  source_csv_line integer
);

do $$
declare
  v_duplicate_external_ids integer;
  v_missing_assigned_profiles integer;
begin
  select count(*)
  into v_duplicate_external_ids
  from (
    select external_customer_id
    from tmp_cst_customer_import
    where external_customer_id is not null
    group by external_customer_id
    having count(*) > 1
  ) duplicates;

  if v_duplicate_external_ids > 0 then
    raise exception 'CST customer import has duplicate external_customer_id values after dedupe: %', v_duplicate_external_ids;
  end if;

  select count(*)
  into v_missing_assigned_profiles
  from tmp_cst_customer_import import
  left join public.profiles profile on profile.id = import.assigned_user_id
  where import.assigned_user_id is not null
    and profile.id is null;

  if v_missing_assigned_profiles > 0 then
    raise exception 'CST customer import has assigned_user_id values missing from public.profiles: %', v_missing_assigned_profiles;
  end if;
end $$;

update public.customers customer
set
  external_customer_id = import.external_customer_id,
  customer_name = import.customer_name,
  phone_number = import.phone_number,
  customer_email = import.customer_email,
  whatsapp_number = import.whatsapp_number,
  governorate = import.governorate,
  district = import.district,
  place = import.place,
  address_line = import.address_line,
  customer_type = import.customer_type,
  status = import.status,
  priority = import.priority,
  size = import.size,
  product_interests = import.product_interests,
  notes = import.notes,
  lat = import.lat,
  lng = import.lng,
  geofence_radius_meters = import.geofence_radius_meters,
  assigned_user_id = import.assigned_user_id,
  created_by = import.created_by,
  updated_by = import.updated_by,
  last_visit_at = import.last_visit_at,
  last_sync_at = import.last_sync_at,
  source = import.source,
  raw_payload = import.raw_payload,
  customer_location = import.customer_location,
  google_maps_url = import.google_maps_url
from tmp_cst_customer_import import
where customer.id = import.id
   or (
    import.external_customer_id is not null
    and customer.external_customer_id = import.external_customer_id
   );

insert into public.customers (
  id,
  external_customer_id,
  customer_name,
  phone_number,
  customer_email,
  whatsapp_number,
  governorate,
  district,
  place,
  address_line,
  customer_type,
  status,
  priority,
  size,
  product_interests,
  notes,
  lat,
  lng,
  geofence_radius_meters,
  assigned_user_id,
  created_by,
  updated_by,
  last_visit_at,
  created_at,
  updated_at,
  last_sync_at,
  source,
  raw_payload,
  customer_location,
  google_maps_url
)
select
  import.id,
  import.external_customer_id,
  import.customer_name,
  import.phone_number,
  import.customer_email,
  import.whatsapp_number,
  import.governorate,
  import.district,
  import.place,
  import.address_line,
  import.customer_type,
  import.status,
  import.priority,
  import.size,
  import.product_interests,
  import.notes,
  import.lat,
  import.lng,
  import.geofence_radius_meters,
  import.assigned_user_id,
  import.created_by,
  import.updated_by,
  import.last_visit_at,
  coalesce(import.created_at, timezone('utc', now())),
  coalesce(import.updated_at, timezone('utc', now())),
  import.last_sync_at,
  import.source,
  import.raw_payload,
  import.customer_location,
  import.google_maps_url
from tmp_cst_customer_import import
where not exists (
  select 1
  from public.customers customer
  where customer.id = import.id
     or (
      import.external_customer_id is not null
      and customer.external_customer_id = import.external_customer_id
     )
);

do $$
declare
  v_loaded integer;
begin
  select count(*)
  into v_loaded
  from public.customers customer
  join tmp_cst_customer_import import
    on customer.id = import.id
    or (
      import.external_customer_id is not null
      and customer.external_customer_id = import.external_customer_id
    );

  if v_loaded <> ${stats.importRows} then
    raise exception 'CST customer import expected ${stats.importRows} customers, but found % after import', v_loaded;
  end if;
end $$;
`;
}

async function main() {
  loadLocalEnv();

  const supabaseUrl = requireEnv("SUPABASE_URL", "VITE_SUPABASE_URL");
  const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY", "VITE_SUPABASE_SERVICE_ROLE_KEY");
  const migrationPath = process.argv[2] ?? DEFAULT_MIGRATION_PATH;
  const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

  const [liveProfiles, oldProfiles] = await Promise.all([
    fetchAll(supabase, "profiles", "id,email,full_name,role,status"),
    Promise.resolve(JSON.parse(fs.readFileSync(OLD_PROFILES_PATH, "utf8"))),
  ]);

  const resolveProfile = buildProfileResolver(oldProfiles, liveProfiles);
  const csvRows = toObjectRows(fs.readFileSync(CSV_PATH, "utf8"));
  const dedupedRows = dedupeRows(csvRows);
  const importRows = dedupedRows.map((row) => toImportRow(row, resolveProfile));

  const unresolvedAssignments = importRows.filter((row) => row.assigned_user_email && !row.assigned_user_id);
  if (unresolvedAssignments.length > 0) {
    const sample = unresolvedAssignments.slice(0, 5).map((row) => `${row.source_csv_line}:${row.assigned_user_email}`);
    throw new Error(`Unresolved assigned profiles: ${sample.join(", ")}`);
  }

  const stats = {
    csvRows: csvRows.length,
    importRows: importRows.length,
    duplicateRowsCollapsed: csvRows.length - importRows.length,
  };

  fs.writeFileSync(migrationPath, buildMigrationSql(importRows, stats));

  const assignmentCounts = new Map();
  for (const row of importRows) {
    const key = row.assigned_user_email ?? "(unassigned)";
    assignmentCounts.set(key, (assignmentCounts.get(key) ?? 0) + 1);
  }

  console.log(
    JSON.stringify(
      {
        migrationPath,
        ...stats,
        assignmentCounts: Object.fromEntries([...assignmentCounts.entries()].sort((left, right) => right[1] - left[1])),
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
