import { createClient } from "@supabase/supabase-js"
import crypto from "crypto"
import BookingsList from "./components/BookingsList"
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
  if (!token) return <div>Missing token</div>

  const tokenHash = crypto.createHash("sha256").update(token, "utf8").digest("hex")

  const { data: link, error } = await supabase
    .from("dashboard_links")
    .select("tenant_id")
    .eq("token_hash", tokenHash)
    .eq("active", true)
    .maybeSingle()

  if (error) return <div>Error: {error.message}</div>
  if (!link) return <div>Token invalido</div>

  const { data: cabins } = await supabase
    .from("cabins")
    .select("*")
    .eq("tenant_id", link.tenant_id)

  const { data: bookings } = await supabase
    .from("bookings")
    .select("id, cabin_id, check_in, check_out, nights, total_amount, deposit_amount, balance_amount, notes, created_at")
    .eq("tenant_id", link.tenant_id)
    .eq("status", "draft")
    .order("created_at", { ascending: false })

  return (
    <main style={{
      padding: "32px 20px",
      fontFamily: "'Segoe UI', sans-serif",
      maxWidth: "680px",
      margin: "0 auto"
    }}>
      <h1 style={{ fontSize: "22px", fontWeight: "700", marginBottom: "24px" }}>
        Panel del Propietario
      </h1>

      {cabins?.map((cabin: any) => (
        <div key={cabin.id} style={{
          border: "1px solid #e0e0e0",
          borderRadius: "12px",
          padding: "20px",
          marginBottom: "16px",
          background: "#fff",
          boxShadow: "0 1px 4px rgba(0,0,0,0.06)"
        }}>
          <h2 style={{ fontSize: "17px", fontWeight: "700", marginBottom: "6px" }}>
            {cabin.name}
          </h2>
          <p style={{ color: "#666", fontSize: "14px", marginBottom: "16px" }}>
            Capacidad: {cabin.capacity} personas
          </p>

          <a href={"/calendar?cabin_id=" + cabin.id + "&token=" + token + "&cabin_name=" + encodeURIComponent(cabin.name)}
            style={{
              display: "block",
              background: "#c0392b",
              color: "white",
              borderRadius: "8px",
              padding: "10px 20px",
              fontSize: "14px",
              fontWeight: "600",
              textAlign: "center" as const,
              textDecoration: "none"
            }}
          >
            Ver Calendario
          </a>
        </div>
      ))}

      <BookingsList
        bookings={bookings || []}
        cabins={(cabins || []).map((c: any) => ({ id: c.id, name: c.name }))}
        tenantId={link.tenant_id}
      />
    </main>
  )
}