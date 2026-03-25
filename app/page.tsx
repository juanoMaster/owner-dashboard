import { createClient } from "@supabase/supabase-js"
import crypto from "crypto"
export const revalidate = 0

export default async function Home({
  searchParams,
}: {
  searchParams: { token?: string }
}) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const token = searchParams.token
  if (!token) {
    return (
      <div style={{ padding: "40px", fontFamily: "sans-serif", color: "#666" }}>
        Acceso no autorizado
      </div>
    )
  }

  const tokenHash = crypto.createHash("sha256").update(token, "utf8").digest("hex")

  const { data: link, error: linkError } = await supabase
    .from("dashboard_links")
    .select("tenant_id")
    .eq("token_hash", tokenHash)
    .eq("active", true)
    .maybeSingle()

  if (linkError || !link) {
    return (
      <div style={{ padding: "40px", fontFamily: "sans-serif", color: "#666" }}>
        Acceso no autorizado
      </div>
    )
  }

  const { data: cabins, error: cabinsError } = await supabase
    .from("cabins")
    .select("*")
    .eq("tenant_id", link.tenant_id)

  if (cabinsError) {
    return (
      <div style={{ padding: "40px", fontFamily: "sans-serif", color: "#c00" }}>
        Error al cargar cabañas. Intenta recargar la página.
      </div>
    )
  }

  return (
    <main style={{ padding: "40px", fontFamily: "sans-serif", maxWidth: "600px" }}>
      <h1 style={{ fontSize: "24px", marginBottom: "8px" }}>Panel del Propietario</h1>
      <p style={{ color: "#888", marginBottom: "32px", fontSize: "14px" }}>
        Selecciona una cabaña para gestionar su calendario
      </p>
      {cabins?.map((cabin: any) => (
        <div
          key={cabin.id}
          style={{
            marginBottom: "16px",
            padding: "20px 24px",
            border: "1px solid #e0e0e0",
            borderRadius: "12px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <h2 style={{ fontSize: "18px", marginBottom: "4px" }}>{cabin.name}</h2>
            <p style={{ color: "#888", fontSize: "14px", margin: 0 }}>
              Capacidad: {cabin.capacity} personas
            </p>
          </div>
          <a
            href={"/calendar?cabin_id=" + cabin.id + "&token=" + token}
            style={{
              backgroundColor: "#1a1a1a",
              color: "#fff",
              padding: "10px 20px",
              borderRadius: "8px",
              textDecoration: "none",
              fontSize: "14px",
              fontWeight: "500",
            }}
          >
            Ver Calendario
          </a>
        </div>
      ))}
    </main>
  )
}