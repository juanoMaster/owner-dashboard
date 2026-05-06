export const dynamic = "force-dynamic"
import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import crypto from "crypto"

const ALLOWED_FIELDS = ["description", "capacity", "cleaning_fee"] as const
type AllowedField = typeof ALLOWED_FIELDS[number]

export async function PATCH(req: Request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { global: { fetch: (url, options = {}) => fetch(url, { ...options, cache: "no-store" }) } }
  )
  try {
    const { token, cabin_id, field, value } = await req.json()
    if (!token || !cabin_id || !field || value === undefined) {
      return NextResponse.json({ error: "Faltan campos" }, { status: 400 })
    }
    if (!ALLOWED_FIELDS.includes(field as AllowedField)) {
      return NextResponse.json({ error: "Campo no permitido" }, { status: 400 })
    }

    const tokenHash = crypto.createHash("sha256").update(token, "utf8").digest("hex")
    const { data: link } = await supabase
      .from("dashboard_links")
      .select("tenant_id")
      .eq("token_hash", tokenHash)
      .eq("active", true)
      .maybeSingle()

    if (!link) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const { data: cabin } = await supabase
      .from("cabins")
      .select("id")
      .eq("id", cabin_id)
      .eq("tenant_id", link.tenant_id)
      .maybeSingle()

    if (!cabin) return NextResponse.json({ error: "Cabaña no encontrada" }, { status: 404 })

    let parsed: string | number = value
    if (field === "capacity") {
      parsed = parseInt(value)
      if (isNaN(parsed) || parsed < 1) return NextResponse.json({ error: "Capacidad inválida" }, { status: 400 })
    }
    if (field === "cleaning_fee") {
      parsed = Number(value)
      if (isNaN(parsed) || parsed < 0) return NextResponse.json({ error: "Tarifa inválida" }, { status: 400 })
    }

    const { error } = await supabase.from("cabins").update({ [field]: parsed }).eq("id", cabin_id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
