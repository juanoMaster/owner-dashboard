# Takai — Directorio B2C (proyecto separado)

Motor pasivo de reservas: sitio público orientado al turista que **lee de la misma
base Supabase** que `takai.cl`, sale en Google por SEO, y **canaliza al turista al
motor de reservas existente** (`reservas.takai.cl/reservar`). NO duplica la lógica
de reserva: descubre + atrae + envía.

Va en **dominio aparte** (B2C) para mantener `takai.cl` 100% B2B.

## Arquitectura
- Next.js 14 (App Router), SSG/ISR (`revalidate = 3600`) → rápido = mejor SEO.
- Lee `cabins` + `tenants` activos, no eliminados y **publicables** (8+ fotos, geo
  con 5+ decimales, datos mínimos — ver `lib/data.ts` `isPublishable`). Una cabaña
  incompleta no se publica (evita SEO inválido).
- Schema `VacationRental` JSON-LD por cabaña (`lib/schema.ts`) + `BreadcrumbList`.
- Sitemap dinámico (`app/sitemap.ts`) y `robots.ts` → se regeneran al agregar una
  cabaña (onboarding self-service, Fase 10).
- Páginas de destino con **contenido único** (`lib/destinos.ts`): Licán Ray,
  Villarrica, Pucón, Panguipulli, con sección de teletrabajo / nómada digital.

## Atribución (clave)
Las cookies no cruzan de dominio. El botón "Reservar" enlaza directo a
`reservas.takai.cl/reservar?cabin_id=...&source=directory[&ref=CODIGO]`. El motor
de reservas captura `source`/`ref` al crear la reserva (ya implementado en el
owner-dashboard). El botón "Consultar por WhatsApp" usa el número del sistema con
el tag `[C:<cabin_id>]` para el agente IA (Fase 6).

## Setup
```bash
cd directorio
cp .env.example .env.local   # completar SUPABASE_SERVICE_ROLE_KEY y dominios
npm install
npm run build
npm run start
```

## Variables de entorno
Ver `.env.example`. **HUMAN_TODO:** comprar `DIRECTORY_DOMAIN`, apuntarlo a Vercel,
verificar en Google Search Console (`SEARCH_CONSOLE_VERIFICATION`).

## Deploy
Proyecto Vercel **separado** (no el de `takai.cl`), apuntando a esta carpeta como
root, con su propio dominio. Mantiene ambos productos "congelables" por separado.
