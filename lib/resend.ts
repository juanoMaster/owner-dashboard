import { Resend } from "resend"

export const resend = new Resend(process.env.RESEND_API_KEY)

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
  const saludo = data.gender === "female" ? "la dueña" : "el dueño"

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Solicitud de Reserva</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;max-width:600px;width:100%;">
        
        <!-- Header -->
        <tr>
          <td style="background:#1a1a1a;padding:32px 40px;text-align:center;">
            <p style="margin:0;color:#C9A84C;font-size:13px;letter-spacing:3px;text-transform:uppercase;">powered by</p>
            <h1 style="margin:4px 0 0;color:#C9A84C;font-size:28px;font-weight:700;letter-spacing:2px;">TAKAI</h1>
            <p style="margin:8px 0 0;color:#ffffff;font-size:18px;font-weight:600;">${data.business_name}</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:40px;">
            <h2 style="margin:0 0 8px;color:#1a1a1a;font-size:22px;">¡Hola, ${data.guest_name}!</h2>
            <p style="margin:0 0 24px;color:#555;font-size:15px;line-height:1.6;">
              Recibimos tu solicitud de reserva en <strong>${data.business_name}</strong>. 
              ${saludo === "la dueña" ? "La dueña" : "El dueño"} revisará tu solicitud y te confirmará a la brevedad.
            </p>

            <!-- Detalle reserva -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f9f9;border-radius:8px;overflow:hidden;margin-bottom:24px;">
              <tr><td style="padding:16px 20px;border-bottom:1px solid #eee;">
                <p style="margin:0;font-size:11px;color:#999;text-transform:uppercase;letter-spacing:1px;">Código de reserva</p>
                <p style="margin:4px 0 0;font-size:20px;font-weight:700;color:#C9A84C;letter-spacing:2px;">${data.booking_code}</p>
              </td></tr>
              <tr><td style="padding:16px 20px;border-bottom:1px solid #eee;">
                <p style="margin:0;font-size:11px;color:#999;text-transform:uppercase;letter-spacing:1px;">Cabaña</p>
                <p style="margin:4px 0 0;font-size:15px;color:#1a1a1a;font-weight:600;">${data.cabin_name}</p>
              </td></tr>
              <tr><td style="padding:16px 20px;border-bottom:1px solid #eee;">
                <p style="margin:0;font-size:11px;color:#999;text-transform:uppercase;letter-spacing:1px;">Check-in</p>
                <p style="margin:4px 0 0;font-size:15px;color:#1a1a1a;font-weight:600;">${data.check_in}</p>
              </td></tr>
              <tr><td style="padding:16px 20px;border-bottom:1px solid #eee;">
                <p style="margin:0;font-size:11px;color:#999;text-transform:uppercase;letter-spacing:1px;">Check-out</p>
                <p style="margin:4px 0 0;font-size:15px;color:#1a1a1a;font-weight:600;">${data.check_out}</p>
              </td></tr>
              <tr><td style="padding:16px 20px;border-bottom:1px solid #eee;">
                <p style="margin:0;font-size:11px;color:#999;text-transform:uppercase;letter-spacing:1px;">Noches</p>
                <p style="margin:4px 0 0;font-size:15px;color:#1a1a1a;font-weight:600;">${data.nights} noches</p>
              </td></tr>
              ${data.has_tinaja && data.tinaja_amount ? `
              <tr><td style="padding:16px 20px;border-bottom:1px solid #eee;">
                <p style="margin:0;font-size:11px;color:#999;text-transform:uppercase;letter-spacing:1px;">Tinaja</p>
                <p style="margin:4px 0 0;font-size:15px;color:#1a1a1a;font-weight:600;">$${data.tinaja_amount.toLocaleString("es-CL")} CLP</p>
              </td></tr>` : ""}
              <tr><td style="padding:16px 20px;border-bottom:1px solid #eee;">
                <p style="margin:0;font-size:11px;color:#999;text-transform:uppercase;letter-spacing:1px;">Total</p>
                <p style="margin:4px 0 0;font-size:18px;color:#1a1a1a;font-weight:700;">$${data.total_amount.toLocaleString("es-CL")} CLP</p>
              </td></tr>
              <tr><td style="padding:16px 20px;">
                <p style="margin:0;font-size:11px;color:#999;text-transform:uppercase;letter-spacing:1px;">Adelanto requerido (${data.deposit_amount > 0 ? Math.round((data.deposit_amount / data.total_amount) * 100) : 20}%)</p>
                <p style="margin:4px 0 0;font-size:18px;color:#C9A84C;font-weight:700;">$${data.deposit_amount.toLocaleString("es-CL")} CLP</p>
              </td></tr>
            </table>

            <p style="margin:0 0 8px;color:#555;font-size:14px;line-height:1.6;">
              Una vez confirmada tu reserva, recibirás los datos de pago para realizar el adelanto.
            </p>
            <p style="margin:0;color:#999;font-size:13px;">
              Guarda tu código <strong style="color:#C9A84C;">${data.booking_code}</strong> para cualquier consulta.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f0f0f0;padding:20px 40px;text-align:center;">
            <p style="margin:0;color:#999;font-size:12px;">Este email fue enviado por <strong>Takai.cl</strong> en nombre de ${data.business_name}</p>
            <p style="margin:4px 0 0;color:#bbb;font-size:11px;">Sistema de reservas para cabañas en Chile</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>
  `
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
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;max-width:600px;width:100%;">
        
        <tr>
          <td style="background:#1a1a1a;padding:32px 40px;text-align:center;">
            <p style="margin:0;color:#C9A84C;font-size:13px;letter-spacing:3px;text-transform:uppercase;">TAKAI — NUEVA SOLICITUD</p>
            <h1 style="margin:8px 0 0;color:#ffffff;font-size:22px;font-weight:600;">${data.business_name}</h1>
          </td>
        </tr>

        <tr>
          <td style="padding:40px;">
            <h2 style="margin:0 0 8px;color:#1a1a1a;font-size:20px;">Nueva reserva recibida 🏡</h2>
            <p style="margin:0 0 24px;color:#555;font-size:15px;">Hola ${data.owner_name}, tienes una nueva solicitud de reserva.</p>

            <!-- Datos del turista -->
            <h3 style="margin:0 0 12px;color:#1a1a1a;font-size:14px;text-transform:uppercase;letter-spacing:1px;">Datos del turista</h3>
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f9f9;border-radius:8px;overflow:hidden;margin-bottom:24px;">
              <tr><td style="padding:14px 20px;border-bottom:1px solid #eee;">
                <p style="margin:0;font-size:11px;color:#999;text-transform:uppercase;letter-spacing:1px;">Nombre</p>
                <p style="margin:4px 0 0;font-size:15px;color:#1a1a1a;font-weight:600;">${data.guest_name}</p>
              </td></tr>
              <tr><td style="padding:14px 20px;border-bottom:1px solid #eee;">
                <p style="margin:0;font-size:11px;color:#999;text-transform:uppercase;letter-spacing:1px;">Email</p>
                <p style="margin:4px 0 0;font-size:15px;color:#1a1a1a;">${data.guest_email}</p>
              </td></tr>
              <tr><td style="padding:14px 20px;border-bottom:1px solid #eee;">
                <p style="margin:0;font-size:11px;color:#999;text-transform:uppercase;letter-spacing:1px;">Teléfono</p>
                <p style="margin:4px 0 0;font-size:15px;color:#1a1a1a;">${data.guest_phone}</p>
              </td></tr>
              <tr><td style="padding:14px 20px;">
                <p style="margin:0;font-size:11px;color:#999;text-transform:uppercase;letter-spacing:1px;">Personas</p>
                <p style="margin:4px 0 0;font-size:15px;color:#1a1a1a;">${data.guests_count} personas</p>
              </td></tr>
            </table>

            <!-- Detalle reserva -->
            <h3 style="margin:0 0 12px;color:#1a1a1a;font-size:14px;text-transform:uppercase;letter-spacing:1px;">Detalle de la reserva</h3>
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f9f9;border-radius:8px;overflow:hidden;margin-bottom:24px;">
              <tr><td style="padding:14px 20px;border-bottom:1px solid #eee;">
                <p style="margin:0;font-size:11px;color:#999;text-transform:uppercase;letter-spacing:1px;">Código</p>
                <p style="margin:4px 0 0;font-size:18px;font-weight:700;color:#C9A84C;">${data.booking_code}</p>
              </td></tr>
              <tr><td style="padding:14px 20px;border-bottom:1px solid #eee;">
                <p style="margin:0;font-size:11px;color:#999;text-transform:uppercase;letter-spacing:1px;">Cabaña</p>
                <p style="margin:4px 0 0;font-size:15px;color:#1a1a1a;font-weight:600;">${data.cabin_name}</p>
              </td></tr>
              <tr><td style="padding:14px 20px;border-bottom:1px solid #eee;">
                <p style="margin:0;font-size:11px;color:#999;text-transform:uppercase;letter-spacing:1px;">Check-in / Check-out</p>
                <p style="margin:4px 0 0;font-size:15px;color:#1a1a1a;font-weight:600;">${data.check_in} → ${data.check_out}</p>
              </td></tr>
              <tr><td style="padding:14px 20px;border-bottom:1px solid #eee;">
                <p style="margin:0;font-size:11px;color:#999;text-transform:uppercase;letter-spacing:1px;">Noches</p>
                <p style="margin:4px 0 0;font-size:15px;color:#1a1a1a;">${data.nights} noches</p>
              </td></tr>
              ${data.has_tinaja && data.tinaja_amount ? `
              <tr><td style="padding:14px 20px;border-bottom:1px solid #eee;">
                <p style="margin:0;font-size:11px;color:#999;text-transform:uppercase;letter-spacing:1px;">Tinaja</p>
                <p style="margin:4px 0 0;font-size:15px;color:#1a1a1a;">$${data.tinaja_amount.toLocaleString("es-CL")} CLP</p>
              </td></tr>` : ""}
              <tr><td style="padding:14px 20px;">
                <p style="margin:0;font-size:11px;color:#999;text-transform:uppercase;letter-spacing:1px;">Total / Adelanto</p>
                <p style="margin:4px 0 0;font-size:16px;color:#1a1a1a;font-weight:700;">$${data.total_amount.toLocaleString("es-CL")} / <span style="color:#C9A84C;">$${data.deposit_amount.toLocaleString("es-CL")}</span> CLP</p>
              </td></tr>
            </table>

            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center">
                  <a href="${data.dashboard_url}" style="display:inline-block;background:#C9A84C;color:#1a1a1a;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:700;font-size:15px;">Ver en mi panel →</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <tr>
          <td style="background:#f0f0f0;padding:20px 40px;text-align:center;">
            <p style="margin:0;color:#999;font-size:12px;">Takai.cl — Sistema de reservas para cabañas en Chile</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>
  `
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
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;max-width:600px;width:100%;">
        
        <tr>
          <td style="background:#1a1a1a;padding:32px 40px;text-align:center;">
            <p style="margin:0;color:#C9A84C;font-size:13px;letter-spacing:3px;text-transform:uppercase;">powered by</p>
            <h1 style="margin:4px 0 0;color:#C9A84C;font-size:28px;font-weight:700;letter-spacing:2px;">TAKAI</h1>
            <p style="margin:8px 0 0;color:#ffffff;font-size:18px;font-weight:600;">${data.business_name}</p>
          </td>
        </tr>

        <tr>
          <td style="padding:40px;">
            <div style="text-align:center;margin-bottom:24px;">
              <span style="display:inline-block;background:#e8f5e9;color:#2e7d32;padding:8px 20px;border-radius:20px;font-size:14px;font-weight:600;">✓ Reserva Confirmada</span>
            </div>

            <h2 style="margin:0 0 8px;color:#1a1a1a;font-size:20px;">¡Tu reserva está confirmada, ${data.guest_name}!</h2>
            <p style="margin:0 0 24px;color:#555;font-size:15px;line-height:1.6;">
              Para completar la reserva, realiza el adelanto del depósito a la cuenta indicada abajo e informa el comprobante por WhatsApp.
            </p>

            <!-- Detalle -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f9f9;border-radius:8px;overflow:hidden;margin-bottom:24px;">
              <tr><td style="padding:14px 20px;border-bottom:1px solid #eee;">
                <p style="margin:0;font-size:11px;color:#999;text-transform:uppercase;letter-spacing:1px;">Código</p>
                <p style="margin:4px 0 0;font-size:20px;font-weight:700;color:#C9A84C;">${data.booking_code}</p>
              </td></tr>
              <tr><td style="padding:14px 20px;border-bottom:1px solid #eee;">
                <p style="margin:0;font-size:11px;color:#999;text-transform:uppercase;letter-spacing:1px;">Cabaña</p>
                <p style="margin:4px 0 0;font-size:15px;color:#1a1a1a;font-weight:600;">${data.cabin_name}</p>
              </td></tr>
              <tr><td style="padding:14px 20px;border-bottom:1px solid #eee;">
                <p style="margin:0;font-size:11px;color:#999;text-transform:uppercase;letter-spacing:1px;">Check-in / Check-out</p>
                <p style="margin:4px 0 0;font-size:15px;color:#1a1a1a;font-weight:600;">${data.check_in} → ${data.check_out}</p>
              </td></tr>
              <tr><td style="padding:14px 20px;">
                <p style="margin:0;font-size:11px;color:#999;text-transform:uppercase;letter-spacing:1px;">Total / Adelanto a pagar</p>
                <p style="margin:4px 0 0;font-size:16px;color:#1a1a1a;font-weight:700;">$${data.total_amount.toLocaleString("es-CL")} / <span style="color:#C9A84C;">$${data.deposit_amount.toLocaleString("es-CL")} CLP</span></p>
              </td></tr>
            </table>

            <!-- Datos bancarios -->
            <h3 style="margin:0 0 12px;color:#1a1a1a;font-size:14px;text-transform:uppercase;letter-spacing:1px;">Datos de transferencia</h3>
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#fffbf0;border:1px solid #C9A84C;border-radius:8px;overflow:hidden;margin-bottom:24px;">
              <tr><td style="padding:14px 20px;border-bottom:1px solid #f0e8d0;">
                <p style="margin:0;font-size:11px;color:#999;text-transform:uppercase;letter-spacing:1px;">Banco</p>
                <p style="margin:4px 0 0;font-size:15px;color:#1a1a1a;font-weight:600;">${data.bank_name}</p>
              </td></tr>
              <tr><td style="padding:14px 20px;border-bottom:1px solid #f0e8d0;">
                <p style="margin:0;font-size:11px;color:#999;text-transform:uppercase;letter-spacing:1px;">Tipo de cuenta</p>
                <p style="margin:4px 0 0;font-size:15px;color:#1a1a1a;font-weight:600;">${data.bank_account_type}</p>
              </td></tr>
              <tr><td style="padding:14px 20px;border-bottom:1px solid #f0e8d0;">
                <p style="margin:0;font-size:11px;color:#999;text-transform:uppercase;letter-spacing:1px;">Número de cuenta</p>
                <p style="margin:4px 0 0;font-size:15px;color:#1a1a1a;font-weight:600;">${data.bank_account_number}</p>
              </td></tr>
              <tr><td style="padding:14px 20px;border-bottom:1px solid #f0e8d0;">
                <p style="margin:0;font-size:11px;color:#999;text-transform:uppercase;letter-spacing:1px;">Titular</p>
                <p style="margin:4px 0 0;font-size:15px;color:#1a1a1a;font-weight:600;">${data.bank_account_holder}</p>
              </td></tr>
              <tr><td style="padding:14px 20px;">
                <p style="margin:0;font-size:11px;color:#999;text-transform:uppercase;letter-spacing:1px;">RUT</p>
                <p style="margin:4px 0 0;font-size:15px;color:#1a1a1a;font-weight:600;">${data.bank_rut}</p>
              </td></tr>
            </table>

            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center">
                  <a href="https://wa.me/${data.owner_whatsapp.replace(/[^0-9]/g, '')}" style="display:inline-block;background:#25D366;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:700;font-size:15px;">Enviar comprobante por WhatsApp →</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <tr>
          <td style="background:#f0f0f0;padding:20px 40px;text-align:center;">
            <p style="margin:0;color:#999;font-size:12px;">Takai.cl — Sistema de reservas para cabañas en Chile</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>
  `
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
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;max-width:600px;width:100%;">
        
        <tr>
          <td style="background:#1a1a1a;padding:32px 40px;text-align:center;">
            <p style="margin:0;color:#C9A84C;font-size:13px;letter-spacing:3px;text-transform:uppercase;">powered by</p>
            <h1 style="margin:4px 0 0;color:#C9A84C;font-size:28px;font-weight:700;letter-spacing:2px;">TAKAI</h1>
            <p style="margin:8px 0 0;color:#ffffff;font-size:18px;font-weight:600;">${data.business_name}</p>
          </td>
        </tr>

        <tr>
          <td style="padding:40px;text-align:center;">
            <p style="font-size:48px;margin:0 0 16px;">🏡</p>
            <h2 style="margin:0 0 8px;color:#1a1a1a;font-size:22px;">¡Tu estadía es en 2 días!</h2>
            <p style="margin:0 0 32px;color:#555;font-size:15px;">Hola ${data.guest_name}, te recordamos que se acerca tu reserva en <strong>${data.business_name}</strong>.</p>

            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f9f9;border-radius:8px;overflow:hidden;margin-bottom:24px;text-align:left;">
              <tr><td style="padding:14px 20px;border-bottom:1px solid #eee;">
                <p style="margin:0;font-size:11px;color:#999;text-transform:uppercase;letter-spacing:1px;">Código</p>
                <p style="margin:4px 0 0;font-size:18px;font-weight:700;color:#C9A84C;">${data.booking_code}</p>
              </td></tr>
              <tr><td style="padding:14px 20px;border-bottom:1px solid #eee;">
                <p style="margin:0;font-size:11px;color:#999;text-transform:uppercase;letter-spacing:1px;">Cabaña</p>
                <p style="margin:4px 0 0;font-size:15px;color:#1a1a1a;font-weight:600;">${data.cabin_name}</p>
              </td></tr>
              <tr><td style="padding:14px 20px;border-bottom:1px solid #eee;">
                <p style="margin:0;font-size:11px;color:#999;text-transform:uppercase;letter-spacing:1px;">Check-in</p>
                <p style="margin:4px 0 0;font-size:15px;color:#1a1a1a;font-weight:600;">${data.check_in}</p>
              </td></tr>
              <tr><td style="padding:14px 20px;">
                <p style="margin:0;font-size:11px;color:#999;text-transform:uppercase;letter-spacing:1px;">Check-out</p>
                <p style="margin:4px 0 0;font-size:15px;color:#1a1a1a;font-weight:600;">${data.check_out}</p>
              </td></tr>
            </table>

            <a href="https://wa.me/${data.owner_whatsapp.replace(/[^0-9]/g, '')}" style="display:inline-block;background:#25D366;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:700;font-size:15px;">Contactar por WhatsApp →</a>
          </td>
        </tr>

        <tr>
          <td style="background:#f0f0f0;padding:20px 40px;text-align:center;">
            <p style="margin:0;color:#999;font-size:12px;">Takai.cl — Sistema de reservas para cabañas en Chile</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>
  `
}