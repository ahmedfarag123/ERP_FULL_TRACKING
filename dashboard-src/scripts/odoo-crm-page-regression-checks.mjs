import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const app = readFileSync("src/App.tsx", "utf8");
const sidebar = readFileSync("src/layout/AppSidebar.tsx", "utf8");

assert.match(app, /OdooCrmPage/);
assert.match(app, /path="\/crm\/odoo"/);
assert.match(sidebar, /فرص أودو/);
assert.match(sidebar, /path: "\/crm\/odoo"/);

const page = readFileSync("src/pages/Admin/OdooCrmPage.tsx", "utf8");
const migration = readFileSync("supabase/migrations/20260501000005_odoo_crm_sync.sql", "utf8");
const actionMigration = readFileSync("supabase/migrations/20260502000006_odoo_crm_action_workbench.sql", "utf8");
const edgeFunction = readFileSync("supabase/functions/crm-odoo/index.ts", "utf8");
const config = readFileSync("supabase/config.toml", "utf8");

assert.doesNotMatch(page, /[ÃƒËœÃƒâ„¢ÃƒÆ’]|Ã¯Â¿Â½/);
assert.doesNotMatch(page, /const OPPORTUNITIES/);
assert.doesNotMatch(page, /CRM-00[0-9]/);
assert.match(page, /from\("odoo_crm_leads"\)/);
assert.match(page, /from\("odoo_crm_model_records"\)/);
assert.match(page, /from\("odoo_crm_lead_actions"\)/);
assert.match(page, /functions\.invoke\("crm-odoo"/);
assert.match(page, /buildStageOptions/);
assert.match(page, /buildLostReasonOptions/);
assert.match(page, /runRemoteAction/);
assert.match(page, /changeStage/);
assert.match(page, /requestQuotation/);
assert.match(page, /markWon/);
assert.match(page, /markLost/);
assert.match(page, /submitNote/);

for (const visibleLabel of [
  "مركز متابعة فرص المبيعات",
  "قائمة الفرص",
  "الإجراءات السريعة",
  "خط سير الفرصة",
  "تحديث الفرصة",
  "طلب عرض سعر",
  "تم الفوز",
  "خسارة",
  "سجل الإجراءات",
]) {
  assert.match(page, new RegExp(visibleLabel));
}

assert.doesNotMatch(page, /Odoo CRM \| Sales Admin/);
for (const staleUiCopy of [
  '"Odoo CRM | Sales Admin"',
  '"Sync Odoo"',
  '"Export"',
  '"Opportunity"',
  '"Customer"',
  '"Expected Revenue"',
  '"No Odoo CRM opportunities found"',
  ">Email<",
  ">SMS<",
]) {
  assert.doesNotMatch(page, new RegExp(staleUiCopy.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
}

assert.match(config, /\[functions\.crm-odoo\]/);
assert.match(migration, /create table if not exists public\.odoo_crm_leads/);
assert.match(migration, /create table if not exists public\.odoo_crm_model_records/);
assert.match(migration, /sync-odoo-crm/);
assert.match(actionMigration, /create table if not exists public\.odoo_crm_lead_actions/);
assert.match(actionMigration, /odoo_crm_lead_actions_authenticated_read/);
assert.match(actionMigration, /odoo_crm_lead_actions_authenticated_insert/);
assert.match(edgeFunction, /crm\.lead/);
assert.match(edgeFunction, /crm\.team\.member/);
assert.match(edgeFunction, /res\.partner/);
assert.match(edgeFunction, /fetchPartnerRows/);
assert.match(edgeFunction, /handleCrmAction/);
assert.match(edgeFunction, /requireAuthenticatedUser/);
assert.match(edgeFunction, /message_post/);
assert.match(edgeFunction, /action_set_won_rainbowman/);
assert.match(edgeFunction, /odoo_crm_lead_actions/);

console.log("Odoo CRM workbench regression checks passed.");
