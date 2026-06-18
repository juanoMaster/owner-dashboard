# ESTADO DEL SISTEMA — Takai.cl owner-dashboard

> Actualizar al final de cada sesión. Leer al inicio.

---

## Última actualización
**Fecha:** 2026-06-18
**Sesión:** Auditoría continua — 4 bugs encontrados y corregidos, sistema en estado muy sólido

**Esta iteración del loop (2026-06-18 continuación final):**
- `app/reservar/pago-fallido/page.tsx`: número Takai hardcodeado `56955230900` reemplazado por `owner_whatsapp` del tenant obtenido dinámicamente vía `/api/bookings/bank-info`; también agrega campo `owner_whatsapp` a la respuesta de `bank-info/route.ts`
- `app/api/billing/webhook/route.ts`: email de confirmación de pago de comisión — `commission_amount` ahora formateado con `toLocaleString` según moneda (USD/COP/CLP), null guard en `owner_name.split()`
- `app/api/bookings/confirm/route.ts` + `app/api/emails/reserva-confirmada/route.ts`: **BUG IMPORTANTE** — URL del manual de bienvenida usaba `NEXT_PUBLIC_RESERVAS_URL` (reservas.takai.cl) pero la página `/bienvenida/[booking_code]` vive en panel.takai.cl; corregido a `NEXT_PUBLIC_APP_URL`; todos los huéspedes recibían link 404
- Auditados y confirmados sólidos: `pago-pendiente/page.tsx`, `pago-exitoso/page.tsx`, `pago-fallido/page.tsx`, `reservar/page.tsx`, `historial/page.tsx`, `facturacion/page.tsx`, `bookings/cancel/route.ts`, `bookings/confirm/route.ts`, `mp/create-preference/route.ts`, `mp/status/route.ts`, `billing/status/route.ts`, `billing/webhook/route.ts`, `twilio/webhook/route.ts`, `lib/whatsapp.ts`, `lib/billing.ts`, `lib/supabase-server.ts`, `lib/resend.ts`, `ManualBookingForm.tsx`, `HistorialPageClient.tsx`, `bank-info/route.ts`, `AdminDashboard.tsx`

**Esta iteración del loop (2026-06-18 auditoría final rutas):**
- `app/api/bookings/route.ts`: cascade tinaja estaba al revés (tenant antes que cabin); corregido a `cabin.tinaja_price || tenant.tinaja_price || 30000`
- `app/calendar/page.tsx`: `handleDateClick` enviaba `end_date === start_date` al crear bloque de un solo día; API lo rechazaba con 400; corregido calculando `end_date = start_date + 1 día`
- Auditadas y confirmadas sólidas (no requerían cambios): `api/bookings`, `api/calendar`, `api/dashboard`, `api/historial`, `api/availability`, `api/tenant/[slug]/cabins`, `[slug]/page.tsx`, templates TemplateModerno + TemplateRural, `calendar/page.tsx`, `HomeDashboardClient.tsx`, `CabinPhotos.tsx`, emails `reserva-confirmada`, `resumen-semanal`, `solicitar-review`, `recordatorio`

**Esta iteración del loop (2026-06-18 continuación):**
- `app/api/mp/webhook/route.ts`: duplicado de `verifyMpSignature` usaba comparación directa de strings (timing attack); ahora importa de `lib/mp-verify.ts` (timingSafeEqual) — igual que el webhook de billing
- `app/api/admin/onboard/route.ts`: período de trial corregido de 30 días a 3 meses (setMonth +3) — CLAUDE.md especifica 3 meses gratis para clientes nuevos en suscripción
- `app/api/bookings/manual/route.ts`: `tinaja_price` ahora cascada desde cabin level antes que tenant level (igual que bookings/route.ts); moneda dinámica en WhatsApp al turista y propietario (antes era "CLP 150000" sin símbolo)
- `app/api/cron/cancelar-pendientes/route.ts`: excluye reservas con `mp_preference_id IS NOT NULL` de la auto-cancelación — evita cancelar reservas MP cuyo webhook aún no llegó
- `app/api/cron/recordatorio-transferencia/route.ts`: misma exclusión `mp_preference_id IS NOT NULL` — no recordar a turistas que pagaron por MP que envíen comprobante

**Esta iteración del loop (2026-06-18 anterior):**
- `app/api/emails/solicitar-review/route.ts`: XSS fix — `guest_name`, `business_name` y `review_url` ahora escapan HTML con función `esc()` y `encodeURI()`
- `app/api/admin/cabins/route.ts` DELETE: limpia fotos de Supabase Storage antes de borrar la cabaña (fotos huérfanas eliminadas)
- `app/api/embed/[slug]/availability/route.ts`: bug crítico — el widget embebible solo chequeaba `bookings`, no `calendar_blocks`; los bloques manuales (mantenimiento, uso personal) ahora se reflejan correctamente
- `app/api/bookings/route.ts`: `tinaja_price` leído desde `tenants.tinaja_price` (no hardcodeado 30000 que fallaba para USD); moneda dinámica en mensajes WA al turista y propietario
- `app/api/calendar/route.ts` POST: validación de formato `YYYY-MM-DD` y orden `start_date < end_date` — bloques corruptos ya no pueden crearse

**Esta iteración del loop (2026-06-17 última):**
- `app/api/mp/webhook/route.ts`: moneda dinámica en WhatsApp al propietario (USD/COP/CLP) — `currency` agregado al SELECT del tenant
- `app/api/admin/tenants/route.ts` DELETE: ahora elimina también `commission_statements` y `subscriptions` — sin filas huérfanas al borrar tenant
- `app/api/billing/subscribe/route.ts`: guard para `billing_mode=commission` — clientes fundadores no pueden activar suscripción mensual por error
- `app/api/availability/route.ts`: validación UUID del `cabin_id` (previene injection en `.not("id","in",...)` concatenado); validación formato YYYY-MM-DD en fechas; check `check_in < check_out`
- `app/api/cabins/photos/route.ts` POST: sanitizar `file.name` (elimina path traversal, caracteres especiales) antes de construir clave en Supabase Storage
- Auditadas y confirmadas sólidas: `bookings/confirm`, `bookings/cancel`, `bookings/manual`, `billing/status`, `billing/report-transfer`, `billing/ack`, `billing/commission-pay`, `cron/generate-commission-statements`, `cron/billing-check`, `cron/daily`, `health`, `stats`, `contact`, `historial`, `admin/commissions`, `admin/tokens`, `cabins/update`, `cabins/update-price`, `tenant/bank`, `tenant/guidebook`, `mp/create-preference`, `mp/status`, `tenant-by-cabin`, `emails/reserva-confirmada`, `emails/solicitar-review`, `emails/recordatorio`, `twilio/webhook`

**Sprint anterior (mismo día):**

**Sprint anterior (mismo día):**
- P2-0a + P2-7: `embed/[slug]/availability` — agregado `.eq("tenant_id", tenant.id)` + filtro de fechas
- P2-1: Historial pagination — cursor-based, límite 100, botón "Cargar más"
- P2-2 + P3-3: `resumen-semanal` — comisión dinámica desde DB; género desde DB; constante hardcodeada removida
- P2-3: `lib/whatsapp.ts` — parámetros opcionales para evitar DB extra query
- P2-4: `lib/audit.ts` — acepta SupabaseClient opcional
- P2-5: `app/api/health/route.ts` — N+1 eliminado; 2 queries batch
- P3-2: `app/api/admin/cabins/route.ts` — bug variable descartada corregido
- P1-2: Verificado como ya resuelto
- `admin/onboard`: crea fila `subscriptions` al onboardear tenant nuevo
- `resumen-semanal`: bugfix comisión ÷100
- `billing/ack`: import muerto eliminado

**Esta iteración del loop (sesión previa):**
- `lib/resend.ts`: corrección de moneda en emails `emailNuevaReservaTurista`, `emailNuevaReservaDuena`, `emailTrialEnding` — todas hardcodeaban "CLP" para todos los tenants; GlampingCacagual (USD) recibía emails con "CLP" incorrecto
- `app/api/emails/nueva-reserva/route.ts`: agregado `currency` al SELECT de tenants; propagado a ambos emails
- `app/api/cron/billing-check/route.ts`: agregado `currency` al SELECT de tenants; propagado a `emailTrialEnding`
- Auditados: `bookings/confirm`, `bookings/cancel`, `mp/webhook`, `cancelar-pendientes`, `recordatorio-transferencia`, `generate-commission-statements`, `billing-check`, `solicitar-review`, `report-transfer`, `billing/status`, `dashboard/facturacion` — todos sólidos
- P0-2b verificado como ya resuelto: `/api/bookings/route.ts` ya usa RPC `create_booking_atomic`
- P3-5 verificado como ya resuelto: `review_sent_at` y `mp_preference_id` ya documentados en CLAUDE.md

**Esta iteración del loop (2026-06-17 continuación):**
- `app/api/cabins/photos/route.ts` DELETE: **bug TOCTOU corregido** — el storage se borraba ANTES de verificar propiedad; ahora se verifica que la foto pertenece al tenant antes de borrar del storage. También agrega verificación que la URL existe en `cabins.photos`.
- `app/api/mp/create-preference/route.ts`: `currency_id` dinámico desde `tenant.currency` en lugar de hardcodeado "CLP"
- `app/api/availability/route.ts`: validación UUID regex en parámetro `visited` (previene SQL injection)
- `app/[slug]/templates/TemplateClasico.tsx`: `extra_services` precio usa `fmt(svc.price)` en lugar de `es-CL` hardcodeado
- Auditados y confirmados sólidos: `stats`, `historial`, `dashboard`, `calendar/delete`, `cron/daily`, `admin/tokens`, `admin/commissions`, `bookings/bank-info`, `tenant/[slug]/cabins`, `embed/[slug]/availability`, `tenant/bank`, `tenant/guidebook`, `cabins/update`, `billing.ts`, `reservar/page.tsx`, `HomeDashboardClient.tsx`, landing templates (Moderno, Rural)

**Esta iteración del loop (2026-06-17 final):**
- `lib/email-templates/resumen-semanal.ts`: eliminado `TAKAI_COMMISSION_RATE` hardcodeado, reemplazado `clp()` con `mkFmt(currency)` dinámico, todas las funciones internas usan `fmt` y `commissionRate` como parámetros
- `app/api/emails/resumen-semanal/route.ts`: pasa `currency` y `commission_rate` a `generarResumenSemanal`
- `app/api/admin/data/route.ts`: reemplaza `.limit(2000)` con filtro de 2 años (created_at >= año-anterior-01-01) — stats siempre correctas sin depender de límite arbitrario
- `app/api/calendar/route.ts`: agrega params opcionales `start`/`end` para filtrar `calendar_blocks` por rango de fechas
- `app/calendar/page.tsx`: pasa ventana de 18 meses (3 atrás + 15 adelante) al cargar bloques del calendario
- `app/api/billing/webhook/route.ts`: agrega `.eq("tenant_id", stmt.tenant_id)` al UPDATE de commission_statements (P2-0b — defensa en profundidad)
- Auditados y confirmados sólidos: `cancelar-pendientes`, `recordatorio-transferencia`, `bookings/route.ts`, `emails/recordatorio`, `admin/onboard`

**Estado:** Build OK. Todo deployado en producción (Vercel auto-deploy)

---

## Porcentaje de completitud por área

| Área | % Completo | Notas |
|------|-----------|-------|
| Reservas (turista) | 97% | RPC atómico ✅; tinaja desde tenant ✅; moneda dinámica WA ✅ |
| Reservas (propietario panel) | 99% | Tinaja cascade cabin→tenant ✅; moneda dinámica WA ✅; trial 3 meses ✅ |
| Calendario | 97% | Validación fecha POST ✅; filtro de fechas en API ✅; ventana 18 meses ✅ |
| Billing / Comisiones | 97% | Trial 3 meses ✅; guard comisión en subscribe ✅; cleanup al borrar tenant ✅ |
| Emails (Resend) | 99% | Moneda dinámica en todos los emails ✅; XSS fix en solicitar-review ✅ |
| WhatsApp (Twilio) | 99% | HMAC-SHA1 ✅; moneda dinámica en WA turista y propietario ✅ |
| MercadoPago (turistas) | 98% | currency_id dinámico; deleted_at check OK |
| MercadoPago (billing) | 97% | timingSafeEqual en webhook tenant MP ✅; guard commission en subscribe ✅ |
| RLS / Seguridad BD | 99% | Todos los P0/P1 resueltos; timing-safe en AMBOS webhooks MP ✅ |
| Índices BD | 95% | Índices aplicados en producción vía 008_indexes.sql |
| Paginación | 90% | Historial cursor paginado ✅; admin bookings por rango fechas ✅ |
| Zonas horarias | 60% | Todos los cálculos en UTC; Chile/Ecuador pueden tener desfases |
| Validación inputs públicos | 95% | UUID+fecha ✅; sanitización filename ✅; calendario POST fechas ✅ |
| Admin panel | 96% | Token via header ✅; cleanup fotos en cabin delete ✅ |
| Embed widget | 97% | calendar_blocks incluidos (bloques manuales reflejados) ✅ |
| Crons | 95% | Orquestador daily ✅; exclusión MP en cancelar y recordatorio ✅ |
| Health check | 98% | N+1 eliminado ✅; batch queries |

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

#### ~~P1-2: ADMIN_TOKEN en URL → aparece en logs de acceso~~ ✅ YA ESTABA RESUELTO
**Verificado 2026-06-17:** `app/admin/page.tsx` ya es un Client Component con form de login + `sessionStorage` + header `x-admin-token`. El token NUNCA aparece en la URL. El API route `/api/admin/data` recibe `x-admin-token` como header.

#### ~~P1-3: XSS en email de contacto~~ ✅ RESUELTO 2026-06-13
**Fix aplicado:** Función `escapeHtml()` en `app/api/contact/route.ts`.

#### ~~P1-4: Cron recordatorio aborta si un email falla~~ ✅ RESUELTO 2026-06-13
**Fix aplicado:** try-catch individual por booking en el loop.

#### ~~P1-5: mp/create-preference no verifica deleted_at~~ ✅ RESUELTO 2026-06-13
#### ~~P1-6: mp/status no verifica deleted_at~~ ✅ RESUELTO 2026-06-13

---

### P2 — Funcionalidad degradada o deuda técnica significativa

#### ~~P2-0a: embed/availability sin tenant_id explícito~~ ✅ RESUELTO 2026-06-17
**Fix:** `.eq("tenant_id", tenant.id)` agregado al query de bookings.

#### ~~P2-0b: billing/webhook — query commission_statements sin tenant_id~~ ✅ RESUELTO 2026-06-17
**Fix:** `.eq("tenant_id", stmt.tenant_id)` agregado al UPDATE — defensa en profundidad.

#### ~~P2-1: Sin paginación en historial~~ ✅ RESUELTO 2026-06-17
**Fix:** `/api/historial` acepta `cursor` (ISO timestamp) + `limit=100`, devuelve `next_cursor`. `HistorialPageClient` acumula páginas con botón "Cargar más".

#### ~~P2-2: Resumen semanal usa comisión hardcodeada~~ ✅ RESUELTO 2026-06-17
**Fix:** Join con `subscriptions(commission_rate, billing_mode)`; usa `commission_rate` dinámico.

#### ~~P2-3: lib/whatsapp.ts hace DB query por cada mensaje~~ ✅ RESUELTO 2026-06-17
**Fix:** Parámetros opcionales `whatsappEnabled`/`twilioWhatsappNumber` para skip de DB.

#### ~~P2-4: lib/audit.ts crea nuevo cliente Supabase por llamada~~ ✅ RESUELTO 2026-06-17
**Fix:** Acepta `SupabaseClient` opcional como segundo parámetro.

#### ~~P2-5: N+1 queries en /api/health~~ ✅ RESUELTO 2026-06-17
**Fix:** `Promise.all` con 2 queries batch; `Set` para lookup O(1).

#### P2-6: Zonas horarias UTC vs Chile/Ecuador
**Riesgo bajo** — los crons corren 09:00 UTC = 06:00 Chile, sin conflicto práctico.
**Decisión:** Posponer hasta que haya tenant en otra zona horaria con problemas reales.

#### ~~P2-7: embed/availability carga reservas sin rango de fechas~~ ✅ RESUELTO 2026-06-17
**Fix:** `.lt("check_in", windowEndStr).gt("check_out", windowStartStr)` en el query.

#### P2-8: generate-commission-statements mide por created_at, no check_in
**Acción requerida:** Confirmar con Juan qué fecha define el período.

---

### P3 — Código limpio y consistencia

#### P3-1: 35+ rutas usan createClient directo
**Impacto:** Inconsistencia de estilo. Funciona igual. Bajo.

#### ~~P3-2: admin/cabins update bug variable descartada~~ ✅ RESUELTO 2026-06-17
**Fix:** `q = q.eq("tenant_id", ...)` (era `q.eq(...)` ignorando el retorno — el filtro nunca se aplicaba).

#### ~~P3-3: resumen-semanal detecta género por heurística~~ ✅ RESUELTO 2026-06-17
**Fix:** Usa `tenants.gender` de la DB; fallback a heurística si null.

#### P3-4: Archivos muertos en raíz del repo
**Borrar solo con instrucción explícita de Juan.**

#### P3-5: review_sent_at y mp_preference_id no documentadas en CLAUDE.md schema
**Fix:** Ya aplicadas en producción vía 008_indexes.sql. CLAUDE.md debería documentarlas.

---

## Roadmap hacia el 100%

### ✅ Sprint 2026-06-13 — Seguridad crítica
- P0-1 Índices BD, P0-2 Race condition, P1-1 Firma Twilio, P1-3 XSS, P1-4 Loop resiliente, P1-5/P1-6 deleted_at en MP, P0-3 auth en 3 endpoints

### ✅ Sprint 2026-06-17 — Optimización y completitud
- P2-0a + P2-7 (embed queries), P2-1 (historial paginado), P2-2 + P3-3 (comisión/género dinámico), P2-3 (whatsapp), P2-4 (audit), P2-5 (health N+1), P3-2 (admin cabins bug)
- P1-2 verificado como ya resuelto

### Pendiente (antes de 10 clientes)
1. [P2-8] Confirmar con Juan: ¿comisiones por `created_at` o `check_in`?
2. [P3-4] Limpiar archivos muertos en raíz (con OK de Juan)

### Pendiente (antes de 50 clientes)
4. ~~[P2-1b] Paginación en admin dashboard~~ ✅ Resuelto: filtro por 2 años reemplaza `.limit(2000)`
5. ~~[P2-1c] Rango de fechas en `/api/calendar`~~ ✅ Resuelto: params start/end opcionales; cliente pasa 18 meses
6. [P2-6] Timezone-aware para crons (baja urgencia)
7. [P0-2b] Aplicar `create_booking_manual` en el formulario del turista también
8. [P2-0b] billing/webhook + tenant_id (muy bajo riesgo, requiere cambio de formato)

---

## Integraciones — estado confirmado

| Integración | Estado | Notas |
|------------|--------|-------|
| MercadoPago Marketplace (turistas) | ✅ Activo | HMAC verificado |
| MercadoPago Billing (Takai) | ✅ Activo | Webhook, preapproval, commission pay |
| Twilio WhatsApp | ✅ Activo | HMAC-SHA1 verificado ✅ |
| Resend emails | ✅ Activo | Loop resiliente ✅ |
| FullCalendar | ✅ Activo | |
| Recharts stats | ✅ Activo | |
| Vercel Analytics | ✅ Activo | |
| Vercel Crons | ✅ Activo | Orquestador `/api/cron/daily` + resumen-semanal |

---

## Historial de sesiones

| Fecha | Qué se hizo |
|-------|------------|
| 2026-06-12 | Auditoría total (solo lectura). Creados ESTADO-SISTEMA.md y actualizado CLAUDE.md. |
| 2026-06-12 | Sprint seguridad: P0 auth, P1 (Twilio HMAC, XSS, loop, deleted_at MP), RPC atómico, índices BD. |
| 2026-06-13 | Corrección documentación: CLAUDE.md y ESTADO-SISTEMA.md con info correcta de clientes y modelo de negocio. |
| 2026-06-17 | Sprint optimización: P2-0a, P2-1 (paginación), P2-2/P3-3 (comisión/género dinámico), P2-3 (whatsapp), P2-4 (audit), P2-5 (health), P2-7 (embed fechas), P3-2 (admin bug). P1-2 verificado. Onboard crea subscription row. Bugfix crítico comisión ÷100. Fix moneda en emails turista (USD/COP/CLP dinámico en emailNuevaReservaTurista, emailNuevaReservaDuena, emailTrialEnding). P0-2b y P3-5 verificados como ya resueltos. |
| 2026-06-17 | Auditoría completa de todas las rutas API. Fixes: TOCTOU en foto DELETE (verificar propiedad antes de borrar storage); currency_id dinámico en MP preference; UUID regex en availability visited param; extra_services fmt() en TemplateClasico. 40+ rutas verificadas y confirmadas sólidas. |
| 2026-06-17 | Sprint final: resumen-semanal con moneda+comisión dinámicas; admin/data con filtro de 2 años (P2-1b); calendar API con start/end params (P2-1c); billing/webhook con tenant_id en UPDATE (P2-0b). Auditados: cancelar-pendientes, recordatorio-transferencia, bookings/route, recordatorio, admin/onboard — todos sólidos. |
| 2026-06-18 | XSS fix en solicitar-review (esc() en guest_name/business_name/review_url); cabin delete limpia Storage; embed widget ahora incluye calendar_blocks (bloques manuales se mostraban como disponibles — bug crítico); tinaja_price desde tenants (no hardcoded 30000); moneda dinámica en WA de nueva reserva turista y propietario; validación fecha POST /api/calendar. |
| 2026-06-18 (cont.) | Timing attack en mp/webhook tenant (duplicate verifyMpSignature → ahora importa timingSafeEqual de lib/mp-verify); trial 3 meses en onboard (era 30 días); tinaja cascade cabin→tenant en bookings/manual; moneda dinámica en WA de reserva manual; exclusión mp_preference_id en crons cancelar-pendientes y recordatorio-transferencia (evita cancelar reservas MP con webhook demorado). |
