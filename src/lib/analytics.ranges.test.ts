import assert from "node:assert/strict";
import test from "node:test";
import { sinceFor } from "./analytics.ranges";

test("today starts at midnight in Riyadh regardless of server timezone", () => {
  const now = Date.parse("2026-09-07T20:30:00.000Z"); // 23:30 in Riyadh
  assert.equal(sinceFor("today", now), "2026-09-06T21:00:00.000Z");
});

test("rolling ranges and all-time boundary remain exact", () => {
  const now = Date.parse("2026-09-07T12:00:00.000Z");
  assert.equal(sinceFor("7d", now), "2026-08-31T12:00:00.000Z");
  assert.equal(sinceFor("all", now), null);
});
