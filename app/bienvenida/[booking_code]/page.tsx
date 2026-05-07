export const dynamic = "force-dynamic"
import { createClient } from "@supabase/supabase-js"
import { notFound } from "next/navigation"

type Guidebook = {
  arrival_instructions?: string
  wifi_name?: string
  wifi_password?: string
  checkin_time?: string
  checkout_time?: string
  house_rules?: string
  emergency_contact?: string
  local_tips?: string
  checkout_instructions?: string
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "#162618", border: "1px solid #2a3e28", borderRadius: "14px", padding: "20px 22px", marginBottom: "14px" }}>
      <div style={{ fontSize: "9px", letterSpacing: "2px", textTransform: "uppercase" as const, color: "#7ab87a", marginBottom: "10px", fontFamily: "sans-serif" }}>
        {title}
      </div>
      <div style={{ fontSize: "14px", color: "#c8d8c0", fontFamily: "sans-serif", lineHeight: 1.7, whiteSpace: "pre-wrap" as const }}>
        {children}
      </div>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #2a3e2850" }}>
      <span style={{ fontSize: "12px", color: "#5a7058", fontFamily: "sans-serif" }}>{label}</span>
      <span style={{ fontSize: "13px", color: "#e8d5a3", fontFamily: "Georgia,serif", fontWeight: 500 }}>{value}</span>
    </div>
  )
}

export default async function BienvenidaPage({ params }: { params: { booking_code: string } }) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { global: { fetch: (url, options = {}) => fetch(url, { ...options, cache: "no-store" }) } }
  )

  const { data: booking } = await supabase
    .from("bookings")
    .select("guest_name, check_in, check_out, cabin_id, tenant_id, cabins(name), tenants(business_name, guidebook)")
    .eq("booking_code", params.booking_code)
    .is("deleted_at", null)
    .maybeSingle()

  if (!booking) return notFound()

  const t = booking.tenants as any
  const businessName: string = t?.business_name || "Cabaña"
  const guidebook: Guidebook = t?.guidebook || {}
  const cabinName: string = (booking.cabins as any)?.name || "Cabaña"
  const guestName: string = booking.guest_name || "Huésped"

  const formatDate = (d: string) =>
    new Date(d + "T12:00:00").toLocaleDateString("es-CL", {
      weekday: "long", year: "numeric", month: "long", day: "numeric",
    })

  const hasContent = Object.values(guidebook).some(v => v && String(v).trim().length > 0)

  return (
    <div style={{ background: "#0d1a12", minHeight: "100vh", fontFamily: "sans-serif", color: "#f0ede8" }}>
      <nav style={{ padding: "18px 24px", borderBottom: "1px solid #1a2e1a", background: "#0a1510", textAlign: "center" as const }}>
        <div style={{ fontFamily: "Georgia,serif", fontSize: "20px", letterSpacing: "4px", color: "#e8d5a3", textTransform: "uppercase" as const }}>
          {businessName.split(" ").map((word, i) => (
            <span key={i} style={{ color: i === 0 ? "#e8d5a3" : "#7ab87a" }}>
              {i > 0 ? " " : ""}{word.toUpperCase()}
            </span>
          ))}
        </div>
      </nav>

      <main style={{ padding: "28px 20px", maxWidth: "600px", margin: "0 auto" }}>
        <div style={{ marginBottom: "28px", textAlign: "center" as const }}>
          <div style={{ fontSize: "10px", letterSpacing: "2px", textTransform: "uppercase" as const, color: "#7ab87a", marginBottom: "8px" }}>
            Manual de Bienvenida
          </div>
          <h1 style={{ fontFamily: "Georgia,serif", fontSize: "26px", color: "#e8d5a3", margin: "0 0 8px 0", fontWeight: 400 }}>
            Bienvenido/a, {guestName.split(" ")[0]}
          </h1>
          <p style={{ color: "#5a7058", fontSize: "13px", margin: 0 }}>
            Todo lo que necesitas para tu estadía en {cabinName}
          </p>
        </div>

        <div style={{ background: "#162618", border: "1px solid #2a3e28", borderRadius: "14px", padding: "20px 22px", marginBottom: "14px" }}>
          <div style={{ fontSize: "9px", letterSpacing: "2px", textTransform: "uppercase" as const, color: "#7ab87a", marginBottom: "12px" }}>
            Tu reserva
          </div>
          <InfoRow label="Cabaña" value={cabinName} />
          <InfoRow label="Check-in" value={formatDate(booking.check_in)} />
          <InfoRow label="Check-out" value={formatDate(booking.check_out)} />
        </div>

        {!hasContent && (
          <div style={{ textAlign: "center" as const, padding: "40px 20px", color: "#3a5a38", fontSize: "13px" }}>
            El propietario aún no ha configurado el manual de bienvenida.
          </div>
        )}

        {guidebook.checkin_time && (
          <Section title="Horarios">
            {[
              guidebook.checkin_time ? `Check-in: ${guidebook.checkin_time}` : null,
              guidebook.checkout_time ? `Check-out: ${guidebook.checkout_time}` : null,
            ].filter(Boolean).join("\n")}
          </Section>
        )}

        {guidebook.arrival_instructions && (
          <Section title="Instrucciones de llegada">
            {guidebook.arrival_instructions}
          </Section>
        )}

        {(guidebook.wifi_name || guidebook.wifi_password) && (
          <Section title="WiFi">
            {guidebook.wifi_name ? `Red: ${guidebook.wifi_name}` : ""}
            {guidebook.wifi_name && guidebook.wifi_password ? "\n" : ""}
            {guidebook.wifi_password ? `Contraseña: ${guidebook.wifi_password}` : ""}
          </Section>
        )}

        {guidebook.house_rules && (
          <Section title="Reglas de la cabaña">
            {guidebook.house_rules}
          </Section>
        )}

        {guidebook.local_tips && (
          <Section title="Tips locales">
            {guidebook.local_tips}
          </Section>
        )}

        {guidebook.checkout_instructions && (
          <Section title="Instrucciones de salida">
            {guidebook.checkout_instructions}
          </Section>
        )}

        {guidebook.emergency_contact && (
          <div style={{ background: "#0d1a12", border: "1px solid #2a3e28", borderRadius: "14px", padding: "16px 22px", marginBottom: "14px" }}>
            <div style={{ fontSize: "9px", letterSpacing: "2px", textTransform: "uppercase" as const, color: "#e63946", marginBottom: "8px" }}>
              Contacto de emergencia
            </div>
            <div style={{ fontSize: "15px", color: "#e8d5a3", fontFamily: "Georgia,serif" }}>
              {guidebook.emergency_contact}
            </div>
          </div>
        )}

        <div style={{ textAlign: "center" as const, marginTop: "32px", paddingTop: "24px", borderTop: "1px solid #2a3e28" }}>
          <p style={{ color: "#3a5a38", fontSize: "11px", letterSpacing: "2px", textTransform: "uppercase" as const }}>
            TAKAI.CL · Sistema de reservas para cabañas
          </p>
        </div>
      </main>
    </div>
  )
}
