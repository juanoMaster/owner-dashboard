import type { Metadata } from "next"
import { notFound } from "next/navigation"
import Link from "next/link"
import { DESTINOS, destinoBySlug } from "../../lib/destinos"
import { getCabinsByDestino } from "../../lib/data"
import CabinCard from "../../components/CabinCard"
import JsonLd from "../../components/JsonLd"
import { buildBreadcrumb } from "../../lib/schema"

export const revalidate = 3600

const SITE = process.env.NEXT_PUBLIC_DIRECTORY_URL ?? "https://cabanasdelsur.cl"

// Pre-genera las páginas de destino (SSG).
export function generateStaticParams() {
  return DESTINOS.map((d) => ({ destino: d.slug }))
}

export function generateMetadata({ params }: { params: { destino: string } }): Metadata {
  const d = destinoBySlug(params.destino)
  if (!d) return {}
  const title = `Cabañas en ${d.nombre}, ${d.region}`
  const description = `${d.intro.slice(0, 150)}`
  const url = `${SITE}/${d.slug}`
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, type: "website" },
  }
}

export default async function DestinoPage({ params }: { params: { destino: string } }) {
  const d = destinoBySlug(params.destino)
  if (!d) notFound()
  const cabins = await getCabinsByDestino(d.slug)

  const breadcrumb = buildBreadcrumb([
    { name: "Inicio", url: SITE },
    { name: d.nombre, url: `${SITE}/${d.slug}` },
  ])

  const h2: React.CSSProperties = { fontFamily: "Georgia, serif", fontSize: "22px", fontWeight: 400, color: "#e8d5a3", margin: "32px 0 12px" }
  const p: React.CSSProperties = { color: "#8a9e88", fontSize: "15px", lineHeight: 1.8, margin: 0 }

  return (
    <main style={{ maxWidth: "1040px", margin: "0 auto", padding: "40px 20px" }}>
      <JsonLd data={breadcrumb} />
      <nav style={{ marginBottom: "20px", fontSize: "13px" }}>
        <Link href="/" style={{ color: "#5a7058", textDecoration: "none" }}>← Todos los destinos</Link>
      </nav>

      <h1 style={{ fontFamily: "Georgia, serif", fontSize: "32px", fontWeight: 400, color: "#e8d5a3", margin: "0 0 8px" }}>
        Cabañas en {d.nombre}
      </h1>
      <p style={p}>{d.intro}</p>

      <h2 style={h2}>Qué hacer en {d.nombre}</h2>
      <p style={p}>{d.queHacer}</p>

      <h2 style={h2}>Teletrabajo y estadías largas</h2>
      <p style={p}>{d.teletrabajo}</p>

      <h2 style={h2}>Cabañas disponibles en {d.nombre}</h2>
      {cabins.length === 0 ? (
        <p style={p}>Aún no hay cabañas publicadas en {d.nombre}. Vuelve pronto.</p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "20px", marginTop: "16px" }}>
          {cabins.map((c) => <CabinCard key={c.id} cabin={c} />)}
        </div>
      )}

      <section style={{ marginTop: "44px", borderTop: "1px solid #2a3e28", paddingTop: "24px" }}>
        <h2 style={{ ...h2, fontSize: "16px" }}>Otros destinos</h2>
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          {DESTINOS.filter((x) => x.slug !== d.slug).map((x) => (
            <Link key={x.slug} href={`/${x.slug}`} style={{ background: "#162618", border: "1px solid #2a3e28", borderRadius: "50px", padding: "8px 18px", color: "#e8d5a3", textDecoration: "none", fontSize: "13px" }}>
              {x.nombre}
            </Link>
          ))}
        </div>
      </section>
    </main>
  )
}
