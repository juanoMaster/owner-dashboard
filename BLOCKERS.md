# BLOCKERS — Motor de Reservas (rama `feature/motor-reservas`)

> Lo que quedó bloqueado por env vars faltantes o acciones que requieren a Juan.
> Cada bloqueo no detiene el loop: se documenta y se continúa con la siguiente fase.

## Acciones humanas requeridas (HUMAN_TODO)

### Migraciones SQL a aplicar manualmente en Supabase SQL Editor
Por seguridad NO se aplicaron automáticamente a producción (RLS mal aplicado deja la app sin acceso; no hay espejo de prueba). Revisar y aplicar en orden:
- `011_pgcron_autocancel_3h.sql` — **requiere editar el CRON_SECRET y la URL** antes de aplicar (ver comentarios en el archivo). Configura pg_cron + pg_net para llamar al endpoint cada 15 min.
- (se irán agregando las migraciones de fases siguientes: afiliados, reseñas, whatsapp_conversations, email_opt_out, booking_source)

### Env vars que Juan debe configurar (sin esto, la fase relacionada queda inerte)
- `LLM_API_KEY`, `LLM_API_URL`, `LLM_MODEL` — Fase 6 (agente WhatsApp). Sin esto el agente no responde.
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

### Fase 7 — ⚠ DECISIÓN QUE REQUIERE A JUAN (conflicto de directivas)
El plan (Fase 7) pide: "el 10% se aplique SOLO a reservas generadas por Takai (directory/whatsapp_agent/affiliate) y 0% a directas; si hoy cobra sobre todas, corrígelo."
**PERO** el cron `generate-commission-statements` HOY suma TODAS las reservas confirmadas de los tenants `billing_mode='commission'` — y eso es **exactamente el trato de los 3 clientes fundadores** (el-mirador, majoaal, cacagual): mensualidad bonificada a cambio de comisión sobre SUS reservas. CLAUDE.md lo marca sagrado ("NO se toca hasta que migren") y el plan tiene como regla inviolable "No revertir trabajo de sesiones anteriores".
**Cambiar el cron rompería la facturación de los fundadores** (pasarían a 0% en sus reservas directas).
**Decisión autónoma tomada:** NO se modifica el cron de comisiones de los fundadores (gana el guardrail inviolable). La atribución por `booking_source` y la comisión del 10% Takai-generado se implementan como sistema **aditivo de afiliados** (payout al afiliado desde reservas con `booking_source='affiliate'`), sin tocar el modelo comisión heredado.
**Juan decide:** cuando los fundadores migren a suscripción, ahí sí se activa el modelo "10% solo en Takai-generado" para ellos. Mientras tanto, coexisten. Confirmar si esta lectura es correcta.

### Fase 9 — follow-ups no bloqueantes
- Tab de moderación de reseñas en `app/components/AdminDashboard.tsx`. La API `/api/admin/reviews` (GET/PATCH) ya funciona; falta solo la UI. Mientras tanto se puede aprobar con un PATCH manual.
- Mostrar las reseñas aprobadas en las 3 templates de landing (`TemplateClasico/Moderno/Rural`). El JSON-LD/Rich Results ya las incluye; falta la sección visual en la página.
