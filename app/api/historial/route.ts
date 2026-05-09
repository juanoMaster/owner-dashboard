export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import crypto from "crypto"

export async function GET(req: NextRequest) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { global: { fetch: (url, options = {}) => fetch(url, { ...options, cache: "no-store" }) } }
  )
  try {
    const { searchParams } = new URL(req.url)
    const token = searchParams.get("token")
    if (!token) {
      return NextResponse.json({ error: "Missing token" }, { status: 400 })
    }
    const tokenHash = crypto.createHash("sha256").update(token, "utf8").digest("hex")
    const { data: link, error: linkError } = await supabaseAdmin
      .from("dashboard_links")
      .select("tenant_id")
      .eq("token_hash", tokenHash)
      .eq("active", true)
      .maybeSingle()
    if (linkError) {
      return NextResponse.json({ error: "Database error" }, { status: 500 })
    }
    if (!link) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    const tenantId = link.tenant_id

    const [tenantRes, cabinsRes, bookingsRes] = await Promise.all([
      supabaseAdmin
        .from("tenants")
        .select("business_name, owner_name, currency")
        .eq("id", tenantId)
        .maybeSingle(),
      supabaseAdmin.from("cabins").select("id, name").eq("tenant_id", tenantId),
      supabaseAdmin
        .from("bookings")
        .select(
          "id, cabin_id, check_in, check_out, nights, guests, total_amount, deposit_amount, balance_amount, status, notes, created_at, deleted_at, deleted_by"
        )
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false }),
    ])

    if (tenantRes.error) {
      return NextResponse.json({ error: "Error loading tenant" }, { status: 500 })
    }
    if (cabinsRes.error) {
      return NextResponse.json({ error: "Error loading cabins" }, { status: 500 })
    }
    if (bookingsRes.error) {
      return NextResponse.json({ error: "Error loading bookings" }, { status: 500 })
    }

    return NextResponse.json({
      tenant: tenantRes.data ?? null,
      cabins: cabinsRes.data ?? [],
      bookings: bookingsRes.data ?? [],
    })
  } catch {
    return NextResponse.json({ error: "Server crash" }, { status: 500 })
  }
}
