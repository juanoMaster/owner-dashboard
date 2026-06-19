export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase-server"

function authed(req: Request): boolean {
  const token = req.headers.get("x-admin-token")
  return !!process.env.ADMIN_TOKEN && token === process.env.ADMIN_TOKEN
}

// GET /api/admin/reviews?status=pending — lista reseñas para moderar.
export async function GET(req: Request) {
  if (!authed(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const url = new URL(req.url)
  const status = url.searchParams.get("status") || "pending"
  const supabase = getSupabaseAdmin()
  let q = supabase
    .from("reviews")
    .select("id, tenant_id, cabin_id, booking_code, rating, comment, guest_name, status, created_at, cabins(name), tenants(business_name)")
    .order("created_at", { ascending: false })
    .limit(200)
  if (status !== "all") q = q.eq("status", status)
  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ reviews: data || [] })
}

// PATCH /api/admin/reviews — { id, status: approved|rejected }
export async function PATCH(req: Request) {
  if (!authed(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const body = await req.json()
  const id = String(body.id || "")
  const status = String(body.status || "")
  if (!/^[0-9a-f-]{36}$/i.test(id) || !["approved", "rejected", "pending"].includes(status)) {
    return NextResponse.json({ error: "Parámetros inválidos" }, { status: 400 })
  }
  const supabase = getSupabaseAdmin()
  const { error } = await supabase.from("reviews").update({ status }).eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
