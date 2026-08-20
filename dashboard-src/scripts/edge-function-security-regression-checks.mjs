import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const guardedSyncFunctions = [
  "customers-odoo",
  "orders-odoo",
  "products-odoo",
  "crm-odoo",
  "logistics-shipments-odoo",
  "logistics-users-odoo",
  "logistics-warehouse-odoo",
  "logistics-warehouses-odoo",
];

const sharedAuth = readFileSync("supabase/functions/_shared/odoo.ts", "utf8");
assert.match(sharedAuth, /export async function requireOdooSyncAccess/);
assert.match(sharedAuth, /x-sync-secret/);
assert.match(sharedAuth, /Access-Control-Allow-Methods': 'POST, OPTIONS'/);
assert.match(sharedAuth, /ODOO_SYNC_SECRET/);
assert.match(sharedAuth, /SYNC_SECRET/);
assert.match(sharedAuth, /ODOO_SYNC_ALLOWED_ROLES/);
assert.match(sharedAuth, /\['admin', 'manager'\]/);
assert.match(sharedAuth, /supabaseAdmin\.auth\.getUser/);
assert.match(sharedAuth, /\.from\('profiles'\)/);
assert.match(sharedAuth, /req\.method !== 'POST'/);
assert.match(sharedAuth, /Method not allowed/);

const config = readFileSync("supabase/config.toml", "utf8");
assert.doesNotMatch(config, /verify_jwt\s*=\s*false/, "Configured Edge Functions must not disable platform JWT verification");
assert.match(
  config,
  /\[functions\.admin-user-auth\]\s+verify_jwt\s*=\s*true/,
  "admin-user-auth must keep platform JWT verification enabled",
);

const adminAuthSource = readFileSync("supabase/functions/admin-user-auth/index.ts", "utf8");
assert.match(adminAuthSource, /async function requireAdmin\(request: Request\)/);
assert.match(adminAuthSource, /request\.headers\.get\("Authorization"\)/);
assert.match(adminAuthSource, /auth\.getUser\(\)/);
assert.match(adminAuthSource, /Only admins can use this function/);

for (const functionName of guardedSyncFunctions) {
  const escapedName = functionName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  assert.match(
    config,
    new RegExp(`\\[functions\\.${escapedName}\\]\\s+verify_jwt\\s*=\\s*true`),
    `${functionName} must keep platform JWT verification enabled`,
  );

  const functionPath = `supabase/functions/${functionName}/index.ts`;
  assert.ok(existsSync(functionPath), `${functionPath} must exist`);

  const source = readFileSync(functionPath, "utf8");
  assert.match(source, /requireOdooSyncAccess/, `${functionName} must import/use the sync access guard`);
  assert.match(
    source,
    /const authResponse = await requireOdooSyncAccess\(req\)[\s\S]*if \(authResponse\) return authResponse/,
    `${functionName} must return unauthorized sync requests before service-role work`,
  );
}

const crmSource = readFileSync("supabase/functions/crm-odoo/index.ts", "utf8");
assert.ok(
  crmSource.indexOf("const actionResult = await handleCrmAction") <
    crmSource.indexOf("const authResponse = await requireOdooSyncAccess(req)"),
  "crm-odoo must preserve authenticated CRM action handling before sync gating",
);

const migrationFiles = [
  "supabase/migrations/20260707134432_add_sync_secret_header_to_cron_invoker.sql",
];

for (const migrationPath of migrationFiles) {
  const migration = readFileSync(migrationPath, "utf8");
  assert.match(migration, /sales_sync_edge_secret/);
  assert.match(migration, /'x-sync-secret', sync_secret/);
  assert.match(migration, /function_name not in/);
  assert.match(migration, /revoke execute on function public\.invoke_scheduled_edge_function/);
}

console.log("Edge Function security regression checks passed.");
