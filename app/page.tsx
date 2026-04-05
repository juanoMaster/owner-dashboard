import { Suspense } from "react"
import HomeDashboardClient from "./components/HomeDashboardClient"

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
