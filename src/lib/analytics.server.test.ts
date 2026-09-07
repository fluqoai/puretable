import assert from "node:assert/strict";
import test from "node:test";
import { analyticsDedupeKey } from "./analytics.server";

test("analytics dedupe keys are stable inside the same time bucket", () => {
  const first = analyticsDedupeKey(
    ["page_view", "session-1", "/business/test"],
    60_000,
    1_800_000_000_000,
  );
  const second = analyticsDedupeKey(
    ["page_view", "session-1", "/business/test"],
    60_000,
    1_800_000_059_999,
  );
  assert.equal(first, second);
  assert.equal(first.length, 64);
});

test("different business interactions do not share a dedupe key", () => {
  const first = analyticsDedupeKey(
    ["click_phone", "session-1", "business-a"],
    60_000,
    1_800_000_000_000,
  );
  const second = analyticsDedupeKey(
    ["click_phone", "session-1", "business-b"],
    60_000,
    1_800_000_000_000,
  );
  assert.notEqual(first, second);
});
