import { Suspense } from "react"
import type { Metadata } from "next"
import HomeDashboardClient from "./components/HomeDashboardClient"

/** Manifest distinto al del resto del sitio: el icono del dueño debe abrir "/" (panel), no /inicio (turista). */
export const metadata: Metadata = {
  title: "Panel · Takai",
  description: "Panel de gestión de reservas",
  manifest: "/manifest-panel.json",
  appleWebApp: {
    capable: true,
    title: "Takai Panel",
  },
}

function DashboardFallback() {
  return (
    <div
      style={{
        background: "#0d1a12",
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "sans-serif",
        color: "#5a7058",
      }}
    >
      Cargando panel…
    </div>
  )
}

export default function HomePage() {
  return (
    <Suspense fallback={<DashboardFallback />}>
      <HomeDashboardClient />
    </Suspense>
  )
}
