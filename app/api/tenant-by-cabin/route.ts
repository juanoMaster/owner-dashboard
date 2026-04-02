import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
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
    .select("business_name, owner_name, slug, owner_whatsapp")
    .eq("id", cabin.tenant_id)
    .single()

  if (!tenant) {
    return NextResponse.json({ error: "Tenant no encontrado" }, { status: 404 })
  }

  const TENANTS_WITHOUT_TINAJA = new Set([
    "db307f3e-fd56-49b3-b4c5-868c7607c31e", // Trinidad
  ])

  return NextResponse.json({
    tenant_id: cabin.tenant_id,
    business_name: tenant.business_name,
    owner_name: tenant.owner_name,
    slug: tenant.slug,
    owner_whatsapp: tenant.owner_whatsapp,
    has_tinaja: !TENANTS_WITHOUT_TINAJA.has(cabin.tenant_id),
  })
}