-- ============================================================================
-- 017_places.sql — Taxonomía de lugares del Directorio Takai (Fase 0)
-- ============================================================================
--
-- ⚠️  PREPARADA, NO APLICADA. Requiere OK explícito de Juan en el mensaje actual.
--
-- QUÉ HACE: crea la jerarquía de lugares (región ← comuna ← localidad ← sector)
-- que reemplaza el array hardcodeado `directorio/lib/destinos.ts` y pasa a ser el
-- eje del SEO programático: agregar una comuna nueva = insertar una fila.
--
-- 100% ADITIVA: crea una tabla nueva, agrega una columna nullable a `tenants` y
-- crea índices. NO altera, NO borra y NO reescribe ningún dato existente.
-- Idempotente (IF NOT EXISTS / ON CONFLICT DO NOTHING): se puede correr dos veces.
--
-- NO INCLUYE BACKFILL DE `tenants.place_id` A PROPÓSITO. Verificado en producción
-- el 2026-08-05: los 7 tenants tienen `location_text`, `latitude` y `longitude` en
-- NULL, así que no existe texto del cual deducir la comuna. La asignación se hace
-- a mano, tenant por tenant, con el bloque comentado del final de este archivo.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Tabla de lugares
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS places (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id   uuid REFERENCES places(id) ON DELETE RESTRICT,
  kind        text NOT NULL CHECK (kind IN ('region','comuna','localidad','sector')),

  name        text NOT NULL,                -- "Villarrica"
  slug        text NOT NULL UNIQUE,         -- "villarrica" → URL /villarrica

  -- Contenido editorial ÚNICO por lugar (nada duplicado entre páginas: es la
  -- diferencia entre indexar y ser tratado como contenido delgado).
  intro         text,
  que_hacer     text,
  como_llegar   text,
  cuando_ir     text,
  teletrabajo   text,                       -- long-tail: estadías largas / nómadas

  -- Overrides opcionales de SEO. Si van en NULL, el código los deriva del nombre.
  meta_title        text,
  meta_description  text,

  latitude    numeric,                      -- centro del lugar (para el mapa)
  longitude   numeric,
  hero_photo  text,                         -- foto REAL del lugar (jamás stock)

  sort_order  int  NOT NULL DEFAULT 100,    -- orden en portada; menor primero
  active      boolean NOT NULL DEFAULT false, -- se publica solo con contenido listo

  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),

  -- Un lugar no puede ser su propio padre.
  CONSTRAINT places_no_self_parent CHECK (parent_id IS NULL OR parent_id <> id),

  -- Formato de slug: minúsculas, números y guiones. Sin acentos ni espacios,
  -- porque el slug va directo en la URL de primer nivel (/villarrica).
  CONSTRAINT places_slug_format CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),

  -- El slug de un lugar vive en la raíz del sitio, así que NO puede chocar con
  -- una ruta real del directorio. Sin este guard, un lugar llamado "cabana"
  -- dejaría inalcanzables todas las fichas (/cabana/[id]).
  CONSTRAINT places_slug_no_reservado CHECK (slug NOT IN (
    'cabana','cabanas','api','admin','buscar','destinos','lugares','opengraph-image',
    'sitemap','sitemap-xml','robots','robots-txt','favicon','static','public',
    'next','_next','images','img','assets','registro','reservar','resena','embed'
  ))
);

COMMENT ON TABLE  places IS 'Jerarquía de lugares del Directorio Takai (Fase 0). Eje común para los verticales futuros (restaurantes, agencias): todo se cuelga de un lugar.';
COMMENT ON COLUMN places.kind IS 'region ← comuna ← localidad ← sector. La jerarquía se recorre por parent_id.';
COMMENT ON COLUMN places.active IS 'false = existe en BD pero no se publica ni entra al sitemap. Se activa cuando el contenido editorial está escrito.';
COMMENT ON COLUMN places.hero_photo IS 'URL de fotografía REAL del lugar. Nunca stock ni generada (regla de arte del directorio).';

-- ----------------------------------------------------------------------------
-- 2. Índices — uno por cada query que el directorio va a hacer
-- ----------------------------------------------------------------------------
-- Página de lugar por slug (ya cubierto por el UNIQUE de slug).
-- Hijos de un lugar (cabañas de la comuna + de sus localidades).
CREATE INDEX IF NOT EXISTS idx_places_parent      ON places(parent_id);
-- Listados y sitemap: solo lugares publicados, en orden.
CREATE INDEX IF NOT EXISTS idx_places_kind_active ON places(kind, active, sort_order);

-- ----------------------------------------------------------------------------
-- 3. RLS — mismo patrón que `cabins` (lectura pública), pero más estricto:
--    el anónimo solo ve lugares publicados.
--    El directorio lee con service role (bypassa RLS); esta política existe para
--    que una lectura con la clave anon nunca exponga borradores editoriales.
-- ----------------------------------------------------------------------------
ALTER TABLE places ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS places_public_read ON places;
CREATE POLICY places_public_read ON places
  FOR SELECT TO public
  USING (active = true);

-- ----------------------------------------------------------------------------
-- 4. Enlace tenant → lugar
--    Nullable a propósito: un tenant recién registrado todavía no tiene lugar
--    asignado, y eso no debe impedir su alta.
--    ON DELETE RESTRICT: borrar un lugar con tenants encima debe fallar, no
--    dejar clientes huérfanos en silencio.
-- ----------------------------------------------------------------------------
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS place_id uuid REFERENCES places(id) ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS idx_tenants_place ON tenants(place_id) WHERE place_id IS NOT NULL;

COMMENT ON COLUMN tenants.place_id IS 'Lugar (comuna/localidad) del centro. Reemplaza el match por texto contra location_text. NULL = sin asignar, no aparece en páginas de lugar.';

-- ----------------------------------------------------------------------------
-- 5. Semilla — SOLO contenido que ya existe y es de Takai
--    Migrado literal desde directorio/lib/destinos.ts (intro, que_hacer,
--    teletrabajo). `como_llegar` y `cuando_ir` quedan en NULL a propósito:
--    exigen datos verificables (distancias, rutas, temporadas) y este archivo no
--    inventa hechos. Se completan con contenido aprobado por Juan.
--
--    Las regiones nacen con active=false: hoy son solo el padre del breadcrumb,
--    no páginas con contenido propio.
-- ----------------------------------------------------------------------------

-- 5.1 Regiones (contenedores del breadcrumb)
INSERT INTO places (kind, name, slug, active, sort_order)
VALUES
  ('region', 'La Araucanía', 'la-araucania', false, 10),
  ('region', 'Los Ríos',     'los-rios',     false, 20)
ON CONFLICT (slug) DO NOTHING;

-- 5.2 Comunas con contenido editorial ya escrito → nacen publicadas
--     (hoy ya están al aire en el directorio; dejarlas inactivas sería una regresión)
INSERT INTO places (kind, parent_id, name, slug, active, sort_order, intro, que_hacer, teletrabajo)
SELECT 'comuna', r.id, v.name, v.slug, true, v.sort_order, v.intro, v.que_hacer, v.teletrabajo
FROM (VALUES
  ('villarrica', 'Villarrica', 'la-araucania', 30,
   'Villarrica combina lago, volcán y ciudad. Con todos los servicios a mano y el volcán nevado como telón de fondo, es una base perfecta para explorar la región mientras te alojas en una cabaña cómoda.',
   'Disfruta la costanera del lago Villarrica, sube al volcán, visita la Feria Mapuche, recorre cervecerías artesanales y date una vuelta por los saltos y termas de los alrededores.',
   'Por su conectividad y servicios, Villarrica es ideal para teletrabajar desde el sur. Busca cabañas con wifi estable para estadías largas y combina trabajo con naturaleza.'),

  ('pucon', 'Pucón', 'la-araucania', 40,
   'Pucón es la capital del turismo aventura del sur de Chile. Termas, volcán, ríos y bosques milenarios rodean este destino vibrante, con cabañas para todos los estilos.',
   'Asciende el volcán Villarrica, relájate en las termas geométricas, haz rafting en el Trancura, camina por el Parque Nacional Huerquehue o recorre el Ojos del Caburgua.',
   'Para quienes trabajan en remoto, Pucón ofrece cafés, coworkings y cabañas con wifi para teletrabajo. Aprovecha estadías largas en temporada baja con mejores precios.'),

  ('melipeuco', 'Melipeuco', 'la-araucania', 50,
   'Melipeuco es la puerta de entrada al Parque Nacional Conguillío, uno de los paisajes más asombrosos de Chile: araucarias milenarias, lagunas de origen volcánico y el imponente volcán Llaima. Un destino cordillerano auténtico, ideal para alojarse en una cabaña rodeada de naturaleza pura.',
   'Recorre el Parque Nacional Conguillío y sus lagunas Verde, Arcoíris y Conguillío, camina entre araucarias centenarias en la Sierra Nevada, visita los saltos y ríos del valle del Truful-Truful, y conoce la cultura mapuche-pehuenche de la zona con su gastronomía de piñones.',
   'Si buscas desconexión real sin dejar de trabajar, Melipeuco ofrece silencio, aire de cordillera y cabañas con wifi. Es una base perfecta para estadías largas: trabajas en la semana y exploras Conguillío el fin de semana.'),

  ('panguipulli', 'Panguipulli', 'los-rios', 60,
   'Conocida como la ''ciudad de las rosas'', Panguipulli es la puerta de entrada a los Siete Lagos. Un destino auténtico y menos masivo, ideal para una cabaña rodeada de naturaleza.',
   'Explora los Siete Lagos, visita Neltume y el Salto del Huilo-Huilo, recorre la Reserva Biológica Huilo-Huilo y disfruta la tranquilidad de los pueblos cordilleranos.',
   'Panguipulli es un secreto bien guardado para nómadas digitales que buscan calma total. Estadías largas en cabañas con wifi, lejos del bullicio y cerca de la naturaleza.'),

  ('curarrehue', 'Curarrehue', 'la-araucania', 70, NULL, NULL, NULL)
) AS v(slug, name, region_slug, sort_order, intro, que_hacer, teletrabajo)
JOIN places r ON r.slug = v.region_slug AND r.kind = 'region'
ON CONFLICT (slug) DO NOTHING;

-- Curarrehue entra sin contenido → no se publica hasta escribirlo.
UPDATE places SET active = false WHERE slug = 'curarrehue' AND intro IS NULL;

-- 5.3 Localidades (cuelgan de su comuna)
--     Licán Ray es localidad de Villarrica, no comuna. Mantiene su slug actual
--     (/lican-ray) para no romper URLs ya indexadas ni el sitemap vigente.
INSERT INTO places (kind, parent_id, name, slug, active, sort_order, intro, que_hacer, teletrabajo)
SELECT 'localidad', c.id, 'Licán Ray', 'lican-ray', true, 35,
  'A orillas del lago Calafquén, Licán Ray es uno de los balnearios más queridos del sur de Chile. Sus playas de arena negra, los bosques nativos y el ritmo tranquilo lo hacen ideal para desconectarse en una cabaña frente al lago.',
  'Recorre la Península, báñate en las playas Grande y Chica, sube al mirador, navega el lago o visita las termas cercanas. En temporada hay ferias costumbristas y gastronomía mapuche.',
  'Cada vez más nómadas digitales eligen Licán Ray para estadías largas: naturaleza, calma y cabañas con wifi para teletrabajo. Reserva por semanas o meses y trabaja con el lago de fondo.'
FROM places c WHERE c.slug = 'villarrica' AND c.kind = 'comuna'
ON CONFLICT (slug) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 6. Verificación (correr después de aplicar)
-- ----------------------------------------------------------------------------
-- SELECT p.kind, p.name, p.slug, p.active, par.name AS padre
-- FROM places p LEFT JOIN places par ON par.id = p.parent_id
-- ORDER BY p.sort_order;
--
-- Esperado: 2 regiones (inactivas), 5 comunas (4 activas + curarrehue inactiva),
-- 1 localidad activa (lican-ray, hija de villarrica).

-- ----------------------------------------------------------------------------
-- 7. BACKFILL MANUAL de tenants.place_id — NO se ejecuta automáticamente
-- ----------------------------------------------------------------------------
-- Los 7 tenants tienen location_text NULL (verificado 2026-08-05), así que no hay
-- de dónde deducir la comuna. Juan confirma cada asignación y recién entonces se
-- descomenta. Propuesta a confirmar:
--
--   el-mirador                 → lican-ray   (el nombre del negocio lo indica)
--   cabanas-majoaal-licanray   → lican-ray   (el slug lo indica)
--   glamping-cacagual          → sin lugar   (está en Ecuador; el directorio es
--                                             de Chile. Queda place_id NULL y
--                                             no aparece en páginas de lugar)
--   cabanas-miki / cabanas-takai → sin lugar (cuentas de prueba)
--   rukatraro / trinidad         → sin lugar (ex-prospectos, active=false)
--
-- UPDATE tenants SET place_id = (SELECT id FROM places WHERE slug = 'lican-ray')
-- WHERE slug IN ('el-mirador', 'cabanas-majoaal-licanray');
--
-- Verificación del backfill:
-- SELECT t.slug, t.business_name, p.name AS lugar
-- FROM tenants t LEFT JOIN places p ON p.id = t.place_id
-- WHERE t.active ORDER BY t.slug;
