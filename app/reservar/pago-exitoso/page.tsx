"use client"
export const dynamic = "force-dynamic"

import { Suspense } from "react"
import { useSearchParams } from "next/navigation"

function PagoExitosoInner() {
  useSearchParams() // booking_id disponible si se necesita en el futuro

  return (
    <div style={{ background: "#0d1a12", minHeight: "100vh", fontFamily: "sans-serif", color: "#f0ede8", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
      <div style={{ maxWidth: "420px", width: "100%", textAlign: "center" as const }}>

        {/* Ícono ✓ */}
        <div style={{ width: "72px", height: "72px", borderRadius: "50%", background: "#7ab87a22", border: "2px solid #7ab87a55", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}>
          <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
            <path d="M8 18l7 7 13-13" stroke="#7ab87a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>

        <div style={{ fontFamily: "Georgia,serif", fontSize: "28px", color: "#e8d5a3", marginBottom: "12px" }}>
          {"¡Pago recibido!"}
        </div>

        <div style={{ fontSize: "14px", color: "#8a9e88", lineHeight: 1.75, marginBottom: "32px" }}>
          {"Tu reserva está confirmada. Recibirás un email con los detalles."}
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

export default function PagoExitosoPage() {
  return (
    <Suspense fallback={<div style={{ background: "#0d1a12", minHeight: "100vh" }} />}>
      <PagoExitosoInner />
    </Suspense>
  )
}
