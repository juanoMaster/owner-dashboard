const fs = require("fs")
const path = require("path")

// ── FIX 1: /api/bookings/confirm/route.ts ─────────────────────────────────────
// Bug: .neq("reason", "manual") evita actualizar el bloque de reserva manual
// Fix: eliminar ese filtro + mejorar mensaje de error con fechas del conflicto
const CONFIRM = `import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { logAudit } from "@/lib/audit"

export async function POST(req: Request) {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  try {
    const { booking_id, tenant_id } = await req.json()
    if (!booking_id || !tenant_id) return NextResponse.json({ error: "booking_id y tenant_id son requeridos" }, { status: 400 })

    const { data: booking, error: fetchErr } = await supabase
      .from("bookings")
      .select("cabin_id, check_in, check_out, total_amount, notes, status")
      .eq("id", booking_id)
      .eq("tenant_id", tenant_id)
      .maybeSingle()

    if (fetchErr) return NextResponse.json({ error: "Error al buscar reserva: " + fetchErr.message }, { status: 500 })
    if (!booking) return NextResponse.json({ error: "Reserva no encontrada (id: " + booking_id + ")" }, { status: 404 })
    if (booking.status === "confirmed") return NextResponse.json({ success: true })

    // Buscar reservas confirmadas con fechas que se cruzan (excluyendo la actual)
    const { data: conflicts } = await supabase
      .from("bookings")
      .select("id, check_in, check_out")
      .eq("cabin_id", booking.cabin_id)
      .eq("tenant_id", tenant_id)
      .eq("status", "confirmed")
      .neq("id", booking_id)
      .lt("check_in", booking.check_out)
      .gt("check_out", booking.check_in)

    if (conflicts && conflicts.length > 0) {
      const c = conflicts[0]
      return NextResponse.json({
        error: "Conflicto: ya existe una reserva confirmada del " + c.check_in + " al " + c.check_out + ". Cancela esa reserva primero."
      }, { status: 409 })
    }

    const { error } = await supabase.from("bookings").update({ status: "confirmed" }).eq("id", booking_id)
    if (error) return NextResponse.json({ error: "Error al actualizar: " + error.message }, { status: 500 })

    // Actualizar TODOS los bloques del booking (incluyendo reason="manual")
    await supabase.from("calendar_blocks")
      .update({ reason: "system_booking" })
      .eq("booking_id", booking_id)

    await logAudit({
      tenant_id,
      cabin_id: booking.cabin_id,
      action: "booking_confirmed",
      entity_type: "booking",
      entity_id: booking_id,
      details: { check_in: booking.check_in, check_out: booking.check_out, total_amount: booking.total_amount, notes: booking.notes },
      performed_by: "owner_panel",
    })
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
`

// ── FIX 2: /api/bookings/manual/route.ts ──────────────────────────────────────
// Bug: no verifica reservas confirmadas existentes, solo calendar_blocks
// Fix: verificar conflicto ANTES de crear la reserva
const MANUAL = `import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { logAudit } from "@/lib/audit"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function generateBookingCode(): string {
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ"
  const part1 = Array.from({ length: 3 }, () => letters[Math.floor(Math.random() * letters.length)]).join("")
  const part2 = Math.floor(1000 + Math.random() * 9000).toString()
  return "RKT-" + part1 + "-" + part2
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { tenant_id, cabin_id, check_in, check_out, guest_name, guest_whatsapp, guests, tinaja_days, notes } = body
    if (!tenant_id || !cabin_id || !check_in || !check_out || !guest_name || !guest_whatsapp || !guests) {
      return NextResponse.json({ success: false, message: "Faltan campos obligatorios" }, { status: 400 })
    }

    const { data: cabin, error: cabinError } = await supabase
      .from("cabins")
      .select("base_price_night, name, capacity")
      .eq("id", cabin_id)
      .eq("tenant_id", tenant_id)
      .single()

    if (cabinError || !cabin) {
      return NextResponse.json({ success: false, message: "Cabana no encontrada" }, { status: 404 })
    }

    const nights = Math.round((new Date(check_out + "T12:00:00").getTime() - new Date(check_in + "T12:00:00").getTime()) / 86400000)
    if (nights < 1) {
      return NextResponse.json({ success: false, message: "Las fechas no son validas" }, { status: 400 })
    }

    // Verificar que no exista reserva confirmada para esas fechas
    const { data: existingConfirmed } = await supabase
      .from("bookings")
      .select("id, check_in, check_out")
      .eq("cabin_id", cabin_id)
      .eq("tenant_id", tenant_id)
      .eq("status", "confirmed")
      .lt("check_in", check_out)
      .gt("check_out", check_in)

    if (existingConfirmed && existingConfirmed.length > 0) {
      const c = existingConfirmed[0]
      return NextResponse.json({
        success: false,
        message: "Las fechas ya estan confirmadas para otra reserva (" + c.check_in + " al " + c.check_out + ")"
      }, { status: 409 })
    }

    const guestCount = parseInt(guests)
    const tinajaCount = parseInt(tinaja_days) || 0
    const extraGuests = Math.max(0, guestCount - (cabin.capacity - 2))
    const subtotal = cabin.base_price_night * nights
    const extras = extraGuests * 5000 * nights
    const tinajaTotal = tinajaCount * 30000
    const total = subtotal + extras + tinajaTotal
    const deposit = Math.round(total * 0.2)
    const balance = total - deposit
    const bookingCode = generateBookingCode()
    const notesData = JSON.stringify({ nombre: guest_name, whatsapp: guest_whatsapp, codigo: bookingCode, notas: notes || "", origen: "manual", tinaja: String(tinajaCount) })

    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .insert([{
        tenant_id, cabin_id, check_in, check_out,
        guests: guestCount, nights,
        subtotal_amount: subtotal, total_amount: total,
        deposit_percent: 20, deposit_amount: deposit, balance_amount: balance,
        status: "draft", notes: notesData,
        commission_percent: 0, commission_amount: 0, commission_status: "not_applicable"
      }])
      .select("id")
      .single()

    if (bookingError || !booking) {
      return NextResponse.json({ success: false, message: bookingError?.message || "Error al guardar" }, { status: 500 })
    }

    const { error: blockError } = await supabase
      .from("calendar_blocks")
      .insert([{ tenant_id, cabin_id, start_date: check_in, end_date: check_out, reason: "manual", booking_id: booking.id }])

    if (blockError) {
      await supabase.from("bookings").delete().eq("id", booking.id)
      return NextResponse.json({ success: false, message: "Las fechas no estan disponibles" }, { status: 409 })
    }

    await logAudit({
      tenant_id, cabin_id,
      action: "booking_created",
      entity_type: "booking",
      entity_id: booking.id,
      details: { check_in, check_out, nights, total_amount: total, deposit_amount: deposit, origen: "manual", guest_name, booking_code: bookingCode },
      performed_by: "owner_panel",
    })

    return NextResponse.json({ success: true, booking_code: bookingCode, total, deposit, nights })
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message || "Error interno" }, { status: 500 })
  }
}
`

// ── FIX 3: /api/calendar/delete/route.ts ──────────────────────────────────────
// Bug: eliminar bloques de una reserva confirmada deja la reserva como "confirmed" huérfana
// Fix: cuando se eliminan bloques de una reserva con booking_id, también cancelar (soft-delete) la reserva
const CALENDAR_DELETE = `import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { logAudit } from "@/lib/audit"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { cabin_id, id } = body

    if (!cabin_id || !id) {
      return NextResponse.json({ success: false, message: "cabin_id e id son requeridos" }, { status: 400 })
    }

    const { data: block } = await supabase
      .from("calendar_blocks")
      .select("booking_id, start_date, end_date, reason, tenant_id")
      .eq("id", id)
      .eq("cabin_id", cabin_id)
      .maybeSingle()

    const tenant_id = block?.tenant_id || null

    let error
    if (block?.booking_id) {
      // Eliminar TODOS los bloques del mismo booking
      const result = await supabase
        .from("calendar_blocks")
        .delete()
        .eq("booking_id", block.booking_id)
        .eq("cabin_id", cabin_id)
      error = result.error

      if (!error) {
        // Cancelar (soft-delete) la reserva para evitar reservas confirmadas huérfanas
        // Esto permite que las fechas queden libres para nuevas reservas
        await supabase
          .from("bookings")
          .update({ deleted_at: new Date().toISOString(), deleted_by: "calendar_panel" })
          .eq("id", block.booking_id)
          .is("deleted_at", null)
      }
    } else {
      // Bloque manual suelto: borrar solo ese
      const result = await supabase
        .from("calendar_blocks")
        .delete()
        .eq("id", id)
        .eq("cabin_id", cabin_id)
      error = result.error
    }

    if (error) return NextResponse.json({ success: false, message: error.message }, { status: 500 })

    if (tenant_id) {
      await logAudit({
        tenant_id, cabin_id,
        action: block?.booking_id ? "booking_blocks_released" : "block_deleted",
        entity_type: block?.booking_id ? "booking" : "calendar_block",
        entity_id: block?.booking_id || id,
        details: { start_date: block?.start_date, end_date: block?.end_date, reason: block?.reason },
        performed_by: "calendar_panel",
      })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      message: err instanceof Error ? err.message : "Error interno del servidor",
    }, { status: 500 })
  }
}
`

// ── Write files ────────────────────────────────────────────────────────────────
const base = __dirname

fs.writeFileSync(path.join(base, "app", "api", "bookings", "confirm", "route.ts"), CONFIRM, "utf8")
console.log("Written: app/api/bookings/confirm/route.ts")

fs.writeFileSync(path.join(base, "app", "api", "bookings", "manual", "route.ts"), MANUAL, "utf8")
console.log("Written: app/api/bookings/manual/route.ts")

fs.writeFileSync(path.join(base, "app", "api", "calendar", "delete", "route.ts"), CALENDAR_DELETE, "utf8")
console.log("Written: app/api/calendar/delete/route.ts")

console.log("\nDone. Run: npm run build")
