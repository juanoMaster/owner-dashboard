import { createClient } from "@supabase/supabase-js"
import crypto from "crypto"
import ManualBookingForm from "../../components/ManualBookingForm"

export const revalidate = 0

export default async function Dashboard({
  params,
}: {
  params: { token: string }
}) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const token = params.token
  if (!token) return <div style={{ padding: "40px", fontFamily: "sans-serif" }}>Token no encontrado.</div>

  const tokenHash = crypto.createHash("sha256").update(token, "utf8").digest("hex")

  const { data: link, error } = await supabase
    .from("dashboard_links")
    .select("tenant_id")
    .eq("token_hash", tokenHash)
    .eq("active", true)
    .maybeSingle()

  if (error) return <div style={{ padding: "40px", fontFamily: "sans-serif" }}>Error: {error.message}</div>
  if (!link) return <div style={{ padding: "40px", fontFamily: "sans-serif" }}>Token inválido.</div>

  const { data: cabins } = await supabase
    .from("cabins")
    .select("id, name, capacity, base_price_night")
    .eq("tenant_id", link.tenant_id)
    .eq("active", true)

  return (
    <main style={{ padding: "40px", fontFamily: "sans-serif", maxWidth: "800px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "24px", fontWeight: "700", color: "#1e293b", marginBottom: "8px" }}>
        Panel del Propietario
      </h1>

      {cabins?.map((cabin: any) => (
        <div key={cabin.id} style={{ marginTop: "24px", padding: "20px", border: "1px solid #e2e8f0", borderRadius: "10px" }}>
          <h2 style={{ fontSize: "18px", fontWeight: "600", color: "#1e293b", margin: "0 0 6px 0" }}>{cabin.name}</h2>
          <p style={{ margin: "0", color: "#64748b", fontSize: "14px" }}>
            {"Capacidad: "}{cabin.capacity}{" personas · $"}{cabin.base_price_night?.toLocaleString("es-CL")}{"/noche"}
          </p>
        </div>
      ))}

      <ManualBookingForm cabins={cabins || []} tenantId={link.tenant_id} />

    </main>
  )
}
