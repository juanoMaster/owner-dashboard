// Takai commission rate applied to confirmed bookings
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
}

export interface ResumenData {
  business_name: string
  owner_name: string
  gender: "male" | "female"
  semana_desde: string
  semana_hasta: string
  reservas: ResumenReserva[]
  total_bruto: number
  comision_takai: number
  monto_neto: number
}

function clp(n: number): string {
  return "$" + Math.round(n).toLocaleString("es-CL")
}

function tableHeader(): string {
  const cols = ["Código", "Huésped", "Cabaña", "Check-in", "Check-out", "Noches", "Total"]
  const cells = cols
    .map(c => `<th style="padding:10px 12px;text-align:left;font-family:${FONT_SANS};font-size:11px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:#ffffff;white-space:nowrap;">${c}</th>`)
    .join("")
  return `<tr style="background:${NAVY};">${cells}</tr>`
}

function tableRow(r: ResumenReserva, idx: number): string {
  const bg = idx % 2 === 0 ? "#ffffff" : "#f9f9f9"
  const cell = (v: string) =>
    `<td style="padding:10px 12px;font-family:${FONT_SANS};font-size:12px;color:#333;border-bottom:1px solid #e8e8e8;white-space:nowrap;">${v}</td>`
  return `
    <tr style="background:${bg};">
      ${cell(r.booking_code)}
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

function bookingsTable(reservas: ResumenReserva[]): string {
  return `
    <tr>
      <td style="padding:0 32px 24px;">
        <p style="margin:0 0 12px;font-family:${FONT_SANS};font-size:10px;font-weight:700;color:#888;letter-spacing:2px;text-transform:uppercase;">Reservas confirmadas</p>
        <div style="overflow-x:auto;border-radius:6px;border:1px solid #e0e0e0;">
          <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;min-width:540px;">
            ${tableHeader()}
            ${reservas.map((r, i) => tableRow(r, i)).join("")}
          </table>
        </div>
      </td>
    </tr>`
}

function financialSummary(data: ResumenData): string {
  return `
    <tr>
      <td style="padding:0 32px 24px;">
        <div style="border-left:4px solid ${GREEN};background:#f6fef9;border-radius:0 6px 6px 0;padding:20px 24px;">
          <p style="margin:0 0 12px;font-family:${FONT_SANS};font-size:10px;font-weight:700;color:#888;letter-spacing:2px;text-transform:uppercase;">Resumen financiero</p>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding:6px 0;font-family:${FONT_SANS};font-size:14px;color:#555;">Total generado</td>
              <td style="padding:6px 0;font-family:${FONT_SANS};font-size:14px;color:#222;font-weight:600;text-align:right;">${clp(data.total_bruto)}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;font-family:${FONT_SANS};font-size:14px;color:#555;">Comisión Takai (${Math.round(TAKAI_COMMISSION_RATE * 100)}%)</td>
              <td style="padding:6px 0;font-family:${FONT_SANS};font-size:14px;color:#e74c3c;font-weight:600;text-align:right;">- ${clp(data.comision_takai)}</td>
            </tr>
            <tr>
              <td colspan="2" style="padding:8px 0 0;border-top:1px solid #d4edda;">
                <p style="margin:10px 0 0;font-family:${FONT_SERIF};font-size:20px;color:${NAVY};font-weight:700;text-align:center;">
                  💰 A transferir a Takai: ${clp(data.monto_neto)}
                </p>
              </td>
            </tr>
          </table>
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

  const content = `
    <!-- Header -->
    <tr>
      <td style="background:${NAVY};padding:36px 32px 28px;text-align:center;">
        <p style="margin:0;font-family:${FONT_SERIF};font-size:32px;font-weight:700;color:#ffffff;letter-spacing:6px;text-transform:uppercase;">TAKAI</p>
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

    ${hasBookings ? bankDataBlock() : ""}

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
