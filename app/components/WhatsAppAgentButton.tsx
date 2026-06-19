"use client"
// Botón flotante click-to-WhatsApp hacia el agente IA (Fase 6).
// Apunta al número compartido del sistema con un mensaje pre-llenado que incluye
// el tag [C:<cabin_id>] para que el agente sepa de qué cabaña se trata.

export default function WhatsAppAgentButton({
  agentWhatsapp,
  cabinId,
  cabinName,
  businessName,
}: {
  agentWhatsapp?: string | null
  cabinId?: string | null
  cabinName?: string | null
  businessName?: string | null
}) {
  if (!agentWhatsapp || !cabinId) return null

  const number = agentWhatsapp.replace(/[^\d]/g, "")
  const text = `Hola 👋 Quiero consultar disponibilidad y precio de ${cabinName || businessName || "la cabaña"}. [C:${cabinId}]`
  const href = `https://wa.me/${number}?text=${encodeURIComponent(text)}`

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Consultar por WhatsApp"
      style={{
        position: "fixed", right: "20px", bottom: "20px", zIndex: 9999,
        background: "#25D366", color: "#fff", borderRadius: "50px",
        padding: "14px 20px", display: "flex", alignItems: "center", gap: "10px",
        boxShadow: "0 4px 16px rgba(0,0,0,0.35)", textDecoration: "none",
        fontFamily: "sans-serif", fontSize: "14px", fontWeight: 700,
      }}
    >
      <span style={{ fontSize: "20px", lineHeight: 1 }}>💬</span>
      <span>Consultar por WhatsApp</span>
    </a>
  )
}
