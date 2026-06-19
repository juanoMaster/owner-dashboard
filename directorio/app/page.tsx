import Link from "next/link"
import { getPublishedCabins } from "../lib/data"
import { DESTINOS } from "../lib/destinos"
import CabinCard from "../components/CabinCard"

// ISR: se regenera cada hora (al agregar una cabaña, aparece sola — Fase 10).
export const revalidate = 3600

export default async function Home() {
  const cabins = await getPublishedCabins()
  const destacadas = cabins.slice(0, 9)

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
            <Link key={d.slug} href={`/${d.slug}`} style={{ background: "#162618", border: "1px solid #2a3e28", borderRadius: "50px", padding: "10px 22px", color: "#e8d5a3", textDecoration: "none", fontSize: "14px" }}>
              {d.nombre}
            </Link>
          ))}
        </div>
      </section>

      <section>
        <h2 style={{ fontSize: "14px", textTransform: "uppercase", letterSpacing: "2px", color: "#5a7058", marginBottom: "16px" }}>Cabañas destacadas</h2>
        {destacadas.length === 0 ? (
          <p style={{ color: "#8a9e88" }}>Pronto publicaremos cabañas aquí.</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "20px" }}>
            {destacadas.map((c) => <CabinCard key={c.id} cabin={c} />)}
          </div>
        )}
      </section>
    </main>
  )
}
