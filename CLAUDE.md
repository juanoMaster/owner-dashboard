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

`/api/availability` tiene `TENANT_ID` hardcodeado — bug conocido pendiente de corregir.

### Rutas principales

| URL | Archivo | Tipo | Descripción |
|-----|---------|------|-------------|
| `/?token=` | `app/page.tsx` | Server Component | Panel admin |
| `/calendar?cabin_id=&token=` | `app/calendar/page.tsx` | Client Component | Calendario (solo elimina bloques) |
| `/reservar?cabin_id=&...` | `app/reservar/page.tsx` | Client Component | Formulario de reserva para turistas |
| `/inicio` | `app/inicio/page.tsx` | Client Component | Landing pública |

### APIs

- `GET /api/calendar?cabin_id=` — bloques con `has_booking` e `is_confirmed` (verifica `bookings.status`)
- `POST /api/calendar/delete` — si el bloque tiene `booking_id`, elimina todos los bloques del mismo booking de una sola vez
- `POST /api/bookings/confirm` — status → `"confirmed"`, calendar_blocks.reason → `"system_booking"`
- `POST /api/bookings/cancel` — elimina booking + todos sus calendar_blocks
- `POST /api/bookings/manual` — crea booking (status `"draft"`) + calendar_block desde el panel del propietario
- `GET /api/availability` — verifica disponibilidad para el formulario de turistas

## Schema de Supabase

**Verificar columnas aquí antes de escribir cualquier SELECT.** Una columna inexistente hace que Supabase devuelva error, lo que puede romper la autenticación completa del panel.

| Tabla | Columnas |
|-------|----------|
| `dashboard_links` | `id`, `tenant_id`, `token_hash`, `pin_hash`, `active`, `created_at`, `last_used_at` |
| `tenants` | `id`, `business_name`, `owner_name`, `owner_whatsapp`, `twilio_whatsapp`, `deposit_percent`, `active`, `currency`, `payment_provider`, `mp_access_token`, `mp_webhook_secret`, `dashboard_token`, `created_at` |
| `cabins` | `id`, `tenant_id`, `name`, `capacity`, `base_price_night`, `cleaning_fee`, `active`, `created_at`, `updated_at` |
| `bookings` | `id`, `tenant_id`, `cabin_id`, `passenger_id`, `check_in`, `check_out`, `guests`, `status`, `nights`, `subtotal_amount`, `total_amount`, `deposit_percent`, `deposit_amount`, `balance_amount`, `notes`, `commission_percent`, `commission_amount`, `commission_status`, `created_at`, `updated_at` |
| `calendar_blocks` | `id`, `tenant_id`, `cabin_id`, `start_date`, `end_date`, `reason`, `booking_id`, `created_at` |
| `audit_log` | `id`, `tenant_id`, `cabin_id`, `action`, `entity_type`, `entity_id`, `details`, `performed_by`, `created_at` |
| `tenant_users` | `tenant_id`, `user_id`, `role`, `created_at` |

### Valores de enum

- `bookings.status`: solo `"draft"` o `"confirmed"`. Draft = pendiente de pago, confirmed = pagada.
- `calendar_blocks.reason`: solo `"manual"`, `"system_booking"`, o `"transfer_pending"`.
- `calendar_blocks`: usa `start_date` y `end_date` (no `date`, no `status`).
- `calendar_blocks.booking_id`: `null` para bloques manuales sueltos (click en calendario), tiene valor si viene de una reserva.
- `bookings.notes`: JSON string (columna text) con claves lowercase: `nombre`, `whatsapp`, `codigo`, `notas`, `origen`, `tinaja`.
- `tenants.owner_name`: nombre del propietario. **No está en `dashboard_links`.**

## Comportamientos no obvios

**FullCalendar end exclusivo:** Con `allDay: true`, FullCalendar trata `end` como fecha exclusiva. El `end_date` de la DB es el último día ocupado, por lo que al construir eventos hay que sumar 1 día: `new Date(e.end + "T12:00:00")` → `setDate(d + 1)`.

**parseNotes():** Maneja tres formatos según el origen: objeto JS (columna JSONB), JSON string (formulario manual), o pipe-delimited (flujo chatbot). No asumir el formato.

**Calendario del propietario:** Solo elimina bloques — `dateClick` está removido intencionalmente. Las reservas se crean únicamente desde "Nueva reserva manual" en el panel.

**Eliminación de bloques:** Al eliminar desde el calendario, si el bloque tiene `booking_id`, el endpoint `/api/calendar/delete` elimina todos los bloques con ese `booking_id` (un booking puede tener varios bloques). Si `booking_id` es null, elimina solo ese bloque.

**Doble confirmación:** Si `extendedProps.isConfirmed === true`, el calendario muestra dos confirmaciones antes de eliminar para advertir que la reserva ya está pagada.

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
