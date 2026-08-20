import assert from "node:assert/strict";

const { resolveCustomerLocation } = await import("../src/lib/customer-location.ts");

const fromLatLng = resolveCustomerLocation({
  lat: 30.0444,
  lng: 31.2357,
  google_maps_url: "https://maps.app.goo.gl/should-not-win",
  customer_email: "legacy@example.com",
  customer_location: null,
});

assert.equal(fromLatLng.kind, "coordinates");
assert.equal(fromLatLng.mapUrl, "https://www.google.com/maps?q=30.0444,31.2357");

const fromMapLink = resolveCustomerLocation({
  lat: null,
  lng: null,
  google_maps_url: "https://maps.app.goo.gl/abc123",
  customer_email: "legacy@example.com",
  customer_location: null,
});

assert.equal(fromMapLink.kind, "google_maps_url");
assert.equal(fromMapLink.mapUrl, "https://maps.app.goo.gl/abc123");

const fromCoordinateEmail = resolveCustomerLocation({
  lat: null,
  lng: null,
  google_maps_url: null,
  customer_email: "30.0444, 31.2357",
  customer_location: null,
});

assert.equal(fromCoordinateEmail.kind, "email_coordinates");
assert.equal(fromCoordinateEmail.mapUrl, "https://www.google.com/maps?q=30.0444,31.2357");

const fromMapEmail = resolveCustomerLocation({
  lat: null,
  lng: null,
  google_maps_url: null,
  customer_email: "https://www.google.com/maps/place/Cairo",
  customer_location: null,
});

assert.equal(fromMapEmail.kind, "email_google_maps_url");
assert.equal(fromMapEmail.mapUrl, "https://www.google.com/maps/place/Cairo");

const fromCoordinateLocation = resolveCustomerLocation({
  lat: null,
  lng: null,
  google_maps_url: null,
  customer_email: null,
  customer_location: "30.0444, 31.2357",
});

assert.equal(fromCoordinateLocation.kind, "location_coordinates");
assert.equal(fromCoordinateLocation.mapUrl, "https://www.google.com/maps?q=30.0444,31.2357");

const fromAddress = resolveCustomerLocation({
  customer_name: "Fresh Restaurant",
  lat: null,
  lng: null,
  google_maps_url: null,
  customer_email: "customer@example.com",
  customer_location: null,
  place: "Nasr City",
  district: "Cairo",
  governorate: "Cairo",
});

assert.equal(fromAddress.kind, "address_text");
assert.equal(
  fromAddress.mapUrl,
  "https://www.google.com/maps/search/?api=1&query=Fresh%20Restaurant%2C%20Nasr%20City%2C%20Cairo",
);
assert.equal(fromAddress.displayText, "Nasr City, Cairo");
assert.equal(fromAddress.sourceText, "Fresh Restaurant, Nasr City, Cairo");

const fromPlainLocationAddress = resolveCustomerLocation({
  customer_name: "Legacy Cafe",
  lat: null,
  lng: null,
  google_maps_url: null,
  customer_email: "customer@example.com",
  customer_location: "Sheraton, Cairo",
});

assert.equal(fromPlainLocationAddress.kind, "address_text");
assert.equal(
  fromPlainLocationAddress.mapUrl,
  "https://www.google.com/maps/search/?api=1&query=Legacy%20Cafe%2C%20Sheraton%2C%20Cairo",
);
assert.equal(fromPlainLocationAddress.displayText, "Sheraton, Cairo");

console.log("Customer location regression checks passed.");
