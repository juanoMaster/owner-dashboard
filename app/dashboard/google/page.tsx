"use client"
import { useEffect, useState } from "react"
import { getPersistedToken } from "../../../lib/takai-token"

const C = {
  bg: "#0d1a12", card: "#162618", border: "#2a3e28",
  heading: "#e8d5a3", body: "#8a9e88", accent: "#7ab87a", muted: "#5a7058",
}

const STEPS = [
  "Entra a google.com/business desde el correo de Google del negocio.",
  "Busca tu cabaña por nombre y dirección. Si ya existe una ficha sin reclamar, reclámala; si no, crea una nueva.",
  "Completa categoría (Alojamiento/Cabañas), dirección o zona de servicio, teléfono y horario.",
  "Google te pedirá verificar (tarjeta postal, teléfono o video). Sigue el método que te ofrezca.",
  "Cuando esté verificada, copia el enlace de tu ficha (Compartir) y pégalo abajo. Si sabes tu Place ID, pégalo también.",
]

export default function GooglePage() {
  const [token, setToken] = useState<string | null>(null)
  const [placeId, setPlaceId] = useState("")
  const [url, setUrl] = useState("")
  const [status, setStatus] = useState<"idle" | "saving" | "ok" | "error">("idle")
  const [msg, setMsg] = useState("")

  useEffect(() => {
    const t = getPersistedToken()
    setToken(t)
    if (t) {
      fetch(`/api/tenant/gbp?token=${encodeURIComponent(t)}`)
        .then((r) => r.json())
        .then((d) => { if (d.google_place_id) setPlaceId(d.google_place_id); if (d.google_business_url) setUrl(d.google_business_url) })
        .catch(() => {})
    }
  }, [])

  function save() {
    if (!token) { setMsg("No se encontró tu sesión. Abre el panel desde tu enlace."); setStatus("error"); return }
    setStatus("saving"); setMsg("")
    fetch("/api/tenant/gbp", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, google_place_id: placeId, google_business_url: url }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.success) { setStatus("ok"); setMsg("Guardado. Tu ficha quedó vinculada.") }
        else { setStatus("error"); setMsg(d.error || "No se pudo guardar.") }
      })
      .catch(() => { setStatus("error"); setMsg("Error de conexión.") })
  }

  const input: React.CSSProperties = {
    width: "100%", boxSizing: "border-box", background: C.bg, color: C.body,
    border: `1px solid ${C.border}`, borderRadius: "6px", padding: "12px", fontSize: "14px", marginBottom: "12px",
  }

  return (
    <div style={{ background: C.bg, minHeight: "100vh", padding: "32px 20px", fontFamily: "sans-serif" }}>
      <div style={{ maxWidth: "640px", margin: "0 auto" }}>
        <h1 style={{ fontFamily: "Georgia, serif", color: C.heading, fontSize: "26px", fontWeight: 400, margin: "0 0 8px" }}>
          Ficha de Google de tu cabaña
        </h1>
        <p style={{ color: C.body, fontSize: "14px", lineHeight: 1.7, margin: "0 0 24px" }}>
          Aparecer en Google Maps trae reservas directas. Google exige verificar la identidad de cada local,
          así que esto lo creas tú una vez; nosotros te guiamos y guardamos el enlace.
        </p>

        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: "10px", padding: "24px", marginBottom: "20px" }}>
          <ol style={{ color: C.body, fontSize: "14px", lineHeight: 1.8, paddingLeft: "20px", margin: 0 }}>
            {STEPS.map((s, i) => (
              <li key={i} style={{ marginBottom: "10px" }}>{s}</li>
            ))}
          </ol>
        </div>

        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: "10px", padding: "24px" }}>
          <label style={{ color: C.heading, fontSize: "13px", display: "block", marginBottom: "6px" }}>Enlace de tu ficha de Google</label>
          <input style={input} value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://maps.app.goo.gl/..." />

          <label style={{ color: C.heading, fontSize: "13px", display: "block", marginBottom: "6px" }}>Place ID (opcional)</label>
          <input style={input} value={placeId} onChange={(e) => setPlaceId(e.target.value)} placeholder="ChIJ..." />

          {msg && <p style={{ color: status === "error" ? "#e63946" : C.accent, fontSize: "13px", margin: "4px 0 12px" }}>{msg}</p>}

          <button
            onClick={save}
            disabled={status === "saving"}
            style={{ background: C.accent, color: "#0a1510", border: "none", borderRadius: "6px", padding: "13px 28px", fontSize: "14px", fontWeight: 700, cursor: status === "saving" ? "default" : "pointer", opacity: status === "saving" ? 0.6 : 1 }}
          >
            {status === "saving" ? "Guardando…" : "Guardar ficha"}
          </button>
        </div>
      </div>
    </div>
  )
}
