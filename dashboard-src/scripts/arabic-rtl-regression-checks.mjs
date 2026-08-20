import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const failures = [];

function read(path) {
  return readFileSync(join(root, path), "utf8");
}

function expect(condition, message) {
  if (!condition) failures.push(message);
}

function expectIncludes(source, needle, message) {
  expect(source.includes(needle), message);
}

function expectNotIncludes(source, needle, message) {
  expect(!source.includes(needle), message);
}

function listFiles(path, extensions, output = []) {
  const fullPath = join(root, path);
  if (!existsSync(fullPath)) return output;
  for (const entry of readdirSync(fullPath)) {
    const relative = `${path}/${entry}`.replaceAll("\\", "/");
    const absolute = join(root, relative);
    const stat = statSync(absolute);
    if (stat.isDirectory()) {
      if (!["node_modules", "dist", ".git"].includes(entry)) listFiles(relative, extensions, output);
    } else if (extensions.some((extension) => relative.endsWith(extension))) {
      output.push(relative);
    }
  }
  return output;
}

function expectArabicShell(path) {
  const source = read(path);
  expect(
    /<html\b[^>]*\blang=["']ar-EG["'][^>]*\bdir=["']rtl["']/i.test(source),
    `${path} must boot as lang="ar-EG" dir="rtl".`,
  );
}

["index.html", "sales/index.html", "driver/index.html", "horecasmart-driver-app.html"].forEach(
  expectArabicShell,
);

["public/sales-manifest.webmanifest", "public/driver-manifest.webmanifest"].forEach((path) => {
  const manifest = JSON.parse(read(path));
  expect(manifest.lang === "ar-EG", `${path} lang must be ar-EG.`);
  expect(manifest.dir === "rtl", `${path} dir must be rtl.`);
  expect(/[اأإآء-ي]/.test(`${manifest.name} ${manifest.short_name} ${manifest.description}`), `${path} must use Arabic app naming.`);
});

expect(!existsSync(join(root, "lib/arabicUx.ts")), "runtime Arabic UI dictionary must not exist.");

[
  ["src/main.tsx", "هوريكا سمارت | لوحة التحكم"],
  ["sales_team/main.tsx", "هوريكا سمارت | تطبيق مندوب المبيعات"],
  ["driver_team/src/main.tsx", "هوريكا سمارت | تطبيق السائق"],
].forEach(([path, title]) => {
  const source = read(path);
  expectIncludes(source, "document.documentElement.lang", `${path} must set the Arabic document language.`);
  expectIncludes(source, "document.documentElement.dir", `${path} must set RTL direction.`);
  expectIncludes(source, title, `${path} must set an Arabic app title.`);
  expectNotIncludes(source, "enableArabicRtlExperience", `${path} must not use runtime UI replacement.`);
});

const routeScreen = read("driver_team/src/screens/RouteScreen.tsx");
expectNotIncludes(
  routeScreen,
  "s.status === 'delivered' || s.status === 'failed'",
  "driver route progress must not count failed stops as delivered.",
);
expectIncludes(
  routeScreen,
  "فشلت",
  "driver route must display failed stops as failed in Arabic.",
);

[
  "driver_team/src/components/ShipmentListItem.tsx",
  "driver_team/src/screens/ShipmentDetailScreen.tsx",
  "sales_team/components/customers/CustomerCard.tsx",
].forEach((path) => {
  const source = read(path);
  expectIncludes(source, 'dir="auto"', `${path} must render customer/order source data with dir="auto".`);
});

const driverUiFiles = [
  "driver_team/src/components/AppHeader.tsx",
  "driver_team/src/components/BottomNavigation.tsx",
  "driver_team/src/components/OfflineBanner.tsx",
  "driver_team/src/components/ShipmentListItem.tsx",
  "driver_team/src/components/StatusBadge.tsx",
  "driver_team/src/screens/ConnectionDiagnosticsScreen.tsx",
  "driver_team/src/screens/DashboardScreen.tsx",
  "driver_team/src/screens/DeliveriesListScreen.tsx",
  "driver_team/src/screens/EditProfileScreen.tsx",
  "driver_team/src/screens/LoginScreen.tsx",
  "driver_team/src/screens/NotificationsScreen.tsx",
  "driver_team/src/screens/RouteScreen.tsx",
  "driver_team/src/screens/ShipmentDetailScreen.tsx",
];

const forbiddenDriverCopy = [
  ">Dashboard<",
  ">Deliveries<",
  ">Settings<",
  ">Shipment not found<",
  ">Back to Deliveries<",
  "label: 'Warehouse'",
  "label: 'Scheduled'",
  "label: 'Route Position'",
  "label: 'Priority'",
  ">Customer<",
  ">Items<",
  ">Details<",
  ">Collection<",
  ">Notes<",
  ">Start Delivery<",
  ">Mark Delivered<",
  'title="Proof of Delivery"',
  'title="Report Failed Delivery"',
  ">No notifications<",
  ">Welcome back<",
  ">Sign in",
  ">Password<",
  ">Email or Mobile Phone<",
  "You're offline.",
  ">Connection Diagnostics<",
  ">Test Connection<",
  ">Force Sync Now<",
  ">Clear Local Cache<",
  ">Delivery Confirmed",
];

driverUiFiles.forEach((path) => {
  const source = read(path);
  forbiddenDriverCopy.forEach((copy) => {
    expectNotIncludes(source, copy, `${path} still contains English UI copy: ${copy}`);
  });
});

const mojibakePattern = /(?:Ã˜|Ã™|Ãƒ|Ã‚|Ã¯Â¿Â½|ï¿½)/;
listFiles("src", [".ts", ".tsx"])
  .concat(listFiles("sales_team", [".ts", ".tsx"]))
  .concat(listFiles("driver_team/src", [".ts", ".tsx"]))
  .concat(listFiles("lib", [".ts"]))
  .forEach((path) => {
    const source = read(path);
    expect(!mojibakePattern.test(source), `${path} contains Arabic mojibake/replacement characters.`);
  });

if (failures.length) {
  console.error("Arabic RTL regression checks failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Arabic RTL regression checks passed.");
