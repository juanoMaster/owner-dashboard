# Traspaso para el chat de `takai-landing`

> Documento generado el **2026-08-04** desde el chat de `owner-dashboard`.
> Pásaselo tal cual al chat que trabaja el repo de la landing.
> Todo lo que aparece aquí **ya está en producción**: son los hechos con los que
> ese chat tiene que trabajar de ahora en adelante.

---

## 1. Qué se cambió en `takai-landing` desde este chat

Se hicieron ediciones directas al repo (commits `4c84258`, `bea33dc` y el de hoy).
No fueron cambios de diseño: fueron correcciones de **verdad comercial**, porque
la web estaba publicando un modelo de negocio que ya no existe.

### Modelo de precios (el sitio publicaba uno obsoleto)
La landing anunciaba **$20.000 de incorporación + $10.000/mes condicional**, un
modelo que fue retirado. Lo vigente y ya publicado es:

- **Cuota de incorporación: $160.000 CLP**, pago único.
- **Mensualidad: $0.** No hay cuotas fijas.
- **10% solo sobre reservas que Takai genera** (directorio, agente de WhatsApp,
  partners). Las reservas que el dueño consigue por su cuenta: 0%.

Archivos tocados: `app/page.tsx` (sección Precio, FAQ), `app/components/PriceSim.tsx`
(mensualidad fija en 0), `app/terminos/page.tsx` (secciones 2 y 4),
`app/components/ContactModal.tsx`, `app/blog/[slug]/page.tsx`, `lib/articles.ts`.

### Programa de partners (se reescribió entero)
- El porcentaje del partner es **5%**, y ahora **se publica explícito**.
- Se agregó una **segunda vía de ingreso**: comisión por recomendar alojamientos,
  **desde $30.000** (1-5 alojamientos $30.000 · 6-10 $50.000 · más de 10 a convenir).
- Nueva sección **"Dos formas de ganar"** en `app/afiliados/page.tsx`.
- Se rehízo el simulador, que mostraba literalmente *"Comisión Takai (10%)"* y
  *"se liquida de ahí"*.

### ⚠️ REGLA PERMANENTE — no volver a escribir esto nunca
**Ni los partners ni los propietarios deben saber que la comisión del partner
sale del 10% de Takai.** Se eliminaron todas las frases del tipo *"tu comisión
sale del 10% de Takai"* o *"el propietario nunca paga extra por ti"*.

Lo único que se dice públicamente es: **ni el turista ni el propietario pagan más
por la recomendación**. Punto. Si alguna sesión futura vuelve a explicar de dónde
sale la comisión, hay que revertirlo.

Corolario: el monto por traer alojamientos se publica **en pesos**, nunca como
porcentaje de la cuota de entrada — si no, cualquiera deduce la estructura desde
el precio público de $160.000.

### Otras correcciones
- **Blog:** se eliminó del artículo de precios la comparación *"la competencia
  cobra $50.000 a $100.000 de instalación"*, que jugaba en contra de la cuota de
  $160.000. El artículo se reencuadró hacia costo acumulado de la mensualidad vs
  pago único, y se agregó una sección sobre alineación de intereses.
- **Se eliminó la palabra "nunca"** de la promesa de no cobrar mensualidad. Decía
  *"Sin cuotas fijas, nunca"*, lo que ataba las manos para introducir una cuota
  anual en el futuro. Ahora dice *"Sin cuotas mensuales. No pagas nada fijo: solo
  el 10% de lo que te generemos"* — mismo efecto de venta, sin comprometerse de
  por vida.
- **Enlace al alta self-service:** en la sección Precio hay un enlace secundario a
  `https://reservas.takai.cl/registro`. El WhatsApp sigue siendo el CTA principal.
- **`CLAUDE.md` de ese repo corregido:** decía *"Tailwind PROHIBIDO en
  componentes"* cuando todo el rediseño premium usa Tailwind. Ahora documenta la
  convención real (Tailwind + tokens de marca `crema/tinta/cobre/ceniza/humo`;
  `ContactModal.tsx` queda con inline styles como excepción viva).

---

## 2. Qué hay que saber del backend (para no prometer lo que no existe)

- **5 plantillas de landing** para los clientes (antes 3): Clásico, Moderno,
  Rural, **Premium** (fotográfica full-screen) y **Boutique** (minimalista).
- **Alta self-service operativa**: `reservas.takai.cl/registro` — wizard de 4
  pasos, pago de la cuota por MercadoPago o transferencia, y aprobación humana
  antes de publicar.
- **Todas las páginas de cliente muestran mapa y "Cómo llegar"** cuando el
  alojamiento tiene coordenadas cargadas.
- **Regla de privacidad**: el turista **jamás** ve teléfono, redes ni datos de
  contacto del dueño antes de pagar. Todo contacto pasa por el agente Takai. Si
  la landing alguna vez muestra el WhatsApp de un dueño, es un bug.
- **El directorio B2C todavía no tiene dominio propio** (vive en
  `takai-directorio.vercel.app`) y **hoy se ve vacío**: ninguna cabaña llega al
  mínimo de 8 fotos que exige para publicar. No prometer en la landing que el
  directorio ya está trayendo turistas.

---

## 3. Pendientes de la landing (lo que ese chat debería tomar)

1. **Tres archivos sin commitear** en el repo desde otra sesión: `.claude/`,
   `AGENTS.md` y `public/ia/`. Si `public/ia/` tiene imágenes que el sitio usa,
   **hoy no existen en producción**. Revisar y commitear.
2. **Banner OG 1200×630** a medida (pendiente antiguo; `next/og` falla en build
   local Windows, hay que generarlo estático).
3. **`ContactModal` no tiene trigger**: el componente existe pero nada lo abre.
   Los CTA van todos a WhatsApp.
4. **Formulario de registro de partners**: hoy el CTA "Quiero ser partner" va a
   WhatsApp y Juan los da de alta a mano desde `/admin` → Afiliados. Se podría
   automatizar más adelante.
5. **Contador dinámico de cabañas activas** desde Supabase (hoy es texto fijo).
6. **Imágenes remotas del hero** dependen de `mgx-backend-cdn.metadl.com`. Si ese
   CDN cae, se rompe el hero. Conviene re-hospedarlas.

---

## 4. Regla de convivencia entre los dos chats

Para que no se pisen:

- **Verdad comercial** (precios, comisiones, qué hace el sistema, términos
  legales) → se cambia desde el chat de `owner-dashboard`, en el mismo movimiento
  que el backend. Así la web nunca promete algo que el sistema no hace.
- **Diseño, maquetación, secciones nuevas, imágenes, SEO y contenido editorial**
  → chat de `takai-landing`.
- **Quien toque el repo, que commitee antes de terminar.** Los archivos sueltos
  de otra sesión son lo único que hace peligrosa la edición cruzada.
