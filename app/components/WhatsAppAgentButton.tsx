"use client"
// Botón flotante hacia el agente IA de Takai (Fase 6 + integración takai-agent).
// - Con número (agentWhatsapp): click-to-WhatsApp al número compartido del
//   sistema, con mensaje pre-llenado que incluye [<slug>] (ruteo de tenant del
//   agente nuevo en ag.takai.cl) y [C:<cabin_id>] (contrato del webhook legado).
// - Sin número (hoy): abre el chat web del agente en https://<slug>.ag.takai.cl/embed
//   para que el turista converse con el agente igual, sin contactar al dueño.

const AGENT_CHAT_DOMAIN = process.env.NEXT_PUBLIC_AGENT_CHAT_DOMAIN || "ag.takai.cl"

export default function WhatsAppAgentButton({
  agentWhatsapp,
  slug,
  cabinId,
  cabinName,
  businessName,
}: {
  agentWhatsapp?: string | null
  slug?: string | null
  cabinId?: string | null
  cabinName?: string | null
  businessName?: string | null
}) {
  let href: string | null = null
  let label = "Consultar por WhatsApp"

  if (agentWhatsapp && cabinId) {
    const number = agentWhatsapp.replace(/[^\d]/g, "")
    const text = `Hola 👋 Quiero consultar disponibilidad y precio de ${cabinName || businessName || "la cabaña"}. [${slug || ""}] [C:${cabinId}]`
    href = `https://wa.me/${number}?text=${encodeURIComponent(text)}`
  } else if (slug) {
    href = `https://${slug}.${AGENT_CHAT_DOMAIN}/embed`
    label = "Consultar disponibilidad"
  }

  if (!href) return null

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      style={{
        position: "fixed", right: "20px", bottom: "20px", zIndex: 9999,
        background: "#25D366", color: "#fff", borderRadius: "50px",
        padding: "14px 20px", display: "flex", alignItems: "center", gap: "10px",
        boxShadow: "0 4px 16px rgba(0,0,0,0.35)", textDecoration: "none",
        fontFamily: "sans-serif", fontSize: "14px", fontWeight: 700,
      }}
    >
      <span style={{ fontSize: "20px", lineHeight: 1 }}>💬</span>
      <span>{label}</span>
    </a>
  )
}
