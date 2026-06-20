# BLOCKERS — Motor de Reservas (rama `feature/motor-reservas`)

> Lo que quedó bloqueado por env vars faltantes o acciones que requieren a Juan.
> Cada bloqueo no detiene el loop: se documenta y se continúa con la siguiente fase.

## Acciones humanas requeridas (HUMAN_TODO)

### 🔴 PRIORIDAD ALTA — Dominio `panel.takai.cl` mal configurado en Vercel/DNS
**Síntoma:** `panel.takai.cl` carga la cabaña de `cabanas-majoaal-licanray` en vez del panel de admin.
**Causa:** NO es código (el `middleware.ts` rutea `panel.takai.cl` al panel correctamente). Es la **asignación del dominio en Vercel** — apunta al proyecto/deployment equivocado o tiene un redirect.
**Lo que hay que hacer (solo tú puedes, es infra):**
1. Vercel → proyecto **owner-dashboard** → Settings → **Domains**: verifica que `panel.takai.cl` esté asignado a este proyecto, en **Production (branch `main`)**.
2. Busca si `panel.takai.cl` está asignado a **otro proyecto** Vercel (algún "takai"/landing viejo) o tiene un **Redirect** configurado. Quítalo de ahí.
3. DNS: `panel.takai.cl` debe ser CNAME → `cname.vercel-dns.com` y estar asignado a este proyecto.
4. **Mientras tanto, en Vercel env vars deja `NEXT_PUBLIC_APP_URL=https://owner-dashboard-navy.vercel.app`** (URL estable). Cuando confirmes que `panel.takai.cl` ya carga el panel, recién ahí cámbiala a `https://panel.takai.cl`.
5. **Deployment Protection:** si el dominio `*.vercel.app` tiene "Vercel Authentication" activado, bloquearía las llamadas del pg_cron (migración 011) al endpoint. Desactívalo para ese path o usa el dominio custom una vez arreglado.

**Ya resuelto en código (no requiere acción tuya):** todos los fallback de `NEXT_PUBLIC_APP_URL` y los ~7 hardcodeos ahora caen a `owner-dashboard-navy.vercel.app`; el cron diario también. Ver PROGRESO ADDENDUM 2.

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
**✅ Mecanismo de cobro 10% en suscripción — IMPLEMENTADO (commit b6405de):** `generate-commission-statements` tiene una 2ª pasada para `billing_mode='subscription'` (status active/trial/past_due, nunca `manual_billing`) que factura 10% SOLO sobre reservas `booking_source IN (directory, whatsapp_agent, affiliate)`. La pasada 1 (fundadores en modo comisión) quedó intacta. Aún no hay clientes en suscripción con reservas Takai-generadas, así que en la práctica todavía no genera statements de este tipo, pero la lógica ya está lista.

### Fase 9 — follow-ups — ✅ HECHOS
- ✅ Tab "Reseñas" de moderación en `AdminDashboard.tsx` (aprobar/rechazar + filtros).
- ✅ Display de promedio de reseñas en las 3 templates de landing (`ReviewStars`).

### Fase 10 — follow-up — ✅ HECHO
- ✅ Panel "Directorio: X/Y listas" en el tab Cabañas del admin (`DirectoryReadiness`), muestra qué falta por cabaña.

### Fase 6 — follow-up (cosmético, NO hecho a propósito)
- Botón WhatsApp **por cabaña** dentro de las cards de las templates. Se dejó el botón flotante (con la 1ª cabaña), que ya cubre el caso (casi todos los tenants tienen 1 cabaña). En el directorio sí hay botón por cabaña. Bajo valor; no se invirtió en cablear el número de agente a las 3 templates.

### Directorio — follow-up (no hecho)
- El directorio B2C no muestra reseñas todavía (su `lib/data.ts` no las consulta). La landing del owner sí. Mejora menor cuando el directorio esté en producción.
