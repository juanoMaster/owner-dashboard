"use client"
import { useState, CSSProperties } from "react"
import CabinCalendar from "./CabinCalendar"
import ManualBookingForm from "./ManualBookingForm"

interface Cabin { id: string; name: string; capacity: number; base_price_night: number }
interface Props { cabins: Cabin[]; tenantId: string }

function fmt(n: number) { return "$" + Math.round(n).toLocaleString("es-CL") }

export default function DashboardClient({ cabins, tenantId }: Props) {
  const [openCabinId, setOpenCabinId] = useState<string | null>(null)

  const s: Record<string, CSSProperties> = {
    page: { background: "#0a0f0a", minHeight: "100vh", color: "#f0ede8", fontFamily: "sans-serif" },
    nav: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 24px", borderBottom: "1px solid #ffffff0f", background: "#0a1510" },
    logo: { fontFamily: "Georgia, serif", fontSize: "20px", letterSpacing: "3px", color: "#e8d5a3", textTransform: "uppercase" as const },
    body: { padding: "24px 20px", maxWidth: "720px", margin: "0 auto" },
    eyebrow: { fontSize: "10px", letterSpacing: "2.5px", textTransform: "uppercase" as const, color: "#4a6a48", marginBottom: "6px" },
    title: { fontFamily: "Georgia, serif", fontSize: "22px", color: "#e8d5a3", marginBottom: "20px" },
    card: { background: "#111a11", border: "1px solid #2a3e28", borderRadius: "14px", marginBottom: "16px", overflow: "hidden" },
    cardHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 20px" },
    cabinName: { fontFamily: "Georgia, serif", fontSize: "18px", color: "#e8d5a3" },
    cabinMeta: { fontSize: "12px", color: "#5a7058", marginTop: "3px" },
    toggleBtn: { background: "#162618", border: "1px solid #2a3e28", color: "#7ab87a", borderRadius: "8px", padding: "8px 16px", fontSize: "12px", fontWeight: 600, cursor: "pointer" },
    calWrap: { padding: "0 20px 20px" },
  }

  const calStyles = ".cal-dark .fc { font-size: 13px; background: #111a11; border-radius: 12px; border: 1px solid #2a3a2a; overflow: hidden; } .cal-dark .fc-theme-standard td, .cal-dark .fc-theme-standard th { border-color: #1e2e1e; } .cal-dark .fc-col-header-cell { background: #162618; } .cal-dark .fc-col-header-cell-cushion { color: #5a7058; font-size: 11px; padding: 8px 4px; text-decoration: none; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; } .cal-dark .fc-daygrid-day-number { font-size: 14px; font-weight: 700; color: #c8d8c0; padding: 6px 8px; text-decoration: none; } .cal-dark .fc-daygrid-day { background: #111a11; } .cal-dark .fc-daygrid-day:hover { background: #1a2a1a; } .cal-dark .fc-day-today { background: #e8d5a30d !important; } .cal-dark .fc-day-today .fc-daygrid-day-number { color: #e8d5a3 !important; } .cal-dark .fc-day-past .fc-daygrid-day-number { color: #3a4a38; } .cal-dark .fc-daygrid-day-frame { min-height: 70px; } .cal-dark .fc-daygrid-event { border-radius: 4px; font-size: 10px; padding: 2px 6px; font-weight: 600; margin-bottom: 1px; border: none !important; cursor: pointer; } .cal-dark .fc-toolbar { padding: 14px 16px; background: #162618; border-bottom: 1px solid #1e2e1e; } .cal-dark .fc-toolbar-title { font-size: 17px; font-weight: 700; color: #e8d5a3; font-family: Georgia, serif; text-transform: capitalize; } .cal-dark .fc-button { font-size: 12px; padding: 6px 14px; background: #0d1a12; border: 1px solid #2a3e28; color: #8a9e88; border-radius: 8px; font-weight: 600; } .cal-dark .fc-button:hover { background: #1a2a1a; color: #c8d8c0; } .cal-dark .fc-day-sun .fc-daygrid-day-number { color: #c0392b !important; font-weight: 700; }"

  return (
    <div style={s.page}>
      <nav style={s.nav}>
        <div style={s.logo}>Ruka<span style={{ color: "#7ab87a" }}>traro</span></div>
        <div style={{ fontSize: "10px", color: "#5a7058", letterSpacing: "1.5px", textTransform: "uppercase" as const }}>Panel Propietario</div>
      </nav>
      <div style={s.body}>
        <div style={s.eyebrow}>{"Mis caba\u00f1as"}</div>
        <div style={s.title}>{"Bienvenida, Johanna"}</div>
        {cabins.map(cabin => (
          <div key={cabin.id} style={s.card}>
            <div style={s.cardHeader}>
              <div>
                <div style={s.cabinName}>{cabin.name}</div>
                <div style={s.cabinMeta}>{fmt(cabin.base_price_night)}/noche {"\u00b7"} Cap. {cabin.capacity} personas</div>
              </div>
              <button style={s.toggleBtn} onClick={() => setOpenCabinId(openCabinId === cabin.id ? null : cabin.id)}>
                {openCabinId === cabin.id ? "Cerrar calendario" : "Ver calendario"}
              </button>
            </div>
            {openCabinId === cabin.id && (
              <div style={s.calWrap}>
                <CabinCalendar cabin={cabin} tenantId={tenantId} />
              </div>
            )}
          </div>
        ))}
        <ManualBookingForm cabins={cabins} tenantId={tenantId} />
      </div>
      <style>{calStyles}</style>
    </div>
  )
}
