export const dynamic = "force-dynamic"
import { NextResponse } from "next/server"
import { getSupabaseAdmin, getSupabaseForTenant } from "@/lib/supabase-server"
import { createHash } from "crypto"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const cabinId = searchParams.get("cabin_id")
  const token = searchParams.get("token")
  if (!cabinId) return NextResponse.json({ error: "cabin_id es requerido" }, { status: 400 })

  // Lookup inicial sin tenant conocido → admin
  const supabaseAdmin = getSupabaseAdmin()

  let authenticatedTenantId: string | null = null
  if (token) {
    const tokenHash = createHash("sha256").update(token).digest("hex")
    const { data: link } = await supabaseAdmin
      .from("dashboard_links")
      .select("tenant_id")
      .eq("token_hash", tokenHash)
      .eq("active", true)
      .maybeSingle()
    if (link) authenticatedTenantId = link.tenant_id
  }

  const { data: cabin } = await supabaseAdmin
    .from("cabins")
    .select("name, tenant_id, base_price_night, capacity")
    .eq("id", cabinId)
    .maybeSingle()

  const isOwner = authenticatedTenantId !== null && authenticatedTenantId === cabin?.tenant_id

  // Tenant conocido → cliente con contexto de sesión para queries siguientes
  const supabase = cabin?.tenant_id
    ? await getSupabaseForTenant(cabin.tenant_id)
    : supabaseAdmin

  const { data: tenant } = (isOwner && cabin?.tenant_id)
    ? await supabase.from("tenants").select("business_name, currency").eq("id", cabin.tenant_id).maybeSingle()
    : { data: null }

  const rangeStart = searchParams.get("start")
  const rangeEnd   = searchParams.get("end")

  let blocksQuery = supabase
    .from("calendar_blocks")
    .select("id, start_date, end_date, booking_id, reason")
    .eq("cabin_id", cabinId)

  if (rangeStart) blocksQuery = blocksQuery.gte("end_date", rangeStart)
  if (rangeEnd)   blocksQuery = blocksQuery.lte("start_date", rangeEnd)

  const { data: blocks, error } = await blocksQuery

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  let confirmedSet = new Set<string>()
  let bookingDetailsMap: Record<string, any> = {}

  if (isOwner) {
    const bookingIds = Array.from(new Set((blocks || []).filter(b => b.booking_id).map(b => b.booking_id)))
    if (bookingIds.length > 0) {
      const { data: bookingRows } = await supabase
        .from("bookings")
        .select("id, status, total_amount, deposit_amount, balance_amount, nights, guests, notes")
        .in("id", bookingIds)
        .is("deleted_at", null)
      ;(bookingRows || []).forEach((b: any) => {
        bookingDetailsMap[b.id] = b
        if (b.status === "confirmed") confirmedSet.add(b.id)
      })
    }
  }

  const events = (blocks || []).map(b => ({
    id: b.id,
    start: b.start_date,
    end: b.end_date,
    reason: b.reason,
    has_booking: !!b.booking_id,
    booking_id: isOwner ? (b.booking_id || null) : null,
    is_confirmed: b.booking_id ? confirmedSet.has(b.booking_id) : false,
    booking: isOwner && b.booking_id ? (bookingDetailsMap[b.booking_id] || null) : null,
  }))

  return NextResponse.json({
    events,
    cabin_name: isOwner ? (cabin?.name || "Cabana") : "Cabana",
    business_name: isOwner ? (tenant?.business_name || "") : "",
    tenant_id: isOwner ? (cabin?.tenant_id || "") : "",
    cabin_price: isOwner ? (Number(cabin?.base_price_night) || 0) : 0,
    cabin_capacity: isOwner ? (cabin?.capacity || 4) : 4,
    currency: isOwner ? (tenant?.currency || "CLP") : "CLP",
  })
}

export async function POST(req: Request) {
  try {
    const { start_date, end_date, cabin_id, token } = await req.json()
    if (!start_date || !end_date || !cabin_id || !token) {
      return NextResponse.json({ error: "start_date, end_date, cabin_id y token son requeridos" }, { status: 400 })
    }

    // Lookup inicial sin tenant conocido → admin
    const supabaseAdmin = getSupabaseAdmin()
    const tokenHash = createHash("sha256").update(token).digest("hex")

    const { data: link } = await supabaseAdmin
      .from("dashboard_links")
      .select("tenant_id")
      .eq("token_hash", tokenHash)
      .eq("active", true)
      .maybeSingle()

    if (!link) return NextResponse.json({ error: "Token inválido o inactivo" }, { status: 401 })

    const { data: cabin } = await supabaseAdmin
      .from("cabins")
      .select("tenant_id")
      .eq("id", cabin_id)
      .maybeSingle()

    if (!cabin) return NextResponse.json({ error: "Cabana no encontrada" }, { status: 404 })

    if (link.tenant_id !== cabin.tenant_id) {
      return NextResponse.json({ error: "Sin autorización para esta cabaña" }, { status: 401 })
    }

    // Tenant conocido → cliente con contexto de sesión
    const supabase = await getSupabaseForTenant(cabin.tenant_id)

    const { error } = await supabase.from("calendar_blocks").insert([{
      start_date,
      end_date,
      reason: "manual",
      cabin_id,
      tenant_id: cabin.tenant_id,
    }])

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
