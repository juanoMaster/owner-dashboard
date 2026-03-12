"use client"

import { useEffect, useState } from "react"
import FullCalendar from "@fullcalendar/react"
import dayGridPlugin from "@fullcalendar/daygrid"
import interactionPlugin from "@fullcalendar/interaction"
import esLocale from "@fullcalendar/core/locales/es"

const CABIN_ID = "f935a02e-2572-4272-9a08-af40b29f0912"
const TODAY = new Date().toISOString().split("T")[0]

export default function CalendarPage() {
  const [events, setEvents] = useState<any[]>([])
  const [rangeStart, setRangeStart] = useState<string | null>(null)

  async function loadEvents() {
    const res = await fetch(`/api/calendar?cabin_id=${CABIN_ID}`)
    const data = await res.json()

    const formatted = (data.events || []).map((e: any) => {
      // FullCalendar end es exclusivo, sumamos 1 día para que pinte el último día
      const endPlusOne = new Date(e.end + "T00:00:00")
      endPlusOne.setDate(endPlusOne.getDate() + 1)
      return {
        id: e.id,
        title: "Ocupado",
        start: e.start,
        end: endPlusOne.toISOString().split("T")[0],
        color: "#e63946",
        allDay: true,
        display: "block",
      }
    })

    setEvents(formatted)
  }

  useEffect(() => { loadEvents() }, [])

  function findEventForDate(dateStr: string) {
    return events.find((e: any) => {
      const start = new Date(e.start + "T00:00:00")
      const end = new Date(e.end + "T00:00:00") // ya tiene +1 día
      const clicked = new Date(dateStr + "T00:00:00")
      return clicked >= start && clicked < end
    })
  }

  async function handleDateClick(info: any) {
    const date = info.dateStr

    if (date < TODAY) {
      alert("No se pueden modificar fechas pasadas")
      return
    }

    // Si hay un bloque en esa fecha → preguntar si liberar
    const existing = findEventForDate(date)
    if (existing) {
      if (confirm("¿Liberar este bloque?")) {
        await fetch("/api/calendar/delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cabin_id: CABIN_ID, id: existing.id })
        })
        await loadEvents()
      }
      return
    }

    // Flujo de rango: primer clic = inicio, segundo clic = fin
    if (!rangeStart) {
      setRangeStart(date)
      alert(`Fecha de inicio seleccionada: ${date}\nAhora haz clic en la fecha de salida.`)
      return
    }

    const start = rangeStart < date ? rangeStart : date
    const end = rangeStart < date ? date : rangeStart

    if (!confirm(`¿Bloquear del ${start} al ${end}?`)) {
      setRangeStart(null)
      return
    }

    await fetch("/api/calendar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ start_date: start, end_date: end, cabin_id: CABIN_ID })
    })

    setRangeStart(null)
    await loadEvents()
  }

  return (
    <div style={{ padding: "40px", fontFamily: "sans-serif" }}>
      <h1>Calendario de Reservas</h1>

      {rangeStart && (
        <div style={{
          background: "#fff3cd",
          border: "1px solid #ffc107",
          borderRadius: "8px",
          padding: "12px 16px",
          marginBottom: "16px",
          fontSize: "15px"
        }}>
          📅 Fecha de entrada seleccionada: <strong>{rangeStart}</strong> — Ahora haz clic en la fecha de salida.
          <button
            onClick={() => setRangeStart(null)}
            style={{ marginLeft: "16px", cursor: "pointer", color: "#666" }}
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
        events={events}
        height="auto"
      />
    </div>
  )
}