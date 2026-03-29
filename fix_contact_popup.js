const fs = require("fs")

const content = `"use client"
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

  // popup de contacto
  const [showContact, setShowContact] = useState(false)
  const [contactNombre, setContactNombre] = useState("")
  const [contactMsg, setContactMsg] = useState("")
  const [contactLoading, setContactLoading] = useState(false)
  const [contactSent, setContactSent] = useState(false)

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

  async function handleContact() {
    if (!contactNombre.trim() || !contactMsg.trim()) return
    setContactLoading(true)
    try {
      await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: contactNombre,
          mensaje: contactMsg,
          tenant_name: tenant ? tenant.business_name : "",
        }),
      })
      setContactSent(true)
    } catch (e) { /* fail silently */ }
    setContactLoading(false)
  }

  function fmt(n: number) { return "$" + n.toLocaleString("es-CL") }

  if (loading) return (
    <div style={{ background: "#0a0f0a", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: "#4a6a48", fontFamily: "sans-serif", fontSize: "13px" }}>Cargando...</div>
    </div>
  )

  if (notFound || !tenant) return (
    <div style={{ background: "#0a0f0a", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: "#4a6a48", fontFamily: "sans-serif", fontSize: "13px" }}>{"Caba\\u00f1as no encontradas"}</div>
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
        <button onClick={() => { setShowContact(true); setContactSent(false); setContactNombre(""); setContactMsg("") }}
          style={{ background: "#7ab87a", color: "#0a0f0a", border: "none", borderRadius: "8px", padding: "8px 16px", fontSize: "12px", fontWeight: 700, cursor: "pointer", fontFamily: "sans-serif", letterSpacing: "0.5px" }}>
          {"Consultas"}
        </button>
      </div>

      {/* HERO */}
      <div style={{ paddingTop: "120px", paddingBottom: "40px", textAlign: "center", background: "linear-gradient(180deg, #0a1208 0%, #0a0f0a 100%)", padding: "80px 24px 40px" }}>
        <div style={{ fontSize: "10px", letterSpacing: "3px", textTransform: "uppercase", color: "#7ab87a", marginBottom: "12px", fontFamily: "sans-serif" }}>{"Alojamiento \\u00b7 Sur de Chile"}</div>
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
        <div style={{ fontSize: "10px", letterSpacing: "2.5px", textTransform: "uppercase", color: "#4a6a48", marginBottom: "12px", fontFamily: "sans-serif" }}>{"Elige tu caba\\u00f1a"}</div>
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
                  {"Reservar \\u2192"}
                </a>
              </div>
            )
          })}
        </div>
      </div>

      {/* FOOTER */}
      <div style={{ borderTop: "1px solid #1a261a", padding: "20px", textAlign: "center", fontFamily: "sans-serif" }}>
        <div style={{ fontSize: "10px", color: "#3a5a38", letterSpacing: "1.5px", textTransform: "uppercase" }}>
          {"Reservas gestionadas por "}
          <a href="https://takai.cl" style={{ color: "#5a7a58", textDecoration: "none" }}>TAKAI.CL</a>
        </div>
      </div>

      {/* POPUP CONTACTO */}
      {showContact && (
        <div
          style={{ position: "fixed", inset: 0, background: "#000000b0", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px" }}
          onClick={function(e: any) { if (e.target === e.currentTarget) setShowContact(false) }}
        >
          <div style={{ background: "#0a1510", border: "1px solid #2a3e28", borderRadius: "20px", padding: "28px", width: "100%", maxWidth: "400px", boxShadow: "0 20px 60px #00000080" }}>
            {contactSent ? (
              <div style={{ textAlign: "center", padding: "20px 0" }}>
                <div style={{ fontSize: "36px", marginBottom: "14px" }}>{"\\u2705"}</div>
                <div style={{ fontFamily: "Georgia,serif", fontSize: "20px", color: "#e8d5a3", marginBottom: "8px" }}>{"Mensaje enviado"}</div>
                <div style={{ fontSize: "13px", color: "#8a9e88", marginBottom: "24px" }}>{"Nos comunicaremos contigo a la brevedad."}</div>
                <button
                  onClick={function() { setShowContact(false); setContactSent(false) }}
                  style={{ width: "100%", padding: "13px", background: "#7ab87a", border: "none", borderRadius: "10px", color: "#0a0f0a", fontSize: "13px", fontWeight: 700, cursor: "pointer", fontFamily: "sans-serif" }}>
                  {"Cerrar"}
                </button>
              </div>
            ) : (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                  <div style={{ fontFamily: "Georgia,serif", fontSize: "18px", color: "#e8d5a3" }}>{"Consulta r\\u00e1pida"}</div>
                  <button
                    onClick={function() { setShowContact(false) }}
                    style={{ background: "transparent", border: "1px solid #2a3e28", borderRadius: "8px", color: "#5a7058", fontSize: "16px", cursor: "pointer", padding: "4px 10px", lineHeight: 1, fontFamily: "sans-serif" }}>
                    {"\\u00d7"}
                  </button>
                </div>

                <div style={{ fontSize: "11px", color: "#5a7058", letterSpacing: "1px", textTransform: "uppercase", marginBottom: "6px", fontFamily: "sans-serif" }}>{"Tu nombre"}</div>
                <input
                  value={contactNombre}
                  onChange={function(e: any) { setContactNombre(e.target.value) }}
                  placeholder={"C\\u00f3mo te llamás"}
                  style={{ display: "block", width: "100%", boxSizing: "border-box", background: "#162618", border: "1px solid #2a3e28", borderRadius: "8px", color: "#c8d8c0", fontSize: "14px", padding: "10px 12px", marginBottom: "14px", fontFamily: "sans-serif", outline: "none" }}
                />

                <div style={{ fontSize: "11px", color: "#5a7058", letterSpacing: "1px", textTransform: "uppercase", marginBottom: "6px", fontFamily: "sans-serif" }}>{"Tu consulta"}</div>
                <textarea
                  value={contactMsg}
                  onChange={function(e: any) { setContactMsg(e.target.value) }}
                  rows={4}
                  placeholder={"Fechas, disponibilidad, preguntas..."}
                  style={{ display: "block", width: "100%", boxSizing: "border-box", background: "#162618", border: "1px solid #2a3e28", borderRadius: "8px", color: "#c8d8c0", fontSize: "14px", padding: "10px 12px", marginBottom: "16px", fontFamily: "sans-serif", resize: "vertical", outline: "none" }}
                />

                <button
                  onClick={handleContact}
                  disabled={contactLoading || !contactNombre.trim() || !contactMsg.trim()}
                  style={{ width: "100%", padding: "13px", background: "#7ab87a", border: "none", borderRadius: "10px", color: "#0a0f0a", fontSize: "14px", fontWeight: 700, cursor: (contactLoading || !contactNombre.trim() || !contactMsg.trim()) ? "not-allowed" : "pointer", fontFamily: "sans-serif", letterSpacing: "0.5px", opacity: (!contactNombre.trim() || !contactMsg.trim()) ? 0.5 : 1 }}>
                  {contactLoading ? "Enviando..." : "ENVIAR"}
                </button>

                {wa && (
                  <div style={{ marginTop: "16px", paddingTop: "14px", borderTop: "1px solid #1a261a", display: "flex", alignItems: "center", gap: "10px" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "32px", height: "32px", background: "#25d36618", border: "1px solid #25d36630", borderRadius: "50%", flexShrink: 0 }}>
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="#25d366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                    </span>
                    <div>
                      <div style={{ fontSize: "10px", color: "#3a5a38", letterSpacing: "1px", textTransform: "uppercase", fontFamily: "sans-serif", marginBottom: "2px" }}>{"WhatsApp"}</div>
                      <div style={{ fontSize: "13px", color: "#8a9e88", fontFamily: "sans-serif" }}>{"+" + wa}</div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
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
`

fs.writeFileSync("app/[slug]/page.tsx", content, "utf8")
console.log("OK: app/[slug]/page.tsx escrito")
