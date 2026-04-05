# ESTADO DEL SISTEMA — Takai.cl Owner Dashboard
**Última actualización:** 2026-04-05

---

## 1. Qué es este sistema

SaaS multi-tenant de reservas para cabañas en Chile. Este repositorio es el **owner-dashboard**: el panel que cada propietario usa para gestionar reservas y calendario. Cada propietario es un tenant independiente con su propio `tenant_id`. El código no cambia entre clientes — solo los datos en Supabase.

Para agregar un nuevo cliente: insertar registros en `tenants`, `cabins`, y `dashboard_links`.

---

## 2. Stack técnico

| Capa | Tecnología |
|------|-----------|
| Framework | Next.js 14 (App Router) |
| Lenguaje | TypeScript |
| Base de datos | Supabase PostgreSQL |
| Email | Resend |
| Calendario (UI) | FullCalendar v6.1.20 |
| Hosting | Vercel (auto-deploy desde `main`) |
| Estilos | Inline styles con objetos JS (sin Tailwind) |

---

## 3. Variables de entorno requeridas

| Variable | Tipo | Uso |
|----------|------|-----|
| `NEXT_PUBLIC_SUPABASE_URL` | Pública | URL del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Pública | Clave anónima Supabase (cliente) |
| `NEXT_PUBLIC_APP_URL` | Pública | URL base de la app (fallback: `https://owner-dashboard-navy.vercel.app`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Secreta | Acceso total a BD (solo server) |
| `RESEND_API_KEY` | Secreta | Envío de emails |
| `ADMIN_TOKEN` | Secreta | Protege rutas `/api/admin/*` y `/admin` |
| `CRON_SECRET` | Secreta | Verifica Vercel Cron Jobs (Bearer token) |

---

## 4. Estructura de archivos

```
owner-dashboard/
├── app/
│   ├── page.tsx                         # Panel principal del propietario
│   ├── layout.tsx                       # Layout global
│   ├── [slug]/page.tsx                  # Landing pública dinámica por tenant
│   ├── calendar/page.tsx                # Calendario FullCalendar (owner)
│   ├── reservar/page.tsx                # Formulario reserva turistas (4 pasos)
│   ├── historial/page.tsx               # Historial completo de reservas
│   ├── inicio/page.tsx                  # Redirige a /rukatraro
│   ├── admin/page.tsx                   # Panel admin (protegido con ADMIN_TOKEN)
│   ├── components/
│   │   ├── BookingsList.tsx             # Lista de reservas pendientes
│   │   ├── ManualBookingForm.tsx        # Modal crear reserva manual
│   │   ├── HistorialClient.tsx          # Tabla historial con filtros y CSV
│   │   ├── AdminDashboard.tsx           # Dashboard admin con tabs
│   │   └── AuditClient.tsx             # Visor de audit_log
│   └── api/
│       ├── calendar/route.ts            # GET: bloques, POST: crear bloque manual
│       ├── calendar/delete/route.ts     # POST: eliminar bloque o booking
│       ├── bookings/route.ts            # POST: nueva reserva desde turista
│       ├── bookings/confirm/route.ts    # POST: confirmar pago
│       ├── bookings/cancel/route.ts     # POST: cancelar reserva
│       ├── bookings/manual/route.ts     # POST: reserva manual desde panel owner
│       ├── availability/route.ts        # GET: verificar disponibilidad
│       ├── dashboard/route.ts           # GET: cabañas del tenant por token
│       ├── tenant-by-cabin/route.ts     # GET: info del tenant por cabin_id
│       ├── tenant/[slug]/cabins/route.ts# GET: cabañas públicas por slug
│       ├── ical/[cabinId]/route.ts      # GET: exportar calendario en iCal
│       ├── emails/nueva-reserva/route.ts
│       ├── emails/reserva-confirmada/route.ts
│       ├── emails/recordatorio/route.ts # Cron diario 10:00 UTC
│       ├── contact/route.ts             # POST: formulario de contacto
│       ├── admin/tokens/route.ts        # POST: CRUD tokens de acceso
│       ├── admin/tenants/route.ts       # POST: CRUD tenants
│       ├── admin/cabins/route.ts        # POST: CRUD cabañas
│       └── trinidad/cabins/route.ts     # GET: cabañas hardcodeadas (demo)
├── lib/
│   ├── supabase.ts                      # Cliente Supabase anónimo (uso en cliente)
│   ├── audit.ts                         # logAudit()
│   └── resend.ts                        # Cliente Resend + templates HTML
├── CLAUDE.md
├── ESTADO_SISTEMA.md                    # Este archivo
├── next.config.js
├── package.json
└── .env.local
```

---

## 5. Páginas

| URL | Archivo | Tipo | Descripción |
|-----|---------|------|-------------|
| `/?token=XXX` | `app/page.tsx` | Server Component | Panel propietario: bienvenida, reservas pendientes, crear reserva manual |
| `/calendar?cabin_id=&token=` | `app/calendar/page.tsx` | Client Component | FullCalendar: ver y eliminar bloques, confirmar/cancelar reservas |
| `/historial?token=` | `app/historial/page.tsx` | Server Component | Historial con filtros (cabaña, estado, año, origen) y descarga CSV |
| `/reservar?cabin_id=&...` | `app/reservar/page.tsx` | Client Component | Formulario turista: 4 pasos (fechas → datos → resumen → pago) |
| `/[slug]` | `app/[slug]/page.tsx` | Client Component | Landing pública con cabañas, hero SVG y atractivos turísticos |
| `/admin?token=` | `app/admin/page.tsx` | Server Component | Panel admin: resumen, clientes, cabañas, reservas, tokens, auditoría |
| `/inicio` | `app/inicio/page.tsx` | Server Component | Redirige a `/rukatraro` |

---

## 6. Rutas API

### Calendario

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/calendar` | GET | Lista bloques de una cabaña con `has_booking` e `is_confirmed` |
| `/api/calendar` | POST | Crea bloque manual (verifica token → tenant) |
| `/api/calendar/delete` | POST | Elimina bloque: si tiene `booking_id` elimina todos los bloques del booking; si no, solo ese |

### Reservas

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/bookings` | POST | Crea reserva desde formulario turista. Status `"draft"`, bloque `"transfer_pending"` |
| `/api/bookings/manual` | POST | Crea reserva desde panel owner. Verifica tenant, no envía email automático |
| `/api/bookings/confirm` | POST | Status → `"confirmed"`, calendar_blocks.reason → `"system_booking"`, envía email |
| `/api/bookings/cancel` | POST | Soft-delete booking + elimina físicamente sus calendar_blocks |
| `/api/availability` | GET | Verifica disponibilidad; sugiere alternativas automáticas (`auto_assign`, `suggest`, `red_takai`) |

### Tenant / Info

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/dashboard` | GET | Cabañas activas del tenant por token |
| `/api/tenant-by-cabin` | GET | Info completa del tenant por `cabin_id` (nombre, banco, tinaja, WhatsApp) |
| `/api/tenant/[slug]/cabins` | GET | Cabañas públicas por slug (revalidate: 60s) |
| `/api/ical/[cabinId]` | GET | Exporta bloques como `.ics` (iCal) |

### Emails

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/emails/nueva-reserva` | POST | Email a turista + owner al crear reserva |
| `/api/emails/reserva-confirmada` | POST | Email de confirmación a turista (con datos bancarios) |
| `/api/emails/recordatorio` | GET | Cron diario: envía recordatorio 48h antes del check-in |

### Admin (requieren `ADMIN_TOKEN`)

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/admin/tokens` | POST | Crear / desactivar tokens de acceso |
| `/api/admin/tenants` | POST | CRUD de tenants |
| `/api/admin/cabins` | POST | CRUD de cabañas |

### Otros

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/contact` | POST | Formulario de contacto → email a contacto@takai.cl |
| `/api/trinidad/cabins` | GET | Cabañas con tenant_id hardcodeado (demo) |

---

## 7. Funciones de `lib/`

### `lib/audit.ts`
```typescript
logAudit({ tenant_id, cabin_id?, action, entity_type, entity_id, details?, performed_by? })
```
Inserta registro en `audit_log`. Llamado en todos los endpoints de escritura.

### `lib/resend.ts`
```typescript
resend                         // cliente Resend configurado
emailNuevaReservaTurista(data) // template HTML turista
emailNuevaReservaDuena(data)   // template HTML propietario
emailReservaConfirmada(data)   // template HTML confirmación
emailRecordatorio48h(data)     // template HTML recordatorio
sendErrorAlert({ route, error, details }) // alerta de error → contacto@takai.cl
```

### `lib/supabase.ts`
```typescript
supabase  // createClient con ANON KEY (solo para uso en browser)
```
Las rutas API usan `SERVICE_ROLE_KEY` directamente (no este cliente).

---

## 8. Schema de Supabase

| Tabla | Columnas |
|-------|----------|
| `dashboard_links` | id, tenant_id, token_hash, pin_hash, active, created_at, last_used_at |
| `tenants` | id, business_name, owner_name, owner_whatsapp, twilio_whatsapp, deposit_percent, active, currency, payment_provider, mp_access_token, mp_webhook_secret, dashboard_token, created_at |
| `cabins` | id, tenant_id, name, capacity, base_price_night, cleaning_fee, active, created_at, updated_at |
| `bookings` | id, tenant_id, cabin_id, passenger_id, check_in, check_out, guests, status, nights, subtotal_amount, total_amount, deposit_percent, deposit_amount, balance_amount, notes, commission_percent, commission_amount, commission_status, created_at, updated_at |
| `calendar_blocks` | id, tenant_id, cabin_id, start_date, end_date, reason, booking_id, created_at |
| `audit_log` | id, tenant_id, cabin_id, action, entity_type, entity_id, details, performed_by, created_at |
| `tenant_users` | tenant_id, user_id, role, created_at |

### Valores de enum

- `bookings.status`: `"draft"` | `"confirmed"`
- `calendar_blocks.reason`: `"manual"` | `"system_booking"` | `"transfer_pending"`
- `bookings.notes`: JSON string con claves: `nombre`, `whatsapp`, `codigo`, `notas`, `origen`, `tinaja`
- `calendar_blocks.booking_id`: `null` para bloques manuales sueltos, tiene valor si viene de una reserva

---

## 9. Autenticación

### Flujo propietario
```
token (URL param) → SHA256 → dashboard_links.token_hash → tenant_id → todos los queries filtran por tenant_id
```

### Flujo admin
```
/admin?token=X → compare con ADMIN_TOKEN env var → render AdminDashboard
/api/admin/* → header x-admin-token == ADMIN_TOKEN
```

### Cron jobs
```
GET /api/emails/recordatorio → Authorization: Bearer CRON_SECRET
```

---

## 10. Funcionalidades completadas

- [x] Panel owner: lista de cabañas y reservas pendientes
- [x] Calendario FullCalendar con bloques por color según estado
- [x] Creación de reservas manuales desde panel owner
- [x] Creación de reservas desde formulario público (4 pasos)
- [x] Confirmación de pago (draft → confirmed)
- [x] Cancelación de reservas (soft-delete + limpieza de bloques)
- [x] Eliminación de bloques desde calendario (sueltos o por booking completo)
- [x] Historial con filtros múltiples y descarga CSV
- [x] Emails automáticos: nueva reserva, confirmación, recordatorio 48h
- [x] Alertas de error por email a admin (sendErrorAlert)
- [x] Exportación iCal por cabaña
- [x] Landing pública dinámica por slug de tenant
- [x] Panel admin con CRUD de tenants, cabañas y tokens
- [x] Auditoría completa de todas las acciones
- [x] Multi-tenant: aislamiento total por tenant_id en todos los queries
- [x] Verificación de conflictos al confirmar reservas

---

## 11. Bugs conocidos y pendientes

### Bugs activos

| Descripción | Archivo | Impacto |
|-------------|---------|---------|
| `TENANT_ID` hardcodeado en `/api/availability` | `app/api/availability/route.ts` | Disponibilidad solo funciona correctamente para 1 tenant |
| URL del panel en emails construida con slug en vez de token | `app/api/emails/nueva-reserva/route.ts` | Link del email al owner es incorrecto |

### Pendientes conocidos

- [ ] Migrar configuración de branding por cliente (tinaja, banco, datos) desde código hardcodeado a columnas en Supabase `tenants`
- [ ] Endpoint `/api/trinidad/cabins` tiene `tenant_id` hardcodeado — debe eliminarse o generalizarse
- [ ] iCal carga todos los bloques históricos sin filtrar por fecha mínima (ineficiente con muchos datos)
- [ ] `app/inicio/page.tsx` tiene slug hardcodeado (`/rukatraro`)

---

## 12. Comportamientos no obvios

**FullCalendar end exclusivo:** Con `allDay: true`, FullCalendar trata `end` como fecha exclusiva. El `end_date` de la BD es el último día ocupado, por lo que al construir eventos hay que sumar 1 día.

**parseNotes():** Maneja tres formatos según el origen: objeto JS (JSONB), JSON string (formulario manual), o pipe-delimited (flujo chatbot). No asumir el formato.

**Doble confirmación:** Si `is_confirmed === true`, el calendario muestra dos alertas antes de eliminar para advertir que la reserva ya está pagada.

**Eliminación de bloques:** Si el bloque tiene `booking_id`, se eliminan TODOS los bloques con ese `booking_id`. Un booking puede generar múltiples bloques.

**Calendario propietario:** `dateClick` está removido intencionalmente. Las reservas se crean únicamente desde "Nueva reserva manual" en el panel.

---

## 13. Paleta de colores

```
Fondo página:   #0d1a12    Nav:            #0a1510
Tarjeta:        #162618    Borde:          #2a3e28
Texto heading:  #e8d5a3    Texto body:     #8a9e88
Verde acento:   #7ab87a    Rojo bloqueo:   #e63946
Verde confirm:  #27ae60    Texto muted:    #5a7058
```

Tipografía: `Georgia, serif` para headings y montos, `sans-serif` para UI.

---

## 14. Comandos

```bash
npm run dev      # desarrollo local http://localhost:3000
npm run build    # build TypeScript + Next.js (debe pasar antes de push)
npm run start    # servidor producción local
git push origin main  # deploy automático en Vercel
```
