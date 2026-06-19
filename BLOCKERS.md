# BLOCKERS — Motor de Reservas (rama `feature/motor-reservas`)

> Lo que quedó bloqueado por env vars faltantes o acciones que requieren a Juan.
> Cada bloqueo no detiene el loop: se documenta y se continúa con la siguiente fase.

## Acciones humanas requeridas (HUMAN_TODO)

### Migraciones SQL
- ✅ **`012_rls_verification.sql` APLICADA a producción** (2026-06-19, idempotente, sin cambios destructivos).
- ✅ **`013_motor_reservas.sql` APLICADA a producción** (2026-06-19). Verificado: 2 columnas nuevas en `bookings` (31 reservas existentes backfilled a `owner_direct`), 4 tablas nuevas con RLS, 3 columnas nuevas en `tenants`. Datos intactos.
- ⏳ **`011_pgcron_autocancel_3h.sql` PENDIENTE** — **requiere el `CRON_SECRET` real y la URL** (embebe el secreto; no lo tengo). Juan debe editarlo y aplicarlo en Supabase SQL Editor para activar el pg_cron de 15 min. Mientras tanto la auto-cancelación a 3h corre vía el orquestador diario (una vez al día) — funcional pero no garantiza la ventana de 3h hasta aplicar 011.

### Env vars que Juan debe configurar (sin esto, la fase relacionada queda inerte)
- `LLM_API_KEY`, `LLM_API_URL`, `LLM_MODEL` — Fase 6 (agente WhatsApp). Sin esto el agente no responde (cae al handoff al dueño).
  - **`LLM_API_URL` debe ser un endpoint OpenAI-compatible** (`.../chat/completions`) con soporte de `tools`/function-calling. Compatible con OpenAI, Gemini (vía gateway), Anthropic (endpoint compat) o cualquier proxy OpenAI-compatible. `LLM_MODEL` = nombre del modelo (ej. un modelo barato tipo Haiku/Flash).
  - `TWILIO_WHATSAPP_FROM` ya existe (número compartido del sistema). El botón click-to-WhatsApp apunta ahí con el tag `[C:<cabin_id>]`.
- `DIRECTORY_DOMAIN` — Fase 4/5 (dominio del directorio B2C). Comprar dominio aparte.
- `SEARCH_CONSOLE_VERIFICATION` — Fase 5 (meta tag de verificación Google).
- `GOOGLE_PLACES_API_KEY` (opcional) — Fase 11 (mostrar reseñas de Google). Si falta, la sección no se muestra.

### Acciones manuales (no son código)
- Comprar dominio del directorio y apuntarlo a Vercel.
- Verificar el dominio en Google Search Console.
- Crear/verificar Ficha de Google (GBP) por cabaña (Google exige verificación por local).
- Registro Sernatur (RNPST) por dueño con su RUT.

---

## Bloqueos por fase

### Fase 1
- pg_cron requiere aplicación manual (embebe el secreto). Ver migración `011`.

### Fase 3
- Verificar el JSON-LD con el **Rich Results Test** de Google (https://search.google.com/test/rich-results) sobre una URL real desplegada. No se puede ejecutar offline. Requiere cabaña con ≥8 fotos y geo válida; si no, el schema se omite por diseño.

### Fase 7 — ✅ RESUELTO POR JUAN (2026-06-19)
**Decisión final de Juan:**
- Takai cobra **10% sobre TODA reserva generada por Takai** (`booking_source IN directory, whatsapp_agent, affiliate`). Reservas directas (`owner_direct`, `manual`) → 0%.
- De ese 10%, **hasta 5% puede cederse a afiliados/influencers** (el resto queda para Takai). → el `commission_rate` de un afiliado se topa en 5%.
- Los **3 clientes actuales NO cambian** hasta que venzan sus plazos (`el-mirador`, `cabanas-majoaal-licanray`, `glamping-cacagual`): se mantienen exactamente como están. Su cron `generate-commission-statements` **NO se toca** (sigue tal cual).
**Implementado:** `lib/commission.ts` (constantes `TAKAI_COMMISSION_RATE=10`, `MAX_AFFILIATE_RATE=5`, `isTakaiGenerated`, `clampAffiliateRate`); cap de 5% en `/api/admin/affiliates` POST + clamp defensivo en `/api/affiliate/stats` + CHECK en migración 013.
**Pendiente (escala, no urgente):** mecanismo para facturar el 10% de Takai a los clientes en **suscripción** sobre sus reservas Takai-generadas (hoy el cron de statements solo cubre a los fundadores en modo comisión). Cuando haya clientes nuevos con reservas vía directorio/agente, definir cómo se les cobra ese 10%.

### Fase 9 — follow-ups no bloqueantes
- Tab de moderación de reseñas en `app/components/AdminDashboard.tsx`. La API `/api/admin/reviews` (GET/PATCH) ya funciona; falta solo la UI. Mientras tanto se puede aprobar con un PATCH manual.
- Mostrar las reseñas aprobadas en las 3 templates de landing (`TemplateClasico/Moderno/Rural`). El JSON-LD/Rich Results ya las incluye; falta la sección visual en la página.
