export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { SupabaseClient } from "@supabase/supabase-js"
import { getSupabaseAdmin } from "@/lib/supabase-server"
import crypto from "crypto"

function slugify(input: string): string {
  const s = input
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
  return s || "cabana"
}

function isValidEmail(s: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim())
}

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

async function deleteTenantCascade(supabase: SupabaseClient, tenantId: string) {
  await supabase.from("dashboard_links").delete().eq("tenant_id", tenantId)
  await supabase.from("cabins").delete().eq("tenant_id", tenantId)
  await supabase.from("tenants").delete().eq("id", tenantId)
}

export async function POST(req: Request) {
  const adminToken = process.env.ADMIN_TOKEN
  const h = req.headers.get("x-admin-token")
  if (!adminToken || h !== adminToken) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const supabase = getSupabaseAdmin()

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 })
  }

  // ── Tenant fields ────────────────────────────────────────────────────────────
  const business_name = String(body.business_name ?? "").trim()
  const email_owner = String(body.email_owner ?? "").trim()
  const owner_name = String(body.owner_name ?? "").trim() || email_owner.split("@")[0] || "Cliente"
  const owner_whatsapp = body.owner_whatsapp != null ? String(body.owner_whatsapp).trim() : ""
  const gender = body.gender === "male" || body.gender === "female" ? body.gender : null
  const email_owner_2 = body.email_owner_2 != null ? String(body.email_owner_2).trim() : ""
  const country = String(body.country ?? "CL").trim()
  const currency = String(body.currency ?? "CLP").trim()
  const deposit_percent = Math.min(100, Math.max(0, Number(body.deposit_percent ?? body.advance_percentage) || 20))
  const min_nights = Math.max(1, Math.min(365, parseInt(String(body.min_nights ?? "2"), 10) || 2))
  const has_tinaja = Boolean(body.has_tinaja)
  const tinaja_price = body.tinaja_price != null ? Number(body.tinaja_price) : null
  const whatsapp_enabled = body.whatsapp_enabled !== false
  const bank_name = String(body.bank_name ?? "").trim()
  const bank_account_type = String(body.bank_account_type ?? "").trim()
  const bank_account_number = String(body.bank_account_number ?? "").trim()
  const bank_account_holder = body.bank_account_holder != null ? String(body.bank_account_holder).trim() : ""
  const bank_rut = String(body.bank_rut ?? "").trim()
  const tagline = body.tagline != null ? String(body.tagline).trim() : ""
  const location_text = body.location_text != null ? String(body.location_text).trim() : ""
  const location_maps_url = body.location_maps_url != null ? String(body.location_maps_url).trim() : ""
  const instagram_url = body.instagram_url != null ? String(body.instagram_url).trim() : ""
  const facebook_url = body.facebook_url != null ? String(body.facebook_url).trim() : ""
  const latitude = body.latitude != null && body.latitude !== "" ? Number(body.latitude) : null
  const longitude = body.longitude != null && body.longitude !== "" ? Number(body.longitude) : null
  const extra_services = Array.isArray(body.extra_services) ? body.extra_services : []
  const activities = Array.isArray(body.activities) ? body.activities : []
  const page_rules = Array.isArray(body.page_rules) ? body.page_rules : []
  const gp = (body.guidebook_patch && typeof body.guidebook_patch === "object" && !Array.isArray(body.guidebook_patch))
    ? body.guidebook_patch as Record<string, unknown>
    : {}
  const initialGuidebook = Object.fromEntries(Object.entries(gp).filter(([, v]) => v != null && v !== ""))

  // ── Validation ───────────────────────────────────────────────────────────────
  if (business_name.length < 2) {
    return NextResponse.json({ error: "El nombre del negocio es obligatorio (mín. 2 caracteres)." }, { status: 400 })
  }
  if (!isValidEmail(email_owner)) {
    return NextResponse.json({ error: "Email del dueño no válido." }, { status: 400 })
  }
  if (!gender) {
    return NextResponse.json({ error: "Selecciona el género del dueño." }, { status: 400 })
  }
  if (!bank_name || !bank_account_type || !bank_account_number || !bank_rut) {
    return NextResponse.json({ error: "Completa todos los datos bancarios obligatorios." }, { status: 400 })
  }

  // ── Cabin parsing ────────────────────────────────────────────────────────────
  type CabinParsed = {
    name: string; base_price_night: number; capacity: number
    has_tinaja: boolean; tinaja_price: number; extra_person_price: number
    cleaning_fee: number; description: string | null; amenities: string | null
    extras: unknown[]; pricing_tiers: unknown[]; season_prices: unknown[]
  }
  const cabinsIn = Array.isArray(body.cabins) ? body.cabins : []
  const cabinsParsed: CabinParsed[] = []

  for (const c of cabinsIn) {
    if (!c || typeof c !== "object") continue
    const row = c as Record<string, unknown>
    const name = String(row.name ?? "").trim()
    const base_price_night = Number(row.base_price_night)
    const capacity = parseInt(String(row.capacity ?? "0"), 10)
    const c_has_tinaja = Boolean(row.has_tinaja)
    const c_tinaja_price = Number(row.tinaja_price) || 0
    const extra_person_price = Number(row.extra_person_price) || 0
    const cleaning_fee = Number(row.cleaning_fee) || 0
    const description = row.description ? String(row.description).trim() || null : null
    const amenities = row.amenities ? String(row.amenities).trim() || null : null
    const extras = Array.isArray(row.extras) ? row.extras : []
    const pricing_tiers = Array.isArray(row.pricing_tiers) ? row.pricing_tiers : []
    const season_prices = Array.isArray(row.season_prices) ? row.season_prices : []

    if (name.length < 1) {
      return NextResponse.json({ error: "Cada cabaña debe tener un nombre." }, { status: 400 })
    }
    if (!Number.isFinite(base_price_night) || base_price_night < 0) {
      return NextResponse.json({ error: "Precio por noche inválido en cabañas." }, { status: 400 })
    }
    if (!Number.isFinite(capacity) || capacity < 1) {
      return NextResponse.json({ error: "La capacidad debe ser al menos 1 persona por cabaña." }, { status: 400 })
    }
    cabinsParsed.push({ name, base_price_night, capacity, has_tinaja: c_has_tinaja, tinaja_price: c_tinaja_price, extra_person_price, cleaning_fee, description, amenities, extras, pricing_tiers, season_prices })
  }

  if (cabinsParsed.length < 1) {
    return NextResponse.json({ error: "Debes agregar al menos una cabaña." }, { status: 400 })
  }

  // ── Create tenant ────────────────────────────────────────────────────────────
  const baseSlug = slugify(business_name)
  const slug = await ensureUniqueSlug(supabase, baseSlug)
  const rawToken = crypto.randomBytes(24).toString("hex")
  const tokenHash = crypto.createHash("sha256").update(rawToken, "utf8").digest("hex")

  const tenantInsert: Record<string, unknown> = {
    business_name,
    owner_name,
    owner_whatsapp: owner_whatsapp || null,
    email_owner,
    email_owner_2: email_owner_2 || null,
    slug,
    gender,
    has_tinaja,
    tinaja_price: tinaja_price !== null && !isNaN(tinaja_price as number) ? tinaja_price : null,
    min_nights,
    deposit_percent,
    whatsapp_enabled,
    country,
    currency,
    tagline: tagline || null,
    location_text: location_text || null,
    location_maps_url: location_maps_url || null,
    instagram_url: instagram_url || null,
    facebook_url: facebook_url || null,
    latitude: latitude !== null && !isNaN(latitude as number) ? latitude : null,
    longitude: longitude !== null && !isNaN(longitude as number) ? longitude : null,
    extra_services,
    activities,
    page_rules,
    bank_name,
    bank_account_type,
    bank_account_number,
    bank_account_holder: bank_account_holder || null,
    bank_rut,
    guidebook: Object.keys(initialGuidebook).length > 0 ? initialGuidebook : null,
    active: true,
  }

  let tenantRes = await supabase.from("tenants").insert([tenantInsert]).select().single()
  if (tenantRes.error && /column|schema|does not exist/i.test(tenantRes.error.message || "")) {
    const tenantCompat: Record<string, unknown> = {
      business_name, owner_name, owner_whatsapp: owner_whatsapp || null, email_owner,
      slug, gender, has_tinaja, deposit_percent, instagram_url: instagram_url || null,
      facebook_url: facebook_url || null, bank_name, bank_account_type,
      bank_account_number, bank_rut, bank_account_holder: bank_account_holder || null,
      active: true,
    }
    tenantRes = await supabase.from("tenants").insert([tenantCompat]).select().single()
  }

  const { data: tenant, error: tenantErr } = tenantRes
  if (tenantErr) {
    return NextResponse.json({ error: tenantErr.message || "Error al crear el cliente." }, { status: 500 })
  }

  const tenantId = tenant.id as string

  // ── Create cabins ────────────────────────────────────────────────────────────
  const cabinRows = cabinsParsed.map(c => ({
    tenant_id: tenantId,
    name: c.name,
    base_price_night: c.base_price_night,
    capacity: c.capacity,
    has_tinaja: c.has_tinaja,
    tinaja_price: c.tinaja_price,
    extra_person_price: c.extra_person_price,
    cleaning_fee: c.cleaning_fee,
    description: c.description,
    amenities: c.amenities,
    extras: c.extras,
    pricing_tiers: c.pricing_tiers,
    season_prices: c.season_prices,
    active: true,
  }))

  const { data: cabinsOut, error: cabinsErr } = await supabase.from("cabins").insert(cabinRows).select()
  if (cabinsErr) {
    await deleteTenantCascade(supabase, tenantId)
    return NextResponse.json({ error: cabinsErr.message || "Error al crear cabañas." }, { status: 500 })
  }

  // ── Create dashboard link ────────────────────────────────────────────────────
  const { data: linkRow, error: linkErr } = await supabase
    .from("dashboard_links")
    .insert([{ tenant_id: tenantId, token_hash: tokenHash, active: true }])
    .select()
    .single()
  if (linkErr) {
    await deleteTenantCascade(supabase, tenantId)
    return NextResponse.json({ error: linkErr.message || "Error al crear el acceso al panel." }, { status: 500 })
  }

  const { error: tokErr } = await supabase.from("tenants").update({ dashboard_token: rawToken }).eq("id", tenantId)
  if (tokErr) {
    await deleteTenantCascade(supabase, tenantId)
    return NextResponse.json({ error: tokErr.message || "Error al guardar el token del panel." }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    token: rawToken,
    slug,
    business_name,
    tenant: { ...tenant, dashboard_token: rawToken },
    cabins: cabinsOut ?? [],
    dashboard_link: linkRow,
  })
}
