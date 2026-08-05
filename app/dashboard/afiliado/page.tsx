"use client"
import { Suspense, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"

// Panel del partner. Dos cosas: sus links listos para copiar (no tiene que
// armar ninguna URL a mano) y lo que lleva ganado.
//
// Regla que la pantalla deja explícita a propósito: solo se paga por las
// reservas que pasan POR SU LINK. Traer un alojamiento se paga una vez y no
// genera renta permanente sobre las reservas de ese alojamiento.

const C = {
  bg: "#0d1a12", card: "#162618", border: "#2a3e28",
  heading: "#e8d5a3", body: "#8a9e88", accent: "#7ab87a", muted: "#5a7058",
}

const DIRECTORIO = "https://takai-directorio.vercel.app"
const RESERVAS = "https://reservas.takai.cl"

function fmt(n: number, currency: string) {
  if (currency === "USD") return "$" + n.toFixed(2)
  if (currency === "COP") return "$" + Math.round(n).toLocaleString("es-CO")
  return "$" + Math.round(n).toLocaleString("es-CL")
}

interface Row {
  booking_code: string; cabin: string; business: string; currency: string
  check_in: string; check_out: string; total_amount: number; status: string; commission: number
}
interface Cabana {
  cabin_id: string; cabin: string; business: string; slug: string; price: number
}

function Inner() {
  const sp = useSearchParams()
  const token = sp.get("token") || ""
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState("")
  const [copiado, setCopiado] = useState<string | null>(null)
  const [busca, setBusca] = useState("")
  const [tab, setTab] = useState<"links" | "ganancias">("links")

  useEffect(() => {
    if (!token) { setError("Falta el token de acceso."); return }
    fetch(`/api/affiliate/stats?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((d) => { if (d.error) setError(d.error); else setData(d) })
      .catch(() => setError("Error de conexión."))
  }, [token])

  function copiar(valor: string, id: string) {
    navigator.clipboard?.writeText(valor)
    setCopiado(id)
    setTimeout(() => setCopiado(null), 1500)
  }

  if (error) return <Center>{error}</Center>
  if (!data) return <Center>Cargando…</Center>

  const code = data.affiliate.code
  const cur = data.bookings[0]?.currency || "CLP"
  const linkGeneral = `${DIRECTORIO}/?ref=${code}`
  const linkAlojamientos = `${RESERVAS}/registro?ref=${code}`
  const cabanas: Cabana[] = data.cabanas || []
  const filtradas = busca.trim()
    ? cabanas.filter((c) =>
        (c.cabin + " " + c.business).toLowerCase().includes(busca.trim().toLowerCase()))
    : cabanas

  const th: React.CSSProperties = { textAlign: "left", color: C.muted, fontSize: "11px", textTransform: "uppercase", letterSpacing: "1px", padding: "8px 10px", borderBottom: `1px solid ${C.border}` }
  const td: React.CSSProperties = { color: C.body, fontSize: "13px", padding: "10px", borderBottom: `1px solid ${C.border}` }
  const tabBtn = (activo: boolean): React.CSSProperties => ({
    background: "transparent", border: "none", borderBottom: activo ? `2px solid ${C.heading}` : "2px solid transparent",
    color: activo ? C.heading : C.muted, padding: "10px 16px", fontSize: "13px", fontWeight: activo ? 700 : 400,
    cursor: "pointer", fontFamily: "sans-serif",
  })

  return (
    <div style={{ background: C.bg, minHeight: "100vh", padding: "32px 20px", fontFamily: "sans-serif" }}>
      <div style={{ maxWidth: "880px", margin: "0 auto" }}>
        <h1 style={{ fontFamily: "Georgia, serif", color: C.heading, fontSize: "26px", fontWeight: 400, margin: "0 0 4px" }}>
          Hola, {data.affiliate.name}
        </h1>
        <p style={{ color: C.body, fontSize: "13px", margin: "0 0 24px" }}>
          Ganas <strong style={{ color: C.accent }}>{data.affiliate.commission_rate}%</strong> de cada reserva que llegue por tus links.
        </p>

        {/* Cifras */}
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginBottom: "8px" }}>
          <Stat label="Reservas por tus links" value={String(data.summary.bookings_count)} />
          <Stat label="Confirmadas" value={String(data.summary.confirmed_count)} />
          <Stat label="Volumen generado" value={fmt(data.summary.confirmed_total, cur)} />
          <Stat label="Has ganado" value={fmt(data.summary.earned, cur)} highlight />
        </div>

        <div style={{ display: "flex", gap: "4px", borderBottom: `1px solid ${C.border}`, margin: "20px 0 20px" }}>
          <button onClick={() => setTab("links")} style={tabBtn(tab === "links")}>Mis links</button>
          <button onClick={() => setTab("ganancias")} style={tabBtn(tab === "ganancias")}>Mis reservas</button>
        </div>

        {tab === "links" && (
          <>
            <LinkBox
              titulo="Tu link principal"
              detalle="Sirve para todo. El visitante puede recorrer todas las cabañas y reservar la que quiera: la comisión igual es tuya."
              valor={linkGeneral}
              copiado={copiado === "general"}
              onCopy={() => copiar(linkGeneral, "general")}
              destacado
            />
            <LinkBox
              titulo="Para recomendar Takai a dueños de cabañas"
              detalle="Si conoces a alguien con cabañas, mándale este link. Si se incorpora, ganas una comisión aparte, por una vez."
              valor={linkAlojamientos}
              copiado={copiado === "alojamientos"}
              onCopy={() => copiar(linkAlojamientos, "alojamientos")}
            />

            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: "10px", padding: "18px", marginTop: "18px" }}>
              <div style={{ color: C.heading, fontSize: "15px", marginBottom: "4px" }}>Link directo a una cabaña</div>
              <div style={{ color: C.muted, fontSize: "12.5px", lineHeight: 1.6, marginBottom: "14px" }}>
                Úsalo cuando publiques sobre una cabaña en particular. Lleva a esa ficha, con tu código incluido.
              </div>
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar cabaña o alojamiento…"
                style={{ width: "100%", boxSizing: "border-box", background: C.bg, border: `1px solid ${C.border}`, borderRadius: "8px", padding: "10px 12px", color: "#f0ede8", fontSize: "13px", marginBottom: "12px" }}
              />
              {filtradas.length === 0 && (
                <div style={{ color: C.muted, fontSize: "13px" }}>
                  {cabanas.length === 0 ? "Aún no hay cabañas publicadas en la red." : "Sin resultados."}
                </div>
              )}
              {filtradas.slice(0, 40).map((c) => {
                const url = `${DIRECTORIO}/cabana/${c.cabin_id}?ref=${code}`
                return (
                  <div key={c.cabin_id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px", padding: "9px 0", borderBottom: `1px solid ${C.border}`, flexWrap: "wrap" }}>
                    <div style={{ minWidth: "180px" }}>
                      <div style={{ color: "#f0ede8", fontSize: "13.5px" }}>{c.cabin}</div>
                      <div style={{ color: C.muted, fontSize: "11.5px" }}>{c.business} · desde {fmt(c.price, "CLP")}</div>
                    </div>
                    <button
                      onClick={() => copiar(url, c.cabin_id)}
                      style={{ background: "transparent", border: `1px solid ${C.border}`, color: C.accent, borderRadius: "6px", padding: "7px 14px", fontSize: "12px", cursor: "pointer", whiteSpace: "nowrap" }}
                    >
                      {copiado === c.cabin_id ? "Copiado" : "Copiar mi link"}
                    </button>
                  </div>
                )
              })}
            </div>

            <div style={{ background: "#12200f", border: "1px solid #2a5a24", borderRadius: "10px", padding: "16px", marginTop: "18px" }}>
              <div style={{ color: C.accent, fontSize: "13px", fontWeight: 600, marginBottom: "6px" }}>Cómo se te paga</div>
              <div style={{ color: C.body, fontSize: "12.5px", lineHeight: 1.75 }}>
                Cada reserva que llegue por tus links te paga {data.affiliate.commission_rate}%, y se van acumulando mes a mes sin tope.
                Solo cuentan las reservas que pasan por tu link: si un alojamiento recibe reservas por su cuenta, esas no generan comisión.
                La liquidación es mensual, sobre reservas confirmadas y pagadas.
              </div>
            </div>
          </>
        )}

        {tab === "ganancias" && (
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: "10px", overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "560px" }}>
                <thead><tr>
                  <th style={th}>Código</th><th style={th}>Cabaña</th><th style={th}>Fechas</th>
                  <th style={th}>Total</th><th style={th}>Estado</th><th style={th}>Tu comisión</th>
                </tr></thead>
                <tbody>
                  {data.bookings.length === 0 && (
                    <tr><td style={td} colSpan={6}>Aún no hay reservas por tus links.</td></tr>
                  )}
                  {data.bookings.map((r: Row, i: number) => (
                    <tr key={i}>
                      <td style={td}>{r.booking_code}</td>
                      <td style={td}>{r.cabin}<br /><span style={{ color: C.muted, fontSize: "11px" }}>{r.business}</span></td>
                      <td style={td}>{r.check_in} → {r.check_out}</td>
                      <td style={td}>{fmt(r.total_amount, r.currency)}</td>
                      <td style={{ ...td, color: r.status === "confirmed" ? C.accent : C.muted }}>
                        {r.status === "confirmed" ? "Confirmada" : "Pendiente"}
                      </td>
                      <td style={{ ...td, color: C.heading }}>{fmt(r.commission, r.currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function LinkBox({ titulo, detalle, valor, copiado, onCopy, destacado }: {
  titulo: string; detalle: string; valor: string; copiado: boolean; onCopy: () => void; destacado?: boolean
}) {
  return (
    <div style={{ background: C.card, border: `1px solid ${destacado ? C.accent : C.border}`, borderRadius: "10px", padding: "18px", marginBottom: "12px" }}>
      <div style={{ color: C.heading, fontSize: "15px", marginBottom: "4px" }}>{titulo}</div>
      <div style={{ color: C.muted, fontSize: "12.5px", lineHeight: 1.6, marginBottom: "12px" }}>{detalle}</div>
      <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
        <code style={{ flex: "1 1 260px", background: C.bg, border: `1px solid ${C.border}`, borderRadius: "8px", padding: "11px 12px", color: "#f0ede8", fontSize: "12.5px", wordBreak: "break-all" }}>
          {valor}
        </code>
        <button
          onClick={onCopy}
          style={{ background: copiado ? C.accent : "transparent", border: `1px solid ${C.accent}`, color: copiado ? C.bg : C.accent, borderRadius: "8px", padding: "11px 20px", fontSize: "13px", fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}
        >
          {copiado ? "¡Copiado!" : "Copiar"}
        </button>
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
