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

  async function loadEvents(){

    const res = await fetch(`/api/calendar?cabin_id=${cabinId}`)
    const data = await res.json()

    const eventsFormatted = data.events.map((e:any)=>{

      const endDate = new Date(e.end)
      endDate.setDate(endDate.getDate() + 1)

      let title = "Bloqueado"
      let color = "#4a4a4a" // manual_block por defecto

      if (e.type === "system_booking" || e.type === "manual_booking") {
        title = "Reserva"
      }

      if (e.type === "system_booking") {
        color = "#2d6a4f" // verde
      } else if (e.type === "manual_booking") {
        color = "#e63946" // rojo
      } else if (e.type === "manual_block") {
        color = "#4a4a4a" // gris oscuro
      }

      return {
        id: e.id,
        title,
        start: e.start,
        end: endDate,
        color,
        allDay: true,
        display: "block",
        extendedProps: { type: e.type }
      }

    })

    setEvents(eventsFormatted)

  }

  useEffect(()=>{
    loadEvents()
  },[])

  async function handleDateClick(info:any){

    const date = info.dateStr

    const today = new Date().toISOString().split("T")[0]

    if(date < today){
      alert("No se pueden modificar fechas pasadas")
      return
    }

    const existing = findEventForDate(date)

    if (existing) {
      const type = existing?.extendedProps?.type

      if (type === "system_booking" || type === "manual_booking") {
        alert("Este día tiene una reserva confirmada y no se puede modificar")
        return
      }

      if (type === "manual_block") {
        if (confirm(`¿Desbloquear el día ${date}?`)) {
          await fetch("/api/calendar/delete",{
            method:"POST",
            headers:{'Content-Type':'application/json'},
            body:JSON.stringify({
              cabin_id:cabinId,
              id: existing.id
            })
          })
          await loadEvents()
        }
        return
      }

      alert("Ese día ya está ocupado")
      return
    }

    // Decisión mediante confirms: primero intentamos crear reserva manual,
    // si el usuario no acepta, preguntamos por bloqueo manual.
    let actionType: "reserva" | "bloqueo" | null = null

    const wantsManualBooking = window.confirm(
      `¿Crear Reserva Manual (Rojo) para el día ${date}?`
    )

    if (wantsManualBooking) {
      actionType = "reserva"
    } else {
      const wantsManualBlock = window.confirm(
        `¿Crear Bloqueo Manual (Gris) para el día ${date}?`
      )
      if (wantsManualBlock) {
        actionType = "bloqueo"
      }
    }

    if (!actionType) {
      return
    }

    await fetch("/api/calendar",{
      method:"POST",
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        cabin_id:cabinId,
        date:date,
        action_type: actionType
      })
    })

    await loadEvents()

  }

  async function handleEventClick(info: any) {
    const type = info?.event?.extendedProps?.type

    if (type === "system_booking") {
      alert("Esta es una reserva del sistema y no se puede borrar desde aquí")
      return
    }

    if (type === "manual_booking" || type === "manual_block") {
      if (!confirm("¿Desbloquear este día?")) return

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