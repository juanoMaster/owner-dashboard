-- 014_templates_premium_boutique.sql
-- Amplía tenants.template para aceptar las dos plantillas nuevas de landing
-- (decisión de Juan 2026-08-03: llegar a 5 plantillas para que el cliente elija).
--
-- Puramente ADITIVA: solo agrega valores permitidos, no toca datos existentes
-- ni quita ninguno de los 3 valores anteriores. Reversible restaurando el CHECK
-- original. APLICADA en producción el 2026-08-03.

ALTER TABLE public.tenants DROP CONSTRAINT IF EXISTS tenants_template_check;

ALTER TABLE public.tenants
  ADD CONSTRAINT tenants_template_check
  CHECK (template = ANY (ARRAY[
    'clasico'::text,
    'moderno'::text,
    'rural'::text,
    'premium'::text,
    'boutique'::text
  ]));

-- Verificación:
-- SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname = 'tenants_template_check';
