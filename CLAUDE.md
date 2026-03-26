# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # desarrollo local
npm run build    # build de producción (corre TypeScript + lint)
npm run start    # servidor producción local
```

El deploy es automático en Vercel al hacer `git push origin main`. Siempre verificar que `npm run build` pase localmente antes de hacer push — los errores de TypeScript rompen el build en Vercel.

## Arquitectura

**Stack:** Next.js 14.2.35 (App Router), TypeScript, Supabase (Postgres), FullCalendar 6, Vercel.

**Multi-tenant:** El sistema sirve a múltiples propietarios de cabañas. Cada propietario accede con un token único que se valida contra `dashboard_links` → `tenant_id` → datos filtrados por ese `tenant_id`.

### Flujo de autenticación del panel (app/page.tsx)
```
token (URL) → SHA256 → dashboard_links.token_hash → tenant_id → datos del tenant
```
El nombre del propietario está en `tenants.owner_name`, NO en `dashboard_links`.

### Rutas principales
| URL | Archivo | Descripción |
|-----|---------|-------------|
| `/?token=` | `app/page.tsx` | Panel admin (Server Component) |
| `/calendar?cabin_id=&token=` | `app/calendar/page.tsx` | Calendario (Client Component, solo elimina) |
| `/reservar?cabin_id=&...` | `app/reservar/page.tsx` | Formulario turistas (Client Component) |
| `/inicio` | `app/inicio/page.tsx` | Landing pública |

### APIs importantes
- `GET /api/calendar?cabin_id=` — devuelve bloques con `has_booking` e `is_confirmed`
- `POST /api/calendar/delete` — si el bloque tiene `booking_id`, elimina todos los bloques del mismo booking
- `POST /api/bookings/confirm` — cambia status a `"confirmed"`, calendar_blocks.reason → `"system_booking"`
- `POST /api/bookings/cancel` — elimina booking + todos sus calendar_blocks
- `POST /api/bookings/manual` — crea booking + calendar_block desde el formulario del propietario
- `GET /api/availability` — tiene `TENANT_ID` hardcodeado (pendiente de hacer dinámico)

## Schema de Supabase (columnas reales)

**Antes de agregar cualquier columna a un SELECT, verificar aquí.** Supabase devuelve error silencioso en columnas inexistentes que puede romper auth.

| Tabla | Columnas clave |
|-------|---------------|
| `dashboard_links` | `id`, `tenant_id`, `token_hash`, `pin_hash`, `active`, `created_at`, `last_used_at` |
| `tenants` | `id`, `business_name`, `owner_name`, `owner_whatsapp`, `deposit_percent`, `currency` |
| `cabins` | `id`, `tenant_id`, `name`, `capacity`, `base_price_night`, `cleaning_fee`, `active` |
| `bookings` | `id`, `tenant_id`, `cabin_id`, `check_in`, `check_out`, `guests`, `status`, `nights`, `subtotal_amount`, `total_amount`, `deposit_percent`, `deposit_amount`, `balance_amount`, `notes`, `commission_percent`, `commission_amount`, `commission_status` |
| `calendar_blocks` | `id`, `tenant_id`, `cabin_id`, `start_date`, `end_date`, `reason`, `booking_id`, `created_at` |
| `audit_log` | `id`, `tenant_id`, `cabin_id`, `action`, `entity_type`, `entity_id`, `details`, `performed_by`, `created_at` |

**Valores importantes:**
- `bookings.status`: `"draft"` (pendiente pago) | `"confirmed"` (pagada)
- `calendar_blocks.reason`: `"manual"` | `"transfer_pending"` | `"system_booking"`
- `calendar_blocks.booking_id`: `null` si es bloque manual suelto (creado por click en calendario)
- `bookings.notes`: JSON string con claves lowercase: `nombre`, `whatsapp`, `codigo`, `notas`, `origen`, `tinaja`

## Comportamientos críticos

**FullCalendar end date:** El calendario usa `allDay: true`. FullCalendar trata el `end` como exclusivo. Los bloques de la DB tienen `end_date = último día ocupado`, entonces al construir el evento hay que hacer `end_date + 1 día`.

**parseNotes():** La función en `BookingsList.tsx` maneja tres formatos: objeto JS (JSONB), JSON string, y pipe-delimited. No asumir el formato.

**Calendario solo-lectura:** El calendario del propietario (`/calendar`) NO agrega reservas (dateClick removido). Las reservas se crean únicamente desde el botón "Nueva reserva manual" en el panel.

**Confirmación doble al eliminar:** Si `extendedProps.isConfirmed === true` (bloque de reserva pagada), el calendario pide dos confirmaciones antes de eliminar.

## Paleta de colores

```
Fondo página:  #0d1a12    Nav:           #0a1510
Tarjeta:       #162618    Borde:         #2a3e28
Texto heading: #e8d5a3    Texto body:    #8a9e88
Verde acento:  #7ab87a    Rojo bloqueo:  #e63946
Verde confirm: #27ae60    Texto muted:   #5a7058
```
Tipografía: `Georgia, serif` para títulos/números, `sans-serif` para cuerpo.
