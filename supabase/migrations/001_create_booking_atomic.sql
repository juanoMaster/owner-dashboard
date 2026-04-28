-- Migración C5: función atómica para crear reservas sin race condition
-- EJECUTAR en Supabase: Dashboard → SQL Editor → New query → Run
--
-- Usa un advisory lock por cabaña para serializar reservas concurrentes.
-- Dos turistas intentando reservar la misma cabaña al mismo tiempo serán
-- forzados a esperar en fila; el segundo verá el bloque del primero.

CREATE OR REPLACE FUNCTION create_booking_atomic(
  p_tenant_id uuid,
  p_cabin_id uuid,
  p_check_in date,
  p_check_out date,
  p_guests int,
  p_nights int,
  p_subtotal_amount numeric,
  p_total_amount numeric,
  p_deposit_amount numeric,
  p_balance_amount numeric,
  p_notes text,
  p_booking_code text,
  p_guest_name text,
  p_guest_email text,
  p_guest_phone text,
  p_tinaja_amount numeric
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_booking_id uuid;
BEGIN
  -- Serializar reservas concurrentes para la misma cabaña
  PERFORM pg_advisory_xact_lock(hashtext(p_cabin_id::text));

  -- Verificar disponibilidad (ahora es atómica: nadie más puede insertar
  -- un bloque para esta cabaña mientras mantenemos el advisory lock)
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
    p_subtotal_amount, p_total_amount, 20, p_deposit_amount, p_balance_amount,
    'draft', p_notes, p_booking_code, p_guest_name, p_guest_email, p_guest_phone,
    p_tinaja_amount, 0, 0, 'not_applicable'
  )
  RETURNING id INTO v_booking_id;

  INSERT INTO calendar_blocks (tenant_id, cabin_id, start_date, end_date, reason, booking_id)
  VALUES (p_tenant_id, p_cabin_id, p_check_in, p_check_out, 'transfer_pending', v_booking_id);

  RETURN jsonb_build_object('success', true, 'booking_id', v_booking_id::text);
END;
$$;
