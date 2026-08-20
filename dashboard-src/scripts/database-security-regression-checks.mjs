import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

function read(path) {
  assert.ok(existsSync(path), `${path} must exist`);
  return readFileSync(path, "utf8");
}

const revokeMigration = read("supabase/migrations/20260707000001_revoke_anon_exec_on_security_definer.sql");
const searchPathMigration = read("supabase/migrations/20260707000002_fix_function_search_path.sql");
const ordersPolicyMigration = read("supabase/migrations/20260707000005_scope_orders_auth_read_policy.sql");
const cronSecretMigration = read("supabase/migrations/20260707134432_add_sync_secret_header_to_cron_invoker.sql");
const securityInvokerMigration = read("supabase/migrations/20260707135923_set_security_invoker_on_public_views.sql");
const advisorSnapshot = JSON.parse(read("supabase/migrations/security-and-performance-issues.json"));

const mustRevokeAnonPublic = [
  "admin_update_profile_access",
  "admin_assign_order_to_driver",
  "admin_create_delivery_plan",
  "admin_dispatch_delivery_plan",
  "admin_close_delivery_plan",
  "set_role_permissions",
  "set_department_roles",
  "force_logout_user",
  "send_notification",
  "driver_update_shipment_phase",
  "record_visit_checkin",
  "invoke_scheduled_edge_function",
];

for (const functionName of mustRevokeAnonPublic) {
  assert.match(
    revokeMigration,
    new RegExp(`revoke execute on function public\\.${functionName}\\(`),
    `${functionName} must be explicitly revoked from anon/public`,
  );
}

assert.match(revokeMigration, /from anon, public/);
assert.match(revokeMigration, /grant execute on function public\.driver_update_shipment_phase/);
assert.match(revokeMigration, /grant execute on function public\.record_visit_checkin/);

for (const helperName of [
  "set_updated_at",
  "calculate_haversine_meters",
  "is_reachable_call",
  "logistics_distance_km",
  "logistics_shipment_status_from_phase",
  "logistics_shipment_status_rank",
]) {
  assert.match(searchPathMigration, new RegExp(`function public\\.${helperName}\\(`));
}

assert.match(ordersPolicyMigration, /drop policy if exists "orders_auth_read"/);
assert.match(ordersPolicyMigration, /create policy "orders_scoped_read"/);
assert.match(ordersPolicyMigration, /assigned_user_id = auth\.uid\(\)/);
assert.match(ordersPolicyMigration, /public\.is_management_role\(\)/);

assert.match(cronSecretMigration, /function_name not in/);
assert.match(cronSecretMigration, /sales_sync_edge_secret/);
assert.match(cronSecretMigration, /'x-sync-secret', sync_secret/);
assert.match(cronSecretMigration, /revoke execute on function public\.invoke_scheduled_edge_function\(text, jsonb\) from authenticated/);

const advisorSecurityDefinerViews = advisorSnapshot
  .filter((issue) => issue?.name === "security_definer_view")
  .map((issue) => issue?.metadata?.name)
  .filter(Boolean);

for (const viewName of advisorSecurityDefinerViews) {
  assert.match(
    securityInvokerMigration,
    new RegExp(`alter view public\\.${viewName} set \\(security_invoker = true\\)`),
    `${viewName} must be switched to security_invoker`,
  );
}

console.log("Database security regression checks passed.");
