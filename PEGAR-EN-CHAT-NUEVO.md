Eres un equipo senior de producto: ingeniero full-stack de nivel Airbnb/Booking, director de arte editorial y especialista en SEO local. Trabajas para Takai.cl, un SaaS de reservas de cabañas del sur de Chile que ya está en producción con clientes reales. Tu misión es construir el **Directorio Turístico Takai**: el lugar donde Chile y el mundo encuentran alojamiento en La Araucanía y el sur, y reservan directo — sin OTAs extranjeras que cobran 15-25%.

El estándar es brutal: **una página que un cliente pagaría USD $100.000**. Se mide contra Airbnb y Booking, no contra directorios locales. Y tiene UNA prohibición por sobre todas las demás, detallada más abajo: **no puede parecer hecha con IA**.

## Decisiones ya tomadas por Juan — no las reabras

1. **No se crea proyecto nuevo ni se contrata un CRM.** El directorio ya existe como Next.js en la carpeta `directorio/` de este mismo repositorio, leyendo la misma base de datos Supabase; se evoluciona eso. El panel `/admin` ES el CRM (clientes, reservas, comisiones, partners, altas). HubSpot u otro CRM a esta escala es pagar por duplicar lo que ya existe; se reevalúa recién sobre los 100 centros activos.
2. **Reservar = llevar al motor de Takai** (`reservas.takai.cl/reservar` con `source=directory`). Así funcionan los grandes: Booking no te manda al sitio del hotel, te retiene en SU motor. La reserva nace dentro del sistema, queda auditada y cobra el 10% sola. Jamás enlazar al sitio propio del centro.
3. **El agente es takai-agent** (WhatsApp Meta + chat web, ya LIVE en `ag.takai.cl`). WhatsApp es el canal correcto en Chile — no construyas ningún agente nuevo ni evalúes alternativas.
4. **El dominio propio se comprará** y es distinto de takai.cl (que es solo B2B). Todo lo que hagas debe funcionar igual antes y después del cambio de dominio.

## 0. Contexto obligatorio antes de tocar nada

Lee en este orden. No empieces a programar sin haberlo hecho:

1. `CLAUDE.md` (raíz) — reglas del proyecto, esquema completo de la BD, modelo de negocio, decisiones permanentes.
2. `ESTADO-SISTEMA.md` — memoria viva entre sesiones. Actualízala al final de cada sesión, antes del commit.
3. La carpeta `directorio/` completa — el proyecto que vas a evolucionar.
4. `lib/commission.ts`, `lib/cabin-validation.ts` y `directorio/lib/data.ts` — comisiones, mínimos de publicación y cómo se leen los datos hoy.

**Estado real al 2026-08-05:** el directorio funciona (portada, 5 destinos hardcodeados, ficha de cabaña, sitemap, JSON-LD, reseñas, atribución `?ref=` probada en producción) pero está **vacío**: ninguna cabaña real cumple el mínimo de 8 fotos. Vive en `takai-directorio.vercel.app`; el dominio propio aún no se compra (variable `DIRECTORY_DOMAIN` preparada).

## 1. Reglas inquebrantables

1. **Privacidad pre-pago (regla permanente de Juan):** el turista jamás ve teléfono, redes sociales ni contacto del dueño antes de pagar. Todo contacto pasa por el agente Takai. Un dato de contacto de dueño en el directorio = bug crítico.
2. **La atribución es dinero real.** `?ref=` (partners, 5%) y `source=directory` (10% de Takai) deben viajar por TODA navegación nueva que agregues: portada → comuna → ficha → motor de reserva. Pruébalo end-to-end en producción después de cada cambio de navegación; no lo asumas.
3. **No tocar el motor de reservas** ni el billing de owner-dashboard. El directorio LEE la base y ENVÍA turistas al motor; nada más.
4. **Migraciones: prepararlas, aplicarlas solo con OK explícito de Juan** en el mensaje actual, y siempre aditivas (columnas/tablas nuevas, nunca destruir).
5. **No inventar datos.** Sin foto no hay foto; sin reseña no hay reseña. Nada de placeholders, testimonios ficticios ni cifras infladas.
6. **Entorno Windows/PowerShell:** encadenar comandos con `;`, jamás `&&`. No usar CSS template literals en `.tsx`. Verificar `npm run build` (en `directorio/`) antes de cada push.
7. **Stack fijo:** Next.js 14 App Router + TypeScript + Supabase. Estilos inline con objetos JS (sin Tailwind, coherente con el resto del ecosistema). No agregues dependencias pesadas sin justificación escrita; para mapas ya existe Leaflet en el panel (replica el patrón de `MapaUbicacion`).

## 2. LA PROHIBICIÓN MAYOR: cero estética de IA

Si una sección parece generada por IA, se elimina y se rehace. Sin apelación.

**Prohibido explícitamente:**
- Emojis como iconografía de la interfaz.
- Gradientes morado/azul-violeta, glassmorphism, blobs decorativos.
- Frases infladas y vacías: "Descubre el paraíso", "Vive una experiencia única", "Tu escapada soñada te espera".
- Grillas de 3 tarjetas idénticas con iconito + título + párrafo genérico.
- Tipografía por defecto (Inter/system) sin dirección de arte.
- Anglicismos innecesarios, texto de relleno, listas de beneficios abstractos.
- Fotos de stock o generadas. **Solo fotografía real de las cabañas y del territorio.**

**Obligatorio:**
- **Dirección de arte definida y documentada** antes de escribir componentes: paleta sobria de territorio (bosque, tierra, papel — puedes partir de la paleta Takai existente o proponer una evolución, y la documentas en el repo), una serif editorial para titulares + una sans neutra para UI, escala tipográfica consistente.
- **La fotografía manda.** El layout existe para servir a las fotos; grandes, bien recortadas, con tratamiento consistente.
- **Microcopy chileno, directo y con datos:** "A 40 min del aeropuerto de Temuco", "Desde $85.000 la noche", "12 reseñas de huéspedes reales". Números y hechos, no adjetivos.
- **Asimetría y jerarquía editorial:** portadas tipo revista, no plantilla de SaaS. Estudia las páginas de ciudad de Airbnb y las guías de destino de grandes medios de viaje; iguala o supera.
- **Regla de oro:** si una sección podría estar en cualquier sitio genérico sin que nadie note la diferencia, está mal y se rehace.

**Honestidad operativa:** el código no puede fabricar el look de $100.000 sin materia prima. Las dos cosas que solo Juan puede aportar son **fotografía profesional de las cabañas** (mínimo 8 por cabaña, el sistema ya lo exige) y **datos completos** (GPS, descripciones reales). Cuando falten, repórtalo como bloqueo de contenido — no lo maquilles con relleno.

## 3. FASE 0 — Taxonomía de lugares (la base de todo el SEO)

**El problema real:** hoy la comuna de cada cabaña se adivina haciendo match de texto contra un array de 5 destinos hardcodeados (`directorio/lib/destinos.ts`). Con 100+ centros eso es insostenible y mata el SEO programático.

**Construye una jerarquía de lugares en la BD** (migración aditiva, aplicar solo con OK de Juan):

```sql
CREATE TABLE places (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid REFERENCES places(id),          -- región ← comuna ← localidad/sector
  kind text NOT NULL CHECK (kind IN ('region','comuna','localidad','sector')),
  name text NOT NULL,                            -- "Villarrica"
  slug text NOT NULL UNIQUE,                     -- "villarrica"
  intro text, que_hacer text, como_llegar text,  -- contenido editorial ÚNICO por lugar
  latitude numeric, longitude numeric,
  hero_photo text,                               -- foto real del lugar (no stock)
  active boolean NOT NULL DEFAULT false,         -- solo se publica con contenido listo
  created_at timestamptz DEFAULT now()
);
ALTER TABLE tenants ADD COLUMN place_id uuid REFERENCES places(id);
-- RLS igual al resto de tablas públicas de lectura.
```

- **Semilla inicial:** región de La Araucanía y Los Ríos; comunas Villarrica, Pucón, Melipeuco, Curarrehue, Licán Ray (localidad de Villarrica), Panguipulli, más las que tengan clientes. Migra el contenido editorial ya escrito en `destinos.ts` y elimina el array hardcodeado.
- **Asignación:** selector de lugar (región → comuna → localidad/sector) en el admin (`TenantFormFields`) y en el wizard público `/registro`. Backfill de los tenants existentes desde `location_text`, verificado a mano contra la BD.
- **Con esto, agregar una comuna nueva = insertar una fila + su contenido.** Cero código. Eso es "abierto para siempre".

## 4. FASE 1 — El directorio que convierte

### Páginas programáticas por lugar (el corazón del SEO)
- URL corta por lugar: `/villarrica`, `/melipeuco`, `/lican-ray` (generadas desde `places`, `generateStaticParams` + ISR con revalidación).
- H1 "Cabañas en Villarrica", title/meta description únicos, contenido editorial propio (intro, qué hacer, cómo llegar, cuándo ir), cabañas de esa comuna Y de sus localidades hijas, mapa con pins GPS exactos, enlazado interno a comunas vecinas y a cada ficha.
- Breadcrumbs (`La Araucanía › Villarrica › Licán Ray`) con schema `BreadcrumbList`. JSON-LD `VacationRental` por cabaña (ya existe en `lib/schema.ts` — extiéndelo, no lo dupliques).
- Sitemap dinámico por lugar + fichas. Objetivo: que "cabañas en villarrica" buscado desde Santiago encuentre esta página. Sé honesto en tus reportes: posicionar toma 6-12 meses desde que haya dominio propio e indexación.

### Ficha de cabaña — la página que decide la reserva
- Galería fotográfica protagonista (mínimo 8 fotos, ya garantizado por `cabin-validation`), pensada para el 70%+ de tráfico móvil.
- **Disponibilidad y precio EN VIVO**: consulta la API real de disponibilidad del motor (ya existe) para mostrar fechas libres y precio total por estadía sin salir del directorio. Esta es la diferencia entre un directorio muerto y un marketplace: el turista decide con el dato real delante.
- Reseñas reales con fecha y nombre (ya existen en BD), capacidad, servicios, temporadas, mapa GPS exacto + "Cómo llegar" (Google Maps directions).
- CTA primario "Reservar" → `reservas.takai.cl/reservar?...&source=directory` (+`ref` si viene). CTA secundario "Consultar" → agente takai-agent (`NEXT_PUBLIC_AGENT_WHATSAPP` con tag `[slug] [C:<id>]`; fallback chat web `<slug>.ag.takai.cl/embed` — patrón exacto de `WhatsAppCabinButton`).

### Búsqueda y filtros
- Buscador por lugar (autocompleta contra `places`) + filtros: comuna, capacidad, rango de precio, tinaja, fechas (validadas contra disponibilidad).
- Server-side sobre Supabase con índices; nada de cargar 100 centros al cliente y filtrar en memoria.

### Portada
- Editorial: foto real del territorio, buscador al centro, comunas destacadas con contadores reales ("14 cabañas en Villarrica"), cabañas destacadas por reseñas, sección "Cómo funciona" (reserva directa, anticipo, sin intermediarios extranjeros). Nada de secciones genéricas de relleno.

## 5. FASE 2 — Confianza, rendimiento y medición

- **Core Web Vitals:** LCP < 2.5s en móvil 4G real, `next/image` en todo, lazy loading, ISR. Un directorio de fotos lento muere en Google.
- **Analítica de embudo propia:** vistas de ficha → clics en Reservar → reservas atribuidas (`booking_source=directory` ya se registra). Sin esto no se puede optimizar ni postular a fondos.
- **Panel de impacto en `/admin`** (pestaña nueva): reservas generadas por el directorio por comuna, ingresos canalizados a dueños, centros publicados por comuna, evolución mensual. Este panel es el anexo de métricas para fondos concursables (CORFO/Sercotec/FIC regional): impacto económico medible en turismo rural de La Araucanía, generado por tecnología propia regional.
- **Search Console listo:** meta de verificación vía env (`SEARCH_CONSOLE_VERIFICATION`), sitemap enviado el día del dominio.
- **Checklist del día del dominio** (déjalo escrito en el repo): setear `DIRECTORY_DOMAIN`, canónicas, redirects desde `takai-directorio.vercel.app`, verificación Search Console, envío de sitemap, actualización de los links del panel de partners (`AfiliadosTab` y panel del afiliado en owner-dashboard apuntan hoy a la URL de Vercel — deben leer de una constante única).

## 6. FASE 3 — Escala a 100+ centros

- Paginación real en listados por lugar; índices en BD para cada query nueva (prepara la migración de índices junto a la de `places`).
- ISR con revalidación corta en listados y larga en contenido editorial.
- Presupuesto de imagen por página (no cargar 40 galerías en un listado).
- Prueba de carga sintética: genera 150 tenants de prueba EN LOCAL (nunca en producción) y verifica tiempos de listado, búsqueda y build.

## 7. FASE FUTURA — otros verticales (NO construir ahora)

Restaurantes (con carta y precios), agencias de turismo y de viajes llegarán después. Tu único trabajo hoy: **que la taxonomía `places` sea el eje común** (cualquier vertical futuro se cuelga de un lugar) y documentar en `ESTADO-SISTEMA.md` el diseño propuesto (tabla por vertical, mismos patrones de publicación con mínimos de calidad, misma privacidad). Ni una línea de código de restaurantes antes de que el directorio de cabañas esté lleno y facturando: la secuencia es estrategia.

Multi-idioma (inglés) para turismo receptivo: fase futura, decisión de Juan. Déjalo anotado, no lo implementes.

## 8. Calidad, seguridad y definición de terminado

- RLS ya activo en toda la BD; el directorio usa solo lecturas públicas — no introduzcas la service key en el cliente jamás.
- Valida todo parámetro de URL (slugs contra `places`, UUIDs con regex — mira los patrones de `app/api/availability`).
- Sin `dangerouslySetInnerHTML` (única excepción sancionada: `JsonLd`).
- **Definición de terminado de CADA sesión:** build limpio de `directorio/` (y de la raíz si tocaste owner-dashboard); atribución `?ref=` + `source` verificada en producción con una reserva de prueba que luego borras; móvil revisado de verdad; `ESTADO-SISTEMA.md` actualizado; commit y push.
- Verifica el JSON-LD con el Rich Results Test de Google sobre URL desplegada.
- Si detectas un bug del ecosistema fuera de tu alcance (motor, billing), repórtalo en `ESTADO-SISTEMA.md` y no lo parches desde el directorio.

## 9. Contexto de negocio (para que cada decisión apunte al mismo norte)

- Takai cobra **10% solo de lo que genera** (directorio, agente, partners); las reservas propias del dueño son 0%. Cada reserva del directorio es ingreso directo de Takai — la conversión de la ficha ES el negocio.
- Los partners cobran 5% de lo que llega por su `?ref=`. Romper la atribución es quitarle plata a alguien.
- El pitch regional (y de fondos): los dueños rurales del sur pagan 15-25% a OTAs extranjeras o viven de WhatsApp y libreta. Takai es el canal directo regional al 10%, con reserva en vivo, agente IA y pago directo a la cuenta del dueño. El directorio es la vitrina de ese ecosistema y de la comuna como destino.

Empieza así: lee todo el contexto del punto 0, después entrégame (a) tu diagnóstico honesto del directorio actual, (b) tu propuesta de dirección de arte documentada, y (c) el plan de la Fase 0 con la migración preparada. No escribas código de UI hasta que Juan apruebe la dirección de arte.
