"use client"
import { useState } from "react"
import { useParams } from "next/navigation"

const COLORS = {
  bg: "#0d1a12", card: "#162618", border: "#2a3e28",
  heading: "#e8d5a3", body: "#8a9e88", accent: "#7ab87a", muted: "#5a7058",
}

export default function ReviewPage() {
  const params = useParams()
  const bookingCode = String(params.booking_code || "")
  const [rating, setRating] = useState(0)
  const [hover, setHover] = useState(0)
  const [comment, setComment] = useState("")
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle")
  const [message, setMessage] = useState("")

  function submit() {
    if (rating < 1) { setMessage("Elige una calificación de 1 a 5 estrellas."); return }
    setStatus("sending"); setMessage("")
    fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ booking_code: bookingCode, rating, comment }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.success) { setStatus("done"); setMessage(d.message || "¡Gracias!") }
        else { setStatus("error"); setMessage(d.message || "No se pudo enviar.") }
      })
      .catch(() => { setStatus("error"); setMessage("Error de conexión.") })
  }

  return (
    <div style={{ background: COLORS.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px", fontFamily: "sans-serif" }}>
      <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: "10px", padding: "36px", maxWidth: "440px", width: "100%" }}>
        <h1 style={{ fontFamily: "Georgia, serif", color: COLORS.heading, fontSize: "24px", margin: "0 0 8px", fontWeight: 400 }}>
          ¿Cómo fue tu estadía?
        </h1>
        <p style={{ color: COLORS.body, fontSize: "14px", lineHeight: 1.6, margin: "0 0 24px" }}>
          Tu reseña ayuda a otros viajeros. Reserva <span style={{ color: COLORS.accent }}>{bookingCode}</span>.
        </p>

        {status === "done" ? (
          <p style={{ color: COLORS.accent, fontSize: "16px", lineHeight: 1.6 }}>{message}</p>
        ) : (
          <>
            <div style={{ display: "flex", gap: "8px", marginBottom: "24px" }}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  onMouseEnter={() => setHover(n)}
                  onMouseLeave={() => setHover(0)}
                  onClick={() => setRating(n)}
                  style={{
                    background: "none", border: "none", cursor: "pointer", fontSize: "34px", padding: 0,
                    color: (hover || rating) >= n ? "#e8b84c" : COLORS.muted, lineHeight: 1,
                  }}
                  aria-label={`${n} estrellas`}
                >★</button>
              ))}
            </div>

            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Cuéntanos qué te gustó (opcional)"
              maxLength={1000}
              rows={4}
              style={{
                width: "100%", boxSizing: "border-box", background: COLORS.bg, color: COLORS.body,
                border: `1px solid ${COLORS.border}`, borderRadius: "6px", padding: "12px", fontSize: "14px",
                fontFamily: "sans-serif", resize: "vertical", marginBottom: "16px",
              }}
            />

            {message && status !== "sending" && (
              <p style={{ color: status === "error" ? "#e63946" : COLORS.body, fontSize: "13px", margin: "0 0 12px" }}>{message}</p>
            )}

            <button
              onClick={submit}
              disabled={status === "sending"}
              style={{
                width: "100%", background: COLORS.accent, color: "#0a1510", border: "none", borderRadius: "6px",
                padding: "14px", fontSize: "14px", fontWeight: 700, letterSpacing: "1px", cursor: status === "sending" ? "default" : "pointer",
                opacity: status === "sending" ? 0.6 : 1,
              }}
            >
              {status === "sending" ? "Enviando…" : "Enviar reseña"}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
