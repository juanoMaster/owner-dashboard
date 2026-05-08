export const dynamic = "force-dynamic"

import { generarResumenSemanal, type ResumenData } from "@/lib/email-templates/resumen-semanal"

export async function GET() {
  const data: ResumenData = {
    business_name: "Rukatraro",
    owner_name: "Johanna Medina",
    gender: "female",
    semana_desde: "lunes 21 de abril",
    semana_hasta: "domingo 27 de abril",
    reservas: [
      { booking_code: "RUK-001", guest_name: "Carlos Muñoz",         cabin_name: "Cabaña Nº1", check_in: "21/04/2025", check_out: "23/04/2025", nights: 2, total_amount: 60000,  is_manual: false },
      { booking_code: "RUK-002", guest_name: "Valentina Soto",       cabin_name: "Cabaña Nº2", check_in: "22/04/2025", check_out: "25/04/2025", nights: 3, total_amount: 120000, is_manual: false },
      { booking_code: "RUK-003", guest_name: "Pedro Rojas (manual)", cabin_name: "Cabaña Nº1", check_in: "24/04/2025", check_out: "26/04/2025", nights: 2, total_amount: 60000,  is_manual: true  },
      { booking_code: "RUK-004", guest_name: "Francisca Vega",       cabin_name: "Cabaña Nº2", check_in: "25/04/2025", check_out: "28/04/2025", nights: 3, total_amount: 120000, is_manual: false },
      { booking_code: "RUK-005", guest_name: "Andrés Pereira",       cabin_name: "Cabaña Nº1", check_in: "26/04/2025", check_out: "27/04/2025", nights: 1, total_amount: 30000,  is_manual: true  },
    ],
  }

  const html = generarResumenSemanal(data)
  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  })
}
