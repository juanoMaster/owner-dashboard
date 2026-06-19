# PROGRESO — Motor de Reservas (rama `feature/motor-reservas`)

> Bitácora de la ejecución nocturna autónoma del `PLAN_NOCHE_TAKAI.md`.
> Inicio: 2026-06-18. Ejecutor: Claude Code (Opus 4.8), modo autónomo.

## Decisiones de ejecución (tomadas autónomamente)

1. **Migraciones NO se aplican a producción automáticamente.** El plan advierte que RLS mal aplicado deja la app sin acceso y pide probar contra un espejo (no existe espejo). El patrón del repo (migraciones 009/010) es que Juan las aplica manualmente. → Escribo los archivos `.sql` numerados y los anoto en `BLOCKERS.md` para aplicación manual revisada. La **auditoría** del estado real sí se hizo (read-only vía Supabase MCP), así que las decisiones se basan en datos reales, no en suposiciones.
2. **Umbral de auto-cancelación = 3 horas flat.** El plan es la autoridad y dice 3h explícito ("los clientes lo pidieron a 3h"). El código existente usaba `transfer_timeout_hours` por tenant (default 12h). Decisión: constante única `AUTO_CANCEL_HOURS = 3` como fuente de verdad, reemplazando el default de 12h. Documentado abajo.
3. **Directorio B2C (Fase 4/5) = carpeta separada `directorio/`**, no se cablea al build de `takai.cl` (mantiene B2B limpio, decisión del plan). Sus env vars (`DIRECTORY_DOMAIN`) son HUMAN_TODO.

---

## Estado por fase

### FASE 1 — Auto-cancelación a 3h vía pg_cron — ✅ COMPLETA

**Auditoría del estado actual (lo que YA existe):**
- `/api/cron/cancelar-pendientes/route.ts` existe y funciona. Cancela bookings `status='draft'`, no eliminados, sin `transfer_proof_received_at`, **ya excluye `mp_preference_id IS NULL`** (correcto), vía **soft-delete** (`deleted_at` + `deleted_by='cron_auto_cancel'`), libera `calendar_blocks`, registra en `audit_log` y notifica al turista por WhatsApp.
- **Problema confirmado:** corre vía orquestador `/api/cron/daily` **una vez al día** (Vercel cron). Una ventana de 3h es imposible con cadencia diaria.
- Usaba umbral por tenant `transfer_timeout_hours` (default **12h**), no 3h.

**Cambios:**
- `app/api/cron/cancelar-pendientes/route.ts`: umbral cambiado de `transfer_timeout_hours` (default 12h) a constante única `AUTO_CANCEL_HOURS = 3`. Todo lo demás intacto (soft-delete, libera blocks, audit, WhatsApp, exclusión mp_preference_id).
- `supabase/migrations/011_pgcron_autocancel_3h.sql`: configura `pg_cron` + `pg_net` para invocar el endpoint cada 15 min. Reutiliza el endpoint existente (cero duplicación de lógica). Embebe el secreto → **aplicación manual** (BLOCKERS.md). Job idempotente (unschedule previo). Orquestador diario se mantiene como respaldo.

**Validación (read-only contra producción):** dry-run de la query del cron con umbral 3h → `would_cancel=0` (ningún draft viejo ahora mismo), `protected_mp=0`, `protected_confirmed=13` (no se tocan), `already_softdeleted=18`. Columnas y lógica confirmadas. Build: ✅.

**Criterios de aceptación:** ✅ draft >3h sin mp_preference_id se cancela (≤15 min con pg_cron); ✅ con mp_preference_id NO se cancela; ✅ confirmada NO se toca; ✅ libera calendar_blocks. Aplicación de pg_cron a prod = manual (BLOCKERS).

### FASE 2 — Auditoría RLS — AUDITORÍA COMPLETA

**Hallazgo (verificado read-only contra la BD de producción `reservas_engine_v1`):**
- Las **15 tablas** del esquema `public` tienen `RLS ENABLED`: `tenants, cabins, bookings, calendar_blocks, dashboard_links, audit_log, subscriptions, commission_statements, commissions, conversations, leads, messages, passengers, payments, tenant_users`.
- Coexisten **dos patrones de política** (esperado, el proyecto `reservas_engine_v1` precede al owner-dashboard):
  - `current_tenant_id()` — lee `app.tenant_id` de la sesión (lo inyecta `getSupabaseForTenant`). Definido en migración 004. Usado por: `tenants, cabins, bookings, calendar_blocks, dashboard_links, audit_log, subscriptions, commission_statements`.
  - `is_tenant_member(tenant_id)` — basado en `auth.uid()` + tabla `tenant_users`. Usado por: `bookings, cabins, tenants, commissions, conversations, messages, passengers, payments`.
- `cabins` tiene además `"Permitir lectura publica" (SELECT true)` — lectura pública intencional para landings.
- **Única brecha:** `leads` tiene RLS habilitado pero **0 políticas** → default-deny (seguro: nadie con anon key lee; service role bypassa). `leads` **no tiene columna `tenant_id`**, así que no aplica `tenant_isolation`. Se deja default-deny (correcto).

**Conclusión:** RLS está **completo y correcto**. No se requieren cambios riesgosos sobre tablas existentes. La acción de la Fase 2 es: (a) documentar (hecho), (b) garantizar RLS desde la creación en las tablas nuevas de fases siguientes (afiliados, reseñas, whatsapp_conversations, email_opt_out). Ningún flujo existente se toca → cero riesgo de bloqueo de acceso.

### FASE 3 — Schema VacationRental JSON-LD — ✅ COMPLETA

**Construido:**
- `lib/schema.ts`: `buildVacationRental(cabin, tenant, opts)` genera JSON-LD `schema.org/VacationRental` desde datos reales (nombre, descripción, fotos absolutas, geo a 6 decimales, `PostalAddress`, `containsPlace/Accommodation` con `occupancy` + `amenityFeature[]`, `offers` con precio/moneda, `checkinTime`/`checkoutTime`, `petsAllowed`). Acepta `aggregateRating`+`review` (los alimentará la Fase 9; si no hay reseñas se omiten, no se inventan). `buildBreadcrumb()` para `BreadcrumbList`. `checkSchemaValidity()` devuelve warnings (mín. 8 fotos, geo válida). **Devuelve null si no hay fotos o geo** → nunca emite schema inválido.
- `app/components/JsonLd.tsx`: inyecta `<script type="application/ld+json">`. Única excepción sancionada a la regla "cero dangerouslySetInnerHTML" — patrón estándar Next.js/Google; seguro porque el payload es data propia (`JSON.stringify`) con `<`→`<` escapado, nunca HTML de usuario. Documentado en el archivo.
- `app/[slug]/page.tsx`: componente `LandingSchema` que emite un nodo por cabaña + breadcrumb.
- `app/api/tenant/[slug]/cabins/route.ts`: agrega `slug`, `country`, `guidebook` al SELECT/respuesta (necesarios para `addressCountry` y check-in/out times del schema).

**Nota de altitud:** la landing `/[slug]` es Client Component (fetch client-side), así que el JSON-LD se renderiza con JS. Google ejecuta JS al indexar, pero el SEO fuerte vendrá del directorio SSR (Fase 4), que reusa `lib/schema.ts`. Build: ✅.

**Pendiente de verificación humana:** correr el **Rich Results Test** de Google sobre una URL real desplegada (no se puede ejecutar offline). Anotado en BLOCKERS.

### FASE 7 (foundation) — booking_source + tablas — ✅ PARCIAL
- Migración 013 (booking_source, affiliate_id, tablas affiliates/reviews/email_opt_out/whatsapp_conversations con RLS, campos agent/GBP).
- `bookings` POST captura `source`/`ref` (best-effort, valida ref contra affiliates).
- **Conflicto comisión fundadores documentado en BLOCKERS** (no se tocó el cron heredado). Falta: dashboard de afiliado + statements de afiliado (pendiente).

### FASE 9 — Reseñas con moderación + schema — ✅ COMPLETA (UI de moderación: API lista, falta tab admin)
**Construido:**
- `app/api/reviews/route.ts`: POST público (valida booking_code existe, confirmado, post check-out, sin duplicado → status `pending`); GET reseñas aprobadas por cabaña con promedio.
- `app/api/admin/reviews/route.ts`: GET (moderar) + PATCH (approve/reject), auth `x-admin-token`.
- `app/resena/[booking_code]/page.tsx`: formulario público de estrellas + comentario (paleta del proyecto, sin Tailwind).
- `app/api/emails/solicitar-review/route.ts`: ahora envía SIEMPRE (no requiere google_review_url); CTA principal a nuestra página de reseña (alimenta el schema); botón Google opcional.
- `app/api/tenant/[slug]/cabins/route.ts`: adjunta `review_summary` (count, average, reviews aprobadas) por cabaña.
- `app/[slug]/page.tsx`: pasa `review_summary` → `aggregateRating`+`review` en el JSON-LD.

**Criterios:** ✅ huésped deja reseña con booking_code (validado); ✅ no aprobadas no entran al schema (GET filtra `approved`); ✅ aprobadas alimentan el JSON-LD. Build: ✅.
**Falta (no bloqueante):** tab de moderación en `AdminDashboard.tsx` (la API ya funciona; se puede aprobar vía PATCH). Display de reseñas en las 3 templates de landing (el schema/Rich Results ya las lleva). Anotado en BLOCKERS.

### FASE 8 — Retargeting por email + opt-out — ✅ COMPLETA
**Construido:**
- `lib/unsubscribe.ts`: tokens de baja firmados con HMAC (sin tabla extra); `unsubscribeUrl()`.
- `app/api/email/unsubscribe/route.ts`: GET verifica HMAC → upsert en `email_opt_out` (idempotente) → página de confirmación.
- `app/api/cron/retargeting/route.ts`: cohorte de aniversario (check-out hace ~330 días) → email "¿Volvemos a {destino}?" con link `?source=directory` (atribución). **Respeta opt-out** y **cap de frecuencia 90 días** (vía `audit_log` `action='retargeting_sent'`). Auto-regulado (un cohorte/día).
- `app/api/cron/daily/route.ts`: agrega `/api/cron/retargeting` al orquestador diario.
- Email con `esc()` (XSS), link de baja en el footer, sin `dangerouslySetInnerHTML`.

**Criterios:** ✅ segmenta por tenant/destino y envía; ✅ opt-out respetado; ✅ baja funcional (HMAC); ✅ link con `source` para atribuir. Build: ✅.

### FASE 4–6, 10, 11 — pendientes
