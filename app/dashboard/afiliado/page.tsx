"use client"
import { Suspense, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"

const C = {
  bg: "#0d1a12", card: "#162618", border: "#2a3e28",
  heading: "#e8d5a3", body: "#8a9e88", accent: "#7ab87a", muted: "#5a7058",
}

function fmt(n: number, currency: string) {
  if (currency === "USD") return "$" + n.toFixed(2)
  if (currency === "COP") return "$" + Math.round(n).toLocaleString("es-CO")
  return "$" + Math.round(n).toLocaleString("es-CL")
}

interface Row {
  booking_code: string; cabin: string; business: string; currency: string
  check_in: string; check_out: string; total_amount: number; status: string; commission: number
}

function Inner() {
  const sp = useSearchParams()
  const token = sp.get("token") || ""
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!token) { setError("Falta el token de acceso."); return }
    fetch(`/api/affiliate/stats?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((d) => { if (d.error) setError(d.error); else setData(d) })
      .catch(() => setError("Error de conexión."))
  }, [token])

  if (error) return <Center>{error}</Center>
  if (!data) return <Center>Cargando…</Center>

  const cur = data.bookings[0]?.currency || "CLP"
  const th: React.CSSProperties = { textAlign: "left", color: C.muted, fontSize: "11px", textTransform: "uppercase", letterSpacing: "1px", padding: "8px 10px", borderBottom: `1px solid ${C.border}` }
  const td: React.CSSProperties = { color: C.body, fontSize: "13px", padding: "10px", borderBottom: `1px solid ${C.border}` }

  return (
    <div style={{ background: C.bg, minHeight: "100vh", padding: "32px 20px", fontFamily: "sans-serif" }}>
      <div style={{ maxWidth: "820px", margin: "0 auto" }}>
        <h1 style={{ fontFamily: "Georgia, serif", color: C.heading, fontSize: "26px", fontWeight: 400, margin: "0 0 4px" }}>
          Panel de afiliado — {data.affiliate.name}
        </h1>
        <p style={{ color: C.body, fontSize: "13px", margin: "0 0 24px" }}>
          Tu link: agrega <span style={{ color: C.accent }}>?ref={data.affiliate.code}</span> a cualquier URL del directorio. Comisión: {data.affiliate.commission_rate}%
        </p>

        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginBottom: "24px" }}>
          <Stat label="Reservas referidas" value={String(data.summary.bookings_count)} />
          <Stat label="Confirmadas" value={String(data.summary.confirmed_count)} />
          <Stat label="Generado (confirmadas)" value={fmt(data.summary.confirmed_total, cur)} />
          <Stat label="Tu comisión" value={fmt(data.summary.earned, cur)} highlight />
        </div>

        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: "10px", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>
              <th style={th}>Código</th><th style={th}>Cabaña</th><th style={th}>Fechas</th>
              <th style={th}>Total</th><th style={th}>Estado</th><th style={th}>Comisión</th>
            </tr></thead>
            <tbody>
              {data.bookings.length === 0 && (
                <tr><td style={td} colSpan={6}>Aún no hay reservas referidas.</td></tr>
              )}
              {data.bookings.map((r: Row, i: number) => (
                <tr key={i}>
                  <td style={td}>{r.booking_code}</td>
                  <td style={td}>{r.cabin}<br /><span style={{ color: C.muted, fontSize: "11px" }}>{r.business}</span></td>
                  <td style={td}>{r.check_in} → {r.check_out}</td>
                  <td style={td}>{fmt(r.total_amount, r.currency)}</td>
                  <td style={{ ...td, color: r.status === "confirmed" ? C.accent : C.muted }}>{r.status === "confirmed" ? "Confirmada" : "Pendiente"}</td>
                  <td style={{ ...td, color: C.heading }}>{fmt(r.commission, r.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div style={{ flex: "1 1 160px", background: C.card, border: `1px solid ${C.border}`, borderRadius: "10px", padding: "16px" }}>
      <div style={{ color: C.muted, fontSize: "11px", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "6px" }}>{label}</div>
      <div style={{ color: highlight ? C.accent : C.heading, fontFamily: "Georgia, serif", fontSize: "22px" }}>{value}</div>
    </div>
  )
}

function Center({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: C.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: C.body, fontFamily: "sans-serif", fontSize: "14px" }}>
      {children}
    </div>
  )
}

export default function AffiliatePage() {
  return <Suspense fallback={<Center>Cargando…</Center>}><Inner /></Suspense>
}
