-- Migración 008: índices críticos para escala + función atómica para reservas manuales
-- Ejecutar manualmente en el SQL Editor de Supabase.

-- ── Índices ────────────────────────────────────────────────────────────────────

-- Carga del panel propietario (dashboard, historial)
CREATE INDEX IF NOT EXISTS idx_bookings_tenant_status
  ON bookings(tenant_id, status)
  WHERE deleted_at IS NULL;

-- Verificación de disponibilidad por cabaña y fechas
CREATE INDEX IF NOT EXISTS idx_bookings_cabin_dates
  ON bookings(cabin_id, check_in, check_out);

-- Webhook Twilio: lookup por booking_code
CREATE INDEX IF NOT EXISTS idx_bookings_booking_code
  ON bookings(booking_code);

-- Webhook Twilio fallback: lookup por teléfono del turista
CREATE INDEX IF NOT EXISTS idx_bookings_guest_phone
  ON bookings(guest_phone);

-- Cron recordatorio: lookup por check_in del día objetivo
CREATE INDEX IF NOT EXISTS idx_bookings_check_in
  ON bookings(check_in);

-- Calendario: verificación de disponibilidad por cabaña y ventana de fechas
CREATE INDEX IF NOT EXISTS idx_calendar_blocks_cabin_dates
  ON calendar_blocks(cabin_id, start_date, end_date);

-- Eliminación de bloques por tenant (cron cancelar-pendientes)
CREATE INDEX IF NOT EXISTS idx_calendar_blocks_tenant
  ON calendar_blocks(tenant_id);

-- Admin panel: audit log por tenant
CREATE INDEX IF NOT EXISTS idx_audit_log_tenant
  ON audit_log(tenant_id, created_at DESC);

-- Billing: estados de cuenta por tenant y período
CREATE INDEX IF NOT EXISTS idx_commission_statements_tenant
  ON commission_statements(tenant_id, period_year DESC, period_month DESC);

-- ── Columnas faltantes ──────────────────────────────────────────────────────────

-- Usada por solicitar-review para no duplicar emails
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS review_sent_at timestamptz DEFAULT NULL;

-- Usada por mp/create-preference para guardar el preference ID de MercadoPago
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS mp_preference_id text DEFAULT NULL;

-- ── create_booking_manual: igual a create_booking_atomic pero con reason='manual' ──
-- Reservas creadas desde el panel propietario usan 'manual' en calendar_blocks
-- para distinguirlas visualmente de reservas de turistas ('transfer_pending').

CREATE OR REPLACE FUNCTION create_booking_manual(
  p_tenant_id uuid,
  p_cabin_id uuid,
  p_check_in date,
  p_check_out date,
  p_guests int,
  p_nights int,
  p_subtotal_amount numeric,
  p_total_amount numeric,
  p_deposit_percent int,
  p_deposit_amount numeric,
  p_balance_amount numeric,
  p_notes text,
  p_booking_code text,
  p_guest_name text,
  p_guest_phone text,
  p_tinaja_amount numeric
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_booking_id uuid;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext(p_cabin_id::text));

  IF EXISTS (
    SELECT 1 FROM calendar_blocks
    WHERE cabin_id = p_cabin_id
      AND tenant_id = p_tenant_id
      AND start_date < p_check_out
      AND end_date > p_check_in
  ) THEN
    RETURN jsonb_build_object('success', false, 'message', 'Las fechas no están disponibles');
  END IF;

  INSERT INTO bookings (
    tenant_id, cabin_id, check_in, check_out, guests, nights,
    subtotal_amount, total_amount, deposit_percent, deposit_amount, balance_amount,
    status, notes, booking_code, guest_name, guest_email, guest_phone,
    tinaja_amount, commission_percent, commission_amount, commission_status
  ) VALUES (
    p_tenant_id, p_cabin_id, p_check_in, p_check_out, p_guests, p_nights,
    p_subtotal_amount, p_total_amount, p_deposit_percent, p_deposit_amount, p_balance_amount,
    'draft', p_notes, p_booking_code, p_guest_name, '', p_guest_phone,
    p_tinaja_amount, 0, 0, 'not_applicable'
  )
  RETURNING id INTO v_booking_id;

  INSERT INTO calendar_blocks (tenant_id, cabin_id, start_date, end_date, reason, booking_id)
  VALUES (p_tenant_id, p_cabin_id, p_check_in, p_check_out, 'manual', v_booking_id);

  RETURN jsonb_build_object('success', true, 'booking_id', v_booking_id::text);
END;
$$;
