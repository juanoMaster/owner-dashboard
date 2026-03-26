import { createClient } from "@supabase/supabase-js"
import AuditClient from "../components/AuditClient"
export const revalidate = 0

export default async function AdminPage({
  searchParams,
}: {
  searchParams: { token?: string }
}) {
  const adminToken = process.env.ADMIN_TOKEN
  if (!adminToken || searchParams.token !== adminToken) {
    return (
      <div style={{ background: "#0a0808", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "sans-serif", color: "#3a2a2a" }}>
        Acceso no autorizado
      </div>
    )
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: auditRows } = await supabase
    .from("audit_log")
    .select("id, tenant_id, cabin_id, action, entity_type, entity_id, details, performed_by, created_at")
    .order("created_at", { ascending: false })
    .limit(5000)

  const { data: tenants } = await supabase
    .from("tenants")
    .select("id, business_name, owner_name")

  const { data: cabins } = await supabase
    .from("cabins")
    .select("id, name, tenant_id")

  const tenantMap: Record<string, string> = {}
  ;(tenants || []).forEach((t: any) => { tenantMap[t.id] = t.business_name + " (" + t.owner_name + ")" })

  const cabinMap: Record<string, string> = {}
  ;(cabins || []).forEach((c: any) => { cabinMap[c.id] = c.name })

  return (
    <div style={{ background: "#0a0808", minHeight: "100vh", fontFamily: "sans-serif", color: "#f0ede8" }}>
      <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 28px", height: "54px", borderBottom: "1px solid #1e1111", background: "#060404" }}>
        <div style={{ fontFamily: "Georgia,serif", fontSize: "15px", letterSpacing: "3.5px", color: "#c8b878", textTransform: "uppercase" as const }}>
          Takai.cl
        </div>
        <div style={{ fontSize: "9px", color: "#382525", letterSpacing: "2px", textTransform: "uppercase" as const }}>Auditoría interna</div>
      </nav>

      <main style={{ padding: "36px 24px", maxWidth: "1400px", margin: "0 auto" }}>
        <div style={{ marginBottom: "32px" }}>
          <div style={{ fontSize: "9px", letterSpacing: "3px", textTransform: "uppercase" as const, color: "#7a4a48", marginBottom: "6px", fontWeight: 600 }}>
            Sistema de auditoría
          </div>
          <h1 style={{ fontFamily: "Georgia,serif", fontSize: "28px", color: "#e8d5a3", margin: "0 0 4px 0", fontWeight: 400 }}>
            Historial completo de eventos
          </h1>
          <div style={{ width: "40px", height: "1px", background: "linear-gradient(90deg, #c8b87860, transparent)", margin: "10px 0" }} />
          <p style={{ color: "#4a3030", fontSize: "12px", margin: 0 }}>
            {"Todos los movimientos de todos los clientes. Uso interno Takai exclusivamente."}
          </p>
        </div>

        <AuditClient
          rows={(auditRows || []) as any[]}
          tenantMap={tenantMap}
          cabinMap={cabinMap}
        />
      </main>
    </div>
  )
}
