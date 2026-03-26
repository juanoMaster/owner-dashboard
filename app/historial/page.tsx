import { createClient } from "@supabase/supabase-js"
import crypto from "crypto"
import HistorialClient from "../components/HistorialClient"
export const revalidate = 0

export default async function HistorialPage({
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
    .select("business_name, owner_name")
    .eq("id", link.tenant_id)
    .maybeSingle()

  const { data: cabins } = await supabase
    .from("cabins")
    .select("id, name")
    .eq("tenant_id", link.tenant_id)

  // Traer TODAS las reservas incluyendo canceladas (deleted_at no null)
  const { data: bookings } = await supabase
    .from("bookings")
    .select("id, cabin_id, check_in, check_out, nights, guests, total_amount, deposit_amount, balance_amount, status, notes, created_at, deleted_at, deleted_by")
    .eq("tenant_id", link.tenant_id)
    .order("created_at", { ascending: false })

  const cabinMap: Record<string, string> = {}
  ;(cabins || []).forEach((c: any) => { cabinMap[c.id] = c.name })

  return (
    <div style={{ background: "#0d1a12", minHeight: "100vh", fontFamily: "sans-serif", color: "#f0ede8" }}>
      <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 28px", height: "54px", borderBottom: "1px solid #111e11", background: "#050d05" }}>
        <div style={{ fontFamily: "Georgia,serif", fontSize: "15px", letterSpacing: "3.5px", color: "#c8b878", textTransform: "uppercase" as const }}>
          {tenant?.business_name || "Panel"}
        </div>
        <div style={{ fontSize: "9px", color: "#253825", letterSpacing: "2px", textTransform: "uppercase" as const }}>Historial</div>
      </nav>

      <main style={{ padding: "36px 24px", maxWidth: "1200px", margin: "0 auto" }}>
        <div style={{ marginBottom: "32px" }}>
          <a href={"/?token=" + token}
            style={{ display: "inline-flex", alignItems: "center", gap: "6px", color: "#6a8a68", fontSize: "11px", padding: "7px 16px", border: "1px solid #1a2e1a", borderRadius: "20px", textDecoration: "none", letterSpacing: "0.5px", marginBottom: "20px" }}>
            {"← Volver al panel"}
          </a>
          <div style={{ fontSize: "9px", letterSpacing: "3px", textTransform: "uppercase" as const, color: "#4a7a48", marginBottom: "6px", fontWeight: 600 }}>
            Historial de reservas
          </div>
          <h1 style={{ fontFamily: "Georgia,serif", fontSize: "28px", color: "#e8d5a3", margin: "0 0 4px 0", fontWeight: 400 }}>
            {tenant?.business_name || ""}
          </h1>
          <div style={{ width: "40px", height: "1px", background: "linear-gradient(90deg, #c8b87860, transparent)", margin: "10px 0" }} />
          <p style={{ color: "#3a5a38", fontSize: "12px", margin: 0 }}>
            {"Registro completo de todas las reservas. Las canceladas aparecen marcadas."}
          </p>
        </div>

        <HistorialClient
          bookings={(bookings || []) as any[]}
          cabinMap={cabinMap}
          businessName={tenant?.business_name || ""}
        />
      </main>
    </div>
  )
}
