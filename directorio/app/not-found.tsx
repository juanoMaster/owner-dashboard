import Link from "next/link"

export default function NotFound() {
  return (
    <main style={{ maxWidth: "560px", margin: "0 auto", padding: "80px 20px", textAlign: "center" }}>
      <h1 style={{ fontFamily: "Georgia, serif", fontSize: "28px", fontWeight: 400, color: "#e8d5a3" }}>No encontramos esa página</h1>
      <p style={{ color: "#8a9e88", fontSize: "15px", lineHeight: 1.7 }}>
        Puede que la cabaña ya no esté disponible. Explora otros destinos.
      </p>
      <Link href="/" style={{ color: "#7ab87a", textDecoration: "none", fontWeight: 700 }}>← Volver al inicio</Link>
    </main>
  )
}
