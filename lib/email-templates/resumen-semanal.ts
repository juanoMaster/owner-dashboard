// Takai commission rate applied to confirmed web bookings only
const TAKAI_COMMISSION_RATE = 0.10

// Placeholder until Wise account is configured in production
const WISE_ACCOUNT_PLACEHOLDER = "WISE_ACCOUNT_PLACEHOLDER"

const NAVY = "#1a1a2e"
const GREEN = "#2ecc71"
const FONT_SANS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif"
const FONT_SERIF = "Georgia, 'Times New Roman', serif"

export interface ResumenReserva {
  booking_code: string
  guest_name: string
  cabin_name: string
  check_in: string
  check_out: string
  nights: number
  total_amount: number
  is_manual: boolean
}

export interface ResumenData {
  business_name: string
  owner_name: string
  gender: "male" | "female"
  semana_desde: string
  semana_hasta: string
  reservas: ResumenReserva[]
}

function clp(n: number): string {
  return "$" + Math.round(n).toLocaleString("es-CL")
}

function tableHeader(headerBg: string): string {
  const cols = ["Código", "Huésped", "Cabaña", "Check-in", "Check-out", "Noches", "Total"]
  const cells = cols
    .map(c => `<th style="padding:10px 12px;text-align:left;font-family:${FONT_SANS};font-size:11px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:#ffffff;white-space:nowrap;">${c}</th>`)
    .join("")
  return `<tr style="background:${headerBg};">${cells}</tr>`
}

function tableRow(r: ResumenReserva, idx: number): string {
  const isManual = r.is_manual
  const bg = isManual
    ? (idx % 2 === 0 ? "#fff8e1" : "#fff3cd")
    : (idx % 2 === 0 ? "#ffffff" : "#f9f9f9")
  const badge = isManual
    ? `<span style="display:inline-block;margin-left:6px;padding:2px 6px;background:#f0ad4e;color:#fff;border-radius:4px;font-size:10px;font-weight:bold;vertical-align:middle;">MANUAL</span>`
    : `<span style="display:inline-block;margin-left:6px;padding:2px 6px;background:#28a745;color:#fff;border-radius:4px;font-size:10px;font-weight:bold;vertical-align:middle;">WEB</span>`
  const cell = (v: string) =>
    `<td style="padding:10px 12px;font-family:${FONT_SANS};font-size:12px;color:#333;border-bottom:1px solid #e8e8e8;white-space:nowrap;">${v}</td>`
  return `
    <tr style="background:${bg};">
      <td style="padding:10px 12px;font-family:${FONT_SANS};font-size:12px;color:#333;border-bottom:1px solid #e8e8e8;white-space:nowrap;">${r.booking_code}${badge}</td>
      ${cell(r.guest_name)}
      ${cell(r.cabin_name)}
      ${cell(r.check_in)}
      ${cell(r.check_out)}
      ${cell(String(r.nights))}
      ${cell(clp(r.total_amount))}
    </tr>`
}

function noBookingsBlock(): string {
  return `
    <tr>
      <td style="padding:32px;text-align:center;">
        <p style="margin:0;font-family:${FONT_SANS};font-size:15px;color:#888;">No hubo reservas confirmadas esta semana.</p>
      </td>
    </tr>`
}

function bookingsSection(
  title: string,
  headerBg: string,
  reservas: ResumenReserva[],
  footerNote?: string
): string {
  return `
    <div style="margin-bottom:20px;">
      <p style="margin:0 0 8px;font-family:${FONT_SANS};font-size:10px;font-weight:700;color:#888;letter-spacing:2px;text-transform:uppercase;">${title}</p>
      <div style="overflow-x:auto;border-radius:6px;border:1px solid #e0e0e0;">
        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;min-width:540px;">
          ${tableHeader(headerBg)}
          ${reservas.map((r, i) => tableRow(r, i)).join("")}
        </table>
      </div>
      ${footerNote ? `<p style="margin:6px 0 0;font-family:${FONT_SANS};font-size:11px;color:#888;font-style:italic;">${footerNote}</p>` : ""}
    </div>`
}

function bookingsTable(reservas: ResumenReserva[]): string {
  const webReservas = reservas.filter(r => !r.is_manual)
  const manualReservas = reservas.filter(r => r.is_manual)

  const webSection = webReservas.length > 0
    ? bookingsSection("\u{1F4F2} Reservas online", NAVY, webReservas)
    : ""

  const manualSection = manualReservas.length > 0
    ? bookingsSection("\u{270F}\u{FE0F} Reservas manuales (sin comisión)", "#6c757d", manualReservas, "Estas reservas no generan comisión Takai.")
    : ""

  return `
    <tr>
      <td style="padding:0 32px 24px;">
        ${webSection}
        ${manualSection}
      </td>
    </tr>`
}

function financialSummary(data: ResumenData): string {
  const webReservas = data.reservas.filter(r => !r.is_manual)
  const manualReservas = data.reservas.filter(r => r.is_manual)

  const total_bruto = data.reservas.reduce((sum, r) => sum + r.total_amount, 0)
  const base_comisionable = webReservas.reduce((sum, r) => sum + r.total_amount, 0)
  const total_manual = manualReservas.reduce((sum, r) => sum + r.total_amount, 0)
  const comision_takai = Math.round(base_comisionable * TAKAI_COMMISSION_RATE)
  const ganancia_neta = total_bruto - comision_takai

  return `
    <tr>
      <td style="padding:0 32px 24px;">
        <div style="border-left:4px solid ${GREEN};background:#f6fef9;border-radius:0 6px 6px 0;padding:20px 24px;">
          <p style="margin:0 0 12px;font-family:${FONT_SANS};font-size:10px;font-weight:700;color:#888;letter-spacing:2px;text-transform:uppercase;">Resumen financiero</p>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding:6px 0;font-family:${FONT_SANS};font-size:14px;color:#555;">Total generado (todas las reservas)</td>
              <td style="padding:6px 0;font-family:${FONT_SANS};font-size:14px;color:#222;font-weight:600;text-align:right;">${clp(total_bruto)}</td>
            </tr>
            <tr>
              <td style="padding:2px 0 2px 16px;font-family:${FONT_SANS};font-size:12px;color:#888;">· Reservas online</td>
              <td style="padding:2px 0;font-family:${FONT_SANS};font-size:12px;color:#888;text-align:right;">${clp(base_comisionable)}</td>
            </tr>
            <tr>
              <td style="padding:2px 0 8px 16px;font-family:${FONT_SANS};font-size:12px;color:#888;">· Reservas manuales</td>
              <td style="padding:2px 0 8px;font-family:${FONT_SANS};font-size:12px;color:#888;text-align:right;">${clp(total_manual)}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;font-family:${FONT_SANS};font-size:14px;color:#555;">Comisión Takai ${Math.round(TAKAI_COMMISSION_RATE * 100)}% (solo reservas online)</td>
              <td style="padding:6px 0;font-family:${FONT_SANS};font-size:14px;color:#e74c3c;font-weight:600;text-align:right;">- ${clp(comision_takai)}</td>
            </tr>
            <tr>
              <td colspan="2" style="padding:10px 0 0;border-top:1px solid #d4edda;">
                <p style="margin:10px 0 0;font-family:${FONT_SERIF};font-size:22px;color:${GREEN};font-weight:700;text-align:center;">
                  \u{1F4B0} Tu ganancia neta: ${clp(ganancia_neta)}
                </p>
              </td>
            </tr>
          </table>
        </div>

        <div style="margin-top:20px;border:2px solid #e74c3c;border-radius:8px;padding:20px;background:#fff5f5;text-align:center;">
          <p style="margin:0 0 4px;font-family:${FONT_SANS};font-size:13px;color:#888;text-transform:uppercase;letter-spacing:1px;">Debes transferir a Takai</p>
          <p style="margin:0;font-family:${FONT_SERIF};font-size:32px;font-weight:800;color:#e74c3c;">${clp(comision_takai)}</p>
          <p style="margin:6px 0 0;font-family:${FONT_SANS};font-size:12px;color:#aaa;">10% de las reservas online · Semana del ${data.semana_desde} al ${data.semana_hasta}</p>
        </div>
      </td>
    </tr>`
}

function bankDataBlock(): string {
  return `
    <tr>
      <td style="padding:0 32px 32px;">
        <div style="background:#f0f4ff;border:1px solid #d0d8f0;border-radius:6px;padding:18px 22px;">
          <p style="margin:0 0 10px;font-family:${FONT_SANS};font-size:10px;font-weight:700;color:#888;letter-spacing:2px;text-transform:uppercase;">Datos para la transferencia a Takai</p>
          <table cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding:3px 16px 3px 0;font-family:${FONT_SANS};font-size:13px;color:#888;">Banco</td>
              <td style="padding:3px 0;font-family:${FONT_SANS};font-size:13px;color:#222;font-weight:600;">Wise</td>
            </tr>
            <tr>
              <td style="padding:3px 16px 3px 0;font-family:${FONT_SANS};font-size:13px;color:#888;">Titular</td>
              <td style="padding:3px 0;font-family:${FONT_SANS};font-size:13px;color:#222;font-weight:600;">Takayuki</td>
            </tr>
            <tr>
              <td style="padding:3px 16px 3px 0;font-family:${FONT_SANS};font-size:13px;color:#888;">Cuenta</td>
              <td style="padding:3px 0;font-family:${FONT_SANS};font-size:13px;color:#222;font-weight:600;">${WISE_ACCOUNT_PLACEHOLDER}</td>
            </tr>
          </table>
        </div>
      </td>
    </tr>`
}

export function generarResumenSemanal(data: ResumenData): string {
  const saludo = data.gender === "female" ? "Estimada" : "Estimado"
  const hasBookings = data.reservas.length > 0
  const hasWebBookings = data.reservas.some(r => !r.is_manual)

  const content = `
    <!-- Header -->
    <tr>
      <td style="background:${NAVY};padding:36px 32px 28px;text-align:center;">
        <img src="https://owner-dashboard-navy.vercel.app/takailogoemail.png" alt="Takai.cl" style="height:50px;width:auto;display:block;margin:0 auto 8px auto;" />
        <p style="margin:8px 0 0;font-family:${FONT_SANS};font-size:12px;color:rgba(255,255,255,0.55);letter-spacing:3px;text-transform:uppercase;">Resumen Semanal</p>
        <div style="width:40px;height:2px;background:${GREEN};margin:16px auto 0;"></div>
      </td>
    </tr>

    <!-- Greeting -->
    <tr>
      <td style="padding:32px 32px 8px;">
        <h2 style="margin:0 0 8px;font-family:${FONT_SERIF};font-size:22px;font-weight:400;color:#1a1a2e;">${saludo} ${data.owner_name},</h2>
        <p style="margin:0;font-family:${FONT_SANS};font-size:14px;color:#666;line-height:1.7;">
          Aquí está el resumen de tu semana del
          <strong style="color:#222;">${data.semana_desde}</strong> al
          <strong style="color:#222;">${data.semana_hasta}</strong>.
        </p>
      </td>
    </tr>

    <!-- Divider -->
    <tr><td style="padding:16px 32px;"><div style="height:1px;background:#e8e8e8;"></div></td></tr>

    ${hasBookings ? bookingsTable(data.reservas) : noBookingsBlock()}

    ${hasBookings ? financialSummary(data) : ""}

    ${hasWebBookings ? bankDataBlock() : ""}

    <!-- Footer -->
    <tr>
      <td style="background:#1a1a2e;padding:20px 32px;text-align:center;">
        <p style="margin:0;font-family:${FONT_SANS};font-size:11px;color:rgba(255,255,255,0.45);line-height:1.8;">
          Takai.cl — Sistema de reservas para cabañas
          &nbsp;·&nbsp;
          <a href="mailto:contacto@takai.cl" style="color:rgba(255,255,255,0.55);text-decoration:none;">contacto@takai.cl</a>
        </p>
      </td>
    </tr>
  `

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:${FONT_SANS};">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0"
        style="background:#ffffff;border-radius:8px;overflow:hidden;max-width:600px;width:100%;border:1px solid #e0e0e0;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
        ${content}
      </table>
    </td></tr>
  </table>
</body>
</html>`
}
