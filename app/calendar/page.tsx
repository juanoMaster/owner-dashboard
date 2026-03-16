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
  const cabinName = searchParams.get("cabin_name") || "Cabaña"
  const token = searchParams.get("token") || ""

  const [events, setEvents] = useState<any[]>([])
  const [rangeStart, setRangeStart] = useState<string | null>(null)
  const [hoverDate, setHoverDate] = useState<string | null>(null)

  async function loadEvents() {
    if (!cabinId) return
    const res = await fetch(`/api/calendar?cabin_id=${cabinId}`)
    const data = await res.json()
    const formatted = (data.events || []).map((e: any) => {
      const endPlusOne = new Date(e.end + "T00:00:00")
      endPlusOne.setDate(endPlusOne.getDate() + 1)
      const isBooking = e.reason === "system_booking"
      return {
        id: e.id,
        title: isBooking ? "✅ Reserva" : "🔒 Bloqueado",
        start: e.start,
        end: endPlusOne.toISOString().split("T")[0],
        color: isBooking ? "#2e7d32" : "#c0392b",
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
      title: "📅 Seleccionado",
      start: rangeStart,
      end: endPlusOne.toISOString().split("T")[0],
      backgroundColor: "rgba(192, 57, 43, 0.2)",
      borderColor: "#c0392b",
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

    if (!confirm(`¿Bloquear del ${start} al ${end}?`)) {
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
      if (!confirm("Esta reserva ya esta pagada.\n\n¿Estas seguro que deseas cancelarla?")) return
      if (!confirm("Segunda confirmacion: ¿Confirmas que quieres cancelar una reserva YA PAGADA?")) return
      await deleteBlock(info.event.id)
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

  if (!cabinId) return <div style={{ padding: "32px" }}>Error: cabin_id no encontrado</div>

  return (
    <div style={{
      padding: "20px 16px",
      fontFamily: "'Segoe UI', sans-serif",
      maxWidth: "680px",
      margin: "0 auto"
    }}>
      <a href={`/?token=${token}`} style={{ display: "inline-block", marginBottom: "16px", fontSize: "13px", color: "#c0392b", textDecoration: "none", fontWeight: "600" }}>
        ← Volver a mis cabañas
      </a>
      <h1 style={{ fontSize: "20px", fontWeight: "700", marginBottom: "4px" }}>
        Calendario — {decodeURIComponent(cabinName)}
      </h1>
      <p style={{ color: "#888", fontSize: "12px", marginBottom: "12px" }}>
        Toca una fecha libre para marcar entrada. Luego toca la fecha de salida.
      </p>

      <div style={{ display: "flex", gap: "12px", marginBottom: "14px", flexWrap: "wrap" }}>
        {[
          { color: "#2563eb", label: "Bloqueado manual" },
          { color: "#c0392b", label: "Pendiente pago (24h)" },
          { color: "#2e7d32", label: "Reserva confirmada" },
          { color: "rgba(192,57,43,0.2)", border: "#c0392b", label: "Selección activa" },
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
          border: "1px solid #c0392b",
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

export default function CalendarPage() {
  return (
    <Suspense fallback={<div style={{ padding: "32px" }}>Cargando calendario...</div>}>
      <CalendarInner />
    </Suspense>
  )
}