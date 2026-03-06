"use client"

import { useEffect, useState } from "react"
import FullCalendar from "@fullcalendar/react"
import dayGridPlugin from "@fullcalendar/daygrid"
import interactionPlugin from "@fullcalendar/interaction"
import esLocale from "@fullcalendar/core/locales/es"

export default function CalendarPage() {

  const [events, setEvents] = useState<any[]>([])

  const cabinId = "f935a02e-2572-4272-9a08-af40b29f0912"

  async function loadEvents(){

    const res = await fetch(`/api/calendar?cabin_id=${cabinId}`)
    const data = await res.json()

    const eventsFormatted = data.events.map((e:any)=>{

      const endDate = new Date(e.end)
      endDate.setDate(endDate.getDate() + 1)

      return {
        title: e.type === "booking" ? "Reserva" : "Bloqueado",
        start: e.start,
        end: endDate,
        color: e.type === "booking" ? "#e63946" : "#6c757d"
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

    const existing = events.find((e:any)=>{
      const eventDate = new Date(e.start).toISOString().split("T")[0]
      return eventDate === date
    })

    if(existing){

      if(confirm(`¿Desbloquear el día ${date}?`)){

        await fetch("/api/calendar/delete",{
          method:"POST",
          headers:{'Content-Type':'application/json'},
          body:JSON.stringify({
            cabin_id:cabinId,
            date:date
          })
        })

      }

    }else{

      if(confirm(`¿Bloquear el día ${date}?`)){

        await fetch("/api/calendar",{
          method:"POST",
          headers:{'Content-Type':'application/json'},
          body:JSON.stringify({
            cabin_id:cabinId,
            date:date
          })
        })

      }

    }

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
        events={events}
        height="auto"
      />

    </div>

  )

}