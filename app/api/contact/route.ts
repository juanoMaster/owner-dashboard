import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { nombre, cabanas, whatsapp, cantidad } = body
    const apiKey = process.env.RESEND_API_KEY

    if (apiKey) {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": "Bearer " + apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Takai.cl <onboarding@resend.dev>",
          to: ["contacto@takai.cl"],
          subject: "Nueva solicitud: " + (nombre || "") + " — " + (cabanas || ""),
          html:
            "<div style='font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#f9f9f9;border-radius:12px'>" +
            "<h2 style='color:#0a0700;font-size:22px;margin-bottom:20px'>Nueva solicitud — Takai.cl</h2>" +
            "<table style='width:100%;border-collapse:collapse'>" +
            "<tr><td style='padding:10px 0;color:#555;font-size:14px;width:140px'>Nombre</td><td style='padding:10px 0;color:#111;font-size:14px;font-weight:600'>" + (nombre || "—") + "</td></tr>" +
            "<tr style='border-top:1px solid #eee'><td style='padding:10px 0;color:#555;font-size:14px'>Cabañas</td><td style='padding:10px 0;color:#111;font-size:14px;font-weight:600'>" + (cabanas || "—") + "</td></tr>" +
            "<tr style='border-top:1px solid #eee'><td style='padding:10px 0;color:#555;font-size:14px'>WhatsApp</td><td style='padding:10px 0;color:#111;font-size:14px;font-weight:600'>" + (whatsapp || "—") + "</td></tr>" +
            "<tr style='border-top:1px solid #eee'><td style='padding:10px 0;color:#555;font-size:14px'>Cantidad</td><td style='padding:10px 0;color:#111;font-size:14px;font-weight:600'>" + (cantidad || "—") + "</td></tr>" +
            "</table>" +
            "<p style='margin-top:24px;font-size:12px;color:#999'>Enviado desde takai.cl</p>" +
            "</div>",
        }),
      })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("Error sending email:", err)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}