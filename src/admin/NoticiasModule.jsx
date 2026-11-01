import { useCallback, useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { supabase, videoUrl, uploadVideoFile, VIDEO_BUCKET, MAX_VIDEO_MB, VIDEO_TYPES } from '../lib/supabase'
import { PERSONAJES, PANELES_PORTADA, MUNICIPIOS_DENUNCIA, ESTADOS_EXPEDIENTE, CATEGORIAS_EXPEDIENTE, estadoLabel, youtubeId } from '../data'
import { Btn, Icon, Tabs } from '../components/ui'

const IMG_BUCKET = 'imagenes'
const IMG_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_IMG_MB = 5
const MAX_TITLE = 90 // lo que cabe en una línea de "Alertas recientes"

// Color de la etiqueta del municipio en "Alertas recientes"
const NIVELES = [
  { id: 'alta', label: 'Alta', hint: 'Rojo · urgente' },
  { id: 'media', label: 'Media', hint: 'Naranja · relevante' },
  { id: 'baja', label: 'Baja', hint: 'Informativa' },
]

// ¿La nota es un caso con seguimiento? Las informativas no cuentan en los indicadores.
const EXP_MODOS = [
  { id: 'no', label: 'No', hint: 'Noticia informativa' },
  { id: 'nuevo', label: 'Sí, nuevo', hint: 'Abre un caso' },
  { id: 'existente', label: 'Sí, existente', hint: 'Sigue un caso abierto' },
]

const pad = n => String(n).padStart(2, '0')
const toLocalInput = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
const fmtDate = d => new Date(d).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })
const fmtHour = d => new Date(d).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false })
const imgPathFromUrl = url => url?.split(`/object/public/${IMG_BUCKET}/`)[1]
const isLibraryVideo = url => url?.includes(`/object/public/${VIDEO_BUCKET}/`)
const isMp4 = url => /\.(mp4|webm|mov)(\?|$)/i.test(url || '')

const slug = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50) || 'video'

const EMPTY = () => ({
  personaje: Object.keys(PERSONAJES).find(k => !PERSONAJES[k].host) || Object.keys(PERSONAJES)[0],
  title: '',
  summary: '',
  body: '',
  cover_url: '',
  video_url: '',
  link_url: '',
  municipio: '',
  nivel: 'media',
  destacada: false,
  published: true,
  published_at: toLocalInput(new Date()),
})

function Step({ n, title, hint, children }) {
  return (
    <section className="nf-step">
      <header className="nf-step-head">
        <span className="nf-step-num">{pad(n)}</span>
        <div>
          <h3 className="nf-step-title">{title}</h3>
          {hint && <p className="nf-step-hint">{hint}</p>}
        </div>
      </header>
      {children}
    </section>
  )
}

// ─── Formulario ──────────────────────────────────────────────────────────────

function NoticiaForm({ item, videos, expedientes, onClose, onSaved }) {
  const [form, setForm] = useState(() => item
    ? { ...EMPTY(), ...Object.fromEntries(Object.entries(item).map(([k, v]) => [k, v ?? ''])), published_at: toLocalInput(new Date(item.published_at)) }
    : EMPTY())
  const [expModo, setExpModo] = useState(item?.expediente_id ? 'existente' : 'no')
  const [expNuevo, setExpNuevo] = useState({ estado: 'abierto', categoria: '' })
  const [cover, setCover] = useState(null) // imagen inicial nueva (archivo)
  const [videoFile, setVideoFile] = useState(null) // video nuevo (archivo)
  const [videoSrc, setVideoSrc] = useState(() => (!item?.video_url ? 'link' : isLibraryVideo(item.video_url) ? 'biblioteca' : 'link'))
  const [progress, setProgress] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))
  const p = PERSONAJES[form.personaje]
  const panel = Object.values(PANELES_PORTADA).find(x => x.personajes.includes(form.personaje))

  const coverPreview = useMemo(() => (cover ? URL.createObjectURL(cover) : form.cover_url), [cover, form.cover_url])
  useEffect(() => () => cover && URL.revokeObjectURL(coverPreview), [cover, coverPreview])

  // Lo que se reproduce en la vista previa: archivo recién elegido o el link guardado
  const videoPreview = useMemo(() => {
    if (videoSrc === 'subir') return videoFile ? URL.createObjectURL(videoFile) : (isLibraryVideo(form.video_url) ? form.video_url : '')
    return isMp4(form.video_url) || isLibraryVideo(form.video_url) ? form.video_url : ''
  }, [videoSrc, videoFile, form.video_url])
  useEffect(() => () => videoPreview.startsWith('blob:') && URL.revokeObjectURL(videoPreview), [videoPreview])

  const pickCover = f => {
    setError('')
    if (!f) return
    if (!IMG_TYPES.includes(f.type)) return setError('La imagen inicial debe ser JPG, PNG o WebP.')
    if (f.size > MAX_IMG_MB * 1024 * 1024) return setError(`La imagen inicial pesa más de ${MAX_IMG_MB} MB.`)
    setCover(f)
  }

  const pickVideo = f => {
    setError('')
    if (!f) return
    if (!VIDEO_TYPES.includes(f.type)) return setError('El video debe ser MP4, WebM o MOV.')
    if (f.size > MAX_VIDEO_MB * 1024 * 1024) return setError(`El video pesa más de ${MAX_VIDEO_MB} MB. Comprímelo antes de subirlo.`)
    setVideoFile(f)
  }

  const submit = async e => {
    e.preventDefault()
    setBusy(true)
    setError('')
    let uploadedVideo = null
    let nuevoExpediente = null
    try {
      if (videoSrc === 'link' && /youtu\.?be/i.test(form.video_url) && !youtubeId(form.video_url)) {
        throw new Error('No reconozco ese link de YouTube. Copia el enlace del video, por ejemplo https://youtu.be/…')
      }
      if (expModo === 'existente' && !form.expediente_id) throw new Error('Elige el expediente al que pertenece esta nota.')

      const now = new Date()
      const folder = `${now.getFullYear()}/${pad(now.getMonth() + 1)}`

      let cover_url = form.cover_url || null
      if (cover) {
        const ext = cover.name.split('.').pop().toLowerCase()
        const path = `noticias/${folder}/${crypto.randomUUID()}.${ext}`
        const { error: upErr } = await supabase.storage.from(IMG_BUCKET).upload(path, cover, { contentType: cover.type })
        if (upErr) throw upErr
        cover_url = supabase.storage.from(IMG_BUCKET).getPublicUrl(path).data.publicUrl
      }

      // El video subido aquí también queda en la Biblioteca de videos
      let video_url = form.video_url.trim() || null
      if (videoSrc === 'subir' && videoFile) {
        const ext = videoFile.name.split('.').pop().toLowerCase()
        uploadedVideo = `${folder}/${crypto.randomUUID()}-${slug(form.title)}.${ext}`
        setProgress(0)
        await uploadVideoFile(videoFile, uploadedVideo, setProgress)
        const { error: vErr } = await supabase.from('videos').insert({
          title: form.title.trim(),
          description: form.summary.trim() || null,
          municipio: form.municipio || null,
          storage_path: uploadedVideo,
          size_bytes: videoFile.size,
        })
        if (vErr) throw vErr
        video_url = videoUrl(uploadedVideo)
      }

      let expediente_id = expModo === 'existente' ? form.expediente_id : null
      if (expModo === 'nuevo') {
        const { data, error: xErr } = await supabase.from('expedientes').insert({
          title: form.title.trim(),
          municipio: form.municipio || null,
          categoria: expNuevo.categoria || null,
          estado: expNuevo.estado,
          closed_at: expNuevo.estado === 'cerrado' ? new Date().toISOString() : null,
        }).select('id').single()
        if (xErr) throw xErr
        nuevoExpediente = data.id
        expediente_id = data.id
      }

      const row = {
        personaje: form.personaje,
        title: form.title.trim(),
        summary: form.summary.trim() || null,
        body: form.body.trim() || null,
        cover_url,
        video_url,
        link_url: form.link_url.trim() || null,
        municipio: form.municipio || null,
        nivel: form.nivel,
        destacada: form.destacada,
        expediente_id,
        published: form.published,
        published_at: new Date(form.published_at).toISOString(),
      }
      const { error: dbErr } = item
        ? await supabase.from('noticias').update(row).eq('id', item.id)
        : await supabase.from('noticias').insert(row)
      if (dbErr) throw dbErr
      onSaved()
    } catch (err) {
      if (nuevoExpediente) await supabase.from('expedientes').delete().eq('id', nuevoExpediente)
      if (uploadedVideo) {
        await supabase.from('videos').delete().eq('storage_path', uploadedVideo)
        await supabase.storage.from(VIDEO_BUCKET).remove([uploadedVideo])
      }
      setError(/nivel|destacada/.test(err.message || '')
        ? 'Faltan columnas nuevas: ejecuta supabase/04_noticias_portada.sql en el SQL Editor de Supabase.'
        : /expedientes|expediente_id/.test(err.message || '')
        ? 'Falta crear los expedientes: ejecuta supabase/05_expedientes.sql en el SQL Editor de Supabase.'
        : err.message || 'No se pudo guardar la noticia.')
      setProgress(null)
      setBusy(false)
    }
  }

  return (
    <form className="cal-form nf" onSubmit={submit}>
      <h2 className="adm-h2"><Icon name={item ? 'edit' : 'doc'} size={18} /> {item ? 'Editar noticia' : 'Nueva noticia'}</h2>

      <Step n={1} title="¿Quién la cuenta?" hint="Su foto sale en la alerta y la noticia va a su página.">
        <div className="who-pick">
          {Object.entries(PERSONAJES).map(([key, op]) => (
            <button
              type="button"
              key={key}
              className={`who-opt${form.personaje === key ? ' who-opt--on' : ''}`}
              onClick={() => setForm(f => ({ ...f, personaje: key }))}
              aria-pressed={form.personaje === key}
              title={`${op.name} · ${op.segmento}`}
            >
              <img src={op.img} alt="" style={op.pos ? { objectPosition: op.pos } : undefined} />
              <span>{op.name}</span>
            </button>
          ))}
        </div>
        {p && <p className="nf-who-seg">Sección: <strong>{p.segmento}</strong></p>}
        {panel && <p className="nf-who-seg">También sale en la portada, en <strong>{panel.title}</strong>.</p>}
      </Step>

      <Step n={2} title="La alerta" hint="Así aparece en «Alertas recientes» de la portada.">
        <div className="adm-grid">
          <label className="field field--full">
            <span>Titular <em className={`count${form.title.length > MAX_TITLE ? ' count--over' : ''}`}>{form.title.length}/{MAX_TITLE}</em></span>
            <input required maxLength={MAX_TITLE} value={form.title} onChange={set('title')} placeholder="Vecinos reportan toma clandestina en zona industrial" />
          </label>
          <label className="field">
            <span>Municipio</span>
            <select value={form.municipio} onChange={set('municipio')}>
              <option value="">Sin municipio (sale «Edomex»)</option>
              <option>Estado de México</option>
              {MUNICIPIOS_DENUNCIA.map(m => <option key={m}>{m}</option>)}
            </select>
            <span className="field-hint">Solo los municipios de la lista suman al mapa y al ranking.</span>
          </label>
          <label className="field">
            <span>Fecha y hora</span>
            <input type="datetime-local" required value={form.published_at} onChange={set('published_at')} />
          </label>
        </div>
        <div className="cal-block">
          <span className="cal-label">Nivel</span>
          <div className="nf-levels" role="radiogroup" aria-label="Nivel de la alerta">
            {NIVELES.map(l => (
              <button
                type="button"
                key={l.id}
                role="radio"
                aria-checked={form.nivel === l.id}
                className={`nf-level nf-level--${l.id}${form.nivel === l.id ? ' nf-level--on' : ''}`}
                onClick={() => setForm(f => ({ ...f, nivel: l.id }))}
              >
                <strong>{l.label}</strong><span>{l.hint}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="nf-preview">
          <span className="nf-preview-tag">Vista previa</span>
          <ul className="alerts">
            <li className={`alert alert--${form.nivel}`}>
              {p && <img className="alert-who" src={p.img} alt="" style={p.pos ? { objectPosition: p.pos } : undefined} />}
              <span className="alert-time">{form.published_at ? fmtHour(form.published_at) : '--:--'}</span>
              <span className="alert-muni">{form.municipio || 'Edomex'}</span>
              <span className="alert-text">{form.title || 'Aquí va el titular de la alerta'}</span>
            </li>
          </ul>
        </div>
      </Step>

      <Step n={3} title="Imagen inicial y video" hint="La imagen es la portada de la noticia y la miniatura del video antes de darle play.">
        <div className="cal-block">
          <span className="cal-label">Imagen inicial</span>
          <div className="cover-row">
            {coverPreview ? <img className="cover-prev" src={coverPreview} alt="" /> : <span className="cover-prev cover-prev--empty"><Icon name="camera" size={24} /></span>}
            <div className="cover-actions">
              <label className="btn btn--ghost btn--sm cover-file">
                <Icon name="camera" size={14} /> {coverPreview ? 'Cambiar imagen' : 'Subir imagen'}
                <input type="file" accept={IMG_TYPES.join(',')} hidden onChange={e => pickCover(e.target.files[0])} />
              </label>
              {coverPreview && (
                <Btn type="button" variant="ghost" size="sm" icon="close" onClick={() => { setCover(null); setForm(f => ({ ...f, cover_url: '' })) }}>Quitar</Btn>
              )}
              <span className="field-hint">JPG, PNG o WebP · máx. {MAX_IMG_MB} MB · ideal 16:9</span>
            </div>
          </div>
        </div>

        <div className="cal-block">
          <div className="cal-block-head">
            <span className="cal-label">Video (opcional)</span>
            <Tabs
              id="nvsrc"
              small
              items={[{ id: 'link', label: 'Link de YouTube' }, { id: 'subir', label: 'Subir' }, { id: 'biblioteca', label: 'Biblioteca' }]}
              value={videoSrc}
              onChange={setVideoSrc}
            />
          </div>
          {videoSrc === 'subir' && (
            <div className="cover-actions">
              <label className="btn btn--ghost btn--sm cover-file">
                <Icon name="play" size={14} /> {videoFile ? 'Cambiar video' : 'Elegir video'}
                <input type="file" accept={VIDEO_TYPES.join(',')} hidden onChange={e => pickVideo(e.target.files[0])} />
              </label>
              <span className="field-hint">
                {videoFile ? `${videoFile.name} · ${(videoFile.size / 1024 / 1024).toFixed(1)} MB` : `MP4, WebM o MOV · máx. ${MAX_VIDEO_MB} MB · se guarda también en la Biblioteca`}
              </span>
            </div>
          )}
          {videoSrc === 'biblioteca' && (
            <select className="cal-input" value={isLibraryVideo(form.video_url) ? form.video_url : ''} onChange={set('video_url')}>
              <option value="">Sin video</option>
              {videos.map(v => <option key={v.id} value={videoUrl(v.storage_path)}>{v.title}</option>)}
            </select>
          )}
          {videoSrc === 'link' && (
            <>
              <input className="cal-input" type="url" value={form.video_url} onChange={set('video_url')} placeholder="https://youtu.be/… o https://www.youtube.com/watch?v=…" />
              {youtubeId(form.video_url) && (
                <p className="field-hint nf-yt-ok">
                  <Icon name="check" size={14} /> Video de YouTube detectado. Si está programado, pon la misma fecha y hora en el paso 2: en la web se reproduce hasta esa hora.
                </p>
              )}
            </>
          )}
          {videoPreview && <video key={videoPreview} className="cal-preview" src={videoPreview} poster={coverPreview || undefined} controls preload="metadata" />}
          {progress !== null && (
            <div className="progress" aria-label="Progreso de subida">
              <div className="progress-bar" style={{ width: `${Math.round(progress * 100)}%` }} />
              <span className="progress-label">Subiendo video… {Math.round(progress * 100)}%</span>
            </div>
          )}
        </div>
      </Step>

      <Step n={4} title="La nota" hint="Lo que se lee al abrir el pop-up de la noticia.">
        <div className="adm-grid">
          <label className="field field--full">
            <span>Resumen <em className="count">{form.summary.length}/220</em></span>
            <textarea rows={2} maxLength={220} value={form.summary} onChange={set('summary')} placeholder="Una o dos líneas que enganchen" />
          </label>
          <label className="field field--full">
            <span>Texto completo</span>
            <textarea rows={6} value={form.body} onChange={set('body')} />
          </label>
          <label className="field field--full">
            <span>Link externo (opcional)</span>
            <input type="url" value={form.link_url} onChange={set('link_url')} placeholder="Facebook, Instagram, TikTok, YouTube…" />
          </label>
        </div>
      </Step>

      <Step n={5} title="¿Esta nota es un expediente?" hint="Solo los expedientes suman a los indicadores de la portada.">
        <div className="nf-levels" role="radiogroup" aria-label="¿Es un expediente?">
          {EXP_MODOS.map(m => (
            <button
              type="button"
              key={m.id}
              role="radio"
              aria-checked={expModo === m.id}
              className={`nf-level${expModo === m.id ? ' nf-level--on' : ''}`}
              onClick={() => setExpModo(m.id)}
            >
              <strong>{m.label}</strong><span>{m.hint}</span>
            </button>
          ))}
        </div>
        {expModo === 'nuevo' && (
          <div className="adm-grid">
            <label className="field">
              <span>Estado</span>
              <select value={expNuevo.estado} onChange={e => setExpNuevo(x => ({ ...x, estado: e.target.value }))}>
                {ESTADOS_EXPEDIENTE.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </label>
            <label className="field">
              <span>Categoría</span>
              <select value={expNuevo.categoria} onChange={e => setExpNuevo(x => ({ ...x, categoria: e.target.value }))}>
                <option value="">Sin categoría</option>
                {CATEGORIAS_EXPEDIENTE.map(c => <option key={c}>{c}</option>)}
              </select>
            </label>
          </div>
        )}
        {expModo === 'existente' && (
          <label className="field">
            <span>Expediente</span>
            <select value={form.expediente_id || ''} onChange={set('expediente_id')}>
              <option value="">Elige un expediente…</option>
              {expedientes.map(x => <option key={x.id} value={x.id}>{x.title} · {estadoLabel(x.estado)}</option>)}
            </select>
          </label>
        )}
      </Step>

      <Step n={6} title="Dónde y cuándo sale">
        <div className="adm-grid">
          <label className="check field--full">
            <input type="checkbox" checked={form.destacada} onChange={set('destacada')} />
            <span className="check-box" />
            Mostrar en «Video destacado» de la portada (se usa la destacada más reciente)
          </label>
          <label className="check field--full">
            <input type="checkbox" checked={form.published} onChange={set('published')} />
            <span className="check-box" />
            Publicada (si la fecha es futura, aparece hasta ese momento)
          </label>
        </div>
      </Step>

      {error && <p className="adm-error" role="alert">{error}</p>}

      <div className="cal-actions">
        <Btn type="submit" variant="primary" icon="check" disabled={busy}>{busy ? (progress !== null ? 'Subiendo…' : 'Guardando…') : 'Guardar noticia'}</Btn>
        <Btn type="button" variant="ghost" icon="close" onClick={onClose} disabled={busy}>Cancelar</Btn>
      </div>
    </form>
  )
}

// ─── Módulo ──────────────────────────────────────────────────────────────────

export default function NoticiasModule() {
  const [items, setItems] = useState(null)
  const [videos, setVideos] = useState([])
  const [expedientes, setExpedientes] = useState([])
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('todos')
  const [modal, setModal] = useState(null) // { item? }

  const load = useCallback(async () => {
    const { data, error } = await supabase.from('noticias').select('*').order('published_at', { ascending: false })
    if (error) {
      setError(/noticias/.test(error.message)
        ? 'Falta crear la tabla: ejecuta supabase/03_noticias.sql en el SQL Editor de Supabase.'
        : error.message)
      setItems([])
      return
    }
    setError('')
    setItems(data)
    const { data: exps } = await supabase.from('expedientes').select('id, title, estado').order('created_at', { ascending: false })
    setExpedientes(exps || [])
  }, [])

  useEffect(() => {
    load()
    supabase.from('videos').select('id, title, storage_path').order('created_at', { ascending: false })
      .then(({ data }) => data && setVideos(data))
  }, [load])

  useEffect(() => {
    if (!modal) return
    const onKey = e => e.key === 'Escape' && setModal(null)
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [modal])

  const remove = async n => {
    if (!confirm(`¿Eliminar la noticia "${n.title}"?`)) return
    const { error } = await supabase.from('noticias').delete().eq('id', n.id)
    if (error) return alert(error.message)
    const path = imgPathFromUrl(n.cover_url)
    if (path) await supabase.storage.from(IMG_BUCKET).remove([path])
    load()
  }

  const togglePublish = async n => {
    const { error } = await supabase.from('noticias').update({ published: !n.published }).eq('id', n.id)
    if (error) return alert(error.message)
    load()
  }

  const counts = useMemo(() => {
    const c = {}
    ;(items || []).forEach(n => { c[n.personaje] = (c[n.personaje] || 0) + 1 })
    return c
  }, [items])

  const list = (items || []).filter(n => filter === 'todos' || n.personaje === filter)
  const now = new Date()

  return (
    <div className="adm-page">
      <header className="adm-head">
        <div>
          <p className="adm-kicker">Módulo</p>
          <h1 className="adm-h1">Noticias</h1>
        </div>
        <Btn variant="primary" icon="doc" iconRight="arrow" onClick={() => setModal({})}>Nueva noticia</Btn>
      </header>

      {error && <p className="adm-error">{error}</p>}

      <section className="adm-panel">
        <div className="who-filter">
          <button className={`who-chip${filter === 'todos' ? ' who-chip--on' : ''}`} onClick={() => setFilter('todos')}>
            Todos <em>{items?.length ?? 0}</em>
          </button>
          {Object.entries(PERSONAJES).map(([key, p]) => (
            <button key={key} className={`who-chip${filter === key ? ' who-chip--on' : ''}`} onClick={() => setFilter(key)}>
              <img src={p.img} alt="" style={p.pos ? { objectPosition: p.pos } : undefined} />{p.name} <em>{counts[key] || 0}</em>
            </button>
          ))}
        </div>

        {items === null ? <p className="adm-muted">Cargando…</p> : list.length === 0 ? (
          <p className="adm-muted">Aún no hay noticias{filter !== 'todos' && ` de ${PERSONAJES[filter].name}`}.</p>
        ) : (
          <div className="nlist">
            <AnimatePresence>
              {list.map(n => {
                const p = PERSONAJES[n.personaje]
                const scheduled = n.published && new Date(n.published_at) > now
                return (
                  <motion.article key={n.id} layout className="nrow" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                    {n.cover_url ? <img className="nrow-cover" src={n.cover_url} alt="" /> : <span className="nrow-cover nrow-cover--empty"><Icon name="doc" size={20} /></span>}
                    <div className="nrow-main">
                      <p className="nrow-who">{p && <img src={p.img} alt="" style={p.pos ? { objectPosition: p.pos } : undefined} />}{p?.name || n.personaje}</p>
                      <h3 className="nrow-title">{n.title}</h3>
                      <p className="nrow-meta">
                        {n.nivel && <span className={`nrow-level nrow-level--${n.nivel}`}>{n.nivel}</span>}
                        {fmtDate(n.published_at)}{n.municipio && ` · ${n.municipio}`}
                        {n.video_url && ' · 🎬 video'}
                        {n.destacada && ' · ★ destacada'}
                        {n.expediente_id && ' · 📁 expediente'}
                      </p>
                    </div>
                    <span className={`state ${!n.published ? 'state--pendiente' : scheduled ? 'state--hoy' : 'state--publicada'}`}>
                      {!n.published ? 'Borrador' : scheduled ? 'Programada' : 'Publicada'}
                    </span>
                    <div className="nrow-actions">
                      <Btn variant="ghost" size="sm" icon="edit" onClick={() => setModal({ item: n })}>Editar</Btn>
                      <Btn variant="ghost" size="sm" icon={n.published ? 'close' : 'check'} onClick={() => togglePublish(n)}>
                        {n.published ? 'Ocultar' : 'Publicar'}
                      </Btn>
                      {p && <Btn as="a" variant="ghost" size="sm" icon="ext" href={`/personaje/${p.slug}`} target="_blank" rel="noopener noreferrer">Ver</Btn>}
                      <Btn variant="danger" size="sm" icon="close" onClick={() => remove(n)}>Eliminar</Btn>
                    </div>
                  </motion.article>
                )
              })}
            </AnimatePresence>
          </div>
        )}
      </section>

      <AnimatePresence>
        {modal && (
          <motion.div className="modal-wrap" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setModal(null)}>
            <motion.div
              className="modal cal-modal"
              role="dialog"
              aria-modal="true"
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              onClick={e => e.stopPropagation()}
            >
              <button className="modal-close" onClick={() => setModal(null)} aria-label="Cerrar"><Icon name="close" /></button>
              <NoticiaForm
                item={modal.item}
                videos={videos}
                expedientes={expedientes}
                onClose={() => setModal(null)}
                onSaved={() => { setModal(null); load() }}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
