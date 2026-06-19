export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase-server"
import { clampAffiliateRate } from "@/lib/commission"
import crypto from "crypto"

// GET /api/affiliate/stats?token=... — el afiliado ve SUS reservas referidas y
// lo que ganó. Solo reservas con affiliate_id = este afiliado (no expone otros).
export async function GET(req: Request) {
  const url = new URL(req.url)
  const token = url.searchParams.get("token") || ""
  if (!token) return NextResponse.json({ error: "token requerido" }, { status: 400 })

  const tokenHash = crypto.createHash("sha256").update(token, "utf8").digest("hex")
  const supabase = getSupabaseAdmin()

  const { data: affiliate } = await supabase
    .from("affiliates")
    .select("id, code, name, commission_rate, active")
    .eq("token_hash", tokenHash)
    .maybeSingle()

  if (!affiliate) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  // Reservas atribuidas a este afiliado (confirmadas, no eliminadas)
  const { data: bookings } = await supabase
    .from("bookings")
    .select("booking_code, check_in, check_out, total_amount, status, created_at, cabins(name), tenants(business_name, currency)")
    .eq("affiliate_id", affiliate.id)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(500)

  // Tope defensivo: el afiliado nunca recibe más del 5% (sale del 10% de Takai).
  const rate = clampAffiliateRate(Number(affiliate.commission_rate) || 0)
  let confirmedTotal = 0
  let earned = 0
  const rows = (bookings || []).map((b) => {
    const amount = Number(b.total_amount) || 0
    const isConfirmed = b.status === "confirmed"
    const commission = isConfirmed ? Math.round(amount * (rate / 100) * 100) / 100 : 0
    if (isConfirmed) { confirmedTotal += amount; earned += commission }
    return {
      booking_code: b.booking_code,
      cabin: (b.cabins as any)?.name || "",
      business: (b.tenants as any)?.business_name || "",
      currency: (b.tenants as any)?.currency || "CLP",
      check_in: b.check_in,
      check_out: b.check_out,
      total_amount: amount,
      status: b.status,
      commission,
    }
  })

  return NextResponse.json({
    affiliate: { name: affiliate.name, code: affiliate.code, commission_rate: rate, active: affiliate.active },
    summary: {
      bookings_count: rows.length,
      confirmed_count: rows.filter((r) => r.status === "confirmed").length,
      confirmed_total: confirmedTotal,
      earned: Math.round(earned * 100) / 100,
    },
    bookings: rows,
  })
}
