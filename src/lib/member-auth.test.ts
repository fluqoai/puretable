import { test } from "node:test";
import assert from "node:assert/strict";
import { memberDestination } from "./member-auth";
test("member authentication always lands on a profile, never admin or an external URL", () => {
  for (const path of [
    undefined,
    "/admin",
    "//evil.test",
    "/\\evil.test",
    "/favorites",
    "https://evil.test",
  ]) {
    assert.equal(memberDestination(path), "/profile");
  }
  assert.equal(memberDestination("/business/place-1"), "/profile?next=%2Fbusiness%2Fplace-1");
});
