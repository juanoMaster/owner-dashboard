export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase-server"
import { verifyUnsub } from "@/lib/unsubscribe"

// GET /api/email/unsubscribe?e=<email>&t=<token> — baja de retargeting.
// Devuelve una página HTML simple (es un link desde un email).
export async function GET(req: Request) {
  const url = new URL(req.url)
  const email = (url.searchParams.get("e") || "").trim().toLowerCase()
  const token = url.searchParams.get("t") || ""

  const ok = verifyUnsub(email, token)
  if (!ok) {
    return new NextResponse(page("Link inválido", "Este enlace de baja no es válido o expiró."), {
      status: 400, headers: { "Content-Type": "text/html; charset=utf-8" },
    })
  }

  try {
    const supabase = getSupabaseAdmin()
    // Idempotente: si ya está, no duplica (UNIQUE(email))
    await supabase.from("email_opt_out").upsert([{ email }], { onConflict: "email" })
  } catch {
    // no romper la confirmación al usuario
  }

  return new NextResponse(
    page("Listo", "No volverás a recibir correos de novedades. Puedes cerrar esta ventana."),
    { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } }
  )
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}

function page(title: string, message: string): string {
  return `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title></head>
<body style="margin:0;background:#0d1a12;font-family:sans-serif;display:flex;min-height:100vh;align-items:center;justify-content:center;">
  <div style="background:#162618;border:1px solid #2a3e28;border-radius:10px;padding:36px;max-width:420px;text-align:center;">
    <h1 style="font-family:Georgia,serif;color:#e8d5a3;font-size:22px;font-weight:400;margin:0 0 12px;">${esc(title)}</h1>
    <p style="color:#8a9e88;font-size:14px;line-height:1.6;margin:0;">${esc(message)}</p>
  </div>
</body></html>`
}
