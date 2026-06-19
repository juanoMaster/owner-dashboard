// Contenido único por destino (Fase 5 — SEO). Texto propio, NO duplicado entre
// páginas. Cada destino apunta a long-tail keywords (incluye nómada digital).
// El match con cabañas se hace por coincidencia en tenants.location_text.

export interface Destino {
  slug: string
  nombre: string
  region: string
  match: string[] // términos que deben aparecer en location_text para asociar cabañas
  intro: string
  queHacer: string
  teletrabajo: string
}

export const DESTINOS: Destino[] = [
  {
    slug: "lican-ray",
    nombre: "Licán Ray",
    region: "La Araucanía",
    match: ["licán ray", "lican ray", "licanray"],
    intro:
      "A orillas del lago Calafquén, Licán Ray es uno de los balnearios más queridos del sur de Chile. Sus playas de arena negra, los bosques nativos y el ritmo tranquilo lo hacen ideal para desconectarse en una cabaña frente al lago.",
    queHacer:
      "Recorre la Península, báñate en las playas Grande y Chica, sube al mirador, navega el lago o visita las termas cercanas. En temporada hay ferias costumbristas y gastronomía mapuche.",
    teletrabajo:
      "Cada vez más nómadas digitales eligen Licán Ray para estadías largas: naturaleza, calma y cabañas con wifi para teletrabajo. Reserva por semanas o meses y trabaja con el lago de fondo.",
  },
  {
    slug: "villarrica",
    nombre: "Villarrica",
    region: "La Araucanía",
    match: ["villarrica"],
    intro:
      "Villarrica combina lago, volcán y ciudad. Con todos los servicios a mano y el volcán nevado como telón de fondo, es una base perfecta para explorar la región mientras te alojas en una cabaña cómoda.",
    queHacer:
      "Disfruta la costanera del lago Villarrica, sube al volcán, visita la Feria Mapuche, recorre cervecerías artesanales y date una vuelta por los saltos y termas de los alrededores.",
    teletrabajo:
      "Por su conectividad y servicios, Villarrica es ideal para teletrabajar desde el sur. Busca cabañas con wifi estable para estadías largas y combina trabajo con naturaleza.",
  },
  {
    slug: "pucon",
    nombre: "Pucón",
    region: "La Araucanía",
    match: ["pucón", "pucon"],
    intro:
      "Pucón es la capital del turismo aventura del sur de Chile. Termas, volcán, ríos y bosques milenarios rodean este destino vibrante, con cabañas para todos los estilos.",
    queHacer:
      "Asciende el volcán Villarrica, relájate en las termas geométricas, haz rafting en el Trancura, camina por el Parque Nacional Huerquehue o recorre el Ojos del Caburgua.",
    teletrabajo:
      "Para quienes trabajan en remoto, Pucón ofrece cafés, coworkings y cabañas con wifi para teletrabajo. Aprovecha estadías largas en temporada baja con mejores precios.",
  },
  {
    slug: "panguipulli",
    nombre: "Panguipulli",
    region: "Los Ríos",
    match: ["panguipulli"],
    intro:
      "Conocida como la 'ciudad de las rosas', Panguipulli es la puerta de entrada a los Siete Lagos. Un destino auténtico y menos masivo, ideal para una cabaña rodeada de naturaleza.",
    queHacer:
      "Explora los Siete Lagos, visita Neltume y el Salto del Huilo-Huilo, recorre la Reserva Biológica Huilo-Huilo y disfruta la tranquilidad de los pueblos cordilleranos.",
    teletrabajo:
      "Panguipulli es un secreto bien guardado para nómadas digitales que buscan calma total. Estadías largas en cabañas con wifi, lejos del bullicio y cerca de la naturaleza.",
  },
]

export function destinoBySlug(slug: string): Destino | undefined {
  return DESTINOS.find((d) => d.slug === slug)
}

export function matchDestino(locationText: string | null | undefined): Destino | undefined {
  if (!locationText) return undefined
  const lt = locationText.toLowerCase()
  return DESTINOS.find((d) => d.match.some((m) => lt.includes(m)))
}
