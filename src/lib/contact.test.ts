import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { whatsappHref, withPureTableUtm } from "@/lib/contact";

describe("business contact attribution", () => {
  test("adds the Pure Table message to a Saudi WhatsApp number", () => {
    const href = whatsappHref("0501234567", "وصلتكم عن طريق بيور تيبل");
    const url = new URL(href!);
    assert.equal(url.hostname, "wa.me");
    assert.equal(url.pathname, "/966501234567");
    assert.equal(url.searchParams.get("text"), "وصلتكم عن طريق بيور تيبل");
  });

  test("preserves existing website parameters and adds Pure Table UTM attribution", () => {
    const url = new URL(withPureTableUtm("https://example.com/menu?branch=1"));
    assert.equal(url.searchParams.get("branch"), "1");
    assert.equal(url.searchParams.get("utm_source"), "pure_table");
    assert.equal(url.searchParams.get("utm_medium"), "referral");
    assert.equal(url.searchParams.get("utm_campaign"), "business_profile");
  });
});
