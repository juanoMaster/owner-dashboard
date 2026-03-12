"use client"

import { useEffect, useState } from "react"
import FullCalendar from "@fullcalendar/react"
import dayGridPlugin from "@fullcalendar/daygrid"
import interactionPlugin from "@fullcalendar/interaction"
import esLocale from "@fullcalendar/core/locales/es"

const CABIN_ID = "f935a02e-2572-4272-9a08-af40b29f0912"
const TODAY = new Date().toISOString().split("T")[0]

function getColor(reason: string) {
  if (reason === "system_booking") return "#2e7d32"
  return "#e07d2b"
}

export default function CalendarPage() {
  const [events, setEvents] = useState<any[]>([])
  const [rangeStart, setRangeStart] = useState<string | null>(null)
  const [hoverDate, setHoverDate] = useState<string | null>(null)

  async function loadEvents() {
    const res = await fetch(`/api/calendar?cabin_id=${CABIN_ID}`)
    const data = await res.json()
    const formatted = (data.events || []).map((e: any) => {
      const endPlusOne = new Date(e.end + "T00:00:00")
      endPlusOne.setDate(endPlusOne.getDate() + 1)
      return {
        id: e.id,
        title: e.reason === "system_booking" ? "✅ Reserva" : "🔒 Bloqueado",
        start: e.start,
        end: endPlusOne.toISOString().split("T")[0],
        color: getColor(e.reason),
        allDay: true,
        display: "block",
        extendedProps: { reason: e.reason }
      }
    })
    setEvents(formatted)
  }

  useEffect(() => { loadEvents() }, [])

  function getPreviewEvents() {
    if (!rangeStart) return []
    const end = hoverDate && hoverDate >= rangeStart ? hoverDate : rangeStart
    const endPlusOne = new Date(end + "T00:00:00")
    endPlusOne.setDate(endPlusOne.getDate() + 1)
    return [{
      id: "__preview__",
      title: "📅 Seleccionado",
      start: rangeStart,
      end: endPlusOne.toISOString().split("T")[0],
      color: "rgba(220, 53, 69, 0.25)",
      borderColor: "#dc3545",
      textColor: "#7f0010",
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
      body: JSON.stringify({ cabin_id: CABIN_ID, id })
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

    if (!confirm(`¿Bloquear del ${start} al ${end}?`)) {
      setRangeStart(null); setHoverDate(null); return
    }

    const res = await fetch("/api/calendar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ start_date: start, end_date: end, cabin_id: CABIN_ID })
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
      alert("Esta es una reserva confirmada. No se puede eliminar desde aquí.")
      return
    }
    if (!confirm("¿Liberar este bloqueo?")) return
    await deleteBlock(info.event.id)
  }

  function handleMouseEnter(info: any) {
    if (!rangeStart) return
    const date = info.date.toISOString().split("T")[0]
    if (date >= TODAY && !isDateBlocked(date)) setHoverDate(date)
  }

  return (
    <div style={{
      padding: "20px 16px",
      fontFamily: "'Segoe UI', sans-serif",
      maxWidth: "680px",
      margin: "0 auto"
    }}>
      <h1 style={{ fontSize: "20px", fontWeight: "700", marginBottom: "4px" }}>
        📅 Calendario de Reservas
      </h1>
      <p style={{ color: "#888", fontSize: "12px", marginBottom: "12px" }}>
        Toca una fecha libre para marcar entrada. Luego toca la fecha de salida.
      </p>

      <div style={{ display: "flex", gap: "10px", marginBottom: "12px", flexWrap: "wrap" }}>
        {[
          { color: "#e07d2b", label: "Bloqueado por Johanna" },
          { color: "#2e7d32", label: "Reserva confirmada" },
          { color: "rgba(220,53,69,0.2)", border: "#dc3545", label: "Selección activa" },
        ].map(({ color, border, label }) => (
          <span key={label} style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "12px" }}>
            <span style={{
              background: color,
              border: border ? `2px solid ${border}` : "none",
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
          background: "#fff0f0",
          border: "1px solid #f5a8a8",
          borderRadius: "8px",
          padding: "10px 14px",
          marginBottom: "12px",
          fontSize: "13px",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          flexWrap: "wrap"
        }}>
          🗓️ Entrada: <strong>{rangeStart}</strong>
          {hoverDate && hoverDate !== rangeStart && (
            <> → Salida: <strong>{hoverDate}</strong></>
          )}
          <button
            onClick={() => { setRangeStart(null); setHoverDate(null) }}
            style={{
              marginLeft: "auto", background: "none",
              border: "1px solid #ccc", borderRadius: "6px",
              padding: "3px 10px", cursor: "pointer", fontSize: "12px"
            }}
          >
            ✕ Cancelar
          </button>
        </div>
      )}

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
      />

      <style>{`
        .fc { font-size: 13px; }
        .fc-daygrid-day-number { font-size: 13px !important; font-weight: 600; color: #222 !important; }
        .fc-daygrid-event { border-radius: 4px !important; font-size: 11px !important; padding: 1px 4px !important; font-weight: 600; }
        .fc-toolbar-title { font-size: 16px !important; font-weight: 700 !important; }
        .fc-button { font-size: 12px !important; padding: 4px 10px !important; }
        .fc-day-today { background: #fffbea !important; }
        .fc-day-past .fc-daygrid-day-number { color: #bbb !important; }
      `}</style>
    </div>
  )
}