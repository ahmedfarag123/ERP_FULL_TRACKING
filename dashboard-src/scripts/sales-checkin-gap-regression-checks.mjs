import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(relativePath) {
  const filePath = path.join(root, relativePath);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing required file: ${relativePath}`);
  }
  return fs.readFileSync(filePath, "utf8");
}

function assertIncludes(source, expected, message) {
  if (!source.includes(expected)) {
    throw new Error(message);
  }
}

function assertNotIncludes(source, unexpected, message) {
  if (source.includes(unexpected)) {
    throw new Error(message);
  }
}

const checkInPage = read("sales_team/components/checkin/CheckInPage.tsx");
const activityPersistence = read("sales_team/lib/activityPersistence.ts");

assertIncludes(
  checkInPage,
  "getCustomerGeofencePoint",
  "check-in must derive geofence from customer coordinates, not only visit start coordinates.",
);

assertIncludes(
  checkInPage,
  "customerGeofenceRadiusMeters",
  "check-in must respect customer.geofence_radius_meters with a 100m fallback.",
);

assertIncludes(
  checkInPage,
  "customer_geofence_missing",
  "check-in must mark visits where the customer has no coordinates.",
);

assertIncludes(
  checkInPage,
  "orderIntent",
  "check-in must capture quick order intent when CREATE_ORDER_NOW is selected.",
);

assertIncludes(
  checkInPage,
  "نية الطلب",
  "check-in must render an order-intent panel for CREATE_ORDER_NOW.",
);

assertIncludes(
  activityPersistence,
  "order_intent",
  "visit persistence must include order intent metadata in raw payload and interaction metadata.",
);

assertIncludes(
  activityPersistence,
  "geofence_status",
  "visit persistence must include structured geofence status metadata.",
);

assertNotIncludes(
  checkInPage,
  "distanceBetween(location, { lat: activeVisit.startLat, lng: activeVisit.startLng })",
  "checkout validation must not compare the final location point to the visit start point.",
);

console.log("Sales check-in gap regression checks passed.");
