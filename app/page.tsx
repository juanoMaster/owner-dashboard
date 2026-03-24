import { createClient } from "@supabase/supabase-js"
import crypto from "crypto"
import BookingsList from "./components/BookingsList"
import ManualBookingForm from "./components/ManualBookingForm"
import { unstable_noStore as noStore } from "next/cache"
export const dynamic = 'force-dynamic'

export default async function Home({
  searchParams,
}: {
  searchParams: { token?: string }
}) {
  noStore()
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
    .in("status", ["draft", "confirmed"])
    .order("created_at", { ascending: false })

  const { data: tenant } = await supabase
    .from("tenants")
    .select("business_name, owner_name")
    .eq("id", link.tenant_id)
    .single()

  const cabinsForForm = (cabins || []).map((c: any) => ({
    id: c.id,
    name: c.name,
    capacity: c.capacity,
    base_price_night: c.base_price_night
  }))

  return (
    <div style={{ background: "#0a0f0a", minHeight: "100vh", color: "#f0ede8" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 24px", borderBottom: "1px solid #ffffff0f", background: "#0a1510" }}>
        <div style={{ fontFamily: "Georgia, serif", fontSize: "20px", letterSpacing: "3px", color: "#e8d5a3", textTransform: "uppercase" as const }}>
          {tenant?.business_name || "Mi Panel"}
        </div>
        <div style={{ fontSize: "10px", color: "#5a7058", letterSpacing: "1.5px", textTransform: "uppercase" as const }}>Panel administrador</div>
      </div>

      <main style={{ padding: "24px 20px", maxWidth: "700px", margin: "0 auto", fontFamily: "sans-serif" }}>

        <div style={{ marginBottom: "24px" }}>
          <div style={{ fontFamily: "Georgia, serif", fontSize: "22px", color: "#e8d5a3", marginBottom: "4px" }}>
            {"Bienvenida, " + (tenant?.owner_name || "propietaria") + " \uD83C\uDF3F"}
          </div>
          <div style={{ fontSize: "12px", color: "#5a7058" }}>
            {"Gestiona tus reservas y calendario desde aqu\u00ed"}
          </div>
        </div>

        <ManualBookingForm cabins={cabinsForForm} tenantId={link.tenant_id} />

        <div style={{ fontSize: "10px", letterSpacing: "2.5px", textTransform: "uppercase" as const, color: "#4a6a48", margin: "28px 0 14px" }}>{"Mis caba\u00f1as"}</div>

        {cabins?.map((cabin: any) => (
          <div key={cabin.id} style={{
            background: "#111a11",
            border: "1px solid #2a3a2a",
            borderRadius: "14px",
            padding: "18px 16px",
            marginBottom: "12px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px"
          }}>
            <div>
              <div style={{ fontFamily: "Georgia, serif", fontSize: "16px", color: "#e8d5a3", marginBottom: "4px" }}>
                {cabin.name}
              </div>
              <div style={{ fontSize: "12px", color: "#6a8a68" }}>
                {"Capacidad: "}{cabin.capacity}{" personas"}
              </div>
            </div>
            <a href={"/calendar?cabin_id=" + cabin.id + "&token=" + token + "&cabin_name=" + encodeURIComponent(cabin.name)}
              style={{
                display: "inline-block",
                background: "#7ab87a",
                color: "#0a0f0a",
                borderRadius: "8px",
                padding: "9px 16px",
                fontSize: "12px",
                fontWeight: 700,
                textDecoration: "none",
                whiteSpace: "nowrap" as const,
                flexShrink: 0
              }}
            >
              {"Ver calendario"}
            </a>
          </div>
        ))}

        <BookingsList
          bookings={bookings || []}
          cabins={(cabins || []).map((c: any) => ({ id: c.id, name: c.name }))}
          tenantId={link.tenant_id}
        />

      </main>
    </div>
  )
}
