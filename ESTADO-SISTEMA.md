# ESTADO DEL SISTEMA — Takai.cl owner-dashboard

> Actualizar al final de cada sesión. Leer al inicio.

---

## Última actualización
**Fecha:** 2026-06-13
**Sesión:** Corrección de documentación — sin cambios en código.
**Hecho:**
- CLAUDE.md: modelo de negocio corregido (dos modelos coexistentes), clientes reales vs ex-prospectos, slugs de ejemplo actualizados, hallazgo Twilio marcado como resuelto.
- ESTADO-SISTEMA.md: porcentajes actualizados, P0-1/P0-2/P1-1/P1-3/P1-4/P1-5/P1-6 marcados como resueltos, roadmap reorganizado.
**Pendiente:** Commit del sprint 2026-06-12 + este ajuste de documentación (Juan revisa primero).

---

## Porcentaje de completitud por área

| Área | % Completo | Notas |
|------|-----------|-------|
| Reservas (turista) | 95% | Funcional; índices aplicados en producción |
| Reservas (propietario panel) | 95% | Race condition resuelta vía RPC create_booking_manual atómico |
| Calendario | 90% | Funcional; sin paginación |
| Billing / Comisiones | 85% | Funcional; comisión hardcodeada en resumen-semanal |
| Emails (Resend) | 90% | Loop de recordatorio ahora resiliente (try-catch por booking) |
| WhatsApp (Twilio) | 90% | Verificación HMAC-SHA1 de firma Twilio implementada |
| MercadoPago (turistas) | 95% | Filtro deleted_at y guard de status implementados |
| MercadoPago (billing) | 90% | Funcional; webhook billing sin test end-to-end |
| RLS / Seguridad BD | 90% | 3 endpoints P0 + firma Twilio resueltos; 2 items P2 pendientes (P2-0a/b) |
| Índices BD | 95% | Índices aplicados en producción vía 008_indexes.sql |
| Paginación | 10% | Sin paginación en historial, calendar, admin |
| Zonas horarias | 60% | Todos los calculos en UTC; Chile/Ecuador pueden tener desfases |
| Validación inputs públicos | 70% | Campos de texto sin límite de longitud ni escape HTML |
| Admin panel | 80% | ADMIN_TOKEN en URL (en logs); queries sin paginación |
| Crons | 85% | Funcionales; timezone risk; loop no resiliente en recordatorio |
| Health check | 85% | N+1 queries por tenant |

---

## Hallazgos de auditoría — clasificados por prioridad

### P0 — Bloqueante para escala o datos en producción

#### ~~P0-1: CERO índices explícitos en BD~~ ✅ RESUELTO 2026-06-13
**Migración aplicada:** `supabase/migrations/008_indexes.sql` aplicada en producción.
**Índices creados:** `idx_bookings_tenant_status`, `idx_bookings_cabin_dates`, `idx_bookings_booking_code`, `idx_bookings_guest_phone`, `idx_bookings_check_in`, `idx_calendar_blocks_cabin_dates`, `idx_calendar_blocks_tenant`, `idx_audit_log_tenant`, `idx_commission_statements_tenant`.
**También aplicado en 008:** columnas `mp_preference_id` y `review_sent_at` en `bookings`, función RPC `create_booking_manual`.

#### ~~P0-2: Race condition en bookings/manual~~ ✅ RESUELTO 2026-06-13
**Fix aplicado:** `/api/bookings/manual` migrado a RPC `create_booking_manual` (advisory lock + conflict check atómico dentro de una transacción PostgreSQL). Función definida y aplicada en `supabase/migrations/008_indexes.sql`.

---

### P1 — Seguridad o funcionalidad degradada en producción

#### ~~P1-1: /api/twilio/webhook sin verificación de firma~~ ✅ RESUELTO 2026-06-13
**Fix aplicado:** Función `validateTwilioSignature()` implementada — HMAC-SHA1 sobre URL + params ordenados, comparación timing-safe con `crypto.timingSafeEqual`. Retorna 403 si la firma no coincide.

#### P1-2: ADMIN_TOKEN en URL → aparece en logs de acceso de Vercel
**Archivo:** `app/admin/page.tsx:7` — `searchParams.token !== adminToken`
**Impacto:** Cualquier log de acceso de Vercel/CDN registra el token en plaintext. Documentado en CLAUDE.md pero no resuelto.
**Fix:** Migrar a header `x-admin-token` (mismo patrón que las API routes) o a cookie de sesión.

#### ~~P1-3: XSS en email de contacto~~ ✅ RESUELTO 2026-06-13
**Fix aplicado:** Función `escapeHtml()` añadida en `app/api/contact/route.ts`. Escapa `&`, `<`, `>`, `"`, `'` en todos los campos antes de interpolarlos en HTML.

#### ~~P1-4: Cron recordatorio aborta si un email falla~~ ✅ RESUELTO 2026-06-13
**Fix aplicado:** Cada `emails.send()` dentro del loop envuelto en try-catch individual. Errores se acumulan en `errors[]` y se devuelven en la respuesta sin interrumpir el loop.

#### ~~P1-5: mp/create-preference no verifica deleted_at~~ ✅ RESUELTO 2026-06-13
**Fix aplicado:** Agregado `.is("deleted_at", null)` + `.maybeSingle()` + guard `status !== "draft"` en `mp/create-preference`.

#### ~~P1-6: mp/status no verifica deleted_at~~ ✅ RESUELTO 2026-06-13
**Fix aplicado:** Agregado `.is("deleted_at", null)` + `.maybeSingle()` en `mp/status`.

---

### P2 — Funcionalidad degradada o deuda técnica significativa

#### P2-1: Sin paginación en historial, calendario y admin
**Archivos:**
- `app/api/historial/route.ts:44-49` — fetcha TODAS las reservas del tenant
- `app/api/calendar/route.ts:44-48` — fetcha TODOS los bloques del calendar sin rango de fechas
- `app/admin/page.tsx:21` — `.limit(2000)` hardcodeado, no paginado

**Impacto:** Con 2.000+ reservas por tenant, la respuesta del historial supera 1MB. La página se vuelve inutilizable.
**Fix:** Paginación con `.range(offset, offset+99)` + cursor. Para calendar: filtrar por ventana de fechas (±6 meses).

#### P2-2: Resumen semanal usa comisión hardcodeada
**Archivo:** `app/api/emails/resumen-semanal/route.ts:8` — `const TAKAI_COMMISSION_RATE = 0.10`
**Impacto:** Si algún tenant tiene una tasa diferente (posible en el futuro), el email mostrará el número incorrecto.
**Fix:** Leer `subscriptions.commission_rate` por tenant_id al construir el email.

#### P2-3: lib/whatsapp.ts hace DB query por cada mensaje
**Archivo:** `lib/whatsapp.ts:10-22`
**Impacto:** Un booking flow típico envía 2-3 WhatsApps (turista + dueño + recordatorio). Cada uno hace un SELECT separado a `tenants`. Ineficiente.
**Fix:** Pasar `twilio_whatsapp` como parámetro o cachear en memoria en el contexto de la request.

#### P2-4: lib/audit.ts crea nuevo cliente Supabase por cada entrada
**Archivo:** `lib/audit.ts:13-17`
**Impacto:** Cada audit log crea y destruye una conexión HTTP. En un flow de reserva (3-4 audit logs), son 3-4 conexiones extra.
**Fix:** Aceptar un cliente Supabase existente como parámetro opcional.

#### P2-5: N+1 queries en /api/health
**Archivo:** `app/api/health/route.ts:68-108`
**Impacto:** El health check ejecuta 2 queries por tenant activo (cabins + dashboard_links). Con 50 tenants = 100+ queries en cada health check diario.
**Fix:** Usar subqueries o un JOIN en lugar de loop por tenant.

#### P2-6: Zonas horarias UTC vs Chile/Ecuador
**Archivos:** `app/api/cron/cancelar-pendientes/route.ts:37`, `app/api/cron/recordatorio-transferencia/route.ts:40-41`, `app/api/emails/recordatorio/route.ts:21-23`
**Impacto:**
- El cron corre a 09:00 UTC = 06:00 Chile (UTC-3 en invierno). "Hoy" en UTC coincide con "hoy" en Chile — riesgo bajo pero real en cambios de horario (DST).
- La ventana de 75%-200% del timeout usa `Date.now()` UTC. Si el turista reserva cerca de medianoche en Chile, el timeout podría calcularse incorrectamente.
- Ecuador (UTC-5): 09:00 UTC = 04:00 Ecuador. El cron de cancelaciones corre cuando el turista duerme; puede dar falsa sensación de urgencia.
**Fix:** Usar `Intl.DateTimeFormat` con `timeZone: 'America/Santiago'` o `'America/Guayaquil'` para calcular "hoy" en el cron; pasar la zona como dato del tenant.

#### P2-0a: embed/[slug]/availability — query de bookings sin tenant_id explícito (defensa en profundidad)
**Archivo:** `app/api/embed/[slug]/availability/route.ts`
**Situación:** El SELECT de `bookings` filtra por `.in("cabin_id", cabinIds)` pero sin `.eq("tenant_id", tenant.id)`. Los `cabinIds` ya vienen de cabañas filtradas por tenant, así que no hay fuga práctica. Falta el filtro como segunda defensa.
**Riesgo:** Bajo (schema garantiza que cabin_id es único por tenant; no hay vector de explotación conocido).
**Fix:** Agregar `.eq("tenant_id", tenant.id)` al SELECT de bookings y al SELECT de calendar_blocks en esta ruta.

#### P2-0b: billing/webhook — query de commission_statements sin tenant_id (defensa en profundidad)
**Archivo:** `app/api/billing/webhook/route.ts`
**Situación:** El SELECT de `commission_statements` usa solo `.eq("id", statementId)`. El `statementId` viene del `external_reference` firmado por HMAC de MercadoPago, lo que hace virtualmente imposible manipularlo. Falta el filtro de tenant como segunda defensa.
**Riesgo:** Bajo (compensado por HMAC de MP; no hay vector de explotación conocido).
**Fix:** Agregar `.eq("tenant_id", expectedTenantId)` al SELECT — requeriría pasar el `tenant_id` por otro lado (ej. el `external_reference` puede incluirlo: `commission:{statementId}:{tenantId}`).

#### P2-7: embed/[slug]/availability carga TODAS las reservas sin rango
**Archivo:** `app/api/embed/[slug]/availability/route.ts:91-99`
**Impacto:** Carga todas las reservas no-canceladas de todas las cabañas del tenant, filtra en JS. Con 10.000 reservas históricas, devuelve datos innecesarios.
**Fix:** Agregar filtro de fechas al query: `.gte("check_out", windowStartStr).lte("check_in", windowEndStr)`.

#### P2-8: generate-commission-statements mide por created_at, no check_in
**Archivo:** `app/api/cron/generate-commission-statements/route.ts:68-71`
**Impacto:** Una reserva creada en diciembre para enero se cuenta en la comisión de diciembre. Puede crear disputas si el tenant esperaba la comisión en enero.
**Acción requerida:** Confirmar con Juan qué fecha define el período (created_at vs check_in).

---

### P3 — Código limpio y consistencia

#### P3-1: 35+ rutas usan createClient directo en lugar de getSupabaseAdmin()
**Archivos:** `app/api/bookings/manual/route.ts:10`, `app/api/calendar/delete/route.ts:6`, y 30+ más
**Impacto:** Inconsistencia. Funciona igual pero viola el patrón establecido en `lib/supabase-server.ts`.
**Fix:** Reemplazar `createClient(NEXT_PUBLIC_SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, ...)` por `getSupabaseAdmin()`.

#### P3-2: admin/cabins update sin filtro tenant_id obligatorio
**Archivo:** `app/api/admin/cabins/route.ts:41-43`
```js
const q = supabase.from("cabins").update({...}).eq("id", id)
if (body.tenant_id) q.eq("tenant_id", body.tenant_id)
```
**Impacto:** Si `tenant_id` no se pasa, se actualiza cualquier cabaña. Requiere ADMIN_TOKEN pero es impreciso.
**Fix:** Hacer `tenant_id` obligatorio en update, o al menos agregar log de audit.

#### P3-3: resumen-semanal detecta género por sufijo del nombre
**Archivo:** `app/api/emails/resumen-semanal/route.ts:11-14`
**Impacto:** "Jorge" → male ✓, "Josefa" → female ✓, pero "Isabel" → male (termina en "l"), "Matías" → male ✓, "Camila" → female ✓. Falla en nombres compuestos o extranjeros.
**Fix:** Usar `tenants.gender` (ya existe en el schema) en lugar de heurística.

#### P3-4: Archivos muertos en raíz del repo
**Archivos candidatos a borrar (ya listados en CLAUDE.md):**
`diagnostico.txt`, `todo_el_sistema.txt`, `archivos_takai.txt`, `ESTADO_SISTEMA.md` (viejo), `CONTINUIDAD-TAKAI-2026-04-14.md`, `CONTEXT.md`, `_tmp_volver.txt`, `fix_admin_api.js`, `landing/index.html`
**Acción:** Borrar solo con instrucción explícita de Juan.

#### P3-5: review_sent_at columna usada pero no en schema documentado
**Archivo:** `app/api/emails/solicitar-review/route.ts:56`
**Impacto:** La columna `review_sent_at` en bookings no está documentada en CLAUDE.md schema. Probablemente existe pero falta documentar.
**Fix:** Agregar al schema en CLAUDE.md.

#### P3-6: mp_preference_id columna mencionada en comentario de código
**Archivo:** `app/api/mp/create-preference/route.ts:1-2`
```
// SQL requerido en Supabase:
// ALTER TABLE bookings ADD COLUMN IF NOT EXISTS mp_preference_id text;
```
**Impacto:** Puede que esta migración no esté aplicada en producción.
**Fix:** Crear migración 008 con esta columna y `review_sent_at`.

---

## Rutas API — uso de getSupabaseForTenant() vs SERVICE_ROLE directo

### Usan getSupabaseForTenant (RLS activado):
- `app/api/bookings/route.ts` ✅
- `app/api/bookings/confirm/route.ts` ✅
- `app/api/bookings/cancel/route.ts` ✅
- `app/api/calendar/route.ts` (GET y POST) ✅
- `app/api/dashboard/route.ts` ✅
- `app/api/historial/route.ts` ✅

### Usan SERVICE_ROLE directamente (35+ rutas):
Todos los demás: `bookings/manual`, `calendar/delete`, `availability`, `mp/*`, `twilio/webhook`, `stats`, `crons`, `emails/*`, `cabins/*`, `tenant/bank`, `tenant/guidebook`, `bookings/bank-info`, `tenant-by-cabin`, `embed/*/availability`, `health`, `admin/*`, `billing/*`, `lib/whatsapp.ts`, `lib/audit.ts`, `lib/billing.ts`

**Nota:** SERVICE_ROLE bypassa RLS por diseño — es correcto para server-side. El problema no es que sea incorrecto sino que no se aprovecha la capa de RLS como segunda defensa.

---

## Queries a bookings sin filtro deleted_at

| Archivo | Línea | Intencional |
|---------|-------|-------------|
| `app/api/historial/route.ts` | 44 | ✅ Sí (muestra historial completo incluyendo canceladas) |
| `app/api/mp/create-preference/route.ts` | 25 | ❌ No — puede crear pago para reserva cancelada |
| `app/api/mp/status/route.ts` | 22 | ❌ No — puede retornar status de reserva cancelada |
| `app/admin/page.tsx` | 21 | ✅ Sí (admin ve todo, filtra en código) |

---

## Rutas sin export const dynamic = 'force-dynamic'

Todas las rutas GET ya lo tienen. Las rutas POST sin `force-dynamic` son correctas (POST no se cachea). Sin issues aquí.

**Excepción:** `app/api/emails/nueva-reserva/route.ts` (POST, no lo necesita).

---

## Roadmap hacia el 100%

### ✅ Sprint completado (2026-06-13)
- [P0-1] ~~Índices BD~~ → aplicados vía `008_indexes.sql`
- [P0-2] ~~Race condition bookings/manual~~ → migrado a RPC atómico
- [P1-1] ~~Firma Twilio~~ → HMAC-SHA1 implementado
- [P1-3] ~~XSS contact~~ → escapeHtml() aplicado
- [P1-4] ~~Loop recordatorio frágil~~ → try-catch por booking
- [P1-5, P1-6] ~~deleted_at en MP~~ → filtros aplicados
- [P0-3 auth] ~~bookings/manual, calendar/delete, cabins/photos~~ → token derivado de dashboard_links

### Sprint siguiente (antes de 10 clientes)
1. [P2-1] Paginación en historial (cursor-based, +100 por página)
2. [P2-7] Rango de fechas en `embed/availability` (solo ventana de 3 meses)
3. [P3-3] Reemplazar heurística de género por `tenants.gender` en resumen-semanal
4. [P1-2] Migrar ADMIN_TOKEN de URL a header/cookie

### A mediano plazo (antes de 50 clientes)
11. [P2-2] Comisión dinámica por tenant en resumen-semanal
12. [P2-5] Eliminar N+1 en health check
13. [P2-6] Timezone-aware en crons para Chile y Ecuador
14. [P2-3, P2-4] Optimizar `lib/whatsapp.ts` y `lib/audit.ts`
15. [P1-2] Migrar admin token de URL a header/cookie

---

## Integraciones — estado confirmado

| Integración | Estado | Notas |
|------------|--------|-------|
| MercadoPago Marketplace (turistas) | ✅ Activo | HMAC verificado |
| MercadoPago Billing (Takai) | ✅ Activo | Webhook, preapproval, commission pay |
| Twilio WhatsApp | ✅ Activo | Sin verificación de firma — P1 |
| Resend emails | ✅ Activo | Bug en loop de recordatorio — P1 |
| FullCalendar | ✅ Activo | |
| Recharts stats | ✅ Activo | |
| Vercel Analytics | ✅ Activo | |
| Vercel Crons | ✅ Activo | 8 crons configurados en vercel.json |

---

## Historial de sesiones

| Fecha | Qué se hizo |
|-------|------------|
| 2026-06-12 | Auditoría total (solo lectura). Creados ESTADO-SISTEMA.md y actualizado CLAUDE.md con marco de análisis y regla de estado. Sin modificaciones de código. |
| 2026-06-12 | Sprint seguridad: P0 auth (bookings/manual, calendar/delete, cabins/photos), P1 (Twilio HMAC, XSS contact, loop recordatorio, deleted_at en MP), RPC atómico create_booking_manual, índices BD 008_indexes.sql. Build OK. |
| 2026-06-13 | Corrección de documentación: CLAUDE.md y ESTADO-SISTEMA.md actualizados con modelo de negocio correcto (dos modelos coexistentes), clientes reales vs ex-prospectos, slugs actualizados, hallazgos de seguridad marcados como resueltos. Sin cambios en código. |
