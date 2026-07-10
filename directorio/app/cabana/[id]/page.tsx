import type { Metadata } from "next"
import { notFound } from "next/navigation"
import Link from "next/link"
import { getCabinById, getPublishedCabins, reservaUrl } from "../../../lib/data"
import { buildVacationRental, buildBreadcrumb } from "../../../lib/schema"
import JsonLd from "../../../components/JsonLd"

export const revalidate = 3600
const SITE = process.env.NEXT_PUBLIC_DIRECTORY_URL ?? "https://cabanasdelsur.cl"

// Pre-genera las páginas de cabaña publicables (SSG + ISR para nuevas).
export async function generateStaticParams() {
  const cabins = await getPublishedCabins()
  return cabins.map((c) => ({ id: c.id }))
}

function fmt(n: number | null, currency: string | null) {
  if (!n) return ""
  const c = currency || "CLP"
  if (c === "USD") return "$" + n.toFixed(0) + " USD"
  if (c === "COP") return "$" + Math.round(n).toLocaleString("es-CO")
  return "$" + Math.round(n).toLocaleString("es-CL")
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const cabin = await getCabinById(params.id)
  if (!cabin) return {}
  const title = `${cabin.name} — ${cabin.tenant.location_text || ""}`.trim()
  const description = (cabin.description || cabin.name).slice(0, 155)
  const url = `${SITE}/cabana/${cabin.id}`
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, type: "website", images: cabin.photos.slice(0, 1) },
    twitter: { card: "summary_large_image", images: cabin.photos.slice(0, 1) },
  }
}

export default async function CabinPage({ params }: { params: { id: string } }) {
  const cabin = await getCabinById(params.id)
  if (!cabin) notFound()

  const url = `${SITE}/cabana/${cabin.id}`
  const schema = buildVacationRental(cabin, url)
  const breadcrumb = buildBreadcrumb([
    { name: "Inicio", url: SITE },
    ...(cabin.destino ? [{ name: cabin.destino.nombre, url: `${SITE}/${cabin.destino.slug}` }] : []),
    { name: cabin.name, url },
  ])

  const amenities = Array.isArray(cabin.amenities)
    ? (cabin.amenities as any[]).map((a) => (typeof a === "string" ? a : a?.name)).filter(Boolean)
    : []

  // Mismo contrato que los botones de las landing: con número → wa.me con tags
  // [<slug>] (agente nuevo) + [C:<cabin_id>] (webhook legado); sin número → chat web.
  // NEXT_PUBLIC_AGENT_WHATSAPP = el chip en Meta Cloud API (setear solo cuando la
  // app Meta esté Live). NUNCA usar aquí el número Twilio de notificaciones.
  const agentWa = (process.env.NEXT_PUBLIC_AGENT_WHATSAPP || "").replace(/[^\d]/g, "")
  const agentChatDomain = process.env.NEXT_PUBLIC_AGENT_CHAT_DOMAIN || "ag.takai.cl"
  const waText = `Hola 👋 Quiero consultar disponibilidad y precio de ${cabin.name}. [${cabin.tenant.slug || ""}] [C:${cabin.id}]`
  const waHref = agentWa
    ? `https://wa.me/${agentWa}?text=${encodeURIComponent(waText)}`
    : cabin.tenant.slug ? `https://${cabin.tenant.slug}.${agentChatDomain}/embed` : null
  const waLabel = agentWa ? "Consultar por WhatsApp" : "Consultar disponibilidad"

  return (
    <main style={{ maxWidth: "920px", margin: "0 auto", padding: "32px 20px" }}>
      <JsonLd data={schema ? [schema, breadcrumb] : breadcrumb} />

      <nav style={{ marginBottom: "16px", fontSize: "13px" }}>
        <Link href="/" style={{ color: "#5a7058", textDecoration: "none" }}>Inicio</Link>
        {cabin.destino ? <> · <Link href={`/${cabin.destino.slug}`} style={{ color: "#5a7058", textDecoration: "none" }}>{cabin.destino.nombre}</Link></> : null}
      </nav>

      <h1 style={{ fontFamily: "Georgia, serif", fontSize: "30px", fontWeight: 400, color: "#e8d5a3", margin: "0 0 6px" }}>{cabin.name}</h1>
      <p style={{ color: "#8a9e88", fontSize: "14px", margin: "0 0 20px" }}>
        {cabin.tenant.location_text} · hasta {cabin.capacity} personas
        {cabin.review_summary && cabin.review_summary.count > 0 ? (
          <span style={{ color: "#e8d5a3" }}>
            {" "}· ★ {cabin.review_summary.average.toFixed(1)} ({cabin.review_summary.count} {cabin.review_summary.count === 1 ? "reseña" : "reseñas"})
          </span>
        ) : null}
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "8px", marginBottom: "24px" }}>
        {cabin.photos.slice(0, 8).map((src, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={i} src={src} alt={`${cabin.name} foto ${i + 1}`} style={{ width: "100%", height: "160px", objectFit: "cover", borderRadius: "8px", display: "block" }} />
        ))}
      </div>

      <p style={{ color: "#cbd6c4", fontSize: "15px", lineHeight: 1.8, whiteSpace: "pre-wrap" }}>{cabin.description}</p>

      {amenities.length > 0 ? (
        <div style={{ margin: "20px 0" }}>
          <h2 style={{ fontSize: "13px", textTransform: "uppercase", letterSpacing: "2px", color: "#5a7058", marginBottom: "10px" }}>Comodidades</h2>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {amenities.map((a, i) => (
              <span key={i} style={{ background: "#162618", border: "1px solid #2a3e28", borderRadius: "6px", padding: "6px 12px", color: "#8a9e88", fontSize: "13px" }}>{a}</span>
            ))}
          </div>
        </div>
      ) : null}

      {cabin.review_summary && cabin.review_summary.reviews.length > 0 ? (
        <div style={{ margin: "20px 0" }}>
          <h2 style={{ fontSize: "13px", textTransform: "uppercase", letterSpacing: "2px", color: "#5a7058", marginBottom: "10px" }}>
            Reseñas de huéspedes
          </h2>
          <div style={{ display: "grid", gap: "10px" }}>
            {cabin.review_summary.reviews.map((r, i) => (
              <div key={i} style={{ background: "#162618", border: "1px solid #2a3e28", borderRadius: "8px", padding: "14px 16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", marginBottom: "6px", flexWrap: "wrap" }}>
                  <span style={{ color: "#e8d5a3", fontSize: "14px", fontWeight: 700 }}>{r.author}</span>
                  <span style={{ color: "#e8d5a3", fontSize: "13px" }}>
                    {"★".repeat(Math.max(1, Math.min(5, Math.round(r.rating))))}
                    <span style={{ color: "#5a7058" }}>{r.date ? ` · ${r.date}` : ""}</span>
                  </span>
                </div>
                {r.body ? <p style={{ color: "#8a9e88", fontSize: "14px", lineHeight: 1.7, margin: 0, whiteSpace: "pre-wrap" }}>{r.body}</p> : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div style={{ position: "sticky", bottom: 0, background: "#0d1a12", borderTop: "1px solid #2a3e28", padding: "16px 0", marginTop: "24px", display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
        {cabin.base_price_night ? (
          <div style={{ color: "#7ab87a", fontSize: "18px", fontWeight: 700, marginRight: "auto" }}>
            {fmt(cabin.base_price_night, cabin.tenant.currency)} <span style={{ color: "#5a7058", fontWeight: 400, fontSize: "13px" }}>/ noche</span>
          </div>
        ) : <span style={{ marginRight: "auto" }} />}
        {waHref ? (
          <a href={waHref} target="_blank" rel="noopener noreferrer" style={{ background: "#25D366", color: "#fff", padding: "14px 22px", borderRadius: "8px", textDecoration: "none", fontWeight: 700, fontSize: "14px" }}>{waLabel}</a>
        ) : null}
        <a href={reservaUrl(cabin)} style={{ background: "#7ab87a", color: "#0d1a12", padding: "14px 28px", borderRadius: "8px", textDecoration: "none", fontWeight: 700, fontSize: "14px" }}>Reservar →</a>
      </div>
    </main>
  )
}
