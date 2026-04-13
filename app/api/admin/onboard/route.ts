export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { createClient, SupabaseClient } from "@supabase/supabase-js"
import crypto from "crypto"

const fetchNoStore = (url: RequestInfo | URL, options: RequestInit = {}) =>
  fetch(url, { ...options, cache: "no-store" })

function slugify(input: string): string {
  const s = input
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
  return s || "cabana"
}

function normalizeTime(t: string | undefined): string | null {
  if (!t || typeof t !== "string") return null
  const m = t.trim().match(/^(\d{1,2}):(\d{2})$/)
  if (!m) return null
  const h = Math.min(23, Math.max(0, parseInt(m[1], 10)))
  const min = Math.min(59, Math.max(0, parseInt(m[2], 10)))
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}:00`
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

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { global: { fetch: fetchNoStore } }
  )

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 })
  }

  const business_name = String(body.business_name ?? "").trim()
  const email_owner = String(body.email_owner ?? "").trim()
  const owner_whatsapp = body.owner_whatsapp != null ? String(body.owner_whatsapp).trim() : ""
  const gender = body.gender === "male" || body.gender === "female" ? body.gender : null
  const has_tinaja = Boolean(body.has_tinaja)
  const accepts_pets = Boolean(body.accepts_pets)
  const check_in_time = normalizeTime(String(body.check_in_time ?? "14:00")) || "14:00:00"
  const check_out_time = normalizeTime(String(body.check_out_time ?? "12:00")) || "12:00:00"
  const min_nights = Math.max(1, Math.min(365, parseInt(String(body.min_nights ?? "2"), 10) || 2))
  const advance_percentage = Math.min(100, Math.max(0, Number(body.advance_percentage) || 20))
  const bank_name = String(body.bank_name ?? "").trim()
  const bank_account_type = String(body.bank_account_type ?? "").trim()
  const bank_account_number = String(body.bank_account_number ?? "").trim()
  const bank_rut = String(body.bank_rut ?? "").trim()
  const instagram_url = body.instagram_url != null ? String(body.instagram_url).trim() : ""
  const facebook_url = body.facebook_url != null ? String(body.facebook_url).trim() : ""

  const cabinsIn = Array.isArray(body.cabins) ? body.cabins : []

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

  const cabinsParsed: Array<{ name: string; base_price_night: number; capacity: number }> = []
  for (const c of cabinsIn) {
    if (!c || typeof c !== "object") continue
    const row = c as Record<string, unknown>
    const name = String(row.name ?? "").trim()
    const base_price_night = Number(row.base_price_night)
    const capacity = parseInt(String(row.capacity ?? "0"), 10)
    if (name.length < 1) {
      return NextResponse.json({ error: "Cada cabaña debe tener un nombre." }, { status: 400 })
    }
    if (!Number.isFinite(base_price_night) || base_price_night < 0) {
      return NextResponse.json({ error: "Precio por noche inválido en cabañas." }, { status: 400 })
    }
    if (!Number.isFinite(capacity) || capacity < 1) {
      return NextResponse.json({ error: "La capacidad debe ser al menos 1 persona por cabaña." }, { status: 400 })
    }
    cabinsParsed.push({ name, base_price_night, capacity })
  }

  if (cabinsParsed.length < 1) {
    return NextResponse.json({ error: "Debes agregar al menos una cabaña." }, { status: 400 })
  }

  const owner_name = email_owner.split("@")[0] || "Cliente"

  const baseSlug = slugify(business_name)
  const slug = await ensureUniqueSlug(supabase, baseSlug)

  const rawToken = crypto.randomBytes(24).toString("hex")
  const tokenHash = crypto.createHash("sha256").update(rawToken, "utf8").digest("hex")

  const tenantInsertFull: Record<string, unknown> = {
    business_name,
    owner_name,
    owner_whatsapp: owner_whatsapp || null,
    email_owner,
    slug,
    gender,
    has_tinaja,
    accepts_pets,
    check_in_time,
    check_out_time,
    min_nights,
    deposit_percent: advance_percentage,
    instagram_url: instagram_url || null,
    facebook_url: facebook_url || null,
    bank_name,
    bank_account_type,
    bank_account_number,
    bank_rut,
    bank_account_holder: null,
    active: true,
  }

  let tenantRes = await supabase.from("tenants").insert([tenantInsertFull]).select().single()
  if (tenantRes.error && /column|schema|does not exist/i.test(tenantRes.error.message || "")) {
    const tenantInsertCompat: Record<string, unknown> = {
      business_name,
      owner_name,
      owner_whatsapp: owner_whatsapp || null,
      email_owner,
      slug,
      gender,
      has_tinaja,
      deposit_percent: advance_percentage,
      instagram_url: instagram_url || null,
      facebook_url: facebook_url || null,
      bank_name,
      bank_account_type,
      bank_account_number,
      bank_rut,
      bank_account_holder: null,
      active: true,
    }
    tenantRes = await supabase.from("tenants").insert([tenantInsertCompat]).select().single()
  }

  const { data: tenant, error: tenantErr } = tenantRes

  if (tenantErr) {
    return NextResponse.json({ error: tenantErr.message || "Error al crear el cliente." }, { status: 500 })
  }

  const tenantId = tenant.id as string

  const cabinRows = cabinsParsed.map((c) => ({
    tenant_id: tenantId,
    name: c.name,
    base_price_night: c.base_price_night,
    capacity: c.capacity,
    cleaning_fee: 0,
    active: true,
  }))

  const { data: cabinsOut, error: cabinsErr } = await supabase.from("cabins").insert(cabinRows).select()

  if (cabinsErr) {
    await deleteTenantCascade(supabase, tenantId)
    return NextResponse.json({ error: cabinsErr.message || "Error al crear cabañas." }, { status: 500 })
  }

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

  const tenantWithToken = { ...tenant, dashboard_token: rawToken }

  return NextResponse.json({
    success: true,
    token: rawToken,
    slug,
    business_name,
    tenant: tenantWithToken,
    cabins: cabinsOut ?? [],
    dashboard_link: linkRow,
  })
}
