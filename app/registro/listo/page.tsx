"use client"
export const dynamic = "force-dynamic"

import { Suspense } from "react"
import { useSearchParams } from "next/navigation"

const BG = "#0d1a12"
const CARD = "#162618"
const BORDER = "#2a3e28"
const GOLD = "#e8d5a3"
const BODY = "#8a9e88"
const MUTED = "#5a7058"

// Página de regreso desde MercadoPago tras pagar la cuota de incorporación.
// No confirma el pago por sí sola: quien marca el cobro como pagado es el
// webhook de billing (external_reference "setup:<id>"). Aquí solo explicamos
// qué sigue, para no prometerle al dueño algo que aún no ocurrió.
function ListoInner() {
  const params = useSearchParams()
  const status = params.get("status") || params.get("collection_status") || ""
  const aprobado = status === "approved"

  return (
    <div style={{ background: BG, minHeight: "100vh", fontFamily: "sans-serif", color: "#f0ede8", padding: "56px 20px" }}>
      <div style={{ maxWidth: "520px", margin: "0 auto", textAlign: "center" as const }}>
        <div style={{ fontSize: "48px", marginBottom: "18px" }}>{aprobado ? "🌲" : "⏳"}</div>

        <h1 style={{ fontFamily: "Georgia,serif", fontSize: "27px", fontWeight: 400, color: GOLD, margin: "0 0 14px", lineHeight: 1.3 }}>
          {aprobado ? "Listo, recibimos tu pago" : "Recibimos tu registro"}
        </h1>

        <p style={{ fontSize: "14.5px", color: BODY, lineHeight: 1.85, marginBottom: "26px" }}>
          {aprobado
            ? "Estamos revisando los datos de tu alojamiento. En cuanto esté todo conforme activamos tu sistema y te enviamos por correo el acceso a tu panel y el enlace de tu página pública."
            : "Si el pago quedó en proceso, MercadoPago nos avisará en cuanto se acredite. Tu registro ya está guardado — no necesitas volver a llenarlo."}
        </p>

        <div style={{ background: CARD, border: "1px solid " + BORDER, borderRadius: "12px", padding: "20px", textAlign: "left" as const }}>
          <div style={{ fontSize: "11px", letterSpacing: "1.5px", color: MUTED, marginBottom: "12px" }}>QUÉ SIGUE</div>
          {[
            "Revisamos tus datos y tu cuenta bancaria.",
            "Activamos tu página y tu panel.",
            "Te escribimos al correo con tus accesos.",
          ].map((t, i) => (
            <div key={i} style={{ display: "flex", gap: "11px", alignItems: "flex-start", marginBottom: i === 2 ? 0 : "11px" }}>
              <span style={{ minWidth: "20px", height: "20px", borderRadius: "50%", border: "1px solid " + BORDER, color: BODY, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", flexShrink: 0 }}>
                {i + 1}
              </span>
              <span style={{ fontSize: "13.5px", color: BODY, lineHeight: 1.6 }}>{t}</span>
            </div>
          ))}
        </div>

        <p style={{ fontSize: "12px", color: MUTED, marginTop: "24px", lineHeight: 1.7 }}>
          Puedes cerrar esta ventana. Te avisamos por correo.
        </p>
      </div>
    </div>
  )
}

export default function RegistroListoPage() {
  return (
    <Suspense fallback={<div style={{ background: BG, minHeight: "100vh" }} />}>
      <ListoInner />
    </Suspense>
  )
}
