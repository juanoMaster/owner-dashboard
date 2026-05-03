export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function PATCH(req: Request) {
  const adminToken = process.env.ADMIN_TOKEN
  const h = req.headers.get("x-admin-token")
  if (!adminToken || h !== adminToken) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { global: { fetch: (url, options = {}) => fetch(url, { ...options, cache: "no-store" }) } }
  )

  try {
    const { booking_id, commission_status } = await req.json()
    if (!booking_id || !commission_status) {
      return NextResponse.json({ error: "Faltan campos" }, { status: 400 })
    }
    const valid = ["pending", "paid", "not_applicable"]
    if (!valid.includes(commission_status)) {
      return NextResponse.json({ error: "Estado inválido" }, { status: 400 })
    }
    const { error } = await supabase
      .from("bookings")
      .update({ commission_status })
      .eq("id", booking_id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
