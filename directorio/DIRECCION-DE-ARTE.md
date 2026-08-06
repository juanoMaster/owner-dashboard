# Dirección de arte — Directorio Takai

> Documento normativo. Ningún componente del directorio se escribe sin cumplirlo.
> Estado: **propuesta pendiente de aprobación de Juan** (2026-08-05).
> La decisión abierta está marcada como **DECISIÓN 1**; todo lo demás se deriva de ella.

---

## 0. Principio rector

**La fotografía manda. El layout existe para servirla.**

El directorio no vende un software: vende una noche en un lugar concreto del sur de
Chile. Todo lo que no sea la foto, el precio, la capacidad y la disponibilidad es
ruido. Cada decisión de este documento se justifica en función de que la fotografía
se lea como fotografía y el dato se lea como dato.

**Regla de oro:** si una sección podría estar en cualquier sitio genérico sin que
nadie note la diferencia, está mal y se rehace.

---

## 1. DECISIÓN 1 — El fondo: papel o bosque

El directorio hoy hereda la paleta del panel del propietario: fondo verde muy
oscuro (`#0d1a12`). Eso es correcto para una herramienta de trabajo nocturna y
equivocado para una vitrina fotográfica.

### Recomendación: **fondo papel (claro)**

Tres razones concretas:

1. **La foto se lee como foto.** Sobre fondo oscuro, una fotografía se percibe como
   una pantalla encendida: los negros de la imagen se funden con el fondo y se
   pierde el recorte. Sobre papel, la foto tiene borde y peso — es el motivo por el
   que Airbnb, Booking, Monocle y las guías de viaje de los grandes medios son
   claras. No es moda, es contraste.
2. **Separa las dos marcas.** `takai.cl` y el panel son B2B (herramienta, oscura).
   El directorio es B2C (revista, clara). El turista no debe sentir que entró a un
   software de gestión.
3. **Rinde mejor en móvil a plena luz**, que es donde ocurre el 70%+ del tráfico.

La continuidad con Takai se mantiene por el **verde bosque** y el **serif**, no por
el fondo negro.

### Alternativa si Juan prefiere mantener el oscuro
Se conserva `#0d1a12` como fondo y la fotografía pasa a full-bleed con marcos
claros de 1px; funciona, pero exige fotografía de más calidad para no verse turbia.
**Juan decide. No se escribe un componente hasta que esta decisión esté tomada.**

---

## 2. Paleta

Tres familias: **papel** (fondos), **tinta** (texto), **territorio** (acentos).
Sin gradientes. Sin glassmorphism. Un solo acento por pantalla.

### Papel — fondos
| Token | Hex | Uso |
|---|---|---|
| `papel` | `#FBF9F4` | Fondo de página. Blanco cálido, no `#fff` puro (el blanco puro tiñe de azul las fotos del sur). |
| `papelHueso` | `#F2EEE5` | Bandas alternadas, fondo de tarjeta sobre papel. |
| `papelBorde` | `#E2DCCE` | Bordes de 1px, separadores. Nunca sombras. |

### Tinta — texto
| Token | Hex | Uso |
|---|---|---|
| `tinta` | `#1C1F1A` | Titulares y cifras. Casi negro con verde, no negro puro. |
| `tintaCuerpo` | `#3D423A` | Texto de lectura. |
| `tintaSuave` | `#63695E` | Metadatos, capacidad, fechas, epígrafes. |

### Territorio — acentos
| Token | Hex | Uso |
|---|---|---|
| `bosque` | `#1F4A32` | Acento principal: CTA "Reservar", enlaces, activos. Hereda el verde Takai, oscurecido para contraste AA sobre papel. |
| `bosqueHover` | `#163825` | Estado hover del CTA. |
| `greda` | `#8C5A3C` | Acento secundario, un solo uso por página (destacados editoriales). Tierra volcánica, no naranjo saturado. |
| `lago` | `#2E5C6E` | Terciario reservado a datos (mapa, disponibilidad). |

**Contraste — medido, no estimado** (WCAG 2.1, calculado sobre estos hex el
2026-08-05):

| Par | Ratio | Cumple |
|---|---|---|
| `tinta` / `papel` | 15.84:1 | AAA |
| `tintaCuerpo` / `papel` | 9.79:1 | AAA |
| `bosque` / `papel` (y `papel` / `bosque`) | 9.58:1 | AAA |
| `lago` / `papel` | 6.95:1 | AAA |
| `greda` / `papel` | 5.48:1 | AA |
| `tintaSuave` / `papel` | 5.38:1 | AA |
| `tintaSuave` / `papelHueso` | 4.88:1 | AA |

`tintaSuave` se fijó en `#63695E` precisamente porque el valor más claro que se
probó primero (`#6B7166`) daba 4.34:1 sobre `papelHueso` y **no** alcanzaba el
mínimo AA de 4.5:1 para texto normal. Cualquier token nuevo se mide antes de
entrar a esta tabla.

### Prohibido en la paleta
Morado, azul-violeta, cualquier gradiente de dos tonos, neón, `#25D366` verde
WhatsApp como color de marca (solo se permite dentro del ícono oficial cuando el
botón es explícitamente de WhatsApp).

---

## 3. Tipografía

Dos familias. Una serif con voz para lo editorial, una sans neutra y buena en
números para la UI. Ambas vía `next/font/google` → se autohospedan en el build, sin
petición a terceros en runtime y sin dependencia nueva en `package.json`.

| Rol | Familia | Por qué |
|---|---|---|
| Display / titulares | **Fraunces** (400, 600; `opsz` variable) | Serif contemporánea con carácter. A tamaño grande tiene personalidad editorial; a tamaño chico no se usa. Alternativa si Juan la ve muy expresiva: **Newsreader**. |
| UI / cuerpo / cifras | **Archivo** (400, 500, 700) | Grotesca neutra, excelente a 13–15px y con cifras tabulares para precios y fechas alineados. |

Fallbacks: `Fraunces, Georgia, serif` — así el ecosistema sigue coherente y si la
fuente no carga, cae en el Georgia que ya usa Takai.

**Inter y las fuentes de sistema están prohibidas como tipografía principal**: son
la firma visual de la plantilla genérica.

### Escala (base 16px, razón 1.25 truncada a valores redondos)

| Token | px móvil / desktop | Familia | Uso |
|---|---|---|---|
| `display` | 34 / 52 | Fraunces 400 | H1 de portada y de lugar |
| `titulo` | 26 / 34 | Fraunces 400 | H1 de ficha, H2 de sección |
| `subtitulo` | 20 / 24 | Fraunces 400 | Nombre de cabaña en tarjeta |
| `cuerpoL` | 17 / 18 | Archivo 400 | Párrafo editorial, interlínea 1.7 |
| `cuerpo` | 15 / 15 | Archivo 400 | Texto general, interlínea 1.6 |
| `dato` | 14 / 14 | Archivo 500 | Precio, capacidad, reseñas. Cifras tabulares. |
| `epigrafe` | 11 / 12 | Archivo 700, `letter-spacing: 0.12em`, mayúsculas | Etiquetas de sección. Único uso permitido de mayúsculas. |

Medida de lectura: **máximo 68 caracteres** por línea en texto editorial
(≈620px). El ancho de página completo es 1180px; el texto nunca lo ocupa entero.

---

## 4. Espacio, grilla y forma

- **Escala de espaciado:** 4, 8, 12, 16, 24, 32, 48, 64, 96. Nada intermedio.
- **Grilla:** 12 columnas en desktop, 4 en móvil. La grilla se usa para romperla:
  las filas editoriales alternan 7/5 y 5/7, no 4/4/4.
- **Radio de borde:** `2px` en fotografía y tarjetas, `4px` en botones. Nada de
  `12px`+ ni pastillas redondeadas: la esquina muy redonda es firma de plantilla.
- **Sombras: cero.** La jerarquía se construye con espacio, tamaño y borde de 1px.
  Una sombra difusa es el tell más rápido de una interfaz generada.
- **Un solo botón sólido por pantalla** (el CTA de reserva). Todo lo demás es texto
  con subrayado o borde de 1px.

### Prohibido en el layout
Grillas de 3 tarjetas idénticas con ícono + título + párrafo. Emojis como
iconografía (el `📍` y el `👋` que hoy existen en el código salen). Blobs, formas
decorativas, patrones de fondo. Secciones "beneficios" con abstracciones.

---

## 5. Tratamiento fotográfico

- **Solo fotografía real** de las cabañas y del territorio. Cero stock, cero
  generada. Sin foto no hay tarjeta.
- **Relaciones de aspecto fijas y consistentes:** `3:2` en tarjetas de listado,
  `4:5` en el retrato editorial de portada, `16:9` en el hero de lugar. Siempre con
  `object-fit: cover` y punto focal centrado.
- **`next/image` obligatorio** en todas las imágenes, con `sizes` explícito,
  `priority` solo en el hero y `placeholder` de color plano derivado de la paleta.
  (Hoy el directorio usa `<img>` crudo con `eslint-disable`: eso se corrige.)
- **Sin filtros ni overlays de color.** Se permite un degradado negro al 0→45% de
  opacidad **solo** cuando hay texto encima de una foto, y por legibilidad.
- **Presupuesto de imagen por página:** en listados, máximo 1 foto por cabaña
  (portada); las galerías completas solo en la ficha.

---

## 6. Microcopy

**Datos y hechos. Cero adjetivos de folleto.** Chileno, directo, en segunda persona
cuando hay acción.

| ✗ Nunca | ✓ Así |
|---|---|
| "Descubre el paraíso escondido" | "Cabañas en Licán Ray" |
| "Vive una experiencia única" | "8 fotos · hasta 6 personas · desde $70.000 la noche" |
| "Tu escapada soñada te espera" | "A orillas del lago Calafquén" |
| "Reserva ahora y asegura tu lugar" | "Reservar — pagas el anticipo, el saldo al llegar" |
| "Excelentes comentarios" | "12 reseñas de huéspedes reales" |
| "Ubicación privilegiada" | "A 30 km de Villarrica" |

Reglas duras:
1. **Todo número es verificable contra la BD o contra un hecho comprobado.** Si no
   hay reseñas, no se escribe nada sobre reseñas. Si no está medida la distancia, no
   se publica la distancia.
2. Sin anglicismos evitables: es "reserva", no "booking"; "alojamiento", no "stay".
3. El precio siempre con moneda y unidad: `$70.000 la noche`, nunca `70000`.
4. Sin signos de exclamación en la interfaz.

---

## 7. Regla de privacidad (permanente, de Juan)

El turista **jamás** ve teléfono, redes sociales ni datos de contacto del dueño
antes de que su reserva esté pagada. En el directorio esto significa: sin
`owner_whatsapp`, sin Instagram/Facebook, sin email del dueño, sin el guidebook
completo. Todo contacto previo pasa por el agente Takai (WhatsApp del chip o chat
web). Un dato de contacto del dueño en el directorio es un bug crítico, no un
detalle de diseño.

*(Verificado el 2026-08-05: `directorio/lib/data.ts` hoy cumple — solo selecciona
`slug`, `business_name`, `currency`, `location_text`, geo y `country`.)*

---

## 8. Cómo se aplica en código

- Los tokens de este documento viven en **un solo módulo** `directorio/lib/arte.ts`
  exportando objetos TypeScript (`color`, `tipo`, `espacio`).
  Ningún componente escribe un hex a mano.
- Estilos **inline con objetos JS**, sin Tailwind, coherente con el ecosistema.
- **Nunca CSS en template literals dentro de `.tsx`** (PowerShell los corrompe en
  Windows — regla de entorno del proyecto).
- Cambiar la paleta debe ser cambiar `arte.ts`. Si hay que tocar diez componentes,
  está mal implementado.

---

## 9. Checklist de aceptación por pantalla

Una pantalla se aprueba solo si pasa las nueve:

1. ¿La fotografía es lo primero que se ve?
2. ¿Todo número que aparece sale de la BD o de un hecho verificado?
3. ¿Cero emojis como iconografía?
4. ¿Cero gradientes y cero sombras?
5. ¿La tipografía es Fraunces + Archivo, en la escala definida?
6. ¿La jerarquía es asimétrica (no una grilla de tres iguales)?
7. ¿Revisada de verdad en móvil, a 375px de ancho?
8. ¿Cero datos de contacto del dueño?
9. ¿Se distingue de un directorio genérico? Si la respuesta honesta es "no", se
   rehace.
