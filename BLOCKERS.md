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
