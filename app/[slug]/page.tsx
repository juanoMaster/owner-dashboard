"use client"
import { Suspense, useEffect, useState } from "react"
import { useParams } from "next/navigation"

interface Cabin { id: string; name: string; capacity: number; base_price_night: number }
interface TenantData { business_name: string; owner_whatsapp: string }

function SlugInner() {
  const params = useParams()
  const slug = params.slug as string
  const [tenant, setTenant] = useState<TenantData | null>(null)
  const [cabins, setCabins] = useState<Cabin[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(function() {
    if (!slug) return
    fetch("/api/tenant/" + slug + "/cabins")
      .then(function(r) {
        if (!r.ok) { setNotFound(true); setLoading(false); return null }
        return r.json()
      })
      .then(function(d) {
        if (!d) return
        setTenant(d.tenant)
        setCabins(d.cabins || [])
        setLoading(false)
      })
      .catch(function() { setNotFound(true); setLoading(false) })
  }, [slug])

  function fmt(n: number) { return "$" + n.toLocaleString("es-CL") }

  if (loading) return (
    <div style={{ background: "#0a0f0a", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: "#4a6a48", fontFamily: "sans-serif", fontSize: "13px" }}>Cargando...</div>
    </div>
  )

  if (notFound || !tenant) return (
    <div style={{ background: "#0a0f0a", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: "#4a6a48", fontFamily: "sans-serif", fontSize: "13px" }}>Cabañas no encontradas</div>
    </div>
  )

  const parts = tenant.business_name.split(" ")
  const first = parts[0]
  const rest = parts.slice(1).join(" ")
  const wa = tenant.owner_whatsapp ? tenant.owner_whatsapp.replace(/[^0-9]/g, "") : ""

  return (
    <div style={{ fontFamily: "Georgia, serif", background: "#0a0f0a", minHeight: "100vh", color: "#f0ede8" }}>

      {/* NAV */}
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 50, background: "rgba(10,15,10,0.92)", borderBottom: "1px solid #1a261a", padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", backdropFilter: "blur(10px)" }}>
        <div style={{ fontFamily: "Georgia, serif", fontSize: "18px", letterSpacing: "4px", textTransform: "uppercase" }}>
          <span style={{ color: "#e8d5a3" }}>{first}</span>
          {rest && <span style={{ color: "#7ab87a" }}>{" " + rest}</span>}
        </div>
        {wa && (
          <a href={"https://wa.me/" + wa} target="_blank" rel="noopener noreferrer"
            style={{ background: "#25D366", color: "#000", border: "none", borderRadius: "8px", padding: "8px 16px", fontSize: "12px", fontWeight: 700, textDecoration: "none", fontFamily: "sans-serif" }}>
            {"WhatsApp"}
          </a>
        )}
      </div>

      {/* HERO */}
      <div style={{ paddingTop: "120px", paddingBottom: "40px", textAlign: "center", background: "linear-gradient(180deg, #0a1208 0%, #0a0f0a 100%)", padding: "80px 24px 40px" }}>
        <div style={{ fontSize: "10px", letterSpacing: "3px", textTransform: "uppercase", color: "#7ab87a", marginBottom: "12px", fontFamily: "sans-serif" }}>Alojamiento · Sur de Chile</div>
        <div style={{ fontFamily: "Georgia, serif", fontSize: "clamp(28px, 5vw, 52px)", fontWeight: 700, color: "#f0ede8", lineHeight: 1.1, marginBottom: "16px" }}>
          <span style={{ color: "#e8d5a3" }}>{first}</span>
          {rest && <span style={{ color: "#b8d8a0" }}>{" " + rest}</span>}
        </div>
        <div style={{ fontFamily: "sans-serif", fontSize: "15px", color: "#8ab888", maxWidth: "360px", margin: "0 auto 24px", lineHeight: 1.7 }}>
          {"Reserva directo con el propietario. Sin intermediarios."}
        </div>
      </div>

      {/* CABAÑAS */}
      <div style={{ padding: "0 16px 32px", maxWidth: "800px", margin: "0 auto" }}>
        <div style={{ fontSize: "10px", letterSpacing: "2.5px", textTransform: "uppercase", color: "#4a6a48", marginBottom: "12px", fontFamily: "sans-serif" }}>{"Elige tu cabaña"}</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "12px" }}>
          {cabins.map(function(c) {
            return (
              <div key={c.id} style={{ background: "#111a11", border: "1px solid #2a3a2a", borderRadius: "14px", padding: "20px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
                <div style={{ display: "inline-flex", alignItems: "center", gap: "4px", background: "#7ab87a14", border: "1px solid #7ab87a22", color: "#7ab87a", fontSize: "9px", padding: "2px 7px", borderRadius: "10px", marginBottom: "14px", fontFamily: "sans-serif" }}>
                  <span style={{ width: "4px", height: "4px", borderRadius: "50%", background: "#7ab87a", display: "inline-block" }}/>
                  Disponible
                </div>
                <div style={{ fontFamily: "Georgia, serif", fontSize: "18px", color: "#e8d5a3", marginBottom: "4px" }}>{c.name}</div>
                <div style={{ fontSize: "12px", color: "#8a9e88", marginBottom: "14px", fontFamily: "sans-serif" }}>{"Hasta " + c.capacity + " personas"}</div>
                <div style={{ fontFamily: "Georgia, serif", fontSize: "30px", color: "#c8d8c0", marginBottom: "2px" }}>{fmt(c.base_price_night)}</div>
                <div style={{ fontSize: "11px", color: "#6a8a68", marginBottom: "16px", fontFamily: "sans-serif" }}>por noche</div>
                <a href={"/reservar?cabin_id=" + c.id + "&cabin_name=" + encodeURIComponent(c.name) + "&price=" + c.base_price_night + "&capacity=" + c.capacity}
                  style={{ display: "block", width: "100%", boxSizing: "border-box", background: "#7ab87a", color: "#0a0f0a", borderRadius: "10px", padding: "12px", fontSize: "13px", fontWeight: 700, textAlign: "center", textDecoration: "none", fontFamily: "sans-serif" }}>
                  {"Reservar →"}
                </a>
              </div>
            )
          })}
        </div>
      </div>

      {/* FOOTER */}
      <div style={{ borderTop: "1px solid #1a261a", padding: "20px", textAlign: "center", fontFamily: "sans-serif" }}>
        <div style={{ fontSize: "10px", color: "#3a5a38", letterSpacing: "1.5px", textTransform: "uppercase" }}>
          {"Reservas gestionadas por "}<a href="https://takai.cl" style={{ color: "#5a7a58", textDecoration: "none" }}>TAKAI.CL</a>
        </div>
      </div>
    </div>
  )
}

export default function SlugPage() {
  return (
    <Suspense fallback={<div style={{ background: "#0a0f0a", minHeight: "100vh" }}/>}>
      <SlugInner />
    </Suspense>
  )
}
