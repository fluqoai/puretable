// Run with SUPABASE_ACCESS_TOKEN, SUPABASE_PROJECT_ID and RESEND_API_KEY set.
// Configures hosted Supabase Auth to send branded Arabic emails through Resend SMTP.
const accessToken = process.env.SUPABASE_ACCESS_TOKEN;
const projectRef = process.env.SUPABASE_PROJECT_ID;
const resendKey = process.env.RESEND_API_KEY;
if (!accessToken || !projectRef || !resendKey) {
  throw new Error("SUPABASE_ACCESS_TOKEN, SUPABASE_PROJECT_ID and RESEND_API_KEY are required");
}

const origin = (process.env.APP_URL || "https://puretable.co").replace(/\/$/, "");
const logo = `${origin}/api/public/brand-logo`;
const authTemplate = ({ title, body, actionLabel, actionUrl, code }) => `<!doctype html>
<html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#f4f7f5;font-family:Tahoma,Arial,sans-serif;color:#17211b;direction:rtl">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f7f5"><tr><td align="center" style="padding:32px 12px">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#fff;border:1px solid #e3e9e5;border-radius:24px;overflow:hidden">
<tr><td align="center" style="padding:30px 24px 20px;background:#f7fbf8;border-bottom:1px solid #e3e9e5"><img src="${logo}" width="52" height="52" alt="Pure Table" style="display:block;object-fit:contain;margin:0 auto 10px"><div style="font-size:20px;font-weight:700">Pure Table</div></td></tr>
<tr><td style="padding:32px 28px"><h1 style="margin:0 0 14px;font-size:25px;line-height:1.5">${title}</h1><p style="margin:0;color:#4f5f55;font-size:15px;line-height:1.9">${body}</p>
${code ? `<div style="margin:24px 0;text-align:center;font-size:30px;font-weight:700;letter-spacing:6px;direction:ltr">${code}</div>` : ""}
${actionLabel && actionUrl ? `<p style="margin:28px 0 8px;text-align:center"><a href="${actionUrl}" style="display:inline-block;background:#2f7d54;color:#fff;text-decoration:none;border-radius:999px;padding:12px 24px;font-size:14px;font-weight:700">${actionLabel}</a></p>` : ""}
<p style="margin:24px 0 0;color:#78867d;font-size:12px;line-height:1.8">إذا لم تطلب هذا الإجراء، يمكنك تجاهل الرسالة بأمان.</p></td></tr>
<tr><td style="padding:20px 28px;background:#f7fbf8;border-top:1px solid #e3e9e5;text-align:center;color:#78867d;font-size:12px;line-height:1.8">هذه رسالة آلية من منصة Pure Table. فضلاً لا ترد على هذا البريد.<br><a href="${origin}" style="color:#2f7d54;text-decoration:none">puretable.co</a></td></tr>
</table></td></tr></table></body></html>`;

const payload = {
  site_url: origin,
  external_email_enabled: true,
  mailer_autoconfirm: false,
  smtp_admin_email: "no-reply@puretable.co",
  smtp_sender_name: "PureTable",
  smtp_host: "smtp.resend.com",
  smtp_port: "465",
  smtp_user: "resend",
  smtp_pass: resendKey,
  mailer_subjects_confirmation: "فعّل حسابك في Pure Table",
  mailer_templates_confirmation_content: authTemplate({
    title: "مرحباً بك في Pure Table",
    body: "اضغط الزر التالي لتأكيد بريدك الإلكتروني وتفعيل حسابك.",
    actionLabel: "تفعيل الحساب",
    actionUrl: "{{ .ConfirmationURL }}",
  }),
  mailer_subjects_recovery: "استعادة كلمة مرور Pure Table",
  mailer_templates_recovery_content: authTemplate({
    title: "استعادة كلمة المرور",
    body: "استلمنا طلباً لتغيير كلمة مرور حسابك. استخدم الزر التالي لاختيار كلمة مرور جديدة.",
    actionLabel: "تغيير كلمة المرور",
    actionUrl: "{{ .ConfirmationURL }}",
  }),
  mailer_subjects_invite: "دعوة للانضمام إلى Pure Table",
  mailer_templates_invite_content: authTemplate({
    title: "دعوة للانضمام إلى Pure Table",
    body: "تمت دعوتك لإنشاء حساب في المنصة. اضغط الزر التالي لإكمال التسجيل.",
    actionLabel: "قبول الدعوة",
    actionUrl: "{{ .ConfirmationURL }}",
  }),
  mailer_subjects_magic_link: "رابط الدخول إلى Pure Table",
  mailer_templates_magic_link_content: authTemplate({
    title: "رابط تسجيل الدخول",
    body: "استخدم الزر التالي للدخول إلى حسابك. الرابط مخصص لك وصالح لمدة محدودة.",
    actionLabel: "تسجيل الدخول",
    actionUrl: "{{ .ConfirmationURL }}",
  }),
  mailer_subjects_email_change: "تأكيد بريدك الجديد في Pure Table",
  mailer_templates_email_change_content: authTemplate({
    title: "تأكيد البريد الإلكتروني الجديد",
    body: "اضغط الزر التالي لتأكيد تغيير بريد حسابك إلى {{ .NewEmail }}.",
    actionLabel: "تأكيد البريد الجديد",
    actionUrl: "{{ .ConfirmationURL }}",
  }),
  mailer_subjects_reauthentication: "رمز التحقق من Pure Table: {{ .Token }}",
  mailer_templates_reauthentication_content: authTemplate({
    title: "رمز التحقق",
    body: "استخدم الرمز التالي لتأكيد هويتك. الرمز صالح لمدة محدودة.",
    code: "{{ .Token }}",
  }),
  mailer_notifications_password_changed_enabled: true,
  mailer_subjects_password_changed_notification: "تم تغيير كلمة مرور حسابك في Pure Table",
  mailer_templates_password_changed_notification_content: authTemplate({
    title: "تم تغيير كلمة المرور",
    body: "تم تغيير كلمة مرور حسابك في Pure Table بنجاح.",
    actionLabel: "فتح Pure Table",
    actionUrl: `${origin}/auth`,
  }),
  mailer_notifications_email_changed_enabled: true,
  mailer_subjects_email_changed_notification: "تم تغيير بريد حسابك في Pure Table",
  mailer_templates_email_changed_notification_content: authTemplate({
    title: "تم تغيير البريد الإلكتروني",
    body: "تم تغيير بريد حسابك من {{ .OldEmail }} إلى {{ .Email }}.",
    actionLabel: "فتح Pure Table",
    actionUrl: `${origin}/auth`,
  }),
};

const endpoint = `https://api.supabase.com/v1/projects/${projectRef}/config/auth`;
const response = await fetch(endpoint, {
  method: "PATCH",
  headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
  body: JSON.stringify(payload),
});
if (!response.ok) throw new Error(`Supabase Auth configuration failed (${response.status})`);
const configured = await response.json();
if (
  configured.smtp_host !== "smtp.resend.com" ||
  configured.smtp_admin_email !== "no-reply@puretable.co" ||
  configured.smtp_sender_name !== "PureTable"
) {
  throw new Error("Supabase returned an unexpected SMTP configuration");
}
console.log("PASS: Supabase Auth uses Resend SMTP with branded Arabic templates.");
