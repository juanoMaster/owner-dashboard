"use client"

import { Suspense, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import FullCalendar from "@fullcalendar/react"
import dayGridPlugin from "@fullcalendar/daygrid"
import interactionPlugin from "@fullcalendar/interaction"
import esLocale from "@fullcalendar/core/locales/es"
import type { CSSProperties } from "react"

const TODAY = new Date().toISOString().split("T")[0]

function parseNotes(notes: string): Record<string, string> {
  const result: Record<string, string> = {}
  if (!notes) return result
  notes.split("|").forEach((part) => {
    const idx = part.indexOf(":")
    if (idx > -1) {
      const key = part.slice(0, idx).trim()
      const val = part.slice(idx + 1).trim()
      if (key && val) result[key] = val
    }
  })
  return result
}

function fmt(n: number) {
  return "$" + Math.round(n).toLocaleString("es-CL")
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T12:00:00")
  return d.toLocaleDateString("es-CL", { day: "numeric", month: "short" })
}

function cleanPhone(phone: string) {
  return phone.replace(/[^0-9+]/g, "")
}

function CalendarInner() {
  const searchParams = useSearchParams()
  const cabinId = searchParams.get("cabin_id") || ""
  const cabinName = searchParams.get("cabin_name") || "Cabaña"
  const token = searchParams.get("token") || ""

  const [events, setEvents] = useState<any[]>([])
  const [rangeStart, setRangeStart] = useState<string | null>(null)
  const [hoverDate, setHoverDate] = useState<string | null>(null)
  const [modal, setModal] = useState<any>(null)
  const [loadingAction, setLoadingAction] = useState(false)

  async function loadEvents() {
    if (!cabinId) return
    const res = await fetch("/api/calendar?cabin_id=" + cabinId)
    const data = await res.json()
    const formatted = (data.events || []).map((e: any) => {
      const endPlusOne = new Date(e.end + "T00:00:00")
      endPlusOne.setDate(endPlusOne.getDate() + 1)
      const color = e.reason === "system_booking" ? "#2e7d32" : e.reason === "transfer_pending" ? "#c0392b" : "#2563eb"
      const title = e.reason === "system_booking" ? "Confirmada" : e.reason === "transfer_pending" ? "Pendiente pago" : "Bloqueado"
      return {
        id: e.id,
        title: title,
        start: e.start,
        end: endPlusOne.toISOString().split("T")[0],
        color: color,
        allDay: true,
        display: "block",
        extendedProps: { reason: e.reason, booking: e.booking, booking_id: e.booking_id }
      }
    })
    setEvents(formatted)
  }

  useEffect(() => { loadEvents() }, [cabinId])

  function getPreviewEvents() {
    if (!rangeStart) return []
    const end = hoverDate && hoverDate >= rangeStart ? hoverDate : rangeStart
    const endPlusOne = new Date(end + "T00:00:00")
    endPlusOne.setDate(endPlusOne.getDate() + 1)
    return [{
      id: "__preview__",
      title: "Seleccionado",
      start: rangeStart,
      end: endPlusOne.toISOString().split("T")[0],
      backgroundColor: "rgba(122, 184, 122, 0.25)",
      borderColor: "#7ab87a",
      textColor: "#7ab87a",
      allDay: true,
      display: "block",
    }]
  }

  function isDateBlocked(dateStr: string) {
    return events.some((e: any) => {
      const start = new Date(e.start + "T00:00:00")
      const end = new Date(e.end + "T00:00:00")
      const clicked = new Date(dateStr + "T00:00:00")
      return clicked >= start && clicked < end
    })
  }

  async function deleteBlock(id: string) {
    setLoadingAction(true)
    await fetch("/api/calendar/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cabin_id: cabinId, id })
    })
    setModal(null)
    setLoadingAction(false)
    await loadEvents()
  }

  async function confirmBooking(bookingId: string, blockId: string) {
    setLoadingAction(true)
    const res = await fetch("/api/bookings/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ booking_id: bookingId, tenant_id: "11518e5f-6a0b-4bdc-bb6a-a1e142544579" })
    })
    if (!res.ok) { alert("Error al confirmar"); setLoadingAction(false); return }
    setModal(null)
    setLoadingAction(false)
    await loadEvents()
  }

  async function cancelBooking(bookingId: string, blockId: string) {
    if (!confirm("Cancelar esta reserva? Las fechas se liberar\u00e1n.")) return
    setLoadingAction(true)
    const res = await fetch("/api/bookings/cancel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ booking_id: bookingId, tenant_id: "11518e5f-6a0b-4bdc-bb6a-a1e142544579" })
    })
    if (!res.ok) { alert("Error al cancelar"); setLoadingAction(false); return }
    setModal(null)
    setLoadingAction(false)
    await loadEvents()
  }

  async function handleDateClick(info: any) {
    const date = info.dateStr
    if (date < TODAY) { alert("No se pueden modificar fechas pasadas"); return }
    if (isDateBlocked(date)) return

    if (!rangeStart) {
      setRangeStart(date)
      setHoverDate(date)
      return
    }

    const start = rangeStart < date ? rangeStart : date
    const end = rangeStart < date ? date : rangeStart

    if (!confirm("Bloquear del " + start + " al " + end + "?")) {
      setRangeStart(null); setHoverDate(null); return
    }

    const res = await fetch("/api/calendar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ start_date: start, end_date: end, cabin_id: cabinId })
    })
    const data = await res.json()
    if (data.error) alert("Error: " + data.error)

    setRangeStart(null); setHoverDate(null)
    await loadEvents()
  }

  function handleEventClick(info: any) {
    if (info.event.id === "__preview__") return
    const props = info.event.extendedProps
    setModal({
      id: info.event.id,
      reason: props.reason,
      booking: props.booking,
      booking_id: props.booking_id,
      start: info.event.startStr,
      end: info.event.endStr,
      title: info.event.title
    })
  }

  function handleMouseEnter(info: any) {
    if (!rangeStart) return
    const date = info.date.toISOString().split("T")[0]
    if (date >= TODAY && !isDateBlocked(date)) setHoverDate(date)
  }

  if (!cabinId) return <div style={{ padding: "32px", background: "#0a0f0a", color: "#f0ede8" }}>Error: cabin_id no encontrado</div>

  const s: Record<string, CSSProperties> = {
    page: { background: "#0a0f0a", minHeight: "100vh", color: "#f0ede8", fontFamily: "sans-serif" },
    nav: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 24px", borderBottom: "1px solid #ffffff0f", background: "#0a1510" },
    logo: { fontFamily: "Georgia, serif", fontSize: "20px", letterSpacing: "3px", color: "#e8d5a3", textTransform: "uppercase" as const },
    logoSpan: { color: "#7ab87a" },
    navLabel: { fontSize: "10px", color: "#5a7058", letterSpacing: "1.5px", textTransform: "uppercase" as const },
    body: { padding: "20px 16px", maxWidth: "700px", margin: "0 auto" },
    backBtn: { display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", background: "#162618", border: "1px solid #2a3e28", color: "#c8d8c0", fontSize: "13px", fontWeight: 600, padding: "11px 20px", borderRadius: "12px", textDecoration: "none", marginBottom: "20px" },
    eyebrow: { fontSize: "10px", letterSpacing: "2.5px", textTransform: "uppercase" as const, color: "#4a6a48", marginBottom: "6px" },
    title: { fontFamily: "Georgia, serif", fontSize: "22px", color: "#e8d5a3", marginBottom: "6px" },
    subtitle: { color: "#5a7058", fontSize: "12px", marginBottom: "16px", lineHeight: 1.5 },
    legendWrap: { display: "flex", gap: "12px", marginBottom: "14px", flexWrap: "wrap" as const },
    legendItem: { display: "flex", alignItems: "center", gap: "5px", fontSize: "11px", color: "#8a9e88" },
    legendDot: { borderRadius: "3px", width: "12px", height: "12px", display: "inline-block", flexShrink: 0 },
    rangeBar: { background: "#162618", border: "1px solid #7ab87a44", borderRadius: "10px", padding: "10px 14px", marginBottom: "12px", fontSize: "13px", color: "#c8d8c0", display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" as const },
    cancelBtn: { marginLeft: "auto", background: "none", border: "1px solid #2a3e28", borderRadius: "6px", padding: "3px 10px", cursor: "pointer", fontSize: "12px", color: "#8a9e88" },
    overlay: { position: "fixed" as const, top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.65)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px" },
    modal: { background: "#111a11", border: "1px solid #2a3e28", borderRadius: "16px", maxWidth: "400px", width: "100%", maxHeight: "90vh", overflowY: "auto" as const },
    modalHeader: { padding: "18px 20px", borderBottom: "1px solid #1e2e1e", display: "flex", justifyContent: "space-between", alignItems: "center" },
    modalBody: { padding: "16px 20px" },
    dataBox: { background: "#0d1a12", border: "1px solid #2a3e28", borderRadius: "10px", padding: "12px", marginBottom: "14px" },
    dataRow: { display: "flex", justifyContent: "space-between", fontSize: "12px", padding: "4px 0", borderBottom: "1px solid #ffffff07" },
    dataRowLast: { display: "flex", justifyContent: "space-between", fontSize: "12px", padding: "4px 0" },
    dataKey: { color: "#5a7058" },
    dataVal: { color: "#c8d8c0", fontWeight: 500 },
    moneyRow: { display: "flex", gap: "10px", marginBottom: "14px" },
    moneyBox: { flex: 1, background: "#0d1a12", border: "1px solid #2a3e28", borderRadius: "10px", padding: "10px", textAlign: "center" as const },
    moneyBoxGreen: { flex: 1, background: "#7ab87a14", border: "1px solid #7ab87a2a", borderRadius: "10px", padding: "10px", textAlign: "center" as const },
    moneyLabel: { fontSize: "10px", color: "#5a7058", marginBottom: "2px" },
    moneyLabelGreen: { fontSize: "10px", color: "#7ab87a", marginBottom: "2px" },
    moneyVal: { fontFamily: "Georgia, serif", fontSize: "18px", color: "#e8d5a3" },
    moneyValGreen: { fontFamily: "Georgia, serif", fontSize: "18px", color: "#7ab87a" },
    waBtn: { display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", background: "#25d366", color: "white", borderRadius: "10px", padding: "10px 14px", fontSize: "13px", fontWeight: 600, textDecoration: "none", marginBottom: "10px" },
    confirmBtn: { flex: 1, padding: "10px", border: "none", borderRadius: "10px", fontSize: "13px", fontWeight: 700, cursor: "pointer", background: "#27ae60", color: "white", fontFamily: "sans-serif" },
    cancelBookBtn: { flex: 1, padding: "10px", border: "1px solid #c0392b44", borderRadius: "10px", fontSize: "12px", fontWeight: 600, cursor: "pointer", background: "transparent", color: "#e67a7a", fontFamily: "sans-serif" },
    deleteBtn: { width: "100%", padding: "10px", border: "1px solid #c0392b44", borderRadius: "10px", fontSize: "12px", fontWeight: 600, cursor: "pointer", background: "transparent", color: "#e67a7a", fontFamily: "sans-serif", marginBottom: "8px" },
    closeBtn: { width: "100%", padding: "10px", border: "1px solid #2a3e28", borderRadius: "10px", fontSize: "12px", cursor: "pointer", background: "transparent", color: "#5a7058", fontFamily: "sans-serif" },
    badge: { fontSize: "10px", padding: "3px 10px", borderRadius: "8px", fontWeight: 600 },
  }

  function renderModal() {
    if (!modal) return null
    const isBooking = modal.booking && modal.booking_id
    const isManual = modal.reason === "manual"

    if (isManual) {
      return (
        <div style={s.overlay} onClick={() => setModal(null)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <div style={s.modalHeader}>
              <div>
                <div style={{ fontSize: "10px", letterSpacing: "2px", textTransform: "uppercase" as const, color: "#4a6a48", marginBottom: "4px" }}>Bloqueo manual</div>
                <div style={{ fontFamily: "Georgia, serif", fontSize: "18px", color: "#e8d5a3" }}>Fechas bloqueadas</div>
              </div>
              <div style={{ ...s.badge, color: "#2563eb", background: "#2563eb20", border: "1px solid #2563eb44" }}>Manual</div>
            </div>
            <div style={s.modalBody}>
              <div style={s.dataBox}>
                <div style={s.dataRow}><span style={s.dataKey}>Desde</span><span style={s.dataVal}>{formatDate(modal.start)}</span></div>
                <div style={s.dataRowLast}><span style={s.dataKey}>Hasta</span><span style={s.dataVal}>{modal.end ? formatDate(new Date(new Date(modal.end + "T00:00:00").getTime() - 86400000).toISOString().split("T")[0]) : ""}</span></div>
              </div>
              <button style={s.deleteBtn} disabled={loadingAction} onClick={() => {
                if (confirm("Liberar este bloqueo manual?")) deleteBlock(modal.id)
              }}>{loadingAction ? "Liberando..." : "Liberar bloqueo"}</button>
              <button style={s.closeBtn} onClick={() => setModal(null)}>Cerrar</button>
            </div>
          </div>
        </div>
      )
    }

    if (isBooking) {
      const b = modal.booking
      const info = parseNotes(b.notes || "")
      const nombre = info["Nombre"] || "Sin nombre"
      const whatsapp = info["WhatsApp"] || ""
      const emailVal = info["Email"] || ""
      const codigo = info["Codigo"] || info["Código"] || ""
      const tinajaDias = parseInt(info["Tinaja"] || "0") || 0
      const phone = cleanPhone(whatsapp)
      const isConfirmed = modal.reason === "system_booking"
      const isPending = modal.reason === "transfer_pending"

      return (
        <div style={s.overlay} onClick={() => setModal(null)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <div style={s.modalHeader}>
              <div>
                <div style={{ fontSize: "10px", letterSpacing: "2px", textTransform: "uppercase" as const, color: "#4a6a48", marginBottom: "4px" }}>Detalle de reserva</div>
                <div style={{ fontFamily: "Georgia, serif", fontSize: "18px", color: "#e8d5a3" }}>{nombre}</div>
              </div>
              {isConfirmed && <div style={{ ...s.badge, color: "#2e7d32", background: "#2e7d3220", border: "1px solid #2e7d3244" }}>Confirmada</div>}
              {isPending && <div style={{ ...s.badge, color: "#c0392b", background: "#c0392b20", border: "1px solid #c0392b44" }}>Pendiente</div>}
            </div>
            <div style={s.modalBody}>
              <div style={s.dataBox}>
                <div style={s.dataRow}><span style={s.dataKey}>Cabaña</span><span style={s.dataVal}>{decodeURIComponent(cabinName)}</span></div>
                <div style={s.dataRow}><span style={s.dataKey}>Fechas</span><span style={s.dataVal}>{formatDate(modal.start)} &#8594; {modal.end ? formatDate(new Date(new Date(modal.end + "T00:00:00").getTime() - 86400000).toISOString().split("T")[0]) : ""}</span></div>
                <div style={s.dataRow}><span style={s.dataKey}>Noches</span><span style={s.dataVal}>{b.nights}</span></div>
                <div style={s.dataRow}><span style={s.dataKey}>Personas</span><span style={s.dataVal}>{b.guests}</span></div>
                {tinajaDias > 0 && <div style={s.dataRow}><span style={s.dataKey}>Tinaja</span><span style={s.dataVal}>{tinajaDias} {tinajaDias === 1 ? "d\u00eda" : "d\u00edas"}</span></div>}
                {emailVal && <div style={s.dataRow}><span style={s.dataKey}>Correo</span><span style={s.dataVal}>{emailVal}</span></div>}
                <div style={s.dataRowLast}><span style={s.dataKey}>Código</span><span style={{ color: "#7ab87a", fontWeight: 600, fontFamily: "monospace", fontSize: "12px" }}>{codigo}</span></div>
              </div>

              <div style={s.moneyRow}>
                <div style={s.moneyBox}>
                  <div style={s.moneyLabel}>Total</div>
                  <div style={s.moneyVal}>{fmt(b.total_amount)}</div>
                </div>
                <div style={s.moneyBoxGreen}>
                  <div style={s.moneyLabelGreen}>Adelanto 20%</div>
                  <div style={s.moneyValGreen}>{fmt(b.deposit_amount)}</div>
                </div>
              </div>

              {phone && (
                <a href={"https://wa.me/" + phone.replace("+", "")} target="_blank" rel="noopener noreferrer" style={s.waBtn}>
                  {"WhatsApp: " + whatsapp}
                </a>
              )}

              {isPending && (
                <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
                  <button style={s.confirmBtn} disabled={loadingAction} onClick={() => confirmBooking(modal.booking_id, modal.id)}>
                    {loadingAction ? "..." : "Confirmar pago"}
                  </button>
                  <button style={s.cancelBookBtn} disabled={loadingAction} onClick={() => cancelBooking(modal.booking_id, modal.id)}>
                    {loadingAction ? "..." : "Cancelar"}
                  </button>
                </div>
              )}

              {isConfirmed && (
                <button style={s.deleteBtn} disabled={loadingAction} onClick={() => {
                  if (confirm("Esta reserva ya est\u00e1 confirmada.\n\nEst\u00e1s seguro que deseas cancelarla?")) {
                    if (confirm("Segunda confirmaci\u00f3n: Confirmas que quieres cancelar una reserva CONFIRMADA?")) {
                      cancelBooking(modal.booking_id, modal.id)
                    }
                  }
                }}>{loadingAction ? "Cancelando..." : "Cancelar reserva confirmada"}</button>
              )}

              <button style={s.closeBtn} onClick={() => setModal(null)}>Cerrar</button>
            </div>
          </div>
        </div>
      )
    }

    return (
      <div style={s.overlay} onClick={() => setModal(null)}>
        <div style={s.modal} onClick={e => e.stopPropagation()}>
          <div style={s.modalHeader}>
            <div>
              <div style={{ fontSize: "10px", letterSpacing: "2px", textTransform: "uppercase" as const, color: "#4a6a48", marginBottom: "4px" }}>Reserva</div>
              <div style={{ fontFamily: "Georgia, serif", fontSize: "18px", color: "#e8d5a3" }}>{modal.title}</div>
            </div>
          </div>
          <div style={s.modalBody}>
            <div style={s.dataBox}>
              <div style={s.dataRow}><span style={s.dataKey}>Desde</span><span style={s.dataVal}>{formatDate(modal.start)}</span></div>
              <div style={s.dataRowLast}><span style={s.dataKey}>Hasta</span><span style={s.dataVal}>{modal.end ? formatDate(new Date(new Date(modal.end + "T00:00:00").getTime() - 86400000).toISOString().split("T")[0]) : ""}</span></div>
            </div>
            <div style={{ fontSize: "11px", color: "#5a7058", marginBottom: "12px", lineHeight: 1.5 }}>
              {"Esta reserva no tiene datos de turista vinculados. Fue creada antes de la actualizaci\u00f3n del sistema."}
            </div>
            <button style={s.deleteBtn} disabled={loadingAction} onClick={() => {
              if (confirm("Liberar estas fechas?")) deleteBlock(modal.id)
            }}>{loadingAction ? "Liberando..." : "Liberar fechas"}</button>
            <button style={s.closeBtn} onClick={() => setModal(null)}>Cerrar</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={s.page}>
      <nav style={s.nav}>
        <div style={s.logo}>Ruka<span style={s.logoSpan}>traro</span></div>
        <div style={s.navLabel}>Calendario</div>
      </nav>

      <div style={s.body}>
        <a href={"/?token=" + token} style={s.backBtn}>{"\u2190 Volver a mis Cabañas"}</a>
        
        <div style={s.eyebrow}>Calendario de reservas</div>
        <div style={s.title}>{decodeURIComponent(cabinName)}</div>
        <div style={s.subtitle}>Toca una fecha libre para marcar entrada. Luego toca la fecha de salida.</div>

        <div style={s.legendWrap}>
          {[
            { color: "#2563eb", label: "Bloqueado manual" },
            { color: "#c0392b", label: "Pendiente pago (24h)" },
            { color: "#2e7d32", label: "Confirmada" },
          ].map(({ color, label }) => (
            <span key={label} style={s.legendItem}>
              <span style={{ ...s.legendDot, background: color }} />
              {label}
            </span>
          ))}
        </div>

        {rangeStart && (
          <div style={s.rangeBar}>
            Entrada: <strong>{rangeStart}</strong>
            {hoverDate && hoverDate !== rangeStart && (
              <> &#8594; Salida: <strong>{hoverDate}</strong></>
            )}
            <button onClick={() => { setRangeStart(null); setHoverDate(null) }} style={s.cancelBtn}>Cancelar</button>
          </div>
        )}

        <div className="cal-dark">
          <FullCalendar
            plugins={[dayGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            locale={esLocale}
            firstDay={1}
            dateClick={handleDateClick}
            eventClick={handleEventClick}
            dayCellDidMount={(info) => {
              info.el.addEventListener("mouseenter", () => handleMouseEnter(info))
            }}
            events={[...events, ...getPreviewEvents()]}
            height="auto"
            eventOrder="start"
            dayMaxEvents={2}
          />
        </div>

        <style>{"\
          .cal-dark .fc { font-size: 13px; background: #111a11; border-radius: 12px; border: 1px solid #2a3a2a; overflow: hidden; }\
          .cal-dark .fc-theme-standard td, .cal-dark .fc-theme-standard th { border-color: #1e2e1e; }\
          .cal-dark .fc-theme-standard .fc-scrollgrid { border-color: #1e2e1e; }\
          .cal-dark .fc-col-header-cell { background: #162618; }\
          .cal-dark .fc-col-header-cell-cushion { color: #5a7058; font-size: 11px; padding: 8px 4px; text-decoration: none; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; }\
          .cal-dark .fc-day-sun .fc-col-header-cell-cushion { color: #c0392b !important; }\
          .cal-dark .fc-daygrid-day-number { font-size: 14px; font-weight: 700; color: #c8d8c0; padding: 6px 8px; text-decoration: none; }\
          .cal-dark .fc-day-sun .fc-daygrid-day-number { color: #c0392b !important; font-weight: 700; }\
          .cal-dark .fc-daygrid-day { background: #111a11; transition: background 0.15s; }\
          .cal-dark .fc-daygrid-day:hover { background: #1a2a1a; }\
          .cal-dark .fc-day-today { background: #e8d5a30d !important; }\
          .cal-dark .fc-day-today .fc-daygrid-day-number { color: #e8d5a3 !important; }\
          .cal-dark .fc-day-past .fc-daygrid-day-number { color: #3a4a38; }\
          .cal-dark .fc-day-past.fc-day-sun .fc-daygrid-day-number { color: #c0392b44 !important; }\
          .cal-dark .fc-daygrid-day-frame { min-height: 70px; }\
          .cal-dark .fc-daygrid-event { border-radius: 4px; font-size: 10px; padding: 2px 6px; font-weight: 600; margin-bottom: 1px; border: none !important; cursor: pointer; }\
          .cal-dark .fc-daygrid-event-harness { }\
          .cal-dark .fc-daygrid-day-events { padding: 2px 3px 0; }\
          .cal-dark .fc-toolbar { padding: 14px 16px; background: #162618; border-bottom: 1px solid #1e2e1e; }\
          .cal-dark .fc-toolbar-title { font-size: 17px; font-weight: 700; color: #e8d5a3; font-family: Georgia, serif; text-transform: capitalize; }\
          .cal-dark .fc-button { font-size: 12px; padding: 6px 14px; background: #0d1a12; border: 1px solid #2a3e28; color: #8a9e88; border-radius: 8px; font-weight: 600; transition: all 0.15s; }\
          .cal-dark .fc-button:hover { background: #1a2a1a; color: #c8d8c0; border-color: #3a5a38; }\
          .cal-dark .fc-button-active { background: #7ab87a; color: #0d1a12; border-color: #7ab87a; }\
          .cal-dark .fc-button:disabled { opacity: 0.3; }\
          .cal-dark .fc-button:focus { box-shadow: 0 0 0 2px #7ab87a44; }\
          .cal-dark .fc-day-other .fc-daygrid-day-number { color: #2a3a2a; }\
          .cal-dark .fc-day-other.fc-day-sun .fc-daygrid-day-number { color: #c0392b33 !important; }\
          .cal-dark .fc-daygrid-more-link { color: #7ab87a; font-size: 10px; }\
          .cal-dark .fc-popover { background: #162618; border: 1px solid #2a3e28; }\
          .cal-dark .fc-popover-header { background: #1a2a1a; color: #e8d5a3; }\
          @media (max-width: 600px) {\
            .cal-dark .fc { font-size: 11px; }\
            .cal-dark .fc-toolbar { flex-direction: column; gap: 8px; padding: 10px 12px; }\
            .cal-dark .fc-toolbar-title { font-size: 15px; text-align: center; }\
            .cal-dark .fc-toolbar-chunk { display: flex; justify-content: center; }\
            .cal-dark .fc-daygrid-day-number { font-size: 13px; padding: 4px 6px 0; }\
            .cal-dark .fc-daygrid-day-frame { min-height: 52px; }\
            .cal-dark .fc-daygrid-event { font-size: 8px; padding: 1px 3px; }\
            .cal-dark .fc-button { font-size: 11px; padding: 5px 10px; }\
            .cal-dark .fc-col-header-cell-cushion { font-size: 9px; padding: 6px 2px; letter-spacing: 0.5px; }\
          }\
        "}</style>
      </div>

      {renderModal()}
    </div>
  )
}

export default function CalendarPage() {
  return (
    <Suspense fallback={<div style={{ padding: "32px", background: "#0a0f0a", minHeight: "100vh", color: "#5a7058", fontFamily: "sans-serif" }}>Cargando calendario...</div>}>
      <CalendarInner />
    </Suspense>
  )
}
