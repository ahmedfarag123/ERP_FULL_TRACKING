import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const url = process.env.OLD_SUPABASE_URL;
const serviceRoleKey = process.env.OLD_SUPABASE_SERVICE_ROLE_KEY;
const outputDir = process.env.OLD_SUPABASE_EXPORT_DIR ?? "output/old-supabase-export";
const batchSize = Number(process.env.OLD_SUPABASE_BATCH_SIZE ?? 1000);
const explicitTables = (process.env.OLD_SUPABASE_TABLES ?? "")
  .split(",")
  .map((table) => table.trim())
  .filter(Boolean);
const forceRefresh = process.env.OLD_SUPABASE_FORCE_REFRESH === "1";
const maxRetries = Number(process.env.OLD_SUPABASE_MAX_RETRIES ?? 5);

if (!url || !serviceRoleKey) {
  console.error(
    "Missing OLD_SUPABASE_URL or OLD_SUPABASE_SERVICE_ROLE_KEY environment variable.",
  );
  process.exit(1);
}

if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 10000) {
  console.error("OLD_SUPABASE_BATCH_SIZE must be an integer between 1 and 10000.");
  process.exit(1);
}

if (!Number.isInteger(maxRetries) || maxRetries < 0 || maxRetries > 20) {
  console.error("OLD_SUPABASE_MAX_RETRIES must be an integer between 0 and 20.");
  process.exit(1);
}

const restUrl = `${url.replace(/\/$/, "")}/rest/v1`;
const baseHeaders = {
  apikey: serviceRoleKey,
  Authorization: `Bearer ${serviceRoleKey}`,
};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function request(path, init = {}) {
  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    try {
      const response = await fetch(`${restUrl}${path}`, {
        ...init,
        headers: {
          ...baseHeaders,
          ...init.headers,
        },
      });

      if (!response.ok) {
        const body = await response.text();
        throw new Error(`${init.method ?? "GET"} ${path} failed: ${response.status} ${body}`);
      }

      return response;
    } catch (error) {
      lastError = error;

      if (attempt === maxRetries) {
        break;
      }

      const delayMs = 500 * 2 ** attempt;
      console.warn(
        `Retrying ${init.method ?? "GET"} ${path} after error: ${error.message}`,
      );
      await sleep(delayMs);
    }
  }

  throw lastError;
}

async function discoverTables() {
  if (explicitTables.length) {
    return explicitTables;
  }

  const response = await request("/", {
    headers: { Accept: "application/openapi+json" },
  });
  const openapi = await response.json();
  const definitions = openapi.definitions ?? openapi.components?.schemas ?? {};

  return Object.entries(definitions)
    .filter(([, definition]) => definition?.type === "object" && definition?.properties)
    .map(([name]) => name)
    .filter((name) => !name.includes("."))
    .sort((a, b) => a.localeCompare(b));
}

function parseTotal(contentRange) {
  if (!contentRange) return null;
  const match = contentRange.match(/\/(\d+|\*)$/);
  if (!match || match[1] === "*") return null;
  return Number(match[1]);
}

async function countRows(table) {
  const response = await request(`/${encodeURIComponent(table)}?select=*`, {
    method: "HEAD",
    headers: {
      Prefer: "count=exact",
      Range: "0-0",
      "Range-Unit": "items",
    },
  });

  return parseTotal(response.headers.get("content-range"));
}

async function fetchBatch(table, offset, limit) {
  const response = await request(`/${encodeURIComponent(table)}?select=*`, {
    headers: {
      Prefer: "count=exact",
      Range: `${offset}-${offset + limit - 1}`,
      "Range-Unit": "items",
    },
  });

  return response.json();
}

await mkdir(outputDir, { recursive: true });

const tables = await discoverTables();
const startedAt = new Date().toISOString();
const manifest = {
  source_url: url,
  exported_at: startedAt,
  batch_size: batchSize,
  tables: [],
};

console.log(`Discovered ${tables.length} table(s).`);

for (const table of tables) {
  const count = await countRows(table);
  const fileName = `${table}.json`;

  if (!forceRefresh) {
    try {
      const existing = JSON.parse(await readFile(join(outputDir, fileName), "utf8"));
      if (Array.isArray(existing) && (count === null || existing.length === count)) {
        console.log(`Skipping ${table}; existing export has ${existing.length} row(s).`);
        manifest.tables.push({
          table,
          file: fileName,
          row_count: existing.length,
          reported_count: count,
          reused_existing_file: true,
        });
        continue;
      }
    } catch {
      // Missing or invalid partial files are overwritten below.
    }
  }

  const rows = [];
  let offset = 0;

  console.log(`Exporting ${table}${count === null ? "" : ` (${count} row(s))`}...`);

  while (count === null || offset < count) {
    const batch = await fetchBatch(table, offset, batchSize);
    rows.push(...batch);

    if (batch.length < batchSize) {
      break;
    }

    offset += batchSize;
  }

  await writeFile(
    join(outputDir, fileName),
    `${JSON.stringify(rows, null, 2)}\n`,
    "utf8",
  );

  manifest.tables.push({
    table,
    file: fileName,
    row_count: rows.length,
    reported_count: count,
  });
}

await writeFile(
  join(outputDir, "manifest.json"),
  `${JSON.stringify({ ...manifest, completed_at: new Date().toISOString() }, null, 2)}\n`,
  "utf8",
);

console.log(`Export complete: ${outputDir}`);
