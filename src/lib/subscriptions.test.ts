import assert from "node:assert/strict";
import { test } from "node:test";
import { PlanDefinition, parsePlanCatalog, toFeatures } from "./subscriptions";
import {
  featuresOf,
  visiblePhotos,
  visibleDescription,
  remainingBranchSlots,
  branchLimitLabel,
} from "./plans";

const pro = {
  id: "pro" as const,
  branch_limit: 2,
  photo_limit: 2,
  description_limit: 20,
  show_links: false,
  analytics: "none" as const,
  revision: 2,
};
test("edited definitions govern every resolved business without copied feature switches", () => {
  const entitlements = toFeatures(pro);
  for (const name of ["One", "Two"]) {
    const business = { name, plan: "pro", entitlements, cover: "cover", photos: ["one", "two"] };
    assert.equal(featuresOf(business).showLinks, false);
    assert.equal(featuresOf(business).analytics, "none");
    assert.deepEqual(visiblePhotos(business), ["cover", "one"]);
    assert.equal(visibleDescription(business, "a".repeat(30)), "a".repeat(20) + "…");
  }
  assert.equal(remainingBranchSlots("pro", 1, entitlements), 1);
  assert.equal(branchLimitLabel("pro", entitlements), "2");
});
test("plan definitions validate limits, supported tiers and revision", () => {
  for (const value of [
    { ...pro, id: "family" },
    { ...pro, photo_limit: 0 },
    { ...pro, branch_limit: -1 },
    { ...pro, revision: 0 },
    { ...pro, description_limit: 10 },
  ]) {
    assert.equal(PlanDefinition.safeParse(value).success, false);
  }
  assert.equal(
    PlanDefinition.safeParse({ ...pro, branch_limit: null, description_limit: null }).success,
    true,
  );
});
test("missing catalog entries fail explicitly instead of applying stale defaults", () => {
  assert.throws(() => parsePlanCatalog([pro]));
  const catalog = parsePlanCatalog([pro, { ...pro, id: "free" }, { ...pro, id: "premium" }]);
  assert.equal(catalog.pro.revision, 2);
  assert.equal(toFeatures(catalog.premium).rank, 2);
});
