import { Resend } from "resend"

export const resend = new Resend(process.env.RESEND_API_KEY)

const LOGO_URL = "https://owner-dashboard-navy.vercel.app/takai-logo.png"
const GOLD = "#C9A84C"
const DARK = "#0a0a0a"
const FONT = "Georgia, 'Times New Roman', serif"
const FONT_SANS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif"

function header(business_name: string) {
  return `
    <tr>
      <td style="background:${DARK};padding:40px 40px 28px;text-align:center;border-bottom:2px solid ${GOLD};">
        <img src="${LOGO_URL}" alt="Takai" width="100" height="100" style="display:block;margin:0 auto 16px;border-radius:12px;" />
        <p style="margin:0;color:${GOLD};font-family:${FONT_SANS};font-size:11px;letter-spacing:4px;text-transform:uppercase;">Sistema de Reservas</p>
        <h1 style="margin:8px 0 0;color:#ffffff;font-family:${FONT};font-size:26px;font-weight:400;letter-spacing:2px;">${business_name}</h1>
      </td>
    </tr>
  `
}

function footer(business_name: string) {
  return `
    <tr>
      <td style="background:#0a0a0a;padding:24px 40px;text-align:center;border-top:1px solid #222;">
        <p style="margin:0;color:${GOLD};font-family:${FONT_SANS};font-size:11px;letter-spacing:3px;text-transform:uppercase;">TAKAI.CL</p>
        <p style="margin:6px 0 0;color:#555;font-family:${FONT_SANS};font-size:12px;">Enviado en nombre de ${business_name} · Sistema de reservas para cabañas en Chile</p>
      </td>
    </tr>
  `
}

function detailRow(label: string, value: string, last = false) {
  return `
    <tr>
      <td style="padding:14px 24px;${last ? "" : "border-bottom:1px solid #f0f0f0;"}">
        <p style="margin:0;font-family:${FONT_SANS};font-size:10px;color:#aaa;text-transform:uppercase;letter-spacing:1.5px;">${label}</p>
        <p style="margin:5px 0 0;font-family:${FONT_SANS};font-size:15px;color:#1a1a1a;font-weight:600;">${value}</p>
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
<body style="margin:0;padding:0;background:#f2f2f2;font-family:${FONT_SANS};">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f2f2f2;padding:48px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:4px;overflow:hidden;max-width:600px;width:100%;box-shadow:0 4px 24px rgba(0,0,0,0.10);">
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
      <td style="padding:40px 40px 16px;">
        <p style="margin:0 0 4px;font-family:${FONT_SANS};font-size:12px;color:#aaa;text-transform:uppercase;letter-spacing:2px;">Solicitud recibida</p>
        <h2 style="margin:0 0 16px;font-family:${FONT};font-size:28px;font-weight:400;color:#0a0a0a;">Hola, ${data.guest_name}</h2>
        <p style="margin:0;font-family:${FONT_SANS};font-size:15px;color:#555;line-height:1.7;">
          Recibimos tu solicitud de reserva en <strong style="color:#0a0a0a;">${data.business_name}</strong>. 
          Lo revisaremos y te confirmaremos a la brevedad.
        </p>
      </td>
    </tr>

    <tr>
      <td style="padding:24px 40px;">
        <div style="background:#fafafa;border:1px solid #ebebeb;border-radius:4px;overflow:hidden;">
          <div style="background:${DARK};padding:14px 24px;">
            <p style="margin:0;font-family:${FONT_SANS};font-size:10px;color:${GOLD};text-transform:uppercase;letter-spacing:2px;">Código de reserva</p>
            <p style="margin:4px 0 0;font-family:${FONT};font-size:28px;color:#ffffff;letter-spacing:4px;">${data.booking_code}</p>
          </div>
          <table width="100%" cellpadding="0" cellspacing="0">
            ${detailRow("Cabaña", data.cabin_name)}
            ${detailRow("Check-in", data.check_in)}
            ${detailRow("Check-out", data.check_out)}
            ${detailRow("Noches", `${data.nights} noches`)}
            ${data.has_tinaja && data.tinaja_amount ? detailRow("Tinaja", `$${data.tinaja_amount.toLocaleString("es-CL")} CLP`) : ""}
            ${detailRow("Total", `$${data.total_amount.toLocaleString("es-CL")} CLP`)}
            <tr>
              <td style="padding:14px 24px;background:#fffbf2;">
                <p style="margin:0;font-family:${FONT_SANS};font-size:10px;color:#aaa;text-transform:uppercase;letter-spacing:1.5px;">Adelanto requerido (${pct}%)</p>
                <p style="margin:5px 0 0;font-family:${FONT};font-size:24px;color:${GOLD};font-weight:400;">$${data.deposit_amount.toLocaleString("es-CL")} CLP</p>
              </td>
            </tr>
          </table>
        </div>
      </td>
    </tr>

    <tr>
      <td style="padding:0 40px 40px;">
        <p style="margin:0 0 8px;font-family:${FONT_SANS};font-size:14px;color:#666;line-height:1.7;">
          En cuanto ${data.gender === "female" ? "la dueña" : "el dueño"} confirme el pago, recibirás un email con la confirmación oficial de tu reserva.
        </p>
        <p style="margin:0;font-family:${FONT_SANS};font-size:13px;color:#aaa;">
          Guarda tu código <span style="color:${GOLD};font-weight:700;letter-spacing:1px;">${data.booking_code}</span> para cualquier consulta.
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
      <td style="padding:40px 40px 16px;">
        <div style="display:inline-block;background:#fff8e6;border:1px solid ${GOLD};border-radius:20px;padding:6px 16px;margin-bottom:16px;">
          <p style="margin:0;font-family:${FONT_SANS};font-size:12px;color:${GOLD};font-weight:600;letter-spacing:1px;">NUEVA SOLICITUD</p>
        </div>
        <h2 style="margin:0 0 12px;font-family:${FONT};font-size:26px;font-weight:400;color:#0a0a0a;">Nueva reserva recibida</h2>
        <p style="margin:0;font-family:${FONT_SANS};font-size:15px;color:#555;line-height:1.7;">
          Hola <strong style="color:#0a0a0a;">${data.owner_name}</strong>, tienes una nueva solicitud de reserva en tu panel.
        </p>
      </td>
    </tr>

    <tr>
      <td style="padding:16px 40px;">
        <p style="margin:0 0 10px;font-family:${FONT_SANS};font-size:10px;color:#aaa;text-transform:uppercase;letter-spacing:2px;">Datos del turista</p>
        <div style="background:#fafafa;border:1px solid #ebebeb;border-radius:4px;overflow:hidden;">
          <table width="100%" cellpadding="0" cellspacing="0">
            ${detailRow("Nombre", data.guest_name)}
            ${detailRow("Email", data.guest_email)}
            ${detailRow("Teléfono", data.guest_phone)}
            ${detailRow("Personas", `${data.guests_count} personas`, true)}
          </table>
        </div>
      </td>
    </tr>

    <tr>
      <td style="padding:16px 40px;">
        <p style="margin:0 0 10px;font-family:${FONT_SANS};font-size:10px;color:#aaa;text-transform:uppercase;letter-spacing:2px;">Detalle de la reserva</p>
        <div style="background:#fafafa;border:1px solid #ebebeb;border-radius:4px;overflow:hidden;">
          <div style="background:${DARK};padding:14px 24px;">
            <p style="margin:0;font-family:${FONT_SANS};font-size:10px;color:${GOLD};text-transform:uppercase;letter-spacing:2px;">Código</p>
            <p style="margin:4px 0 0;font-family:${FONT};font-size:24px;color:#ffffff;letter-spacing:3px;">${data.booking_code}</p>
          </div>
          <table width="100%" cellpadding="0" cellspacing="0">
            ${detailRow("Cabaña", data.cabin_name)}
            ${detailRow("Check-in / Check-out", `${data.check_in} → ${data.check_out}`)}
            ${detailRow("Noches", `${data.nights} noches`)}
            ${data.has_tinaja && data.tinaja_amount ? detailRow("Tinaja", `$${data.tinaja_amount.toLocaleString("es-CL")} CLP`) : ""}
            <tr>
              <td style="padding:14px 24px;background:#fffbf2;">
                <p style="margin:0;font-family:${FONT_SANS};font-size:10px;color:#aaa;text-transform:uppercase;letter-spacing:1.5px;">Total / Adelanto esperado</p>
                <p style="margin:5px 0 0;font-family:${FONT_SANS};font-size:16px;color:#1a1a1a;font-weight:700;">
                  $${data.total_amount.toLocaleString("es-CL")} 
                  <span style="color:${GOLD};">/ $${data.deposit_amount.toLocaleString("es-CL")} CLP</span>
                </p>
              </td>
            </tr>
          </table>
        </div>
      </td>
    </tr>

    <tr>
      <td style="padding:16px 40px 40px;text-align:center;">
        <a href="${data.dashboard_url}" style="display:inline-block;background:${GOLD};color:#0a0a0a;text-decoration:none;padding:16px 40px;border-radius:2px;font-family:${FONT_SANS};font-weight:700;font-size:14px;letter-spacing:1px;text-transform:uppercase;">Ver en mi panel →</a>
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
      <td style="padding:40px 40px 16px;text-align:center;">
        <div style="display:inline-block;background:#f0faf4;border:1px solid #4caf7d;border-radius:20px;padding:8px 20px;margin-bottom:20px;">
          <p style="margin:0;font-family:${FONT_SANS};font-size:12px;color:#2e7d52;font-weight:700;letter-spacing:1px;">✓ RESERVA CONFIRMADA</p>
        </div>
        <h2 style="margin:0 0 12px;font-family:${FONT};font-size:28px;font-weight:400;color:#0a0a0a;">¡Todo listo, ${data.guest_name}!</h2>
        <p style="margin:0;font-family:${FONT_SANS};font-size:15px;color:#555;line-height:1.7;">
          Tu reserva en <strong style="color:#0a0a0a;">${data.business_name}</strong> está 100% confirmada.
        </p>
      </td>
    </tr>

    <tr>
      <td style="padding:16px 40px;">
        <div style="background:#fafafa;border:1px solid #ebebeb;border-radius:4px;overflow:hidden;">
          <div style="background:${DARK};padding:14px 24px;">
            <p style="margin:0;font-family:${FONT_SANS};font-size:10px;color:${GOLD};text-transform:uppercase;letter-spacing:2px;">Código de reserva</p>
            <p style="margin:4px 0 0;font-family:${FONT};font-size:28px;color:#ffffff;letter-spacing:4px;">${data.booking_code}</p>
          </div>
          <table width="100%" cellpadding="0" cellspacing="0">
            ${detailRow("Cabaña", data.cabin_name)}
            ${detailRow("Check-in", data.check_in)}
            ${detailRow("Check-out", data.check_out, true)}
          </table>
        </div>
      </td>
    </tr>

    <tr>
      <td style="padding:24px 40px 40px;text-align:center;">
        <p style="margin:0 0 8px;font-family:${FONT};font-size:20px;color:#0a0a0a;font-weight:400;">
          Gracias por elegirnos 🎉
        </p>
        <p style="margin:0;font-family:${FONT_SANS};font-size:15px;color:#666;line-height:1.7;">
          Te esperamos con los brazos abiertos.<br/>¡Esperamos que disfrutes cada momento de tu estadía!
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
      <td style="padding:40px 40px 16px;text-align:center;">
        <p style="font-size:52px;margin:0 0 16px;">🏡</p>
        <p style="margin:0 0 4px;font-family:${FONT_SANS};font-size:12px;color:#aaa;text-transform:uppercase;letter-spacing:2px;">Recordatorio</p>
        <h2 style="margin:0 0 12px;font-family:${FONT};font-size:28px;font-weight:400;color:#0a0a0a;">¡Tu estadía es en 2 días!</h2>
        <p style="margin:0;font-family:${FONT_SANS};font-size:15px;color:#555;line-height:1.7;">
          Hola <strong style="color:#0a0a0a;">${data.guest_name}</strong>, se acerca tu reserva en <strong style="color:#0a0a0a;">${data.business_name}</strong>.
        </p>
      </td>
    </tr>

    <tr>
      <td style="padding:16px 40px;">
        <div style="background:#fafafa;border:1px solid #ebebeb;border-radius:4px;overflow:hidden;">
          <div style="background:${DARK};padding:14px 24px;">
            <p style="margin:0;font-family:${FONT_SANS};font-size:10px;color:${GOLD};text-transform:uppercase;letter-spacing:2px;">Código</p>
            <p style="margin:4px 0 0;font-family:${FONT};font-size:24px;color:#ffffff;letter-spacing:3px;">${data.booking_code}</p>
          </div>
          <table width="100%" cellpadding="0" cellspacing="0">
            ${detailRow("Cabaña", data.cabin_name)}
            ${detailRow("Check-in", data.check_in)}
            ${detailRow("Check-out", data.check_out, true)}
          </table>
        </div>
      </td>
    </tr>

    <tr>
      <td style="padding:16px 40px 40px;text-align:center;">
        <a href="https://wa.me/${data.owner_whatsapp.replace(/[^0-9]/g, '')}" style="display:inline-block;background:#25D366;color:#ffffff;text-decoration:none;padding:16px 40px;border-radius:2px;font-family:${FONT_SANS};font-weight:700;font-size:14px;letter-spacing:1px;text-transform:uppercase;">Contactar por WhatsApp →</a>
      </td>
    </tr>

    ${footer(data.business_name)}
  `)
}