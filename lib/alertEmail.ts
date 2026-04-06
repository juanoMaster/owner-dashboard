import { getResend } from "@/lib/resend"

export async function sendAlertEmail(subject: string, details: string): Promise<void> {
  try {
    await getResend().emails.send({
      from: "Takai Alertas <notificaciones@takai.cl>",
      to: "contacto@takai.cl",
      subject: "[TAKAI ALERTA] " + subject,
      html: `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#0d0d0d;font-family:monospace;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0d0d;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#111;border-radius:8px;overflow:hidden;max-width:600px;border:1px solid #ff4444;">
        <tr>
          <td style="background:#1a0000;padding:24px 32px;border-bottom:1px solid #ff4444;">
            <p style="margin:0;color:#ff4444;font-size:12px;letter-spacing:3px;text-transform:uppercase;">&#9888; ALERTA — TAKAI SISTEMA</p>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <p style="margin:0 0 6px;color:#666;font-size:11px;text-transform:uppercase;letter-spacing:1px;">Asunto</p>
            <p style="margin:0 0 24px;color:#ff8888;font-size:16px;font-weight:700;">${subject}</p>

            <p style="margin:0 0 6px;color:#666;font-size:11px;text-transform:uppercase;letter-spacing:1px;">Detalles</p>
            <div style="background:#1a0000;border:1px solid #330000;border-radius:4px;padding:16px;margin-bottom:24px;">
              <pre style="margin:0;color:#ff6666;font-size:13px;line-height:1.7;white-space:pre-wrap;">${details}</pre>
            </div>

            <p style="margin:24px 0 0;color:#444;font-size:12px;">
              ${new Date().toLocaleString("es-CL", { timeZone: "America/Santiago" })} — Hora Chile
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px;border-top:1px solid #1a1a1a;text-align:center;">
            <a href="https://vercel.com/juanomasters-projects/owner-dashboard/logs" style="color:#C9A84C;font-size:12px;text-decoration:none;letter-spacing:1px;">Ver logs en Vercel &#8594;</a>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
    })
  } catch {
    // silencioso — no queremos loop si falla el propio sistema de alertas
  }
}
