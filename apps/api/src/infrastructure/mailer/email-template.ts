type EmailAction = {
  label: string;
  url: string;
  clickable?: boolean;
};

type EmailTemplateInput = {
  preheader: string;
  title: string;
  greeting: string;
  bodyHtml: string;
  action?: EmailAction;
  notice?: string;
};

export function renderEmailTemplate(input: EmailTemplateInput): string {
  const action = input.action
    ? input.action.clickable === false
      ? `<p style="margin:28px 0 8px;font-family:Arial,sans-serif;font-size:14px;line-height:22px;font-weight:700;color:#0f172a">${escapeHtml(input.action.label)}</p>
      <p style="margin:0 0 8px;font-family:Arial,sans-serif;font-size:13px;line-height:20px;color:#64748b">Por seguridad, copia y pega esta dirección completa en tu navegador:</p>
      <div style="padding:14px 16px;word-break:break-all;background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;font-family:Arial,sans-serif;font-size:13px;line-height:20px;color:#1d4ed8">${escapeHtml(input.action.url)}</div>`
      : `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0 24px">
        <tr>
          <td bgcolor="#2563eb" style="border-radius:10px">
            <a href="${escapeHtml(input.action.url)}" style="display:inline-block;padding:14px 24px;font-family:Arial,sans-serif;font-size:16px;font-weight:700;line-height:20px;color:#ffffff;text-decoration:none;border-radius:10px">${escapeHtml(input.action.label)}</a>
          </td>
        </tr>
      </table>
      <p style="margin:0 0 8px;font-family:Arial,sans-serif;font-size:13px;line-height:20px;color:#64748b">Si el botón no funciona, copia y pega este enlace en tu navegador:</p>
      <p style="margin:0;word-break:break-all;font-family:Arial,sans-serif;font-size:13px;line-height:20px"><a href="${escapeHtml(input.action.url)}" style="color:#2563eb;text-decoration:underline">${escapeHtml(input.action.url)}</a></p>`
    : '';
  const notice = input.notice
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:24px;background:#f8fafc;border-left:4px solid #93c5fd;border-radius:6px">
        <tr><td style="padding:14px 16px;font-family:Arial,sans-serif;font-size:13px;line-height:20px;color:#475569">${escapeHtml(input.notice)}</td></tr>
      </table>`
    : '';

  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <meta name="x-apple-disable-message-reformatting">
    <title>${escapeHtml(input.title)}</title>
  </head>
  <body style="margin:0;padding:0;background:#f1f5f9">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${escapeHtml(input.preheader)}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;background:#f1f5f9">
      <tr>
        <td align="center" style="padding:32px 16px">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden">
            <tr>
              <td style="padding:24px 32px;background:#0f172a">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td align="center" valign="middle" width="42" height="42" style="width:42px;height:42px;border-radius:11px;background:#2563eb;font-family:Arial,sans-serif;font-size:24px;font-weight:700;color:#ffffff">¿</td>
                    <td style="padding-left:12px">
                      <div style="font-family:Arial,sans-serif;font-size:20px;font-weight:700;line-height:24px;color:#ffffff">Yallegó</div>
                      <div style="font-family:Arial,sans-serif;font-size:12px;line-height:18px;color:#cbd5e1">¿Ya llegó?</div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:36px 32px 32px">
                <h1 style="margin:0 0 20px;font-family:Arial,sans-serif;font-size:28px;line-height:35px;color:#0f172a">${escapeHtml(input.title)}</h1>
                <p style="margin:0 0 16px;font-family:Arial,sans-serif;font-size:16px;line-height:25px;color:#334155">${escapeHtml(input.greeting)}</p>
                <div style="font-family:Arial,sans-serif;font-size:16px;line-height:25px;color:#334155">${input.bodyHtml}</div>
                ${action}
                ${notice}
              </td>
            </tr>
            <tr>
              <td style="padding:22px 32px;background:#f8fafc;border-top:1px solid #e2e8f0">
                <p style="margin:0 0 4px;font-family:Arial,sans-serif;font-size:13px;line-height:20px;color:#475569">Yallegó · Validación de cobros en tiempo real</p>
                <p style="margin:0;font-family:Arial,sans-serif;font-size:12px;line-height:18px;color:#94a3b8">Este es un mensaje automático. Por favor, no respondas a este correo.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function paragraph(content: string): string {
  return `<p style="margin:0 0 16px">${content}</p>`;
}

export function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (character) => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;',
    };
    return entities[character] ?? character;
  });
}
