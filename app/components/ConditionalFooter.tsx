"use client"

import { usePathname } from "next/navigation"

export default function ConditionalFooter() {
  const pathname = usePathname()
  if (pathname?.startsWith("/embed")) {
    return null
  }
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", padding: "16px", borderTop: "1px solid #1a2e1a" }}>
      <a href="https://takai.cl" target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: "8px", textDecoration: "none", opacity: 0.5 }}>
        <img src="/takai-hawk-nobg.png" alt="Takai" style={{ height: "32px", width: "auto" }} />
        <span style={{ fontSize: "10px", color: "#4a6a48", letterSpacing: "1px" }}>
          Creado por <strong style={{ color: "#5a7a58" }}>Takai.cl</strong>
        </span>
      </a>
    </div>
  )
}
