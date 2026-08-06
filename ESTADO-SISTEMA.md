# ESTADO DEL SISTEMA — Takai.cl owner-dashboard

> Actualizar al final de cada sesión. Leer al inicio.

---

## Última actualización
**Fecha:** 2026-08-04
**Sesión:** Auditoría de arquitectura + pruebas E2E reales contra producción

**Sesión 2026-08-04 — Auditoría completa y batería E2E en producción (instrucción de Juan):**

Se creó un cliente completo de prueba (`zztest-auditoria`: 2 cabañas, tramos por huésped, temporada alta, template premium, `whatsapp_enabled=false` para no enviar mensajes reales), se ejercitaron **todos los modos de reserva** contra producción y se borró todo al final. Hallazgos:

- 🔴 **BUG CRÍTICO — el cron borraba las reservas manuales del propietario.** `cancelar-pendientes` seleccionaba *cualquier* draft vencido, así que una reserva que el dueño anotaba a mano (la que toma por teléfono y cobra a la llegada) se auto-cancelaba a las 3h, liberaba la fecha y le mandaba al huésped un WhatsApp diciendo que no envió el comprobante. Reproducido en producción: `ZZT-DVQ-5211` quedó `deleted_by=cron_auto_cancel`. **Corregido:** ambos crons ahora solo actúan sobre reservas con bloque `reason='transfer_pending'` (las del formulario público, que sí esperan comprobante). Las manuales nacen con `reason='manual'` y quedan intactas. Invariante verificado en las RPC `create_booking_atomic` (transfer_pending) y `create_booking_manual` (manual).
- 🔴 **BUG DE PRECIOS — los tramos por huésped pisaban el precio de temporada.** En `lib/pricing.ts` el tramo reemplazaba el precio de temporada: una cabaña con tramo $70.000 (2 personas) y temporada alta $120.000 cobraba **$70.000 en enero** mientras la página mostraba "temporada Alta". Medido: 4 noches en temporada alta daban $280.000 en vez de $480.000 (**$200.000 perdidos por reserva**). **Corregido:** en temporada nunca se cobra menos que el precio de temporada; si el tramo es mayor (grupos grandes), gana el tramo. Verificado en 6 escenarios. **Ningún cliente real quedó afectado** (ninguna cabaña activa tiene temporadas y tramos a la vez), así que no hubo cambio de precios en producción.
- 🟠 **Cobro de un servicio inexistente:** `/api/bookings` (público) aceptaba `tinaja_days` para cualquier cabaña y lo cobraba sin verificar que la cabaña ofreciera tinaja. **Corregido** con guard `cabin.has_tinaja ?? tenant.has_tinaja`. Ningún cliente real tenía reservas con tinaja, así que no hubo impacto.
- 🟠 **Endpoint fail-open:** `/api/emails/resumen-semanal` sólo exigía el secreto **si la variable existía** (`if (process.env.CRON_SECRET && ...)`). Sin esa variable el endpoint quedaba abierto y cualquiera podía disparar el envío del resumen a todos los propietarios. **Corregido** a fail-closed.
- 🟠 **Autenticación de crons unificada:** cada endpoint la implementaba distinto (3 patrones) y con comparación de strings no timing-safe. Nuevo `lib/cron-auth.ts` con `isCronAuthorized()` (acepta `CRON_SECRET` o `PGCRON_SECRET`, comparación `timingSafeEqual`) aplicado a los endpoints de cron. `/api/cron/daily` conserva su lógica propia (necesita el valor de `CRON_SECRET` para reenviarlo a los sub-endpoints) y `/api/health` la suya (acepta también `HEALTH_CHECK_KEY`).

**Verificación de los fixes EN PRODUCCIÓN (no sólo build):** tras desplegar se repitió la prueba: la reserva manual del propietario (`ZZT-RZE-3184`, bloque `manual`) **sobrevivió** al cron, mientras las de turista (`ZZT-WWW-3820`, `ZZT-AET-8816`) sí se auto-cancelaron — que es lo correcto. El precio de temporada alta pasó a devolver $480.000 y el guard de tinaja cobró $200.000 en vez de $325.000 en una cabaña sin tinaja.
- 🟡 **Trampa latente documentada:** existe un trigger `trg_set_dashboard_token` que **sobrescribe** `tenants.dashboard_token` en cada INSERT. Todo INSERT directo debe hacer después el `UPDATE` del token, o el link del panel que va en emails/WhatsApp queda muerto. `/api/admin/onboard` y `/api/registro` ya lo hacen bien. **Auditado: los 5 tenants activos tienen su token válido** (verificado cruzando `sha256(dashboard_token)` contra `dashboard_links`).

**Verificado y correcto (sin cambios necesarios):** RLS activo en las 22 tablas (3 con default-deny intencional); reserva turista con tramos y tinaja; doble reserva rechazada con 409 (RPC atómico); mínimo de noches por temporada; fechas pasadas rechazadas; sugerencia de cabaña alternativa al estar ocupada; reserva manual del propietario; confirmación (bloque → `system_booking`) e idempotencia; cancelación con soft-delete y liberación de bloques; página de bienvenida (200 con código válido, 404 con inválido); reseña pública; landing con template premium; widget embebible; dashboard, historial, stats y billing del propietario; rechazo cross-tenant (401); validación de fechas al crear bloques; guidebook y precios; privacidad de los endpoints públicos (sin `owner_whatsapp` ni guidebook completo); atribución `booking_source=directory` para el 10% de Takai; audit_log completo en las 5 operaciones.
**Sesión:** Auditoría pre-propuesta Cámara de Melipeuco + nuevo modelo de precios (instrucción de Juan)

**Sesión 2026-08-03 — Auditoría completa para la propuesta a la Cámara de Turismo de Melipeuco + cambio de modelo de cobro:**
- **NUEVO MODELO DE PRECIOS (decisión de Juan 2026-08-03):** clientes nuevos = **$160.000 CLP de entrada única, CERO mensualidad, 10% solo sobre reservas generadas por Takai** (directorio/agente/afiliados; directas del dueño 0%). En BD: `billing_mode='subscription'` + `amount=0` + `plan='sin-mensualidad'` + `status='active'` sin trial. El 10% ya lo facturaba la pasada 2 de `generate-commission-statements` (commit b6405de). Modelo anterior de mensualidad retirado sin clientes activos. Los 3 fundadores en modo comisión NO cambian.
- **Onboarding actualizado:** `/api/admin/onboard` crea la suscripción directamente en el modelo nuevo (active, sin trial, amount 0) — un cliente Melipeuco queda operativo y facturable al ingresar, sin pasos extra.
- **P1 RESUELTO — facturación invisible para el 10%:** `/dashboard/facturacion` solo mostraba estados de cuenta si `billing_mode='commission'`; los clientes del modelo nuevo (subscription) recibían el email del statement pero no tenían dónde verlo/pagarlo. Ahora la sección aparece siempre que existan statements. `commission-pay` y `report-transfer` ya funcionaban sin guard de modo.
- **P1 RESUELTO — contradicción de ventana de cancelación (afectaba turistas):** el cron cancela drafts a las 3h flat (`AUTO_CANCEL_HOURS`), pero el countdown de `pago-pendiente` mostraba 12h (`transfer_timeout_hours`) y el recordatorio WhatsApp usaba ventana de 9–24h (recordaba reservas ya canceladas). Nueva fuente única `lib/auto-cancel.ts` compartida por `cancelar-pendientes`, `bank-info` (countdown) y `recordatorio-transferencia` (ventana 1.5h–3h). `transfer_timeout_hours` queda legacy documentado.
- **Guard nuevo:** `/api/billing/subscribe` rechaza planes con `amount<=0` (no se puede crear preapproval de $0 llamando la API directo). `canSubscribe` en facturación también lo excluye; UI muestra "Sin mensualidad — solo 10% de reservas generadas por Takai".
- **emailTrialEnding:** eliminada la promesa hardcodeada "$19.990 CLP/mes de por vida" (precio obsoleto); ahora apunta a la página de Facturación.
- **Directorio — Melipeuco agregado:** la propuesta promete "zona dedicada a Melipeuco" y el directorio no la tenía. Nuevo destino en `directorio/lib/destinos.ts` (Conguillío, Llaima, araucarias, teletrabajo) — se propaga solo a portada, sitemap y página estática. Las cabañas se asocian cuando `tenants.location_text` contiene "melipeuco".
- **Limpieza:** eliminada carpeta vacía `app/api/ical/[cabinId]` (residuo sin route, untracked).
- **Docs:** CLAUDE.md y AGENTS.md actualizados (gobernanza, precios, crons 3h, transfer_timeout_hours legacy, pasada 2 del 10%).
- **Contraste propuesta Melipeuco vs sistema:** los 25 puntos de la propuesta verificados contra código — todos reales. Dependencias externas (no código): dominio B2C personalizado + Search Console para el SEO del directorio; `google_review_url` o GBP por tenant para el link de reseña en Google.

**Sesión 2026-08-03 (parte 2) — Regla de privacidad + cron horario + ubicación (instrucciones de Juan):**
- **REGLA NUEVA DE JUAN:** el turista JAMÁS ve teléfono, redes sociales ni datos de contacto del dueño antes del pago confirmado — todo contacto pasa por el agente Takai. Aplicado:
  - Removidos los links Instagram/Facebook de las 3 templates de landing.
  - `pago-fallido`: el botón de contacto ya no muestra el WhatsApp del dueño; apunta al asistente Takai (chip `NEXT_PUBLIC_AGENT_WHATSAPP` o chat web `<slug>.ag.takai.cl/embed`).
  - **P1 fuga de datos:** el API público `/api/tenant/[slug]/cabins` devolvía el `guidebook` COMPLETO (¡clave wifi, instrucciones de llegada, contacto de emergencia!) + `owner_whatsapp` + redes. Ahora solo expone `checkin_time`/`checkout_time` del guidebook y cero contactos del dueño. `/api/tenant-by-cabin` y `/api/bookings/bank-info` también dejaron de devolver `owner_whatsapp`. El directorio ya estaba limpio.
- **Cron horario (pedido de Juan "cada 1 hora"):** Vercel Hobby no permite crons horarios → pg_cron de Supabase. Como `CRON_SECRET` es Sensitive en Vercel (ilegible), se creó `PGCRON_SECRET` dedicado (agregado a Vercel prod vía CLI autenticada); `cancelar-pendientes` y `recordatorio-transferencia` aceptan cualquiera de los dos secretos. Jobs pg_cron: cancelación cada hora en punto, recordatorio cada hora a los :30 (misma cadencia todo el año — correr en invierno no cuesta nada y evita mantener 2 configs). La migración 011 original (15 min, bloqueada por el secreto) queda superada.
- **Ubicación GPS ("Cómo llegar"):** las 3 templates ahora muestran mapa exacto (`MapaUbicacion modo="exacto"`) + botón "📍 Indicaciones en Google Maps" (`google.com/maps/dir` con lat/lng). Clásico subió de modo aproximado a exacto. NOTA: si una landing no muestra ubicación es porque el tenant no tiene `location_text`/`latitude`/`longitude` cargados en BD — completarlos desde /admin (caso majoaal/Licanray).
- **pg_cron APLICADO Y VERIFICADO en producción (2026-08-03):** jobs `takai_autocancel_pendientes` (`0 * * * *`) y `takai_recordatorio_transferencia` (`30 * * * *`) activos en Supabase; el Bearer se lee del Vault (`takai_pgcron_secret`, espejo de `PGCRON_SECRET` en Vercel — creado vía CLI porque CRON_SECRET es Sensitive/ilegible). Ejecución manual de prueba: HTTP 200 `{"cancelled":0}`. La migración 011 (15 min, bloqueada) queda SUPERADA — no aplicar. La liberación de fechas ahora es horaria de verdad; el orquestador diario sigue como respaldo.
- **takai-landing sincronizada (instrucción de Juan):** el modelo $160.000 + $0/mes + 10% Takai quedó publicado en takai.cl (precio, FAQ, simulador, términos, modal, blog). Detalle en `takai-landing/ESTADO-SISTEMA.md` sesión 2026-08-03.

**Sesión 2026-08-03 (parte 3) — 5 plantillas + alta self-service (instrucción de Juan):**
- **5 plantillas de landing (antes 3):** nuevas `TemplatePremium` (fotografía a pantalla completa, galería con flechas, filas alternadas, paleta negro+bronce) y `TemplateBoutique` (minimalista papel, tipografía serif, mosaico de fotos, mucho aire). Registradas en `app/[slug]/page.tsx` y en el selector del admin. Ambas nacen con "Cómo llegar" + mapa y sin redes/contacto del dueño.
- **Migración 014 APLICADA en producción:** `tenants_template_check` ampliado a `clasico|moderno|rural|premium|boutique`. Era bloqueante: sin esto la BD rechazaba guardar las plantillas nuevas. Puramente aditiva, verificada.
- **Alta self-service (fase 1 semi-automática) — IMPLEMENTADA:**
  - `/registro` — wizard público de 4 pasos (negocio + estilo de página, cabañas, datos bancarios, resumen + pago). Valida en cliente y servidor.
  - `POST /api/registro` — público: crea tenant `active=false`, cabañas, `dashboard_link` + token, `subscriptions` (sin mensualidad, status `pending`) y el cobro de la cuota en `commission_statements` con `kind='setup_fee'` ($160.000). Rollback en cascada si algo falla. Anti-abuso: una solicitud pendiente por correo cada 30 min. Genera preferencia MP (`external_reference` `setup:<id>`) o marca "coordinar transferencia". Avisa al admin por email.
  - `/registro/listo` — retorno desde MP; no confirma el pago por sí sola (lo hace el webhook).
  - Webhook de billing extendido: reconoce `setup:` (idempotente), marca la cuota pagada, audita `signup_fee_paid` y avisa a Takai.
  - `/admin` → nuevo tab **Altas**: lista solicitudes con cabañas, fotos, cuenta bancaria y estado del pago; botón "Aprobar y publicar" → `active=true`, sub `active`, email de bienvenida con el acceso al panel. Rechazar no se implementó a propósito: se usa el borrado de tenant del tab Clientes, que ya limpia en cascada.
  - **Por qué queda la aprobación humana:** sin ella cualquiera podría publicar cabañas ajenas, fotos malas o una cuenta bancaria equivocada a la que los turistas transferirían. Cuando el flujo demuestre calidad, automatizar es quitar solo ese paso.
  - **Probado end-to-end contra producción (2026-08-03):** validaciones → 400 con mensaje correcto; camino feliz → 200 creando tenant `active=false` + cabaña + acceso + suscripción `pending / sin-mensualidad / 0` + cuota `setup_fee / pending / 160000`; API pública del tenant inactivo → 404 (invisible al turista). El registro de prueba se borró en cascada y la BD quedó solo con los tenants reales.
  - **Falso positivo detectado y corregido en la prueba:** el tab Altas listaba cualquier tenant con `active=false`, e incluía a los ex-prospectos antiguos (`trinidad`, `rukatraro`). Ahora una solicitud se define como `active=false` **y** con cobro `kind='setup_fee'`; los desactivados a mano no aparecen.
  - **Enlace desde la landing:** `takai.cl` sección Precio → "¿Prefieres hacerlo tú mismo? Regístrate en línea" → `reservas.takai.cl/registro`. El WhatsApp sigue siendo el CTA principal.
- **Blog de la landing corregido (instrucción de Juan):** eliminada la comparación "$50.000 a $100.000 de instalación" de la competencia (jugaba en contra de la cuota de $160.000). El artículo se reencuadró hacia costo acumulado de la mensualidad vs pago único + alineación de intereses; se agregó la sección "¿a quién le conviene que te vaya bien?".
- **`takai-landing/CLAUDE.md` corregido:** decía "Tailwind PROHIBIDO" cuando todo el rediseño premium de ese repo usa Tailwind; ahora documenta la convención real (Tailwind + tokens de marca; `ContactModal` queda con inline styles).

**Sesión 2026-07-31 — Directorio B2C y atribución de referentes (instrucción de Juan):**
- **Copy público corregido:** eliminado el mensaje "Tu comisión sale del 10% de Takai — el propietario nunca paga extra". La portada ahora invita a viajeros, creadores de contenido, influencers y personas con comunidad a ganar una comisión por cada reserva confirmada generada por su recomendación. CTA: **"Inscríbete como referente"**, con solicitud dirigida a `contacto@takai.cl`.
- **P1 integridad comercial — RESUELTO:** `?ref=` se perdía al navegar desde la portada/destino hacia la ficha de cabaña, por lo que una reserva recomendada podía quedar sin `affiliate_id`. Se agregó normalización segura del código y propagación por portada → destino → ficha → motor de reserva.
- **P1 integridad comercial — RESUELTO:** la alternativa sugerida por `/reservar` cuando una cabaña está ocupada ahora conserva `source` y `ref`; antes ese cambio de cabaña borraba la atribución.
- **UX completada:** la portada dejó de ocultar silenciosamente las cabañas posteriores a las primeras 9; ahora muestra todas las publicables bajo "Cabañas disponibles".
- **Validación:** build producción owner-dashboard ✅ (27 páginas); build producción directorio ✅ (10 páginas); TypeScript sin errores en ambos proyectos; revisión visual desktop y móvil ✅; navegación con `?ref=demo-influencer` verificada en DOM ✅.
- **Vercel — COMPLETADO:** creado el proyecto separado `takai-directorio`, variables de producción/preview configuradas (service role como secret), raíz Git fijada en `directorio/`, repo `juanoMaster/owner-dashboard` conectado y producción publicada en `https://takai-directorio.vercel.app`. Verificado HTTP 200 en portada, `robots.txt` y `sitemap.xml`; copy y CTA presentes en HTML.
- **Git + producción — COMPLETADO:** commit funcional `fc0f514` (`feat: completa directorio y referidos`) subido a `origin/main`. Los despliegues Git de `owner-dashboard` y `takai-directorio` terminaron en estado **Ready**; `https://owner-dashboard-navy.vercel.app/` y `https://takai-directorio.vercel.app/` responden HTTP 200.
- **Pendiente externo (no es código):** comprar/configurar un dominio B2C personalizado y verificarlo en Google Search Console. La aplicación ya está operativa en el dominio de Vercel mientras tanto.

**Sesión 2026-07-13 — Reorganización: un chat por proyecto (instrucción de Juan):**
- **Decisión de números FINAL:** separación total, un chip por negocio. `+56957083477` EXCLUSIVO del agente de reservas (takai-agent, Live). El agente de ventas de la agencia (takai-lead-agent, para ia.takai.cl) usará el **chip #2** que Juan ya compró, en una app Meta NUEVA (jamás dentro de "Takai Agente"). Coordinado con la sesión de ia.takai.cl vía mensaje cruzado.
- **Instrucciones por proyecto creadas:** CLAUDE.md nuevo en `takai-agent` (reglas de oro, contrato con owner-dashboard, regex espejadas, pendientes), `takai-landing` (reglas permanentes + pendientes), `takai-lead-agent` (decisión chip #2 + checklist, commiteado y pusheado `d091c8d`), `IA-Takai-Agencia` (estado, advertencia de limpieza con verificación previa). En los repos con cambios sin commitear de otras sesiones (takai-agent, takai-landing, IA-Takai-Agencia) el CLAUDE.md quedó en disco SIN commitear — lo commitea el chat propio de cada proyecto.
- **Memoria del proyecto depurada:** eliminada `project-audit-2026-06` (todo resuelto), actualizado `project-context` (migraciones ya aplicadas), agregadas `ecosystem-map` y `whatsapp-numbers`.
- **Pendiente #1 de Juan sin cambio:** probar +56957083477 desde número no-admin → setear `NEXT_PUBLIC_AGENT_WHATSAPP` en Vercel (owner-dashboard + directorio) → redeploy. Verificado hoy: la var sigue vacía (botones van al chat web).

**Sesión 2026-07-10 (continuación) — Auditoría completa del agente y consolidación (decisión de Juan):**
- **Auditoría (verificado contra producción):** existen DOS agentes. (1) Legacy en este repo: `lib/agent.ts` + webhook Twilio, número Twilio `+1 620 777 8395` (verificado vía `agent_whatsapp` en la API de prod). (2) Nuevo: repo `takai-agent` (monorepo aparte, misma BD), **EN PRODUCCIÓN en `ag.takai.cl`** — verificado HTTP 200 en `ag.takai.cl` y `el-mirador.ag.takai.cl/embed`. WhatsApp del nuevo = Meta Cloud API con el chip de Juan; la app Meta está en modo Desarrollo (las páginas legales para publicarla se agregaron hoy en takai-agent commit c4dd67e).
- **Decisión implementada:** el agente conversacional es ÚNICAMENTE takai-agent. `agent_whatsapp` (API tenant/[slug]/cabins) y el botón del directorio ya NO usan `TWILIO_WHATSAPP_FROM`; usan `NEXT_PUBLIC_AGENT_WHATSAPP` (el chip). Como hoy esa var no existe → todos los botones caen al **chat web** `<slug>.ag.takai.cl/embed` (operativo para cualquier turista). Cuando Meta apruebe la app: setear `NEXT_PUBLIC_AGENT_WHATSAPP` en Vercel y los botones pasan solos a wa.me del chip (tags `[slug]`+`[C:id]` que el webhook del agente nuevo rutea).
- **Twilio queda SOLO para:** notificaciones salientes (recordatorios, cancelaciones, avisos al dueño) y recepción de comprobantes (`/api/twilio/webhook` rama booking-code). La rama agente del webhook Twilio queda inerte (sin `LLM_API_KEY`) y NO debe reactivarse.
- **PENDIENTE DE JUAN:** (1) publicar la app Meta (App Review; las páginas /privacidad y /terminos ya están en takai-agent); (2) al estar Live, setear `NEXT_PUBLIC_AGENT_WHATSAPP=+56957083477` (chip, confirmado por la sesión takai-agent: registrado en Meta Cloud API, app "Takai Agente") en Vercel del owner-dashboard y del directorio; (3) futuro: migrar notificaciones de Twilio a Meta Cloud API para eliminar Twilio del todo.
- **Coordinación entre sesiones (2026-07-10):** reconciliado con la sesión `takai-agent` vía mensaje cruzado. Sin conflicto git (91a97a2 integrado con rebase; e3fa7aa alineó los botones a su contrato). Se le corrigió su propuesta de reusar `TWILIO_WHATSAPP_FROM` para el chip (rompería los envíos Twilio) — el chip va en `NEXT_PUBLIC_AGENT_WHATSAPP`. Quedó en su cancha: (a) manejar comprobantes con booking code en su webhook Meta (espejo de la rama booking-code del webhook Twilio), (b) confirmar cuándo la app Meta pase a Live.
- **Cierre de coordinación (confirmado por takai-agent, 2026-07-10):**
  - ✅ Comprobantes en su webhook Meta: implementado y en producción (`transfer-proof.ts`, tests 14/14). Marca `transfer_proof_received_at`, audit_log `performed_by=takai_agent_whatsapp`, avisa al dueño vía Meta.
  - ✅ Espejo en este repo: `BOOKING_CODE_RE` del webhook Twilio ampliada para aceptar también `TK-[A-Z0-9]{6}` (códigos que genera `crearPrereserva` del agente). Ambos webhooks reconocen ambos formatos — **mantener las regex espejadas** con `apps/web/src/lib/transfer-proof.ts` de takai-agent.
  - ⏳ App Meta sigue EN DESARROLLO y el token temporal EXPIRÓ (hoy ni el admin recibe respuestas por WhatsApp). El fallback web-chat es el camino real hasta que Juan: (a) genere el token permanente de system user, (b) publique la app. takai-agent le pasó los pasos exactos. Recién ahí: `NEXT_PUBLIC_AGENT_WHATSAPP=+56957083477`.
  - Fase 2 (futura, decisión de Juan): migrar notificaciones salientes de Twilio a Meta Cloud API. Prerrequisito técnico: plantilla utility aprobada (fuera de la ventana de 24h Meta exige template).

**Sesión 2026-07-10 — Agente WhatsApp enlazado + billing manual (instrucciones de Juan):**
- **Contexto:** Juan compró el chip de prepago y configuró el agente IA de WhatsApp (env vars LLM_* y TWILIO_* operativas en Vercel).
- **Botones enlazados:** `WhatsAppCabinButton` ahora ACTIVO por defecto (`NEXT_PUBLIC_WA_CABIN_BUTTON=false` queda como kill-switch). El flotante y el del directorio ya apuntaban al agente vía `TWILIO_WHATSAPP_FROM`.
- **`lib/whatsapp.ts` — fix estructural:** el envío ya NO exige el legacy `tenants.twilio_whatsapp` (campo por-tenant que ningún cliente nuevo tendría); el único gate es `whatsapp_enabled` (default `true` en onboarding). Resultado: **un cliente nuevo queda 100% enlazado al agente en el ingreso** — botones en su landing con tag `[C:<cabin_id>]`, agente respondiendo, y notificaciones WhatsApp al dueño — sin ningún paso manual extra.
- **Billing manual (decisión de Juan):** suspensión y reactivación son MANUALES desde `/admin` → tab Billing (columna Acciones: botón "Suspender" rojo / "Activar" verde, con confirm). Nueva ruta `POST /api/admin/billing` (action suspend|activate) que actualiza `subscriptions.status` + espejo `tenants.billing_status` + audit log (`billing_manual_suspended`/`billing_manual_activated`, performed_by `admin_panel`).
- **Cron `billing-check`:** la auto-suspensión quedó APAGADA por defecto — ahora detecta trials/past_due vencidos y envía UN email al admin con la lista de candidatos (se repite a diario hasta que Juan actúe). `BILLING_AUTO_SUSPEND=true` reactiva el comportamiento automático anterior sin tocar código (pedido de Juan: "en un futuro lo haremos automático").
- Docs: CLAUDE.md (env vars, crons, rutas, integración Twilio), `.env.example`, BLOCKERS al día.

**Sesión 2026-07-04 — Revisión de pendientes e implementación de los viables:**
- **Verificado:** la rama `feature/motor-reservas` ya está 100% mergeada en `main` (`git log main..feature/motor-reservas` vacío). La nota anterior "NO en main" quedó obsoleta.
- **Contradicción #1 RESUELTA:** `app/api/cron/cancelar-pendientes/route.ts` ahora envía email al turista al auto-cancelar (template `emailReservaCancelada`, mismo que `/api/bookings/cancel`), además del WhatsApp. `guest_email` agregado al SELECT. Envío best-effort con try-catch por booking (no rompe el loop).
- **Directorio B2C — reseñas (follow-up de BLOCKERS):** `directorio/lib/data.ts` consulta `reviews` aprobadas en batch (misma agregación que `/api/tenant/[slug]/cabins`); `directorio/lib/schema.ts` emite `aggregateRating` + `review` en el JSON-LD (estrellas en Google Rich Results); `CabinCard.tsx` muestra "★ 4.8 (N reseñas)"; página de cabaña lista hasta 10 reseñas.
- **Evaluados y descartados (con razón):** P2-6 timezones (decisión previa: posponer hasta tenant con problema real), P3-1 estilo createClient (churn sin valor funcional), botón WA por cabaña en templates (descartado a propósito, bajo valor), P3-4 archivos muertos (requiere instrucción explícita de Juan).
- Build owner-dashboard ✅ (27 páginas); `tsc --noEmit` del directorio ✅.

**Sesión 2026-07-04 (continuación) — P3-4 + estructura botón WhatsApp por cabaña (instrucción de Juan):**
- **P3-4 RESUELTO:** los archivos muertos listados ya no existían (borrados en sesión previa). Limpieza real: gitlink roto `claude-webkit` (submódulo accidental, modo 160000, sin `.gitmodules`) des-trackeado y carpeta vacía eliminada; carpeta vacía `landing/` eliminada; `tsconfig.tsbuildinfo` (artefacto de build trackeado por error) removido del índice + `*.tsbuildinfo` en `.gitignore`.
- **Botón WhatsApp por cabaña — estructura armada, INACTIVA:** `app/components/WhatsAppCabinButton.tsx` (nuevo) cableado en las cards de las 3 templates con `agent_whatsapp` + tag `[C:<cabin_id>]`. Gateado por `NEXT_PUBLIC_WA_CABIN_BUTTON=true` (env var, documentada en CLAUDE.md y `.env.example`) — activar a futuro no requiere tocar código. `agent_whatsapp` agregado al interface `TenantData` de las 3 templates.
- **Pendientes de Juan sin cambio:** migración 011 (pg_cron, requiere CRON_SECRET), dominio `panel.takai.cl` en Vercel/DNS, env vars `LLM_*`/`DIRECTORY_DOMAIN`/`SEARCH_CONSOLE_VERIFICATION`/`GOOGLE_PLACES_API_KEY`, compra dominio directorio + deploy, Search Console, GBP, Sernatur.

---

**Sesión anterior (2026-06-19):** Motor de Reservas (PLAN_NOCHE_TAKAI.md) — rama `feature/motor-reservas` (ya mergeada a main)

**Tanda nocturna 2026-06-19 — Motor de Reservas (rama feature/motor-reservas, sin tocar main):**
Ejecutadas las 11 fases del `PLAN_NOCHE_TAKAI.md`. Detalle completo en `PROGRESO.md`; pendientes humanos en `BLOCKERS.md`. Resumen:
- **Fase 1:** auto-cancelación a 3h (`AUTO_CANCEL_HOURS=3` + migración 011 pg_cron/pg_net cada 15 min). Validado con dry-run read-only contra producción.
- **Fase 2:** auditoría RLS — 15/15 tablas con RLS habilitado (verificado en BD). Migración 012 (verificación idempotente + guard). NO se tocaron políticas existentes.
- **Fase 3:** `lib/schema.ts` VacationRental JSON-LD + `JsonLd.tsx`, inyectado en landing.
- **Fases 4/5:** directorio B2C en `directorio/` (proyecto Next.js separado, excluido del build de takai.cl): SSG/ISR, schema, sitemap dinámico, robots, páginas de destino con contenido único + teletrabajo.
- **Fase 6:** agente IA WhatsApp (`lib/agent.ts`) extendiendo el webhook Twilio; tools de disponibilidad/precio reales; inerte sin `LLM_API_KEY`.
- **Fase 7:** `booking_source`/`affiliate_id`, afiliados (admin + dashboard + stats), atribución cross-domain.
- **Modelo de comisión (decisión de Juan 2026-06-19):** 10% sobre toda reserva generada por Takai (directorio/agente/afiliado); de ese 10%, hasta 5% cedible a afiliados (cap aplicado en BD+API+stats vía `lib/commission.ts`); los 3 clientes actuales NO cambian hasta vencer plazos (cron de comisión heredado intacto).
- **Fase 8:** retargeting (`/api/cron/retargeting`) + opt-out HMAC (`/api/email/unsubscribe`).
- **Fase 9:** reseñas (público + moderación admin + `/resena/[code]`) que alimentan el schema.
- **Fase 10:** `lib/cabin-validation.ts` + `/api/admin/cabins/readiness` (gating de publicación).
- **Fase 11:** asistente Ficha de Google (`/api/tenant/gbp` + `/dashboard/google`).
- Migración 013: tablas nuevas (affiliates, reviews, email_opt_out, whatsapp_conversations) todas con RLS desde creación.
- Build owner-dashboard: ✅ (27 páginas). Directorio: `npm install` ✅ + `tsc --noEmit` ✅ (type-check limpio); `next build` completo requiere `SUPABASE_SERVICE_ROLE_KEY` (acción de Juan).
- **PENDIENTE DE JUAN:** aplicar migraciones 011/012/013; env vars LLM_*, DIRECTORY_DOMAIN, SEARCH_CONSOLE_VERIFICATION; deploy del directorio; merge de la rama a main. (Modelo de comisión: ✅ RESUELTO 2026-06-19 — ver arriba.)

**Continuación 2026-06-19 — Fix dominio panel.takai.cl + centralización de URL base:**
- **Descubierto:** `panel.takai.cl` carga la cabaña de `cabanas-majoaal-licanray` en vez del panel. **No es bug de código** (el `middleware.ts` rutea bien `panel.takai.cl` al panel); es la asignación del dominio en **Vercel/DNS** (apunta al proyecto/deployment equivocado). → acción humana, ver BLOCKERS 🔴.
- **Arreglado en código:** fallback de `NEXT_PUBLIC_APP_URL` centralizado a `https://owner-dashboard-navy.vercel.app` (URL estable) en 21 archivos; eliminados los ~7 hardcodeos de `panel.takai.cl` (twilio webhook, bookings, bookings/manual, mp webhook, AdminDashboard token link, billing/ack). `middleware.ts` conserva `panel.takai.cl` en PASSTHROUGH (correcto). Cron diario `/api/cron/daily` ya usa la base URL con fallback estable. Migración 011 con URL `.vercel.app`. Verificado: grep = 0 hardcodeos en código; build ✅; `tsc --noEmit` ✅. Commits `19fdcfc`, `8a5b2b5` y el de docs.
- **PENDIENTE DE JUAN (nuevo):** arreglar la asignación de `panel.takai.cl` en Vercel; setear env var `NEXT_PUBLIC_APP_URL`; revisar Deployment Protection en `*.vercel.app` antes de aplicar la 011. Ver BLOCKERS 🔴.

**Sesión anterior (2026-06-18):** Fix preview reserva manual + soft-delete en admin + auditoría final completa

**Esta iteración del loop (2026-06-18 sesión final):**
- `app/components/ManualBookingForm.tsx`: bug crítico en `calcTotal()` — `extras = extra * 0 * n` siempre devolvía 0; corregido. Ahora usa `getPriceForDates` (season-aware) en lugar de `getPriceForGuests`. Agrega `season_prices` y `extra_person_price` al interface `Cabin`.
- `app/components/HomeDashboardClient.tsx`: pasa `extra_person_price` y `season_prices` al `ManualBookingForm`; agrega `extra_person_price` al interface de cabins
- `app/api/dashboard/route.ts`: agrega `extra_person_price` al SELECT de cabins (era omitido)
- `app/api/admin/cabins/route.ts`: DELETE de cabaña usaba hard-delete en bookings → corregido a soft-delete (`deleted_by="admin_cabin_delete"`)
- `app/api/admin/tenants/route.ts`: DELETE de tenant usaba hard-delete en bookings → corregido a soft-delete (`deleted_by="admin_tenant_delete"`)
- Auditadas y confirmadas sólidas: `cancelar-pendientes` (exclusión mp_preference_id ✅), `recordatorio-transferencia` (exclusión mp_preference_id ✅), `reservar/page.tsx` (usa apiSubtotal de availability API ✅), `bookings/cancel` (soft-delete + email + WA ✅), `mp/webhook` (timingSafeEqual via lib/mp-verify ✅), `billing-check` (solo suspende subscription ✅), `generate-commission-statements` (skip si 0 reservas ✅), `facturacion/page.tsx` (canSubscribe logic ✅), `/bienvenida/[booking_code]` link usa NEXT_PUBLIC_APP_URL ✅, `lib/mp-verify.ts` shared ✅, `vercel.json` (2 crons: daily orquestador + resumen-semanal) ✅
- Build: ✅ limpio. Commits: a3c6281 (ManualBookingForm) + 6b6b12c (soft-delete admin)

**Esta iteración del loop (2026-06-18 loop continuo):**
- `app/components/HomeDashboardClient.tsx`: link "Facturación" en nav — visible para todos los tenants excepto `manual_billing=true`; banner `past_due` también verifica `!manual_billing`
- `app/api/embed/[slug]/availability/route.ts`: retorna 503 si tenant suspendido — coherente con landing pública y booking API
- `app/api/bookings/route.ts`: billing check añadido para turistas — tenant suspendido retorna 503 antes de crear booking
- `app/api/bookings/bank-info/route.ts`: agrega campo `slug` del tenant a la respuesta
- `app/reservar/pago-exitoso/page.tsx`: "Volver al inicio" ahora enlaza a `/{slug}` del tenant en lugar de "/" (panel propietario)
- `app/reservar/pago-pendiente/page.tsx`: "Volver al inicio" ahora usa slug del tenant; tipo `BankInfo` actualizado con `slug`
- `ESTADO-SISTEMA.md`: P2-8 marcado como resuelto; P0-2b y P2-0b marcados como ya resueltos en roadmap
- Auditadas y confirmadas sólidas: `bienvenida/page.tsx`, `pago-pendiente/page.tsx`, `pago-fallido/page.tsx`, `reservar/page.tsx`, `lib/pricing.ts`, `ManualBookingForm.tsx`, templates Moderno + Rural, `billing/status`, `admin/onboard`, `[slug]/page.tsx`, `contact/route.ts`, `mp/status/route.ts`, `stats/route.ts`, `cabins/update/route.ts`, `NewClientOnboarding.tsx`, `lib/billing.ts`, zero dangerouslySetInnerHTML en todo el codebase ✅
- Build: ✅ limpio

**Esta iteración del loop (2026-06-18 auditoria final + migraciones):**
- `supabase/migrations/010_fix_season_prices_keys.sql`: migración para normalizar `season_prices` en cabañas creadas antes del fix (start_date/end_date → start_md/end_md). ⚠ APLICAR MANUALMENTE en Supabase SQL Editor.
- `app/dashboard/facturacion/page.tsx`: precio en botón "Activar suscripción" ahora dinámico desde `sub.plan`/`sub.amount` en lugar de hardcoded $19.990
- Auditadas y confirmadas sólidas (no requirieron cambios): billing/webhook.ts, billing/subscribe.ts, billing/status.ts, billing/commission-pay.ts, billing/ack/[token], billing/report-transfer.ts, cron/billing-check.ts, bookings/cancel.ts (orphaned blocks fix activo), bookings/route.ts (atomic RPC), lib/billing.ts, lib/parse-notes.ts, lib/booking-code.ts, lib/takai-token.ts, lib/resend.ts (emailReservaCancelada, emailNuevaReservaTurista, emailNuevaReservaDuena), dashboard/route.ts, admin/tenants/route.ts, tenant/[slug]/cabins/route.ts, vercel.json (2 crons: daily + resumen-semanal)
- Estado: 47+ API routes ✅, 13 páginas ✅, todos los crons ✅, billing V1+V2 ✅, admin billing tab ✅, XSS hardening completo ✅

**Pendientes (requieren Juan):**
- Aplicar migración 009 y 010 manualmente en Supabase SQL Editor
- [P3-4] Archivos muertos en raíz del repo (`diagnostico.txt`, `todo_el_sistema.txt`, `archivos_takai.txt`, etc.) — no borrar sin instrucción explícita

**Esta iteración del loop (2026-06-18 billing admin tab):**
- `app/api/admin/data/route.ts`: ahora retorna `subscriptions` y `statements` (últimos 2 años, máx 200 filas); tenants SELECT incluye `billing_status` y `manual_billing`
- `app/api/cron/generate-commission-statements/route.ts`: cambiado filtro de reservas de `created_at` a `check_in` (fecha de estadía, correcta para el servicio); skip de statements con `commissionAmount === 0` — no se crean filas vacías
- `lib/resend.ts` (emailCommissionStatement): `owner_name.split(" ")[0]` ahora usa `esc()` — XSS fix
- `supabase/migrations/009_subscriptions_index.sql`: 3 índices faltantes (`subscriptions.tenant_id`, `subscriptions(billing_mode,status)`, `commission_statements(tenant_id,period_year,period_month,kind)`) — ⚠ APLICAR MANUALMENTE en Supabase SQL Editor
- `app/admin/page.tsx`: pasa `subscriptions` y `statements` a `AdminDashboard`
- `app/components/AdminDashboard.tsx`: nuevo tab "Billing" (tab 7) con tabla de suscripciones y estados de cuenta; `BillingBadge` en columna "Billing" de tab Resumen y tab Clientes; `BillingTab` con filtros por cliente, modo y estado

**Esta iteración del loop (2026-06-18 hardening final):**
- `lib/resend.ts`: `header()` y `footer()` ahora usan `esc(business_name)` — las funciones compartidas no escapaban antes; también `esc(data.cabin_name)` en todos los `detailRow("Cabaña", ...)` (5 ocurrencias); `esc(owner_name.split(" ")[0])` en `emailTrialEnding` y `emailPastDue`
- `app/api/billing/ack/[token]/route.ts`: XSS fix — `htmlPage()` no escapaba `title`/`message`; `tenant.owner_name` en email de confirmación al tenant sin escapar → añadida función `he()` y usada en todos los puntos
- `app/api/billing/report-transfer/route.ts`: XSS fix — `tenant.business_name` sin escapar en email HTML al admin → `escH()` + `safeBiz`
- `app/api/billing/webhook/route.ts`: XSS fix — `owner_name` en email inline de pago de comisión sin escapar; `commission_amount` formateado con `toLocaleString` según moneda
- `app/api/bookings/cancel/route.ts`: fix — segunda limpieza de `calendar_blocks` podía borrar bloques de OTRAS reservas con mismas fechas; agregado `.is("booking_id", null)` para solo eliminar bloques huérfanos

**Esta iteración del loop (2026-06-18 loop continuo):**
- `lib/email-templates/resumen-semanal.ts`: XSS fix — `r.guest_name` y `data.owner_name` se renderizaban sin escapar; añadida función `esc()`
- `lib/email-templates/resumen-semanal.ts`: fix `WISE_ACCOUNT_PLACEHOLDER` — se mostraba literal en emails a tenants comisión; ahora usa vars de entorno `TAKAI_BANK_*` (pasadas desde route.ts); sección se oculta si `TAKAI_BANK_ACCOUNT_NUMBER` no configurado
- `app/api/emails/resumen-semanal/preview/route.ts`: 404 en producción (NODE_ENV check); solo disponible en desarrollo
- Auditados y confirmados sólidos: `app/page.tsx`, `app/admin/page.tsx`, `app/[slug]/page.tsx`, `app/reservar/pago-pendiente/page.tsx`, `app/dashboard/facturacion/page.tsx`, `app/historial/page.tsx`, `app/api/dashboard/route.ts`, `app/api/bookings/route.ts` (ya usa RPC create_booking_atomic), `vercel.json` (2 crons: daily orquestador + resumen-semanal), `app/api/cron/generate-commission-statements/route.ts`, `app/api/billing/status/route.ts`, todos los templates en `lib/resend.ts`, zero usos de `dangerouslySetInnerHTML` en todo el codebase
- Pendientes (requieren Juan): [P2-8] criterio fechas comisiones (created_at vs check_in), [P3-4] archivos muertos en raíz, migración datos season_prices en BD (cabins creadas antes del fix con start_date/end_date en lugar de start_md/end_md)

**Esta iteración del loop (2026-06-18 continuación final):**
- `app/reservar/pago-fallido/page.tsx`: número Takai hardcodeado `56955230900` reemplazado por `owner_whatsapp` del tenant obtenido dinámicamente vía `/api/bookings/bank-info`; también agrega campo `owner_whatsapp` a la respuesta de `bank-info/route.ts`
- `app/api/billing/webhook/route.ts`: email de confirmación de pago de comisión — `commission_amount` ahora formateado con `toLocaleString` según moneda (USD/COP/CLP), null guard en `owner_name.split()`
- `app/api/bookings/confirm/route.ts` + `app/api/emails/reserva-confirmada/route.ts`: **BUG IMPORTANTE** — URL del manual de bienvenida usaba `NEXT_PUBLIC_RESERVAS_URL` (reservas.takai.cl) pero la página `/bienvenida/[booking_code]` vive en panel.takai.cl; corregido a `NEXT_PUBLIC_APP_URL`; todos los huéspedes recibían link 404
- Auditados y confirmados sólidos: `pago-pendiente/page.tsx`, `pago-exitoso/page.tsx`, `pago-fallido/page.tsx`, `reservar/page.tsx`, `historial/page.tsx`, `facturacion/page.tsx`, `bookings/cancel/route.ts`, `bookings/confirm/route.ts`, `mp/create-preference/route.ts`, `mp/status/route.ts`, `billing/status/route.ts`, `billing/webhook/route.ts`, `twilio/webhook/route.ts`, `lib/whatsapp.ts`, `lib/billing.ts`, `lib/supabase-server.ts`, `lib/resend.ts`, `ManualBookingForm.tsx`, `HistorialPageClient.tsx`, `bank-info/route.ts`, `AdminDashboard.tsx`

**Esta iteración del loop (2026-06-18 auditoría final rutas):**
- `app/api/bookings/route.ts`: cascade tinaja estaba al revés (tenant antes que cabin); corregido a `cabin.tinaja_price || tenant.tinaja_price || 30000`
- `app/calendar/page.tsx`: `handleDateClick` enviaba `end_date === start_date` al crear bloque de un solo día; API lo rechazaba con 400; corregido calculando `end_date = start_date + 1 día`
- Auditadas y confirmadas sólidas (no requerían cambios): `api/bookings`, `api/calendar`, `api/dashboard`, `api/historial`, `api/availability`, `api/tenant/[slug]/cabins`, `[slug]/page.tsx`, templates TemplateModerno + TemplateRural, `calendar/page.tsx`, `HomeDashboardClient.tsx`, `CabinPhotos.tsx`, emails `reserva-confirmada`, `resumen-semanal`, `solicitar-review`, `recordatorio`

**Esta iteración del loop (2026-06-18 continuación):**
- `app/api/mp/webhook/route.ts`: duplicado de `verifyMpSignature` usaba comparación directa de strings (timing attack); ahora importa de `lib/mp-verify.ts` (timingSafeEqual) — igual que el webhook de billing
- `app/api/admin/onboard/route.ts`: período de trial corregido de 30 días a 3 meses (setMonth +3) — CLAUDE.md especifica 3 meses gratis para clientes nuevos en suscripción
- `app/api/bookings/manual/route.ts`: `tinaja_price` ahora cascada desde cabin level antes que tenant level (igual que bookings/route.ts); moneda dinámica en WhatsApp al turista y propietario (antes era "CLP 150000" sin símbolo)
- `app/api/cron/cancelar-pendientes/route.ts`: excluye reservas con `mp_preference_id IS NOT NULL` de la auto-cancelación — evita cancelar reservas MP cuyo webhook aún no llegó
- `app/api/cron/recordatorio-transferencia/route.ts`: misma exclusión `mp_preference_id IS NOT NULL` — no recordar a turistas que pagaron por MP que envíen comprobante

**Esta iteración del loop (2026-06-18 anterior):**
- `app/api/emails/solicitar-review/route.ts`: XSS fix — `guest_name`, `business_name` y `review_url` ahora escapan HTML con función `esc()` y `encodeURI()`
- `app/api/admin/cabins/route.ts` DELETE: limpia fotos de Supabase Storage antes de borrar la cabaña (fotos huérfanas eliminadas)
- `app/api/embed/[slug]/availability/route.ts`: bug crítico — el widget embebible solo chequeaba `bookings`, no `calendar_blocks`; los bloques manuales (mantenimiento, uso personal) ahora se reflejan correctamente
- `app/api/bookings/route.ts`: `tinaja_price` leído desde `tenants.tinaja_price` (no hardcodeado 30000 que fallaba para USD); moneda dinámica en mensajes WA al turista y propietario
- `app/api/calendar/route.ts` POST: validación de formato `YYYY-MM-DD` y orden `start_date < end_date` — bloques corruptos ya no pueden crearse

**Esta iteración del loop (2026-06-17 última):**
- `app/api/mp/webhook/route.ts`: moneda dinámica en WhatsApp al propietario (USD/COP/CLP) — `currency` agregado al SELECT del tenant
- `app/api/admin/tenants/route.ts` DELETE: ahora elimina también `commission_statements` y `subscriptions` — sin filas huérfanas al borrar tenant
- `app/api/billing/subscribe/route.ts`: guard para `billing_mode=commission` — clientes fundadores no pueden activar suscripción mensual por error
- `app/api/availability/route.ts`: validación UUID del `cabin_id` (previene injection en `.not("id","in",...)` concatenado); validación formato YYYY-MM-DD en fechas; check `check_in < check_out`
- `app/api/cabins/photos/route.ts` POST: sanitizar `file.name` (elimina path traversal, caracteres especiales) antes de construir clave en Supabase Storage
- Auditadas y confirmadas sólidas: `bookings/confirm`, `bookings/cancel`, `bookings/manual`, `billing/status`, `billing/report-transfer`, `billing/ack`, `billing/commission-pay`, `cron/generate-commission-statements`, `cron/billing-check`, `cron/daily`, `health`, `stats`, `contact`, `historial`, `admin/commissions`, `admin/tokens`, `cabins/update`, `cabins/update-price`, `tenant/bank`, `tenant/guidebook`, `mp/create-preference`, `mp/status`, `tenant-by-cabin`, `emails/reserva-confirmada`, `emails/solicitar-review`, `emails/recordatorio`, `twilio/webhook`

**Sprint anterior (mismo día):**

**Sprint anterior (mismo día):**
- P2-0a + P2-7: `embed/[slug]/availability` — agregado `.eq("tenant_id", tenant.id)` + filtro de fechas
- P2-1: Historial pagination — cursor-based, límite 100, botón "Cargar más"
- P2-2 + P3-3: `resumen-semanal` — comisión dinámica desde DB; género desde DB; constante hardcodeada removida
- P2-3: `lib/whatsapp.ts` — parámetros opcionales para evitar DB extra query
- P2-4: `lib/audit.ts` — acepta SupabaseClient opcional
- P2-5: `app/api/health/route.ts` — N+1 eliminado; 2 queries batch
- P3-2: `app/api/admin/cabins/route.ts` — bug variable descartada corregido
- P1-2: Verificado como ya resuelto
- `admin/onboard`: crea fila `subscriptions` al onboardear tenant nuevo
- `resumen-semanal`: bugfix comisión ÷100
- `billing/ack`: import muerto eliminado

**Esta iteración del loop (sesión previa):**
- `lib/resend.ts`: corrección de moneda en emails `emailNuevaReservaTurista`, `emailNuevaReservaDuena`, `emailTrialEnding` — todas hardcodeaban "CLP" para todos los tenants; GlampingCacagual (USD) recibía emails con "CLP" incorrecto
- `app/api/emails/nueva-reserva/route.ts`: agregado `currency` al SELECT de tenants; propagado a ambos emails
- `app/api/cron/billing-check/route.ts`: agregado `currency` al SELECT de tenants; propagado a `emailTrialEnding`
- Auditados: `bookings/confirm`, `bookings/cancel`, `mp/webhook`, `cancelar-pendientes`, `recordatorio-transferencia`, `generate-commission-statements`, `billing-check`, `solicitar-review`, `report-transfer`, `billing/status`, `dashboard/facturacion` — todos sólidos
- P0-2b verificado como ya resuelto: `/api/bookings/route.ts` ya usa RPC `create_booking_atomic`
- P3-5 verificado como ya resuelto: `review_sent_at` y `mp_preference_id` ya documentados en CLAUDE.md

**Esta iteración del loop (2026-06-17 continuación):**
- `app/api/cabins/photos/route.ts` DELETE: **bug TOCTOU corregido** — el storage se borraba ANTES de verificar propiedad; ahora se verifica que la foto pertenece al tenant antes de borrar del storage. También agrega verificación que la URL existe en `cabins.photos`.
- `app/api/mp/create-preference/route.ts`: `currency_id` dinámico desde `tenant.currency` en lugar de hardcodeado "CLP"
- `app/api/availability/route.ts`: validación UUID regex en parámetro `visited` (previene SQL injection)
- `app/[slug]/templates/TemplateClasico.tsx`: `extra_services` precio usa `fmt(svc.price)` en lugar de `es-CL` hardcodeado
- Auditados y confirmados sólidos: `stats`, `historial`, `dashboard`, `calendar/delete`, `cron/daily`, `admin/tokens`, `admin/commissions`, `bookings/bank-info`, `tenant/[slug]/cabins`, `embed/[slug]/availability`, `tenant/bank`, `tenant/guidebook`, `cabins/update`, `billing.ts`, `reservar/page.tsx`, `HomeDashboardClient.tsx`, landing templates (Moderno, Rural)

**Esta iteración del loop (2026-06-17 final):**
- `lib/email-templates/resumen-semanal.ts`: eliminado `TAKAI_COMMISSION_RATE` hardcodeado, reemplazado `clp()` con `mkFmt(currency)` dinámico, todas las funciones internas usan `fmt` y `commissionRate` como parámetros
- `app/api/emails/resumen-semanal/route.ts`: pasa `currency` y `commission_rate` a `generarResumenSemanal`
- `app/api/admin/data/route.ts`: reemplaza `.limit(2000)` con filtro de 2 años (created_at >= año-anterior-01-01) — stats siempre correctas sin depender de límite arbitrario
- `app/api/calendar/route.ts`: agrega params opcionales `start`/`end` para filtrar `calendar_blocks` por rango de fechas
- `app/calendar/page.tsx`: pasa ventana de 18 meses (3 atrás + 15 adelante) al cargar bloques del calendario
- `app/api/billing/webhook/route.ts`: agrega `.eq("tenant_id", stmt.tenant_id)` al UPDATE de commission_statements (P2-0b — defensa en profundidad)
- Auditados y confirmados sólidos: `cancelar-pendientes`, `recordatorio-transferencia`, `bookings/route.ts`, `emails/recordatorio`, `admin/onboard`

**Estado:** Build OK. Todo deployado en producción (Vercel auto-deploy)

---

## Porcentaje de completitud por área

| Área | % Completo | Notas |
|------|-----------|-------|
| Reservas (turista) | 99% | RPC atómico ✅; tinaja desde tenant ✅; moneda dinámica ✅; billing guard 503 ✅; redirect pago ✅ |
| Reservas (propietario panel) | 100% | Preview season-aware ✅; extras fix ✅; tinaja cascade ✅; moneda dinámica WA ✅ |
| Calendario | 97% | Validación fecha POST ✅; filtro de fechas en API ✅; ventana 18 meses ✅ |
| Billing / Comisiones | 99% | Trial 3 meses ✅; guard comisión ✅; cleanup al borrar tenant ✅; nav link facturación ✅; P2-8 check_in ✅ |
| Directorio B2C / Referidos | 99% | Copy y CTA ✅; `ref` end-to-end ✅; catálogo ✅; proyecto Vercel + deploy + Git auto-deploy ✅; Melipeuco agregado ✅; falta dominio personalizado + Search Console |
| Landing pública del tenant | 98% | 5 plantillas ✅; mapa + "Cómo llegar" ✅; privacidad pre-pago ✅; falta cargar geo de los tenants existentes en BD |
| Alta self-service | 90% | Wizard + API + cobro `setup_fee` + webhook + tab Altas ✅; probado en producción ✅; falta subir fotos desde el wizard (hoy se suben luego en el panel) |
| Emails (Resend) | 100% | Moneda dinámica ✅; XSS fix en todos los templates ✅; bank data dinámico en resumen-semanal ✅ |
| WhatsApp (Twilio) | 99% | HMAC-SHA1 ✅; moneda dinámica en WA turista y propietario ✅ |
| MercadoPago (turistas) | 98% | currency_id dinámico; deleted_at check OK |
| MercadoPago (billing) | 97% | timingSafeEqual en webhook tenant MP ✅; guard commission en subscribe ✅ |
| RLS / Seguridad BD | 99% | Todos los P0/P1 resueltos; timing-safe en AMBOS webhooks MP ✅ |
| Índices BD | 95% | Índices aplicados en producción vía 008_indexes.sql |
| Paginación | 90% | Historial cursor paginado ✅; admin bookings por rango fechas ✅ |
| Zonas horarias | 60% | Todos los cálculos en UTC; Chile/Ecuador pueden tener desfases |
| Validación inputs públicos | 95% | UUID+fecha ✅; sanitización filename ✅; calendario POST fechas ✅ |
| Admin panel | 99% | Token via header ✅; cleanup fotos ✅; Billing tab ✅; soft-delete en delete ✅ |
| Embed widget | 99% | calendar_blocks incluidos ✅; 503 si suspendido ✅ |
| Crons | 95% | Orquestador daily ✅; exclusión MP en cancelar y recordatorio ✅ |
| Health check | 98% | N+1 eliminado ✅; batch queries |

---

**Sesión 2026-08-04 (parte 2) — Programa de referidos operativo (instrucción de Juan):**

- 🔴 **El programa de referidos era inoperable.** La API `/api/admin/affiliates` existía desde junio, pero **no había ninguna interfaz**: cuando alguien escribía por WhatsApp queriendo ser partner, no había forma de darlo de alta desde el panel. Nuevo componente `app/components/AfiliadosTab.tsx` (tab **Afiliados** en `/admin`): crear partner, listar, activar/desactivar y entregar sus 3 links con botón de copiar. El token se muestra **una sola vez** (en BD solo queda el hash).
- 🆕 **Segunda vía de ingreso — comisión por traer alojamientos** (decisión de Juan): además del % por reservas de turistas, se paga una comisión por cada alojamiento que el partner incorpore. Requería tracking que no existía: **migración 015 aplicada** (`tenants.referred_by_affiliate_id` + índice parcial). `/registro` captura `?ref=` (persistido en `sessionStorage` por si el dueño recarga a mitad del wizard) y `/api/registro` lo resuelve contra afiliados activos. El tab **Altas** ahora muestra quién trajo cada alojamiento, que es lo que define a quién pagarle.
- **Prueba E2E completa del recorrido del influencer, contra producción:** partner creado por la API real del admin → recomienda un alojamiento con su link → el dueño se registra y queda atribuido → Juan aprueba y la landing publica → un turista reserva con el link (`booking_source=affiliate` + `affiliate_id`) → el dueño confirma → **el panel del partner muestra 1 reserva, $360.000 y $18.000 ganados (5% exacto)**. Todos los datos de prueba borrados; la BD quedó con los 7 tenants reales y sus 14 reservas intactas.
- **Copy de la landing corregido** (`takai-landing`, commit `bea33dc`): eliminada la frase "Pagamos juntos"; eliminada **toda** mención a que la comisión del partner sale del 10% de Takai (ni referentes ni propietarios deben conocer esa estructura); el porcentaje del partner pasa a **5% publicado explícito**; nueva sección "Dos formas de ganar"; y se rehizo el simulador, que mostraba literalmente "Comisión Takai (10%)" y "se liquida de ahí".

**Sesión 2026-08-05 — Liquidación de partners operativa (instrucción de Juan):**

**Regla de negocio confirmada por Juan y ahora implementada:** traer un alojamiento se paga **una sola vez** y ahí termina la relación con ese centro. Si ese centro después recibe reservas sin el link del partner, el 10% es **íntegro de Takai**. El partner solo vuelve a ganar trayendo turistas por su link (5% por reserva, acumulable sin tope). Verificado en producción con dos reservas al mismo centro: la que pasó por el link pagó 5%, la que llegó sin link no pagó nada.

- **Migración 016 aplicada:** `tenants.referral_fee_amount`, `tenants.referral_paid_at`, `bookings.affiliate_paid_at` + índice parcial. Sin esto no había forma de saber qué comisión ya se liquidó.
- **`lib/referral.ts`:** tramos por tamaño del centro — 1 a 5 alojamientos $30.000, 6 a 10 $50.000, más de 10 **a convenir** (el monto lo escribe Juan; el sistema no lo inventa). `REFERIDO_DESDE` se deriva de los tramos para publicar "desde $X" sin repetir el número a mano.
- **`/api/admin/affiliates` GET reescrito:** devuelve por partner los alojamientos traídos (con tramo y monto), las reservas generadas (con su 5%), el reparto del 10% (cuánto al partner, cuánto neto para Takai) y **cuánto hay que pagarle ahora**. Un centro no suma al total hasta estar publicado.
- **`/api/admin/affiliates/pay` (nuevo):** marca pagado centro o reserva, acepta el monto acordado en los casos "a convenir", permite deshacer, y deja audit log.
- **Tab Afiliados rediseñado:** total por pagar arriba en grande, tarjeta por partner con los dos bloques separados y botón de pago en cada línea.
- **Panel del partner rehecho:** link principal del directorio, link para recomendar alojamientos y **link por cabaña con botón copiar** (antes tenía que armar las URLs a mano), más la explicación de que solo cuentan las reservas que pasan por su link.
- **Prueba E2E en producción:** partner creado → dos centros referidos (3 cabañas → $30.000 automático; 12 cabañas → a convenir, se acordaron $120.000) → ambos aprobados y pagados → reserva de $320.000 por su link → 10% = $32.000 repartido en $16.000 partner / $16.000 neto Takai → liquidado. Total volvió a $0 con histórico de $166.000. Datos de prueba borrados; BD con 7 tenants reales y 14 reservas intactas.
- **Landing actualizada** (`takai-landing`, commit `2c53141`): tramos "desde $30.000" con el detalle visible, eliminada la palabra **"nunca"** de la promesa de no cobrar mensualidad (ataba las manos para una eventual cuota anual), y aclarado que traer un alojamiento se paga una vez mientras el 5% solo aplica a reservas que pasan por el link del partner. También se commitearon los archivos sueltos de otra sesión (`.claude/`, `AGENTS.md`, `public/ia/` → la landing de la agencia quedó publicada en `takai.cl/ia/`).
- **Documentos nuevos:** `TRASPASO-TAKAI-LANDING.md` (para pasarle al chat de la landing todo lo que cambió y sus pendientes) y `PROMPT-MAESTRO-DIRECTORIO.md` (prompt maestro definitivo para que Opus construya el directorio en un chat dedicado; sustituyó al `PROMPT-DIRECTORIO.md` inicial). Decisiones de arquitectura selladas en ese documento: se evoluciona `directorio/` (no página nueva, no CRM externo — `/admin` es el CRM hasta ~100 centros), reservar lleva SIEMPRE al motor de Takai con `source=directory`, el agente es takai-agent (no se construye otro). Fase 0 del prompt: tabla `places` (región→comuna→localidad/sector) con FK desde tenants, porque hoy la comuna se adivina por match de texto contra 5 destinos hardcodeados — insostenible a 100+ centros. Verticales futuros (restaurantes con carta, agencias) diseñados sobre `places` pero explícitamente prohibido construirlos antes de que el directorio de cabañas facture.

**Recomendación de modelo de cobro entregada a Juan (2026-08-05):** mantener entrada + 10% durante Melipeuco y los próximos meses — hoy el directorio aún no puede entregar el 10% (sin dominio y sin fotos), así que cobrar mensualidad sería cobrar por algo no prestado. Si más adelante hace falta ingreso recurrente, **cuota anual, no mensualidad pausable**: la pausa destruye la previsibilidad de caja y agrega estados de billing innecesarios. Gatillo para revisar: tres meses seguidos con reservas Takai-generadas sostenidas. El sistema ya soporta cobrar mensualidad por cliente cambiando un dato (`subscriptions.amount`), sin tocar código.

---

## Pendientes para llegar al 100% (estado 2026-08-05)

### Solo Juan puede hacerlo (no es código)
1. **Dominio del directorio B2C** + verificarlo en Google Search Console. Hoy vive en `takai-directorio.vercel.app`; sin dominio propio el SEO no despega y la propuesta promete "que lo encuentren en Google".
2. **Cargar ubicación GPS de los tenants actuales** (`location_text`, `latitude`, `longitude`) desde `/admin`. El código ya muestra mapa y "Cómo llegar" en las 5 plantillas, pero majoaal/el-mirador/cacagual no tienen coordenadas → esa sección no aparece.
3. **Probar `+56957083477` desde un número no-admin** y setear `NEXT_PUBLIC_AGENT_WHATSAPP` en Vercel (owner-dashboard + directorio). Mientras esté vacío, los botones caen al chat web.
4. **Ficha de Google (GBP) por cliente** → pegar `google_review_url`. Sin eso el email post-estadía solo ofrece reseña en Takai, no en Google.
5. **Fotos de las cabañas**: el directorio solo publica cabañas con 8+ fotos y geo válida (`lib/cabin-validation.ts`). Hoy ninguna cumple → el directorio se ve vacío.
6. **Revisar `cabanas-takai`**: está `active=true` con `billing_status=suspended` y 8 reservas activas. Si es la demo, conviene decidir si se publica o se archiva.

### Código pendiente (siguiente sesión)
7. **Subir fotos desde el wizard `/registro`** — hoy el dueño se da de alta y paga, pero las fotos las carga después desde su panel. Es lo que falta para que el alta sea realmente de punta a punta.
8. **Índice `calendar_blocks(booking_id)`** — hoy no existe; `bookings/cancel`, `calendar/delete` y el filtro nuevo de los crons hacen scan. Irrelevante con el volumen actual (decenas de filas); necesario antes de ~50 clientes.
9. **Facturar el 10% a clientes en suscripción está implementado pero nunca se ejecutó de verdad** (no hay aún reservas Takai-generadas de un cliente en el modelo nuevo). Verificar con el primer caso real.
10. **Zonas horarias (P2-6)**: todo corre en UTC. Sin impacto práctico hoy; revisar si entra un cliente en otra zona.

---

## Hallazgos de auditoría — clasificados por prioridad

### P0 — Bloqueante para escala o datos en producción

#### ~~P0-1: CERO índices explícitos en BD~~ ✅ RESUELTO 2026-06-13
**Migración aplicada:** `supabase/migrations/008_indexes.sql` aplicada en producción.
**Índices creados:** `idx_bookings_tenant_status`, `idx_bookings_cabin_dates`, `idx_bookings_booking_code`, `idx_bookings_guest_phone`, `idx_bookings_check_in`, `idx_calendar_blocks_cabin_dates`, `idx_calendar_blocks_tenant`, `idx_audit_log_tenant`, `idx_commission_statements_tenant`.
**También aplicado en 008:** columnas `mp_preference_id` y `review_sent_at` en `bookings`, función RPC `create_booking_manual`.

#### ~~P0-2: Race condition en bookings/manual~~ ✅ RESUELTO 2026-06-13
**Fix aplicado:** `/api/bookings/manual` migrado a RPC `create_booking_manual` (advisory lock + conflict check atómico dentro de una transacción PostgreSQL). Función definida y aplicada en `supabase/migrations/008_indexes.sql`.

---

### P1 — Seguridad o funcionalidad degradada en producción

#### ~~P1-1: /api/twilio/webhook sin verificación de firma~~ ✅ RESUELTO 2026-06-13
**Fix aplicado:** Función `validateTwilioSignature()` implementada — HMAC-SHA1 sobre URL + params ordenados, comparación timing-safe con `crypto.timingSafeEqual`. Retorna 403 si la firma no coincide.

#### ~~P1-2: ADMIN_TOKEN en URL → aparece en logs de acceso~~ ✅ YA ESTABA RESUELTO
**Verificado 2026-06-17:** `app/admin/page.tsx` ya es un Client Component con form de login + `sessionStorage` + header `x-admin-token`. El token NUNCA aparece en la URL. El API route `/api/admin/data` recibe `x-admin-token` como header.

#### ~~P1-3: XSS en email de contacto~~ ✅ RESUELTO 2026-06-13
**Fix aplicado:** Función `escapeHtml()` en `app/api/contact/route.ts`.

#### ~~P1-4: Cron recordatorio aborta si un email falla~~ ✅ RESUELTO 2026-06-13
**Fix aplicado:** try-catch individual por booking en el loop.

#### ~~P1-5: mp/create-preference no verifica deleted_at~~ ✅ RESUELTO 2026-06-13
#### ~~P1-6: mp/status no verifica deleted_at~~ ✅ RESUELTO 2026-06-13

---

### P2 — Funcionalidad degradada o deuda técnica significativa

#### ~~P2-0a: embed/availability sin tenant_id explícito~~ ✅ RESUELTO 2026-06-17
**Fix:** `.eq("tenant_id", tenant.id)` agregado al query de bookings.

#### ~~P2-0b: billing/webhook — query commission_statements sin tenant_id~~ ✅ RESUELTO 2026-06-17
**Fix:** `.eq("tenant_id", stmt.tenant_id)` agregado al UPDATE — defensa en profundidad.

#### ~~P2-1: Sin paginación en historial~~ ✅ RESUELTO 2026-06-17
**Fix:** `/api/historial` acepta `cursor` (ISO timestamp) + `limit=100`, devuelve `next_cursor`. `HistorialPageClient` acumula páginas con botón "Cargar más".

#### ~~P2-2: Resumen semanal usa comisión hardcodeada~~ ✅ RESUELTO 2026-06-17
**Fix:** Join con `subscriptions(commission_rate, billing_mode)`; usa `commission_rate` dinámico.

#### ~~P2-3: lib/whatsapp.ts hace DB query por cada mensaje~~ ✅ RESUELTO 2026-06-17
**Fix:** Parámetros opcionales `whatsappEnabled`/`twilioWhatsappNumber` para skip de DB.

#### ~~P2-4: lib/audit.ts crea nuevo cliente Supabase por llamada~~ ✅ RESUELTO 2026-06-17
**Fix:** Acepta `SupabaseClient` opcional como segundo parámetro.

#### ~~P2-5: N+1 queries en /api/health~~ ✅ RESUELTO 2026-06-17
**Fix:** `Promise.all` con 2 queries batch; `Set` para lookup O(1).

#### P2-6: Zonas horarias UTC vs Chile/Ecuador
**Riesgo bajo** — los crons corren 09:00 UTC = 06:00 Chile, sin conflicto práctico.
**Decisión:** Posponer hasta que haya tenant en otra zona horaria con problemas reales.

#### ~~P2-7: embed/availability carga reservas sin rango de fechas~~ ✅ RESUELTO 2026-06-17
**Fix:** `.lt("check_in", windowEndStr).gt("check_out", windowStartStr)` en el query.

#### ~~P2-8: generate-commission-statements mide por created_at, no check_in~~ ✅ RESUELTO 2026-06-18
**Fix:** Cambiado a filtrar por `check_in` (fecha de estadía). Comisiones se atribuyen al mes en que ocurrió la reserva, no cuando se creó el booking.

---

### P3 — Código limpio y consistencia

#### P3-1: 35+ rutas usan createClient directo
**Impacto:** Inconsistencia de estilo. Funciona igual. Bajo.

#### ~~P3-2: admin/cabins update bug variable descartada~~ ✅ RESUELTO 2026-06-17
**Fix:** `q = q.eq("tenant_id", ...)` (era `q.eq(...)` ignorando el retorno — el filtro nunca se aplicaba).

#### ~~P3-3: resumen-semanal detecta género por heurística~~ ✅ RESUELTO 2026-06-17
**Fix:** Usa `tenants.gender` de la DB; fallback a heurística si null.

#### ~~P3-4: Archivos muertos en raíz del repo~~ ✅ RESUELTO 2026-07-04
**Instrucción explícita de Juan.** Los archivos listados ya no existían; se limpió el gitlink `claude-webkit`, la carpeta vacía `landing/` y se des-trackeó `tsconfig.tsbuildinfo`.

#### P3-5: review_sent_at y mp_preference_id no documentadas en CLAUDE.md schema
**Fix:** Ya aplicadas en producción vía 008_indexes.sql. CLAUDE.md debería documentarlas.

---

## Roadmap hacia el 100%

### ✅ Sprint 2026-06-13 — Seguridad crítica
- P0-1 Índices BD, P0-2 Race condition, P1-1 Firma Twilio, P1-3 XSS, P1-4 Loop resiliente, P1-5/P1-6 deleted_at en MP, P0-3 auth en 3 endpoints

### ✅ Sprint 2026-06-17 — Optimización y completitud
- P2-0a + P2-7 (embed queries), P2-1 (historial paginado), P2-2 + P3-3 (comisión/género dinámico), P2-3 (whatsapp), P2-4 (audit), P2-5 (health N+1), P3-2 (admin cabins bug)
- P1-2 verificado como ya resuelto

### Pendiente (antes de 10 clientes)
1. ~~[P2-8] Confirmar con Juan: ¿comisiones por `created_at` o `check_in`?~~ ✅ check_in implementado
2. ~~[P3-4] Limpiar archivos muertos en raíz~~ ✅ Resuelto 2026-07-04 con OK de Juan

### Pendiente (antes de 50 clientes)
4. ~~[P2-1b] Paginación en admin dashboard~~ ✅ Resuelto: filtro por 2 años reemplaza `.limit(2000)`
5. ~~[P2-1c] Rango de fechas en `/api/calendar`~~ ✅ Resuelto: params start/end opcionales; cliente pasa 18 meses
6. [P2-6] Timezone-aware para crons (baja urgencia)
7. ~~[P0-2b] Aplicar `create_booking_manual` en el formulario del turista también~~ ✅ Ya usa RPC `create_booking_atomic`
8. ~~[P2-0b] billing/webhook + tenant_id~~ ✅ Resuelto: `.eq("tenant_id", stmt.tenant_id)` agregado

---

## Integraciones — estado confirmado

| Integración | Estado | Notas |
|------------|--------|-------|
| MercadoPago Marketplace (turistas) | ✅ Activo | HMAC verificado |
| MercadoPago Billing (Takai) | ✅ Activo | Webhook, preapproval, commission pay |
| Twilio WhatsApp | ✅ Activo | HMAC-SHA1 verificado ✅ |
| Resend emails | ✅ Activo | Loop resiliente ✅ |
| FullCalendar | ✅ Activo | |
| Recharts stats | ✅ Activo | |
| Vercel Analytics | ✅ Activo | |
| Vercel Crons | ✅ Activo | Orquestador `/api/cron/daily` + resumen-semanal |

---

## Historial de sesiones

| Fecha | Qué se hizo |
|-------|------------|
| 2026-08-03 | Auditoría pre-propuesta Melipeuco. Nuevo modelo de precios ($160k entrada + 10% Takai, sin mensualidad) implementado en onboard/facturación/docs. Fix contradicción countdown 12h vs cancelación 3h (lib/auto-cancel.ts). Statements del 10% visibles/pagables para clientes subscription. Melipeuco agregado al directorio. |
| 2026-07-31 | Auditoría y cierre de portada del directorio: nuevo programa de referidos, copy corregido, catálogo completo, propagación segura de `ref` y conservación de atribución al cambiar a una cabaña sugerida. Builds y QA visual desktop/móvil OK. |
| 2026-06-12 | Auditoría total (solo lectura). Creados ESTADO-SISTEMA.md y actualizado CLAUDE.md. |
| 2026-06-12 | Sprint seguridad: P0 auth, P1 (Twilio HMAC, XSS, loop, deleted_at MP), RPC atómico, índices BD. |
| 2026-06-13 | Corrección documentación: CLAUDE.md y ESTADO-SISTEMA.md con info correcta de clientes y modelo de negocio. |
| 2026-06-17 | Sprint optimización: P2-0a, P2-1 (paginación), P2-2/P3-3 (comisión/género dinámico), P2-3 (whatsapp), P2-4 (audit), P2-5 (health), P2-7 (embed fechas), P3-2 (admin bug). P1-2 verificado. Onboard crea subscription row. Bugfix crítico comisión ÷100. Fix moneda en emails turista (USD/COP/CLP dinámico en emailNuevaReservaTurista, emailNuevaReservaDuena, emailTrialEnding). P0-2b y P3-5 verificados como ya resueltos. |
| 2026-06-17 | Auditoría completa de todas las rutas API. Fixes: TOCTOU en foto DELETE (verificar propiedad antes de borrar storage); currency_id dinámico en MP preference; UUID regex en availability visited param; extra_services fmt() en TemplateClasico. 40+ rutas verificadas y confirmadas sólidas. |
| 2026-06-17 | Sprint final: resumen-semanal con moneda+comisión dinámicas; admin/data con filtro de 2 años (P2-1b); calendar API con start/end params (P2-1c); billing/webhook con tenant_id en UPDATE (P2-0b). Auditados: cancelar-pendientes, recordatorio-transferencia, bookings/route, recordatorio, admin/onboard — todos sólidos. |
| 2026-06-18 | XSS fix en solicitar-review (esc() en guest_name/business_name/review_url); cabin delete limpia Storage; embed widget ahora incluye calendar_blocks (bloques manuales se mostraban como disponibles — bug crítico); tinaja_price desde tenants (no hardcoded 30000); moneda dinámica en WA de nueva reserva turista y propietario; validación fecha POST /api/calendar. |
| 2026-06-18 (cont.) | Timing attack en mp/webhook tenant (duplicate verifyMpSignature → ahora importa timingSafeEqual de lib/mp-verify); trial 3 meses en onboard (era 30 días); tinaja cascade cabin→tenant en bookings/manual; moneda dinámica en WA de reserva manual; exclusión mp_preference_id en crons cancelar-pendientes y recordatorio-transferencia (evita cancelar reservas MP con webhook demorado). |
| 2026-06-18 (loop) | XSS fix en resumen-semanal (guest_name sin escapar); WISE_ACCOUNT_PLACEHOLDER reemplazado por TAKAI_BANK_* env vars; preview email protegido con NODE_ENV check. Auditoría final: admin/page, [slug]/page, pago-pendiente/page, facturacion/page, historial/page, dashboard/route, generate-commission-statements, billing/status, vercel.json — todos sólidos. Zero dangerouslySetInnerHTML en el codebase. |
| 2026-07-10 | Agente WhatsApp enlazado a todos los clientes (botón por cabaña activo por defecto; sendWhatsApp sin gate legacy twilio_whatsapp → nuevos clientes enlazados al ingreso). Billing manual: botones Suspender/Activar en admin (POST /api/admin/billing); auto-suspensión del cron apagada (BILLING_AUTO_SUSPEND para reactivar). |
| 2026-07-04 | Revisión de pendientes: contradicción #1 resuelta (email al turista en cron cancelar-pendientes); reseñas en directorio B2C (data + schema aggregateRating + UI). Verificado feature/motor-reservas mergeada en main. |
| 2026-06-18 (hardening) | XSS fix en billing/ack (htmlPage sin escapar title/message/owner_name); billing/report-transfer (business_name en email admin); billing/webhook (owner_name en email de pago); fix bookings/cancel (limpieza secundaria de calendar_blocks podía borrar bloques de OTRAS reservas con mismas fechas — .is("booking_id", null) agregado). Hardening final lib/resend.ts: header()/footer() ahora usan esc(business_name), detailRow("Cabaña") usa esc(cabin_name) en los 5 templates, emailTrialEnding/emailPastDue usan esc(owner_name) — XSS audit de lib/resend.ts 100% completo. |
