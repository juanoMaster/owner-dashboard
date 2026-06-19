-- 013_motor_reservas.sql
-- Tablas y columnas nuevas del "motor de reservas" (Fases 6–11).
-- TODAS las tablas nuevas nacen con RLS habilitado (requisito Fase 2).
-- ⚠ Aplicar manualmente en Supabase SQL Editor tras revisión (ver BLOCKERS.md).
-- Idempotente (IF NOT EXISTS / DROP POLICY IF EXISTS).

-- ── 1. Atribución de origen en bookings (Fases 4, 6, 7) ────────────────────
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS booking_source text NOT NULL DEFAULT 'owner_direct',
  ADD COLUMN IF NOT EXISTS affiliate_id   uuid;
-- booking_source: directory | whatsapp_agent | affiliate | owner_direct | manual
-- Generadas por Takai (comisión 10%): directory, whatsapp_agent, affiliate
-- Directas (0%): owner_direct, manual
CREATE INDEX IF NOT EXISTS idx_bookings_source ON bookings(tenant_id, booking_source);

-- ── 2. Afiliados (Fase 7) ──────────────────────────────────────────────────
-- No es tenant-scoped (un afiliado puede traer reservas a varias cabañas).
-- RLS habilitado SIN política anon → default-deny; el acceso es server-side con
-- service role + validación de token (patrón igual a dashboard_links/leads).
CREATE TABLE IF NOT EXISTS affiliates (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code            text NOT NULL UNIQUE,          -- va en ?ref=
  name            text NOT NULL,
  contact         text,
  commission_rate numeric NOT NULL DEFAULT 5
                    CHECK (commission_rate >= 0 AND commission_rate <= 5),
                    -- % cedido al afiliado; sale del 10% de Takai → tope 5% (decisión 2026-06-19)
  token_hash      text UNIQUE,                   -- SHA-256 para el dashboard del afiliado
  active          boolean NOT NULL DEFAULT true,
  created_at      timestamptz DEFAULT now()
);
ALTER TABLE affiliates ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings
  ADD CONSTRAINT bookings_affiliate_fk
  FOREIGN KEY (affiliate_id) REFERENCES affiliates(id) ON DELETE SET NULL
  NOT VALID;  -- NOT VALID: no re-valida filas viejas (todas tienen affiliate_id NULL)

-- ── 3. Reseñas (Fase 9) ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reviews (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid NOT NULL REFERENCES tenants(id),
  cabin_id     uuid REFERENCES cabins(id),
  booking_code text,
  rating       int  NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment      text,
  guest_name   text,
  status       text NOT NULL DEFAULT 'pending', -- pending | approved | rejected
  created_at   timestamptz DEFAULT now()
);
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation" ON reviews;
CREATE POLICY "tenant_isolation" ON reviews USING (tenant_id = current_tenant_id());
CREATE INDEX IF NOT EXISTS idx_reviews_cabin_status ON reviews(cabin_id, status);
CREATE INDEX IF NOT EXISTS idx_reviews_tenant ON reviews(tenant_id);
-- Una reseña por booking_code (anti-spam / anti-duplicado)
CREATE UNIQUE INDEX IF NOT EXISTS uq_reviews_booking_code ON reviews(booking_code) WHERE booking_code IS NOT NULL;

-- ── 4. Opt-out de email (Fase 8) ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS email_opt_out (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  uuid REFERENCES tenants(id),
  email      text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(email)
);
ALTER TABLE email_opt_out ENABLE ROW LEVEL SECURITY;
-- Sin política anon → default-deny; gestionado server-side. La baja es por email
-- global (el turista no quiere más correos de retargeting de ningún tenant).
CREATE INDEX IF NOT EXISTS idx_email_opt_out_email ON email_opt_out(lower(email));

-- ── 5. Conversaciones WhatsApp del agente (Fase 6) ─────────────────────────
CREATE TABLE IF NOT EXISTS whatsapp_conversations (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  uuid NOT NULL REFERENCES tenants(id),
  phone      text NOT NULL,             -- número del turista (E.164)
  cabin_id   uuid REFERENCES cabins(id),
  messages   jsonb NOT NULL DEFAULT '[]'::jsonb,  -- [{role, content, ts}]
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id, phone)
);
ALTER TABLE whatsapp_conversations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation" ON whatsapp_conversations;
CREATE POLICY "tenant_isolation" ON whatsapp_conversations USING (tenant_id = current_tenant_id());
CREATE INDEX IF NOT EXISTS idx_wa_conv_tenant_phone ON whatsapp_conversations(tenant_id, phone);

-- ── 6. Campos por tenant: persona del agente (Fase 6) + Ficha Google (Fase 11) ─
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS agent_system_prompt text,
  ADD COLUMN IF NOT EXISTS google_place_id      text,
  ADD COLUMN IF NOT EXISTS google_business_url  text;

-- ── 7. Re-asegurar RLS de las tablas nuevas (guard de Fase 2) ──────────────
-- (ya habilitado arriba; este SELECT es de verificación manual)
-- SELECT relname, relrowsecurity FROM pg_class WHERE relname IN
--   ('affiliates','reviews','email_opt_out','whatsapp_conversations');
