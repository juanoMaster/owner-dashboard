import { Resend } from "resend"

export const resend = new Resend(process.env.RESEND_API_KEY)

const LOGO_URL = "https://owner-dashboard-navy.vercel.app/takai-logo-email.png"
const GOLD = "#C9A84C"
const GOLD_LIGHT = "#e8c96a"
const BG_LOGO = "#0d1520"
const BG_DARK = "#111827"
const BG_CARD = "#1a2332"
const BG_BODY = "#0d1117"
const TEXT_LIGHT = "#e8e8e8"
const TEXT_MUTED = "#8892a4"
const FONT = "Georgia, 'Times New Roman', serif"
const FONT_SANS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif"

function header(business_name: string) {
  return `
    <tr>
      <td style="background:${BG_LOGO};padding:40px 40px 32px;text-align:center;">
        <img src="${LOGO_URL}" alt="Takai" width="120" height="120" style="display:block;margin:0 auto 20px;border-radius:16px;" />
        <div style="width:40px;height:2px;background:${GOLD};margin:0 auto 16px;"></div>
        <p style="margin:0;color:${TEXT_LIGHT};font-family:${FONT};font-size:22px;font-weight:400;letter-spacing:2px;">${business_name}</p>
        <p style="margin:6px 0 0;color:${TEXT_MUTED};font-family:${FONT_SANS};font-size:11px;letter-spacing:3px;text-transform:uppercase;">Reservas · Chile</p>
      </td>
    </tr>
  `
}

function footer(business_name: string) {
  return `
    <tr>
      <td style="background:${BG_LOGO};padding:28px 40px;text-align:center;border-top:1px solid #1e2d40;">
        <a href="https://takai.cl" style="text-decoration:none;">
          <p style="margin:0;color:${GOLD};font-family:${FONT_SANS};font-size:12px;letter-spacing:3px;text-transform:uppercase;">TAKAI.CL</p>
        </a>
        <p style="margin:8px 0 0;color:${TEXT_MUTED};font-family:${FONT_SANS};font-size:11px;line-height:1.6;">
          Enviado en nombre de ${business_name}<br/>Sistema de reservas para cabañas en Chile
        </p>
      </td>
    </tr>
  `
}

function detailRow(label: string, value: string, highlight = false, last = false) {
  return `
    <tr>
      <td style="padding:14px 24px;${last ? "" : `border-bottom:1px solid #1e2d40;`}${highlight ? `background:#162030;` : ""}">
        <p style="margin:0;font-family:${FONT_SANS};font-size:10px;color:${TEXT_MUTED};text-transform:uppercase;letter-spacing:1.5px;">${label}</p>
        <p style="margin:5px 0 0;font-family:${FONT_SANS};font-size:15px;color:${highlight ? GOLD : TEXT_LIGHT};font-weight:${highlight ? "700" : "500"};">${value}</p>
      </td>
    </tr>
  `
}

function codeBlock(code: string) {
  return `
    <tr>
      <td style="padding:20px 24px;background:${BG_LOGO};border-bottom:1px solid #1e2d40;text-align:center;">
        <p style="margin:0;font-family:${FONT_SANS};font-size:10px;color:${TEXT_MUTED};text-transform:uppercase;letter-spacing:2px;">Código de reserva</p>
        <p style="margin:8px 0 0;font-family:${FONT};font-size:32px;color:${GOLD};letter-spacing:6px;">${code}</p>
      </td>
    </tr>
  `
}

function wrapper(content: string) {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#080e17;font-family:${FONT_SANS};">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#080e17;padding:48px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:${BG_DARK};border-radius:8px;overflow:hidden;max-width:600px;width:100%;border:1px solid #1e2d40;">
        ${content}
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

export function emailNuevaReservaTurista(data: {
  business_name: string
  owner_name: string
  guest_name: string
  cabin_name: string
  check_in: string
  check_out: string
  nights: number
  total_amount: number
  deposit_amount: number
  booking_code: string
  has_tinaja: boolean
  tinaja_amount?: number
  gender: string
}) {
  const pct = data.deposit_amount > 0 ? Math.round((data.deposit_amount / data.total_amount) * 100) : 20

  return wrapper(`
    ${header(data.business_name)}
    <tr>
      <td style="padding:40px 40px 24px;">
        <p style="margin:0 0 6px;font-family:${FONT_SANS};font-size:11px;color:${GOLD};text-transform:uppercase;letter-spacing:3px;">Solicitud recibida</p>
        <h2 style="margin:0 0 16px;font-family:${FONT};font-size:28px;font-weight:400;color:${TEXT_LIGHT};">Hola, ${data.guest_name}</h2>
        <p style="margin:0;font-family:${FONT_SANS};font-size:15px;color:${TEXT_MUTED};line-height:1.8;">
          Recibimos tu solicitud de reserva en <span style="color:${TEXT_LIGHT};font-weight:600;">${data.business_name}</span>. 
          Lo revisaremos y te confirmaremos a la brevedad.
        </p>
      </td>
    </tr>

    <tr>
      <td style="padding:0 40px 32px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:${BG_CARD};border-radius:6px;overflow:hidden;border:1px solid #1e2d40;">
          ${codeBlock(data.booking_code)}
          ${detailRow("Cabaña", data.cabin_name)}
          ${detailRow("Check-in", data.check_in)}
          ${detailRow("Check-out", data.check_out)}
          ${detailRow("Noches", `${data.nights} noches`)}
          ${data.has_tinaja && data.tinaja_amount ? detailRow("Tinaja", `$${data.tinaja_amount.toLocaleString("es-CL")} CLP`) : ""}
          ${detailRow("Total", `$${data.total_amount.toLocaleString("es-CL")} CLP`)}
          ${detailRow(`Adelanto requerido (${pct}%)`, `$${data.deposit_amount.toLocaleString("es-CL")} CLP`, true, true)}
        </table>
      </td>
    </tr>

    <tr>
      <td style="padding:0 40px 40px;">
        <p style="margin:0 0 10px;font-family:${FONT_SANS};font-size:14px;color:${TEXT_MUTED};line-height:1.8;">
          En cuanto ${data.gender === "female" ? "la dueña" : "el dueño"} confirme el pago, recibirás un email con la confirmación oficial de tu reserva.
        </p>
        <p style="margin:0;font-family:${FONT_SANS};font-size:13px;color:#4a5568;">
          Guarda tu código <span style="color:${GOLD};font-weight:700;letter-spacing:2px;">${data.booking_code}</span> para cualquier consulta.
        </p>
      </td>
    </tr>

    ${footer(data.business_name)}
  `)
}

export function emailNuevaReservaDuena(data: {
  business_name: string
  owner_name: string
  guest_name: string
  guest_email: string
  guest_phone: string
  cabin_name: string
  check_in: string
  check_out: string
  nights: number
  total_amount: number
  deposit_amount: number
  booking_code: string
  guests_count: number
  has_tinaja: boolean
  tinaja_amount?: number
  dashboard_url: string
}) {
  return wrapper(`
    ${header(data.business_name)}
    <tr>
      <td style="padding:40px 40px 24px;">
        <div style="display:inline-block;background:#1a2a1a;border:1px solid #2d5a2d;border-radius:20px;padding:6px 16px;margin-bottom:20px;">
          <p style="margin:0;font-family:${FONT_SANS};font-size:11px;color:#4caf7d;font-weight:700;letter-spacing:2px;text-transform:uppercase;">● Nueva solicitud</p>
        </div>
        <h2 style="margin:0 0 12px;font-family:${FONT};font-size:26px;font-weight:400;color:${TEXT_LIGHT};">Nueva reserva recibida</h2>
        <p style="margin:0;font-family:${FONT_SANS};font-size:15px;color:${TEXT_MUTED};line-height:1.8;">
          Hola <span style="color:${TEXT_LIGHT};font-weight:600;">${data.owner_name}</span>, tienes una nueva solicitud de reserva.
        </p>
      </td>
    </tr>

    <tr>
      <td style="padding:0 40px 20px;">
        <p style="margin:0 0 10px;font-family:${FONT_SANS};font-size:10px;color:${GOLD};text-transform:uppercase;letter-spacing:2px;">Datos del turista</p>
        <table width="100%" cellpadding="0" cellspacing="0" style="background:${BG_CARD};border-radius:6px;overflow:hidden;border:1px solid #1e2d40;">
          ${detailRow("Nombre", data.guest_name)}
          ${detailRow("Email", data.guest_email)}
          ${detailRow("Teléfono", data.guest_phone)}
          ${detailRow("Personas", `${data.guests_count} personas`, false, true)}
        </table>
      </td>
    </tr>

    <tr>
      <td style="padding:0 40px 32px;">
        <p style="margin:0 0 10px;font-family:${FONT_SANS};font-size:10px;color:${GOLD};text-transform:uppercase;letter-spacing:2px;">Detalle de la reserva</p>
        <table width="100%" cellpadding="0" cellspacing="0" style="background:${BG_CARD};border-radius:6px;overflow:hidden;border:1px solid #1e2d40;">
          ${codeBlock(data.booking_code)}
          ${detailRow("Cabaña", data.cabin_name)}
          ${detailRow("Check-in / Check-out", `${data.check_in} → ${data.check_out}`)}
          ${detailRow("Noches", `${data.nights} noches`)}
          ${data.has_tinaja && data.tinaja_amount ? detailRow("Tinaja", `$${data.tinaja_amount.toLocaleString("es-CL")} CLP`) : ""}
          ${detailRow("Total / Adelanto esperado", `$${data.total_amount.toLocaleString("es-CL")} / $${data.deposit_amount.toLocaleString("es-CL")} CLP`, true, true)}
        </table>
      </td>
    </tr>

    <tr>
      <td style="padding:0 40px 40px;text-align:center;">
        <a href="${data.dashboard_url}" style="display:inline-block;background:${GOLD};color:#0a0a0a;text-decoration:none;padding:16px 48px;border-radius:4px;font-family:${FONT_SANS};font-weight:700;font-size:13px;letter-spacing:2px;text-transform:uppercase;">Ver en mi panel →</a>
      </td>
    </tr>

    ${footer(data.business_name)}
  `)
}

export function emailReservaConfirmada(data: {
  business_name: string
  guest_name: string
  cabin_name: string
  check_in: string
  check_out: string
  nights: number
  total_amount: number
  deposit_amount: number
  booking_code: string
  bank_name: string
  bank_account_type: string
  bank_account_number: string
  bank_account_holder: string
  bank_rut: string
  owner_whatsapp: string
}) {
  return wrapper(`
    ${header(data.business_name)}
    <tr>
      <td style="padding:40px 40px 24px;text-align:center;">
        <div style="display:inline-block;background:#0f2a1a;border:1px solid #2d5a3d;border-radius:20px;padding:8px 20px;margin-bottom:20px;">
          <p style="margin:0;font-family:${FONT_SANS};font-size:11px;color:#4caf7d;font-weight:700;letter-spacing:2px;text-transform:uppercase;">✓ Reserva Confirmada</p>
        </div>
        <h2 style="margin:0 0 12px;font-family:${FONT};font-size:28px;font-weight:400;color:${TEXT_LIGHT};">¡Todo listo, ${data.guest_name}!</h2>
        <p style="margin:0;font-family:${FONT_SANS};font-size:15px;color:${TEXT_MUTED};line-height:1.8;">
          Tu reserva en <span style="color:${TEXT_LIGHT};font-weight:600;">${data.business_name}</span> está 100% confirmada.
        </p>
      </td>
    </tr>

    <tr>
      <td style="padding:0 40px 32px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:${BG_CARD};border-radius:6px;overflow:hidden;border:1px solid #1e2d40;">
          ${codeBlock(data.booking_code)}
          ${detailRow("Cabaña", data.cabin_name)}
          ${detailRow("Check-in", data.check_in)}
          ${detailRow("Check-out", data.check_out, false, true)}
        </table>
      </td>
    </tr>

    <tr>
      <td style="padding:0 40px 40px;text-align:center;">
        <p style="margin:0 0 8px;font-family:${FONT};font-size:22px;color:${GOLD};font-weight:400;">
          Gracias por elegirnos 🎉
        </p>
        <p style="margin:0;font-family:${FONT_SANS};font-size:15px;color:${TEXT_MUTED};line-height:1.8;">
          Te esperamos con los brazos abiertos.<br/>¡Disfruta cada momento de tu estadía!
        </p>
      </td>
    </tr>

    ${footer(data.business_name)}
  `)
}

export function emailRecordatorio48h(data: {
  business_name: string
  guest_name: string
  cabin_name: string
  check_in: string
  check_out: string
  nights: number
  booking_code: string
  owner_whatsapp: string
}) {
  return wrapper(`
    ${header(data.business_name)}
    <tr>
      <td style="padding:40px 40px 24px;text-align:center;">
        <p style="font-size:52px;margin:0 0 16px;">🏡</p>
        <p style="margin:0 0 6px;font-family:${FONT_SANS};font-size:11px;color:${GOLD};text-transform:uppercase;letter-spacing:3px;">Recordatorio</p>
        <h2 style="margin:0 0 12px;font-family:${FONT};font-size:28px;font-weight:400;color:${TEXT_LIGHT};">¡Tu estadía es en 2 días!</h2>
        <p style="margin:0;font-family:${FONT_SANS};font-size:15px;color:${TEXT_MUTED};line-height:1.8;">
          Hola <span style="color:${TEXT_LIGHT};font-weight:600;">${data.guest_name}</span>, se acerca tu reserva en <span style="color:${TEXT_LIGHT};font-weight:600;">${data.business_name}</span>.
        </p>
      </td>
    </tr>

    <tr>
      <td style="padding:0 40px 32px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:${BG_CARD};border-radius:6px;overflow:hidden;border:1px solid #1e2d40;">
          ${codeBlock(data.booking_code)}
          ${detailRow("Cabaña", data.cabin_name)}
          ${detailRow("Check-in", data.check_in)}
          ${detailRow("Check-out", data.check_out, false, true)}
        </table>
      </td>
    </tr>

    <tr>
      <td style="padding:0 40px 40px;text-align:center;">
        <a href="https://wa.me/${data.owner_whatsapp.replace(/[^0-9]/g, '')}" style="display:inline-block;background:#25D366;color:#ffffff;text-decoration:none;padding:16px 48px;border-radius:4px;font-family:${FONT_SANS};font-weight:700;font-size:13px;letter-spacing:2px;text-transform:uppercase;">Contactar por WhatsApp →</a>
      </td>
    </tr>

    ${footer(data.business_name)}
  `)
}