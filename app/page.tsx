import { createClient } from "@supabase/supabase-js"
import crypto from "crypto"
import BookingsList from "./components/BookingsList"
import ManualBookingForm from "./components/ManualBookingForm"
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

  const { data: link } = await supabase
    .from("dashboard_links")
    .select("tenant_id")
    .eq("token_hash", tokenHash)
    .eq("active", true)
    .maybeSingle()

  if (!link) {
    return (
      <div style={{ padding: "40px", fontFamily: "sans-serif", color: "#666" }}>
        Acceso no autorizado
      </div>
    )
  }

  const { data: cabins } = await supabase
    .from("cabins")
    .select("id, name, capacity, base_price_night")
    .eq("tenant_id", link.tenant_id)
    .eq("active", true)

  const { data: bookings } = await supabase
    .from("bookings")
    .select("id, cabin_id, check_in, check_out, nights, total_amount, deposit_amount, balance_amount, notes, created_at")
    .eq("tenant_id", link.tenant_id)
    .eq("status", "draft")
    .order("created_at", { ascending: false })

  return (
    <main style={{ padding: "32px 24px", fontFamily: "sans-serif", maxWidth: "700px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "22px", fontWeight: 500, marginBottom: "4px" }}>Panel del Propietario</h1>
      <p style={{ color: "#888", marginBottom: "28px", fontSize: "14px" }}>
        Gestiona tus cabanas y reservas
      </p>
      <div style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "1.5px", textTransform: "uppercase" as const, color: "#666", marginBottom: "12px" }}>
        Tus cabanas
      </div>
      {(cabins || []).map((cabin: any) => (
        <div
          key={cabin.id}
          style={{ marginBottom: "12px", padding: "18px 20px", border: "1px solid #e0e0e0", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "space-between" }}
        >
          <div>
            <div style={{ fontSize: "16px", fontWeight: 500, marginBottom: "3px" }}>{cabin.name}</div>
            <div style={{ color: "#888", fontSize: "13px" }}>{cabin.capacity} personas</div>
          </div>
          <a
            href={"/calendar?cabin_id=" + cabin.id + "&token=" + token}
            style={{ backgroundColor: "#1a1a1a", color: "#fff", padding: "9px 18px", borderRadius: "8px", textDecoration: "none", fontSize: "13px", fontWeight: 500 }}
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
      <ManualBookingForm
        cabins={(cabins || []).map((c: any) => ({
          id: c.id,
          name: c.name,
          capacity: c.capacity,
          base_price_night: Number(c.base_price_night),
        }))}
        tenantId={link.tenant_id}
      />
    </main>
  )
}