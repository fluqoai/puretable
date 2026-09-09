// Run with: node --env-file=.env.local scripts/verify-success-partners.mjs
// Creates one isolated partner and always removes it after verification.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const options = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, options);
const anonymous = createClient(url, process.env.SUPABASE_PUBLISHABLE_KEY, options);
const name = `Partner QA ${randomUUID()}`;
let partnerId;

const ok = (result) => {
  if (result.error) throw new Error(result.error.message);
  return result.data;
};

try {
  const partner = ok(
    await admin
      .from("success_partners")
      .insert({ kind: "external", name, active: false })
      .select("id")
      .single(),
  );
  partnerId = partner.id;

  assert.deepEqual(
    ok(await anonymous.from("success_partners").select("id").eq("id", partnerId)),
    [],
  );
  assert.ok(
    (
      await anonymous
        .from("success_partners")
        .insert({ kind: "external", name: "Unauthorized partner" })
    ).error,
  );

  ok(await admin.from("success_partners").update({ active: true }).eq("id", partnerId));
  const visible = ok(
    await anonymous
      .from("success_partners")
      .select("id,kind,name,name_ar,logo_url,link_url")
      .eq("id", partnerId)
      .single(),
  );
  assert.equal(visible.name, name);
  assert.equal(visible.kind, "external");
  assert.deepEqual(Object.keys(visible).sort(), [
    "id",
    "kind",
    "link_url",
    "logo_url",
    "name",
    "name_ar",
  ]);

  console.log(
    "PASS: inactive partners stay private, anonymous writes are blocked, active partners are public.",
  );
} finally {
  if (partnerId) ok(await admin.from("success_partners").delete().eq("id", partnerId));
  console.log("Temporary success partner removed.");
}
