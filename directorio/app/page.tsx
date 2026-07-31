import Link from "next/link"
import { getPublishedCabins, normalizeAffiliateRef } from "../lib/data"
import { DESTINOS } from "../lib/destinos"
import CabinCard from "../components/CabinCard"

// ISR: se regenera cada hora (al agregar una cabaña, aparece sola — Fase 10).
export const revalidate = 3600

export default async function Home({ searchParams }: { searchParams?: { ref?: string | string[] } }) {
  const cabins = await getPublishedCabins()
  const affiliateRef = normalizeAffiliateRef(searchParams?.ref)
  const refQuery = affiliateRef ? `?ref=${encodeURIComponent(affiliateRef)}` : ""
  const signupHref = "mailto:contacto@takai.cl?subject=Quiero%20ser%20referente%20de%20Takai&body=Hola%2C%20quiero%20inscribirme%20en%20el%20programa%20de%20referidos%20de%20Takai.%0A%0ANombre%3A%0ARedes%20sociales%20o%20comunidad%3A%0AWhatsApp%3A"

  return (
    <main style={{ maxWidth: "1040px", margin: "0 auto", padding: "40px 20px" }}>
      <header style={{ textAlign: "center", marginBottom: "40px" }}>
        <h1 style={{ fontFamily: "Georgia, serif", fontSize: "34px", fontWeight: 400, margin: "0 0 12px", color: "#e8d5a3" }}>
          Cabañas en el sur de Chile
        </h1>
        <p style={{ color: "#8a9e88", fontSize: "16px", maxWidth: "560px", margin: "0 auto", lineHeight: 1.6 }}>
          Reserva directa con los dueños. Fotos reales, precios claros y disponibilidad al instante en los mejores destinos de La Araucanía y Los Ríos.
        </p>
      </header>

      <section style={{ marginBottom: "44px" }}>
        <h2 style={{ fontSize: "14px", textTransform: "uppercase", letterSpacing: "2px", color: "#5a7058", marginBottom: "16px" }}>Destinos</h2>
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          {DESTINOS.map((d) => (
            <Link key={d.slug} href={`/${d.slug}${refQuery}`} style={{ background: "#162618", border: "1px solid #2a3e28", borderRadius: "50px", padding: "10px 22px", color: "#e8d5a3", textDecoration: "none", fontSize: "14px" }}>
              {d.nombre}
            </Link>
          ))}
        </div>
      </section>

      <section>
        <h2 style={{ fontSize: "14px", textTransform: "uppercase", letterSpacing: "2px", color: "#5a7058", marginBottom: "16px" }}>Cabañas disponibles</h2>
        {cabins.length === 0 ? (
          <p style={{ color: "#8a9e88" }}>Pronto publicaremos cabañas aquí.</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "20px" }}>
            {cabins.map((c) => <CabinCard key={c.id} cabin={c} affiliateRef={affiliateRef} />)}
          </div>
        )}
      </section>

      <section style={{ marginTop: "56px", background: "#162618", border: "1px solid #2a3e28", borderRadius: "16px", padding: "32px 28px", textAlign: "center" }}>
        <div style={{ color: "#7ab87a", fontSize: "11px", fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", marginBottom: "10px" }}>
          Programa de referidos
        </div>
        <h2 style={{ fontFamily: "Georgia, serif", fontSize: "26px", fontWeight: 400, color: "#e8d5a3", margin: "0 0 12px" }}>
          Gana por recomendar buenas estadías
        </h2>
        <p style={{ color: "#8a9e88", fontSize: "15px", lineHeight: 1.7, maxWidth: "650px", margin: "0 auto 22px" }}>
          Si eres viajero, creador de contenido, influencer o mueves una comunidad, puedes ganar una comisión por cada reserva confirmada que llegue a Takai gracias a tu recomendación.
        </p>
        <a href={signupHref} style={{ display: "inline-block", background: "#7ab87a", color: "#0d1a12", borderRadius: "8px", padding: "13px 22px", textDecoration: "none", fontSize: "14px", fontWeight: 700 }}>
          Inscríbete como referente
        </a>
        <p style={{ color: "#5a7058", fontSize: "12px", lineHeight: 1.6, margin: "14px 0 0" }}>
          Te enviaremos un enlace personal para compartir y seguir tus reservas referidas.
        </p>
      </section>
    </main>
  )
}
