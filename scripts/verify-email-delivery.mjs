// Run with: node --env-file=.env.local scripts/verify-email-delivery.mjs
// Verifies delivery logging and RLS without sending an email.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const options = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, options);
const anonymous = createClient(url, process.env.SUPABASE_PUBLISHABLE_KEY, options);
const eventKey = `verification/${randomUUID()}`;

try {
  const inserted = await admin
    .from("email_deliveries")
    .insert({
      event_key: eventKey,
      notification_type: "contact_admin",
      recipient: "info@puretable.co",
      subject: "Delivery verification",
    })
    .select("id,status")
    .single();
  if (inserted.error) throw inserted.error;
  assert.equal(inserted.data.status, "pending");
  assert.ok((await anonymous.from("email_deliveries").select("id")).error);
  assert.ok(
    (
      await anonymous.from("email_deliveries").insert({
        event_key: `unauthorized/${randomUUID()}`,
        notification_type: "contact_admin",
        recipient: "info@puretable.co",
        subject: "Unauthorized",
      })
    ).error,
  );
  const duplicate = await admin.from("email_deliveries").insert({
    event_key: eventKey,
    notification_type: "contact_admin",
    recipient: "info@puretable.co",
    subject: "Duplicate",
  });
  assert.equal(duplicate.error?.code, "23505");
  console.log("PASS: delivery state, unique event keys and private RLS are enforced.");
} finally {
  const cleanup = await admin.from("email_deliveries").delete().eq("event_key", eventKey);
  if (cleanup.error) throw cleanup.error;
  console.log("Temporary delivery record removed.");
}
