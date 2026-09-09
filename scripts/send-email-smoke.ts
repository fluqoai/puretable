// Sends one branded verification email to EMAIL_ADMIN_RECIPIENT.
// Run with RESEND_API_KEY and the normal server-side Supabase variables set.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { sendNotification } from "@/lib/email.server";

const recipient = process.env["EMAIL_ADMIN_RECIPIENT"];
if (!recipient) throw new Error("EMAIL_ADMIN_RECIPIENT is required");
const eventKey = `verification/${randomUUID()}`;

const result = await sendNotification({
  eventKey,
  type: "contact_admin",
  to: recipient,
  subject: "اختبار جاهزية إشعارات Pure Table",
  content: {
    preheader: "تم ربط نظام إشعارات Pure Table بنجاح.",
    title: "نظام الإشعارات جاهز",
    intro:
      "هذه رسالة تحقق واحدة تؤكد أن القالب العربي والمرسل ونظام التسليم عبر Resend يعملون بصورة صحيحة.",
    action: { label: "فتح Pure Table", url: "https://puretable.co" },
  },
  metadata: { purpose: "production_readiness_verification" },
});

assert.equal(result.skipped, false);
const delivery = await supabaseAdmin
  .from("email_deliveries")
  .select("status,provider_id")
  .eq("event_key", eventKey)
  .single();
if (delivery.error) throw delivery.error;
assert.equal(delivery.data.status, "sent");
assert.ok(delivery.data.provider_id);
console.log("PASS: Resend accepted the branded email and the delivery was recorded as sent.");
