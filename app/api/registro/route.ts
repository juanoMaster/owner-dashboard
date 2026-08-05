export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { SupabaseClient } from "@supabase/supabase-js"
import { getSupabaseAdmin } from "@/lib/supabase-server"
import { sendAlertEmail } from "@/lib/alertEmail"
import { logAudit } from "@/lib/audit"
import { SETUP_FEE_CLP, SETUP_FEE_KIND, SIGNUP_PENDING_STATUS, slugifyBusiness, isValidEmail } from "@/lib/signup"
import crypto from "crypto"

// Endpoint PÚBLICO — cualquiera puede llamarlo. Todo lo que crea nace con
// active=false, así que nada llega a los turistas hasta que un admin apruebe.

const MAX_CABINS = 12
const APP_BASE = process.env.NEXT_PUBLIC_APP_URL ?? "https://owner-dashboard-navy.vercel.app"

async function ensureUniqueSlug(supabase: SupabaseClient, base: string): Promise<string> {
  let slug = base
  let n = 0
  for (;;) {
    const { data } = await supabase.from("tenants").select("id").eq("slug", slug).maybeSingle()
    if (!data) return slug
    n += 1
    slug = `${base}-${n}`
  }
}

async function rollback(supabase: SupabaseClient, tenantId: string) {
  await supabase.from("commission_statements").delete().eq("tenant_id", tenantId)
  await supabase.from("subscriptions").delete().eq("tenant_id", tenantId)
  await supabase.from("dashboard_links").delete().eq("tenant_id", tenantId)
  await supabase.from("cabins").delete().eq("tenant_id", tenantId)
  await supabase.from("tenants").delete().eq("id", tenantId)
}

export async function POST(req: Request) {
  const supabase = getSupabaseAdmin()

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Datos inválidos." }, { status: 400 })
  }

  // ── Datos del negocio ──────────────────────────────────────────────────
  const business_name = String(body.business_name ?? "").trim()
  const owner_name = String(body.owner_name ?? "").trim()
  const email_owner = String(body.email_owner ?? "").trim().toLowerCase()
  const owner_whatsapp = String(body.owner_whatsapp ?? "").trim()
  const location_text = String(body.location_text ?? "").trim()
  const tagline = String(body.tagline ?? "").trim()
  const template = ["clasico", "moderno", "rural", "premium", "boutique"].includes(String(body.template))
    ? String(body.template)
    : "clasico"
  const latRaw = body.latitude != null && body.latitude !== "" ? Number(body.latitude) : null
  const lngRaw = body.longitude != null && body.longitude !== "" ? Number(body.longitude) : null
  const latitude = latRaw != null && Number.isFinite(latRaw) && Math.abs(latRaw) <= 90 ? latRaw : null
  const longitude = lngRaw != null && Number.isFinite(lngRaw) && Math.abs(lngRaw) <= 180 ? lngRaw : null

  // ── Datos bancarios (donde el turista le transfiere a él) ──────────────
  const bank_name = String(body.bank_name ?? "").trim()
  const bank_account_type = String(body.bank_account_type ?? "").trim()
  const bank_account_number = String(body.bank_account_number ?? "").trim()
  const bank_account_holder = String(body.bank_account_holder ?? "").trim()
  const bank_rut = String(body.bank_rut ?? "").trim()

  const pay_method = body.pay_method === "transfer" ? "transfer" : "card"

  // ── Referido: quién trajo este alojamiento (?ref= del influencer/partner) ──
  // Se resuelve contra la tabla de afiliados; si el código no existe o está
  // inactivo, el registro sigue igual pero sin atribuir a nadie.
  let referredByAffiliateId: string | null = null
  const refCode = typeof body.ref === "string" ? body.ref.trim().toLowerCase().slice(0, 32) : ""
  if (refCode && /^[a-z0-9_-]+$/.test(refCode)) {
    const { data: aff } = await supabase
      .from("affiliates").select("id").eq("code", refCode).eq("active", true).maybeSingle()
    if (aff) referredByAffiliateId = aff.id
  }

  // ── Validación ─────────────────────────────────────────────────────────
  if (business_name.length < 2) {
    return NextResponse.json({ error: "Escribe el nombre de tu negocio." }, { status: 400 })
  }
  if (owner_name.length < 2) {
    return NextResponse.json({ error: "Escribe tu nombre." }, { status: 400 })
  }
  if (!isValidEmail(email_owner)) {
    return NextResponse.json({ error: "Revisa tu correo: no parece válido." }, { status: 400 })
  }
  if (owner_whatsapp.replace(/\D/g, "").length < 8) {
    return NextResponse.json({ error: "Escribe tu WhatsApp con código de país." }, { status: 400 })
  }
  if (location_text.length < 3) {
    return NextResponse.json({ error: "Indica dónde están tus cabañas." }, { status: 400 })
  }
  if (!bank_name || !bank_account_type || !bank_account_number || !bank_rut) {
    return NextResponse.json({ error: "Faltan datos de tu cuenta bancaria: sin ellos el turista no puede pagarte." }, { status: 400 })
  }

  const cabinsIn = Array.isArray(body.cabins) ? body.cabins : []
  type CabinParsed = { name: string; capacity: number; base_price_night: number; description: string | null }
  const cabinsParsed: CabinParsed[] = []
  for (const c of cabinsIn.slice(0, MAX_CABINS)) {
    if (!c || typeof c !== "object") continue
    const row = c as Record<string, unknown>
    const name = String(row.name ?? "").trim()
    const capacity = parseInt(String(row.capacity ?? "0"), 10)
    const base_price_night = Number(row.base_price_night)
    const description = row.description ? String(row.description).trim() || null : null
    if (name.length < 1) {
      return NextResponse.json({ error: "Cada cabaña necesita un nombre." }, { status: 400 })
    }
    if (!Number.isFinite(capacity) || capacity < 1) {
      return NextResponse.json({ error: "La capacidad de cada cabaña debe ser al menos 1 persona." }, { status: 400 })
    }
    if (!Number.isFinite(base_price_night) || base_price_night <= 0) {
      return NextResponse.json({ error: "Cada cabaña necesita un precio por noche válido." }, { status: 400 })
    }
    cabinsParsed.push({ name, capacity, base_price_night, description })
  }
  if (cabinsParsed.length < 1) {
    return NextResponse.json({ error: "Agrega al menos una cabaña." }, { status: 400 })
  }

  // ── Anti-abuso: una solicitud pendiente por correo cada 30 minutos ──────
  const halfHourAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString()
  const { data: reciente } = await supabase
    .from("tenants")
    .select("id, created_at")
    .eq("email_owner", email_owner)
    .eq("active", false)
    .gte("created_at", halfHourAgo)
    .maybeSingle()
  if (reciente) {
    return NextResponse.json(
      { error: "Ya recibimos una solicitud con este correo hace unos minutos. Te estamos contactando — si necesitas corregir algo, escríbenos." },
      { status: 429 }
    )
  }

  // ── Crear tenant (inactivo hasta la aprobación) ────────────────────────
  const slug = await ensureUniqueSlug(supabase, slugifyBusiness(business_name))
  const rawToken = crypto.randomBytes(24).toString("hex")
  const tokenHash = crypto.createHash("sha256").update(rawToken, "utf8").digest("hex")

  const { data: tenant, error: tenantErr } = await supabase
    .from("tenants")
    .insert([{
      business_name,
      owner_name,
      email_owner,
      owner_whatsapp,
      slug,
      location_text,
      tagline: tagline || null,
      latitude,
      longitude,
      template,
      bank_name,
      bank_account_type,
      bank_account_number,
      bank_account_holder: bank_account_holder || owner_name,
      bank_rut,
      currency: "CLP",
      country: "CL",
      deposit_percent: 20,
      min_nights: 1,
      whatsapp_enabled: true,
      manual_billing: false,
      billing_status: SIGNUP_PENDING_STATUS,
      active: false,
      verified: false,
      referred_by_affiliate_id: referredByAffiliateId,
    }])
    .select("id")
    .single()

  if (tenantErr || !tenant) {
    return NextResponse.json({ error: "No pudimos guardar tu registro. Intenta nuevamente." }, { status: 500 })
  }
  const tenantId = tenant.id as string

  // ── Cabañas ────────────────────────────────────────────────────────────
  const { error: cabinsErr } = await supabase.from("cabins").insert(
    cabinsParsed.map((c) => ({
      tenant_id: tenantId,
      name: c.name,
      capacity: c.capacity,
      base_price_night: c.base_price_night,
      description: c.description,
      extra_person_price: 0,
      cleaning_fee: 0,
      extras: [],
      pricing_tiers: [],
      season_prices: [],
      active: true,
    }))
  )
  if (cabinsErr) {
    await rollback(supabase, tenantId)
    return NextResponse.json({ error: "No pudimos guardar tus cabañas. Intenta nuevamente." }, { status: 500 })
  }

  // ── Acceso al panel (se le entrega recién al aprobar) ──────────────────
  const { error: linkErr } = await supabase
    .from("dashboard_links")
    .insert([{ tenant_id: tenantId, token_hash: tokenHash, active: true }])
  if (linkErr) {
    await rollback(supabase, tenantId)
    return NextResponse.json({ error: "No pudimos crear tu acceso. Intenta nuevamente." }, { status: 500 })
  }
  await supabase.from("tenants").update({ dashboard_token: rawToken }).eq("id", tenantId)

  // ── Suscripción en el modelo vigente: sin mensualidad, 10% Takai ───────
  const { error: subErr } = await supabase.from("subscriptions").insert([{
    tenant_id: tenantId,
    billing_mode: "subscription",
    plan: "sin-mensualidad",
    amount: 0,
    commission_rate: 10,
    status: SIGNUP_PENDING_STATUS,
    trial_ends_at: null,
    currency: "CLP",
  }])
  if (subErr) {
    await rollback(supabase, tenantId)
    return NextResponse.json({ error: "No pudimos preparar tu cuenta. Intenta nuevamente." }, { status: 500 })
  }

  // ── Cobro de la cuota de entrada ───────────────────────────────────────
  const now = new Date()
  const { data: stmt, error: stmtErr } = await supabase
    .from("commission_statements")
    .insert([{
      tenant_id: tenantId,
      period_year: now.getFullYear(),
      period_month: now.getMonth() + 1,
      kind: SETUP_FEE_KIND,
      bookings_count: 0,
      bookings_total: 0,
      currency: "CLP",
      commission_amount: SETUP_FEE_CLP,
      commission_rate: 0,
      status: "pending",
    }])
    .select("id")
    .single()

  if (stmtErr || !stmt) {
    await rollback(supabase, tenantId)
    return NextResponse.json({ error: "No pudimos generar tu cobro de incorporación." }, { status: 500 })
  }

  await logAudit({
    tenant_id: tenantId,
    action: "signup_submitted",
    entity_type: "tenant",
    entity_id: tenantId,
    details: { slug, business_name, cabins: cabinsParsed.length, pay_method },
    performed_by: "registro_publico",
  })

  // ── Pago con tarjeta: preferencia de MercadoPago ───────────────────────
  let init_point: string | null = null
  const mpToken = process.env.MP_PLATFORM_ACCESS_TOKEN
  if (pay_method === "card" && mpToken) {
    try {
      const backUrl = `${APP_BASE}/registro/listo?slug=${encodeURIComponent(slug)}`
      const mpRes = await fetch("https://api.mercadopago.com/checkout/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${mpToken}` },
        body: JSON.stringify({
          items: [{
            id: stmt.id,
            title: `Incorporación a Takai — ${business_name}`,
            quantity: 1,
            unit_price: SETUP_FEE_CLP,
            currency_id: "CLP",
          }],
          payer: { email: email_owner },
          external_reference: `setup:${stmt.id}`,
          back_urls: { success: backUrl, failure: backUrl, pending: backUrl },
          auto_return: "approved",
        }),
      })
      if (mpRes.ok) {
        const mpData = await mpRes.json()
        init_point = mpData.init_point ?? null
        if (mpData.id) {
          await supabase.from("commission_statements")
            .update({ mp_preference_id: mpData.id, updated_at: new Date().toISOString() })
            .eq("id", stmt.id).eq("tenant_id", tenantId)
        }
      }
    } catch {
      // Si MP falla, el registro igual queda guardado y se coordina el pago a mano.
    }
  }

  sendAlertEmail(
    `Nueva solicitud de alta: ${business_name}`,
    `Un propietario se registró desde /registro y está esperando aprobación.\n\n` +
      `Negocio: ${business_name}\nDueño: ${owner_name}\nCorreo: ${email_owner}\n` +
      `WhatsApp: ${owner_whatsapp}\nUbicación: ${location_text}\n` +
      `Cabañas: ${cabinsParsed.length}\nSlug asignado: ${slug}\n` +
      `Cuota de entrada: ${pay_method === "card" ? "va a pagar con tarjeta" : "pidió coordinar transferencia"}\n\n` +
      `Revisa los datos (que el alojamiento sea suyo, fotos y cuenta bancaria correctas) ` +
      `y apruébalo en ${APP_BASE}/admin → pestaña Altas.`
  ).catch(() => {})

  return NextResponse.json({
    success: true,
    slug,
    statement_id: stmt.id,
    setup_fee: SETUP_FEE_CLP,
    init_point,
    pay_method,
  })
}
