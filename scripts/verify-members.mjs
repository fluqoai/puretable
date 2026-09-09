// Run with: node --env-file=.env.local scripts/verify-members.mjs
// Creates isolated test members; never edits existing accounts or businesses.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
const url = process.env.SUPABASE_URL;
const options = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, options);
const client = () => createClient(url, process.env.SUPABASE_PUBLISHABLE_KEY, options);
const users = [];
const clients = [];
const ok = (r) => {
  if (r.error) throw new Error(r.error.message);
  return r.data;
};
try {
  for (let n = 0; n < 2; n++) {
    const email = "member-qa-" + randomUUID() + "@example.com";
    const password = randomUUID() + "aA1!";
    const { user } = ok(
      await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { display_name: "QA member", role: "admin" },
      }),
    );
    users.push(user.id);
    const c = client();
    clients.push(c);
    ok(await c.auth.signInWithPassword({ email, password }));
  }
  const [a, b] = clients;
  const profile = ok(await a.from("profiles").select("*").single());
  assert.equal(profile.id, users[0]);
  assert.equal(profile.display_name, "QA member");
  assert.deepEqual(ok(await b.from("profiles").select("*").eq("id", users[0])), []);
  assert.equal(ok(await a.rpc("has_role", { _user_id: users[0], _role: "admin" })), false);
  assert.ok((await a.rpc("claim_admin_role")).error);
  assert.ok((await a.from("user_roles").insert({ user_id: users[0], role: "admin" })).error);
  ok(
    await a
      .from("profiles")
      .update({ display_name: "Updated member", city: "Riyadh" })
      .eq("id", users[0]),
  );
  assert.deepEqual(
    ok(await b.from("profiles").update({ display_name: "Intruder" }).eq("id", users[0]).select()),
    [],
  );
  assert.equal(
    ok(await a.from("profiles").select("display_name").single()).display_name,
    "Updated member",
  );
  const business = ok(await admin.from("businesses").select("id").limit(1).single());
  for (let n = 0; n < 2; n++)
    ok(
      await a
        .from("favorites")
        .upsert(
          { user_id: users[0], business_id: business.id },
          { onConflict: "user_id,business_id", ignoreDuplicates: true },
        ),
    );
  assert.equal(ok(await a.from("favorites").select("*")).length, 1);
  assert.equal(ok(await b.from("favorites").select("*")).length, 0);
  assert.ok(
    (await b.from("favorites").insert({ user_id: users[0], business_id: business.id })).error,
  );
  const session = ok(await a.auth.getSession()).session;
  const second = client();
  clients.push(second);
  ok(
    await second.auth.setSession({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    }),
  );
  assert.equal(ok(await second.from("favorites").select("*")).length, 1);
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jr1cAAAAASUVORK5CYII=",
    "base64",
  );
  const path = users[0] + "/avatar";
  ok(
    await a.storage
      .from("member-avatars")
      .upload(path, png, { contentType: "image/png", upsert: true }),
  );
  ok(await a.storage.from("member-avatars").createSignedUrl(path, 60));
  assert.ok((await b.storage.from("member-avatars").createSignedUrl(path, 60)).error);
  assert.ok(
    (
      await b.storage
        .from("member-avatars")
        .upload(path, png, { contentType: "image/png", upsert: true })
    ).error,
  );
  const anon = client();
  assert.ok((await anon.from("profiles").select("*")).error);
  console.log(
    "PASS: profile creation, private reads/writes, no role escalation, favorites isolation/deduplication/session sync, private avatars.",
  );
} finally {
  for (const c of clients) await c.auth.signOut();
  for (const id of users) {
    ok(await admin.storage.from("member-avatars").remove([id + "/avatar"]));
    ok(await admin.auth.admin.deleteUser(id));
  }
  console.log("Temporary test members and avatars removed.");
}
