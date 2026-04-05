import { Suspense } from "react"
import HistorialPageClient from "../components/HistorialPageClient"

function Fallback() {
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
      Cargando historial…
    </div>
  )
}

export default function HistorialPage() {
  return (
    <Suspense fallback={<Fallback />}>
      <HistorialPageClient />
    </Suspense>
  )
}
