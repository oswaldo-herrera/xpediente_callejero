import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom'
import './App.css'
import { PERSONAJES, TEASER_VIDEO, TEASER_CLOSABLE, estadoLabel, youtubeId } from './data'
import { supabase, supabaseReady } from './lib/supabase'
import { Btn, Icon, StatusBadge } from './components/ui'
import TeaserIntro from './components/TeaserIntro'

const fmtDate = d => new Date(d).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })
const isFile = url => /\.(mp4|webm|mov)(\?|$)/i.test(url || '')

// Portada de la tarjeta: la imagen inicial o, si no hay, la miniatura de YouTube
const cardImg = n => {
  const id = youtubeId(n.video_url) || youtubeId(n.link_url)
  return n.cover_url || (id && `https://img.youtube.com/vi/${id}/hqdefault.jpg`)
}

// ─── Detalle de una noticia ──────────────────────────────────────────────────

function NoticiaModal({ n, onClose }) {
  useEffect(() => {
    if (!n) return
    const onKey = e => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [n, onClose])

  const yt = youtubeId(n?.video_url) || youtubeId(n?.link_url)

  return (
    <AnimatePresence>
      {n && (
        <motion.div className="modal-wrap" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.article
            className="modal sp-modal"
            role="dialog"
            aria-modal="true"
            aria-label={n.title}
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 30, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            onClick={e => e.stopPropagation()}
          >
            <button className="modal-close" onClick={onClose} aria-label="Cerrar"><Icon name="close" /></button>
            <p className="modal-kicker">{n.dateLabel || fmtDate(n.published_at)}{n.municipio && ` · ${n.municipio}`}</p>
            {n.expedientes && <span className="exp-badge">Expediente · {estadoLabel(n.expedientes.estado)}</span>}
            <h2 className="sp-modal-title">{n.title}</h2>
            {n.summary && <p className="exp-tagline exp-tagline--lg">{n.summary}</p>}
            <div className="sp-modal-media">
              {isFile(n.video_url) ? (
                <video src={n.video_url} poster={n.cover_url || undefined} controls autoPlay playsInline />
              ) : yt ? (
                <iframe
                  src={`https://www.youtube.com/embed/${yt}`}
                  title={n.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : n.cover_url ? (
                <img src={n.cover_url} alt={n.title} />
              ) : null}
            </div>
            {n.body && <p className="modal-text sp-body">{n.body}</p>}
            {(n.link_url || (n.video_url && !isFile(n.video_url) && !yt)) && (
              <div className="modal-actions">
                <Btn as="a" variant="primary" icon="play" iconRight="ext" href={n.link_url || n.video_url} target="_blank" rel="noopener noreferrer">
                  Ver nota completa
                </Btn>
              </div>
            )}
          </motion.article>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ─── Página del personaje ────────────────────────────────────────────────────

export default function PersonajePage() {
  const { slug } = useParams()
  const p = Object.values(PERSONAJES).find(x => x.slug === slug)
  const [news, setNews] = useState(null)
  const [open, setOpen] = useState(null)
  const [params] = useSearchParams()
  const { state } = useLocation()
  const notaId = params.get('nota')

  // Llegando desde "Alertas recientes": abre esa noticia en su pop-up
  useEffect(() => {
    if (state?.nota) setOpen(state.nota)
  }, [state])
  useEffect(() => {
    if (!notaId || !news) return
    const n = news.find(x => x.id === notaId)
    if (n) setOpen(n)
  }, [notaId, news])

  useEffect(() => {
    window.scrollTo(0, 0)
    if (p) document.title = `${p.name} · Xpediente Callejero`
    setNews(null)
    if (!p || !supabaseReady) return setNews([])
    supabase
      .from('noticias')
      .select('*, expedientes(estado)')
      .eq('personaje', p.key)
      .eq('published', true)
      .lte('published_at', new Date().toISOString())
      .order('published_at', { ascending: false })
      .then(({ data }) => setNews(data || []))
  }, [slug]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!p) {
    return (
      <div className="sp">
        <div className="main sp-missing">
          <h1 className="adm-h1">Personaje no encontrado</h1>
          <Btn as="a" variant="primary" href="/" icon="home">Volver al inicio</Btn>
        </div>
      </div>
    )
  }

  const items = news || []
  const others = Object.values(PERSONAJES).filter(x => x.key !== p.key)

  return (
    <div className="sp">
      <div className="main">
        <header className="sp-top">
          <Link to="/" className="sp-brand" aria-label="Xpediente Callejero, inicio">
            <span className="stamp" aria-hidden />
            <span><strong>Xpediente</strong> Callejero</span>
          </Link>
          <nav className="sp-crumbs" aria-label="Ruta">
            <Link to="/">Inicio</Link>
            <span aria-hidden>/</span>
            <Link to="/#expedientes">Informantes</Link>
            <span aria-hidden>/</span>
            <span>{p.name}</span>
          </nav>
          <Btn as="a" variant="primary" size="sm" icon="megaphone" href="/#denuncia">Denuncia</Btn>
        </header>

        <motion.section
          key={p.slug}
          className="sp-hero"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="sp-char">
            <img src={p.img} alt={p.name} style={p.pos ? { objectPosition: p.pos } : undefined} />
          </div>
          <div className="sp-intro">
            <p className="adm-kicker">{p.kicker || 'Personaje'} · Xpediente Callejero</p>
            <h1 className="sp-title">{p.name}</h1>
            {p.segmento && <p className="sp-segment">{p.segmento}</p>}
            {news?.length === 0 && <p className="sp-desc">Muy pronto sus historias en Xpediente Callejero.</p>}
            <div className="sp-meta">
              <span><strong>{items.length}</strong> {items.length === 1 ? 'noticia' : 'noticias'}</span>
            </div>
          </div>
        </motion.section>

        <section className="panel sp-news">
          <header className="panel-head">
            <div>
              <h2 className="panel-title"><Icon name="doc" size={17} className="panel-title-ico" />Noticias de {p.name}</h2>
              <p className="panel-sub">Lo más reciente</p>
            </div>
          </header>
          {news === null ? <p className="adm-muted">Cargando…</p> : items.length === 0 ? (
            <p className="adm-muted">Aún no hay noticias de {p.name}. ¡Muy pronto!</p>
          ) : (
            <div className="sp-grid">
              {items.map((n, i) => (
                <motion.button
                  key={n.id}
                  type="button"
                  className="sp-card"
                  onClick={() => setOpen(n)}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i, 8) * 0.06 }}
                  whileHover={{ y: -6 }}
                >
                  <span className="sp-card-media">
                    {cardImg(n) ? <img src={cardImg(n)} alt="" loading="lazy" /> : <span className="sp-card-ph"><Icon name="doc" size={30} /></span>}
                    {(n.video_url || youtubeId(n.link_url)) && <span className="exp-play sp-card-play"><Icon name="play" size={18} /></span>}
                    {i === 0 && news?.length > 0 && <span className="exp-cat">Nuevo</span>}
                  </span>
                  <span className="sp-card-body">
                    <span className="sp-card-date">{n.dateLabel || fmtDate(n.published_at)}{n.municipio && ` · ${n.municipio}`}</span>
                    {n.expedientes && <span className="exp-badge">Expediente · {estadoLabel(n.expedientes.estado)}</span>}
                    <span className="exp-title">{n.title}</span>
                    {n.summary && <span className="sp-card-sum">{n.summary}</span>}
                    {n.status && <StatusBadge status={n.status} />}
                  </span>
                </motion.button>
              ))}
            </div>
          )}
        </section>

        <section className="sp-others" aria-label="Otros informantes">
          <h2 className="panel-title"><Icon name="users" size={17} className="panel-title-ico" />Otros informantes</h2>
          <div className="sp-others-row">
            {others.map(o => (
              <Link key={o.key} to={`/personaje/${o.slug}`} className="sp-other">
                <img src={o.img} alt="" loading="lazy" style={o.pos ? { objectPosition: o.pos } : undefined} />
                <span className="sp-other-name">{o.name}</span>
                <span className="sp-other-sec">{o.segmento || o.seccion?.name || 'Próximamente'}</span>
              </Link>
            ))}
          </div>
        </section>

        <footer className="sp-foot">© 2026 Xpediente Callejero · <Link to="/">Volver al inicio</Link></footer>
      </div>

      <NoticiaModal n={open} onClose={() => setOpen(null)} />
      <TeaserIntro src={TEASER_VIDEO} closable={TEASER_CLOSABLE} />
    </div>
  )
}
