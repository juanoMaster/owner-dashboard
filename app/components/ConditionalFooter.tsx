"use client"

import { usePathname } from "next/navigation"

export default function ConditionalFooter() {
  const pathname = usePathname()
  if (pathname?.startsWith("/embed")) {
    return null
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "6px", padding: "20px 16px", borderTop: "1px solid #1a3020" }}>
      <a href="https://takai.cl" target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: "10px", textDecoration: "none", opacity: 0.55 }}>
        <img src="/takai-hawk-nobg.png" alt="Takai" style={{ height: "28px", width: "auto" }} />
        <span style={{ fontSize: "10px", color: "#4a6a48", letterSpacing: "2px", textTransform: "uppercase" }}>
          Creado por <strong style={{ color: "#7ab87a" }}>Takai.cl</strong>
        </span>
      </a>
      <span style={{ fontSize: "9px", color: "#2a4028", letterSpacing: "1px" }}>© 2025 Takai.cl · Todos los derechos reservados</span>
    </div>
  )
}
