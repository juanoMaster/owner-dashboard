"use client"
// Botón click-to-WhatsApp POR CABAÑA dentro de las cards de las templates
// (Fase 6). ACTIVO por defecto desde 2026-07-10 (agente IA configurado por Juan):
// NEXT_PUBLIC_WA_CABIN_BUTTON=false en Vercel actúa como kill-switch sin tocar código.
// Apunta al número compartido del sistema con el tag [C:<cabin_id>] para que el
// agente sepa de qué cabaña se trata — mismo contrato que WhatsAppAgentButton.
// Si TWILIO_WHATSAPP_FROM no está configurado, agentWhatsapp llega null y el
// botón no se renderiza (no hay estado roto posible).

const ENABLED = process.env.NEXT_PUBLIC_WA_CABIN_BUTTON !== "false"

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
