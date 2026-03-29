import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { nombre, mensaje, tenant_name } = body

  const RESEND_API_KEY = process.env.RESEND_API_KEY
  const NOTIFICATION_EMAIL = process.env.NOTIFICATION_EMAIL

  if (RESEND_API_KEY && NOTIFICATION_EMAIL) {
    try {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": "Bearer " + RESEND_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Takai.cl <onboarding@resend.dev>",
          to: NOTIFICATION_EMAIL,
          subject: "Nueva consulta — " + (tenant_name || "Cabaña"),
          html:
            "<h2 style='font-family:sans-serif;color:#1a2a18'>Nueva consulta de contacto</h2>" +
            "<p style='font-family:sans-serif'><strong>Cabaña:</strong> " + (tenant_name || "—") + "</p>" +
            "<p style='font-family:sans-serif'><strong>Nombre:</strong> " + (nombre || "—") + "</p>" +
            "<p style='font-family:sans-serif'><strong>Mensaje:</strong></p>" +
            "<p style='font-family:sans-serif;background:#f5f5f5;padding:12px;border-radius:6px'>" + (mensaje || "—") + "</p>" +
            "<hr style='border:none;border-top:1px solid #eee;margin:20px 0'/>" +
            "<p style='font-family:sans-serif;font-size:12px;color:#888'>Enviado desde Takai.cl</p>",
        }),
      })
    } catch (e) {
      // fallo silencioso — no bloquear al usuario
    }
  }

  return NextResponse.json({ ok: true })
}
