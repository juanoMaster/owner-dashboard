-- 011_pgcron_autocancel_3h.sql
-- FASE 1 — Auto-cancelación de reservas pendientes a las 3 HORAS.
--
-- ⚠ NO aplicar tal cual. Antes de ejecutar en Supabase SQL Editor:
--    1. La URL del panel en producción es https://owner-dashboard-navy.vercel.app
--       (NO panel.takai.cl — ese dominio está mal configurado en Vercel/DNS, ver
--       PROGRESO/BLOCKERS). Usamos la URL .vercel.app que es estable y sí sirve la app.
--    2. Reemplazar  __CRON_SECRET__  por el valor real de CRON_SECRET.
--    Como este archivo embebe un secreto, se aplica MANUALMENTE (no se commitea
--    el secreto). Ver BLOCKERS.md.
--
-- POR QUÉ pg_cron + pg_net (y no depender de Vercel Cron):
--   El plan de Vercel básico solo garantiza una corrida diaria; una ventana de
--   3h exige cadencia de ~15 min. pg_cron es nativo de Postgres, gratis, e
--   independiente del plan de Vercel. pg_net permite invocar el endpoint HTTP
--   existente (/api/cron/cancelar-pendientes), que YA hace soft-delete + libera
--   calendar_blocks + audit_log + WhatsApp al turista. Reutilizamos esa lógica
--   en vez de duplicarla en SQL (criterio del plan: "menos duplicación").
--
-- El endpoint usa el umbral AUTO_CANCEL_HOURS = 3 (ver route.ts), excluye
-- reservas con mp_preference_id y las confirmadas/pagadas. El orquestador diario
-- /api/cron/daily se mantiene como respaldo (no se borra).

-- ── 1. Extensiones (idempotente) ───────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ── 2. Desprogramar el job si ya existía (re-aplicación segura) ─────────────
DO $$
BEGIN
  PERFORM cron.unschedule('takai_autocancel_pendientes');
EXCEPTION WHEN OTHERS THEN
  -- el job no existía aún; ignorar
  NULL;
END $$;

-- ── 3. Programar cada 15 minutos ───────────────────────────────────────────
-- Llama al endpoint con el header Authorization: Bearer <CRON_SECRET>.
SELECT cron.schedule(
  'takai_autocancel_pendientes',
  '*/15 * * * *',
  $job$
    SELECT net.http_get(
      url     := 'https://owner-dashboard-navy.vercel.app/api/cron/cancelar-pendientes',
      headers := jsonb_build_object(
        'Authorization', 'Bearer __CRON_SECRET__'
      )
    );
  $job$
);

-- ── Verificación (correr manualmente tras aplicar) ─────────────────────────
-- SELECT jobid, schedule, jobname, active FROM cron.job
--   WHERE jobname = 'takai_autocancel_pendientes';
-- SELECT * FROM cron.job_run_details
--   WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname='takai_autocancel_pendientes')
--   ORDER BY start_time DESC LIMIT 5;
