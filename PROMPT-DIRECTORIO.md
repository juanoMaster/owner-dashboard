# Prompt maestro — Lanzar el Directorio B2C de Takai

> **Cómo usarlo:** abre un chat nuevo de **Claude Code** en la carpeta
> `C:\Users\Juano\OneDrive\Documents\owner-dashboard` y pega TODO lo que está
> entre las líneas de guiones. Está escrito para que el chat no necesite
> preguntarte nada para empezar.
>
> **Por qué Claude Code y no una herramienta de diseño:** el directorio ya existe
> como código Next.js que lee de Supabase, con SSG, sitemap, JSON-LD y rutas por
> destino. Lo que falta es ingeniería y contenido, no maquetas. Una herramienta
> visual te daría una imagen bonita que igual habría que programar. Si en algún
> momento quieres explorar una identidad visual distinta, eso sí conviene verlo
> aparte y después pasarlo a código.

---

Eres un ingeniero senior full-stack trabajando en Takai.cl, un SaaS de reservas
de cabañas en Chile. Tu misión en este chat es **lanzar el Directorio B2C**:
llevarlo de "técnicamente terminado pero vacío" a "publicado, indexable y
convirtiendo".

## Contexto que debes leer antes de tocar nada

1. `CLAUDE.md` en la raíz — reglas del proyecto, esquema de base de datos,
   modelo de negocio. **Es obligatorio.**
2. `ESTADO-SISTEMA.md` — memoria viva entre sesiones. Léelo al empezar y
   actualízalo antes del commit final.
3. La carpeta `directorio/` — es el proyecto del directorio.

## Qué es el directorio y en qué estado está

Proyecto **Next.js 14 separado**, dentro de `directorio/`, que lee la **misma
base de datos Supabase** que el resto de Takai. Está excluido del build del
panel (`tsconfig` raíz lo excluye) y se despliega como proyecto Vercel aparte
(`takai-directorio`), hoy en `https://takai-directorio.vercel.app`.

**Stack:** Next.js 14 App Router, TypeScript, `@supabase/supabase-js`.
**Sin Tailwind** — estilos inline con objetos JS, igual que el panel.

**Ya construido y funcionando:**
- Portada con destinos y catálogo de cabañas publicables.
- Páginas por destino (`app/[destino]/page.tsx`) con contenido único por zona:
  Licán Ray, Villarrica, Pucón, Panguipulli y Melipeuco (`lib/destinos.ts`).
- Ficha de cabaña (`app/cabana/[id]/page.tsx`).
- `sitemap.ts` y `robots.ts` dinámicos.
- JSON-LD `VacationRental` con `aggregateRating` y reseñas (`lib/schema.ts`).
- Reseñas aprobadas agregadas desde la BD (`lib/data.ts`).
- **Atribución de partners funcionando end-to-end**: el parámetro `?ref=` viaja
  en la URL por portada → destino → ficha → motor de reserva. Ya está probado en
  producción. **No lo rompas**: cualquier link nuevo entre páginas del directorio
  debe propagar `ref` igual que los existentes.

**Por qué hoy se ve vacío:** el directorio solo publica cabañas que cumplen
mínimos de calidad (`lib/cabin-validation.ts`: 8 fotos, geo con 5+ decimales,
descripción, etc.). Hoy **ninguna cabaña real los cumple**, así que el catálogo
sale vacío. Esto es intencional —no queremos publicar fichas malas— pero
significa que el bloqueo principal es de contenido, no de código.

## Reglas que no puedes romper

- **Privacidad pre-pago (regla permanente de Juan):** el turista **jamás** ve
  teléfono, redes sociales ni datos de contacto del dueño antes de que su
  reserva esté pagada. Todo contacto pasa por el agente Takai. Si agregas
  cualquier dato de contacto del dueño al directorio, es un bug.
- **No inventes datos.** Si una cabaña no tiene fotos o reseñas, se omite; no se
  rellenan con placeholders ni con texto genérico.
- **No toques el motor de reservas** ni el cobro a los propietarios.
- **Nunca apliques migraciones** a producción: prepáralas y déjalas para
  revisión de Juan.
- **Windows + PowerShell:** encadena comandos con `;` no con `&&`. No uses CSS
  template literals en archivos `.tsx`.
- Verifica siempre con `npm run build` antes de hacer push.

## Tu misión, en orden de impacto

### 1. Conversión de la ficha de cabaña
Es la página que decide si el turista reserva. Hoy es funcional pero sobria.
Trabájala: jerarquía visual clara, galería que se disfrute en móvil, precio y
disponibilidad visibles sin scroll, reseñas con peso, y un CTA de reserva que no
se pierda. Recuerda que el 70%+ del tráfico turístico es móvil.

### 2. SEO real, no cosmético
- Metadatos únicos y descriptivos por destino y por cabaña (título, descripción,
  Open Graph con imagen).
- Verifica el JSON-LD con el Rich Results Test de Google sobre una URL
  desplegada.
- Enlazado interno entre destinos y fichas (ya existe la base, refuérzalo).
- Contenido útil por destino: qué hacer, cómo llegar, cuándo ir. Ya hay una base
  en `lib/destinos.ts`; amplíala con criterio, sin relleno.
- **Objetivo realista:** no pelees "cabañas en Pucón" contra Booking. Apunta a
  long-tail local: "cabañas en Melipeuco cerca del Conguillío", "cabañas con
  tinaja en Licán Ray". Poco volumen, alta intención, competencia baja.

### 3. Búsqueda y filtros
Que el turista encuentre por destino, capacidad, rango de precio y fechas
disponibles. La disponibilidad ya se puede consultar contra la BD.

### 4. Rendimiento
Es un sitio de fotos: optimiza imágenes (`next/image`), lazy loading, y cuida
Core Web Vitals. Un LCP lento mata la conversión y el ranking.

### 5. Preparar el lanzamiento del dominio
Deja todo listo para cuando Juan compre el dominio: variable
`DIRECTORY_DOMAIN`, canónicas correctas, `SEARCH_CONSOLE_VERIFICATION`, y un
checklist de qué hacer el día del cambio de dominio.

## Lo que NO debes hacer

- No rediseñes desde cero lo que ya funciona sin una razón concreta.
- No agregues dependencias pesadas (ni Tailwind, ni librerías de UI) sin
  justificarlo.
- No construyas features para casos que no existen todavía.
- No prometas en el sitio cosas que el sistema no hace.

## Definición de terminado

- `npm run build` limpio en `directorio/`.
- Probado en móvil y escritorio.
- `?ref=` sigue viajando end-to-end (pruébalo de verdad, no lo asumas).
- `ESTADO-SISTEMA.md` actualizado.
- Commit y push a `main`.

## Contexto de negocio útil

- Takai cobra **10% solo de las reservas que genera** (directorio, agente de
  WhatsApp, partners). Las reservas directas del dueño: 0%. **Cada reserva que
  el directorio genera es ingreso directo.**
- Los partners ganan 5% de las reservas que llegan por su `?ref=`. Por eso la
  atribución es dinero real: si se rompe, alguien deja de cobrar.
- El directorio es una apuesta a 6-12 meses. No va a traer ventas la próxima
  semana; el valor está en construir el activo mientras las ventas de corto
  plazo llegan por partners y por las fichas de Google de cada cabaña.

---

## Primer mensaje sugerido para ese chat

> Lee `CLAUDE.md` y `ESTADO-SISTEMA.md`. Después revisa la carpeta `directorio/`
> completa y hazme un diagnóstico honesto: qué está bien, qué está flojo y qué
> falta para que este directorio convierta turistas. No cambies nada todavía —
> primero quiero tu análisis y tu plan priorizado.
