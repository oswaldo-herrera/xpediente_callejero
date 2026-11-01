import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import './App.css'
import {
  SECCIONES, TICKER, KPIS, MUNICIPIOS, INCIDENTES, ESTATUS,
  PERSONAJES, PANELES_PORTADA, MUNICIPIOS_DENUNCIA, estadoLabel, youtubeId, WHATSAPP_NUMBER, TEASER_VIDEO, TEASER_CLOSABLE,
} from './data'
import { Btn, Icon, Panel, PanelHead, Tabs, Counter, StatusBadge } from './components/ui'
import { RankBars, Donut, TrendLine } from './components/Charts'
import HeatMap from './components/HeatMap'
import { supabase, supabaseReady } from './lib/supabase'
import TeaserIntro from './components/TeaserIntro'

const NAV = [
  { id: 'inicio', label: 'Inicio', icon: 'home' },
  { id: 'nosotros', label: 'Nosotros', icon: 'users' },
  { id: 'expedientes', label: 'Secciones', icon: 'folder' },
  { id: 'mapa', label: 'Mapa de calor', icon: 'map' },
  { id: 'datos', label: 'Datos', icon: 'chart' },
  { id: 'evidencia', label: 'Evidencia aérea', icon: 'drone' },
  { id: 'denuncia', label: 'Denuncia ciudadana', icon: 'megaphone' },
]

const scrollTo = id => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })

// ─── Reloj en vivo (hora del centro de México) ───────────────────────────────

function useClock() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  const tz = 'America/Mexico_City'
  return {
    time: now.toLocaleTimeString('es-MX', { timeZone: tz, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }),
    date: now.toLocaleDateString('es-MX', { timeZone: tz, weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }),
  }
}

// ─── Sección activa al hacer scroll ──────────────────────────────────────────

function useScrollSpy(ids) {
  const [active, setActive] = useState(ids[0])
  useEffect(() => {
    const obs = new IntersectionObserver(
      entries => entries.forEach(e => e.isIntersecting && setActive(e.target.id)),
      { rootMargin: '-35% 0px -60% 0px' },
    )
    ids.forEach(id => { const el = document.getElementById(id); if (el) obs.observe(el) })
    return () => obs.disconnect()
  }, [ids])
  return active
}

// ─── Sidebar ─────────────────────────────────────────────────────────────────

function Sidebar({ active, open, onClose }) {
  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            className="scrim"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
        )}
      </AnimatePresence>
      <aside className={`sidebar${open ? ' sidebar--open' : ''}`}>
        <div className="side-brand">
          <span className="stamp stamp--side" role="img" aria-label="Xpediente Callejero" />
          <button className="side-close" onClick={onClose} aria-label="Cerrar menú">
            <Icon name="close" />
          </button>
        </div>
        <nav className="side-nav" aria-label="Secciones">
          {NAV.map(n => (
            <motion.button
              key={n.id}
              className={`side-link${active === n.id ? ' side-link--on' : ''}`}
              onClick={() => { scrollTo(n.id); onClose() }}
              whileHover={{ x: 4 }}
              whileTap={{ scale: 0.96 }}
            >
              {active === n.id && (
                <motion.span className="side-pill" layoutId="side-pill" transition={{ type: 'spring', stiffness: 500, damping: 38 }} />
              )}
              <Icon name={n.icon} size={18} />
              <span>{n.label}</span>
            </motion.button>
          ))}
        </nav>
        <Btn variant="outline" icon="megaphone" block onClick={() => { scrollTo('denuncia'); onClose() }}>
          Denuncia ciudadana
        </Btn>
        <p className="side-quote">La información<br />también <em>es poder.</em></p>
      </aside>
    </>
  )
}

// ─── Header ──────────────────────────────────────────────────────────────────

function Header({ query, setQuery, onMenu }) {
  const { time, date } = useClock()
  return (
    <header className="header" id="inicio">
      <div className="header-bg" aria-hidden />
      <button className="menu-btn" onClick={onMenu} aria-label="Abrir menú"><Icon name="menu" size={22} /></button>

      <div className="brand">
        <motion.img
          className="brand-logo"
          src="/logos/LOGO%20SOBRE%20OSCUROS.png"
          alt="Xpediente Callejero"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>

      <div className="header-tools">
        <label className="search">
          <Icon name="search" size={16} />
          <input
            type="search"
            placeholder="Buscar municipio, expediente, sección…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && scrollTo('expedientes')}
          />
        </label>
        <div className="clock">
          <span className="clock-date">{date}</span>
          <span className="clock-time">{time}</span>
          <span className="clock-tz">Edo. Méx. (GMT-6)</span>
        </div>
        <Btn variant="primary" icon="megaphone" onClick={() => scrollTo('denuncia')}>Denuncia aquí</Btn>
      </div>
    </header>
  )
}

// ─── Ticker ──────────────────────────────────────────────────────────────────

function Ticker() {
  const items = [...TICKER, ...TICKER]
  return (
    <div className="ticker" role="marquee" aria-live="off">
      <div className="ticker-badge"><span className="live-dot" />Última hora</div>
      <div className="ticker-track">
        <motion.div
          className="ticker-inner"
          animate={{ x: ['0%', '-50%'] }}
          transition={{ duration: 70, repeat: Infinity, ease: 'linear' }}
        >
          {items.map((t, i) => (
            <span key={i} className="ticker-item">{t}<span className="ticker-sep" aria-hidden>◆</span></span>
          ))}
        </motion.div>
      </div>
    </div>
  )
}

// ─── KPIs ────────────────────────────────────────────────────────────────────

// Solo llegan los expedientes que ya tienen una nota visible (regla en 05_expedientes.sql)
function useExpedientes() {
  const [rows, setRows] = useState([])
  useEffect(() => {
    if (!supabaseReady) return
    supabase.from('expedientes').select('estado, municipio, categoria').then(({ data }) => setRows(data || []))
  }, [])
  return rows
}

function useKpis() {
  const rows = useExpedientes()
  const [respuestas, setRespuestas] = useState(0)
  useEffect(() => {
    if (!supabaseReady) return
    supabase.from('expediente_respuestas').select('id', { count: 'exact', head: true })
      .then(({ count }) => setRespuestas(count || 0))
  }, [])
  const activos = rows.filter(x => x.estado !== 'cerrado' && x.municipio).map(x => x.municipio)
  return {
    abiertos: rows.filter(x => x.estado === 'abierto' || x.estado === 'investigacion').length,
    seguimiento: rows.filter(x => x.estado === 'seguimiento').length,
    cerrados: rows.filter(x => x.estado === 'cerrado').length,
    respuestas,
    municipios: new Set(activos).size,
  }
}

function Kpis() {
  const values = useKpis()
  return (
    <div className="kpis">
      {KPIS.map((k, i) => (
        <motion.div
          key={k.label}
          className="kpi"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 + i * 0.07, duration: 0.5 }}
          whileHover={{ y: -4 }}
        >
          <span className="kpi-ico"><Icon name={k.icon} size={26} stroke={1.6} /></span>
          <div>
            <p className="kpi-label">{k.label}</p>
            <p className="kpi-value">
              <Counter value={values[k.key]} />{k.key === 'municipios' && ` / ${MUNICIPIOS.length}`}
            </p>
            <p className="kpi-note">{k.note}</p>
          </div>
        </motion.div>
      ))}
      <motion.div
        className="kpi kpi--alert"
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.5 }}
      >
        <div className="kpi-alert-top">
          <Icon name="megaphone" size={30} stroke={1.6} />
          <div>
            <p className="kpi-label">Denuncia ciudadana</p>
            <p className="kpi-note">Cuéntanos qué pasa en tu calle</p>
          </div>
        </div>
        <Btn variant="danger" size="sm" iconRight="arrow" block onClick={() => scrollTo('denuncia')}>
          Denunciar ahora
        </Btn>
      </motion.div>
    </div>
  )
}

// ─── Mapa + ranking ──────────────────────────────────────────────────────────

// Cada nota visible suma a su municipio en el mapa y en el ranking
function useNotasMapa() {
  const [notas, setNotas] = useState([])
  useEffect(() => {
    if (!supabaseReady) return
    supabase
      .from('noticias')
      .select('municipio, published_at, expedientes(categoria)')
      .eq('published', true)
      .lte('published_at', new Date().toISOString())
      .not('municipio', 'is', null)
      .then(({ data }) => setNotas(data || []))
  }, [])
  return notas
}

function MapRow() {
  const [mode, setMode] = useState('total')
  const notas = useNotasMapa()
  const rows = useMemo(() => {
    const desde = Date.now() - 30 * 24 * 60 * 60 * 1000
    return MUNICIPIOS
      .map(m => {
        const propias = notas.filter(n => n.municipio === m.name)
        return { ...m, total: propias.length, mes: propias.filter(n => new Date(n.published_at) >= desde).length }
      })
      .filter(m => m[mode] > 0)
      .sort((a, b) => b[mode] - a[mode])
      .slice(0, 10)
  }, [mode, notas])
  return (
    <div className="row row--map">
      <Panel id="mapa" className="panel--map">
        <PanelHead icon="map" title="Mapa de calor" sub="Intensidad de notas publicadas · Zona metropolitana">
          <span className="chip-live"><span className="live-dot" />Actualizado</span>
        </PanelHead>
        <HeatMap notas={notas} />
      </Panel>
      <Panel className="panel--rank" delay={0.1}>
        <PanelHead icon="chart" title="Ranking de municipios" sub="Por número de notas publicadas" />
        <Tabs
          id="rank"
          items={[{ id: 'total', label: 'Total' }, { id: 'mes', label: 'Últimos 30 días' }]}
          value={mode}
          onChange={setMode}
        />
        {rows.length ? <RankBars rows={rows} valueKey={mode} /> : <p className="alerts-empty">Próximamente...</p>}
      </Panel>
    </div>
  )
}

// ─── Datos ───────────────────────────────────────────────────────────────────

// Notas visibles por mes, de hace 11 meses al actual
function useTendencia() {
  const [notas, setNotas] = useState([])
  useEffect(() => {
    if (!supabaseReady) return
    const now = new Date()
    supabase
      .from('noticias')
      .select('published_at')
      .eq('published', true)
      .gte('published_at', new Date(now.getFullYear(), now.getMonth() - 11, 1).toISOString())
      .lte('published_at', now.toISOString())
      .then(({ data }) => setNotas(data || []))
  }, [])
  return useMemo(() => {
    const now = new Date()
    return Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1)
      const m = d.toLocaleDateString('es-MX', { month: 'short' }).replace('.', '')
      return {
        m: m[0].toUpperCase() + m.slice(1),
        v: notas.filter(n => {
          const p = new Date(n.published_at)
          return p.getFullYear() === d.getFullYear() && p.getMonth() === d.getMonth()
        }).length,
      }
    })
  }, [notas])
}

function DataRow() {
  const expedientes = useExpedientes()
  const tendencia = useTendencia()
  const total = expedientes.length
  // Lo que no tiene categoría cuenta como "Otros"
  const incidentes = INCIDENTES.map(c => {
    const n = expedientes.filter(x => (x.categoria || 'Otros') === c.label).length
    return { ...c, value: total ? Math.round((n / total) * 100) : 0 }
  })
  const estatus = ESTATUS.map(s => ({ ...s, value: expedientes.filter(x => x.estado === s.estado).length }))
  return (
    <div className="row row--data" id="datos">
      <Panel>
        <PanelHead icon="layers" title="Tipo de incidentes" sub="En todos los expedientes" />
        {total ? <Donut data={incidentes} total={total} label={total === 1 ? 'expediente' : 'expedientes'} /> : <p className="alerts-empty">Próximamente...</p>}
      </Panel>
      <Panel delay={0.08}>
        <PanelHead icon="chart" title="Tendencia de notas publicadas" sub="Últimos 12 meses" />
        {tendencia.some(d => d.v) ? <TrendLine data={tendencia} /> : <p className="alerts-empty">Próximamente...</p>}
      </Panel>
      <Panel delay={0.16}>
        <PanelHead icon="folder" title="Estatus" sub={`Total: ${total.toLocaleString('es-MX')}`} />
        <div className="status-list">
          {estatus.map(s => (
            <div key={s.label} className={`status status--${s.tone}`}>
              <span className="status-ico"><Icon name={s.icon} size={22} /></span>
              <div>
                <p className="status-val"><Counter value={s.value} /></p>
                <p className="status-label">{s.label} · {total ? ((s.value / total) * 100).toFixed(1) : 0}%</p>
              </div>
              <motion.span
                className="status-bar"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: total ? s.value / total : 0 }}
                transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>
          ))}
        </div>
      </Panel>
    </div>
  )
}

// ─── Destacado + alertas ─────────────────────────────────────────────────────

// Últimas noticias publicadas (admin → Noticias). null: todavía cargando.
function useAlertas() {
  const [items, setItems] = useState(null)
  useEffect(() => {
    if (!supabaseReady) return setItems([])
    supabase
      .from('noticias')
      .select('*, expedientes(estado)')
      .eq('published', true)
      .lte('published_at', new Date().toISOString()) // las programadas esperan a su hora
      .order('published_at', { ascending: false })
      .limit(20)
      .then(({ data }) => {
        const rows = (data || []).filter(n => PERSONAJES[n.personaje])
        const today = new Date().toDateString()
        setItems(rows.map((n, i) => {
          const d = new Date(n.published_at)
          return {
            id: n.id,
            who: n.personaje,
            time: d.toDateString() === today
              ? d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false })
              : d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }),
            municipio: n.municipio || 'Edomex',
            text: n.title,
            expediente: n.expedientes?.estado,
            level: n.nivel || (i < 2 ? 'alta' : i < 4 ? 'media' : 'baja'),
          }
        }))
      })
  }, [])
  return items
}

// ─── ¿Qué es Xpediente Callejero? ────────────────────────────────────────────

const PILARES = [
  { icon: 'search', title: 'Investigación periodística', text: 'Reportajes que documentan irregularidades con datos, fuentes y evidencia.' },
  { icon: 'megaphone', title: 'Denuncia ciudadana', text: 'La voz de los vecinos convertida en expediente público.' },
  { icon: 'shield', title: 'Rendición de cuentas', text: 'Seguimiento a cada caso hasta exigir respuestas a la autoridad.' },
  { icon: 'drone', title: 'Evidencia aérea', text: 'Drones que muestran desde arriba lo que no se ve al ras de calle.' },
]

function Manifiesto() {
  const [abierto, setAbierto] = useState(null)
  return (
    <section className="mani" id="nosotros" aria-labelledby="mani-title">
      <p className="mani-masthead" aria-hidden><span>¿Quiénes somos?</span><span>Investigación · Denuncia · Seguimiento</span><span>Año I · Edición digital</span></p>
      <span className="mani-x" aria-hidden>X</span>
      <span className="mani-corner mani-corner--br" aria-hidden />

      <div className="mani-main">
        <div className="mani-head">
          <p className="mani-kicker"><span className="live-dot" /> Medio digital de la zona metropolitana</p>
          <h2 id="mani-title" className="mani-title">
            La calle ya tiene <span className="mani-hl"><span className="mani-hl-x">x</span>pediente.</span>
          </h2>
          <p className="mani-stamp-wrap"><span className="mani-stamp">Donde la noticia la hacemos todos</span></p>
        </div>
        <div className="mani-copy">
          <p className="mani-lead">
            <strong>Xpediente Callejero</strong> somos un <strong>medio digital de la zona metropolitana</strong> enfocado
            en la investigación periodística, la denuncia ciudadana y el seguimiento de asuntos públicos, para{' '}
            <mark>visibilizar problemáticas, documentar irregularidades y exigir rendición de cuentas</mark>.
          </p>
          <p className="mani-text">
            A través de reportajes, redes sociales y evidencias aéreas con drones, acerca a la ciudadanía una visión
            diferente, crítica y visual de lo que sucede en sus calles y comunidades.
          </p>
        </div>
      </div>

      <ul className="mani-pillars">
        {PILARES.map((p, i) => {
          const on = abierto === i
          return (
            <li key={p.title} className={`mani-pillar${on ? ' mani-pillar--on' : ''}`}>
              <button type="button" className="mani-pillar-head" aria-expanded={on} onClick={() => setAbierto(on ? null : i)}>
                <span className="mani-pillar-ico"><Icon name={p.icon} size={18} /></span>
                <span className="mani-pillar-title">{p.title}</span>
                <span className="mani-pillar-more" aria-hidden><Icon name="arrow" size={14} /></span>
              </button>
              <AnimatePresence initial={false}>
                {on && (
                  <motion.div className="mani-pillar-drop" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }}>
                    <p className="mani-pillar-text">{p.text}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function PerfilCard({ who, img, imgPos, role, tag, reverse }) {
  const navigate = useNavigate()
  const p = PERSONAJES[who]
  return (
    <Panel className="panel--perfil">
      <div className={`liz-card${reverse ? ' liz-card--rev' : ''}`}>
        <img className="liz-card-img" src={img} alt={p.name} loading="lazy" style={imgPos ? { objectPosition: imgPos } : undefined} />
        <div className="liz-card-body">
          <h3 className="liz-card-name">{p.name}</h3>
          <p className="liz-card-role">{role}</p>
          {tag && <p className="liz-card-tag">{tag}</p>}
          <Btn as="a" variant="ghost" size="sm" iconRight="arrow" className="liz-card-btn" href={`/personaje/${p.slug}`}
            onClick={e => { e.preventDefault(); navigate(`/personaje/${p.slug}`) }}>
            Ver todos
          </Btn>
        </div>
      </div>
    </Panel>
  )
}

function FeaturedRow() {
  const navigate = useNavigate()
  const alertas = useAlertas()

  // Abre la página del personaje con la noticia ya abierta en su pop-up
  const openAlert = a => {
    const slug = PERSONAJES[a.who].slug
    if (a.id) navigate(`/personaje/${slug}?nota=${a.id}`)
    else navigate(`/personaje/${slug}`, {
      state: { nota: { id: `alerta-${a.time}`, title: a.text, municipio: a.municipio, dateLabel: `Hoy · ${a.time}` } },
    })
  }
  return (
    <div className="row row--featured">
      <Panel className="panel--alerts" delay={0.1}>
        <PanelHead icon="alert" title="Esto me huele a" sub="Noticias de alto impacto de la zona metropolitana">
          {alertas?.length > 0 && <span className="chip-live chip-live--red"><span className="live-dot" />En vivo</span>}
        </PanelHead>
        {alertas?.length === 0 && <p className="alerts-empty">Próximamente...</p>}
        <ul className="alerts">
          {(alertas || []).map((a, i) => (
            <motion.li
              key={a.id || i}
              className={`alert alert--${a.level}`}
              role="link"
              tabIndex={0}
              onClick={() => openAlert(a)}
              onKeyDown={e => e.key === 'Enter' && openAlert(a)}
              title={`Ver la noticia en la página de ${PERSONAJES[a.who].name}`}
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
            >
              <img
                className="alert-who"
                src={PERSONAJES[a.who].img}
                alt={PERSONAJES[a.who].name}
                title={PERSONAJES[a.who].name}
                loading="lazy"
              />
              <span className="alert-time">{a.time}</span>
              <span className="alert-muni">{a.municipio}</span>
              <span className="alert-text">
                {a.expediente && <span className="exp-badge">Expediente · {estadoLabel(a.expediente)}</span>}
                {a.text}
              </span>
            </motion.li>
          ))}
        </ul>
      </Panel>
    </div>
  )
}

// ─── Expedientes (secciones) ─────────────────────────────────────────────────

// Filtros de la sección: Todos + cada personaje
const FILTROS = [{ id: 'Todos', label: 'Todos' }, ...Object.entries(PERSONAJES).filter(([, p]) => !p.host).map(([id, p]) => ({ id, label: p.name }))]

function Expedientes({ query, setQuery, cat, setCat }) {
  const navigate = useNavigate()
  // "Todos" muestra todas las tarjetas; un nombre lleva directo a la página del personaje
  const pick = id => (id === 'Todos' ? setCat('Todos') : navigate(`/personaje/${PERSONAJES[id].slug}`))
  const q = query.trim().toLowerCase()
  // Una tarjeta por personaje (los 12), en el orden oficial
  const list = Object.values(PERSONAJES).filter(p => !p.host &&
    (cat === 'Todos' || p.key === cat) &&
    (!q || [p.name, p.segmento, p.seccion?.name, p.seccion?.title, p.seccion?.municipio, p.seccion?.folio]
      .some(t => t && t.toLowerCase().includes(q))),
  )
  return (
    <Panel id="expedientes" className="panel--exp">
      <PanelHead icon="folder" title="Equipo Informativo" sub="12 informantes · elige uno para ver sus noticias">
        {q && (
          <Btn variant="ghost" size="sm" icon="close" onClick={() => setQuery('')}>“{query}”</Btn>
        )}
      </PanelHead>
      <Tabs id="cat" items={FILTROS} value={cat} onChange={pick} small />
      <motion.div className="exp-grid" layout>
        <AnimatePresence mode="popLayout">
          {list.map(p => (
            <motion.article
              key={p.key}
              layout
              className="exp"
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.94 }}
              transition={{ duration: 0.3 }}
              whileHover={{ y: -6 }}
            >
              <Link to={`/personaje/${p.slug}`} className="exp-link" aria-label={`Ir a la sección de ${p.name}`}>
                <span className="exp-media exp-media--char">
                  <img src={p.img} alt="" loading="lazy" />
                  <span className="exp-play"><Icon name="arrow" size={18} /></span>
                </span>
                <span className="exp-name">{p.name}</span>
              </Link>
            </motion.article>
          ))}
        </AnimatePresence>
      </motion.div>
      {list.length === 0 && (
        <p className="empty">
          {cat !== 'Todos' && PERSONAJES[cat]
            ? <>Aún no hay notas de {PERSONAJES[cat].name} aquí. <Link to={`/personaje/${PERSONAJES[cat].slug}`}>Ver su página →</Link></>
            : 'Sin expedientes que coincidan con la búsqueda.'}
        </p>
      )}
    </Panel>
  )
}

// ─── Detalle del expediente ──────────────────────────────────────────────────

function ExpedienteModal({ sec, onClose }) {
  const [copied, setCopied] = useState(false)
  useEffect(() => {
    if (!sec) return
    const onKey = e => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = '' }
  }, [sec, onClose])

  const share = async () => {
    const data = { title: `Xpediente Callejero · ${sec.title}`, url: sec.link }
    try {
      if (navigator.share) await navigator.share(data)
      else { await navigator.clipboard.writeText(sec.link); setCopied(true); setTimeout(() => setCopied(false), 1800) }
    } catch { /* cancelado */ }
  }

  return (
    <AnimatePresence>
      {sec && (
        <motion.div className="modal-wrap" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-label={`Expediente ${sec.folio}`}
            initial={{ y: 40, scale: 0.97, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 30, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            onClick={e => e.stopPropagation()}
          >
            <button className="modal-close" onClick={onClose} aria-label="Cerrar"><Icon name="close" /></button>
            <div className="modal-head">
              <StatusBadge status={sec.status} />
              <p className="modal-kicker">Expediente</p>
              <h2 className="modal-folio">{sec.folio}</h2>
              <p className="modal-title">{sec.title}</p>
              {sec.tagline && <p className="exp-tagline exp-tagline--lg">{sec.tagline}</p>}
            </div>
            <div className="modal-grid">
              {sec.video ? (
                <div className="modal-media">
                  <video src={sec.video} poster={sec.imgSrc} controls autoPlay playsInline />
                </div>
              ) : (
                <a className="modal-media" href={sec.link} target="_blank" rel="noopener noreferrer">
                  <img src={sec.imgSrc} alt={sec.title} />
                  <span className="play"><Icon name="play" size={28} /></span>
                </a>
              )}
              <div>
                <dl className="facts">
                  <dt>Sección</dt><dd>{sec.num} · {sec.name}</dd>
                  <dt>Lugar</dt><dd>{sec.municipio}</dd>
                  <dt>Categoría</dt><dd>{sec.cat}</dd>
                  <dt>Publicación</dt><dd>{sec.date}</dd>
                  <dt>Estado</dt><dd>{sec.status}</dd>
                </dl>
              </div>
            </div>
            <h3 className="modal-sub"><Icon name="doc" size={16} /> Narrativa del caso</h3>
            <p className="modal-text">{sec.intro}</p>
            <p className="modal-text modal-text--muted">{sec.desc}</p>
            <ol className="timeline">
              {['Reporte ciudadano', 'Recorrido en campo', 'Publicación', 'Seguimiento'].map((t, i) => (
                <motion.li key={t} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.1 }}
                  className={i < (sec.status === 'Publicado' ? 4 : 3) ? 'done' : ''}>
                  <span />{t}
                </motion.li>
              ))}
            </ol>
            <div className="modal-actions">
              <Btn as="a" variant="primary" icon="play" iconRight="ext" href={sec.link} target="_blank" rel="noopener noreferrer">
                Ver nota completa
              </Btn>
              <Btn variant="ghost" icon="share" onClick={share}>{copied ? 'Enlace copiado' : 'Compartir'}</Btn>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ─── Evidencia aérea + voces ─────────────────────────────────────────────────

const youtubeThumb = url => {
  const id = youtubeId(url)
  return id && `https://img.youtube.com/vi/${id}/hqdefault.jpg`
}

// Últimas notas visibles de los personajes de un panel, listas para pintarse
function useNotasPanel(panel) {
  const navigate = useNavigate()
  const [notas, setNotas] = useState([])
  useEffect(() => {
    if (!supabaseReady) return
    supabase
      .from('noticias')
      .select('id, personaje, title, municipio, cover_url, video_url, link_url')
      .in('personaje', PANELES_PORTADA[panel].personajes)
      .eq('published', true)
      .lte('published_at', new Date().toISOString())
      .order('published_at', { ascending: false })
      .limit(4)
      .then(({ data }) => setNotas(data || []))
  }, [panel])
  return notas.map(n => {
    const p = PERSONAJES[n.personaje]
    return {
      key: n.id,
      title: n.title,
      municipio: n.municipio,
      who: p.name,
      img: n.cover_url || youtubeThumb(n.video_url) || youtubeThumb(n.link_url) || p.img,
      link: n.link_url || n.video_url,
      open: () => navigate(`/personaje/${p.slug}?nota=${n.id}`),
    }
  })
}

function EvidenceRow() {
  const [main, ...thumbs] = useNotasPanel('evidencia')
  const voces = useNotasPanel('voces').slice(0, 3)
  return (
    <div className="row row--evidence">
      <Panel id="evidencia">
        <PanelHead icon="drone" title="Evidencia aérea - Halcón Negro" sub="El Ojo que Todo lo Ve · imágenes de dron en zonas de investigación">
          {main?.link && (
            <Btn as="a" variant="ghost" size="sm" iconRight="ext" href={main.link} target="_blank" rel="noopener noreferrer">
              Ver video
            </Btn>
          )}
        </PanelHead>
        {!main ? <p className="alerts-empty">Próximamente...</p> : (
        <div className={`evi${thumbs.length ? '' : ' evi--solo'}`}>
          <button className="evi-main" onClick={main.open}>
            <img src={main.img} alt="" />
            <span className="evi-hud" aria-hidden>
              <span className="hud-c hud-c--tl" /><span className="hud-c hud-c--tr" />
              <span className="hud-c hud-c--bl" /><span className="hud-c hud-c--br" />
              <span className="hud-cross" />
            </span>
            <span className="evi-rec"><span className="live-dot" />REC · DRON XC-01</span>
            <span className="evi-cap">
              <strong>{main.municipio}</strong>
              <span>{main.title}</span>
            </span>
          </button>
          {thumbs.length > 0 && <div className="evi-thumbs">
            {thumbs.map(t => (
              <motion.button key={t.key} className="evi-thumb" onClick={t.open} whileHover={{ x: 4 }}>
                <img src={t.img} alt="" loading="lazy" />
                <span>
                  <strong>{t.title}</strong>
                  <em>{t.municipio}</em>
                </span>
              </motion.button>
            ))}
          </div>}
        </div>
        )}
      </Panel>
      <Panel className="panel--voices" delay={0.1}>
        <PanelHead icon="quote" title="La voz de la banqueta" sub="La ciudadanía también investiga" />
        {voces.length > 0 ? (
          <div className="evi-thumbs">
            {voces.map(v => (
              <motion.button key={v.key} className="evi-thumb" onClick={v.open} whileHover={{ x: 4 }}>
                <img src={v.img} alt="" loading="lazy" />
                <span>
                  <strong>{v.title}</strong>
                  <em>{v.who}{v.municipio && ` · ${v.municipio}`}</em>
                </span>
              </motion.button>
            ))}
          </div>
        ) : <p className="alerts-empty">Próximamente...</p>}
      </Panel>
    </div>
  )
}

// ─── Denuncia ciudadana ──────────────────────────────────────────────────────

function Denuncia() {
  const [form, setForm] = useState({ municipio: '', tipo: '', desc: '', nombre: '', anonimo: true, coords: '' })
  const [geo, setGeo] = useState('idle')
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))

  const locate = () => {
    if (!navigator.geolocation) return setGeo('error')
    setGeo('loading')
    navigator.geolocation.getCurrentPosition(
      p => { setForm(f => ({ ...f, coords: `${p.coords.latitude.toFixed(5)}, ${p.coords.longitude.toFixed(5)}` })); setGeo('ok') },
      () => setGeo('error'),
      { timeout: 10000 },
    )
  }

  const submit = e => {
    e.preventDefault()
    const text = [
      '*DENUNCIA CIUDADANA · Xpediente Callejero*',
      '',
      `*Municipio:* ${form.municipio}`,
      `*Tipo:* ${form.tipo}`,
      form.coords ? `*Ubicación:* https://maps.google.com/?q=${encodeURIComponent(form.coords)}` : null,
      '',
      form.desc,
      '',
      form.anonimo ? '_Denuncia anónima._' : `*Nombre / contacto:* ${form.nombre}`,
    ].filter(l => l !== null).join('\n')
    // Sin número configurado, WhatsApp deja elegir a quién enviarlo
    const to = WHATSAPP_NUMBER.replace(/\D/g, '')
    window.open(`https://wa.me/${to}?text=${encodeURIComponent(text)}`, '_blank', 'noopener')
  }

  return (
    <Panel id="denuncia" className="panel--denuncia">
      <div className="den-intro">
        <span className="den-ico"><Icon name="megaphone" size={34} stroke={1.5} /></span>
        <div>
          <h2 className="den-title">Denuncia ciudadana</h2>
          <p>Tu denuncia puede generar un cambio. Cuéntanos qué sucede, dónde y desde cuándo. Nosotros abrimos el expediente.</p>
        </div>
        <ul className="den-steps">
          <li><Icon name="camera" size={20} />Fotos o video</li>
          <li><Icon name="gps" size={20} />Ubicación GPS</li>
          <li><Icon name="doc" size={20} />Descripción</li>
          <li><Icon name="mask" size={20} />Anónimo</li>
        </ul>
      </div>
      <form className="den-form" onSubmit={submit}>
        <label className="field">
          <span>Municipio</span>
          <select required value={form.municipio} onChange={set('municipio')}>
            <option value="">Selecciona…</option>
            {MUNICIPIOS_DENUNCIA.map(m => <option key={m}>{m}</option>)}
          </select>
        </label>
        <label className="field">
          <span>Tipo de problema</span>
          <select required value={form.tipo} onChange={set('tipo')}>
            <option value="">Selecciona…</option>
            {INCIDENTES.map(i => <option key={i.label}>{i.label}</option>)}
          </select>
        </label>
        <label className="field field--full">
          <span>¿Qué está pasando?</span>
          <textarea required rows={4} value={form.desc} onChange={set('desc')} placeholder="Describe el problema, la calle o colonia y desde cuándo ocurre." />
        </label>
        <div className="field field--full field--row">
          <Btn type="button" variant="ghost" size="sm" icon="gps" onClick={locate}>
            {geo === 'loading' ? 'Ubicando…' : geo === 'ok' ? 'Ubicación agregada' : 'Usar mi ubicación'}
          </Btn>
          <span className="field-hint">
            {geo === 'ok' ? form.coords : geo === 'error' ? 'No fue posible obtener la ubicación.' : 'Opcional'}
          </span>
        </div>
        <label className="check">
          <input type="checkbox" checked={form.anonimo} onChange={set('anonimo')} />
          <span className="check-box" />
          Enviar como anónimo
        </label>
        {!form.anonimo && (
          <label className="field field--full">
            <span>Nombre y contacto</span>
            <input value={form.nombre} onChange={set('nombre')} placeholder="Nombre, teléfono o correo" />
          </label>
        )}
        <Btn type="submit" variant="primary" icon="megaphone" iconRight="arrow" block className="field--full">
          Realizar denuncia
        </Btn>
        <p className="field-hint field--full">Se abrirá WhatsApp con tu denuncia lista para enviar; ahí puedes adjuntar fotos o video.</p>
      </form>
    </Panel>
  )
}

// ─── Footer ──────────────────────────────────────────────────────────────────

const REDES = [
  {
    name: 'Facebook',
    url: 'https://www.facebook.com/xpedientecallejerodigital',
    icon: <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />,
  },
  {
    name: 'YouTube',
    url: 'https://www.youtube.com/@xpedientecallejero',
    icon: <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />,
  },
  {
    name: 'TikTok',
    url: 'https://www.tiktok.com/@xpediente.calleje',
    icon: <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />,
  },
  {
    name: 'X',
    url: 'https://x.com/xpedientecallej',
    icon: <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z" />,
  },
  {
    name: 'Instagram',
    url: 'https://www.instagram.com/xpediente.callejero',
    icon: (
      <>
        <rect x="2" y="2" width="20" height="20" rx="5.5" fill="none" stroke="currentColor" strokeWidth="2" />
        <circle cx="12" cy="12" r="4.6" fill="none" stroke="currentColor" strokeWidth="2" />
        <circle cx="17.6" cy="6.4" r="1.4" />
      </>
    ),
  },
]

function Footer({ onGo }) {
  return (
    <footer className="footer" id="contacto">
      <div className="footer-grid">
        <div>
          <div className="footer-brand"><span className="stamp stamp--lg" aria-hidden />Xpediente Callejero</div>
          <p className="footer-desc">Periodismo de investigación y participación ciudadana desde el territorio del Estado de México. La calle ya tiene expediente.</p>
          <p className="footer-mono">DOSSIER · XC-2026 · EDOMEX · EDICIÓN DIGITAL</p>
        </div>
        <div>
          <p className="footer-heading">Secciones</p>
          <ul className="footer-list footer-list--cols">
            {Object.entries(PERSONAJES).map(([key, p]) => (
              <li key={key}>
                <Link to={`/personaje/${p.slug}`}>{p.name}</Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="footer-heading">Contacto</p>
          <ul className="footer-list">
            <li><a href="https://www.xpedientecallejero.com">www.xpedientecallejero.com</a></li>
          </ul>
          <ul className="footer-social">
            {REDES.map(r => (
              <li key={r.name}>
                <a href={r.url} target="_blank" rel="noopener noreferrer" aria-label={r.name} title={r.name}>
                  <svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor" aria-hidden>{r.icon}</svg>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <p className="footer-copy">© 2026 Xpediente Callejero — Periodismo de investigación y participación ciudadana · Todos los derechos reservados</p>
    </footer>
  )
}

// ─── Botón flotante de WhatsApp ──────────────────────────────────────────────

const WA_PATH = 'M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.61-.92-2.21-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.08c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.69.25-1.29.17-1.41-.07-.12-.27-.2-.57-.35M12.05 21.79h-.01a9.87 9.87 0 01-5.03-1.38l-.36-.21-3.74.98 1-3.65-.24-.37a9.86 9.86 0 01-1.51-5.26c0-5.45 4.44-9.88 9.89-9.88 2.64 0 5.12 1.03 6.99 2.9a9.83 9.83 0 012.89 6.99c0 5.45-4.44 9.88-9.89 9.88m8.41-18.3A11.82 11.82 0 0012.05 0C5.5 0 .16 5.34.16 11.89c0 2.1.55 4.14 1.59 5.95L.06 24l6.3-1.65a11.88 11.88 0 005.68 1.45h.01c6.55 0 11.89-5.34 11.89-11.89 0-3.18-1.24-6.16-3.48-8.41'

function WhatsAppFab() {
  // Sin número configurado, WhatsApp deja elegir a quién enviar el mensaje
  const to = WHATSAPP_NUMBER.replace(/D/g, '')
  const text = 'Hola Xpediente Callejero, quiero compartir información.'
  return (
    <motion.a
      className="wa-fab"
      href={`https://wa.me/${to}?text=${encodeURIComponent(text)}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Escríbenos por WhatsApp"
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 1.2, type: 'spring', stiffness: 260, damping: 18 }}
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.92 }}
    >
      <span className="wa-ring" aria-hidden />
      <svg viewBox="0 0 24 24" width="30" height="30" aria-hidden="true"><path fill="currentColor" d={WA_PATH} /></svg>
      <span className="wa-tip">Escríbenos por WhatsApp</span>
    </motion.a>
  )
}

// ─── App ─────────────────────────────────────────────────────────────────────

const SPY_IDS = NAV.map(n => n.id)

export default function App() {
  const [query, setQuery] = useState('')
  const [menu, setMenu] = useState(false)
  const [openSec, setOpenSec] = useState(null)
  const active = useScrollSpy(SPY_IDS)
  const closeSec = useCallback(() => setOpenSec(null), [])

  // Al llegar con un ancla (p. ej. /#denuncia desde la página de un personaje)
  const { hash } = useLocation()
  useEffect(() => {
    if (!hash) return
    const t = setTimeout(() => document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth' }), 400)
    return () => clearTimeout(t)
  }, [hash])
  const [cat, setCat] = useState('Todos')

  // Desde el pie de página: filtra Secciones por personaje y lleva a ellas
  const goToCat = c => {
    setQuery('')
    setCat(c)
    scrollTo('expedientes')
  }

  return (
    <div className="app">
      <Sidebar active={active} open={menu} onClose={() => setMenu(false)} />
      <div className="main">
        <Header query={query} setQuery={setQuery} onMenu={() => setMenu(true)} />
        {/* Última hora oculta por el momento: <Ticker /> */}
        <main className="content">
          <Manifiesto />
          <PerfilCard who="lizzet" img="/lizzet_a.png" role="Periodista y abogada" tag="Periodismo local: desde el aire lo vemos, pero al ras de calle lo entendemos." />
          <PerfilCard who="narizio" reverse img={PERSONAJES.narizio.img} imgPos="center 22%" role="Presentador de Xpediente Callejero" />
          <FeaturedRow />
          <Expedientes query={query} setQuery={setQuery} cat={cat} setCat={setCat} />
          <Kpis />
          <MapRow />
          <DataRow />
          <EvidenceRow />
          <Denuncia />
        </main>
        <Footer onGo={goToCat} />
      </div>
      {/* Botón flotante de WhatsApp oculto por el momento: <WhatsAppFab /> */}
      <TeaserIntro src={TEASER_VIDEO} closable={TEASER_CLOSABLE} />
      <ExpedienteModal sec={openSec} onClose={closeSec} />
    </div>
  )
}
