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

Next.js 14 (App Router), TypeScript, Supabase PostgreSQL, Vercel, GitHub. **Sin Tailwind** — solo inline styles con objetos JS.

## Arquitectura multi-tenant

El `tenant_id` **siempre se obtiene dinámicamente desde la BD**, nunca hardcodeado en el código. El flujo de autenticación del panel:

```
token (URL) → SHA256 → dashboard_links.token_hash → tenant_id → todos los queries filtran por tenant_id
```

### Rutas principales

| URL | Archivo | Tipo | Descripción |
|-----|---------|------|-------------|
| `/?token=` | `app/page.tsx` | Server Component | Panel admin propietario |
| `/calendar?cabin_id=&token=` | `app/calendar/page.tsx` | Client Component | Calendario (solo elimina bloques) |
| `/reservar?cabin_id=&...` | `app/reservar/page.tsx` | Client Component | Formulario de reserva para turistas |
| `/[slug]` | `app/[slug]/page.tsx` | Client Component | Landing pública por tenant |
| `/inicio` | `app/inicio/page.tsx` | Client Component | Landing genérica |
| `/historial` | `app/historial/page.tsx` | Client Component | Historial de reservas del propietario |

### APIs

| Endpoint | Descripción |
|----------|-------------|
| `GET /api/dashboard` | Datos del panel: tenant, cabañas, reservas draft |
| `GET /api/calendar?cabin_id=` | Bloques con `has_booking` e `is_confirmed` |
| `POST /api/calendar/delete` | Elimina bloque (y todos del mismo booking si tiene booking_id) |
| `POST /api/bookings` | Crea reserva desde formulario turista (status `"draft"`) |
| `POST /api/bookings/manual` | Crea reserva desde panel propietario (status `"draft"`) |
| `POST /api/bookings/confirm` | status → `"confirmed"`, calendar_blocks.reason → `"system_booking"` |
| `POST /api/bookings/cancel` | Soft-delete booking + elimina calendar_blocks |
| `GET /api/availability` | Verifica disponibilidad, sugiere alternativas |
| `GET /api/tenant-by-cabin?cabin_id=` | Datos del tenant para el formulario turista |
| `GET /api/tenant/[slug]/cabins` | Cabañas + info del tenant por slug (landing pública) |
| `GET /api/historial?token=` | Historial completo incluyendo canceladas |
| `POST /api/mp/create-preference` | Crea preferencia de pago en Mercado Pago |
| `POST /api/mp/webhook` | Recibe confirmación de pago de Mercado Pago |
| `GET /api/mp/status?booking_id=` | Verifica si MP está habilitado para la reserva |
| `POST /api/emails/nueva-reserva` | Envía email al turista y al propietario |
| `POST /api/emails/reserva-confirmada` | Envía email de confirmación al turista |
| `POST /api/emails/recordatorio` | Envía recordatorio al turista |
| `GET /api/bookings/bank-info?booking_id=` | Datos bancarios del tenant (post-booking) |
| `GET /api/trinidad/cabins` | Legacy — usar `/api/tenant/[slug]/cabins` para nuevos casos |

## Schema de Supabase

**Verificar columnas aquí antes de escribir cualquier SELECT.** Una columna inexistente hace que Supabase devuelva error, lo que puede romper la autenticación completa del panel.

### `dashboard_links`
| Columna | Tipo | Notas |
|---------|------|-------|
| `id` | uuid | PK |
| `tenant_id` | uuid | FK a tenants |
| `token_hash` | text | SHA256 del token de acceso |
| `pin_hash` | text | Hash del PIN (no usado actualmente) |
| `active` | boolean | |
| `created_at` | timestamptz | |
| `last_used_at` | timestamptz | Se actualiza en cada login |

### `tenants`
| Columna | Tipo | Notas |
|---------|------|-------|
| `id` | uuid | PK |
| `business_name` | text | Nombre del negocio |
| `owner_name` | text | Nombre del propietario |
| `slug` | text | URL-friendly, único. Ej: "rukatraro" |
| `owner_whatsapp` | text | Número con código de país |
| `email_owner` | text | Email del propietario para notificaciones |
| `twilio_whatsapp` | text | Número Twilio asignado (legacy) |
| `deposit_percent` | int | % de anticipo. Default 20 |
| `min_nights` | int | Noches mínimas. Default 2 |
| `tinaja_price` | int | Precio tinaja por día en moneda local |
| `has_tinaja` | boolean | Si el tenant ofrece tinaja |
| `currency` | text | "CLP", "USD", "COP". Default "CLP" |
| `bank_name` | text | Nombre del banco |
| `bank_account_type` | text | "Cuenta corriente", "Cuenta vista", etc. |
| `bank_account_number` | text | Número de cuenta |
| `bank_account_holder` | text | Titular de la cuenta |
| `bank_rut` | text | RUT del titular |
| `mp_enabled` | boolean | Mercado Pago habilitado |
| `mp_access_token` | text | Token de acceso MP del tenant |
| `mp_webhook_secret` | text | Secret HMAC para verificar webhooks MP |
| `payment_provider` | text | "mp", "transfer", etc. |
| `dashboard_token` | text | Token en texto plano (para link de acceso en emails) |
| `active` | boolean | |
| `verified` | boolean | |
| `location_text` | text | Dirección legible |
| `location_maps_url` | text | Link a Google Maps |
| `tagline` | text | Descripción corta para SEO |
| `activities` | jsonb | Array de actividades |
| `page_rules` | jsonb | Reglas/normas de la cabaña |
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
| `cleaning_fee` | numeric | Tarifa de limpieza (no usado en cálculos aún) |
| `pricing_tiers` | jsonb | Array de `{min_guests, max_guests, price_per_night}` |
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
| `passenger_id` | uuid | FK a tabla passengers (legacy, puede ser null) |
| `booking_code` | text | Código legible. Formato: "RUK-ABC-1234" |
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
| `deleted_at` | timestamptz | Soft delete — null si activa |
| `deleted_by` | text | Quién canceló: "owner_panel", "system", etc. |
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
| `action` | text | "booking_created", "booking_confirmed", "booking_cancelled" |
| `entity_type` | text | "booking", "cabin", etc. |
| `entity_id` | uuid | ID del objeto afectado |
| `details` | jsonb | Datos adicionales del evento |
| `performed_by` | text | "owner_panel", "formulario_turista", "mercadopago_webhook", etc. |
| `created_at` | timestamptz | |

### `tenant_users`
| Columna | Tipo |
|---------|------|
| `tenant_id` | uuid |
| `user_id` | uuid |
| `role` | text |
| `created_at` | timestamptz |

## Valores de enum

- `bookings.status`: `"draft"` (pendiente de pago) o `"confirmed"` (pagada).
- `calendar_blocks.reason`: `"manual"` (bloque suelto o reserva manual sin confirmar), `"transfer_pending"` (reserva turista pendiente de transferencia), `"system_booking"` (reserva confirmada).
- `bookings.notes`: JSON string con claves: `nombre`, `whatsapp`, `codigo`, `notas`, `origen`, `tinaja`, `price_per_night`.
- `tenants.owner_name`: nombre del propietario. **No está en `dashboard_links`.**

## Comportamientos no obvios

**FullCalendar end exclusivo:** Con `allDay: true`, FullCalendar trata `end` como fecha exclusiva. El `end_date` de la DB es el día de checkout (primer día libre), que coincide con `check_out`. Al construir eventos: `new Date(e.end + "T12:00:00")` → `setDate(d + 1)` para que el bloque visual cubra el último día.

**parseNotes():** Maneja tres formatos según el origen: objeto JS (columna JSONB), JSON string (formulario manual/turista), o pipe-delimited (flujo chatbot legacy). No asumir el formato.

**Calendario del propietario:** Solo elimina bloques — `dateClick` está removido intencionalmente. Las reservas se crean únicamente desde "Nueva reserva manual" en el panel.

**Eliminación de bloques:** Al eliminar desde el calendario, si el bloque tiene `booking_id`, el endpoint `/api/calendar/delete` elimina todos los bloques con ese `booking_id`. Si `booking_id` es null, elimina solo ese bloque.

**Doble confirmación:** Si `extendedProps.isConfirmed === true`, el calendario muestra dos confirmaciones antes de eliminar para advertir que la reserva ya está pagada.

**Soft delete en bookings:** Las reservas canceladas no se eliminan físicamente. Usan `deleted_at` timestamp + `deleted_by` texto. Los queries activos siempre deben incluir `.is("deleted_at", null)`.

**Booking codes:** Se generan con `lib/booking-code.ts` usando el slug del tenant como prefijo. Rukatraro → `RUK-ABC-1234`. Siempre derivar el prefijo del slug del tenant, nunca hardcodearlo.

**Webhook MP — idempotencia:** El webhook puede llegar más de una vez. Siempre verificar `booking.status !== "confirmed"` antes de procesar para evitar duplicados.

**`/api/trinidad/cabins`:** Endpoint legacy para compatibilidad con el sitio web de Trinidad. Usar `/api/tenant/[slug]/cabins` para todos los casos nuevos.

## Paleta de colores

Sin Tailwind — todos los colores van en inline styles.

```
Fondo página:  #0d1a12    Nav:           #0a1510
Tarjeta:       #162618    Borde:         #2a3e28
Texto heading: #e8d5a3    Texto body:    #8a9e88
Verde acento:  #7ab87a    Rojo bloqueo:  #e63946
Verde confirm: #27ae60    Texto muted:   #5a7058
```

Tipografía: `Georgia, serif` para headings y montos, `sans-serif` para cuerpo y UI.
