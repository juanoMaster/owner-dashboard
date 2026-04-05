import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
export async function POST(req: Request) {
  const adminToken = process.env.ADMIN_TOKEN
  const h = req.headers.get("x-admin-token")
  if (!adminToken || h !== adminToken) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
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
      }).eq("id", id).select().single()
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ success: true, tenant: data })
    }
    if (action === "toggle") {
      const { data, error } = await supabase.from("tenants").update({ active: body.active }).eq("id", id).select().single()
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ success: true, tenant: data })
    }
    return NextResponse.json({ error: "Accion desconocida" }, { status: 400 })
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }) }
}
