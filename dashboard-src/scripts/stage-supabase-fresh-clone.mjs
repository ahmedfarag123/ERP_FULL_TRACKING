import { copyFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { readdir } from "node:fs/promises";

const sourceDir = join(process.cwd(), "supabase");
const sourceMigrationsDir = join(sourceDir, "migrations");
const outputDir = join(process.cwd(), ".tmp", "supabase-fresh-clone");
const outputMigrationsDir = join(outputDir, "supabase", "migrations");
const combinedSqlPath = join(outputDir, "combined-schema.sql");

const timestampedMigration = /^(\d{14})_(.+\.sql)$/;
const migrationOrderOverrides = new Map([
  ["20260709000014_finance_journals.sql", "20260709000010z_finance_journals.sql"],
]);

function nextUnusedVersion(version, usedVersions) {
  let candidate = Number(version);
  while (usedVersions.has(String(candidate).padStart(14, "0"))) {
    candidate += 1;
  }
  return String(candidate).padStart(14, "0");
}

const entries = await readdir(sourceMigrationsDir, { withFileTypes: true });
const sqlFiles = entries
  .filter((entry) => entry.isFile() && entry.name.endsWith(".sql"))
  .map((entry) => entry.name)
  .sort((a, b) => {
    const aKey = migrationOrderOverrides.get(a) ?? a;
    const bKey = migrationOrderOverrides.get(b) ?? b;
    if (aKey < bKey) return -1;
    if (aKey > bKey) return 1;
    return 0;
  });

const migrations = [];
const skipped = [];

for (const fileName of sqlFiles) {
  const match = fileName.match(timestampedMigration);
  if (!match) {
    skipped.push(fileName);
    continue;
  }

  migrations.push({
    sourceName: fileName,
    sourceVersion: match[1],
    suffix: match[2],
  });
}

rmSync(outputDir, { recursive: true, force: true });
mkdirSync(outputMigrationsDir, { recursive: true });

const usedVersions = new Set();
const manifest = [];

for (const migration of migrations) {
  const version = nextUnusedVersion(migration.sourceVersion, usedVersions);
  usedVersions.add(version);

  const outputName = `${version}_${migration.suffix}`;
  copyFileSync(
    join(sourceMigrationsDir, migration.sourceName),
    join(outputMigrationsDir, outputName),
  );

  manifest.push({
    source: migration.sourceName,
    staged: outputName,
    renamed: migration.sourceName !== outputName,
  });
}

const combinedSql = manifest
  .map((item) => {
    const sourcePath = join(sourceMigrationsDir, item.source);
    return [
      `-- ============================================================================`,
      `-- Migration: ${item.staged}`,
      `-- Source: ${item.source}`,
      `-- ============================================================================`,
      "",
      readFileSync(sourcePath, "utf8").trim(),
      "",
    ].join("\n");
  })
  .join("\n");

writeFileSync(combinedSqlPath, `${combinedSql}\n`);

copyFileSync(join(sourceDir, "config.toml"), join(outputDir, "supabase", "config.toml"));

writeFileSync(
  join(outputDir, "README.txt"),
  [
    "Fresh Supabase clone staging folder",
    "",
    "This folder was generated from the repo migration chain.",
    "It keeps only timestamped Supabase migrations, rewrites duplicate versions,",
    "and includes the emergency cron-disable migration at the end of the chain.",
    "",
    "Next steps:",
    "1. Edit supabase/config.toml and replace project_id with the new Supabase project ref.",
    "2. From this folder, run: supabase link --project-ref <new-project-ref>",
    "3. Then run: supabase db push --linked",
    "4. Deploy Edge Functions from the repo root after setting secrets.",
    "",
    "Fallback: if CLI/project permissions are blocked, run combined-schema.sql",
    "in the new project SQL Editor.",
    "",
    skipped.length
      ? `Skipped non-standard SQL files: ${skipped.join(", ")}`
      : "Skipped non-standard SQL files: none",
    "",
  ].join("\n"),
);

writeFileSync(
  join(outputDir, "migration-manifest.json"),
  `${JSON.stringify({ generated_at: new Date().toISOString(), skipped, migrations: manifest }, null, 2)}\n`,
);

const renamedCount = manifest.filter((item) => item.renamed).length;

console.log(`Staged ${manifest.length} migrations in ${outputDir}`);
console.log(`Renamed ${renamedCount} duplicate-version migration(s).`);
if (skipped.length) {
  console.log(`Skipped ${skipped.length} non-standard SQL file(s): ${skipped.join(", ")}`);
}
console.log("");
console.log("Use this folder for the new database push:");
console.log(`  cd ${outputDir}`);
console.log("  supabase link --project-ref <new-project-ref>");
console.log("  supabase db push --linked");

if (!manifest.some((item) => item.source === "20260718000002_disable_hammering_odoo_cron_jobs.sql")) {
  console.warn("Warning: expected emergency cron-disable migration was not found in staged output.");
}
