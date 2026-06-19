# PLAN DE CONSTRUCCIÓN NOCTURNA — TAKAI
### Especificación 100% completa para ejecución autónoma con Claude Code

> Este documento es la fuente de verdad de esta tanda de trabajo. Está pensado para que Claude Code lo ejecute **fase por fase, en modo loop, durante la noche**, dejando todo listo para revisión en la mañana. Lee TODO antes de empezar.

---

## 0. PROTOCOLO DE EJECUCIÓN AUTÓNOMA (LEER PRIMERO)

1. **TRABAJA EN UNA RAMA, NUNCA EN `main`.** Producción hace deploy automático en cada push a `main`. Si subes código a medio terminar a `main`, rompes producción durante la noche. Por lo tanto:
   - Crea y trabaja en la rama: `git checkout -b feature/motor-reservas`
   - Haz commits frecuentes EN ESA RAMA.
   - **NUNCA hagas `git push origin main` ni merge a `main`.** El fundador revisa y mergea en la mañana.

2. **Orden de trabajo:** ejecuta las fases en el orden listado (1 → 11). Las Fases 1 y 2 son bloqueantes/críticas y van primero.

3. **Antes de modificar algo existente, ANALÍZALO.** Hay dos áreas donde el código "al parecer ya existe" (RLS y auto-cancelación). Para ellas: primero audita el estado real, escribe lo que encontraste en `PROGRESO.md`, y solo entonces decide si hay que crear o ajustar. No asumas. No dupliques lógica ya existente.

4. **Después de cada fase:**
   - Corre `npm run build` (o el script de build del repo) y el type-check / lint.
   - Si hay errores, arréglalos antes de avanzar.
   - Si la fase quedó verde, haz commit con el mensaje indicado al final de cada fase.
   - Escribe un resumen de lo hecho en `PROGRESO.md`.

5. **Si una fase se bloquea** (falta una env var, una API externa no responde, una decisión requiere al humano): **NO te quedes en loop sobre ella.** Documenta el bloqueo en `BLOCKERS.md` con detalle (qué falta, qué probaste) y **continúa con la siguiente fase independiente**. Casi todas las fases son independientes entre sí.

6. **Crea estos dos archivos de bitácora al iniciar** y mantenlos actualizados durante toda la noche:
   - `PROGRESO.md` — qué se completó, fase por fase.
   - `BLOCKERS.md` — qué quedó bloqueado y por qué.

7. **Verifica las APIs externas contra su documentación vigente** (Twilio WhatsApp, Resend, Supabase, schema.org/Google) antes de implementar, porque los detalles cambian. Este documento te dice QUÉ construir; tú confirmas el CÓMO exacto contra los docs actuales.

---

## 1. REGLAS INVIOLABLES (GUARDRAILS) — NO LAS ROMPAS NUNCA

Estas reglas vienen del `CLAUDE.md` del proyecto y de decisiones permanentes del fundador. Romperlas es un fallo grave.

- **Solo soft-delete. JAMÁS borrado físico** de `bookings` ni de ninguna tabla con historial. Borrar = marcar como eliminado, nunca `DELETE` físico.
- **Estilos inline con objetos JS. NO Tailwind dentro de componentes.** (Regla de entorno Windows/PowerShell). Respeta el patrón existente del repo.
- **Sin ORM.** SQL directo / RPC de Supabase, como ya está hecho.
- **Facturación electrónica SII: NUNCA.** No implementes nada de SII, DTE, boletas ni facturas electrónicas. Decisión permanente.
- **`manual_billing=true` es sagrado.** El tenant `glamping-cacagual` (y cualquiera con esta bandera) **NUNCA se suspende, NUNCA recibe banner, NUNCA se le corta el servicio.** Cualquier lógica nueva debe respetar este invariante.
- **No revertir ni cancelar trabajo de sesiones anteriores** sin instrucción explícita. Construyes sobre lo existente; no deshaces.
- **`takai.cl` se mantiene 100% B2B** (para dueños de cabañas). El nuevo directorio turístico (B2C) va en un **dominio aparte**. No mezclar las dos audiencias en el mismo dominio.
- **Toda salida de texto en emails usa `esc()`** (escape XSS). Cero `dangerouslySetInnerHTML`.
- **Valida UUIDs y formatos de fecha** en todo input público nuevo, igual que el código existente.
- **Multi-tenant:** todo dato nuevo se filtra por `tenant_id`. Usa `getSupabaseForTenant(id)` para respetar RLS. El service role solo server-side.

---

## 2. TAREAS QUE REQUIEREN ACCIÓN HUMANA (HUMAN_TODO)

**Claude Code: NO intentes automatizar esto. Solo prepara el código para que funcione cuando el humano lo complete, y déjalo anotado en `BLOCKERS.md`.**

### Variables de entorno que el fundador debe tener configuradas
Verifica al inicio de cada fase relevante si existen; si falta una, salta esa fase y anótala.
- `LLM_API_KEY` — clave de un modelo de lenguaje para el agente de WhatsApp (Fase 6). Puede ser un modelo barato (Claude Haiku, Gemini Flash, etc.). **El agente NO funciona sin esto.**
- `LLM_API_URL` / `LLM_MODEL` — endpoint y nombre del modelo elegido.
- `DIRECTORY_DOMAIN` — el dominio del directorio B2C (ej. `cabanasdelsur.cl`). El fundador debe comprarlo.
- `SEARCH_CONSOLE_VERIFICATION` — código de verificación de Google Search Console (meta tag).
- Las ya existentes: `RESEND_*`, `TWILIO_*`, `MERCADOPAGO_*`, `SUPABASE_*`, `CRON_SECRET`, `ADMIN_TOKEN`.

### Acciones manuales del fundador (no son código)
- **Comprar el dominio del directorio** y apuntarlo a Vercel.
- **Verificar propiedad del dominio en Google Search Console** (meta tag o DNS) — solo el dueño del dominio puede.
- **Crear/verificar la Ficha de Google (Google Business Profile) de cada cabaña.** Google exige verificación de identidad/dirección (tarjeta postal, teléfono o video) por cada local. **No se puede crear programáticamente una ficha verificada.** Además, muchos alojamientos de renta vacacional no son elegibles para GBP. Por eso la Fase 11 construye un *asistente que guía al dueño*, no una creación automática.
- **Registrar a cada dueño en Sernatur** (RNPST) — es responsabilidad legal de cada dueño con su propio RUT. Takai solo lo guía (no es prioridad técnica, ver nota al final).
- **Conseguir la API key del LLM** para el agente.

---

# FASE 1 — BLOQUEANTE: Auto-cancelación de reservas pendientes a las 3 HORAS

### Objetivo
Que toda reserva en estado borrador/pendiente sin comprobante de pago se cancele automáticamente **3 horas** después de creada (no 24h — los clientes lo pidieron a 3h), liberando el inventario. Excluir las que tienen `mp_preference_id` (pago por MercadoPago en curso).

### Analizar primero
- El repo YA tiene `/api/cron/cancelar-pendientes` (aparece en el orquestador `/api/cron/daily`). **Audita qué hace exactamente:** ¿cancela por umbral de tiempo? ¿qué umbral? ¿con qué frecuencia corre? Escribe el hallazgo en `PROGRESO.md`.
- El problema actual: ese cron corre **una vez al día (09:00 UTC)**. Eso NO puede garantizar una ventana de 3 horas. Una reserva creada a las 10:00 UTC no se revisaría hasta el día siguiente.

### Construir
- **No dependas de la frecuencia de Vercel Cron** (en planes básicos solo permite una corrida diaria, y no queremos asumir el plan). Usa **Supabase `pg_cron`** (nativo de la base, gratis, corre a cualquier intervalo, independiente del plan de Vercel).
- Implementa un job de `pg_cron` que corra **cada 15 minutos** y ejecute una función SQL que:
  - Seleccione bookings en estado borrador/pendiente,
  - con `created_at < now() - interval '3 hours'`,
  - y `mp_preference_id IS NULL`,
  - y los marque como cancelados vía **soft-delete** (el mismo mecanismo que ya usa el código; reutiliza el estado/flag existente, no inventes uno nuevo).
- Si prefieres reutilizar la lógica ya escrita en `/api/cron/cancelar-pendientes` en vez de duplicarla en SQL: usa `pg_cron` + `pg_net` para invocar ese endpoint cada 15 min con el header `Authorization: Bearer CRON_SECRET`. Elige la opción que menos duplique lógica existente.
- Mantén el endpoint existente en el orquestador diario como respaldo (no lo borres).
- Parametriza el umbral (3h) en un solo lugar (constante o config), por si los clientes lo cambian después.

### Criterios de aceptación
- Una reserva borrador sin comprobante creada hace >3h y sin `mp_preference_id` queda cancelada (soft-delete) en máximo 15 min.
- Una reserva con `mp_preference_id` NO se cancela.
- Una reserva confirmada/pagada NO se toca.
- El inventario (calendario) se libera al cancelar.

### Pruebas
- Inserta datos de prueba (en entorno de test, no producción) con distintos `created_at` y verifica el comportamiento.
- Documenta el resultado en `PROGRESO.md`.

### Commit
`git commit -m "feat(cron): auto-cancelación de reservas pendientes a 3h vía pg_cron"`

---

# FASE 2 — BLOQUEANTE: Auditoría y completado de RLS en TODAS las tablas

### Objetivo
Garantizar que **todas** las tablas tengan Row Level Security correcta, sin romper el acceso actual de la app. El fundador indica que "al parecer ya está configurado" — por eso **primero se audita, y solo se completa lo que falte.**

### Analizar primero (CRÍTICO — RLS mal hecho deja la app sin acceso)
- Lista TODAS las tablas del esquema.
- Para cada una, reporta en `PROGRESO.md`: ¿tiene RLS habilitado? ¿qué políticas tiene? ¿filtran por `tenant_id`?
- Identifica el patrón existente: cómo `getSupabaseForTenant(id)` inyecta el contexto de sesión y cómo las políticas usan ese contexto. Replica ESE patrón, no inventes uno nuevo.
- Recuerda: el **service role bypassa RLS** (solo server-side). Las políticas afectan al acceso con clave anónima / contexto de tenant.

### Construir (solo lo que falte)
- Para cada tabla sin RLS o con RLS incompleto, agrega `ENABLE ROW LEVEL SECURITY` y las políticas que filtren por `tenant_id`, siguiendo el patrón existente.
- Aplica los cambios **dentro de una transacción** y de forma incremental (tabla por tabla), no todo de golpe.
- Para tablas nuevas que crearás en fases siguientes (afiliados, reseñas, conversaciones de WhatsApp, opt-out de email), incluye RLS desde su creación.

### Criterios de aceptación
- Toda tabla tiene RLS habilitado.
- **Ningún flujo existente se rompe:** prueba que cada tenant en producción-espejo puede seguir leyendo/escribiendo SUS datos (reservas, cabañas, panel) y NO los de otros.
- El service role sigue funcionando server-side.

### Pruebas (OBLIGATORIO antes de commit)
- Simula acceso como cada tenant y verifica aislamiento (no puede ver datos de otro tenant).
- Simula los flujos clave: crear reserva (turista y manual), confirmar, ver panel del dueño, crons. Todos deben seguir funcionando.
- Si algo se rompe, **revierte ese cambio puntual** y anótalo en `BLOCKERS.md`. No dejes la app sin acceso.

### Commit
`git commit -m "fix(security): auditoría y completado de RLS en todas las tablas"`

---

# FASE 3 — Schema VacationRental (Rich Results orgánicos de Google)

### Objetivo
Que cada página pública de cabaña salga elegible para el **rich result de VacationRental** en la búsqueda normal de Google (tarjeta con foto, precio, estrellas). Esto es 100% gratis y es puro markup. Va en **(a)** las páginas de landing por tenant que ya existen (`/{slug}`) **y (b)** las páginas del directorio (Fase 4).

### Construir
- Inserta JSON-LD `schema.org/VacationRental` en cada página de cabaña. **Verifica los campos requeridos vigentes en la doc de Google** (`developers.google.com/search/docs/appearance/structured-data/vacation-rental`) antes de implementar. Como mínimo incluye:
  - `@type: "VacationRental"`, `name`, `description`
  - `image`: **mínimo 8 fotos** de alta resolución (URLs absolutas)
  - `address` (`PostalAddress` con calle, comuna, región, país)
  - `latitude` / `longitude` con **al menos 5 decimales**
  - `containsPlace` (`Accommodation`): `numberOfRooms`, `occupancy` (máx. huéspedes), `amenityFeature[]` (wifi, estacionamiento, tinaja, etc.), `bed`, `floorSize`
  - `aggregateRating` y `review` (alimentados desde la tabla de reseñas de la Fase 9; si aún no hay reseñas, omite estos campos en vez de inventarlos)
  - `checkinTime`, `checkoutTime`, `petsAllowed`
  - Identificador único de la propiedad
- Genera el JSON-LD **desde los datos reales de Supabase**, no hardcodeado.
- Agrega también `BreadcrumbList` schema para la navegación.

### Criterios de aceptación
- El JSON-LD de cada cabaña pasa el **Rich Results Test** de Google sin errores.
- Los datos del schema coinciden con los datos reales de la cabaña.
- Cabañas sin las 8 fotos o sin geo válida: el sistema avisa (no genera schema inválido).

### Commit
`git commit -m "feat(seo): schema VacationRental JSON-LD en páginas de cabaña"`

---

# FASE 4 — Directorio B2C (proyecto nuevo, dominio aparte)

### Objetivo
El motor pasivo de reservas: un sitio público orientado al turista, en **dominio aparte** (no takai.cl), que lista las cabañas activas, sale en Google por SEO, y **canaliza al turista hacia el motor de reservas existente** de Takai. El directorio NO duplica la lógica de reserva: descubre + atrae + envía al `/reservar` que ya existe.

### Decisión de arquitectura
- Crea el directorio como **proyecto Next.js separado** (carpeta/repo nuevo) que **lee de la MISMA base de datos Supabase** (mismas credenciales de lectura, respetando RLS). Esto mantiene `takai.cl` limpio y B2B, y permite "congelar" cada parte por separado.
- El directorio renderiza páginas públicas con **SSG/ISR** (rápido = mejor SEO). Next.js es tu ventaja técnica real aquí.
- Para la reserva real, cada cabaña del directorio enlaza al motor existente en `takai.cl` (`/reservar?cabin_id=...`). **Importante para atribución:** el link de reserva debe arrastrar los parámetros de origen (`?source=directory` y, si aplica, `?ref={codigo_afiliado}` — ver Fase 7), porque las cookies no cruzan de dominio. Esos parámetros se capturan al momento de crear la reserva.

### Construir
- Estructura de páginas:
  - **Home del directorio**: buscador por destino + cabañas destacadas.
  - **Página por destino** (ver Fase 5): Licán Ray, Villarrica, Pucón, Panguipulli.
  - **Página por cabaña**: fotos, descripción, amenidades, precios, botón "Reservar" (→ motor existente con parámetros de origen) y botón "Consultar por WhatsApp" (→ Fase 6).
- Lee solo cabañas **activas y no eliminadas** (respeta soft-delete).
- Incluye el schema VacationRental de la Fase 3 en cada página de cabaña del directorio.
- Diseño limpio, mobile-first, carga rápida.

### Criterios de aceptación
- El directorio lista correctamente las cabañas activas desde Supabase.
- El botón "Reservar" lleva al motor existente con `source=directory` (y `ref` si viene de afiliado), y ese origen queda guardado en la reserva.
- No expone datos de tenants inactivos ni eliminados.
- Carga rápido (revisar con Lighthouse).

### Commit
`git commit -m "feat(directorio): proyecto B2C que lee de Supabase y canaliza al motor de reservas"`

---

# FASE 5 — SEO completo del directorio

### Objetivo
Que el directorio capture demanda de búsqueda ("cabañas en Licán Ray", "cabaña con wifi para teletrabajo en Villarrica", etc.) y la convierta en reservas. SEO es pasivo pero tarda 3–12 meses; aquí dejamos toda la base configurada.

### Construir
- **`sitemap.xml` dinámico**: genera automáticamente URLs de todas las cabañas activas + todas las páginas de destino. Se actualiza solo cuando se agrega una cabaña (clave para el onboarding de Fase 10).
- **`robots.txt`** correcto.
- **Meta tags por página**: `title` único, `meta description`, `canonical`, Open Graph (`og:title`, `og:image`, `og:description`) y Twitter Card.
- **Páginas de destino con contenido único** (no copiado entre sí): una por Licán Ray, Villarrica, Pucón, Panguipulli. Cada una con texto propio sobre la zona, qué hacer, y enlaces internos a las cabañas de ese destino. Apunta a long-tail keywords.
- **Segmento nómada digital / teletrabajo**: incluye secciones/páginas optimizadas para "cabaña con wifi para teletrabajo en [destino]" y destaca estadías largas. Segmento de alto valor y baja competencia.
- **Verificación de Search Console**: inserta el meta tag desde `SEARCH_CONSOLE_VERIFICATION` (env var). La verificación final la hace el humano (HUMAN_TODO).
- **Idioma**: español por defecto (Chile y Ecuador son ES). **No** implementes multi-idioma ahora (decisión: baja prioridad). Deja la estructura preparada por si después se agrega, pero no lo construyas.

### Criterios de aceptación
- `sitemap.xml` lista todas las cabañas activas y destinos, y se regenera al agregar una cabaña.
- Cada página tiene meta tags únicos y válidos.
- Las páginas de destino tienen contenido diferenciado (no duplicado).
- El meta tag de Search Console aparece cuando la env var está seteada.

### Commit
`git commit -m "feat(seo): sitemap dinámico, meta tags, páginas por destino y base Search Console"`

---

# FASE 6 — Agente IA de WhatsApp (centralizado, sobre Twilio existente)

### Objetivo
Un agente de IA que atiende a los turistas **desde la página de cada cabaña** vía WhatsApp: responde disponibilidad y precios reales 24/7 y envía el link de reserva. Las reservas que genere el agente se marcan como **generadas por Takai → comisión 10%**. El agente es configurable por el fundador (su "personalidad" / instrucciones por tenant).

### Analizar primero
- El repo YA tiene `/api/twilio/webhook` que detecta códigos de reserva en mensajes entrantes. **El agente EXTIENDE ese webhook, no lo reemplaza.** Audita su lógica actual antes de tocar.

### Construir
- **Botón click-to-WhatsApp** en cada página de cabaña (landing existente + directorio): link `wa.me`/`api.whatsapp.com` al número de WhatsApp del tenant (que ya está configurado para notificaciones), con un mensaje pre-llenado que incluya un identificador de la cabaña.
- **Enrutamiento en el webhook entrante** (`/api/twilio/webhook`):
  1. Si el mensaje coincide con el patrón de código de reserva → flujo existente (comprobante recibido). **No cambies esto.**
  2. Si NO → es una consulta de turista → enruta al **agente**.
- **El agente**:
  - Determina **a qué cabaña/tenant** corresponde la conversación (por el número de Twilio que recibió el mensaje y/o el identificador del mensaje pre-llenado).
  - Carga el contexto de la cabaña: nombre, descripción, políticas, amenidades, precios.
  - Llama a un **LLM con function-calling** usando `LLM_API_KEY`. Define herramientas que el agente DEBE usar:
    - `check_availability(cabin_id, check_in, check_out, guests)` → llama internamente al endpoint de disponibilidad existente (`/api/availability`).
    - `get_price(cabin_id, check_in, check_out, guests)` → usa `getPriceForDates` (season-aware).
  - **ANTI-ALUCINACIÓN (regla dura):** el agente **NUNCA inventa** disponibilidad ni precios. SIEMPRE llama a las herramientas antes de afirmar fechas o montos. Si no puede confirmar con datos reales, no afirma.
  - Cuando hay disponibilidad, envía el **link de reserva al motor existente** con `?source=whatsapp_agent` (para atribución y comisión 10%).
- **Memoria de conversación**: crea tabla `whatsapp_conversations` (con RLS, filtrada por tenant) que guarde los últimos mensajes por número de teléfono, para que el agente tenga contexto multi-turno.
- **Persona configurable por tenant**: agrega un campo `agent_system_prompt` por tenant (texto). Si está vacío, usa una persona por defecto (amable, en español chileno, orientada a cerrar la reserva). Así el fundador "crea su agente".
- **Control de costo** (el LLM cuesta por mensaje): usa un modelo barato; limita tokens de salida; solo invoca el LLM para consultas reales (no para códigos de reserva ni mensajes vacíos).
- **Handoff a humano**: si el turista pide hablar con una persona o el agente no puede resolver, notifica al dueño por el flujo de WhatsApp existente.

### Atribución / comisión
- Toda reserva con `source IN ('directory','whatsapp_agent','affiliate')` se considera **generada por Takai → 10%**.
- Toda reserva `source IN ('owner_direct','manual')` → **0%** para el dueño.
- Conecta esto con la Fase 7 (lógica de comisión).

### Criterios de aceptación
- Un turista escribe por WhatsApp desde la página de una cabaña y el agente responde con disponibilidad y precio **reales** (verificados contra los endpoints), nunca inventados.
- El agente entrega un link de reserva con `source=whatsapp_agent`.
- Los códigos de reserva siguen funcionando con el flujo viejo (no se rompió).
- Si falta `LLM_API_KEY`, la fase se salta y se anota en `BLOCKERS.md` (no quedar en loop).

### Commit
`git commit -m "feat(whatsapp): agente IA con function-calling sobre webhook Twilio existente"`

---

# FASE 7 — Programa de afiliados (links de seguimiento + atribución + % comisión)

### Objetivo
Que terceros (bloggers, influencers, agencias locales) traigan reservas a las cabañas a cambio de una comisión, todo medible y automático. Se **vuelve al modelo de cobro por % sobre cada reserva que Takai genere**: el afiliado se lleva una parte del 10% de Takai; el dueño sigue en 0% en sus reservas directas.

### Analizar primero
- Audita la lógica de comisión/billing existente (el cron `generate-commission-statements` suma reservas). **Confirma que el 10% se aplique SOLO a reservas generadas por Takai** (`directory`, `whatsapp_agent`, `affiliate`) y **0% a directas** (`owner_direct`, `manual`). Si hoy cobra sobre todas las reservas indistintamente, **corrígelo** para que use `booking_source`. Documenta el estado actual en `PROGRESO.md`.

### Construir
- **Campo `booking_source`** en `bookings` (si no existe): valores `directory`, `whatsapp_agent`, `affiliate`, `owner_direct`, `manual`. Captúralo al crear la reserva, leyendo el `?source=` y `?ref=` del link.
- **Tabla `affiliates`** (con RLS): `id`, `code` (único, para el link), `name`, `contact`, `commission_rate` (ej. 0.05 = 5% del valor de la reserva, o sea la mitad del 10% de Takai — configurable por afiliado), `active`, `created_at`.
- **Campo `affiliate_id`** en `bookings` (nullable).
- **Tracking de atribución**:
  - Los links del directorio aceptan `?ref={code}`.
  - En el directorio, al llegar con `ref`, guarda una **cookie first-party de 30 días** Y arrastra el `ref` en el link de reserva hacia takai.cl (porque la cookie no cruza dominio).
  - El motor de reservas lee `ref`, lo valida contra `affiliates`, y si es válido guarda `affiliate_id` + `booking_source='affiliate'` en la reserva.
- **Lógica de comisión**:
  - Reserva `affiliate` → Takai cobra su 10%, y el afiliado gana su `commission_rate`. El dueño no paga comisión adicional (sale del 10% de Takai). Define el reparto exacto en config (ej. 5% afiliado / 5% Takai).
  - Reservas `directory` / `whatsapp_agent` → 10% Takai, sin afiliado.
  - Reservas `owner_direct` / `manual` → 0%.
- **Dashboard de afiliado**: página con token (reutiliza el patrón existente `dashboard_links` con `token_hash` SHA-256) donde el afiliado ve sus reservas referidas y lo que ganó. No expongas datos de otros.
- **Estado de cuenta de afiliado**: reutiliza el patrón del cron de estados de cuenta para generar mensual lo que se le debe a cada afiliado (el pago en sí es manual / fuera de alcance).

### Criterios de aceptación
- Un turista que llega por `?ref=CODIGO` y reserva queda atribuido a ese afiliado, con `booking_source='affiliate'`.
- La comisión se calcula correcto: 10% Takai con reparto al afiliado; 0% en directas.
- El afiliado ve solo SUS reservas en su dashboard.
- La atribución sobrevive el salto de dominio (directorio → takai.cl) vía el parámetro `ref`.

### Commit
`git commit -m "feat(afiliados): tracking, atribución cross-domain y comisión por reserva generada"`

---

# FASE 8 — Retargeting por email automático (Resend)

### Objetivo
Traer de vuelta a huéspedes pasados con campañas automáticas "vuelve a [destino]" en temporada, usando el Resend que ya está integrado. Genera reservas repetidas casi gratis.

### Analizar primero
- El repo YA tiene emails post check-out (`solicitar-review`) y recordatorios. Reutiliza esa infraestructura de envío.

### Construir
- **Cron** (mensual o semanal, vía pg_cron o el orquestador existente) que:
  - Busque huéspedes que hicieron check-out hace N meses (ej. ventana pre-temporada),
  - segmente por tenant/destino,
  - envíe un email "vuelve a {destino}" con el link a la cabaña / al directorio (con `source` adecuado para atribución).
- **Cumplimiento / entregabilidad (obligatorio):**
  - Incluye **link de desuscripción** en cada email.
  - Crea tabla/flag `email_opt_out` (con RLS) y **respétalo** (no enviar a quien se dio de baja).
  - **Cap de frecuencia**: no enviar al mismo huésped más de una vez cada X días.
- Templates con `esc()` (regla XSS). Sin `dangerouslySetInnerHTML`.

### Criterios de aceptación
- El cron segmenta y envía correctamente.
- Nadie en opt-out recibe correo.
- Cada email tiene desuscripción funcional.
- Los links llevan `source` para atribuir reservas resultantes.

### Commit
`git commit -m "feat(email): retargeting estacional a huéspedes pasados con opt-out"`

---

# FASE 9 — Reseñas automáticas (alimentan los rich results)

### Objetivo
Capturar reseñas post-estadía y mostrarlas como `aggregateRating` + `review` en el schema (Fase 3) y en las páginas. Más estrellas = mejor CTR en Google = más reservas.

### Analizar primero
- Ya existe el email `solicitar-review` post check-out. Extiéndelo para que el huésped pueda **dejar la reseña**, no solo recibir el pedido.

### Construir
- **Tabla `reviews`** (con RLS): `id`, `tenant_id`, `cabin_id`, `booking_code`, `rating` (1–5), `comment`, `guest_name`, `status` (`pending`/`approved`/`rejected`), `created_at`.
- **Página pública de envío de reseña** por `booking_code` (valida que el código exista y que sea post check-out).
- **Moderación**: las reseñas entran como `pending`. Solo las `approved` se publican (evita spam). El dueño/admin aprueba.
- **Integración con schema y páginas**: las reseñas aprobadas alimentan `aggregateRating` y `review` del schema VacationRental, y se muestran en la página de la cabaña (landing + directorio).

### Criterios de aceptación
- El huésped puede dejar una reseña válida con su `booking_code`.
- Las reseñas no aprobadas no se muestran ni entran al schema.
- Las aprobadas aparecen en la página y en el JSON-LD.

### Commit
`git commit -m "feat(reseñas): captura, moderación y publicación con integración a schema"`

---

# FASE 10 — Onboarding self-service (agregar una cabaña sin programar nada)

### Objetivo
El objetivo final del fundador: que **dar de alta una cabaña genere automáticamente** su página SEO, su entrada en el directorio, su schema, su sitemap y su botón de WhatsApp — **sin volver a escribir código**. Así, en el futuro, "solo sale a agregar clientes".

### Construir
- **Formulario de alta de cabaña** (en el panel admin/owner) que capture TODOS los campos que el SEO/schema necesita, con validación de mínimos:
  - slug único, nombre, descripción,
  - **mínimo 8 fotos** de buena calidad,
  - **geo (lat/long con 5+ decimales)**,
  - amenidades, capacidad, precios y temporadas, políticas, número de WhatsApp del dueño.
  - Si faltan mínimos (ej. menos de 8 fotos o sin geo), el formulario lo exige antes de publicar.
- **Generación automática al guardar** (todo se deriva de los datos, no requiere código nuevo):
  - La página de la cabaña en el directorio existe automáticamente (el directorio renderiza desde Supabase).
  - El schema VacationRental se genera de los datos.
  - El `sitemap.xml` la incluye automáticamente.
  - El botón click-to-WhatsApp usa el número configurado.
- **Paso de Ficha de Google** (ver Fase 11): el wizard muestra instrucciones y guarda el link/place_id cuando el dueño lo cree (no se auto-crea).
- **Resultado**: el fundador agrega una cabaña llenando un formulario, y todo lo público se arma solo.

### Criterios de aceptación
- Crear una cabaña por el formulario hace que aparezca en el directorio, con schema válido y en el sitemap, sin tocar código.
- Las validaciones impiden publicar cabañas incompletas (que romperían el SEO).

### Commit
`git commit -m "feat(onboarding): alta self-service que autogenera página SEO, directorio, schema y sitemap"`

---

# FASE 11 — Asistente de Ficha de Google (Google Business Profile)

### Objetivo
Ayudar al dueño a aparecer en Google Maps / búsqueda local. **Realidad técnica:** no se puede crear programáticamente una ficha verificada (Google exige verificación de identidad por local, y muchos alojamientos de renta vacacional no son elegibles). Por eso construimos un **asistente que guía**, no una automatización.

### Construir
- **Wizard paso a paso** (en el panel) que explique al dueño cómo crear su Ficha de Google.
- **Campos para guardar** el `place_id` y la URL de la ficha del dueño una vez creada.
- **Mostrar reseñas de Google** en la página de la cabaña una vez vinculada la ficha (opcional vía Places API; **requiere API key y tiene costo** → déjalo detrás de una env var opcional, y si no está, simplemente no muestres esa sección).

### Criterios de aceptación
- El wizard guía claramente al dueño.
- Si el dueño pega su `place_id`, se guarda y se puede vincular.
- La sección de reseñas de Google es opcional y no rompe nada si no hay API key.

### Commit
`git commit -m "feat(gbp): asistente y vinculación de Ficha de Google (sin auto-creación)"`

---

## CHECKLIST FINAL — antes de "congelar" Takai

Al terminar la noche, verifica y deja anotado en `PROGRESO.md`:

- [ ] Todo el trabajo está en la rama `feature/motor-reservas`, **NO** en `main`.
- [ ] `npm run build` pasa sin errores. Type-check / lint limpios.
- [ ] Fase 1: auto-cancelación a 3h funcionando (probada).
- [ ] Fase 2: RLS auditado y completo, **sin romper accesos existentes** (probado por tenant).
- [ ] Fase 3: schema VacationRental pasa el Rich Results Test.
- [ ] Fase 4: directorio lista cabañas y canaliza al motor con atribución de origen.
- [ ] Fase 5: sitemap dinámico, meta tags y páginas por destino listas.
- [ ] Fase 6: agente WhatsApp responde con datos reales (o anotado en BLOCKERS si falta `LLM_API_KEY`).
- [ ] Fase 7: afiliados con atribución cross-domain y comisión correcta (10% solo en generadas por Takai, 0% en directas).
- [ ] Fase 8: retargeting por email con opt-out.
- [ ] Fase 9: reseñas con moderación e integración a schema.
- [ ] Fase 10: onboarding self-service autogenera todo.
- [ ] Fase 11: asistente de Ficha de Google.
- [ ] `BLOCKERS.md` lista todo lo que quedó pendiente por acción humana o env vars faltantes.
- [ ] `PROGRESO.md` documenta fase por fase qué se hizo y cómo se probó.
- [ ] **Actualiza `CLAUDE.md`** con los cambios de arquitectura nuevos (es la fuente de verdad del proyecto).

---

## NOTA SOBRE SERNATUR (no es fase técnica)
Sernatur no es un generador fuerte de reservas. No construyas integración compleja. Si acaso, un paso opcional en el onboarding que enlace a la guía de registro del RNPST para el dueño. Prioridad baja. El registro lo hace cada dueño con su RUT (HUMAN_TODO).

---

## RESUMEN DE DEPENDENCIAS ENTRE FASES
- Fases 1 y 2 son independientes y van primero (bloqueantes).
- Fase 3 (schema) se usa en Fase 4 (directorio) y Fase 9 (reseñas la alimentan).
- Fase 4 (directorio) es base de Fase 5 (SEO), Fase 6 (botón WhatsApp), Fase 7 (links afiliado).
- Fase 7 (afiliados) depende de `booking_source`, que también usa Fase 6.
- Si una fase se bloquea, las demás independientes siguen. No te detengas: documenta y avanza.

**FIN DEL PLAN. Trabaja en rama, commitea seguido, no toques `main`, y deja las bitácoras al día.**
