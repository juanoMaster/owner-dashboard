const fs = require("fs")
const path = require("path")

const tsx = `"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import FullCalendar from "@fullcalendar/react"
import dayGridPlugin from "@fullcalendar/daygrid"
import interactionPlugin from "@fullcalendar/interaction"
import esLocale from "@fullcalendar/core/locales/es"
import ManualBookingForm from "../components/ManualBookingForm"

function fmt(n: number) {
  return "$" + Math.round(n).toLocaleString("es-CL")
}

function parseNotes(notes: any): Record<string, string> {
  if (!notes) return {}
  const obj =
    typeof notes === "object" ? notes
    : typeof notes === "string" && notes.trimStart().startsWith("{")
      ? (() => { try { return JSON.parse(notes) } catch { return null } })()
      : null
  if (obj) return {
    nombre: obj.nombre || obj.Nombre || "",
    whatsapp: obj.whatsapp || obj.WhatsApp || "",
    codigo: obj.codigo || obj.Codigo || "",
    tinaja: obj.tinaja || obj.Tinaja || "",
    notas: obj.notas || obj.Notas || "",
  }
  const result: Record<string, string> = {}
  ;(notes as string).split("|").forEach((part: string) => {
    const i = part.indexOf(":")
    if (i > -1) result[part.slice(0, i).trim()] = part.slice(i + 1).trim()
  })
  return result
}

function formatDate(d: string) {
  return new Date(d + "T12:00:00").toLocaleDateString("es-CL", { day: "numeric", month: "short", year: "numeric" })
}

function CalendarContent() {
  const searchParams = useSearchParams()
  const cabinId = searchParams.get("cabin_id") || ""
  const token = searchParams.get("token") || ""
  const [events, setEvents] = useState<any[]>([])
  const [cabinName, setCabinName] = useState("Caba\u00f1a")
  const [businessName, setBusinessName] = useState("")
  const [tenantId, setTenantId] = useState("")
  const [cabinPrice, setCabinPrice] = useState(0)
  const [cabinCapacity, setCabinCapacity] = useState(4)
  const [modal, setModal] = useState<any>(null)
  const [modalLoading, setModalLoading] = useState(false)

  async function loadEvents() {
    if (!cabinId) return
    const res = await fetch("/api/calendar?cabin_id=" + cabinId)
    const data = await res.json()
    if (data.cabin_name) setCabinName(data.cabin_name)
    if (data.business_name) setBusinessName(data.business_name)
    if (data.tenant_id) setTenantId(data.tenant_id)
    if (data.cabin_price) setCabinPrice(data.cabin_price)
    if (data.cabin_capacity) setCabinCapacity(data.cabin_capacity)
    const list = data.events || []
    setEvents(list.map((e: any) => {
      const d = new Date(e.end + "T12:00:00")
      d.setDate(d.getDate() + 1)
      let color = "#f97316"
      let title = "Pendiente"
      if (e.reason === "manual") { color = "#2563eb"; title = "Manual" }
      else if (e.reason === "system_booking" || e.is_confirmed) { color = "#27ae60"; title = "Confirmada" }
      return {
        id: e.id, title,
        start: e.start,
        end: d.toISOString().split("T")[0],
        color, allDay: true, display: "block",
        extendedProps: {
          isConfirmed: e.is_confirmed,
          hasBooking: e.has_booking,
          reason: e.reason,
          bookingId: e.booking_id,
          booking: e.booking,
        },
      }
    }))
  }

  useEffect(() => { loadEvents() }, [cabinId])

  function handleEventClick(info: any) {
    const p = info.event.extendedProps
    const start = info.event.startStr
    const endEx = info.event.end
    const endStr = endEx
      ? new Date(endEx.getTime() - 86400000).toISOString().split("T")[0]
      : start
    setModal({ blockId: info.event.id, start, endStr, ...p })
  }

  async function handleConfirm() {
    if (!modal?.bookingId || !tenantId) return
    if (!confirm("\u00bfConfirmar el pago de esta reserva?")) return
    setModalLoading(true)
    const res = await fetch("/api/bookings/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ booking_id: modal.bookingId, tenant_id: tenantId }),
    })
    const data = await res.json()
    setModalLoading(false)
    if (res.ok) { setModal(null); await loadEvents() }
    else alert("Error: " + (data.error || data.message || res.status))
  }

  async function handleCancel() {
    if (!modal?.bookingId || !tenantId) return
    if (!confirm("\u00bfCancelar esta reserva? Las fechas quedar\u00e1n libres.")) return
    setModalLoading(true)
    const res = await fetch("/api/bookings/cancel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ booking_id: modal.bookingId, tenant_id: tenantId }),
    })
    setModalLoading(false)
    if (res.ok) { setModal(null); await loadEvents() }
    else alert("Error al cancelar la reserva")
  }

  async function handleLiberar() {
    const range = modal?.start === modal?.endStr ? modal?.start : modal?.start + " al " + modal?.endStr
    if (!confirm("\u00bfLiberar fechas: " + range + "?")) return
    if (modal?.isConfirmed) {
      if (!confirm("\u26a0\ufe0f Esta reserva YA EST\u00c1 PAGADA. \u00bfEst\u00e1s segura de eliminarla?")) return
    }
    setModalLoading(true)
    const res = await fetch("/api/calendar/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cabin_id: cabinId, id: modal?.blockId }),
    })
    const data = await res.json()
    setModalLoading(false)
    if (data.success) { setModal(null); await loadEvents() }
    else alert("Error al liberar las fechas.")
  }

  if (!cabinId) return (
    <div style={{ background: "#0a1208", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#5a7058", fontFamily: "sans-serif" }}>
      Caba\u00f1a no especificada
    </div>
  )

  const calendarCss = ".fc { --fc-border-color: #1a2e1a; --fc-today-bg-color: #7ab87a0d; color: #b8ccb8; } .fc .fc-toolbar { margin-bottom: 16px !important; } .fc .fc-toolbar-title { color: #e8d5a3; font-family: Georgia, serif; font-size: 17px; letter-spacing: 0.5px; } .fc .fc-button { background: #0a1510 !important; border: 1px solid #1a2e1a !important; color: #6a8a68 !important; font-size: 11px !important; letter-spacing: 0.5px !important; padding: 6px 14px !important; border-radius: 8px !important; } .fc .fc-button:hover { background: #162618 !important; color: #a8c8a8 !important; } .fc .fc-button-primary:not(:disabled).fc-button-active { background: #7ab87a !important; border-color: #7ab87a !important; color: #0d1a12 !important; font-weight: 700 !important; } .fc .fc-col-header-cell { background: #060e06; border-color: #1a2e1a; } .fc .fc-col-header-cell-cushion { color: #3a5a38; font-size: 10px; letter-spacing: 2px; text-transform: uppercase; text-decoration: none; padding: 10px 4px; font-weight: 600; } .fc .fc-daygrid-day-number { color: #4a6a48; text-decoration: none; font-size: 12px; padding: 6px 8px; } .fc .fc-day-today .fc-daygrid-day-number { color: #7ab87a; font-weight: 700; } .fc-theme-standard td, .fc-theme-standard th { border-color: #1a2e1a; } .fc-theme-standard .fc-scrollgrid { border-color: #1a2e1a; } .fc .fc-daygrid-body { background: #060e06; } .fc .fc-daygrid-day.fc-day-today { background: #7ab87a08; } .fc .fc-event { cursor: pointer; border: none !important; border-radius: 4px !important; padding: 2px 6px !important; font-size: 11px !important; font-weight: 600 !important; letter-spacing: 0.3px !important; } .fc .fc-event:hover { opacity: 0.8; transition: opacity 0.15s; } .fc .fc-daygrid-day:hover { background: #7ab87a04; }"

  return (
    <div style={{ background: "#0a1208", minHeight: "100vh", fontFamily: "sans-serif", color: "#f0ede8" }}>
      <style>{calendarCss}</style>

      <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 28px", height: "54px", borderBottom: "1px solid #111e11", background: "#050d05", boxShadow: "0 1px 20px #00000050" }}>
        <div style={{ fontFamily: "Georgia,serif", fontSize: "15px", letterSpacing: "3.5px", color: "#c8b878", textTransform: "uppercase" as const }}>
          {businessName || "Panel"}
        </div>
        <div style={{ fontSize: "9px", color: "#253825", letterSpacing: "2.5px", textTransform: "uppercase" as const, fontWeight: 600 }}>Calendario</div>
      </nav>

      <div style={{ padding: "36px 28px", maxWidth: "1060px", margin: "0 auto" }}>

        <div style={{ marginBottom: "36px" }}>
          <a href={"/?token=" + token}
            style={{ display: "inline-flex", alignItems: "center", gap: "8px", color: "#4a6a48", fontSize: "11px", padding: "7px 16px", border: "1px solid #1a2e1a", borderRadius: "20px", textDecoration: "none", letterSpacing: "0.5px", marginBottom: "24px", background: "#060e0660" }}>
            {"\u2190 Volver al panel"}
          </a>
          <div style={{ fontSize: "9px", letterSpacing: "2.5px", textTransform: "uppercase" as const, color: "#4a7a48", marginBottom: "8px", fontWeight: 600 }}>
            {"Caba\u00f1a"}
          </div>
          <h1 style={{ fontFamily: "Georgia,serif", fontSize: "30px", color: "#e8d5a3", margin: "0 0 8px 0", fontWeight: 400, letterSpacing: "0.5px" }}>
            {cabinName}
          </h1>
          <p style={{ color: "#253825", fontSize: "11px", margin: 0, letterSpacing: "0.5px" }}>
            Toca un bloque para ver detalles y gestionar la reserva
          </p>
        </div>

        {cabinId && tenantId && (
          <div style={{ marginBottom: "28px", borderTop: "1px solid #1a2e1a", paddingTop: "28px" }}>
            <ManualBookingForm
              cabins={[{ id: cabinId, name: cabinName, capacity: cabinCapacity, base_price_night: cabinPrice || 30000 }]}
              tenantId={tenantId}
            />
          </div>
        )}

        <div style={{ marginBottom: "28px", background: "#050d05", border: "1px solid #1a2e1a", borderRadius: "20px", padding: "28px", boxShadow: "0 8px 60px #00000060" }}>
          <FullCalendar
            plugins={[dayGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            locale={esLocale}
            eventClick={handleEventClick}
            events={events}
            height="auto"
          />
        </div>

        <div style={{ display: "flex", flexWrap: "wrap" as const, gap: "20px", padding: "4px 8px" }}>
          {([
            ["#f97316", "Pendiente de pago"],
            ["#27ae60", "Confirmada"],
            ["#2563eb", "Manual (sin comisi\u00f3n)"],
          ] as [string, string][]).map(([color, label]) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "11px", color: "#3a5a38" }}>
              <div style={{ width: "10px", height: "10px", borderRadius: "3px", background: color, flexShrink: 0 }} />
              {label}
            </div>
          ))}
        </div>
      </div>

      {modal && (
        <div
          style={{ position: "fixed", inset: 0, background: "#000000b8", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px" }}
          onClick={(e: any) => { if (e.target === e.currentTarget) setModal(null) }}
        >
          <div style={{ background: "#080e08", border: "1px solid #253825", borderRadius: "24px", padding: "32px", width: "100%", maxWidth: "420px", boxShadow: "0 32px 80px #00000090", maxHeight: "90vh", overflowY: "auto" as const }}>
            {(() => {
              const notes = parseNotes(modal.booking?.notes)
              const nombre = notes.nombre || "\u2014"
              const whatsapp = notes.whatsapp || ""
              const codigo = notes.codigo || ""
              const isManual = modal.reason === "manual"
              const isPending = !modal.isConfirmed && !isManual
              const booking = modal.booking
              const statusColor = isManual ? "#4a7ad4" : modal.isConfirmed ? "#27ae60" : "#f97316"
              const statusLabel = isManual ? "Reserva manual" : modal.isConfirmed ? "Confirmada" : "Pendiente de pago"
              return (
                <>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px" }}>
                    <div>
                      <div style={{ fontSize: "9px", letterSpacing: "2.5px", textTransform: "uppercase" as const, color: statusColor, marginBottom: "8px", fontWeight: 700 }}>
                        {statusLabel}
                      </div>
                      <div style={{ fontFamily: "Georgia,serif", fontSize: "22px", color: "#e8d5a3", fontWeight: 400, letterSpacing: "0.3px" }}>
                        {modal.hasBooking ? nombre : "Bloque manual"}
                      </div>
                    </div>
                    <button onClick={() => setModal(null)}
                      style={{ background: "transparent", border: "1px solid #1a2e1a", borderRadius: "8px", color: "#3a5a38", fontSize: "16px", cursor: "pointer", padding: "4px 10px", lineHeight: 1, fontFamily: "sans-serif" }}>
                      {"\u00d7"}
                    </button>
                  </div>

                  {codigo && (
                    <div style={{ fontSize: "11px", color: "#4a6a48", fontFamily: "monospace", background: "#0d1a0d", border: "1px solid #1a2e1a", padding: "8px 14px", borderRadius: "8px", marginBottom: "18px", letterSpacing: "2px" }}>
                      {codigo}
                    </div>
                  )}

                  <div style={{ background: "#0d1a0d", border: "1px solid #1a2e1a", borderRadius: "14px", padding: "16px", marginBottom: "18px" }}>
                    {([
                      whatsapp ? ["WhatsApp", whatsapp] : null,
                      ["Check-in", formatDate(modal.start)],
                      ["Check-out", formatDate(modal.endStr)],
                      booking?.nights ? ["Noches", String(booking.nights)] : null,
                      booking?.guests ? ["Personas", String(booking.guests)] : null,
                      booking?.total_amount ? ["Total", fmt(booking.total_amount)] : null,
                      booking?.deposit_amount ? ["Adelanto (20%)", fmt(booking.deposit_amount)] : null,
                      booking?.balance_amount ? ["Saldo", fmt(booking.balance_amount)] : null,
                      notes.tinaja && notes.tinaja !== "0" ? ["Tinaja", notes.tinaja + " d\u00eda(s)"] : null,
                      notes.notas ? ["Notas", notes.notas] : null,
                    ] as any[]).filter(Boolean).map((row: any, i: number, arr: any[]) => (
                      <div key={row[0]} style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", padding: "7px 0", borderBottom: i < arr.length - 1 ? "1px solid #0d1a0d" : "none" }}>
                        <span style={{ color: "#3a5a38" }}>{row[0]}</span>
                        <span style={{ color: "#c8d8c0", fontWeight: 500, textAlign: "right" as const, maxWidth: "58%" }}>{row[1]}</span>
                      </div>
                    ))}
                  </div>

                  {whatsapp && (
                    <a href={"https://wa.me/" + whatsapp.replace(/[^0-9+]/g, "").replace("+", "")}
                      target="_blank" rel="noopener noreferrer"
                      style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", background: "#25d36618", border: "1px solid #25d36640", color: "#25d366", borderRadius: "10px", padding: "11px 16px", fontSize: "12px", fontWeight: 600, textDecoration: "none", marginBottom: "14px" }}>
                      {"\u2709\ufe0f WhatsApp \u00b7 " + whatsapp}
                    </a>
                  )}

                  <div style={{ display: "flex", flexDirection: "column" as const, gap: "8px" }}>
                    {isPending && modal.hasBooking && (
                      <button onClick={handleConfirm} disabled={modalLoading}
                        style={{ width: "100%", padding: "14px", background: "#27ae60", border: "none", borderRadius: "12px", color: "white", fontSize: "13px", fontWeight: 700, cursor: modalLoading ? "not-allowed" : "pointer", opacity: modalLoading ? 0.6 : 1, fontFamily: "sans-serif", letterSpacing: "0.5px" }}>
                        {modalLoading ? "Procesando..." : "\u2713 Confirmar pago"}
                      </button>
                    )}
                    {modal.hasBooking && (
                      <button onClick={handleCancel} disabled={modalLoading}
                        style={{ width: "100%", padding: "12px", background: "transparent", border: "1px solid #e6394640", borderRadius: "12px", color: "#e67a7a", fontSize: "12px", fontWeight: 600, cursor: modalLoading ? "not-allowed" : "pointer", opacity: modalLoading ? 0.6 : 1, fontFamily: "sans-serif" }}>
                        {modalLoading ? "Procesando..." : "Rechazar reserva"}
                      </button>
                    )}
                    <button onClick={handleLiberar} disabled={modalLoading}
                      style={{ width: "100%", padding: "11px", background: "transparent", border: "1px solid #1a2e1a", borderRadius: "12px", color: "#3a5a38", fontSize: "11px", cursor: modalLoading ? "not-allowed" : "pointer", opacity: modalLoading ? 0.6 : 1, fontFamily: "sans-serif" }}>
                      {modalLoading ? "Procesando..." : "Liberar fecha"}
                    </button>
                  </div>
                </>
              )
            })()}
          </div>
        </div>
      )}
    </div>
  )
}

export default function CalendarPage() {
  return (
    <Suspense fallback={
      <div style={{ background: "#0a1208", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#3a5a38", fontFamily: "sans-serif", letterSpacing: "2px", fontSize: "12px" }}>
        Cargando...
      </div>
    }>
      <CalendarContent />
    </Suspense>
  )
}
`

const outPath = path.join(__dirname, "app", "calendar", "page.tsx")
fs.writeFileSync(outPath, tsx, "utf8")
console.log("Written: " + outPath)
