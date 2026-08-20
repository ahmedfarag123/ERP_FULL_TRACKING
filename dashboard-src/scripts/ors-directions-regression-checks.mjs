import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const legacyOrsClientPath = path.join(root, "driver_team", "lib", "openRouteService.ts");
const currentOrsClientPath = path.join(root, "driver_team", "src", "services", "openRouteService.ts");
const routeScreenPath = path.join(root, "driver_team", "src", "screens", "RouteScreen.tsx");
const orsClientPath = fs.existsSync(currentOrsClientPath)
  ? currentOrsClientPath
  : fs.existsSync(legacyOrsClientPath)
    ? legacyOrsClientPath
    : null;
const source = orsClientPath ? fs.readFileSync(orsClientPath, "utf8") : fs.readFileSync(routeScreenPath, "utf8");

const failures = [];

if (orsClientPath) {
  if (/const coordinates = request\.coordinates[\s\S]*?\.flat\(\)/.test(source)) {
    failures.push("ORS directions payload still flattens coordinates.");
  }

  if (!/const coordinates = request\.coordinates\.map\(\(coordinate\) => \[coordinate\.lng, coordinate\.lat\]\)/.test(source)) {
    failures.push("ORS directions payload does not preserve [lng, lat] coordinate pairs.");
  }

  if (!/Directions require at least two valid coordinates\./.test(source)) {
    failures.push("ORS directions does not guard against fewer than two valid coordinates.");
  }

  if (!/Directions require valid latitude\/longitude coordinates\./.test(source)) {
    failures.push("ORS directions does not validate coordinate ranges before calling the API.");
  }
} else {
  if (!source.includes("https://www.google.com/maps?q=${coordinates.lat},${coordinates.lng}")) {
    failures.push("Driver route navigation must preserve latitude/longitude order for Google Maps.");
  }

  if (!source.includes("function distanceKm(")) {
    failures.push("Driver route screen must compute leg distance from coordinate pairs.");
  }

  if (!source.includes("function routeEtaMinutes(")) {
    failures.push("Driver route screen must derive ETA from route leg distance.");
  }
}

if (failures.length) {
  console.error("ORS directions regression check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("ORS directions regression check passed.");
