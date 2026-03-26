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
      <div style={{ background: "#0a1208", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "sans-serif", color: "#3a5a38" }}>
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
      <div style={{ background: "#0a1208", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "sans-serif", color: "#3a5a38" }}>
        Acceso no autorizado
      </div>
    )
  }

  const { data: tenant } = await supabase
    .from("tenants")
    .select("owner_name, business_name")
    .eq("id", link.tenant_id)
    .maybeSingle()

  const ownerName = tenant?.owner_name?.split(" ")[0] || "Propietaria"
  const businessName = tenant?.business_name || "Panel"

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

  const pendingCount = (bookings || []).length
  const cabinCount = (cabins || []).length

  return (
    <div style={{ background: "#0a1208", minHeight: "100vh", fontFamily: "sans-serif", color: "#f0ede8" }}>

      <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 28px", height: "54px", borderBottom: "1px solid #111e11", background: "#050d05", boxShadow: "0 1px 20px #00000040" }}>
        <div style={{ fontFamily: "Georgia,serif", fontSize: "15px", letterSpacing: "3.5px", color: "#c8b878", textTransform: "uppercase" as const }}>
          {businessName}
        </div>
        <div style={{ fontSize: "9px", color: "#253825", letterSpacing: "2px", textTransform: "uppercase" as const }}>Panel</div>
      </nav>

      <main style={{ padding: "36px 24px", maxWidth: "700px", margin: "0 auto" }}>

        <div style={{ marginBottom: "36px" }}>
          <div style={{ fontSize: "9px", letterSpacing: "3px", textTransform: "uppercase" as const, color: "#4a7a48", marginBottom: "10px", fontWeight: 600 }}>
            Panel del Propietario
          </div>
          <h1 style={{ fontFamily: "Georgia,serif", fontSize: "30px", color: "#e8d5a3", margin: "0 0 4px 0", fontWeight: 400, letterSpacing: "0.5px" }}>
            {"Bienvenida, " + ownerName}
          </h1>
          <div style={{ width: "48px", height: "1px", background: "linear-gradient(90deg, #c8b87860, transparent)", margin: "10px 0 14px" }} />
          <p style={{ color: "#3a5a38", fontSize: "12px", margin: 0, lineHeight: 1.7 }}>
            {"Desde aquí gestionas tus cabañas, confirmas pagos y bloqueas fechas en el calendario."}
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "32px" }}>
          <div style={{ background: "#060e06", border: "1px solid #1a2e1a", borderRadius: "14px", padding: "18px 20px" }}>
            <div style={{ fontSize: "28px", fontFamily: "Georgia,serif", color: pendingCount > 0 ? "#e8d5a3" : "#2a4a28", marginBottom: "4px" }}>{pendingCount}</div>
            <div style={{ fontSize: "10px", letterSpacing: "1.5px", color: "#3a5a38", textTransform: "uppercase" as const }}>
              {pendingCount === 1 ? "Reserva pendiente" : "Reservas pendientes"}
            </div>
            {pendingCount > 0 && <div style={{ width: "24px", height: "2px", background: "#f97316", borderRadius: "1px", marginTop: "8px" }} />}
          </div>
          <div style={{ background: "#060e06", border: "1px solid #1a2e1a", borderRadius: "14px", padding: "18px 20px" }}>
            <div style={{ fontSize: "28px", fontFamily: "Georgia,serif", color: "#2a4a28", marginBottom: "4px" }}>{cabinCount}</div>
            <div style={{ fontSize: "10px", letterSpacing: "1.5px", color: "#3a5a38", textTransform: "uppercase" as const }}>
              {cabinCount === 1 ? "Cabaña activa" : "Cabañas activas"}
            </div>
            <div style={{ width: "24px", height: "2px", background: "#27ae6060", borderRadius: "1px", marginTop: "8px" }} />
          </div>
        </div>

        <ManualBookingForm
          cabins={(cabins || []).map((c: any) => ({
            id: c.id,
            name: c.name,
            capacity: c.capacity,
            base_price_night: Number(c.base_price_night),
          }))}
          tenantId={link.tenant_id}
        />

        <div style={{ borderTop: "1px solid #1a2e1a", margin: "28px 0" }} />

        <div style={{ fontSize: "9px", fontWeight: 600, letterSpacing: "2.5px", textTransform: "uppercase" as const, color: "#4a7a48", marginBottom: "16px" }}>
          {"Tus cabañas"}
        </div>

        {(cabins || []).map((cabin: any) => (
          <div
            key={cabin.id}
            style={{
              marginBottom: "10px",
              padding: "18px 22px",
              background: "#060e06",
              border: "1px solid #1a2e1a",
              borderRadius: "16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "12px",
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#27ae60", flexShrink: 0 }} />
                <div style={{ fontFamily: "Georgia,serif", fontSize: "17px", color: "#e8d5a3" }}>{cabin.name}</div>
              </div>
              <div style={{ color: "#3a5a38", fontSize: "11px", paddingLeft: "14px" }}>
                {cabin.capacity} {"personas · "}
                {"$" + Number(cabin.base_price_night).toLocaleString("es-CL") + "/noche"}
              </div>
            </div>
            <a
              href={"/calendar?cabin_id=" + cabin.id + "&token=" + token}
              style={{
                background: "#0d1a0d",
                color: "#7ab87a",
                padding: "9px 18px",
                borderRadius: "10px",
                textDecoration: "none",
                fontSize: "11px",
                fontWeight: 600,
                letterSpacing: "0.5px",
                border: "1px solid #2a4a28",
                whiteSpace: "nowrap" as const,
              }}
            >
              {"Ver Calendario →"}
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
