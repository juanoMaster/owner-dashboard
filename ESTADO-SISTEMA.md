# ESTADO DEL SISTEMA — Takai.cl owner-dashboard

> Actualizar al final de cada sesión. Leer al inicio.

---

## Última actualización
**Fecha:** 2026-06-17
**Sesión:** Sprint de optimización y completitud — P2/P3 cerrados
**Hecho:**
- P2-0a + P2-7: `embed/[slug]/availability` — agregado `.eq("tenant_id", tenant.id)` + filtro de fechas `.lt("check_in", windowEndStr).gt("check_out", windowStartStr)` al query de bookings
- P2-1: Historial pagination — API acepta `cursor` (ISO timestamp) + `limit=100`, devuelve `next_cursor`; HistorialPageClient acumula páginas y muestra botón "Cargar más"
- P2-2 + P3-3: `resumen-semanal` — tasa de comisión dinámica desde `subscriptions.commission_rate` (join); género desde `tenants.gender` con fallback a heurística; removida constante `TAKAI_COMMISSION_RATE`
- P2-3: `lib/whatsapp.ts` — parámetros opcionales `whatsappEnabled`/`twilioWhatsappNumber` para evitar DB query cuando el caller ya tiene el dato
- P2-4: `lib/audit.ts` — acepta `SupabaseClient` opcional para reusar conexión existente
- P2-5: `app/api/health/route.ts` — N+1 eliminado; reemplazado con `Promise.all` + 2 queries batch con `.in("tenant_id", tenantIds)`
- P3-2: `app/api/admin/cabins/route.ts` — corregido bug crítico: `q.eq("tenant_id", ...)` descartaba el resultado silenciosamente; corregido a `q = q.eq(...)`
- P1-2: Verificado que ya estaba resuelto — `app/admin/page.tsx` ya usa form + `sessionStorage` + header `x-admin-token` (no URL)
- vercel.json: ya usa `/api/cron/daily` como orquestador único + `/api/emails/resumen-semanal` semanal
- Build OK sin errores TypeScript

**Pendiente:** Commit + push a main (deploy Vercel automático)

---

## Porcentaje de completitud por área

| Área | % Completo | Notas |
|------|-----------|-------|
| Reservas (turista) | 95% | Funcional; índices aplicados en producción |
| Reservas (propietario panel) | 97% | Race condition resuelta vía RPC create_booking_manual atómico |
| Calendario | 90% | Funcional; sin paginación en API |
| Billing / Comisiones | 90% | Funcional; comisión dinámica en resumen-semanal |
| Emails (Resend) | 95% | Loop resiliente; género por DB; comisión dinámica |
| WhatsApp (Twilio) | 95% | HMAC-SHA1 verificado; parámetros opcionales para evitar DB extra |
| MercadoPago (turistas) | 95% | Filtros completos implementados |
| MercadoPago (billing) | 90% | Funcional; webhook billing sin test end-to-end |
| RLS / Seguridad BD | 95% | Todos los P0/P1 resueltos; P2-0b pendiente (bajo riesgo) |
| Índices BD | 95% | Índices aplicados en producción vía 008_indexes.sql |
| Paginación | 70% | Historial paginado ✅; calendar y admin sin paginar |
| Zonas horarias | 60% | Todos los cálculos en UTC; Chile/Ecuador pueden tener desfases |
| Validación inputs públicos | 70% | XSS contact resuelto; longitud de campos sin límite |
| Admin panel | 90% | Token via header ✅; bug tenant_id resuelto ✅; sin paginación |
| Crons | 90% | Orquestador daily ✅; funcionales; timezone risk bajo |
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

#### P2-0b: billing/webhook — query commission_statements sin tenant_id
**Riesgo bajo** — compensado por HMAC de MP. Pendiente de decisión de arquitectura.

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
2. [P3-5] Documentar `review_sent_at` y `mp_preference_id` en CLAUDE.md schema
3. [P3-4] Limpiar archivos muertos en raíz (con OK de Juan)

### Pendiente (antes de 50 clientes)
4. [P2-1b] Paginación en admin dashboard (`.limit(2000)` hardcodeado)
5. [P2-1c] Rango de fechas en `/api/calendar` (sin filtro de fechas actualmente)
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
| 2026-06-17 | Sprint optimización: P2-0a, P2-1 (paginación), P2-2/P3-3 (comisión/género dinámico), P2-3 (whatsapp), P2-4 (audit), P2-5 (health), P2-7 (embed fechas), P3-2 (admin bug). P1-2 verificado como ya resuelto. |
