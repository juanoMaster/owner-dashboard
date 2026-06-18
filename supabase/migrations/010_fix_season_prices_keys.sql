-- Migración 010: normalizar claves de season_prices
-- Ejecutar manualmente en el SQL Editor de Supabase.
--
-- Contexto: las cabañas creadas antes del fix de pricing usaban
-- start_date/end_date (strings ISO YYYY-MM-DD) en lugar de
-- start_md/end_md (strings MM-DD). lib/pricing.ts espera start_md/end_md.
-- Esta migración convierte el formato antiguo al nuevo, de forma idempotente.

UPDATE cabins
SET season_prices = (
  SELECT jsonb_agg(
    CASE
      -- Ya tiene start_md: no tocar
      WHEN season ? 'start_md' THEN season
      -- Tiene start_date: convertir a MM-DD
      WHEN season ? 'start_date' THEN (
        (season - 'start_date' - 'end_date')
        || jsonb_build_object(
            'start_md', RIGHT(season->>'start_date', 5),
            'end_md',   RIGHT(season->>'end_date',   5)
          )
      )
      ELSE season
    END
  )
  FROM jsonb_array_elements(cabins.season_prices) AS season
)
WHERE season_prices IS NOT NULL
  AND jsonb_typeof(season_prices) = 'array'
  AND jsonb_array_length(season_prices) > 0
  -- Solo procesar cabañas que tengan algún elemento con start_date (antiguo)
  AND EXISTS (
    SELECT 1
    FROM jsonb_array_elements(cabins.season_prices) AS s
    WHERE s ? 'start_date'
  );
