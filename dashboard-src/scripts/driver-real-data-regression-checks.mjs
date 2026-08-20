import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const driverRoot = path.join(root, "driver_team");
const shipmentDataPath = path.join(driverRoot, "src", "services", "shipmentData.ts");
const deliveryStorePath = path.join(driverRoot, "src", "stores", "deliveryStore.ts");
const driverTailwindPath = path.join(driverRoot, "tailwind.config.js");
const driverIndexCssPath = path.join(driverRoot, "src", "index.css");
const orderItemMigrationPath = path.join(
  root,
  "supabase",
  "migrations",
  "20260430000025_driver_order_items_from_order_lines.sql",
);

const forbidden = [
  { pattern: /Karim Al-Mansouri/g, reason: "fake driver name" },
  { pattern: /HSM-447/g, reason: "fake vehicle plate" },
  { pattern: /DRV-2041/g, reason: "fake driver code" },
  { pattern: /Sales Platform/g, reason: "fake company profile" },
  { pattern: /Control Room/g, reason: "fake work location" },
  { pattern: /Senior Driver/g, reason: "fake job title" },
  { pattern: /HorecaSmart Cairo/g, reason: "fake company name" },
  { pattern: /Traffic Alert - Ring Road/g, reason: "fake notification" },
  { pattern: /Route updated - Traffic on Ring Road/g, reason: "fake route alert" },
  { pattern: /Saves 18 min/g, reason: "fake route saving" },
  { pattern: /New Shipment Assigned/g, reason: "fake notification" },
  { pattern: /Weekly Report Ready/g, reason: "fake weekly report" },
  { pattern: /PLAN-2041-APR25/g, reason: "fake plan id" },
  { pattern: /Cairo North Zone|Cairo South Zone/g, reason: "fake plan route" },
  { pattern: /Zamalek|Garden City|Downtown|Maadi|Heliopolis|New Cairo/g, reason: "fake stop areas" },
  { pattern: /Mercedes Sprinter 2022/g, reason: "fake vehicle model" },
  { pattern: /1,200 kg/g, reason: "fake vehicle capacity" },
  { pattern: /847/g, reason: "fake profile delivery count" },
  { pattern: /Rating/g, reason: "fake driver rating label" },
  { pattern: /89%/g, reason: "fake performance percentage" },
  { pattern: /Ring bell at side entrance/g, reason: "fake delivery note" },
  { pattern: /Temperature check completed/g, reason: "fake POD checklist item" },
  { pattern: /Photo captured successfully/g, reason: "fake photo capture toast" },
  { pattern: /Settings opened/g, reason: "fake settings toast" },
  { pattern: /Support chat opened/g, reason: "fake support toast" },
  { pattern: /Opening change password/g, reason: "fake account action toast" },
  { pattern: /30\.0444/g, reason: "default Cairo latitude rendered as app data" },
  { pattern: /31\.2357/g, reason: "default Cairo longitude rendered as app data" },
];

function listFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (
      entry.isDirectory() &&
      ["node_modules", "dist", "build", ".vite"].includes(entry.name)
    ) {
      return [];
    }
    if (entry.isDirectory()) return listFiles(fullPath);
    if (/\.(tsx?|css)$/.test(entry.name)) return [fullPath];
    return [];
  });
}

const failures = [];

function assertIncludes(source, token, file, reason) {
  if (!source.includes(token)) {
    failures.push({
      file,
      line: 1,
      value: token,
      reason,
    });
  }
}

function assertNotIncludes(source, token, file, reason) {
  if (source.includes(token)) {
    failures.push({
      file,
      line: 1,
      value: token,
      reason,
    });
  }
}

for (const file of listFiles(driverRoot)) {
  const source = fs.readFileSync(file, "utf8");
  for (const rule of forbidden) {
    rule.pattern.lastIndex = 0;
    let match;
    while ((match = rule.pattern.exec(source)) !== null) {
      const line = source.slice(0, match.index).split(/\r?\n/).length;
      failures.push({
        file: path.relative(root, file),
        line,
        value: match[0],
        reason: rule.reason,
      });
    }
  }
}

const shipmentData = fs.readFileSync(shipmentDataPath, "utf8");
const deliveryStore = fs.readFileSync(deliveryStorePath, "utf8");
const driverTailwind = fs.readFileSync(driverTailwindPath, "utf8");
const driverIndexCss = fs.readFileSync(driverIndexCssPath, "utf8");

assertIncludes(
  shipmentData,
  ".from('logistics_shipment_items')",
  path.relative(root, shipmentDataPath),
  "driver shipment detail must read shipment-domain item rows",
);
assertNotIncludes(
  shipmentData,
  ".from('order_line_items')",
  path.relative(root, shipmentDataPath),
  "driver app must not read order_line_items; shipment item rows must be materialized before driver loading",
);
assertNotIncludes(
  shipmentData,
  ".from('orders')",
  path.relative(root, shipmentDataPath),
  "driver app must not read orders for shipment item display",
);
assertIncludes(
  fs.readFileSync(path.join(driverRoot, "src", "screens", "LoadConfirmationScreen.tsx"), "utf8"),
  "shipment.items.length === 0 ? 'بنود الشحنة ناقصة' : 'تم التحميل'",
  path.join("driver_team", "src", "screens", "LoadConfirmationScreen.tsx"),
  "load confirmation must block itemless shipments instead of confirming a fake full load",
);
assertIncludes(
  deliveryStore,
  "item.requested_quantity ?? item.done_quantity ?? item.reserved_quantity",
  path.relative(root, deliveryStorePath),
  "driver item quantity must prefer requested quantity, not delivered quantity, for pre-delivery totals",
);
assertIncludes(
  shipmentData,
  "fetchAssignedShipmentDetails(profileId: string)",
  path.relative(root, shipmentDataPath),
  "driver list loading must batch shipment details under one authenticated profile context",
);
assertNotIncludes(
  deliveryStore,
  "assigned.map((shipment) => fetchShipmentDetail",
  path.relative(root, deliveryStorePath),
  "driver list loading must not fan out per-shipment detail calls that repeatedly acquire the Supabase auth lock",
);
assertIncludes(
  deliveryStore,
  "useAuthStore.getState().user?.id",
  path.relative(root, deliveryStorePath),
  "driver shipment loading must use the already-resolved auth profile id instead of repeatedly calling auth.getUser",
);

for (const [token, reason] of [
  ['"app-dark": "#465fff"', "app primary color must match TailAdmin brand-500"],
  ['"app-accent": "#465fff"', "app accent color must match TailAdmin brand-500"],
  ['"app-success": "#12b76a"', "success color must match TailAdmin success-500"],
  ['"app-error": "#f04438"', "error color must match TailAdmin error-500"],
  ['"app-warning": "#f79009"', "warning color must match TailAdmin warning-500"],
  ['"theme-card": "0px 1px 2px 0px rgba(16, 24, 40, 0.05)"', "card shadow must use TailAdmin shadow-theme-xs"],
]) {
  assertIncludes(driverTailwind, token, path.relative(root, driverTailwindPath), reason);
}

for (const [token, reason] of [
  ["--app-primary-dark: #465fff", "CSS app primary color must match TailAdmin brand-500"],
  ["--app-success: #12b76a", "CSS success color must match TailAdmin success-500"],
  ["--app-warning: #f79009", "CSS warning color must match TailAdmin warning-500"],
  ["background-color: #f9fafb", "page background must match TailAdmin gray-50"],
]) {
  assertIncludes(driverIndexCss, token, path.relative(root, driverIndexCssPath), reason);
}

if (!fs.existsSync(orderItemMigrationPath)) {
  failures.push({
    file: path.relative(root, orderItemMigrationPath),
    line: 1,
    value: "missing migration",
    reason: "manual order-to-driver assignments must materialize order lines into logistics shipment items",
  });
} else {
  const migration = fs.readFileSync(orderItemMigrationPath, "utf8");
  const migrationFile = path.relative(root, orderItemMigrationPath);
  assertIncludes(
    migration,
    "sync_logistics_shipment_items_from_order",
    migrationFile,
    "database migration must provide a reusable order-to-shipment item sync function",
  );
  assertIncludes(
    migration,
    "from public.order_line_items",
    migrationFile,
    "database migration must copy order_line_items into logistics_shipment_items",
  );
  assertIncludes(
    migration,
    "public.admin_assign_order_to_driver",
    migrationFile,
    "manual admin assignment RPC must sync shipment item rows for future driver orders",
  );
}

if (failures.length) {
  console.error("Driver app still contains mock/demo data:");
  for (const failure of failures) {
    console.error(
      `- ${failure.file}:${failure.line} "${failure.value}" (${failure.reason})`
    );
  }
  process.exit(1);
}

console.log("Driver app real-data regression check passed.");
