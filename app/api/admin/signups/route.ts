export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase-server"
import { logAudit } from "@/lib/audit"
import { getResend } from "@/lib/resend"
import { SETUP_FEE_KIND } from "@/lib/signup"

const APP_BASE = process.env.NEXT_PUBLIC_APP_URL ?? "https://owner-dashboard-navy.vercel.app"

function esc(s: string): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;")
}

function authorized(req: Request): boolean {
  const adminToken = process.env.ADMIN_TOKEN
  return !!adminToken && req.headers.get("x-admin-token") === adminToken
}

// GET — lista las solicitudes del alta self-service pendientes de aprobación.
// Una solicitud = tenant con active=false Y un cobro kind='setup_fee'. El
// segundo filtro importa: hay tenants viejos desactivados a mano (ex-prospectos
// como trinidad o rukatraro) que no son solicitudes y no deben aparecer aquí.
export async function GET(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const supabase = getSupabaseAdmin()

  const { data: fees, error: feesErr } = await supabase
    .from("commission_statements")
    .select("id, tenant_id, status, commission_amount, paid_at, payment_method")
    .eq("kind", SETUP_FEE_KIND)
    .order("created_at", { ascending: false })
    .limit(200)

  if (feesErr) return NextResponse.json({ error: feesErr.message }, { status: 500 })

  const feeTenantIds = Array.from(new Set((fees ?? []).map((f) => f.tenant_id).filter(Boolean)))
  if (feeTenantIds.length === 0) return NextResponse.json({ signups: [] })

  const { data: tenants, error } = await supabase
    .from("tenants")
    .select("id, business_name, owner_name, email_owner, owner_whatsapp, slug, location_text, latitude, longitude, template, bank_name, bank_account_type, bank_account_number, bank_account_holder, bank_rut, created_at, referred_by_affiliate_id, affiliates:referred_by_affiliate_id(name, code)")
    .in("id", feeTenantIds)
    .eq("active", false)
    .order("created_at", { ascending: false })
    .limit(100)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const ids = (tenants ?? []).map((t) => t.id)
  if (ids.length === 0) return NextResponse.json({ signups: [] })

  const { data: cabins } = await supabase
    .from("cabins")
    .select("id, tenant_id, name, capacity, base_price_night, photos")
    .in("tenant_id", ids)

  const cabinsByTenant = new Map<string, any[]>()
  for (const c of cabins ?? []) {
    const list = cabinsByTenant.get(c.tenant_id) ?? []
    list.push(c)
    cabinsByTenant.set(c.tenant_id, list)
  }
  const feeByTenant = new Map<string, any>()
  for (const f of fees ?? []) feeByTenant.set(f.tenant_id, f)

  return NextResponse.json({
    signups: (tenants ?? []).map((t) => ({
      ...t,
      cabins: cabinsByTenant.get(t.id) ?? [],
      setup_fee: feeByTenant.get(t.id) ?? null,
    })),
  })
}

// POST — aprueba una solicitud: publica el tenant y le entrega su acceso.
// Rechazar NO vive aquí a propósito: para descartar una solicitud se usa el
// borrado de tenant del panel admin, que ya limpia todo en cascada.
export async function POST(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const supabase = getSupabaseAdmin()

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 })
  }

  const tenant_id = String(body.tenant_id ?? "")
  if (!tenant_id) return NextResponse.json({ error: "tenant_id requerido" }, { status: 400 })

  const { data: tenant } = await supabase
    .from("tenants")
    .select("id, business_name, owner_name, email_owner, slug, dashboard_token, active")
    .eq("id", tenant_id)
    .maybeSingle()

  if (!tenant) return NextResponse.json({ error: "Solicitud no encontrada" }, { status: 404 })
  if (tenant.active) return NextResponse.json({ error: "Este cliente ya está activo." }, { status: 400 })

  const nowIso = new Date().toISOString()

  const { error: upErr } = await supabase
    .from("tenants")
    .update({ active: true, billing_status: "active" })
    .eq("id", tenant_id)
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 })

  await supabase
    .from("subscriptions")
    .update({ status: "active", updated_at: nowIso })
    .eq("tenant_id", tenant_id)

  await logAudit({
    tenant_id,
    action: "signup_approved",
    entity_type: "tenant",
    entity_id: tenant_id,
    details: { slug: tenant.slug },
    performed_by: "admin_panel",
  })

  // Email de bienvenida con su acceso al panel.
  if (tenant.email_owner && tenant.dashboard_token) {
    const panelUrl = `${APP_BASE}/?token=${tenant.dashboard_token}`
    const landingUrl = `${process.env.NEXT_PUBLIC_RESERVAS_URL ?? "https://reservas.takai.cl"}/${tenant.slug}`
    const firstName = esc((tenant.owner_name ?? "").split(" ")[0] || "Hola")
    getResend().emails.send({
      from: "Takai <hola@takai.cl>",
      to: tenant.email_owner,
      subject: `Tu sistema Takai ya está activo — ${tenant.business_name}`,
      html:
        `<div style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#1c1b19;">` +
        `<h2 style="font-family:Georgia,serif;font-weight:400;">Bienvenido, ${firstName}</h2>` +
        `<p style="line-height:1.7;">Tu sistema de reservas para <strong>${esc(tenant.business_name)}</strong> ya está activo.</p>` +
        `<p style="line-height:1.7;">Tu página pública, donde los turistas reservan:<br>` +
        `<a href="${esc(landingUrl)}" style="color:#1a5c2e;">${esc(landingUrl)}</a></p>` +
        `<p style="line-height:1.7;">Tu panel privado, donde ves y gestionas tus reservas:<br>` +
        `<a href="${esc(panelUrl)}" style="color:#1a5c2e;">Entrar a mi panel</a><br>` +
        `<span style="font-size:12px;color:#8a857c;">Guarda este enlace: es tu llave de acceso, no la compartas.</span></p>` +
        `<p style="line-height:1.7;">Desde el panel puedes subir las fotos de tus cabañas, ajustar precios por temporada ` +
        `y bloquear fechas. Mientras más completa esté tu ficha, antes aparece en el directorio de Takai.</p>` +
        `<p style="line-height:1.7;font-size:13px;color:#8a857c;">Recuerda: no tienes mensualidad. Solo pagas el 10% ` +
        `de las reservas que Takai te genere; las que consigas por tu cuenta son 100% tuyas.</p>` +
        `</div>`,
    }).catch(() => {})
  }

  return NextResponse.json({ success: true, slug: tenant.slug })
}
