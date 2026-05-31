-- Migración 003: flujo de transferencia bancaria
-- Columnas para cancelación automática y seguimiento de comprobantes.

-- Tiempo máximo (horas) que tiene el turista para enviar comprobante.
-- Default 12h. Configurable por tenant.
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS transfer_timeout_hours INTEGER DEFAULT 12;

-- Timestamp en que se recibió el comprobante de transferencia vía WhatsApp.
-- NULL mientras no se haya recibido.
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS transfer_proof_received_at TIMESTAMPTZ;

-- Timestamp del recordatorio de transferencia enviado al turista.
-- NULL si aún no se envió. Evita duplicados en el cron de recordatorio.
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ;
