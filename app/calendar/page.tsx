"use client"

import { useEffect, useState } from "react"
import FullCalendar from "@fullcalendar/react"
import dayGridPlugin from "@fullcalendar/daygrid"
import interactionPlugin from "@fullcalendar/interaction"
import esLocale from "@fullcalendar/core/locales/es"

const CABIN_ID = "f935a02e-2572-4272-9a08-af40b29f0912"
const TODAY = new Date().toISOString().split("T")[0]

function getColor(reason: string) {
  if (reason === "system_booking") return "#e63946"  // rojo — reserva del sistema
  return "#e07d2b"                                    // naranja — bloqueo manual Johanna
}

export default function CalendarPage() {
  const [events, setEvents] = useState<any[]>([])
  const [rangeStart, setRangeStart] = useState<string | null>(null)

  async function loadEvents() {
    const res = await fetch(`/api/calendar?cabin_id=${CABIN_ID}`)
    const data = await res.json()

    const formatted = (data.events || []).map((e: any) => {
      const endPlusOne = new Date(e.end + "T00:00:00")
      endPlusOne.setDate(endPlusOne.getDate() + 1)
      return {
        id: e.id,
        title: e.reason === "system_booking" ? "🔴 Reserva" : "🟠 Bloqueado",
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

    if (date < TODAY) {
      alert("No se pueden modificar fechas pasadas")
      return
    }

    if (isDateBlocked(date)) return // el click sobre un bloque lo maneja eventClick

    if (!rangeStart) {
      setRangeStart(date)
      return
    }

    const start = rangeStart < date ? rangeStart : date
    const end = rangeStart < date ? date : rangeStart

    if (!confirm(`¿Bloquear del ${start} al ${end}?`)) {
      setRangeStart(null)
      return
    }

    const res = await fetch("/api/calendar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ start_date: start, end_date: end, cabin_id: CABIN_ID })
    })

    const data = await res.json()
    if (data.error) {
      alert("Error: " + data.error)
    }

    setRangeStart(null)
    await loadEvents()
  }

  async function handleEventClick(info: any) {
    const reason = info.event.extendedProps.reason
    if (reason === "system_booking") {
      alert("Este bloque es una reserva confirmada. No se puede eliminar desde aquí.")
      return
    }
    if (!confirm("¿Liberar este bloqueo?")) return
    await deleteBlock(info.event.id)
  }

  return (
    <div style={{
      padding: "32px",
      fontFamily: "'Segoe UI', sans-serif",
      maxWidth: "900px",
      margin: "0 auto"
    }}>
      <h1 style={{ fontSize: "24px", marginBottom: "8px" }}>📅 Calendario de Reservas</h1>
      <p style={{ color: "#666", marginBottom: "16px", fontSize: "14px" }}>
        Haz clic en una fecha libre para iniciar un bloqueo. Haz clic en un bloque para eliminarlo.
      </p>

      {/* Leyenda */}
      <div style={{ display: "flex", gap: "20px", marginBottom: "16px", fontSize: "14px" }}>
        <span>
          <span style={{ background: "#e07d2b", borderRadius: "4px", padding: "2px 10px", color: "white" }}>
            🟠 Bloqueado por Johanna
          </span>
        </span>
        <span>
          <span style={{ background: "#e63946", borderRadius: "4px", padding: "2px 10px", color: "white" }}>
            🔴 Reserva confirmada
          </span>
        </span>
      </div>

      {/* Aviso de rango activo */}
      {rangeStart && (
        <div style={{
          background: "#fff8e1",
          border: "1px solid #ffc107",
          borderRadius: "8px",
          padding: "12px 16px",
          marginBottom: "16px",
          fontSize: "14px",
          display: "flex",
          alignItems: "center",
          gap: "12px"
        }}>
          📅 Entrada seleccionada: <strong>{rangeStart}</strong> — Ahora haz clic en la fecha de salida.
          <button
            onClick={() => setRangeStart(null)}
            style={{
              marginLeft: "auto",
              background: "none",
              border: "1px solid #ccc",
              borderRadius: "6px",
              padding: "4px 10px",
              cursor: "pointer",
              fontSize: "13px"
            }}
          >
            Cancelar
          </button>
        </div>
      )}

      <FullCalendar
        plugins={[dayGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        locale={esLocale}
        dateClick={handleDateClick}
        eventClick={handleEventClick}
        events={events}
        height="auto"
        dayCellClassNames={(arg) => {
          const d = arg.date.toISOString().split("T")[0]
          if (d === rangeStart) return ["fc-day-selected"]
          return []
        }}
      />

      <style>{`
        .fc-day-selected { background: #fff3cd !important; }
        .fc-daygrid-event { border-radius: 4px !important; font-size: 12px !important; }
        .fc-toolbar-title { font-size: 18px !important; }
      `}</style>
    </div>
  )
}