-- 016_liquidacion_partners.sql
-- Liquidación de comisiones a partners (decisión de Juan 2026-08-04).
--
-- El programa paga DOS cosas distintas y hay que poder marcar cada una como
-- pagada, o Juan termina pagando dos veces o se le olvida alguna:
--   1. Comisión ÚNICA por traer un alojamiento  → tenants.referral_fee_*
--   2. Comisión POR RESERVA (5%) que llegó por su link → bookings.affiliate_paid_at
--
-- Sobre `referral_fee_amount`: los dos primeros tramos los calcula el sistema
-- (ver lib/referral.ts). Los centros de más de 10 cabañas son "a convenir", así
-- que el monto se escribe a mano en el panel y queda guardado aquí.
--
-- Puramente ADITIVA: tres columnas nullable, sin defaults, sin tocar datos.

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS referral_fee_amount numeric,
  ADD COLUMN IF NOT EXISTS referral_paid_at timestamptz;

COMMENT ON COLUMN public.tenants.referral_fee_amount IS
  'Monto acordado con el partner por haber traído este alojamiento. Calculado por tramos, o escrito a mano si el centro es grande (a convenir).';
COMMENT ON COLUMN public.tenants.referral_paid_at IS
  'Cuándo se le pagó al partner la comisión por traer este alojamiento. NULL = pendiente de pago.';

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS affiliate_paid_at timestamptz;

COMMENT ON COLUMN public.bookings.affiliate_paid_at IS
  'Cuándo se le liquidó al partner el 5% de esta reserva. NULL = pendiente de pago.';

-- Para listar rápido lo que falta pagar de cada partner.
CREATE INDEX IF NOT EXISTS idx_bookings_affiliate_pendiente
  ON public.bookings (affiliate_id)
  WHERE affiliate_id IS NOT NULL AND affiliate_paid_at IS NULL AND deleted_at IS NULL;

-- Verificación:
-- SELECT column_name FROM information_schema.columns
--  WHERE table_name='tenants' AND column_name LIKE 'referral%';
