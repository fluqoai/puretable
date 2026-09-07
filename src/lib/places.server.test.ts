import assert from "node:assert/strict";
import test from "node:test";
import {
  distanceMeters,
  normalizePlaceText,
  parseGoogleMapsUrl,
  resolveGoogleMapsUrl,
} from "./places.server";

test("extracts a Place ID from a supported Google Maps URL", () => {
  const parsed = parseGoogleMapsUrl(
    new URL(
      "https://www.google.com/maps/search/?api=1&query=Pure+Table&query_place_id=ChIJ_test-123",
    ),
  );
  assert.equal(parsed.placeId, "ChIJ_test-123");
  assert.equal(parsed.query, "Pure Table");
});

test("extracts a place name from the common /maps/place URL", () => {
  const parsed = parseGoogleMapsUrl(
    new URL("https://www.google.com/maps/place/Pizza+House/@24.7,46.6,15z"),
  );
  assert.equal(parsed.query, "Pizza House");
});

test("rejects non-Google and insecure map URLs before any fetch", async () => {
  await assert.rejects(() => resolveGoogleMapsUrl("https://example.com/maps/place/Fake"));
  await assert.rejects(() => resolveGoogleMapsUrl("http://www.google.com/maps/place/Fake"));
});

test("normalizes Arabic address variants for duplicate comparison", () => {
  assert.equal(normalizePlaceText("حيّ الروضة، جدة"), normalizePlaceText("حي الروضه جدة"));
});

test("detects nearby coordinates within the duplicate threshold", () => {
  const distance = distanceMeters({ lat: 24.7136, lng: 46.6753 }, { lat: 24.7138, lng: 46.6754 });
  assert.ok(distance != null && distance > 0 && distance < 60);
});
