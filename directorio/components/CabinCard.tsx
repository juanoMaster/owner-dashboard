import Link from "next/link"
import type { DirCabin } from "../lib/data"

function fmt(n: number | null, currency: string | null) {
  if (!n) return ""
  const c = currency || "CLP"
  if (c === "USD") return "$" + n.toFixed(0) + " USD"
  if (c === "COP") return "$" + Math.round(n).toLocaleString("es-CO")
  return "$" + Math.round(n).toLocaleString("es-CL")
}

export default function CabinCard({ cabin }: { cabin: DirCabin }) {
  const cover = cabin.photos[0]
  return (
    <Link href={`/cabana/${cabin.id}`} style={{ textDecoration: "none", color: "inherit" }}>
      <div style={{ background: "#162618", border: "1px solid #2a3e28", borderRadius: "12px", overflow: "hidden" }}>
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover} alt={cabin.name} style={{ width: "100%", height: "190px", objectFit: "cover", display: "block" }} />
        ) : null}
        <div style={{ padding: "16px" }}>
          <div style={{ fontFamily: "Georgia, serif", fontSize: "18px", color: "#e8d5a3", marginBottom: "4px" }}>{cabin.name}</div>
          <div style={{ color: "#8a9e88", fontSize: "13px", marginBottom: "8px" }}>
            {cabin.tenant.location_text || cabin.destino?.nombre || ""} · hasta {cabin.capacity} personas
          </div>
          {cabin.base_price_night ? (
            <div style={{ color: "#7ab87a", fontSize: "15px", fontWeight: 700 }}>
              {fmt(cabin.base_price_night, cabin.tenant.currency)} <span style={{ color: "#5a7058", fontWeight: 400, fontSize: "12px" }}>/ noche</span>
            </div>
          ) : null}
        </div>
      </div>
    </Link>
  )
}
