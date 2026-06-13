export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { getSupabaseAdmin, getSupabaseForTenant } from "@/lib/supabase-server"
import crypto from "crypto"

const ALLOWED = ["bank_name", "bank_account_type", "bank_account_number", "bank_account_holder", "bank_rut", "bank_email"] as const

export async function PATCH(req: Request) {
  try {
    const body = await req.json()
    const { token, ...fields } = body

    if (!token) return NextResponse.json({ error: "Token requerido" }, { status: 400 })

    const supabaseAdmin = getSupabaseAdmin()
    const tokenHash = crypto.createHash("sha256").update(token, "utf8").digest("hex")
    const { data: link } = await supabaseAdmin
      .from("dashboard_links")
      .select("tenant_id")
      .eq("token_hash", tokenHash)
      .eq("active", true)
      .maybeSingle()

    if (!link) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const supabase = await getSupabaseForTenant(link.tenant_id)

    // Solo permitir campos bancarios
    const update: Record<string, string | null> = {}
    for (const key of ALLOWED) {
      if (key in fields) {
        update[key] = typeof fields[key] === "string" ? fields[key].trim() || null : null
      }
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: "Sin campos para actualizar" }, { status: 400 })
    }

    const { error } = await supabase
      .from("tenants")
      .update(update)
      .eq("id", link.tenant_id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
