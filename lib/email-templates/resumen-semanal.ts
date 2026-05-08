// Commission rate — applied only to web bookings
const TAKAI_COMMISSION_RATE = 0.10
const WISE_ACCOUNT_PLACEHOLDER = "WISE_ACCOUNT_PLACEHOLDER"
const GREEN_GRAD = "linear-gradient(140deg,#1a6b45 0%,#25905e 60%,#1e7d52 100%)"
const FONT = "'Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif"

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

// "lunes 21 de abril" + "domingo 27 de abril" → "Semana 21 – 27 Abr 2025"
function weekChip(desde: string, hasta: string): string {
  const MONTHS: Record<string, string> = {
    enero:"Ene",febrero:"Feb",marzo:"Mar",abril:"Abr",mayo:"May",junio:"Jun",
    julio:"Jul",agosto:"Ago",septiembre:"Sep",octubre:"Oct",noviembre:"Nov",diciembre:"Dic",
  }
  const pd = desde.split(" ")
  const ph = hasta.split(" ")
  const dayStart = pd[1] ?? ""
  const dayEnd   = ph[1] ?? ""
  const monthRaw = (ph[3] ?? ph[ph.length - 1] ?? "").toLowerCase()
  const month    = MONTHS[monthRaw] ?? monthRaw
  const year     = new Date().getUTCFullYear()
  return `Semana ${dayStart} – ${dayEnd} ${month} ${year}`
}

// Handles both "2026-04-21" (Supabase) and "21/04/2026" (preview mock)
function shortDate(d: string): string {
  if (d.includes("/")) {
    const p = d.split("/")
    return `${p[0]}/${p[1]}`
  }
  const p = d.split("-")
  return p.length >= 3 ? `${p[2]}/${p[1]}` : d
}

function bookingTable(reservas: ResumenReserva[]): string {
  const thStyle = (align: string) =>
    `padding:10px 8px;text-align:${align};font-size:9.5px;font-weight:700;letter-spacing:0.08em;` +
    `text-transform:uppercase;color:#94a3b8;border-bottom:1px solid #e2e8f0;white-space:nowrap;font-family:${FONT};`
  const cols = ["Código","Huésped","Cabaña","Check-in","Check-out","Noches","Total"]
  const ths = cols.map((c, i) => {
    const align = i === cols.length - 1 ? "right" : "left"
    const pl = i === 0 ? "12px" : "8px"
    const pr = i === cols.length - 1 ? "12px" : "8px"
    return `<th style="padding:10px ${pr} 10px ${pl};${thStyle(align).slice(thStyle(align).indexOf("text-align"))}">${c}</th>`
  }).join("")

  const rows = reservas.map(r => {
    const badge = r.is_manual
      ? `<span style="display:inline-block;padding:2px 7px;border-radius:5px;font-size:9.5px;font-weight:700;` +
        `letter-spacing:0.06em;text-transform:uppercase;margin-right:4px;vertical-align:middle;` +
        `background:#dbeafe;color:#1d4ed8;">Manual</span>`
      : `<span style="display:inline-block;padding:2px 7px;border-radius:5px;font-size:9.5px;font-weight:700;` +
        `letter-spacing:0.06em;text-transform:uppercase;margin-right:4px;vertical-align:middle;` +
        `background:#dcfce7;color:#15803d;">Web</span>`
    const base = `padding:11px 8px;color:#334155;font-weight:500;white-space:nowrap;font-family:${FONT};font-size:12px;border-bottom:1px solid #f1f5f9;`
    return `<tr>
      <td style="${base}padding-left:12px;"><strong>${r.booking_code}</strong></td>
      <td style="${base}">${badge}${r.guest_name}</td>
      <td style="${base}">${r.cabin_name}</td>
      <td style="${base}">${shortDate(r.check_in)}</td>
      <td style="${base}">${shortDate(r.check_out)}</td>
      <td style="${base}">${r.nights}</td>
      <td style="${base}text-align:right;font-weight:700;color:#1e293b;padding-right:12px;">${clp(r.total_amount)}</td>
    </tr>`
  }).join("")

  return `
    <div style="border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:12px;min-width:520px;">
        <thead><tr style="background:#f8fafc;">${ths}</tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`
}

function sectionDot(color: string): string {
  return `<span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:${color};margin-right:8px;vertical-align:middle;"></span>`
}

function renderBookings(reservas: ResumenReserva[]): string {
  const webR = reservas.filter(r => !r.is_manual)
  const manR = reservas.filter(r => r.is_manual)
  const manTotal = manR.reduce((s, r) => s + r.total_amount, 0)
  const labelBase = `font-size:10.5px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;margin:0 0 12px;font-family:${FONT};`

  const webSection = webR.length > 0 ? `
    <p style="${labelBase}color:#1a6b45;">${sectionDot("#1a6b45")}Reservas Online</p>
    ${bookingTable(webR)}
    <div style="height:32px;"></div>` : ""

  const manSection = manR.length > 0 ? `
    <p style="${labelBase}color:#1d4ed8;">${sectionDot("#1d4ed8")}Reservas Manuales <span style="font-weight:400;text-transform:none;letter-spacing:0;">(sin comisión)</span></p>
    ${bookingTable(manR)}
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f7ff;border:1px solid #dbeafe;border-radius:10px;margin-top:14px;">
      <tr>
        <td style="padding:12px 18px;font-size:13px;color:#475569;font-weight:500;font-family:${FONT};">Subtotal reservas manuales</td>
        <td style="padding:12px 18px;text-align:right;font-size:15px;font-weight:700;color:#1e293b;white-space:nowrap;font-family:${FONT};">${clp(manTotal)}</td>
      </tr>
    </table>
    <p style="font-size:12px;color:#94a3b8;margin:10px 0 0;font-style:italic;font-family:${FONT};">⚠ Estas reservas no generan comisión Takai.</p>
    <div style="height:32px;"></div>` : ""

  return webSection + manSection
}

function renderFinance(data: ResumenData): string {
  const webR = data.reservas.filter(r => !r.is_manual)
  const total_bruto       = data.reservas.reduce((s, r) => s + r.total_amount, 0)
  const base_comisionable = webR.reduce((s, r) => s + r.total_amount, 0)
  const comision          = Math.round(base_comisionable * TAKAI_COMMISSION_RATE)
  const ganancia          = total_bruto - comision
  const labelBase = `font-size:10.5px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;margin:0 0 12px;font-family:${FONT};color:#94a3b8;`

  return `
    <p style="${labelBase}">${sectionDot("#94a3b8")}Resumen Financiero</p>
    <div style="background:#f8fafc;border-radius:14px;padding:22px 24px;border:1px solid #e2e8f0;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding:8px 0 4px;font-size:15px;font-weight:600;color:#1e293b;font-family:${FONT};">Total generado (todas las reservas)</td>
          <td style="padding:8px 0 4px;font-size:15px;font-weight:600;color:#1e293b;text-align:right;white-space:nowrap;font-family:${FONT};">${clp(total_bruto)}</td>
        </tr>
        <tr>
          <td style="padding:2px 0 2px 12px;font-size:12.5px;color:#94a3b8;font-family:${FONT};">· Reservas online</td>
          <td style="padding:2px 0;font-size:12.5px;color:#94a3b8;text-align:right;white-space:nowrap;font-family:${FONT};">${clp(base_comisionable)}</td>
        </tr>
        <tr>
          <td colspan="2" style="height:8px;"></td>
        </tr>
        <tr>
          <td style="padding:14px 0 7px;font-size:13.5px;color:#64748b;border-top:1px solid #e2e8f0;font-family:${FONT};">Comisión Takai ${Math.round(TAKAI_COMMISSION_RATE * 100)}% (solo reservas online)</td>
          <td style="padding:14px 0 7px;font-size:13.5px;font-weight:600;color:#64748b;text-align:right;white-space:nowrap;border-top:1px solid #e2e8f0;font-family:${FONT};">− ${clp(comision)}</td>
        </tr>
      </table>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:14px;border-radius:10px;border:1px solid #6ee7b7;background:linear-gradient(135deg,#d1fae5,#ecfdf5);">
        <tr>
          <td style="padding:16px 20px;font-size:14px;font-weight:600;color:#065f46;font-family:${FONT};">💰 Tu ganancia neta</td>
          <td style="padding:16px 20px;text-align:right;font-size:24px;font-weight:800;color:#047857;letter-spacing:-0.02em;white-space:nowrap;font-family:${FONT};">${clp(ganancia)}</td>
        </tr>
      </table>
    </div>`
}

function renderTransferBox(data: ResumenData): string {
  const webR = data.reservas.filter(r => !r.is_manual)
  const base  = webR.reduce((s, r) => s + r.total_amount, 0)
  const comision = Math.round(base * TAKAI_COMMISSION_RATE)
  const chip = weekChip(data.semana_desde, data.semana_hasta)

  return `
    <div style="margin-top:32px;background:${GREEN_GRAD};border-radius:18px;padding:30px 34px;text-align:center;">
      <p style="margin:0 0 5px;font-size:10px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:rgba(255,255,255,0.6);font-family:${FONT};">Transferencia Takai</p>
      <p style="margin:0 0 16px;font-size:14px;font-weight:500;color:rgba(255,255,255,0.75);font-family:${FONT};">Tu aporte de esta semana a la plataforma</p>
      <p style="margin:0 0 16px;font-size:52px;font-weight:800;color:#ffffff;line-height:1;letter-spacing:-0.03em;font-family:${FONT};">${clp(comision)}</p>
      <p style="margin:0 0 16px;">
        <span style="display:inline-block;background:rgba(255,255,255,0.15);color:rgba(255,255,255,0.9);font-size:12px;font-weight:600;padding:6px 18px;border-radius:100px;border:1px solid rgba(255,255,255,0.2);letter-spacing:0.03em;font-family:${FONT};">10% sobre reservas online</span>
      </p>
      <p style="margin:0 0 20px;font-size:12px;color:rgba(255,255,255,0.45);font-family:${FONT};">${chip}</p>
      <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(255,255,255,0.10);border:1px solid rgba(255,255,255,0.15);border-radius:12px;">
        <tr>
          <td style="padding:15px 18px;vertical-align:top;font-size:22px;width:40px;">🤝</td>
          <td style="padding:15px 18px 15px 0;font-size:12.5px;color:rgba(255,255,255,0.7);line-height:1.5;text-align:left;font-family:${FONT};"><strong style="color:rgba(255,255,255,0.95);font-weight:600;">Gracias por confiar en Takai.</strong> Este aporte nos permite seguir atrayendo más huéspedes y hacer crecer tu negocio juntos.</td>
        </tr>
      </table>
    </div>`
}

function renderBankData(): string {
  return `
    <div style="background:#f0f4ff;border:1px solid #d0d8f0;border-radius:12px;padding:18px 22px;margin-top:20px;">
      <p style="margin:0 0 10px;font-size:10px;font-weight:700;color:#94a3b8;letter-spacing:0.14em;text-transform:uppercase;font-family:${FONT};">Datos para la transferencia</p>
      <table cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding:3px 16px 3px 0;font-size:13px;color:#94a3b8;font-family:${FONT};">Banco</td>
          <td style="padding:3px 0;font-size:13px;color:#1e293b;font-weight:600;font-family:${FONT};">Wise</td>
        </tr>
        <tr>
          <td style="padding:3px 16px 3px 0;font-size:13px;color:#94a3b8;font-family:${FONT};">Titular</td>
          <td style="padding:3px 0;font-size:13px;color:#1e293b;font-weight:600;font-family:${FONT};">Takayuki</td>
        </tr>
        <tr>
          <td style="padding:3px 16px 3px 0;font-size:13px;color:#94a3b8;font-family:${FONT};">Cuenta</td>
          <td style="padding:3px 0;font-size:13px;color:#1e293b;font-weight:600;font-family:${FONT};">${WISE_ACCOUNT_PLACEHOLDER}</td>
        </tr>
      </table>
    </div>`
}

export function generarResumenSemanal(data: ResumenData): string {
  const saludo      = data.gender === "female" ? "Estimada" : "Estimado"
  const chip        = weekChip(data.semana_desde, data.semana_hasta)
  const hasBookings = data.reservas.length > 0
  const hasWeb      = data.reservas.some(r => !r.is_manual)

  const body = hasBookings ? `
    ${renderBookings(data.reservas)}
    ${renderFinance(data)}
    ${hasWeb ? renderTransferBox(data) : ""}
    ${hasWeb ? renderBankData() : ""}` : `
    <p style="margin:0;padding:40px 0;text-align:center;font-size:15px;color:#94a3b8;font-family:${FONT};">No hubo reservas confirmadas esta semana.</p>`

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
</head>
<body style="margin:0;padding:0;background:#eef1f5;font-family:${FONT};">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#eef1f5;padding:36px 16px;">
    <tr><td align="center">
      <table width="660" cellpadding="0" cellspacing="0" style="max-width:660px;width:100%;border-radius:22px;overflow:hidden;border-collapse:separate;box-shadow:0 8px 48px rgba(0,0,0,0.10),0 2px 8px rgba(0,0,0,0.06);">

        <!-- HEADER -->
        <tr>
          <td style="background:${GREEN_GRAD};padding:32px 40px 36px;">
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
              <tr>
                <td>
                  <table cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="font-size:28px;font-weight:800;color:#ffffff;letter-spacing:0.1em;line-height:1;font-family:${FONT};">TAKAI</td>
                      <td style="padding-left:10px;padding-bottom:2px;font-size:11px;font-weight:500;color:rgba(255,255,255,0.6);letter-spacing:0.1em;text-transform:uppercase;vertical-align:bottom;font-family:${FONT};white-space:nowrap;">Automatización Inteligente</td>
                    </tr>
                  </table>
                </td>
                <td style="text-align:right;vertical-align:middle;">
                  <span style="display:inline-block;background:rgba(255,255,255,0.15);border:1px solid rgba(255,255,255,0.22);color:rgba(255,255,255,0.9);font-size:11px;font-weight:600;letter-spacing:0.06em;padding:5px 13px;border-radius:100px;white-space:nowrap;font-family:${FONT};">${chip}</span>
                </td>
              </tr>
            </table>
            <p style="margin:0 0 7px;font-size:27px;font-weight:700;color:#ffffff;line-height:1.25;font-family:${FONT};">${saludo} ${data.owner_name},</p>
            <p style="margin:0;font-size:14px;color:rgba(255,255,255,0.65);font-weight:400;line-height:1.5;font-family:${FONT};">Aquí está el resumen de tu semana del <strong style="color:rgba(255,255,255,0.9);font-weight:600;">${data.semana_desde}</strong> al <strong style="color:rgba(255,255,255,0.9);font-weight:600;">${data.semana_hasta}.</strong></p>
          </td>
        </tr>

        <!-- BODY -->
        <tr>
          <td style="background:#ffffff;padding:32px 24px;">
            ${body}
          </td>
        </tr>

        <!-- FOOTER -->
        <tr>
          <td style="background:#f8fafc;padding:22px 24px;border-top:1px solid #e8ecf0;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="font-size:13px;font-weight:800;color:#1a6b45;letter-spacing:0.1em;font-family:${FONT};">TAKAI</td>
                <td style="text-align:right;font-size:12px;color:#94a3b8;line-height:1.6;font-family:${FONT};">¿Tienes dudas? Escríbenos a <a href="mailto:contacto@takai.cl" style="color:#1a6b45;text-decoration:none;font-weight:600;">contacto@takai.cl</a><br>Takai · Automatización Inteligente para alojamientos</td>
              </tr>
            </table>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}
