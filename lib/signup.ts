// lib/signup.ts — Alta self-service de propietarios (decisión de Juan 2026-08-03).
//
// FLUJO (fase 1, semi-automática):
//   1. El dueño llena el formulario público en /registro.
//   2. POST /api/registro crea su tenant con active=false (invisible al público),
//      sus cabañas, su acceso al panel y un cobro pendiente de la cuota de entrada
//      guardado en commission_statements con kind='setup_fee'.
//   3. Paga con tarjeta (MercadoPago) o avisa que transfiere. El webhook de
//      billing marca el setup_fee como pagado y avisa a Takai.
//   4. Un admin revisa (fotos, datos bancarios, que el alojamiento sea suyo) y
//      aprueba en /admin → el tenant pasa a active=true y recibe su acceso.
//
// La aprobación humana existe a propósito: sin ella, cualquiera podría publicar
// cabañas ajenas o datos bancarios equivocados a los que los turistas
// transferirían dinero. Cuando el flujo demuestre calidad se puede automatizar
// quitando solo el paso 4.

export const SETUP_FEE_CLP = 160000

// kind de commission_statements que identifica la cuota de entrada (la columna
// es texto libre; 'commission' queda reservado a los estados de cuenta del 10%).
export const SETUP_FEE_KIND = "setup_fee"

// billing_status de un tenant que se registró pero aún no fue aprobado.
// No es "suspended", así que isBillingBlocked() nunca lo bloquea; lo que lo
// mantiene fuera del aire es tenants.active=false.
export const SIGNUP_PENDING_STATUS = "pending"

export function slugifyBusiness(input: string): string {
  const s = input
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
  return s || "cabana"
}

export function isValidEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim())
}
