const fs = require("fs")

const css = [
  ".fc { --fc-border-color: #1a2e1a; --fc-today-bg-color: #7ab87a0d; color: #b8ccb8; }",
  ".fc .fc-toolbar { margin-bottom: 16px !important; }",
  ".fc .fc-toolbar-title { color: #e8d5a3; font-family: Georgia, serif; font-size: 17px; letter-spacing: 0.5px; }",
  ".fc .fc-button { background: #0a1510 !important; border: 1px solid #1a2e1a !important; color: #6a8a68 !important; font-size: 11px !important; letter-spacing: 0.5px !important; padding: 6px 14px !important; border-radius: 8px !important; }",
  ".fc .fc-button:hover { background: #162618 !important; color: #a8c8a8 !important; }",
  ".fc .fc-button-primary:not(:disabled).fc-button-active { background: #7ab87a !important; border-color: #7ab87a !important; color: #0d1a12 !important; font-weight: 700 !important; }",
  ".fc .fc-col-header-cell { background: #0a1510; border-color: #1a2e1a; }",
  ".fc .fc-col-header-cell-cushion { color: #3a5a38; font-size: 10px; letter-spacing: 2px; text-transform: uppercase; text-decoration: none; padding: 10px 4px; font-weight: 600; }",
  ".fc .fc-daygrid-day-number { color: #5a7a58; text-decoration: none; font-size: 12px; padding: 6px 8px; }",
  ".fc .fc-day-today .fc-daygrid-day-number { color: #7ab87a; font-weight: 700; }",
  ".fc-theme-standard td, .fc-theme-standard th { border-color: #1a2e1a; }",
  ".fc-theme-standard .fc-scrollgrid { border-color: #1a2e1a; border-radius: 12px; overflow: hidden; }",
  ".fc .fc-daygrid-body { background: #0d1a12; }",
  ".fc .fc-daygrid-day.fc-day-today { background: #7ab87a08; }",
  ".fc .fc-event { cursor: pointer; border: none !important; border-radius: 4px !important; padding: 1px 5px !important; font-size: 11px !important; font-weight: 600 !important; letter-spacing: 0.3px !important; }",
  ".fc .fc-event:hover { opacity: 0.8; transform: translateY(-1px); transition: all 0.15s; }",
  ".fc .fc-daygrid-day:hover { background: #7ab87a05; }",
].join(" ")

const content = `"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import FullCalendar from "@fullcalendar/react"
import dayGridPlugin from "@fullcalendar/daygrid"
import interactionPlugin from "@fullcalendar/interaction"
import esLocale from "@fullcalendar/core/locales/es"

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
  const [cabinName, setCabinName] = useState("Cabaña")
  const [businessName, setBusinessName] = useState("")
  const [tenantId, setTenantId] = useState("")
  const [modal, setModal] = useState<any>(null)
  const [modalLoading, setModalLoading] = useState(false)
  const [message, setMessage] = useState("")

  async function loadEvents() {
    if (!cabinId) return
    const res = await fetch("/api/calendar?cabin_id=" + cabinId)
    const data = await res.json()
    if (data.cabin_name) setCabinName(data.cabin_name)
    if (data.business_name) setBusinessName(data.business_name)
    if (data.tenant_id) setTenantId(data.tenant_id)
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
    setMessage("")
  }

  async function handleConfirm() {
    if (!modal?.bookingId || !tenantId) return
    if (!confirm("\\u00bfConfirmar el pago de esta reserva?")) return
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
    if (!confirm("\\u00bfCancelar esta reserva? Las fechas quedar\\u00e1n libres.")) return
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
    if (!confirm("\\u00bfLiberar fechas: " + range + "?")) return
    if (modal?.isConfirmed) {
      if (!confirm("\\u26a0\\ufe0f Esta reserva YA EST\\u00c1 PAGADA.\\n\\u00bfEst\\u00e1s segura de que quieres eliminarla?")) return
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
    <div style={{ background: "#0d1a12", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#5a7058", fontFamily: "sans-serif" }}>
      Caba\\u00f1a no especificada
    </div>
  )

  const calendarCss = ${JSON.stringify(css)}

  return (
    <div style={{ background: "#0d1a12", minHeight: "100vh", fontFamily: "sans-serif", color: "#f0ede8" }}>
      <style>{calendarCss}</style>

      <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 28px", borderBottom: "1px solid #ffffff08", background: "#080f0a" }}>
        <div style={{ fontFamily: "Georgia,serif", fontSize: "17px", letterSpacing: "3px", color: "#e8d5a3", textTransform: "uppercase" as const }}>
          {businessName || "Panel"}
        </div>
        <div style={{ fontSize: "10px", color: "#3a5a38", letterSpacing: "1.5px", textTransform: "uppercase" as const }}>Calendario</div>
      </nav>

      <div style={{ padding: "28px 24px", maxWidth: "1000px", margin: "0 auto" }}>

        <div style={{ marginBottom: "28px" }}>
          <a href={"/?token=" + token}
            style={{ display: "inline-flex", alignItems: "center", gap: "6px", color: "#6a8a68", fontSize: "11px", padding: "7px 16px", border: "1px solid #1a2e1a", borderRadius: "20px", textDecoration: "none", letterSpacing: "0.5px", marginBottom: "20px" }}>
            \\u2190 Volver al panel
          </a>
          <div style={{ fontSize: "10px", letterSpacing: "2px", textTransform: "uppercase" as const, color: "#7ab87a", marginBottom: "4px" }}>Cabaña</div>
          <h1 style={{ fontFamily: "Georgia,serif", fontSize: "26px", color: "#e8d5a3", margin: "0 0 8px 0", fontWeight: 400 }}>
            {cabinName}
          </h1>
          <p style={{ color: "#3a5a38", fontSize: "11px", margin: 0, letterSpacing: "0.3px" }}>
            Toca un bloque para ver detalles y gestionar la reserva
          </p>
        </div>

        {message && (
          <div style={{ marginBottom: "16px", padding: "12px 16px", background: message.includes("Error") ? "#e6394612" : "#7ab87a12", border: message.includes("Error") ? "1px solid #e6394630" : "1px solid #7ab87a30", borderRadius: "10px", fontSize: "12px", color: message.includes("Error") ? "#e67a7a" : "#7ab87a" }}>
            {message}
          </div>
        )}

        <div style={{ background: "#080f0a", border: "1px solid #1a2e1a", borderRadius: "20px", padding: "24px", boxShadow: "0 2px 40px #00000050" }}>
          <FullCalendar
            plugins={[dayGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            locale={esLocale}
            eventClick={handleEventClick}
            events={events}
            height="auto"
          />
        </div>

        <div style={{ display: "flex", flexWrap: "wrap" as const, gap: "16px", marginTop: "16px", padding: "4px" }}>
          {([
            ["#f97316", "Pendiente de pago (turista)"],
            ["#27ae60", "Confirmada (pagada)"],
            ["#2563eb", "Reserva manual (sin comisi\\u00f3n)"],
          ] as [string, string][]).map(([color, label]) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: "7px", fontSize: "11px", color: "#4a6a48" }}>
              <div style={{ width: "10px", height: "10px", borderRadius: "3px", background: color, flexShrink: 0 }} />
              {label}
            </div>
          ))}
        </div>
      </div>

      {modal && (
        <div
          style={{ position: "fixed", inset: 0, background: "#000000a0", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px" }}
          onClick={(e: any) => { if (e.target === e.currentTarget) setModal(null) }}
        >
          <div style={{ background: "#0a1510", border: "1px solid #2a3e28", borderRadius: "20px", padding: "28px", width: "100%", maxWidth: "400px", boxShadow: "0 20px 60px #00000080", maxHeight: "90vh", overflowY: "auto" as const }}>
            {(() => {
              const notes = parseNotes(modal.booking?.notes)
              const nombre = notes.nombre || "\\u2014"
              const whatsapp = notes.whatsapp || ""
              const codigo = notes.codigo || ""
              const isManual = modal.reason === "manual"
              const isPending = !modal.isConfirmed && !isManual
              const booking = modal.booking
              const statusColor = isManual ? "#2563eb" : modal.isConfirmed ? "#27ae60" : "#f97316"
              const statusLabel = isManual ? "Reserva manual" : modal.isConfirmed ? "Confirmada" : "Pendiente de pago"
              return (
                <>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
                    <div>
                      <div style={{ fontSize: "9px", letterSpacing: "2px", textTransform: "uppercase" as const, color: statusColor, marginBottom: "6px", fontWeight: 700 }}>
                        {statusLabel}
                      </div>
                      <div style={{ fontFamily: "Georgia,serif", fontSize: "20px", color: "#e8d5a3", fontWeight: 400 }}>
                        {modal.hasBooking ? nombre : "Bloque manual"}
                      </div>
                    </div>
                    <button onClick={() => setModal(null)}
                      style={{ background: "transparent", border: "1px solid #2a3e28", borderRadius: "8px", color: "#5a7058", fontSize: "14px", cursor: "pointer", padding: "4px 10px", lineHeight: 1, fontFamily: "sans-serif" }}>
                      \\u2715
                    </button>
                  </div>

                  {codigo && (
                    <div style={{ fontSize: "11px", color: "#5a7058", fontFamily: "monospace", background: "#162618", padding: "8px 12px", borderRadius: "8px", marginBottom: "16px", letterSpacing: "1.5px" }}>
                      {codigo}
                    </div>
                  )}

                  <div style={{ background: "#162618", border: "1px solid #2a3e28", borderRadius: "12px", padding: "14px", marginBottom: "16px" }}>
                    {([
                      whatsapp ? ["WhatsApp", whatsapp] : null,
                      ["Check-in", formatDate(modal.start)],
                      ["Check-out", formatDate(modal.endStr)],
                      booking?.nights ? ["Noches", String(booking.nights)] : null,
                      booking?.guests ? ["Personas", String(booking.guests)] : null,
                      booking?.total_amount ? ["Total", fmt(booking.total_amount)] : null,
                      booking?.deposit_amount ? ["Adelanto (20%)", fmt(booking.deposit_amount)] : null,
                      booking?.balance_amount ? ["Saldo", fmt(booking.balance_amount)] : null,
                      notes.tinaja && notes.tinaja !== "0" ? ["Tinaja", notes.tinaja + " d\\u00eda(s)"] : null,
                      notes.notas ? ["Notas", notes.notas] : null,
                    ] as any[]).filter(Boolean).map((row: any, i: number, arr: any[]) => (
                      <div key={row[0]} style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", padding: "6px 0", borderBottom: i < arr.length - 1 ? "1px solid #ffffff07" : "none" }}>
                        <span style={{ color: "#5a7058" }}>{row[0]}</span>
                        <span style={{ color: "#c8d8c0", fontWeight: 500, textAlign: "right" as const, maxWidth: "55%" }}>{row[1]}</span>
                      </div>
                    ))}
                  </div>

                  {whatsapp && (
                    <a href={"https://wa.me/" + whatsapp.replace(/[^0-9+]/g, "").replace("+", "")}
                      target="_blank" rel="noopener noreferrer"
                      style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", background: "#25d36620", border: "1px solid #25d36640", color: "#25d366", borderRadius: "10px", padding: "10px 16px", fontSize: "12px", fontWeight: 600, textDecoration: "none", marginBottom: "12px" }}>
                      WhatsApp · {whatsapp}
                    </a>
                  )}

                  <div style={{ display: "flex", flexDirection: "column" as const, gap: "8px" }}>
                    {isPending && modal.hasBooking && (
                      <button onClick={handleConfirm} disabled={modalLoading}
                        style={{ width: "100%", padding: "13px", background: "#27ae60", border: "none", borderRadius: "10px", color: "white", fontSize: "13px", fontWeight: 700, cursor: modalLoading ? "not-allowed" : "pointer", opacity: modalLoading ? 0.6 : 1, fontFamily: "sans-serif", letterSpacing: "0.3px" }}>
                        {modalLoading ? "Procesando..." : "\\u2713 Confirmar pago"}
                      </button>
                    )}
                    {modal.hasBooking && (
                      <button onClick={handleCancel} disabled={modalLoading}
                        style={{ width: "100%", padding: "12px", background: "transparent", border: "1px solid #e6394640", borderRadius: "10px", color: "#e67a7a", fontSize: "12px", fontWeight: 600, cursor: modalLoading ? "not-allowed" : "pointer", opacity: modalLoading ? 0.6 : 1, fontFamily: "sans-serif" }}>
                        {modalLoading ? "Procesando..." : "Rechazar reserva"}
                      </button>
                    )}
                    <button onClick={handleLiberar} disabled={modalLoading}
                      style={{ width: "100%", padding: "11px", background: "transparent", border: "1px solid #2a3e28", borderRadius: "10px", color: "#5a7058", fontSize: "11px", cursor: modalLoading ? "not-allowed" : "pointer", opacity: modalLoading ? 0.6 : 1, fontFamily: "sans-serif" }}>
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
      <div style={{ background: "#0d1a12", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#5a7058", fontFamily: "sans-serif" }}>
        Cargando...
      </div>
    }>
      <CalendarContent />
    </Suspense>
  )
}
`

fs.writeFileSync("app/calendar/page.tsx", content, "utf8")
console.log("calendar/page.tsx written OK")
