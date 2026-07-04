"use client"
// Botón click-to-WhatsApp POR CABAÑA dentro de las cards de las templates
// (follow-up de Fase 6). ESTRUCTURA LISTA PERO INACTIVA por decisión de Juan:
// se activa seteando NEXT_PUBLIC_WA_CABIN_BUTTON=true en Vercel, sin tocar código.
// Mientras el flag esté apagado, el botón flotante (WhatsAppAgentButton) sigue
// siendo el único punto de contacto con el agente IA.
// Apunta al número compartido del sistema con el tag [C:<cabin_id>] para que el
// agente sepa de qué cabaña se trata — mismo contrato que WhatsAppAgentButton.

const ENABLED = process.env.NEXT_PUBLIC_WA_CABIN_BUTTON === "true"

export default function WhatsAppCabinButton({
  agentWhatsapp,
  cabinId,
  cabinName,
}: {
  agentWhatsapp?: string | null
  cabinId: string
  cabinName: string
}) {
  if (!ENABLED || !agentWhatsapp || !cabinId) return null

  const number = agentWhatsapp.replace(/[^\d]/g, "")
  const text = `Hola 👋 Quiero consultar disponibilidad y precio de ${cabinName}. [C:${cabinId}]`
  const href = `https://wa.me/${number}?text=${encodeURIComponent(text)}`

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Consultar ${cabinName} por WhatsApp`}
      style={{
        display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
        width: "100%", marginTop: "10px", background: "#25D366", color: "#fff",
        borderRadius: "8px", padding: "12px 20px", fontSize: "13px", fontWeight: 700,
        textDecoration: "none", fontFamily: "sans-serif", boxSizing: "border-box",
      }}
    >
      <span style={{ fontSize: "16px", lineHeight: 1 }}>💬</span>
      <span>Consultar por WhatsApp</span>
    </a>
  )
}
