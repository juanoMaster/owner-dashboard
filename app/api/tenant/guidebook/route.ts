export const dynamic = "force-dynamic"
import { NextResponse } from "next/server"
import { getSupabaseAdmin, getSupabaseForTenant } from "@/lib/supabase-server"
import crypto from "crypto"

export async function PATCH(req: Request) {
  try {
    const body = await req.json()
    const { token, guidebook, google_review_url } = body
    if (!token) {
      return NextResponse.json({ error: "token requerido" }, { status: 400 })
    }

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

    const updatePayload: Record<string, any> = {}
    if (guidebook !== undefined) updatePayload.guidebook = guidebook
    if (google_review_url !== undefined) updatePayload.google_review_url = google_review_url

    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json({ error: "Nada que actualizar" }, { status: 400 })
    }

    const { error } = await supabase
      .from("tenants")
      .update(updatePayload)
      .eq("id", link.tenant_id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
