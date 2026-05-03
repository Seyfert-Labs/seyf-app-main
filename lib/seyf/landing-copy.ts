/**
 * Copy de landing alineado a neuroventas.md:
 * código simbólico (protección/refugio), adelanto de rendimientos (gratificación ya),
 * tangibilidad y promesa de “futuro pagado por adelantado”, sin vender solo “tasas”.
 */
/** Fragmentos del titular para acento tipográfico (“nunca” en otro color). */
export const SEYF_LANDING_TAGLINE_PARTS = {
  before: 'Gasta ahora y ',
  highlight: 'nunca',
  after: ' pagues',
} as const

export const SEYF_LANDING_TAGLINE =
  `${SEYF_LANDING_TAGLINE_PARTS.before}${SEYF_LANDING_TAGLINE_PARTS.highlight}${SEYF_LANDING_TAGLINE_PARTS.after}`

export const SEYF_LANDING_LEAD =
  'Tu capital como refugio: sigue protegido mientras adelantas el rendimiento que antes solo verías después, con la paz mental de tener el futuro pagado por adelantado.'

/** Línea de apoyo con mercados (hero secundario). */
export const SEYF_LANDING_BONDS_LINE =
  'Gasta tus rendimientos futuros mientras tu capital sigue seguro. Adelanta rendimientos de bonos mexicanos, brasileños, coreanos y estadounidenses.'

/** @deprecated usar SEYF_LANDING_LEAD */
export const SEYF_LANDING_DESCRIPTION = SEYF_LANDING_LEAD

export const SEYF_LANDING_MARKETS_SECTION_TITLE = 'Tu dinero en más de un mercado'

export const SEYF_LANDING_MARKETS: Array<{ name: string; description: string }> = [
  { name: 'México', description: 'Soberanos y CETES en pesos.' },
  { name: 'Brasil', description: 'Renta fija en mercado local.' },
  { name: 'Corea', description: 'Bonos y diversificación en Asia.' },
  { name: 'Estados Unidos', description: 'Treasuries y refugio en dólares.' },
]

export const SEYF_LANDING_SECURITY_TITLE = 'El espacio seguro de tu capital'

export const SEYF_LANDING_SECURITY_BODY =
  'Separas gastar de comprometer tu ahorro: lo invertido sigue trabajando mientras usas lo que ya ganaste. Claridad y control, sin el ritual eterno del banco.'

export const SEYF_LANDING_FOOTER_CTA_TITLE = '¿Listo para empezar?'

/** Sección “tarjetas en perspectiva” (estilo Revolut: hero oscuro + render 3D). */
export const SEYF_LANDING_CARDS_SHOWCASE_TITLE = 'Gasta con intención'

export const SEYF_LANDING_CARDS_SHOWCASE_BODY =
  'La tarjeta Seyf conecta lo que ya rendió con lo que gastas hoy, con el capital resguardado en bonos de varios mercados.'

export const SEYF_LANDING_CARDS_SHOWCASE_DISCLAIMER =
  'Aplican términos y condiciones. Niveles de tarjeta sujetos a elegibilidad y disponibilidad regional.'

/** Galería horizontal ligada al scroll vertical (Motion scroll + animate). */
export const SEYF_LANDING_GALLERY_TITLE = 'Un recorrido por Seyf'

export const SEYF_LANDING_GALLERY_FOOTER =
  'Dos ideas: la promesa de Seyf y dónde vive diversificado tu capital, con el scroll horizontal.'

/** Paneles del recorrido: copiado de las secciones principales (no solo fotos). */
export type SeyfRecorridoSlide = {
  id: string
  step: string
  title: string
  /** Reutiliza el acento menta en «nunca» como en el hero. */
  highlightNuncaInTitle?: boolean
  body?: string
  /** Muestra la rejilla de `SEYF_LANDING_MARKETS` (puede ir junto con `body` arriba). */
  marketsList?: boolean
  image?: {
    src: string
    width: number
    height: number
    alt: string
    className?: string
  }
}

export const SEYF_LANDING_RECORRIDO_SLIDES: SeyfRecorridoSlide[] = [
  {
    id: 'promesa',
    step: '01',
    title: SEYF_LANDING_TAGLINE,
    highlightNuncaInTitle: true,
    body: SEYF_LANDING_LEAD,
    image: {
      src: '/SEYF.png',
      width: 869,
      height: 881,
      alt: 'Seyf',
      className: 'max-h-[min(30vh,240px)] w-auto max-w-[min(52vw,220px)] object-contain sm:max-h-[min(34vh,280px)]',
    },
  },
  {
    id: 'cobertura',
    step: '02',
    title: SEYF_LANDING_MARKETS_SECTION_TITLE,
    body: SEYF_LANDING_BONDS_LINE,
    marketsList: true,
  },
]
