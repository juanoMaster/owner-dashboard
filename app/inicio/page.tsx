"use client"
import { Suspense } from "react"

function InicioInner() {
  const cabins = [
    {
      id: "f935a02e-2572-4272-9a08-af40b29f0912",
      name: "Cabaña Nº 1",
      capacity: 4,
      price: 30000,
    },
    {
      id: "100598b1-5232-46a0-adf5-6dc969ce2f9f",
      name: "Cabaña Nº 2",
      capacity: 5,
      price: 40000,
    },
  ]

  function fmt(n: number) {
    return "$" + n.toLocaleString("es-CL")
  }

  return (
    <div style={{ fontFamily: "sans-serif", background: "#0d1a12", minHeight: "100vh", color: "#f0ede8" }}>

      <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 24px", borderBottom: "1px solid #ffffff0f", background: "#0a1510" }}>
        <div style={{ fontSize: "20px", letterSpacing: "3px", color: "#e8d5a3", textTransform: "uppercase" as const }}>
          RUKA<span style={{ color: "#7ab87a" }}>TRARO</span>
        </div>
        <div style={{ background: "#ffffff08", border: "1px solid #ffffff12", color: "#a8b8a0", fontSize: "10px", padding: "5px 14px", borderRadius: "20px", letterSpacing: "1.5px", textTransform: "uppercase" as const }}>
          Licanray, Chile
        </div>
      </nav>

      <div style={{ padding: "48px 24px 44px", background: "linear-gradient(180deg,#0a1510 0%,#162618 60%,#1a3020 100%)", textAlign: "center" as const, borderBottom: "1px solid #7ab87a1a" }}>
        <div style={{ fontSize: "10px", letterSpacing: "3px", textTransform: "uppercase" as const, color: "#7ab87a", marginBottom: "14px" }}>Cabañas en la naturaleza</div>
        <div style={{ fontFamily: "Georgia, serif", fontSize: "36px", fontWeight: 700, color: "#f0ede8", lineHeight: 1.1, marginBottom: "12px" }}>Desconéctate del mundo</div>
        <div style={{ fontSize: "14px", color: "#8a9e88", lineHeight: 1.75, maxWidth: "340px", margin: "0 auto 24px" }}>
          Rodeados de bosque nativo y a pasos del Lago Calafquén — un refugio auténtico en el corazón de la Región de Los Ríos.
        </div>
        <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: "#7ab87a15", border: "1px solid #7ab87a2a", borderRadius: "20px", padding: "7px 16px", fontSize: "12px", color: "#7ab87a" }}>
          📍 Licanray · 5 min del Lago Calafquén
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", padding: "22px 20px", borderBottom: "1px solid #ffffff07" }}>
        {[
          { ico: "🏞️", name: "Lago Calafquén", desc: "Aguas cristalinas a 5 min" },
          { ico: "🌿", name: "Bosque Nativo", desc: "Coihues y arrayanes del sur" },
          { ico: "🪵", name: "Tinaja de Madera", desc: "Bajo las estrellas sureñas" },
          { ico: "🌋", name: "Volcán Villarrica", desc: "Vistas al volcán más activo" },
        ].map(a => (
          <div key={a.name} style={{ background: "#162618", border: "1px solid #ffffff0a", borderRadius: "14px", padding: "16px 14px", textAlign: "center" as const }}>
            <div style={{ fontSize: "24px", marginBottom: "8px" }}>{a.ico}</div>
            <div style={{ fontSize: "12px", fontWeight: 600, color: "#c8d8c0", marginBottom: "4px" }}>{a.name}</div>
            <div style={{ fontSize: "11px", color: "#5a7058", lineHeight: 1.5 }}>{a.desc}</div>
          </div>
        ))}
      </div>

      <div style={{ padding: "24px 20px" }}>
        <div style={{ fontSize: "10px", letterSpacing: "2.5px", textTransform: "uppercase" as const, color: "#6a7e68", marginBottom: "18px" }}>Elige tu cabaña</div>

        {cabins.map(cabin => (
          <div key={cabin.id} style={{ background: "#162618", border: "1px solid #2