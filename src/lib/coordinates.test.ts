import assert from "node:assert/strict";
import { test } from "node:test";
import { hasCoordinates } from "./coordinates";
import { BranchInput, BusinessInput } from "./businesses.schemas";

test("coordinates accept zero and valid Saudi locations", () => {
  assert.equal(hasCoordinates({ lat: 0, lng: 0 }), true);
  assert.equal(hasCoordinates({ lat: 24.7136, lng: 46.6753 }), true);
});
test("coordinates reject missing, infinite and out-of-range positions", () => {
  for (const point of [
    { lat: null, lng: 46 },
    { lat: 24, lng: undefined },
    { lat: NaN, lng: 3 },
    { lat: 91, lng: 0 },
    { lat: 0, lng: -181 },
    { lat: Infinity, lng: 0 },
  ]) {
    assert.equal(hasCoordinates(point), false);
  }
});
test("manual branch input rejects impossible coordinates and preserves supplied hours", () => {
  const draft = {
    business_id: "10000000-0000-4000-8000-000000000001",
    name: "فرع الرياض",
    lat: 24.7,
    lng: 46.6,
    hours: { sun: "09:00–22:00" },
  };
  assert.equal(BranchInput.parse(draft).hours.sun, "09:00–22:00");
  assert.equal(BranchInput.safeParse({ ...draft, lat: 100 }).success, false);
  assert.equal(
    BusinessInput.safeParse({ name: "Test", category: "cafe", city: "Riyadh", lng: 200 }).success,
    false,
  );
});
