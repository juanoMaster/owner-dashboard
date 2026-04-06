export const dynamic = 'force-dynamic'

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
      .select("id, tenant_id")
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

    supabaseAdmin
      .from("dashboard_links")
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", link.id)
      .then(() => {})

    const [tenantRes, cabinsRes, bookingsRes] = await Promise.all([
      supabaseAdmin
        .from("tenants")
        .select("owner_name, business_name")
        .eq("id", tenantId)
        .maybeSingle(),
      supabaseAdmin
        .from("cabins")
        .select("id, name, capacity, base_price_night")
        .eq("tenant_id", tenantId)
        .eq("active", true),
      supabaseAdmin
        .from("bookings")
        .select(
          "id, cabin_id, check_in, check_out, nights, total_amount, deposit_amount, balance_amount, notes, status, guest_name, guest_email, guest_phone, booking_code, created_at"
        )
        .eq("tenant_id", tenantId)
        .eq("status", "draft")
        .is("deleted_at", null)
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

    const bookings = bookingsRes.data ?? []
    console.log("[/api/dashboard] tenant_id:", tenantId, "| total bookings:", bookings.length, "| ids:", bookings.map(b => b.id))

    return NextResponse.json({
      tenant_id: tenantId,
      tenant: tenantRes.data ?? null,
      cabins: cabinsRes.data ?? [],
      bookings,
    }, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        "CDN-Cache-Control": "no-store",
        "Vercel-CDN-Cache-Control": "no-store",
      },
    })
  } catch {
    return NextResponse.json({ error: "Server crash" }, { status: 500 })
  }
}

