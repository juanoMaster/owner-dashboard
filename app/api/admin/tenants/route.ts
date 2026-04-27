import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function PATCH(req: Request) {
  const adminToken = process.env.ADMIN_TOKEN
  const h = req.headers.get("x-admin-token")
  if (!adminToken || h !== adminToken) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { global: { fetch: (url, options = {}) => fetch(url, { ...options, cache: "no-store" }) } })
  try {
    const body = await req.json()
    const { id, mp_access_token, mp_enabled } = body
    if (!id) return NextResponse.json({ error: "Falta el id" }, { status: 400 })
    const update: Record<string, any> = {}
    if (mp_access_token !== undefined) update.mp_access_token = mp_access_token
    if (mp_enabled !== undefined) update.mp_enabled = mp_enabled
    if (Object.keys(update).length === 0) return NextResponse.json({ error: "Sin campos para actualizar" }, { status: 400 })
    const { data, error } = await supabase.from("tenants").update(update).eq("id", id).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, tenant: data })
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }) }
}

export async function POST(req: Request) {
  const adminToken = process.env.ADMIN_TOKEN
  const h = req.headers.get("x-admin-token")
  if (!adminToken || h !== adminToken) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { global: { fetch: (url, options = {}) => fetch(url, { ...options, cache: "no-store" }) } })
  const body = await req.json()
  const { action, id } = body
  try {
    if (action === "create") {
      const slug = body.slug ||
        (body.business_name as string)?.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") ||
        null
      const { data, error } = await supabase.from("tenants").insert([{
        business_name: body.business_name,
        owner_name: body.owner_name,
        owner_whatsapp: body.owner_whatsapp || null,
        email_owner: body.email_owner || null,
        slug,
        deposit_percent: Number(body.deposit_percent) || 20,
        gender: body.gender || "female",
        bank_name: body.bank_name || null,
        bank_account_type: body.bank_account_type || null,
        bank_account_number: body.bank_account_number || null,
        bank_account_holder: body.bank_account_holder || null,
        bank_rut: body.bank_rut || null,
        has_tinaja: body.has_tinaja ?? true,
        country: body.country || "CL",
        currency: body.currency || "CLP",
        active: true,
      }]).select().single()
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ success: true, tenant: data })
    }
    if (action === "update") {
      const { data, error } = await supabase.from("tenants").update({
        business_name: body.business_name,
        owner_name: body.owner_name,
        owner_whatsapp: body.owner_whatsapp || null,
        email_owner: body.email_owner || null,
        deposit_percent: Number(body.deposit_percent) || 20,
        gender: body.gender || "female",
        bank_name: body.bank_name || null,
        bank_account_type: body.bank_account_type || null,
        bank_account_number: body.bank_account_number || null,
        bank_account_holder: body.bank_account_holder || null,
        bank_rut: body.bank_rut || null,
        has_tinaja: body.has_tinaja ?? true,
        country: body.country || "CL",
        currency: body.currency || "CLP",
      }).eq("id", id).select().single()
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ success: true, tenant: data })
    }
    if (action === "toggle") {
      const { data, error } = await supabase.from("tenants").update({ active: body.active }).eq("id", id).select().single()
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ success: true, tenant: data })
    }
    if (action === "verify") {
      const { data, error } = await supabase.from("tenants").update({ verified: body.verified }).eq("id", id).select().single()
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ success: true, tenant: data })
    }
    if (action === "delete") {
      await supabase.from("dashboard_links").delete().eq("tenant_id", id)
      await supabase.from("calendar_blocks").delete().eq("tenant_id", id)
      await supabase.from("bookings").delete().eq("tenant_id", id)
      await supabase.from("cabins").delete().eq("tenant_id", id)
      const { error } = await supabase.from("tenants").delete().eq("id", id)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ success: true })
    }
    return NextResponse.json({ error: "Accion desconocida" }, { status: 400 })
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }) }
}
