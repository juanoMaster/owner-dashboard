# CONTINUIDAD TAKAI — AUDITORÍA 2026-04-27

## CONTEXTO
SaaS multi-tenant reservas cabañas. Stack: Next.js 14, TypeScript, Supabase, Vercel Hobby, Resend, Mercado Pago.
Repo: juanoMaster/owner-dashboard
Rama producción: main | Rama trabajo: preview/nueva-pagina-turista
URL producción: panel.takai.cl, *.takai.cl

## CLIENTES ACTIVOS
- Rukatraro: tenant_id 11518e5f-6a0b-4bdc-bb6a-a1e142544579, CLP, 2 cabañas
- Cabañas Trinidad: tenant_id db307f3e-fd56-49b3-b4c5-868c7607c31e, CLP, 3 cabañas
- El Mirador: tenant_id 68cd61df-baeb-440d-9a7e-d1a8b9c5a05e, CLP, 2 cabañas
- Glamping Cacagual: Ecuador, USD, en proceso de onboarding

## SESIÓN ANTERIOR — LO QUE SE HIZO
1. Se implementó pricing_tiers (JSONB) en tabla cabins — columna ya existe en Supabase
2. Se actualizaron 7 archivos para soportar precios escalonados por personas:
   - app/api/tenant-by-cabin/route.ts — incluye pricing_tiers en respuesta
   - app/api/admin/cabins/route.ts — guarda pricing_tiers en create/update
   - app/api/tenant/[slug]/cabins/route.ts — SELECT incluye pricing_tiers
   - app/api/bookings/route.ts — usa getPriceForGuests() para calcular precio real
   - app/[slug]/page.tsx — muestra "desde $X" cuando hay tiers
   - app/reservar/page.tsx — precio reactivo al cambiar personas
   - app/components/AdminDashboard.tsx — CabinModal tiene sección pricing_tiers
3. Se actualizó paleta de colores de app/reservar/page.tsx a dark gold (igual que página pública)
4. Se hizo merge de preview/nueva-pagina-turista a main y push

## AUDITORÍA COMPLETADA — ISSUES ENCONTRADOS

### 🔴 CRÍTICOS (resolver en Bloque 1)

C1 — Webhook MP sin verificación de firma
Archivo: app/api/mp/webhook/route.ts
Problema: No verifica header x-signature de MP. Acepta cualquier POST. Token global MP_TEST_ACCESS_TOKEN para todos los tenants.
Solución: Verificar HMAC-SHA256 con firma de MP. Usar token por-tenant.

C2 — GET /api/calendar expone datos de huéspedes sin autenticación
Archivo: app/api/calendar/route.ts
Problema: Cualquiera con un cabin_id puede ver nombre, WhatsApp, montos de todos los huéspedes.
Solución: Requerir token del propietario en el GET.

C3 — GET /api/tenant-by-cabin expone datos bancarios completos sin autenticación
Archivo: app/api/tenant-by-cabin/route.ts
Problema: Devuelve bank_account_number + bank_rut a cualquier request con cabin_id.
Solución: Solo devolver datos bancarios cuando el turista ya tiene booking_id creado. Separar endpoint.

C4 — /api/bookings/confirm y /api/bookings/cancel sin autenticación real (IDOR)
Archivos: app/api/bookings/confirm/route.ts, app/api/bookings/cancel/route.ts
Problema: Solo requieren booking_id + tenant_id. No validan token del propietario. Cualquiera con esos UUIDs puede cancelar reservas.
Solución: Exigir token del propietario y validar via dashboard_links.

C5 — Race condition: doble booking posible
Archivos: app/api/bookings/route.ts, app/api/availability/route.ts
Problema: No hay transacción atómica ni EXCLUSION CONSTRAINT en calendar_blocks. Dos turistas simultáneos pueden reservar las mismas fechas.
Solución: Crear Supabase RPC con transacción atómica O agregar EXCLUSION CONSTRAINT con tsrange en PostgreSQL.

### 🟠 IMPORTANTES (resolver en Bloque 2 — antes de activar Ecuador)

I1 — Tinaja hardcodeada $30.000 CLP
Archivos: app/api/bookings/route.ts línea 78, app/api/bookings/manual/route.ts línea 66, app/reservar/page.tsx líneas 113, 383, 426
Solución: Columna tinaja_price en tenants (default 30000).

I2 — api/bookings/manual no usa pricing_tiers
Archivo: app/api/bookings/manual/route.ts
Solución: Agregar pricing_tiers al SELECT y aplicar getPriceForGuests().

I3 — ManualBookingForm usa precios hardcodeados
Archivo: app/components/ManualBookingForm.tsx
Extra persona: $5.000 fijo. Tinaja: $30.000 fijo. Umbral extra usa capacity-2 distinto al backend.

I4 — deposit_percent del tenant nunca se usa
Siempre calcula 20% hardcodeado. La columna deposit_percent existe pero se ignora.

I5 — Webhook MP usa token global, no por-tenant
app/api/mp/webhook/route.ts usa process.env.MP_TEST_ACCESS_TOKEN para todos los tenants.

I6 — min_nights del tenant nunca se respeta
app/reservar/page.tsx línea 117: noches >= 2 siempre, ignora tenant.min_nights.

I9 — /api/mp/status no verifica mp_access_token
Solo verifica mp_enabled, no verifica que el token exista.

### 🟡 ADVERTENCIAS (Bloque 3)

A1 — app/api/trinidad/cabins/route.ts tiene tenant_id hardcodeado — eliminar
A2 — app/inicio/page.tsx y app/pinilla/page.tsx con slugs hardcodeados — documentar o eliminar
A3 — generateBookingCode() duplicado en 2 archivos → mover a lib/booking-utils.ts
A4 — getPriceForGuests() duplicado en 3 archivos → mover a lib/pricing.ts
A5 — parseNotes() tiene 4 implementaciones distintas → mover a lib/parse-notes.ts
A7 — fmt() siempre en CLP, rompe panel del propietario en Ecuador
A9 — ReservasTab filtra años por últimos 2 dígitos — bug con días que contienen "26"
A11 — Páginas públicas /[slug] sin meta tags SEO (og:image, og:description)
A12 — Lógica extra persona inconsistente: manual usa capacity-2, web usa capacity
A13 — Admin panel no registra auditoría de acciones (crear/editar/eliminar clientes y cabañas)
A14 — Cron de recordatorio puede timeout con muchos tenants en temporada alta

### 🟢 MEJORAS PRIORIZADAS
1. Auto-cancelación reservas draft sin pago después de 24h (tercer cron)
2. Transacciones atómicas via Supabase RPC para booking creation/cancellation
3. Rate limiting en /api/bookings (1 reserva por IP cada 60s)
4. Polling de estado en pago-exitoso/pendiente pages
5. Dashboard métricas para el propietario (ocupación %, ingresos)
6. SEO Server Component para páginas públicas de clientes

## PLAN DE ACCIÓN
Bloque 1 (CRÍTICOS): C5 → C2 → C3 → C4 → C1
Bloque 2 (ECUADOR): I1 → I2 → I3 → I4 → I6 → I5 → I9
Bloque 3 (DEUDA TÉCNICA): A3+A4+A5 → A7 → A9 → A11 → A12

## REGLAS DEL PROYECTO
- No Tailwind (excepto NewClientOnboarding, embed/calendario, EmbedIframeSnippet)
- Todo CSS como objetos JS inline
- No template literals en .tsx
- createClient siempre dentro de funciones, nunca a nivel módulo
- Siempre cache: 'no-store' en createClient de rutas API
- Siempre export const dynamic = 'force-dynamic' en rutas API
- Siempre .is("deleted_at", null) en queries a bookings
- Git: rama main = producción, rama preview/nueva-pagina-turista = desarrollo
- Windows PowerShell: usar ; no && para encadenar comandos
- Comandos git siempre en bloque separado al final
- Comisión Takai: 10% por reserva confirmada generada por Takai