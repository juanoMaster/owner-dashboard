export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import crypto from "crypto"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const token = searchParams.get("token")
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 400 })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { global: { fetch: (url, options = {}) => fetch(url, { ...options, cache: "no-store" }) } }
  )

  const tokenHash = crypto.createHash("sha256").update(token, "utf8").digest("hex")
  const { data: link } = await supabase
    .from("dashboard_links")
    .select("tenant_id")
    .eq("token_hash", tokenHash)
    .eq("active", true)
    .maybeSingle()

  if (!link) return NextResponse.json({ error: "Invalid token" }, { status: 401 })

  const now = new Date()
  const from = new Date(now.getFullYear(), now.getMonth() - 11, 1)

  const { data: bookings, error } = await supabase
    .from("bookings")
    .select("check_in, total_amount, nights, created_at, cabin_id")
    .eq("tenant_id", link.tenant_id)
    .eq("status", "confirmed")
    .is("deleted_at", null)
    .gte("check_in", from.toISOString().split("T")[0])

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const MONTH_NAMES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]

  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1)
    return {
      label: MONTH_NAMES[d.getMonth()] + " " + String(d.getFullYear()).slice(2),
      month: d.getMonth(),
      year: d.getFullYear(),
      revenue: 0,
      nights: 0,
      bookings: 0,
    }
  })

  for (const b of bookings ?? []) {
    const checkIn = new Date(b.check_in + "T12:00:00")
    const slot = months.find(s => s.month === checkIn.getMonth() && s.year === checkIn.getFullYear())
    if (slot) {
      slot.revenue += Number(b.total_amount) || 0
      slot.nights += Number(b.nights) || 0
      slot.bookings += 1
    }
  }

  return NextResponse.json({ months })
}
