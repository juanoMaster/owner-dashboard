import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { global: { fetch: (url, options = {}) => fetch(url, { ...options, cache: "no-store" }) } }
  )

  const { searchParams } = new URL(req.url)
  const cabin_id = searchParams.get("cabin_id")

  if (!cabin_id) {
    return NextResponse.json({ error: "cabin_id requerido" }, { status: 400 })
  }

  const { data: cabin } = await supabase
    .from("cabins")
    .select("tenant_id, name")
    .eq("id", cabin_id)
    .single()

  if (!cabin) {
    return NextResponse.json({ error: "Cabana no encontrada" }, { status: 404 })
  }

  const { data: tenant } = await supabase
    .from("tenants")
    .select("business_name, owner_name, slug, owner_whatsapp, bank_name, bank_account_type, bank_account_number, bank_account_holder, bank_rut, has_tinaja, mp_enabled, mp_access_token, currency")
    .eq("id", cabin.tenant_id)
    .single()

  if (!tenant) {
    return NextResponse.json({ error: "Tenant no encontrado" }, { status: 404 })
  }

  return NextResponse.json({
    tenant_id: cabin.tenant_id,
    business_name: tenant.business_name,
    owner_name: tenant.owner_name,
    slug: tenant.slug,
    owner_whatsapp: tenant.owner_whatsapp,
    bank_name: tenant.bank_name || null,
    bank_account_type: tenant.bank_account_type || null,
    bank_account_number: tenant.bank_account_number || null,
    bank_account_holder: tenant.bank_account_holder || null,
    bank_rut: tenant.bank_rut || null,
    has_tinaja: tenant.has_tinaja ?? true,
    mp_enabled: !!(tenant.mp_enabled && tenant.mp_access_token),
    currency: tenant.currency || "CLP",
  })
}