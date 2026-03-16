"use client"

import { Suspense, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import FullCalendar from "@fullcalendar/react"
import dayGridPlugin from "@fullcalendar/daygrid"
import interactionPlugin from "@fullcalendar/interaction"
import esLocale from "@fullcalendar/core/locales/es"

const TODAY = new Date().toISOString().split("T")[0]

function CalendarInner() {
  const searchParams = useSearchParams()
  const cabinId = searchParams.get("cabin_id") || ""
  const cabinName = searchParams.get("cabin_name") || "Caba\u00f1a"
  const token = searchParams.get("token") || ""

  const [events, setEvents] = useState<any[]>([])
  const [rangeStart, setRangeStart] = useState<string | null>(null)
  const [hoverDate, setHoverDate] = useState<string | null>(null)

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
        extendedProps: { reason: e.reason }
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
      backgroundColor: "rgba(122, 184, 122, 0.2)",
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
    await fetch("/api/calendar/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cabin_id: cabinId, id })
    })
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

  async function handleEventClick(info: any) {
    if (info.event.id === "__preview__") return
    const reason = info.event.extendedProps.reason
    if (reason === "system_booking") {
      if (!confirm("Esta reserva ya est\u00e1 confirmada.\n\nEst\u00e1s seguro que deseas cancelarla?")) return
      if (!confirm("Segunda confirmaci\u00f3n: Confirmas que quieres cancelar una reserva CONFIRMADA?")) return
      await deleteBlock(info.event.id)
      return
    }
    if (reason === "transfer_pending") {
      if (!confirm("Este bloqueo es de una reserva pendiente de pago.\n\nLiberar estas fechas?")) return
      await deleteBlock(info.event.id)
      return
    }
    if (!confirm("Liberar este bloqueo manual?")) return
    await deleteBlock(info.event.id)
  }

  function handleMouseEnter(info: any) {
    if (!rangeStart) return
    const date = info.date.toISOString().split("T")[0]
    if (date >= TODAY && !isDateBlocked(date)) setHoverDate(date)
  }

  if (!cabinId) return <div style={{ padding: "32px", background: "#0a0f0a", color: "#f0ede8" }}>Error: cabin_id no encontrado</div>

  return (
    <div style={{ background: "#0a0f0a", minHeight: "100vh", color: "#f0ede8" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 24px", borderBottom: "1px solid #ffffff0f", background: "#0a1510" }}>
        <div style={{ fontFamily: "Georgia, serif", fontSize: "20px", letterSpacing: "3px", color: "#e8d5a3", textTransform: "uppercase" as const }}>
          Ruka<span style={{ color: "#7ab87a" }}>traro</span>
        </div>
        <a href={"/?token=" + token} style={{ background: "transparent", border: "1px solid #2a3e28", color: "#8a9e88", fontSize: "12px", padding: "7px 16px", borderRadius: "20px", textDecoration: "none" }}>
          {"\u2190 Mis caba\u00f1as"}
        </a>
      </div>

      <div style={{ padding: "20px 16px", maxWidth: "700px", margin: "0 auto", fontFamily: "sans-serif" }}>
        <div style={{ fontSize: "10px", letterSpacing: "2.5px", textTransform: "uppercase" as const, color: "#4a6a48", marginBottom: "6px" }}>Calendario</div>
        <div style={{ fontFamily: "Georgia, serif", fontSize: "22px", color: "#e8d5a3", marginBottom: "6px" }}>
          {decodeURIComponent(cabinName)}
        </div>
        <div style={{ color: "#5a7058", fontSize: "12px", marginBottom: "16px" }}>
          Toca una fecha libre para marcar entrada. Luego toca la fecha de salida.
        </div>

        <div style={{ display: "flex", gap: "12px", marginBottom: "14px", flexWrap: "wrap" as const }}>
          {[
            { color: "#2563eb", label: "Bloqueado manual" },
            { color: "#c0392b", label: "Pendiente pago (24h)" },
            { color: "#2e7d32", label: "Reserva confirmada" },
            { color: "rgba(122,184,122,0.2)", border: "#7ab87a", label: "Selecci\u00f3n activa" },
          ].map(({ color, border, label }) => (
            <span key={label} style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "11px", color: "#6a8a68" }}>
              <span style={{
                background: color,
                border: border ? "2px solid " + border : "none",
                borderRadius: "3px",
                width: "13px", height: "13px",
                display: "inline-block", flexShrink: 0
              }} />
              {label}
            </span>
          ))}
        </div>

        {rangeStart && (
          <div style={{
            background: "#162618",
            border: "1px solid #7ab87a44",
            borderRadius: "10px",
            padding: "10px 14px",
            marginBottom: "12px",
            fontSize: "13px",
            color: "#c8d8c0",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            flexWrap: "wrap" as const
          }}>
            Entrada: <strong>{rangeStart}</strong>
            {hoverDate && hoverDate !== rangeStart && (
              <> &#8594; Salida: <strong>{hoverDate}</strong></>
            )}
            <button
              onClick={() => { setRangeStart(null); setHoverDate(null) }}
              style={{
                marginLeft: "auto", background: "none",
                border: "1px solid #2a3e28", borderRadius: "6px",
                padding: "3px 10px", cursor: "pointer", fontSize: "12px", color: "#8a9e88"
              }}
            >
              Cancelar
            </button>
          </div>
        )}

        <div className="cal-dark">
          <FullCalendar
            plugins={[dayGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            locale={esLocale}
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
          .cal-dark .fc { font-size: 13px; background: #0d1a12; border-radius: 12px; border: 1px solid #2a3a2a; overflow: hidden; }\
          .cal-dark .fc-theme-standard td, .cal-dark .fc-theme-standard th { border-color: #1a2a1a; }\
          .cal-dark .fc-theme-standard .fc-scrollgrid { border-color: #1a2a1a; }\
          .cal-dark .fc-col-header-cell { background: #111a11; }\
          .cal-dark .fc-col-header-cell-cushion { color: #6a8a68; font-size: 11px; padding: 8px 4px; text-decoration: none; }\
          .cal-dark .fc-daygrid-day-number { font-size: 13px; font-weight: 600; color: #c8d8c0; padding: 6px 8px; text-decoration: none; }\
          .cal-dark .fc-daygrid-day { background: #0d1a12; }\
          .cal-dark .fc-day-today { background: #162618 !important; }\
          .cal-dark .fc-day-past .fc-daygrid-day-number { color: #3a4a38; }\
          .cal-dark .fc-daygrid-event { border-radius: 4px; font-size: 10px; padding: 1px 4px; font-weight: 600; margin-bottom: 1px; }\
          .cal-dark .fc-daygrid-event-harness { margin-bottom: 1px; }\
          .cal-dark .fc-daygrid-day-events { padding: 2px 2px 0; }\
          .cal-dark .fc-toolbar { padding: 12px 16px; }\
          .cal-dark .fc-toolbar-title { font-size: 16px; font-weight: 700; color: #e8d5a3; font-family: Georgia, serif; }\
          .cal-dark .fc-button { font-size: 12px; padding: 6px 12px; background: #162618; border: 1px solid #2a3e28; color: #7ab87a; border-radius: 8px; }\
          .cal-dark .fc-button:hover { background: #1e3020; }\
          .cal-dark .fc-button-active { background: #7ab87a; color: #0a0f0a; border-color: #7ab87a; }\
          .cal-dark .fc-button:disabled { opacity: 0.4; }\
          @media (max-width: 600px) {\
            .cal-dark .fc { font-size: 11px; }\
            .cal-dark .fc-toolbar { flex-direction: column; gap: 8px; }\
            .cal-dark .fc-toolbar-title { font-size: 15px; text-align: center; }\
            .cal-dark .fc-toolbar-chunk { display: flex; justify-content: center; }\
            .cal-dark .fc-daygrid-day-number { font-size: 11px; padding: 4px 4px 0; }\
            .cal-dark .fc-daygrid-event { font-size: 9px; padding: 1px 2px; }\
            .cal-dark .fc-daygrid-event-harness { position: relative !important; inset: unset !important; }\
            .cal-dark .fc-daygrid-day-frame { min-height: 60px; }\
            .cal-dark .fc-button { font-size: 11px; padding: 4px 8px; }\
            .cal-dark .fc-col-header-cell-cushion { font-size: 10px; padding: 6px 2px; }\
          }\
        "}</style>
      </div>
    </div>
  )
}

export default function CalendarPage() {
  return (
    <Suspense fallback={<div style={{ padding: "32px", background: "#0a0f0a", minHeight: "100vh" }}>Cargando calendario...</div>}>
      <CalendarInner />
    </Suspense>
  )
}