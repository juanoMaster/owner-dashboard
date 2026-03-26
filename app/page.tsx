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
      <div style={{ background: "#0d1a12", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "sans-serif", color: "#5a7058" }}>
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
      <div style={{ background: "#0d1a12", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "sans-serif", color: "#5a7058" }}>
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
    .is("deleted_at", null)
    .order("created_at", { ascending: false })

  return (
    <div style={{ background: "#0d1a12", minHeight: "100vh", fontFamily: "sans-serif", color: "#f0ede8" }}>

      {/* Nav */}
      <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 24px", borderBottom: "1px solid #ffffff0f", background: "#0a1510" }}>
        <div style={{ fontFamily: "Georgia,serif", fontSize: "18px", letterSpacing: "3px", color: "#e8d5a3", textTransform: "uppercase" }}>
          {businessName.toUpperCase()}
        </div>
        <div />
      </nav>

      <main style={{ padding: "28px 20px", maxWidth: "680px", margin: "0 auto" }}>

        {/* Bienvenida */}
        <div style={{ marginBottom: "28px" }}>
          <div style={{ fontSize: "10px", letterSpacing: "2px", textTransform: "uppercase", color: "#7ab87a", marginBottom: "8px" }}>
            Panel del Propietario
          </div>
          <h1 style={{ fontFamily: "Georgia,serif", fontSize: "26px", color: "#e8d5a3", margin: "0 0 6px 0", fontWeight: 400 }}>
            Bienvenida, {ownerName}
          </h1>
          <p style={{ color: "#4a6a48", fontSize: "13px", margin: 0 }}>
            Desde aquí gestionas tus cabañas, confirmas pagos y bloqueas fechas en el calendario.
          </p>
        </div>

        {/* Botón nueva reserva — arriba */}
        <ManualBookingForm
          cabins={(cabins || []).map((c: any) => ({
            id: c.id,
            name: c.name,
            capacity: c.capacity,
            base_price_night: Number(c.base_price_night),
          }))}
          tenantId={link.tenant_id}
        />

        {/* Historial link */}
        <a href={"/historial?token=" + token}
          style={{ display: "inline-flex", alignItems: "center", gap: "8px", color: "#5a7058", fontSize: "11px", padding: "8px 16px", border: "1px solid #1a2e1a", borderRadius: "20px", textDecoration: "none", letterSpacing: "0.5px", marginTop: "8px" }}>
          {"Ver historial de reservas \u2192"}
        </a>

        {/* Separador */}
        <div style={{ borderTop: "1px solid #2a3e28", margin: "24px 0" }} />

        {/* Cabañas */}
        <div style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "2px", textTransform: "uppercase", color: "#7ab87a", marginBottom: "14px" }}>
          Tus cabañas
        </div>

        {(cabins || []).map((cabin: any) => (
          <div
            key={cabin.id}
            style={{
              marginBottom: "12px",
              padding: "18px 20px",
              background: "#162618",
              border: "1px solid #2a3e28",
              borderRadius: "16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div>
              <div style={{ fontFamily: "Georgia,serif", fontSize: "16px", color: "#e8d5a3", marginBottom: "3px" }}>{cabin.name}</div>
              <div style={{ color: "#5a7058", fontSize: "12px" }}>{cabin.capacity} personas · ${Number(cabin.base_price_night).toLocaleString("es-CL")}/noche</div>
            </div>
            <a
              href={"/calendar?cabin_id=" + cabin.id + "&token=" + token}
              style={{
                background: "#7ab87a",
                color: "#0d1a12",
                padding: "9px 18px",
                borderRadius: "10px",
                textDecoration: "none",
                fontSize: "12px",
                fontWeight: 700,
                letterSpacing: "0.5px",
              }}
            >
              Ver Calendario
            </a>
          </div>
        ))}

        {/* Reservas pendientes */}
        <BookingsList
          bookings={bookings || []}
          cabins={(cabins || []).map((c: any) => ({ id: c.id, name: c.name }))}
          tenantId={link.tenant_id}
        />

      </main>
    </div>
  )
}
