export type EmailDetail = { label: string; value: string | null | undefined };

export type PureTableEmailContent = {
  preheader: string;
  title: string;
  intro: string;
  details?: EmailDetail[];
  action?: { label: string; url: string };
  footer?: string;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function renderPureTableEmail(content: PureTableEmailContent, origin: string) {
  const base = origin.replace(/\/$/, "");
  const details = (content.details ?? []).filter(
    (item): item is { label: string; value: string } => !!item.value?.trim(),
  );
  const detailRows = details
    .map(
      ({ label, value }) => `
        <tr>
          <td style="padding:9px 0;color:#667085;font-size:13px;vertical-align:top;width:34%">${escapeHtml(label)}</td>
          <td style="padding:9px 0;color:#17211b;font-size:14px;font-weight:600;vertical-align:top;white-space:pre-wrap">${escapeHtml(value)}</td>
        </tr>`,
    )
    .join("");
  const action = content.action
    ? `<p style="margin:28px 0 8px;text-align:center"><a href="${escapeHtml(content.action.url)}" style="display:inline-block;background:#2f7d54;color:#fff;text-decoration:none;border-radius:999px;padding:12px 24px;font-size:14px;font-weight:700">${escapeHtml(content.action.label)}</a></p>`
    : "";

  return `<!doctype html>
<html lang="ar" dir="rtl">
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
  <body style="margin:0;background:#f4f7f5;font-family:Tahoma,Arial,sans-serif;color:#17211b;direction:rtl">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(content.preheader)}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f7f5">
      <tr><td align="center" style="padding:32px 12px">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#fff;border:1px solid #e3e9e5;border-radius:24px;overflow:hidden">
          <tr><td align="center" style="padding:30px 24px 20px;background:#f7fbf8;border-bottom:1px solid #e3e9e5">
            <img src="${base}/api/public/brand-logo" width="52" height="52" alt="Pure Table" style="display:block;object-fit:contain;margin:0 auto 10px">
            <div style="font-size:20px;font-weight:700;color:#17211b">Pure Table</div>
          </td></tr>
          <tr><td style="padding:32px 28px">
            <h1 style="margin:0 0 14px;font-size:25px;line-height:1.5;color:#17211b">${escapeHtml(content.title)}</h1>
            <p style="margin:0;color:#4f5f55;font-size:15px;line-height:1.9;white-space:pre-wrap">${escapeHtml(content.intro)}</p>
            ${details.length ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:24px;border-top:1px solid #e3e9e5">${detailRows}</table>` : ""}
            ${action}
          </td></tr>
          <tr><td style="padding:20px 28px;background:#f7fbf8;border-top:1px solid #e3e9e5;text-align:center;color:#78867d;font-size:12px;line-height:1.8">
            ${escapeHtml(content.footer ?? "هذه رسالة آلية من منصة Pure Table. فضلاً لا ترد على هذا البريد.")}<br>
            <a href="${base}" style="color:#2f7d54;text-decoration:none">puretable.co</a>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}

export function renderPureTableText(content: PureTableEmailContent) {
  const details = (content.details ?? [])
    .filter((item) => item.value?.trim())
    .map((item) => `${item.label}: ${item.value}`)
    .join("\n");
  return [
    content.title,
    content.intro,
    details,
    content.action ? `${content.action.label}: ${content.action.url}` : "",
    content.footer ?? "هذه رسالة آلية من منصة Pure Table. فضلاً لا ترد على هذا البريد.",
  ]
    .filter(Boolean)
    .join("\n\n");
}
