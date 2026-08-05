-- 015_referral_de_centros.sql
-- Programa de referidos, segunda pata (decisión de Juan 2026-08-04):
-- además de la comisión por traer TURISTAS, se paga una comisión por traer
-- CENTROS DE CABAÑAS (alojamientos que se incorporan a Takai).
--
-- Sin esta columna no había forma de saber quién trajo a cada alojamiento, así
-- que la comisión por referir centros no sería pagable ni auditable.
--
-- Puramente ADITIVA: columna nullable, sin default, no toca datos existentes.

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS referred_by_affiliate_id uuid REFERENCES public.affiliates(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.tenants.referred_by_affiliate_id IS
  'Afiliado que trajo a este alojamiento (se captura desde ?ref= en /registro). NULL = llegó por su cuenta.';

-- Para listar rápido "qué centros trajo este afiliado" al liquidarle.
CREATE INDEX IF NOT EXISTS idx_tenants_referred_by
  ON public.tenants (referred_by_affiliate_id)
  WHERE referred_by_affiliate_id IS NOT NULL;

-- Verificación:
-- SELECT column_name FROM information_schema.columns
--  WHERE table_name='tenants' AND column_name='referred_by_affiliate_id';
