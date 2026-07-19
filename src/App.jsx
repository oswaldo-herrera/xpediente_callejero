import { motion, useInView } from 'framer-motion'
import { useRef, useState, useEffect } from 'react'
import './App.css'

// ─── Content ──────────────────────────────────────────────────────────────────

const TICKER = [
  'EXCLUSIVO: Contratos millonarios en Iztapalapa sin licitación detectados por Xpediente Callejero',
  'URGENTE: Comunidades del oriente exigen cuentas por obra pública abandonada desde 2023',
  'ESPECIAL: El mapa de quién gana con los permisos de construcción irregular en CDMX',
  'INVESTIGACIÓN: Redes de nepotismo documentadas en al menos seis delegaciones capitalinas',
]

const NAV = ['Nacional', 'CDMX', 'Política', 'Sociedad', 'Economía', 'Cultura', 'Opinión', 'Multimedia']

const HERO = {
  tag: 'Investigación Especial',
  headline: 'La ciudad que nadie documenta: seis meses en las colonias que el poder prefiere no ver',
  sub: 'Más de doscientas fuentes, miles de documentos y un patrón que se repite: el abandono institucional no es accidente, es política deliberada.',
  by: 'Redacción · Xpediente Callejero',
  date: 'Domingo 19 de julio, 2026',
  mins: '18',
}

const FEATURED = [
  {
    tag: 'Política', tagColor: '#8C1515',
    headline: 'El presupuesto que nadie debate: cómo se asignan millones en tres horas de sesión',
    excerpt: 'Documentos internos revelan que las asignaciones de gasto público se deciden horas antes de la sesión oficial, sin debate ni transparencia.',
    by: 'Oswaldo Herrera', mins: '7', img: 'political',
  },
  {
    tag: 'Sociedad', tagColor: '#1B4A9B',
    headline: 'Tres colonias sin mapa: la lucha de vecinos por existir en el registro oficial',
    excerpt: 'Comunidades enteras ausentes del padrón catastral, sin servicios, sin voz. Documentamos doce meses de lucha invisible en el oriente capitalino.',
    by: 'Rosalva De la Mora', mins: '9', img: 'society',
  },
  {
    tag: 'Economía', tagColor: '#1B6B2E',
    headline: 'El PIB que el INEGI no cuenta: mercados informales y el tejido económico real',
    excerpt: 'Más del 40% de la actividad económica en zonas periféricas opera fuera del radar institucional. Cifras y testimonios de primera mano.',
    by: 'Staff Editorial', mins: '5', img: 'economy',
  },
]

const NACIONAL = [
  { headline: 'Reforma electoral y sus implicaciones para la prensa independiente en estados del sur', by: 'Redacción', mins: '4' },
  { headline: 'Tres entidades, un mismo patrón: contratos de salud señalados por organismos civiles', by: 'Staff', mins: '6' },
  { headline: '40 demandas ciudadanas sin respuesta: el silencio oficial medido en días y documentos', by: 'Redacción', mins: '3' },
  { headline: 'Periodismo local bajo presión: agresiones documentadas en el primer semestre de 2026', by: 'Oswaldo Herrera', mins: '8' },
]

const OPINION = [
  {
    initial: 'X',
    title: 'El periodismo callejero como acto de resistencia democrática',
    author: 'Editorial · Xpediente Callejero',
    excerpt: 'Cuando las instituciones callan, la calle documenta. No como alternativa romántica sino como necesidad democrática urgente.',
  },
  {
    initial: 'C',
    title: '¿Por qué la transparencia duele? El poder y su relación con la información',
    author: 'Colaboración especial',
    excerpt: 'La opacidad no es descuido burocrático. Es política deliberada. Y el antídoto no llegará desde arriba.',
  },
]

// ─── Primitives ───────────────────────────────────────────────────────────────

function Rule({ thick }) {
  return <div className={thick ? 'rule rule--thick' : 'rule'} />
}

function Tag({ children, color }) {
  return (
    <span className="tag" style={color ? { color, borderColor: color } : {}}>
      {children}
    </span>
  )
}

const IMG_COLORS = {
  hero:      ['#1E1008', '#4A2810', '#7A4A22', '#2E1A08'],
  political: ['#10101E', '#202048', '#3A3A70', '#181830'],
  society:   ['#101E08', '#203A10', '#387020', '#162A0A'],
  economy:   ['#1A1208', '#3A2A10', '#6A4A20', '#241A08'],
}

function ImgPlaceholder({ variant = 'hero', className = '' }) {
  const [c1, c2, c3, c4] = IMG_COLORS[variant] || IMG_COLORS.economy
  return (
    <div
      className={`img-ph ${className}`}
      style={{ background: `linear-gradient(135deg,${c1} 0%,${c2} 35%,${c3} 70%,${c4} 100%)` }}
      aria-hidden="true"
    >
      <div className="img-grain" />
      <div className="img-vignette" />
    </div>
  )
}

// ─── Masthead ─────────────────────────────────────────────────────────────────

const TITLE = 'Xpediente Callejero'

function Masthead() {
  return (
    <header className="masthead">
      <div className="masthead-eyebrow">
        <span>Edo. Mex · Est. 2026</span>
        <span>Periodismo de Investigación y Participación Ciudadana</span>
        <span><span className="eyebrow-full">Dom. 19 Jul. 2026 · </span>No. 001</span>
      </div>
      <Rule thick />
      <div className="masthead-title" aria-label={TITLE}>
        {TITLE.split('').map((ch, i) => (
          <motion.span
            key={i}
            className={ch === ' ' ? 'mchar mchar--space' : 'mchar'}
            initial={{ opacity: 0, y: -56, rotateX: 90 }}
            animate={{ opacity: 1, y: 0, rotateX: 0 }}
            transition={{ delay: 0.15 + i * 0.04, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          >
            {ch === ' ' ? ' ' : ch}
          </motion.span>
        ))}
      </div>
      <Rule thick />
      <motion.p
        className="masthead-tagline"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.15, duration: 0.9 }}
      >
        Documentamos lo que importa
      </motion.p>
      <Rule />
    </header>
  )
}

// ─── Ticker ───────────────────────────────────────────────────────────────────

function Ticker() {
  const items = [...TICKER, ...TICKER]
  return (
    <div className="ticker" role="marquee" aria-live="off">
      <div className="ticker-badge">Última hora</div>
      <div className="ticker-track">
        <motion.div
          className="ticker-inner"
          animate={{ x: ['0%', '-50%'] }}
          transition={{ duration: 48, repeat: Infinity, ease: 'linear' }}
        >
          {items.map((t, i) => (
            <span key={i} className="ticker-item">
              {t}<span className="ticker-sep" aria-hidden>◆</span>
            </span>
          ))}
        </motion.div>
      </div>
    </div>
  )
}

// ─── Theme toggle ─────────────────────────────────────────────────────────────

function ThemeToggle() {
  const [dark, setDark] = useState(() => {
    if (typeof window === 'undefined') return false
    const stored = localStorage.getItem('xc-theme')
    if (stored) return stored === 'dark'
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  useEffect(() => {
    const theme = dark ? 'dark' : 'light'
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('xc-theme', theme)
  }, [dark])

  return (
    <button
      className="theme-btn"
      onClick={() => setDark(d => !d)}
      aria-label={dark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
    >
      {dark ? '○ Claro' : '● Oscuro'}
    </button>
  )
}

// ─── Nav ──────────────────────────────────────────────────────────────────────

function Nav() {
  const [active, setActive] = useState('Nacional')
  return (
    <motion.nav
      className="sec-nav"
      aria-label="Secciones"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 1.3, duration: 0.5 }}
    >
      {NAV.map(s => (
        <button
          key={s}
          className={`nav-btn${active === s ? ' nav-btn--on' : ''}`}
          onClick={() => setActive(s)}
          aria-current={active === s ? 'page' : undefined}
        >
          {s}
          {active === s && (
            <motion.span className="nav-rail" layoutId="nav-rail" />
          )}
        </button>
      ))}
      <div className="theme-wrap">
        <span className="theme-label">👆 Estilo visual</span>
        <ThemeToggle />
      </div>
    </motion.nav>
  )
}

// ─── Hero ─────────────────────────────────────────────────────────────────────

function Hero() {
  return (
    <motion.section
      className="hero"
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1.65, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="hero-media">
        <ImgPlaceholder variant="hero" className="hero-img" />
        <p className="hero-caption">CDMX, julio 2026 — Documentación en campo</p>
      </div>
      <div className="hero-body">
        <Tag>{HERO.tag}</Tag>
        <h1 className="hero-hl">{HERO.headline}</h1>
        <Rule />
        <p className="hero-sub">{HERO.sub}</p>
        <div className="hero-meta">
          <span>{HERO.by}</span>
          <span aria-hidden className="sep">·</span>
          <span>{HERO.date}</span>
          <span aria-hidden className="sep">·</span>
          <span>{HERO.mins} min</span>
        </div>
        <button className="read-btn">Leer expediente completo →</button>
      </div>
    </motion.section>
  )
}

// ─── Featured grid ────────────────────────────────────────────────────────────

function Card({ s, index }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })
  return (
    <motion.article
      ref={ref}
      className="card"
      initial={{ opacity: 0, y: 30 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ delay: index * 0.12, duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -5, transition: { duration: 0.2 } }}
    >
      <ImgPlaceholder variant={s.img} className="card-img" />
      <Tag color={s.tagColor}>{s.tag}</Tag>
      <h3 className="card-hl">{s.headline}</h3>
      <p className="card-ex">{s.excerpt}</p>
      <div className="card-meta">
        <span>{s.by}</span>
        <span>{s.mins} min de lectura</span>
      </div>
    </motion.article>
  )
}

// ─── Section header ───────────────────────────────────────────────────────────

function SecHead({ title }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-40px' })
  return (
    <div ref={ref} className="sec-head">
      <Rule thick />
      <div className="sec-head-row">
        <motion.h2
          className="sec-title"
          initial={{ opacity: 0, x: -18 }}
          animate={inView ? { opacity: 1, x: 0 } : {}}
          transition={{ duration: 0.5 }}
        >
          {title}
        </motion.h2>
        <motion.a
          href="#"
          className="sec-more"
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ delay: 0.25, duration: 0.4 }}
        >
          Ver todos →
        </motion.a>
      </div>
      <Rule />
    </div>
  )
}

// ─── Pull quote ───────────────────────────────────────────────────────────────

function PullQuote() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })
  return (
    <motion.blockquote
      ref={ref}
      className="pull"
      initial={{ opacity: 0, scaleY: 0.88 }}
      animate={inView ? { opacity: 1, scaleY: 1 } : {}}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
    >
      <span className="pull-mark" aria-hidden>"</span>
      <p>Cuando las instituciones fallan en documentar, la calle asume esa responsabilidad. No como sustituto, sino como evidencia.</p>
      <cite>— Manifiesto editorial · Xpediente Callejero</cite>
    </motion.blockquote>
  )
}

// ─── Nacional list ────────────────────────────────────────────────────────────

function ListItem({ story, index }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-40px' })
  return (
    <motion.div
      ref={ref}
      className="list-item"
      initial={{ opacity: 0, x: -22 }}
      animate={inView ? { opacity: 1, x: 0 } : {}}
      transition={{ delay: index * 0.09, duration: 0.5 }}
      whileHover={{ x: 7, transition: { duration: 0.18 } }}
    >
      <span className="list-num" aria-hidden>{String(index + 1).padStart(2, '0')}</span>
      <div>
        <h4 className="list-hl">{story.headline}</h4>
        <span className="list-meta">{story.by} · {story.mins} min</span>
      </div>
    </motion.div>
  )
}

// ─── Opinion ──────────────────────────────────────────────────────────────────

function OpCard({ item, index }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-40px' })
  return (
    <motion.div
      ref={ref}
      className="op-card"
      initial={{ opacity: 0, y: 22 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ delay: index * 0.14, duration: 0.6 }}
    >
      <div className="op-avatar" aria-hidden>{item.initial}</div>
      <div className="op-body">
        <span className="op-label">Opinión</span>
        <h4 className="op-title">{item.title}</h4>
        <p className="op-ex">{item.excerpt}</p>
        <span className="op-by">— {item.author}</span>
      </div>
    </motion.div>
  )
}

// ─── Footer ───────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer className="footer">
      <Rule thick />
      <div className="footer-grid">
        <div>
          <div className="footer-brand">Xpediente Callejero</div>
          <p className="footer-desc">Periodismo de investigación y participación ciudadana desde la Ciudad de México.</p>
          <p className="footer-dossier">DOSSIER · XC-2026 · CDMX · Edición Digital</p>
        </div>
        <div>
          <p className="footer-heading">Secciones</p>
          <ul className="footer-list">
            {NAV.map(s => <li key={s}><a href="#" className="footer-link">{s}</a></li>)}
          </ul>
        </div>
        <div>
          <p className="footer-heading">Contacto</p>
          <ul className="footer-list">
            <li><a href="mailto:oswaldo@xpedientecallejero.com" className="footer-link">oswaldo@xpedientecallejero.com</a></li>
            <li><a href="https://www.xpedientecallejero.com" className="footer-link">www.xpedientecallejero.com</a></li>
            <li><span className="footer-link">@xpediente.callejero</span></li>
          </ul>
        </div>
        <div>
          <p className="footer-heading">Red Social</p>
          <ul className="footer-list">
            {['Instagram', 'TikTok', 'YouTube', 'X', 'Facebook'].map(s => (
              <li key={s}><a href="#" className="footer-link">{s}</a></li>
            ))}
          </ul>
        </div>
      </div>
      <Rule />
      <p className="footer-copy">© 2026 Xpediente Callejero — Un proyecto de periodismo de investigación y participación ciudadana · Todos los derechos reservados</p>
    </footer>
  )
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <div className="newspaper">
      <Masthead />
      <Ticker />
      <Nav />
      <main>
        <Hero />
        <div className="divider" />
        <section className="featured-sec">
          <div className="featured-grid">
            {FEATURED.map((s, i) => <Card key={i} s={s} index={i} />)}
          </div>
        </section>
        <PullQuote />
        <section className="nac-sec">
          <SecHead title="Nacional" />
          <div className="list-stories">
            {NACIONAL.map((s, i) => <ListItem key={i} story={s} index={i} />)}
          </div>
        </section>
        <section className="op-sec">
          <SecHead title="Opinión" />
          <div className="op-grid">
            {OPINION.map((item, i) => <OpCard key={i} item={item} index={i} />)}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
