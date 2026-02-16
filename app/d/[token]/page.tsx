import { createClient } from "@supabase/supabase-js";

function clp(n: number) {
  return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(n);
}

function fmtDate(d: string) {
  // d viene como "2026-02-20" o timestamp; lo mostramos simple
  try {
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return d;
    return dt.toLocaleDateString("es-CL");
  } catch {
    return d;
  }
}

export default async function DashboardPage({ params }: { params: { token: string } }) {
  const supabaseUrl = process.env.SUPABASE_URL!;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const supabase = createClient(supabaseUrl, serviceRole, { auth: { persistSession: false } });

  const { data, error } = await supabase.rpc("get_owner_dashboard", { p_token: params.token });

  if (error) {
    return (
      <div style={{ padding: 32 }}>
        <h1 style={{ marginBottom: 8 }}>Error</h1>
        <div style={{ color: "#666" }}>{error.message}</div>
      </div>
    );
  }

  if (!data || data.error === "invalid_token") {
    return (
      <div style={{ padding: 32 }}>
        <h1 style={{ marginBottom: 8 }}>Link inválido</h1>
        <div style={{ color: "#666" }}>Este dashboard no existe o el link está malo.</div>
      </div>
    );
  }

  const tenant = data.tenant;
  const kpis = data.kpis_7d;
  const rows = data.bookings_7d as any[];

  return (
    <div style={{ background: "#0b0f17", minHeight: "100vh", padding: 24 }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 16, flexWrap: "wrap" }}>
          <div>
            <div style={{ color: "#9fb0c3", fontSize: 14 }}>Resumen semanal (últimos 7 días)</div>
            <h1 style={{ color: "white", margin: "8px 0 0 0", fontSize: 28, letterSpacing: -0.5 }}>
              {tenant.business_name}
            </h1>
          </div>
          <div style={{ color: "#9fb0c3", fontSize: 13 }}>
            Generado por Reservas Engine
          </div>
        </div>

        {/* KPI cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 14,
            marginTop: 18
          }}
        >
          <div style={cardStyle}>
            <div style={labelStyle}>Reservas confirmadas</div>
            <div style={valueStyle}>{kpis.bookings_count}</div>
          </div>

          <div style={cardStyle}>
            <div style={labelStyle}>Ingresos generados</div>
            <div style={valueStyle}>{clp(Number(kpis.total_generated || 0))}</div>
          </div>

          <div style={cardStyle}>
            <div style={labelStyle}>Comisión pendiente (10%)</div>
            <div style={valueStyle}>{clp(Number(kpis.commission_due || 0))}</div>
            <div style={{ color: "#9fb0c3", fontSize: 12, marginTop: 6 }}>
              *Se paga por transferencia al finalizar la semana, según detalle.
            </div>
          </div>
        </div>

        {/* Table */}
        <div style={{ ...cardStyle, marginTop: 14, padding: 0, overflow: "hidden" }}>
          <div style={{ padding: 16, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ color: "white", fontSize: 16, fontWeight: 650 }}>Detalle de reservas (7 días)</div>
            <div style={{ color: "#9fb0c3", fontSize: 13, marginTop: 4 }}>
              Aquí está lo vendido por el sistema + lo que corresponde de comisión.
            </div>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", color: "white" }}>
              <thead>
                <tr style={{ background: "rgba(255,255,255,0.03)" }}>
                  <Th>Check-in</Th>
                  <Th>Check-out</Th>
                  <Th>Huéspedes</Th>
                  <Th>Total</Th>
                  <Th>Abono</Th>
                  <Th>Comisión</Th>
                  <Th>Estado comisión</Th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: 16, color: "#9fb0c3" }}>
                      Aún no hay reservas confirmadas en los últimos 7 días.
                    </td>
                  </tr>
                ) : (
                  rows.map((r) => (
                    <tr key={r.booking_id} style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                      <Td>{fmtDate(r.check_in)}</Td>
                      <Td>{fmtDate(r.check_out)}</Td>
                      <Td>{r.guests ?? "-"}</Td>
                      <Td>{clp(Number(r.total_amount || 0))}</Td>
                      <Td>{clp(Number(r.deposit_amount || 0))}</Td>
                      <Td>{clp(Number(r.commission_amount || 0))}</Td>
                      <Td>
                        <span style={pill(r.commission_status)}>
                          {String(r.commission_status || "due")}
                        </span>
                      </Td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ color: "#9fb0c3", fontSize: 12, marginTop: 12 }}>
          Nota: Este dashboard es de solo lectura y se accede por link privado.
        </div>
      </div>
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 16,
  padding: 16,
  boxShadow: "0 10px 30px rgba(0,0,0,0.25)"
};

const labelStyle: React.CSSProperties = { color: "#9fb0c3", fontSize: 13 };
const valueStyle: React.CSSProperties = { color: "white", fontSize: 26, marginTop: 8, fontWeight: 700, letterSpacing: -0.4 };

function Th({ children }: { children: React.ReactNode }) {
  return <th style={{ textAlign: "left", padding: 12, fontSize: 12, color: "#9fb0c3", fontWeight: 600 }}>{children}</th>;
}
function Td({ children }: { children: React.ReactNode }) {
  return <td style={{ padding: 12, fontSize: 14 }}>{children}</td>;
}

function pill(status: string) {
  const s = String(status || "due").toLowerCase();
  const base: React.CSSProperties = {
    display: "inline-block",
    padding: "6px 10px",
    borderRadius: 999,
    fontSize: 12,
    border: "1px solid rgba(255,255,255,0.12)"
  };
  if (s === "paid") return { ...base, background: "rgba(34,197,94,0.15)", color: "rgba(34,197,94,1)" };
  if (s === "due") return { ...base, background: "rgba(245,158,11,0.15)", color: "rgba(245,158,11,1)" };
  return { ...base, background: "rgba(148,163,184,0.12)", color: "rgba(148,163,184,1)" };
}
