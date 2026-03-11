"use client"

import { useEffect, useState } from "react"
import FullCalendar from "@fullcalendar/react"
import dayGridPlugin from "@fullcalendar/daygrid"
import interactionPlugin from "@fullcalendar/interaction"
import esLocale from "@fullcalendar/core/locales/es"

export default function CalendarPage() {

  const [events, setEvents] = useState<any[]>([])

  const cabinId = "f935a02e-2572-4272-9a08-af40b29f0912"

  function findEventForDate(dateStr: string) {
    const clicked = new Date(`${dateStr}T00:00:00`)
    return events.find((e: any) => {
      const start = new Date(e.start)
      const end = new Date(e.end)
      return clicked >= start && clicked < end
    })
  }

  async function loadEvents() {
    const res = await fetch(`/api/calendar?cabin_id=${cabinId}`)
    const data = await res.json()
    const list = data.events || []

    const eventsFormatted = list.map((e: any) => {
      const endDate = new Date(e.end)
      endDate.setDate(endDate.getDate() + 1)
      return {
        id: e.id,
        title: "Ocupado",
        start: e.start,
        end: endDate,
        color: "#e63946",
        allDay: true,
        display: "block",
        extendedProps: {}
      }
    })

    setEvents(eventsFormatted)
  }

  useEffect(()=>{
    loadEvents()
  },[])

  async function handleDateClick(info: any) {
    const date = info.dateStr
    const today = new Date().toISOString().split("T")[0]
    if (date < today) {
      alert("No se pueden modificar fechas pasadas")
      return
    }

    const existing = findEventForDate(date)
    if (existing) {
      if (confirm("¿Liberar este día?")) {
        await fetch("/api/calendar/delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cabin_id: cabinId,
            id: existing.id
          })
        })
        await loadEvents()
      }
      return
    }

    if (!confirm("¿Marcar este día como ocupado?")) return

    await fetch("/api/calendar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date,
        cabin_id: cabinId
      })
    })
    await loadEvents()
  }

  async function handleEventClick(info: any) {
    if (!confirm("¿Liberar este día?")) return

    await fetch("/api/calendar/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cabin_id: cabinId,
        id: info.event.id
      })
    })
    await loadEvents()
  }

  return (

    <div style={{padding:"40px"}}>

      <h1>Calendario de Reservas</h1>

      <FullCalendar
        plugins={[dayGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        locale={esLocale}
        dateClick={handleDateClick}
        eventClick={handleEventClick}
        events={events}
        height="auto"
      />

    </div>

  )

}