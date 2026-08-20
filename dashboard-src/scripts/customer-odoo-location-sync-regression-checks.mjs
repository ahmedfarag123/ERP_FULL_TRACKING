import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync("supabase/functions/customers-odoo/index.ts", "utf8");

assert.match(
  source,
  /const NUMERIC_ODOO_FIELD_TYPES = new Set\(\[(["'])float\1,\s*(["'])integer\2,\s*(["'])monetary\3\]\)/,
  "Odoo customer sync must discover numeric custom coordinate fields.",
);

assert.match(
  source,
  /coordinateFieldMatches\(fieldName, metadata,\s*(["'])lat\1\)/,
  "Odoo customer sync must include discovered latitude fields.",
);

assert.match(
  source,
  /coordinateFieldMatches\(fieldName, metadata,\s*(["'])lng\1\)/,
  "Odoo customer sync must include discovered longitude fields.",
);

assert.match(
  source,
  /isZeroCoordinatePair\(lat, lng\)/,
  "Odoo customer sync must reject the 0,0 sentinel coordinate pair.",
);

assert.doesNotMatch(
  source,
  /const odooLat = toNullableNumber\(c\.partner_latitude\)[\s\S]*?lat:\s*odooLat \?\?/,
  "Odoo customer sync must not let partner_latitude=0 override real fallback coordinates.",
);

assert.match(
  source,
  /lat:\s*odooCoordinates\?\.lat\s*\?\?\s*linkCoordinates\?\.lat\s*\?\?\s*fallbackCoordinates\?\.lat\s*\?\?\s*null/,
  "Odoo customer sync must prefer validated Odoo coordinates, then map-link coordinates, then legacy coordinate text.",
);

assert.match(
  source,
  /const domain = fullSync\s*\?\s*\[\[\s*(["'])id\1,\s*(["'])>\2,\s*0\s*\]\]/,
  "Full Odoo customer sync must import all contacts, including customer_rank=0 contacts with customer codes.",
);

assert.doesNotMatch(
  source,
  /fullSync\s*\?\s*\[\[\s*(["'])customer_rank\1,\s*(["'])>\2,\s*0\s*\]\]/,
  "Full Odoo customer sync must not filter out contacts by customer_rank.",
);

assert.match(
  source,
  /\.from\((["'])customers\1\)\s*\.upsert\(upsertData,\s*\{\s*onConflict:\s*(["'])external_customer_id\2\s*\}\)/s,
  "Odoo customer sync must remain upsert-safe on external_customer_id.",
);

assert.doesNotMatch(
  source,
  /\.from\((["'])customers\1\)\s*\.delete\(|delete\s+from\s+(?:public\.)?customers|truncate\s+(?:table\s+)?(?:public\.)?customers/i,
  "Odoo customer sync must not delete or truncate existing customers.",
);

console.log("Customer Odoo location sync regression checks passed.");
