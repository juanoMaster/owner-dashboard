REGLA DE GOBERNANZA: Las decisiones de negocio (precios, comisiones, qué se construye o se cancela) las toma únicamente Juan. Ninguna sesión de IA puede revertir, borrar o cancelar trabajo de otra sesión sin instrucción explícita de Juan en el mensaje actual. Ante contradicción entre documentos o sesiones, preguntar antes de actuar. Modelos vigentes (coexisten): (a) COMISIÓN — solo los 3 clientes fundadores (majoaal, el-mirador, cacagual); mensualidad bonificada a cambio de comisión sobre reservas; se mantiene activo y NO se toca hasta que migren. (b) SUSCRIPCIÓN — todos los clientes nuevos desde junio 2026; cuota de instalación + mensualidad, sin comisión. Ver sección 'Sistema de billing' para detalle completo. Decisiones permanentes: SII nunca, iCal import descartado, takai.cl solo B2B.

REGLA OBLIGATORIA — ESTADO-SISTEMA.md: Lee `ESTADO-SISTEMA.md` al inicio de cada sesión de trabajo para conocer el estado actual del sistema y qué quedó pendiente. Al final de CADA sesión, antes del commit final, actualiza `ESTADO-SISTEMA.md` con: qué se hizo, qué quedó pendiente, porcentaje de avance por área, y fecha (formato YYYY-MM-DD). Este archivo es la memoria viva del proyecto entre sesiones.

## Marco de análisis (para cada tarea de código)

Evaluar siempre en este orden antes de escribir código:
1. **Seguridad**: ¿Hay validación de input? ¿Se expone data sensible? ¿La autenticación es correcta?
2. **Integridad de datos**: ¿Hay race conditions? ¿El soft-delete está aplicado? ¿Hay transacciones donde se necesitan?
3. **Performance**: ¿Hay índices para este query? ¿Se retorna más data de lo necesario? ¿Hay N+1?
4. **Deuda técnica bloqueante vs ignorable**: Marcar P0/P1 (bloquea escala o seguridad), P2/P3 (mejora pero no urgente).
5. **Regla de no-construir**: No agregar features, abstracciones ni manejo de errores para casos imposibles. El código no cambia entre clientes — solo los datos.

---

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Qué es este sistema

Takai.cl es un SaaS multi-tenant de reservas para cabañas en Chile. Este repositorio es el owner-dashboard: el panel que cada propietario usa para gestionar sus reservas y calendario. Cada propietario es un tenant independiente con su propio `tenant_id`. El código no cambia entre clientes — solo los datos en Supabase.

Para agregar un nuevo cliente: insertar registros en `tenants`, `cabins`, y `dashboard_links`. Nada más.

## Commands

```bash
npm run dev      # desarrollo local
npm run build    # build de producción (TypeScript + lint)
npm run start    # servidor producción local
```

Deploy automático en Vercel al hacer `git push origin main`. Verificar que `npm run build` pase antes de hacer push — los errores de TypeScript rompen el build en Vercel.

## Reglas críticas de entorno (Windows + PowerShell)

- **Nunca usar CSS template literals en archivos `.tsx`** — PowerShell los corrompe al escribir archivos en Windows. Usar siempre inline styles con objetos JavaScript: `style={{ color: "#fff" }}`.
- **Para encadenar comandos en shell usar `;` no `&&`** — PowerShell no soporta `&&`.
- **Para escribir archivos `.tsx` complejos, usar un node script** (`node fix.js`) en lugar de escribir directamente con herramientas de edición.

## Stack

Next.js 14 (App Router), TypeScript, Supabase PostgreSQL, Vercel, GitHub. Sin Tailwind — solo inline styles con objetos JS. (`globals.css` importa Tailwind pero ningún componente usa clases Tailwind; es código inerte.)

Dependencias clave: `@fullcalendar/react` v6, `mercadopago` v2, `resend` v6, `recharts` v3, `@supabase/supabase-js` v2.

## Arquitectura multi-tenant

El `tenant_id` **siempre se obtiene dinámicamente desde la BD**, nunca hardcodeado en el código. El flujo de autenticación del panel:

```
token (URL) → SHA256 → dashboard_links.token_hash → tenant_id → todos los queries filtran por tenant_id
```

## Rutas — Páginas (app/**/page.tsx)

| URL | Archivo | Tipo | Descripción |
|-----|---------|------|-------------|
| `/?token=` | `app/page.tsx` | Server Component | Panel propietario — valida token y carga tenant |
| `/[slug]` | `app/[slug]/page.tsx` | Client Component | Landing pública del tenant con cabañas y reserva |
| `/admin?token=` | `app/admin/page.tsx` | Server Component | Panel admin global (protegido por `ADMIN_TOKEN`) |
| `/bienvenida/[booking_code]` | `app/bienvenida/[booking_code]/page.tsx` | Server Component | Página de bienvenida al huésped con guidebook |
| `/calendar?cabin_id=&token=` | `app/calendar/page.tsx` | Client Component | Calendario FullCalendar (solo elimina bloques) |
| `/embed/[slug]/calendario` | `app/embed/[slug]/calendario/page.tsx` | Client Component | Widget de disponibilidad embebible en iframes |
| `/historial?token=` | `app/historial/page.tsx` | Client Component | Historial completo de reservas del propietario |
| `/pinilla` | `app/pinilla/page.tsx` | Server Component | Legacy: redirect permanente a `/el-mirador` |
| `/reservar?cabin_id=&...` | `app/reservar/page.tsx` | Client Component | Formulario de reserva para turistas |
| `/reservar/pago-exitoso` | `app/reservar/pago-exitoso/page.tsx` | Client Component | Confirmación post-pago MercadoPago |
| `/reservar/pago-fallido` | `app/reservar/pago-fallido/page.tsx` | Client Component | Error post-pago MercadoPago |
| `/reservar/pago-pendiente` | `app/reservar/pago-pendiente/page.tsx` | Client Component | Instrucciones para pago por transferencia + countdown |

## Rutas — APIs (app/api/**/route.ts)

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/dashboard` | GET | Datos del panel: tenant, cabañas, reservas draft |
| `/api/calendar` | GET | Bloques del calendario con `has_booking` e `is_confirmed` |
| `/api/calendar` | POST | Crea bloque manual |
| `/api/calendar/delete` | POST | Elimina bloque; si tiene `booking_id`, elimina todos del mismo booking |
| `/api/bookings` | POST | Crea reserva desde formulario turista (status `"draft"`) |
| `/api/bookings/manual` | POST | Crea reserva desde panel propietario (status `"draft"`) |
| `/api/bookings/confirm` | POST | status → `"confirmed"`, calendar_blocks.reason → `"system_booking"` |
| `/api/bookings/cancel` | POST | Soft-delete booking + elimina calendar_blocks |
| `/api/bookings/bank-info` | GET | Datos bancarios del tenant dado un `booking_id` |
| `/api/availability` | GET | Verifica disponibilidad; sugiere alternativas |
| `/api/historial` | GET | Historial completo incluyendo canceladas |
| `/api/stats` | GET | Ingresos por mes (últimos 12 meses), para gráficos Recharts |
| `/api/tenant/guidebook` | PATCH | Actualiza `guidebook` y/o `google_review_url` del tenant |
| `/api/tenant/[slug]/cabins` | GET | Cabañas + info del tenant por slug (landing pública) |
| `/api/tenant-by-cabin` | GET | Datos del tenant dado un `cabin_id` (formulario turista) |
| `/api/embed/[slug]/availability` | GET | Disponibilidad en ventana de 3 meses (para widget embebible) |
| `/api/mp/create-preference` | POST | Crea preferencia de pago en MercadoPago |
| `/api/mp/webhook` | POST | Recibe confirmación de pago MP; verifica firma HMAC con `mp_webhook_secret` |
| `/api/mp/status` | GET | Verifica si MP está habilitado para una reserva |
| `/api/emails/nueva-reserva` | POST | Envía email al turista y al propietario |
| `/api/emails/reserva-confirmada` | POST | Envía email de confirmación al turista |
| `/api/emails/recordatorio` | POST | Cron: recordatorio de check-in próximo al turista |
| `/api/emails/resumen-semanal` | GET | Cron: resumen semanal de reservas a propietarios |
| `/api/emails/resumen-semanal/preview` | GET | Preview del email resumen-semanal (solo desarrollo) |
| `/api/emails/solicitar-review` | POST | Cron: solicita reseña a turistas post check-out |
| `/api/cabins/update` | PATCH | Actualiza campos de una cabaña (description, capacity, cleaning_fee, season_prices) |
| `/api/cabins/update-price` | PATCH | Actualiza precio base de una cabaña |
| `/api/cabins/photos` | POST/DELETE | Sube o elimina fotos de cabaña en Supabase Storage |
| `/api/cron/cancelar-pendientes` | POST | Cron: cancela reservas draft vencidas según `transfer_timeout_hours` |
| `/api/cron/recordatorio-transferencia` | POST | Cron: WhatsApp a turistas que no enviaron comprobante de transferencia |
| `/api/twilio/webhook` | POST | Recibe mensajes WhatsApp entrantes; detecta booking codes para registrar comprobante |
| `/api/health` | GET | Verifica DB + cabañas activas + dashboard_links; envía alerta por email si falla |
| `/api/contact` | POST | Formulario de contacto de la landing → email a contacto@takai.cl |
| `/api/admin/tenants` | GET/PATCH/DELETE | CRUD de tenants (protegido por `ADMIN_TOKEN`) |
| `/api/admin/cabins` | GET/POST/DELETE | CRUD de cabañas (protegido por `ADMIN_TOKEN`) |
| `/api/admin/onboard` | POST | Crea tenant + cabañas + dashboard_link en una operación |
| `/api/admin/tokens` | GET/POST | Gestiona dashboard_links de un tenant |
| `/api/admin/commissions` | PATCH | Actualiza estado de comisiones en reservas |
| `/api/tenant/bank` | PATCH | Actualiza datos bancarios del tenant (bank_name, bank_account_type, bank_account_number, bank_account_holder, bank_rut, bank_email) |
| `/api/trinidad/cabins` | GET | **Legacy** — usar `/api/tenant/[slug]/cabins` para casos nuevos |

## Crons (vercel.json)

| Schedule (UTC) | Endpoint | Qué hace |
|----------------|----------|----------|
| `0 8 * * *` | `/api/health` | Diario 08:00 — health check, envía alerta si hay falla |
| `0 13 * * *` | `/api/emails/recordatorio` | Diario 13:00 — recordatorio de check-in al turista |
| `0 14 * * *` | `/api/emails/solicitar-review` | Diario 14:00 — pedido de reseña post check-out |
| `0 10 * * 1` | `/api/emails/resumen-semanal` | Lunes 10:00 — resumen semanal al propietario |
| `0 9 * * *` | `/api/cron/cancelar-pendientes` | ⚠ ver CONTRADICCIONES — cancela drafts vencidos según `transfer_timeout_hours` |
| `30 9 * * *` | `/api/cron/recordatorio-transferencia` | ⚠ ver CONTRADICCIONES — WhatsApp a turistas sin comprobante |
| `0 9 * * *` | `/api/cron/billing-check` | Diario 09:00 — suspende trials/past_due (solo subscription mode); alerta si free_until venció |
| `0 10 1 * *` | `/api/cron/generate-commission-statements` | 1° de cada mes 10:00 — genera estados de cuenta de comisiones |

Los cron jobs se autentican con `Authorization: Bearer CRON_SECRET`.

## Variables de entorno

| Variable | Descripción | Requerida |
|----------|-------------|-----------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase | Sí |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave pública Supabase (client-side) | Sí |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave de servicio Supabase (bypassa RLS) — **solo server-side** | Sí |
| `RESEND_API_KEY` | API key de Resend para emails | Sí |
| `ADMIN_TOKEN` | Token para acceder al panel admin global | Sí |
| `CRON_SECRET` | Bearer token para autenticar cron jobs de Vercel | Sí |
| `NEXT_PUBLIC_APP_URL` | URL base del panel. Fallback en código: `https://owner-dashboard-navy.vercel.app` (estable). Setear a `https://panel.takai.cl` solo cuando ese dominio esté bien asignado en Vercel. `middleware.ts` mantiene `panel.takai.cl` en `PASSTHROUGH_HOSTS` para el ruteo del host. | Sí |
| `NEXT_PUBLIC_RESERVAS_URL` | URL del sitio de reservas (default: `https://reservas.takai.cl`) | Sí |
| `TWILIO_ACCOUNT_SID` | Account SID de Twilio para WhatsApp saliente | Sí |
| `TWILIO_AUTH_TOKEN` | Auth token de Twilio | Sí |
| `TWILIO_WHATSAPP_FROM` | Número Twilio en formato `whatsapp:+1...` | Sí |
| `HEALTH_CHECK_KEY` | Clave para autorizar `/api/health` vía header `x-health-key` o query `?key=` | Opcional |

## Schema de Supabase

**Verificar columnas aquí antes de escribir cualquier SELECT.** Una columna inexistente hace que Supabase devuelva error, lo que puede romper la autenticación completa del panel.

Todas las tablas tienen RLS habilitado (migración 002). El `SUPABASE_SERVICE_ROLE_KEY` bypassa RLS — nunca exponer al cliente.

### `dashboard_links`
| Columna | Tipo | Notas |
|---------|------|-------|
| `id` | uuid | PK |
| `tenant_id` | uuid | FK a tenants |
| `token_hash` | text | SHA256 del token de acceso |
| `active` | boolean | |
| `created_at` | timestamptz | |
| `last_used_at` | timestamptz | Se actualiza en cada login |

### `tenants`
| Columna | Tipo | Notas |
|---------|------|-------|
| `id` | uuid | PK |
| `business_name` | text | Nombre del negocio |
| `owner_name` | text | Nombre del propietario |
| `slug` | text | URL-friendly, único. Ej: `"el-mirador"` |
| `owner_whatsapp` | text | Número con código de país |
| `email_owner` | text | Email principal del propietario |
| `email_owner_2` | text | Email secundario del propietario (opcional) |
| `gender` | text | Género del propietario (usado en templates de email) |
| `country` | text | País del tenant |
| `twilio_whatsapp` | text | Número Twilio asignado al tenant (legacy) |
| `deposit_percent` | int | % de anticipo. Default 20 |
| `min_nights` | int | Noches mínimas. Default 2 |
| `tinaja_price` | int | Precio tinaja por día en moneda local |
| `has_tinaja` | boolean | Si el tenant ofrece tinaja |
| `currency` | text | `"CLP"`, `"USD"`, `"COP"`. Default `"CLP"` |
| `bank_name` | text | Nombre del banco |
| `bank_account_type` | text | `"Cuenta corriente"`, `"Cuenta vista"`, etc. |
| `bank_account_number` | text | Número de cuenta |
| `bank_account_holder` | text | Titular de la cuenta |
| `bank_rut` | text | RUT del titular |
| `bank_email` | text | Email para recibir comprobantes de transferencia |
| `billing_status` | text | Espejo desnormalizado de `subscriptions.status`. `"trial"`, `"active"`, `"suspended"` |
| `manual_billing` | boolean | Si `true`, nunca se suspende automáticamente (ej: GlampingCacagual) |
| `template` | text | Template visual de la landing pública: `"clasico"`, `"moderno"`, `"rural"` |
| `mp_enabled` | boolean | MercadoPago habilitado |
| `mp_access_token` | text | Token de acceso MP del tenant |
| `mp_webhook_secret` | text | Secret HMAC para verificar webhooks MP |
| `payment_provider` | text | `"mp"`, `"transfer"`, etc. |
| `whatsapp_enabled` | boolean | Si el tenant tiene WhatsApp activo |
| `dashboard_token` | text | Token en texto plano (para links de acceso en emails) |
| `transfer_timeout_hours` | int | Horas máximas para enviar comprobante de transferencia. Default 12 |
| `guidebook` | jsonb | Manual de bienvenida: `{checkin_time, checkout_time, arrival_instructions, wifi_name, wifi_password, house_rules, local_tips, checkout_instructions, emergency_contact}` |
| `google_review_url` | text | URL para solicitar reseña en Google |
| `active` | boolean | |
| `verified` | boolean | |
| `location_text` | text | Dirección legible |
| `location_maps_url` | text | Link a Google Maps |
| `latitude` | numeric | Latitud geográfica |
| `longitude` | numeric | Longitud geográfica |
| `tagline` | text | Descripción corta para SEO |
| `activities` | jsonb | Array de actividades |
| `page_rules` | jsonb | Reglas/normas de la cabaña |
| `extra_services` | jsonb | Servicios adicionales del tenant |
| `facebook_url` | text | |
| `instagram_url` | text | |
| `created_at` | timestamptz | |

### `cabins`
| Columna | Tipo | Notas |
|---------|------|-------|
| `id` | uuid | PK |
| `tenant_id` | uuid | FK a tenants |
| `name` | text | Nombre de la cabaña |
| `capacity` | int | Capacidad máxima de personas |
| `base_price_night` | numeric | Precio base por noche |
| `extra_person_price` | numeric | Precio por persona extra sobre capacity |
| `cleaning_fee` | numeric | Tarifa de limpieza |
| `pricing_tiers` | jsonb | Array de `{min_guests, max_guests, price_per_night}` |
| `season_prices` | jsonb | Array de precios por temporada: `{name, start_md, end_md, price_per_night, min_nights?}` — `start_md`/`end_md` son strings `"MM-DD"` (no fechas ISO). Ver `lib/pricing.ts`. |
| `photos` | text[] | Array de URLs de fotos |
| `description` | text | Descripción larga |
| `amenities` | jsonb | Amenidades |
| `extras` | jsonb | Extras disponibles |
| `active` | boolean | |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

### `bookings`
| Columna | Tipo | Notas |
|---------|------|-------|
| `id` | uuid | PK |
| `tenant_id` | uuid | FK a tenants |
| `cabin_id` | uuid | FK a cabins |
| `booking_code` | text | Código legible. Formato: `"ELM-ABC-1234"` |
| `guest_name` | text | Nombre del huésped |
| `guest_email` | text | Email del huésped |
| `guest_phone` | text | WhatsApp del huésped |
| `check_in` | date | Fecha de ingreso (YYYY-MM-DD) |
| `check_out` | date | Fecha de salida (YYYY-MM-DD) |
| `guests` | int | Número de personas |
| `nights` | int | Número de noches |
| `subtotal_amount` | numeric | Solo alojamiento |
| `total_amount` | numeric | Total incluyendo extras y tinaja |
| `deposit_percent` | int | % de anticipo aplicado |
| `deposit_amount` | numeric | Monto del anticipo |
| `balance_amount` | numeric | Saldo restante |
| `tinaja_amount` | numeric | Monto cobrado por tinaja |
| `status` | text | `"draft"` o `"confirmed"` |
| `notes` | text | JSON string con `{nombre, whatsapp, codigo, notas, origen, tinaja, price_per_night}` |
| `commission_percent` | numeric | |
| `commission_amount` | numeric | |
| `commission_status` | text | `"not_applicable"`, etc. |
| `transfer_proof_received_at` | timestamptz | Timestamp del comprobante de transferencia recibido vía WhatsApp. null si no recibido. |
| `reminder_sent_at` | timestamptz | Timestamp del recordatorio enviado. null si aún no se envió. Evita duplicados en el cron. |
| `review_sent_at` | timestamptz | Timestamp de la solicitud de reseña enviada. null si no enviada. Evita duplicados en el cron solicitar-review. |
| `mp_preference_id` | text | ID de preferencia MercadoPago. null si sin pago MP. Aplicado en migración 008. |
| `deleted_at` | timestamptz | Soft delete — null si activa |
| `deleted_by` | text | Quién canceló: `"owner_panel"`, `"system"`, etc. |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

### `calendar_blocks`
| Columna | Tipo | Notas |
|---------|------|-------|
| `id` | uuid | PK |
| `tenant_id` | uuid | FK a tenants |
| `cabin_id` | uuid | FK a cabins |
| `start_date` | date | Primer día bloqueado |
| `end_date` | date | Día de checkout (exclusivo en FullCalendar) |
| `reason` | text | `"manual"`, `"transfer_pending"`, `"system_booking"` |
| `booking_id` | uuid | null para bloques manuales sueltos |
| `created_at` | timestamptz | |

### `audit_log`
| Columna | Tipo | Notas |
|---------|------|-------|
| `id` | uuid | PK |
| `tenant_id` | uuid | |
| `cabin_id` | uuid | Puede ser null |
| `action` | text | `"booking_created"`, `"booking_confirmed"`, `"booking_cancelled"` |
| `entity_type` | text | `"booking"`, `"cabin"`, etc. |
| `entity_id` | uuid | ID del objeto afectado |
| `details` | jsonb | Datos adicionales del evento |
| `performed_by` | text | `"owner_panel"`, `"formulario_turista"`, `"mercadopago_webhook"`, etc. |
| `created_at` | timestamptz | |

## Valores de enum

- `bookings.status`: `"draft"` (pendiente de pago) o `"confirmed"` (pagada).
- `calendar_blocks.reason`: `"manual"` (bloque suelto o reserva sin confirmar), `"transfer_pending"` (turista pendiente de transferencia), `"system_booking"` (reserva confirmada).
- `bookings.notes`: JSON string con claves: `nombre`, `whatsapp`, `codigo`, `notas`, `origen`, `tinaja`, `price_per_night`.
- `tenants.owner_name`: nombre del propietario. **No está en `dashboard_links`.**

## Utilities (`lib/`)

**Supabase clients — cuál usar cuándo:**
- `lib/supabase.ts` → `getSupabase()` — cliente anon, singleton, solo client-side. Respeta RLS.
- `lib/supabase-server.ts` → `getSupabaseAdmin()` — service role, bypassa RLS. Para API routes.
- `lib/supabase-server.ts` → `getSupabaseForTenant(tenantId)` — service role + llama `set_tenant_context` RPC para activar RLS por tenant. Usar en rutas donde se quiere que RLS filtre por `tenant_id` sin pasar la clave anon al server.

**Pricing (`lib/pricing.ts`):** `getPriceForDates()` calcula el total noche a noche combinando temporadas y tiers de huéspedes. `SeasonPrice.start_md`/`end_md` son strings `"MM-DD"` (no ISO). Soporta rangos que cruzan año (`"12-15"` a `"03-15"`). `getPriceForGuests()` aplica el tier correcto o cae al precio base si no hay match.

**Token persistence (`lib/takai-token.ts`):** El token del propietario se persiste en `localStorage` Y en una cookie con max-age 90 días. La cookie existe para que Safari/PWA standalone pueda leer el token cuando `localStorage` no está disponible entre contextos.

**Billing utilities (`lib/billing.ts`):** `getBillingInfo(tenant_id)` retorna `billing_status` y `manual_billing`. `isBillingBlocked()` devuelve `true` solo si `billing_status === "suspended"` y `manual_billing === false`. Usar antes de cualquier operación de escritura en rutas protegidas por billing.

## Comportamientos no obvios

**FullCalendar end exclusivo:** Con `allDay: true`, FullCalendar trata `end` como fecha exclusiva. El `end_date` de la DB es el día de checkout (primer día libre), que coincide con `check_out`. Al construir eventos: `new Date(e.end + "T12:00:00")` → `setDate(d + 1)` para que el bloque visual cubra el último día.

**parseNotes():** Maneja tres formatos según el origen: objeto JS (columna JSONB), JSON string (formulario manual/turista), o pipe-delimited (flujo chatbot legacy). No asumir el formato.

**Calendario del propietario:** Solo elimina bloques — `dateClick` está removido intencionalmente. Las reservas se crean únicamente desde "Nueva reserva manual" en el panel.

**Eliminación de bloques:** Al eliminar desde el calendario, si el bloque tiene `booking_id`, el endpoint `/api/calendar/delete` elimina todos los bloques con ese `booking_id`. Si `booking_id` es null, elimina solo ese bloque.

**Doble confirmación:** Si `extendedProps.isConfirmed === true`, el calendario muestra dos confirmaciones antes de eliminar para advertir que la reserva ya está pagada.

**Soft delete en bookings:** Las reservas canceladas no se eliminan físicamente. Usan `deleted_at` timestamp + `deleted_by` texto. Los queries activos siempre deben incluir `.is("deleted_at", null)`.

**Booking codes:** Se generan con `lib/booking-code.ts` usando el slug del tenant como prefijo. El Mirador → `ELM-ABC-1234`. Siempre derivar el prefijo del slug del tenant, nunca hardcodearlo.

**Webhook MP — idempotencia:** El webhook puede llegar más de una vez. Siempre verificar `booking.status !== "confirmed"` antes de procesar para evitar duplicados.

**Flujo de transferencia:** Al crear una reserva con `payment_provider = "transfer"`, el cron `cancelar-pendientes` cancela automáticamente si `transfer_proof_received_at` sigue null después de `transfer_timeout_hours` horas (default 12). El cron `recordatorio-transferencia` envía un WhatsApp intermedio y registra `reminder_sent_at` para no repetirlo.

**`/api/trinidad/cabins`:** Endpoint legacy — Trinidad (Angélica Ancalef) fue ex-prospecto que no siguió. El endpoint se mantiene en el código pero no tiene uso activo. Usar `/api/tenant/[slug]/cabins` para todos los casos nuevos.

**Templates de landing (`/[slug]`):** `app/[slug]/page.tsx` lee `tenants.template` y renderiza uno de tres componentes: `TemplateClasico`, `TemplateModerno`, o `TemplateRural` (en `app/[slug]/templates/`). Todos reciben la misma interfaz `TenantData` + `Cabin[]`. El selector de template vive en el panel admin (`TenantFormFields.tsx`).

## Integraciones

**MercadoPago:** Paquete `mercadopago` v2. Cada tenant tiene su propio `mp_access_token` y `mp_webhook_secret`. El webhook verifica firma HMAC-SHA256 antes de confirmar la reserva.

**Twilio/WhatsApp:** Sin SDK — llamadas REST directas a `api.twilio.com`. Envío vía `lib/whatsapp.ts`; recepción de comprobantes en `/api/twilio/webhook` (detecta booking codes con regex). El número `from` es compartido del sistema (`TWILIO_WHATSAPP_FROM`); el número `to` del tenant viene de `tenants.twilio_whatsapp`.

**Resend:** Paquete `resend` v6. Templates HTML inline en `lib/resend.ts` (424 líneas). Tipos de email: `nueva-reserva`, `reserva-confirmada`, `recordatorio`, `resumen-semanal`, `solicitar-review`, alertas internas vía `lib/alertEmail.ts`.

**FullCalendar:** `@fullcalendar/react` v6 con plugins `daygrid` e `interaction`. Usado en `app/calendar/page.tsx` (panel propietario) y `app/embed/[slug]/calendario/page.tsx` (widget embebible).

**Recharts:** v3 — gráficos de ingresos mensuales en `HomeDashboardClient.tsx`, alimentado por `/api/stats`.

## Paleta de colores

Todos los colores van en inline styles (objetos JS), nunca en clases Tailwind.

```
Fondo página:  #0d1a12    Nav:           #0a1510
Tarjeta:       #162618    Borde:         #2a3e28
Texto heading: #e8d5a3    Texto body:    #8a9e88
Verde acento:  #7ab87a    Rojo bloqueo:  #e63946
Verde confirm: #27ae60    Texto muted:   #5a7058
```

Tipografía: `Georgia, serif` para headings y montos, `sans-serif` para cuerpo y UI.

## Sistema de billing (Takai cobra a sus tenants)

Implementado en junio 2026. **NUNCA mezclar con el MP Marketplace** (turistas → propietarios).

**Credenciales Takai:** `MP_PLATFORM_ACCESS_TOKEN` y `MP_PLATFORM_WEBHOOK_SECRET` son de la cuenta de Takai. Los de cada tenant (`mp_access_token`) son para los turistas.

### Modos de billing (`subscriptions.billing_mode`)

Takai opera con dos modelos que coexisten. **NUNCA desactivar el módulo de comisiones** — da servicio a los clientes fundadores.

| Modo | Quién lo usa | Cómo cobra Takai |
|------|-------------|-----------------|
| `commission` | Los 3 clientes fundadores (majoaal, el-mirador, cacagual) | Estado de cuenta mensual: X% de reservas confirmadas. Mensualidad bonificada a cambio de comisión. Modelo heredado; se respeta hasta que migren a suscripción. |
| `subscription` | Todos los clientes nuevos desde junio 2026 | Cuota de instalación (pago único) + mensualidad. Sin comisión sobre reservas. |
| `manual` | No implementado todavía | Fuera de sistema |

**Precios modelo suscripción (vigente junio 2026):**
- Cuota de instalación: $80.000 CLP (oferta de lanzamiento activa: $20.000 CLP)
- 3 meses de mensualidad gratis para todos los clientes nuevos
- Desde el mes 4: $15.000 CLP/mes para quienes ingresen antes de diciembre 2026 (precio grandfathered, lo mantienen indefinidamente)
- Desde enero 2027: $20.000 CLP/mes para nuevos ingresos
- Comisión por reserva **NO** se ofrece a clientes nuevos (inauditable con transferencia bancaria). El único fee variable aceptable en el futuro es un pequeño porcentaje sobre pagos procesados vía MercadoPago dentro de Takai (auditable) — esto es fase de escala, no ahora.
- El sistema soporta distintos planes y precios por tenant vía BD, sin cambiar código.

**Clientes fundadores (modelo comisión, verificado 2026-06-13):**
- `el-mirador`: `billing_mode=commission`, `free_until=2026-11-30`, `status=active`
- `cabanas-majoaal-licanray`: `billing_mode=commission`, `free_until=2027-02-28`, `status=active`
- `glamping-cacagual`: `billing_mode=commission`, `free_until=NULL` (indefinido), `manual_billing=true`, Ecuador/USD, NUNCA suspender automáticamente

**Cuentas de prueba (no son clientes):**
- `cabanas-miki` — cuenta de prueba interna
- `cabanas-takai` (demo) — cuenta de prueba interna

**Ex-prospectos (no son clientes activos):**
- Johanna Medina (rukatraro) — probó la demo, desistió. Slug `rukatraro` puede quedar en BD como histórico.
- Angélica Ancalef (trinidad) — probó la demo, desistió. Endpoint `/api/trinidad/cabins` quedó legacy en el código.

### Tablas billing

- `subscriptions` — una fila por tenant. Campos clave: `billing_mode`, `status`, `commission_rate`, `free_until`, `trial_ends_at`, `mp_preapproval_id`, `failed_payments`.
- `commission_statements` — estado de cuenta mensual. `status`: `pending → sent → transfer_reported → paid`. `ack_token` (64-hex): link único de confirmación para admin.
- `tenants.billing_status` — espejo desnormalizado de `subscriptions.status`.
- `tenants.manual_billing` — si `true`, nunca se suspende automáticamente.
- `tenants.bank_email` — email para recibir comprobantes de transferencia.

### Flujo comisiones

1. Cron `1° de cada mes 10:00 UTC` → `generate-commission-statements`: suma reservas confirmadas del mes anterior, crea `commission_statement`, envía email con dos opciones de pago.
2. Tenant paga por tarjeta → `/api/billing/commission-pay` → MP Preference → webhook `type=payment` marca como `paid`.
3. Tenant paga por transferencia → `/api/billing/report-transfer` → genera `ack_token`, envía email a `ADMIN_EMAIL` con link único.
4. Admin confirma → `GET /api/billing/ack/[token]` → marca como `paid`, envía email al tenant.

### Rutas billing

- `POST /api/billing/subscribe` — crea preapproval MP (solo subscription mode).
- `POST /api/billing/webhook` — eventos MP: `payment` (comisión tarjeta), `preapproval`, `authorized_payment`.
- `GET  /api/billing/status` — info completa: sub + últimos 6 statements. Requiere token.
- `POST /api/billing/commission-pay` — genera MP Preference para pago único de comisión.
- `POST /api/billing/report-transfer` — tenant reporta que transfirió; genera ack_token.
- `GET  /api/billing/ack/[token]` — admin confirma pago por transferencia.
- `GET  /api/cron/billing-check` — diario 09:00 UTC: suspende trials/past_due (solo `billing_mode=subscription`). Para commission mode: solo alerta por email si `free_until` venció.
- `GET  /api/cron/generate-commission-statements` — 1° de cada mes 10:00 UTC.

### Variables de entorno billing

`MP_PLATFORM_ACCESS_TOKEN`, `MP_PLATFORM_WEBHOOK_SECRET`, `TAKAI_BANK_NAME`, `TAKAI_BANK_ACCOUNT_TYPE`, `TAKAI_BANK_ACCOUNT_NUMBER`, `TAKAI_BANK_HOLDER_NAME`, `TAKAI_BANK_HOLDER_RUT`, `TAKAI_BANK_EMAIL`, `ADMIN_EMAIL`.

### Enforcement (solo subscription mode suspendido)

- `POST /api/bookings/manual` → 403.
- `PATCH /api/cabins/update` → 403.
- `PATCH /api/cabins/update-price` → 403.
- `POST /api/cabins/photos` → 403.
- `GET /[slug]` pública → "reservas no disponibles".
- Dashboard → banner rojo con link a `/dashboard/facturacion`.
- Commission mode y manual_billing=true NUNCA generan banners ni 403.

### Página `/dashboard/facturacion`

- Commission mode: muestra "Plan Comisión X% — sin mensualidad hasta {fecha|indefinido}", historial de estados de cuenta, botones "Pagar con tarjeta" (solo CLP) y "Ya transferí".
- Subscription mode: muestra estado, días de trial restantes, botón para activar MP.
- GlampingCacagual (USD): formatea montos en USD correctamente.

## Estado real del sistema — verificado junio 2026

Auditado leyendo el código fuente (INVENTARIO-REAL-2026-06.md, fusionado a este archivo).

### Cron `cancelar-pendientes` — verificado
- Autenticación: `Authorization: Bearer CRON_SECRET` ✅
- Libera `calendar_blocks` al cancelar ✅
- Registra en `audit_log` ✅
- Notificación al turista: WhatsApp vía Twilio (no email) — ver CONTRADICCIONES

### Seguridad — hallazgos
- `ADMIN_TOKEN` se pasa como query param en URL (`/admin?token=...`) — plaintext en logs de acceso. (P1-2, pendiente)
- `/api/twilio/webhook` — verificación de `X-Twilio-Signature` implementada (HMAC-SHA1 + timing-safe compare). ✅ Resuelto 2026-06-13.
- 42 rutas API usan `SUPABASE_SERVICE_ROLE_KEY` (bypassa RLS por diseño, ok para server-side).

### Archivos muertos en raíz del repo (candidatos a borrar)
`diagnostico.txt`, `todo_el_sistema.txt`, `archivos_takai.txt`, `ESTADO_SISTEMA.md`, `CONTINUIDAD-TAKAI-2026-04-14.md`, `CONTEXT.md`, `_tmp_volver.txt`, `fix_admin_api.js`, `landing/index.html`.
No los elimino sin instrucción explícita de Juan.

### Integraciones confirmadas como activas
MercadoPago Marketplace (turistas→propietarios) ✅, Twilio/WhatsApp ✅, Resend ✅, FullCalendar ✅, Recharts ✅.
Nota: `@vercel/analytics` está en dependencies y en `app/layout.tsx`.

---

## Contradicciones pendientes — Juan decide

| # | Dónde | Situación | Impacto |
|---|-------|-----------|---------|
| 1 | `cancelar-pendientes` notificación | Task spec pedía email al turista al cancelar; código envía solo WhatsApp | Si el turista no tiene WhatsApp configurado no recibe aviso |

**Resueltas:** Los crons `cancelar-pendientes` y `recordatorio-transferencia` son daily (`0 9 * * *` / `30 9 * * *`) según vercel.json — la tabla en este archivo ya refleja eso.

---

## Bugs corregidos (histórico)

| Bug | Archivo | Fix |
|-----|---------|-----|
| RLS `OR current_tenant_id() IS NULL` permitía ver todos los datos si no había contexto de sesión | `supabase/migrations/004_rls_policies.sql` | Eliminada la cláusula; policies ahora usan solo `tenant_id = current_tenant_id()` |
| `tinaja_price` en reservas manuales usaba hardcode `30000` en lugar del valor del tenant | `app/api/bookings/manual/route.ts` | Ahora lee `tenants.tinaja_price` vía `tenantConfig` |

---

## Motor de Reservas (rama feature/motor-reservas — junio 2026, pendiente de merge)

Construido en la tanda nocturna del `PLAN_NOCHE_TAKAI.md`. **NO está en main aún.** Detalle en `PROGRESO.md` y pendientes en `BLOCKERS.md`.

### Tablas nuevas (migración 013, aplicar manual)
- `affiliates` — programa de afiliados. `code` (va en `?ref=`), `commission_rate`, `token_hash` (dashboard). RLS default-deny (acceso server-side por token).
- `reviews` — reseñas de huéspedes. `status` pending/approved/rejected (moderación). RLS `tenant_isolation`. Alimentan el schema/Rich Results.
- `email_opt_out` — bajas de retargeting (por email global). RLS default-deny.
- `whatsapp_conversations` — memoria del agente IA por `(tenant_id, phone)`. RLS `tenant_isolation`.
- `bookings.booking_source` (`directory`/`whatsapp_agent`/`affiliate`/`owner_direct`/`manual`) + `bookings.affiliate_id`. Generadas por Takai = 10%; directas = 0%.
- `tenants.agent_system_prompt` (persona del agente), `tenants.google_place_id`, `tenants.google_business_url`.

### Auto-cancelación a 3h (Fase 1)
`AUTO_CANCEL_HOURS = 3` (constante única) en `/api/cron/cancelar-pendientes`. Para garantizar la ventana de 3h corre cada 15 min vía **pg_cron + pg_net** (migración 011, embebe el secreto → aplicar manual). El orquestador diario se mantiene como respaldo.

### Schema SEO (Fase 3) — `lib/schema.ts`
`buildVacationRental()` + `buildBreadcrumb()` generan JSON-LD desde datos reales. Inyectado por `app/components/JsonLd.tsx` (única excepción sancionada a "cero dangerouslySetInnerHTML": data propia, `<` escapado). Se omite si la cabaña no tiene 8 fotos o geo válida.

### Agente IA de WhatsApp (Fase 6) — `lib/agent.ts`
Extiende `/api/twilio/webhook` (rama "sin código"; la de booking codes quedó intacta). OpenAI-compatible vía `LLM_API_URL`/`LLM_API_KEY`/`LLM_MODEL`. Tools `check_availability`/`get_price` con datos reales (anti-alucinación). Identifica cabaña por tag `[C:<id>]` o memoria. Sin `LLM_API_KEY` → handoff al dueño. Botón en `WhatsAppAgentButton.tsx`.

### Modelo de comisión (decisión de Juan, 2026-06-19) — `lib/commission.ts`
- Takai cobra **10% sobre toda reserva generada por Takai** (`booking_source IN directory, whatsapp_agent, affiliate`). Directas (`owner_direct`, `manual`) → **0%**.
- De ese 10%, **hasta 5% se cede a afiliados/influencers** (`affiliates.commission_rate` topado en 5%: CHECK en BD + validación en API + clamp defensivo).
- Los **3 clientes actuales** (`el-mirador`, `cabanas-majoaal-licanray`, `glamping-cacagual`) **NO cambian hasta que venzan sus plazos**: se mantienen en su modelo comisión heredado. El cron `generate-commission-statements` que los factura **NO se toca**.
- Constantes: `TAKAI_COMMISSION_RATE=10`, `MAX_AFFILIATE_RATE=5`. Helpers `isTakaiGenerated()`, `clampAffiliateRate()`.
- Pendiente de escala: cómo facturar el 10% de Takai a clientes en **suscripción** por sus reservas Takai-generadas (hoy el cron de statements solo cubre a los fundadores en modo comisión).

### Afiliados (Fase 7) — atribución cross-domain
`/reservar` y la landing `[slug]` propagan `source`/`ref` vía `sessionStorage`. `/api/admin/affiliates` (crea+token, rate ≤ 5%), `/api/affiliate/stats` + `/dashboard/afiliado`.

### Retargeting (Fase 8), Reseñas (Fase 9), GBP (Fase 11)
- `/api/cron/retargeting` (cohorte aniversario, opt-out + cap 90d) + `/api/email/unsubscribe` (HMAC, `lib/unsubscribe.ts`). En el orquestador `daily`.
- `/api/reviews` (público) + `/api/admin/reviews` (moderar) + `/resena/[booking_code]`. `solicitar-review` ahora apunta a nuestra página.
- `/api/tenant/gbp` + `/dashboard/google` (wizard). Reseñas Google opcionales tras `GOOGLE_PLACES_API_KEY`.

### Directorio B2C (Fases 4/5) — carpeta `directorio/`
Proyecto Next.js **separado** (dominio aparte, mantiene takai.cl B2B). Lee la misma BD Supabase, SSG/ISR, schema VacationRental, sitemap dinámico, robots, páginas de destino con contenido único. **Excluido del build de takai.cl** (`tsconfig` root `exclude: ["directorio"]`). Botón "Reservar" → `reservas.takai.cl/reservar?...&source=directory`. Requiere `npm install` + deploy aparte.

### Onboarding (Fase 10) — `lib/cabin-validation.ts`
`cabinPublishReadiness()` exige mínimos (8 fotos, geo 5+ decimales, etc.). `/api/admin/cabins/readiness`. El directorio sólo renderiza cabañas publicables → una cabaña completa aparece sola (sin código nuevo).
