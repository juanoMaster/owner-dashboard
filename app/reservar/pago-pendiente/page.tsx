"use client"
export const dynamic = "force-dynamic"

import { Suspense } from "react"
import { useSearchParams } from "next/navigation"

function PagoPendienteInner() {
  useSearchParams() // booking_id disponible si se necesita en el futuro

  return (
    <div style={{ background: "#0d1a12", minHeight: "100vh", fontFamily: "sans-serif", color: "#f0ede8", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
      <div style={{ maxWidth: "420px", width: "100%", textAlign: "center" as const }}>

        {/* Ícono ⏳ */}
        <div style={{ fontSize: "56px", marginBottom: "20px", lineHeight: 1 }}>{"⏳"}</div>

        <div style={{ fontFamily: "Georgia,serif", fontSize: "28px", color: "#e8d5a3", marginBottom: "12px" }}>
          {"Pago en proceso"}
        </div>

        <div style={{ fontSize: "14px", color: "#8a9e88", lineHeight: 1.75, marginBottom: "32px" }}>
          {"Tu pago está siendo procesado. Te notificaremos por email cuando se confirme."}
        </div>

        <a
          href="/"
          style={{ display: "block", width: "100%", boxSizing: "border-box" as const, background: "#7ab87a", color: "#0d1a12", border: "none", borderRadius: "12px", padding: "16px", fontSize: "15px", fontWeight: 700, textAlign: "center" as const, textDecoration: "none", fontFamily: "sans-serif" }}
        >
          Volver al inicio
        </a>

      </div>
    </div>
  )
}

export default function PagoPendientePage() {
  return (
    <Suspense fallback={<div style={{ background: "#0d1a12", minHeight: "100vh" }} />}>
      <PagoPendienteInner />
    </Suspense>
  )
}
