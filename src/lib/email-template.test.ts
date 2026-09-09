import assert from "node:assert/strict";
import { test } from "node:test";
import { renderPureTableEmail, renderPureTableText } from "./email-template";

test("email template is Arabic, branded and escapes visitor content", () => {
  const content = {
    preheader: "معاينة",
    title: "رسالة جديدة",
    intro: "تم الاستلام",
    details: [{ label: "الاسم", value: '<script>alert("x")</script>' }],
    action: { label: "فتح المنصة", url: "https://puretable.co/admin" },
  };
  const html = renderPureTableEmail(content, "https://puretable.co/");
  assert.match(html, /lang="ar" dir="rtl"/);
  assert.match(html, /https:\/\/puretable\.co\/api\/public\/brand-logo/);
  assert.ok(!html.includes("<script>"));
  assert.match(html, /&lt;script&gt;/);
  assert.match(renderPureTableText(content), /رسالة جديدة/);
});
