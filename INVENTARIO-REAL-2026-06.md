# INVENTARIO REAL — Takai owner-dashboard — Junio 2026

Generado leyendo el código real. Ningún dato fue inventado ni extraído de memoria.

---

## 1. ÁRBOL COMPLETO DE ARCHIVOS

### Raíz del proyecto (archivos relevantes)
```
├── CLAUDE.md
├── CONTEXT.md
├── CONTINUIDAD-TAKAI-2026-04-14.md
├── ESTADO_SISTEMA.md
├── archivos_takai.txt
├── diagnostico.txt
├── todo_el_sistema.txt
├── fix_admin_api.js                127 líneas
├── _tmp_volver.txt
├── middleware.ts                    59 líneas
├── next.config.js                   18 líneas
├── next-env.d.ts                     4 líneas
├── package.json
├── tailwind.config.ts                6 líneas
├── postcss.config.mjs                8 líneas
├── tsconfig.json
├── vercel.json
```

### app/
```
app/
├── layout.tsx                       31 líneas
├── page.tsx                         38 líneas
├── globals.css                       3 líneas  ← tiene @tailwind (ver nota §8)
├── icon.svg
│
├── [slug]/
│   ├── layout.tsx                  ~20 líneas  (⚠ path con brackets, PowerShell no puede contar)
│   └── page.tsx                   ~350 líneas
│
├── admin/
│   └── page.tsx                     66 líneas
│
├── bienvenida/
│   └── [booking_code]/
│       └── page.tsx               ~170 líneas  (⚠ path con brackets)
│
├── calendar/
│   └── page.tsx                    351 líneas
│
├── embed/
│   └── [slug]/
│       └── calendario/
│           └── page.tsx            ~80 líneas  (⚠ path con brackets)
│
├── historial/
│   └── page.tsx                     26 líneas
│
├── pinilla/
│   └── page.tsx                      5 líneas
│
├── reservar/
│   ├── page.tsx                    631 líneas
│   ├── pago-exitoso/
│   │   └── page.tsx                 38 líneas
│   ├── pago-fallido/
│   │   └── page.tsx                 73 líneas
│   └── pago-pendiente/
│       └── page.tsx                209 líneas
│
└── components/
    ├── AdminDashboard.tsx         1193 líneas
    ├── AuditClient.tsx             190 líneas
    ├── BookingsList.tsx            175 líneas
    ├── CabinPhotos.tsx             169 líneas
    ├── ConditionalFooter.tsx        19 líneas
    ├── EmbedIframeSnippet.tsx      186 líneas
    ├── HistorialClient.tsx         194 líneas
    ├── HistorialPageClient.tsx     208 líneas
    ├── HomeDashboardClient.tsx     839 líneas
    ├── ManualBookingForm.tsx       194 líneas
    └── NewClientOnboarding.tsx     769 líneas
```

### app/api/
```
app/api/
├── admin/
│   ├── cabins/route.ts              61 líneas
│   ├── commissions/route.ts         31 líneas
│   ├── onboard/route.ts            219 líneas
│   ├── tenants/route.ts            124 líneas
│   └── tokens/route.ts              35 líneas
│
├── availability/route.ts            70 líneas
│
├── bookings/
│   ├── route.ts                    160 líneas
│   ├── bank-info/route.ts           55 líneas
│   ├── cancel/route.ts              98 líneas
│   ├── confirm/route.ts             92 líneas
│   └── manual/route.ts             122 líneas
│
├── cabins/
│   ├── photos/route.ts             101 líneas
│   ├── update/route.ts              56 líneas
│   └── update-price/route.ts        44 líneas
│
├── calendar/
│   ├── route.ts                    117 líneas
│   └── delete/route.ts              68 líneas
│
├── contact/route.ts                 37 líneas
│
├── cron/
│   ├── cancelar-pendientes/route.ts    90 líneas
│   └── recordatorio-transferencia/route.ts  75 líneas
│
├── dashboard/route.ts               87 líneas
│
├── emails/
│   ├── nueva-reserva/route.ts       85 líneas
│   ├── recordatorio/route.ts        67 líneas
│   ├── reserva-confirmada/route.ts  75 líneas
│   ├── resumen-semanal/route.ts    140 líneas
│   ├── resumen-semanal/preview/route.ts  22 líneas
│   └── solicitar-review/route.ts   119 líneas
│
├── embed/
│   └── [slug]/availability/route.ts  141 líneas  (⚠ path con brackets)
│
├── health/route.ts                 104 líneas
├── historial/route.ts               63 líneas
│
├── mp/
│   ├── create-preference/route.ts   85 líneas
│   ├── status/route.ts              40 líneas
│   └── webhook/route.ts            125 líneas
│
├── stats/route.ts                   54 líneas
│
├── tenant/
│   ├── [slug]/cabins/route.ts      ~50 líneas  (⚠ path con brackets)
│   └── guidebook/route.ts           40 líneas  (método PATCH)
│
├── tenant-by-cabin/route.ts         56 líneas
├── trinidad/cabins/route.ts         30 líneas
└── twilio/webhook/route.ts         112 líneas
```

### lib/
```
lib/
├── alertEmail.ts                    47 líneas
├── audit.ts                         30 líneas
├── booking-code.ts                  25 líneas
├── parse-notes.ts                   28 líneas
├── pricing.ts                       93 líneas
├── resend.ts                       424 líneas
├── supabase.ts                      11 líneas
├── takai-token.ts                   61 líneas
├── whatsapp.ts                      41 líneas
└── email-templates/
    └── resumen-semanal.ts          257 líneas
```

### supabase/migrations/
```
supabase/migrations/
├── 001_create_booking_atomic.sql
├── 002_enable_rls.sql
└── 003_transfer_flow.sql
```

### landing/
```
landing/
└── index.html   ← HTML estático standalone, fuera del routing de Next.js
```

---

## 2. RUTAS

### Páginas (app/**/page.tsx)

| Ruta URL | Archivo | Qué hace |
|---|---|---|
| `/?token=` | `app/page.tsx` | Server Component. Valida token SHA256, carga tenant, redirige al panel. |
| `/[slug]` | `app/[slug]/page.tsx` | Client Component. Landing pública del tenant con cabañas y botón de reserva. |
| `/admin?token=` | `app/admin/page.tsx` | Panel admin global protegido por `ADMIN_TOKEN`; muestra todos los tenants, reservas, audit log. |
| `/bienvenida/[booking_code]` | `app/bienvenida/[booking_code]/page.tsx` | Página de bienvenida al huésped: muestra guidebook (wifi, instrucciones, reglas) del tenant. |
| `/calendar?cabin_id=&token=` | `app/calendar/page.tsx` | Client Component. Calendario FullCalendar del propietario; solo elimina bloques. |
| `/embed/[slug]/calendario` | `app/embed/[slug]/calendario/page.tsx` | Client Component. Widget de disponibilidad embebible en iframes externos. |
| `/historial?token=` | `app/historial/page.tsx` | Historial completo de reservas del propietario incluyendo canceladas. |
| `/pinilla` | `app/pinilla/page.tsx` | Legacy: redirige a `/el-mirador`. |
| `/reservar?cabin_id=&...` | `app/reservar/page.tsx` | Formulario de reserva para turistas (flujo completo con cálculo de precio). |
| `/reservar/pago-exitoso` | `app/reservar/pago-exitoso/page.tsx` | Página de éxito post-pago MercadoPago. |
| `/reservar/pago-fallido` | `app/reservar/pago-fallido/page.tsx` | Página de error post-pago MercadoPago. |
| `/reservar/pago-pendiente` | `app/reservar/pago-pendiente/page.tsx` | Página de instrucciones para pago por transferencia; incluye countdown con `transfer_timeout_hours`. |

**⚠ DISCREPANCIA CON CLAUDE.md**: La ruta `/inicio` aparece documentada en CLAUDE.md pero el archivo `app/inicio/page.tsx` **NO EXISTE** en el repositorio.

### APIs (app/api/**/route.ts)

| Endpoint | Método | Qué hace |
|---|---|---|
| `GET /api/dashboard` | GET | Datos del panel: tenant, cabañas, reservas draft. Requiere token en query. |
| `GET /api/calendar` | GET | Bloques del calendario con `has_booking` e `is_confirmed`. |
| `POST /api/calendar` | POST | Crea bloque manual en el calendario. |
| `POST /api/calendar/delete` | POST | Elimina bloque; si tiene `booking_id`, elimina todos del mismo booking. |
| `POST /api/bookings` | POST | Crea reserva desde formulario turista (status `"draft"`). |
| `POST /api/bookings/manual` | POST | Crea reserva desde panel propietario (status `"draft"`). |
| `POST /api/bookings/confirm` | POST | Confirma reserva: status → `"confirmed"`, calendar_blocks.reason → `"system_booking"`. |
| `POST /api/bookings/cancel` | POST | Soft-delete de reserva + elimina calendar_blocks. |
| `GET /api/bookings/bank-info` | GET | Datos bancarios del tenant dado un `booking_id`. |
| `GET /api/availability` | GET | Verifica disponibilidad de fechas; sugiere alternativas. |
| `GET /api/historial` | GET | Historial completo incluyendo reservas canceladas. |
| `GET /api/stats` | GET | Estadísticas de ingresos por mes (últimos 12 meses), para gráficos Recharts. |
| `PATCH /api/tenant/guidebook` | PATCH | Actualiza `guidebook` y/o `google_review_url` del tenant. |
| `GET /api/tenant/[slug]/cabins` | GET | Cabañas + info del tenant por slug (para landing pública). |
| `GET /api/tenant-by-cabin` | GET | Datos del tenant dado un `cabin_id` (para formulario turista). |
| `GET /api/embed/[slug]/availability` | GET | Disponibilidad de cabañas en ventana de 3 meses; para widget embebible. |
| `POST /api/mp/create-preference` | POST | Crea preferencia de pago en MercadoPago usando `mp_access_token` del tenant. |
| `POST /api/mp/webhook` | POST | Recibe confirmación de pago de MP; verifica firma HMAC con `mp_webhook_secret`. |
| `GET /api/mp/status` | GET | Verifica si MP está habilitado para una reserva. |
| `POST /api/emails/nueva-reserva` | POST | Envía email al turista y al propietario cuando hay nueva reserva. |
| `POST /api/emails/reserva-confirmada` | POST | Envía email de confirmación al turista. |
| `POST /api/emails/recordatorio` | POST | Cron: envía recordatorio de check-in próximo. |
| `GET /api/emails/resumen-semanal` | GET | Cron: envía resumen semanal de reservas a propietarios. |
| `GET /api/emails/resumen-semanal/preview` | GET | Preview de email resumen-semanal (desarrollo). |
| `POST /api/emails/solicitar-review` | POST | Cron: solicita reseña a turistas con check-out reciente. |
| `PATCH /api/cabins/update` | PATCH | Actualiza campos de una cabaña (description, capacity, cleaning_fee, season_prices). |
| `PATCH /api/cabins/update-price` | PATCH | Actualiza precio base de una cabaña. |
| `POST /api/cabins/photos` | POST | Sube foto a Supabase Storage; también elimina fotos (DELETE). |
| `POST /api/cron/cancelar-pendientes` | POST | Cron: cancela reservas draft que superaron `transfer_timeout_hours`. |
| `POST /api/cron/recordatorio-transferencia` | POST | Cron: envía WhatsApp recordatorio a turistas que no han enviado comprobante. |
| `POST /api/twilio/webhook` | POST | Recibe mensajes WhatsApp entrantes; reconoce booking codes para marcar `transfer_proof_received_at`. |
| `GET /api/health` | GET | Verifica DB, cabañas activas por tenant, dashboard_links activos; envía alerta por email si falla. |
| `POST /api/contact` | POST | Recibe formulario de contacto de la landing y envía email a contacto@takai.cl. |
| `GET /api/admin/tenants` | GET/PATCH/DELETE | CRUD de tenants (protegido por ADMIN_TOKEN). |
| `GET /api/admin/cabins` | GET/POST/DELETE | CRUD de cabañas (protegido por ADMIN_TOKEN). |
| `POST /api/admin/onboard` | POST | Onboarding: crea tenant + cabañas + dashboard_link en una operación. |
| `GET /api/admin/tokens` | GET/POST | Gestiona dashboard_links de un tenant. |
| `PATCH /api/admin/commissions` | PATCH | Actualiza estado de comisiones en reservas. |
| `GET /api/trinidad/cabins` | GET | **Legacy**: cabañas del tenant "trinidad". Usar `/api/tenant/[slug]/cabins`. |

---

## 3. CRONS (vercel.json)

| Endpoint | Schedule (UTC) | Descripción |
|---|---|---|
| `POST /api/emails/recordatorio` | `0 13 * * *` | Diario a las 13:00 UTC. Recordatorio de check-in próximo al turista. |
| `GET /api/health` | `0 8 * * *` | Diario a las 08:00 UTC. Health check de DB + tenants + links. |
| `GET /api/emails/resumen-semanal` | `0 10 * * 1` | Lunes a las 10:00 UTC. Resumen semanal de reservas al propietario. |
| `POST /api/emails/solicitar-review` | `0 14 * * *` | Diario a las 14:00 UTC. Solicitud de reseña a turistas post check-out. |
| `POST /api/cron/cancelar-pendientes` | `0 * * * *` | Cada hora en punto. Cancela reservas draft vencidas según `transfer_timeout_hours`. |
| `POST /api/cron/recordatorio-transferencia` | `30 * * * *` | Cada hora a los :30. WhatsApp a turistas que no enviaron comprobante de transferencia. |

---

## 4. BASE DE DATOS — TABLAS Y COLUMNAS REALMENTE REFERENCIADAS

### Tablas que el código consulta con `.from()`
`tenants`, `cabins`, `bookings`, `calendar_blocks`, `dashboard_links`, `audit_log`

**`tenant_users`**: aparece en CLAUDE.md pero **nunca se usa en `.from()`** en ningún archivo del código.

---

### `tenants` — columnas referenciadas en el código

| Columna | Fuente | En CLAUDE.md |
|---|---|---|
| `id` | múltiples | ✅ |
| `business_name` | múltiples | ✅ |
| `owner_name` | múltiples | ✅ |
| `slug` | múltiples | ✅ |
| `owner_whatsapp` | múltiples | ✅ |
| `email_owner` | múltiples | ✅ |
| `email_owner_2` | `admin/page.tsx` select | ❌ No en CLAUDE.md |
| `gender` | `admin/page.tsx` select | ❌ No en CLAUDE.md |
| `country` | `admin/page.tsx`, templates email | ❌ No en CLAUDE.md |
| `whatsapp_enabled` | `admin/page.tsx` select | ❌ No en CLAUDE.md |
| `latitude` | `admin/page.tsx` select | ❌ No en CLAUDE.md |
| `longitude` | `admin/page.tsx` select | ❌ No en CLAUDE.md |
| `extra_services` | `admin/page.tsx` select | ❌ No en CLAUDE.md |
| `guidebook` | `bienvenida/page.tsx`, `tenant/guidebook` | ❌ No en CLAUDE.md |
| `google_review_url` | `tenant/guidebook`, `HomeDashboardClient` | ❌ No en CLAUDE.md |
| `transfer_timeout_hours` | migración 003, `cron/cancelar-pendientes`, `pago-pendiente/page.tsx` | ❌ No en CLAUDE.md |
| `deposit_percent` | múltiples | ✅ |
| `min_nights` | múltiples | ✅ |
| `tinaja_price` | múltiples | ✅ |
| `has_tinaja` | múltiples | ✅ |
| `currency` | múltiples | ✅ |
| `bank_name` | múltiples | ✅ |
| `bank_account_type` | múltiples | ✅ |
| `bank_account_number` | múltiples | ✅ |
| `bank_account_holder` | múltiples | ✅ |
| `bank_rut` | múltiples | ✅ |
| `mp_enabled` | múltiples | ✅ |
| `mp_access_token` | `mp/create-preference`, `mp/webhook` | ✅ |
| `mp_webhook_secret` | `mp/webhook` | ✅ |
| `payment_provider` | múltiples | ✅ |
| `dashboard_token` | `mp/webhook`, `bookings/manual` | ✅ |
| `active` | múltiples | ✅ |
| `verified` | admin | ✅ |
| `location_text` | múltiples | ✅ |
| `location_maps_url` | múltiples | ✅ |
| `tagline` | múltiples | ✅ |
| `activities` | múltiples | ✅ |
| `page_rules` | múltiples | ✅ |
| `facebook_url` | múltiples | ✅ |
| `instagram_url` | múltiples | ✅ |
| `twilio_whatsapp` | `whatsapp.ts` | ✅ (mencionado como "legacy") |
| `created_at` | múltiples | ✅ |

### `cabins` — columnas referenciadas

| Columna | Fuente | En CLAUDE.md |
|---|---|---|
| `id` | múltiples | ✅ |
| `tenant_id` | múltiples | ✅ |
| `name` | múltiples | ✅ |
| `capacity` | múltiples | ✅ |
| `base_price_night` | múltiples | ✅ |
| `extra_person_price` | múltiples | ✅ |
| `cleaning_fee` | múltiples | ✅ |
| `pricing_tiers` | `availability`, `reservar/page` | ✅ |
| `season_prices` | `availability`, `pricing.ts`, `cabins/update` | ❌ No en CLAUDE.md |
| `photos` | múltiples | ✅ |
| `description` | múltiples | ✅ |
| `amenities` | múltiples | ✅ |
| `extras` | múltiples | ✅ |
| `active` | múltiples | ✅ |
| `created_at` | múltiples | ✅ |
| `updated_at` | múltiples | ✅ |

### `bookings` — columnas referenciadas

| Columna | Fuente | En CLAUDE.md |
|---|---|---|
| `id` | múltiples | ✅ |
| `tenant_id` | múltiples | ✅ |
| `cabin_id` | múltiples | ✅ |
| `booking_code` | múltiples | ✅ |
| `guest_name` | múltiples | ✅ |
| `guest_email` | múltiples | ✅ |
| `guest_phone` | múltiples | ✅ |
| `check_in` | múltiples | ✅ |
| `check_out` | múltiples | ✅ |
| `guests` | múltiples | ✅ |
| `nights` | múltiples | ✅ |
| `subtotal_amount` | múltiples | ✅ |
| `total_amount` | múltiples | ✅ |
| `deposit_percent` | múltiples | ✅ |
| `deposit_amount` | múltiples | ✅ |
| `balance_amount` | múltiples | ✅ |
| `tinaja_amount` | múltiples | ✅ |
| `status` | múltiples | ✅ |
| `notes` | múltiples | ✅ |
| `commission_percent` | múltiples | ✅ |
| `commission_amount` | múltiples | ✅ |
| `commission_status` | múltiples | ✅ |
| `transfer_proof_received_at` | migración 003, `twilio/webhook`, `cron/cancelar-pendientes` | ❌ No en CLAUDE.md |
| `reminder_sent_at` | migración 003, `cron/recordatorio-transferencia` | ❌ No en CLAUDE.md |
| `deleted_at` | múltiples | ✅ |
| `deleted_by` | múltiples | ✅ |
| `created_at` | múltiples | ✅ |
| `updated_at` | múltiples | ✅ |

### `calendar_blocks` — columnas referenciadas
`id`, `tenant_id`, `cabin_id`, `start_date`, `end_date`, `reason`, `booking_id`, `created_at` — todas en CLAUDE.md.

### `dashboard_links` — columnas referenciadas
`id`, `tenant_id`, `token_hash`, `pin_hash` (NO encontrado en código), `active`, `created_at`, `last_used_at` — todas en CLAUDE.md.

### `audit_log` — columnas referenciadas
`id`, `tenant_id`, `cabin_id`, `action`, `entity_type`, `entity_id`, `details`, `performed_by`, `created_at` — todas en CLAUDE.md.

---

## 5. VARIABLES DE ENTORNO

### Comparación código vs `.env.example`

| Variable | Usada en código | En .env.example | Notas |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ múltiples archivos | ✅ | |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ `lib/supabase.ts` | ✅ | Solo usada en el cliente público |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ 42 archivos | ✅ | |
| `RESEND_API_KEY` | ✅ `lib/resend.ts`, `api/contact` | ✅ | |
| `ADMIN_TOKEN` | ✅ `app/admin`, `api/admin/*` | ✅ | |
| `CRON_SECRET` | ✅ múltiples cron endpoints | ✅ | |
| `NEXT_PUBLIC_APP_URL` | ✅ `lib/resend.ts`, varios | ✅ | Default `https://panel.takai.cl` |
| `NEXT_PUBLIC_RESERVAS_URL` | ✅ `cron/cancelar-pendientes`, `bookings/confirm`, `emails/reserva-confirmada` | ✅ | |
| `TWILIO_ACCOUNT_SID` | ✅ `lib/whatsapp.ts` | ✅ | |
| `TWILIO_AUTH_TOKEN` | ✅ `lib/whatsapp.ts` | ✅ | |
| `TWILIO_WHATSAPP_FROM` | ✅ `lib/whatsapp.ts`, `cron/recordatorio-transferencia`, `bookings/bank-info` | ✅ | |
| `HEALTH_CHECK_KEY` | ✅ `api/health/route.ts` | ❌ **FALTA en .env.example** | Autenticación alternativa del health endpoint |

**Resumen**: 11 variables documentadas, 1 faltante (`HEALTH_CHECK_KEY`).

---

## 6. SEGURIDAD

### SUPABASE_SERVICE_ROLE_KEY
- **42 archivos** la usan (prácticamente todas las rutas API y algunas páginas server-side).
- Todos los clientes Supabase del servidor se crean con esta clave, que bypassa RLS por diseño.
- La clave pública (`NEXT_PUBLIC_SUPABASE_ANON_KEY`) solo se usa en `lib/supabase.ts` (no parece usarse directamente en ninguna API route).

### RLS (Row Level Security)
- **Activado** en migración `002_enable_rls.sql` sobre 6 tablas:
  `tenants`, `cabins`, `bookings`, `calendar_blocks`, `dashboard_links`, `audit_log`.
- **Sin políticas explícitas** → default-deny para el ANON_KEY. El SERVICE_ROLE_KEY bypassa RLS.
- La migración está en el repo pero NO hay certeza de que esté aplicada en producción (no verificable desde el código).

### Autenticación de endpoints
- **Propietario**: token SHA256 → `dashboard_links.token_hash`
- **Admin**: `ADMIN_TOKEN` en query param (¡plaintext en URL!)
- **Crons de Vercel**: `Authorization: Bearer CRON_SECRET`
- **Health**: `HEALTH_CHECK_KEY` en header o query, o `CRON_SECRET` como Bearer
- **MP webhook**: firma HMAC-SHA256 con `mp_webhook_secret` por tenant
- **Twilio webhook**: sin verificación de firma (⚠ riesgo — Twilio recomienda validar `X-Twilio-Signature`)

---

## 7. ARCHIVOS MUERTOS O DUPLICADOS

Candidatos a eliminar (ninguno es importado por el código de Next.js):

| Archivo | Tipo | Justificación |
|---|---|---|
| `diagnostico.txt` | Snapshot de diagnóstico | Archivo de texto, no usado por la app |
| `todo_el_sistema.txt` | Snapshot del sistema | Archivo de texto, no usado por la app |
| `archivos_takai.txt` | Lista de archivos | Snapshot, redundante con `git ls-files` |
| `ESTADO_SISTEMA.md` | Documento de estado | Snapshot congelado, no se actualiza |
| `CONTINUIDAD-TAKAI-2026-04-14.md` | Documento de continuidad | De abril 2026, ya obsoleto |
| `CONTEXT.md` | Contexto de proyecto | Posiblemente duplica CLAUDE.md |
| `_tmp_volver.txt` | Temporal | Nombre indica archivo temporal |
| `fix_admin_api.js` | Script ad-hoc (127 líneas) | Script de fix puntual; lógica duplicada en las API routes actuales |
| `landing/index.html` | HTML standalone | Fuera del routing de Next.js; no claro si se sirve desde algún lugar |

**Total recomendado borrar**: 9 archivos/carpeta.

**No borrar**:
- `claude-webkit/` — Es un submodule o toolkit de Claude con skills, no código de la app pero podría ser intencional.
- `.cursorrules/` — Configuración del editor.
- `tailwind.config.ts` / `postcss.config.mjs` — Ver nota en §8.

---

## 8. INTEGRACIONES — CONFIRMADO LEYENDO EL CÓDIGO

### MercadoPago ✅ Conectado
- **Paquete**: `mercadopago@^2.12.0` (npm)
- **Clases usadas**: `MercadoPagoConfig`, `Payment`, `Preference`
- **Flujo**:
  1. `/api/mp/create-preference` — crea preferencia con `mp_access_token` del tenant
  2. MP redirige a `/reservar/pago-exitoso|pago-fallido|pago-pendiente`
  3. `/api/mp/webhook` — recibe confirmación; verifica HMAC-SHA256 con `mp_webhook_secret` del tenant; confirma booking si `payment.status === "approved"`
- **Por tenant**: cada tenant tiene su propio `mp_access_token` y `mp_webhook_secret`
- **Idempotencia**: verifica `booking.status !== "confirmed"` antes de procesar

### Twilio / WhatsApp ✅ Conectado (sin SDK, REST directo)
- **Paquete**: ninguno — llama la API REST de Twilio directamente con `fetch`
- **Envío (outbound)** vía `lib/whatsapp.ts`:
  - Verifica `tenant.twilio_whatsapp` (número Twilio del tenant) en DB antes de enviar
  - Usa autenticación Basic (`TWILIO_ACCOUNT_SID:TWILIO_AUTH_TOKEN`)
  - From: `TWILIO_WHATSAPP_FROM` (número Twilio compartido del sistema)
- **Recepción (inbound)** vía `/api/twilio/webhook`:
  - Recibe mensajes WhatsApp de turistas (form-urlencoded)
  - Reconoce booking codes con regex `/\b([A-Z]{2,5}-[A-Z]{3}-\d{4})\b/i`
  - Actualiza `transfer_proof_received_at` en la reserva correspondiente
  - ⚠ **Sin verificación de firma `X-Twilio-Signature`** — endpoint abierto

### Resend ✅ Conectado
- **Paquete**: `resend@^6.10.0` (npm)
- **From**: `notificaciones@takai.cl`
- **Templates en código** (HTML inline en `lib/resend.ts`, 424 líneas):
  - `nueva-reserva` — al turista y al propietario
  - `reserva-confirmada` — al turista (incluye link a `/bienvenida/[booking_code]`)
  - `recordatorio` — check-in próximo al turista
  - `resumen-semanal` — resumen a propietarios (template separado en `lib/email-templates/resumen-semanal.ts`)
  - `solicitar-review` — pedido de reseña post check-out
- **Alertas internas** vía `lib/alertEmail.ts`: envía a `contacto@takai.cl` cuando falla el health check

### FullCalendar ✅ Conectado
- **Paquetes**: `@fullcalendar/core`, `@fullcalendar/daygrid`, `@fullcalendar/interaction`, `@fullcalendar/react` — todos `^6.1.20`
- **Usado en**: `app/calendar/page.tsx` (351 líneas)
- **Modo**: `allDay: true` — end exclusivo (día de checkout = primer día libre)
- **`dateClick` removido intencionalmente** — solo elimina bloques, no crea
- **También en**: `app/embed/[slug]/calendario/page.tsx` (widget embebible)

### Recharts ✅ Presente (no documentado en CLAUDE.md)
- **Paquete**: `recharts@^3.8.1` (npm)
- **Usado en**: `app/components/HomeDashboardClient.tsx` para gráficos de estadísticas de ingresos
- **Datos**: `/api/stats` retorna ingresos por mes de los últimos 12 meses

### @vercel/analytics ✅ Presente (no documentado en CLAUDE.md)
- **Paquete**: `@vercel/analytics@^2.0.1`
- **Usado en**: `app/layout.tsx` (inferido — está en dependencies)

---

## NOTA SOBRE TAILWIND

`app/globals.css` contiene `@tailwind base; @tailwind components; @tailwind utilities;` y el paquete `tailwindcss@^3.4.17` está en devDependencies. Esto **contradice** CLAUDE.md que dice "Sin Tailwind". En la práctica ningún componente `.tsx` usa clases de Tailwind — todos usan inline styles con objetos JS. El CSS de Tailwind se importa vía globals.css pero los componentes no lo usan. Es código inerte que aumenta el bundle de CSS sin efecto práctico.
