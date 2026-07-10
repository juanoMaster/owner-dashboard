"use client"
// Botón click-to-WhatsApp POR CABAÑA dentro de las cards de las templates
// (Fase 6 + integración takai-agent). ACTIVO por defecto desde 2026-07-10:
// NEXT_PUBLIC_WA_CABIN_BUTTON=false en Vercel actúa como kill-switch sin tocar código.
// Mismo contrato que WhatsAppAgentButton (botón flotante):
// - Con número (agentWhatsapp): wa.me al número compartido del sistema, con
//   [<slug>] (ruteo de tenant del agente nuevo) y [C:<cabin_id>] (webhook legado).
// - Sin número: abre el chat web del agente en https://<slug>.ag.takai.cl/embed.

const ENABLED = process.env.NEXT_PUBLIC_WA_CABIN_BUTTON !== "false"
const AGENT_CHAT_DOMAIN = process.env.NEXT_PUBLIC_AGENT_CHAT_DOMAIN || "ag.takai.cl"

export default function WhatsAppCabinButton({
  agentWhatsapp,
  slug,
  cabinId,
  cabinName,
}: {
  agentWhatsapp?: string | null
  slug?: string | null
  cabinId: string
  cabinName: string
}) {
  if (!ENABLED) return null

  let href: string | null = null
  let label = "Consultar por WhatsApp"

  if (agentWhatsapp && cabinId) {
    const number = agentWhatsapp.replace(/[^\d]/g, "")
    const text = `Hola 👋 Quiero consultar disponibilidad y precio de ${cabinName}. [${slug || ""}] [C:${cabinId}]`
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
      aria-label={`Consultar ${cabinName} por WhatsApp`}
      style={{
        display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
        width: "100%", marginTop: "10px", background: "#25D366", color: "#fff",
        borderRadius: "8px", padding: "12px 20px", fontSize: "13px", fontWeight: 700,
        textDecoration: "none", fontFamily: "sans-serif", boxSizing: "border-box",
      }}
    >
      <span style={{ fontSize: "16px", lineHeight: 1 }}>💬</span>
      <span>{label}</span>
    </a>
  )
}
