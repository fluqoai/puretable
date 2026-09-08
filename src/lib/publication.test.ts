import assert from "node:assert/strict";
import { test } from "node:test";
import { BusinessInput } from "./businesses.schemas";

test("new businesses stay private unless publication is explicit", () => {
  const draft = { name: "Pending approval", category: "bakery", city: "Riyadh" };
  assert.equal(BusinessInput.parse(draft).published, false);
  assert.equal(BusinessInput.parse({ ...draft, published: true }).published, true);
});
