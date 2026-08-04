// lib/auto-cancel.ts — Fuente única de verdad de la ventana de auto-cancelación
// de reservas draft sin comprobante (decisión PLAN_NOCHE_TAKAI: 3h flat, los
// clientes lo pidieron; reemplaza al legacy por-tenant transfer_timeout_hours).
//
// Consumidores — deben usar SIEMPRE esta constante para no contradecirse:
// - /api/cron/cancelar-pendientes  → cancela drafts más viejos que esta ventana
// - /api/bookings/bank-info        → countdown que ve el turista en pago-pendiente
// - /api/cron/recordatorio-transferencia → ventana del recordatorio WhatsApp
export const AUTO_CANCEL_HOURS = 3
