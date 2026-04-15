"use client"
export const dynamic = "force-dynamic"

import { Suspense, useState } from "react"
import { useSearchParams } from "next/navigation"

function PagoFallidoInner() {
  const params = useSearchParams()
  const booking_id = params.get("booking_id") || ""
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function reintentar() {
    if (!booking_id) { setError("No se encontró la reserva para reintentar."); return }
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/mp/create-preference", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ booking_id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Error al crear preferencia")
      window.location.href = data.init_point
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al reintentar el pago")
      setLoading(false)
    }
  }

  return (
    <div style={{ background: "#0d1a12", minHeight: "100vh", fontFamily: "sans-serif", color: "#f0ede8", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
      <div style={{ maxWidth: "420px", width: "100%", textAlign: "center" as const }}>

        {/* Ícono ✗ */}
        <div style={{ width: "72px", height: "72px", borderRadius: "50%", background: "#e6394615", border: "2px solid #e6394644", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}>
          <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
            <path d="M11 11l14 14M25 11L11 25" stroke="#e67a7a" strokeWidth="3" strokeLinecap="round"/>
          </svg>
        </div>

        <div style={{ fontFamily: "Georgia,serif", fontSize: "28px", color: "#e8d5a3", marginBottom: "12px" }}>
          {"El pago no se completó"}
        </div>

        <div style={{ fontSize: "14px", color: "#8a9e88", lineHeight: 1.75, marginBottom: "32px" }}>
          {"Puedes intentarlo nuevamente o contactarnos por WhatsApp."}
        </div>

        {error && (
          <div style={{ background: "#e6394615", border: "1px solid #e6394633", borderRadius: "10px", padding: "12px 14px", fontSize: "13px", color: "#e67a7a", marginBottom: "16px", lineHeight: 1.6 }}>
            {error}
          </div>
        )}

        <button
          onClick={reintentar}
          disabled={loading}
          style={{ display: "block", width: "100%", background: "#7ab87a", color: "#0d1a12", border: "none", borderRadius: "12px", padding: "16px", fontSize: "15px", fontWeight: 700, cursor: loading ? "not-allowed" as const : "pointer", fontFamily: "sans-serif", marginBottom: "12px", opacity: loading ? 0.8 : 1 }}
        >
          {loading ? "Redirigiendo..." : "Intentar de nuevo"}
        </button>

        <a
          href="https://wa.me/56955230900"
          target="_blank"
          rel="noopener noreferrer"
          style={{ display: "block", width: "100%", boxSizing: "border-box" as const, background: "transparent", color: "#8a9e88", border: "1px solid #2a3e28", borderRadius: "12px", padding: "14px", fontSize: "14px", fontWeight: 500, textAlign: "center" as const, textDecoration: "none", fontFamily: "sans-serif" }}
        >
          Contactar por WhatsApp
        </a>

      </div>
    </div>
  )
}

export default function PagoFallidoPage() {
  return (
    <Suspense fallback={<div style={{ background: "#0d1a12", minHeight: "100vh" }} />}>
      <PagoFallidoInner />
    </Suspense>
  )
}
