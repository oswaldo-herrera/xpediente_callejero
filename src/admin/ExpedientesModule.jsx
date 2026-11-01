import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { CATEGORIAS_EXPEDIENTE, ESTADOS_EXPEDIENTE, MUNICIPIOS_DENUNCIA } from '../data'
import { Btn, Icon } from '../components/ui'

const pad = n => String(n).padStart(2, '0')
const today = () => {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
const fmtDay = d => new Date(`${d}T12:00:00`).toLocaleDateString('es-MX', { dateStyle: 'medium' })

// ─── Un expediente ───────────────────────────────────────────────────────────

function ExpedienteRow({ exp, onChanged }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(exp)
  const [resp, setResp] = useState({ fecha: today(), descripcion: '', url: '' })
  const set = k => e => setDraft(d => ({ ...d, [k]: e.target.value }))

  const now = new Date()
  const notas = exp.noticias || []
  const visible = notas.some(n => n.published && new Date(n.published_at) <= now)
  const programada = !visible && notas.some(n => n.published)

  const update = async patch => {
    const { error } = await supabase.from('expedientes').update(patch).eq('id', exp.id)
    if (error) return alert(error.message)
    onChanged()
  }

  const saveEdit = async e => {
    e.preventDefault()
    await update({ title: draft.title.trim(), municipio: draft.municipio || null, categoria: draft.categoria || null })
    setEditing(false)
  }

  const changeEstado = e => {
    const estado = e.target.value
    update({ estado, closed_at: estado === 'cerrado' ? new Date().toISOString() : null })
  }

  const addRespuesta = async e => {
    e.preventDefault()
    const { error } = await supabase.from('expediente_respuestas').insert({
      expediente_id: exp.id,
      fecha: resp.fecha,
      descripcion: resp.descripcion.trim(),
      url: resp.url.trim() || null,
    })
    if (error) return alert(error.message)
    setResp({ fecha: today(), descripcion: '', url: '' })
    onChanged()
  }

  const removeRespuesta = async r => {
    if (!confirm('¿Eliminar esta respuesta oficial?')) return
    const { error } = await supabase.from('expediente_respuestas').delete().eq('id', r.id)
    if (error) return alert(error.message)
    onChanged()
  }

  const removeExpediente = async () => {
    if (!confirm(`¿Eliminar el expediente "${exp.title}"? Sus notas siguen publicadas como noticias normales.`)) return
    const { error } = await supabase.from('expedientes').delete().eq('id', exp.id)
    if (error) return alert(error.message)
    onChanged()
  }

  return (
    <article className="xrow">
      <header className="xrow-head">
        {editing ? (
          <form className="adm-grid xrow-edit" onSubmit={saveEdit}>
            <label className="field field--full">
              <span>Título</span>
              <input required value={draft.title} onChange={set('title')} />
            </label>
            <label className="field">
              <span>Municipio</span>
              <select value={draft.municipio || ''} onChange={set('municipio')}>
                <option value="">Sin municipio</option>
                {MUNICIPIOS_DENUNCIA.map(m => <option key={m}>{m}</option>)}
              </select>
            </label>
            <label className="field">
              <span>Categoría</span>
              <select value={draft.categoria || ''} onChange={set('categoria')}>
                <option value="">Sin categoría</option>
                {CATEGORIAS_EXPEDIENTE.map(c => <option key={c}>{c}</option>)}
              </select>
            </label>
            <div className="cal-actions field--full">
              <Btn type="submit" variant="primary" size="sm" icon="check">Guardar</Btn>
              <Btn type="button" variant="ghost" size="sm" icon="close" onClick={() => setEditing(false)}>Cancelar</Btn>
            </div>
          </form>
        ) : (
          <div className="xrow-main">
            <h3 className="nrow-title">{exp.title}</h3>
            <p className="nrow-meta">
              {[exp.municipio, exp.categoria].filter(Boolean).join(' · ') || 'Sin municipio ni categoría'}
            </p>
          </div>
        )}
        <label className="field xrow-estado">
          <span>Estado</span>
          <select value={exp.estado} onChange={changeEstado}>
            {ESTADOS_EXPEDIENTE.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </label>
      </header>

      <p className="xrow-count">
        <span className={`state ${visible ? 'state--publicada' : programada ? 'state--hoy' : 'state--pendiente'}`}>
          {visible ? 'Cuenta en indicadores' : programada ? 'Cuenta al publicarse su nota' : 'Sin nota publicada: no cuenta'}
        </span>
      </p>

      <div className="xrow-block">
        <span className="cal-label">Notas ({notas.length})</span>
        {notas.length === 0 ? <p className="adm-muted">Sin notas ligadas.</p> : (
          <ul className="xrow-list">
            {notas.map(n => <li key={n.id}>{n.title}</li>)}
          </ul>
        )}
      </div>

      <div className="xrow-block">
        <span className="cal-label">Respuestas oficiales ({exp.expediente_respuestas.length})</span>
        {exp.expediente_respuestas.length > 0 && (
          <ul className="xrow-list">
            {exp.expediente_respuestas.map(r => (
              <li key={r.id} className="xrow-resp">
                <span>
                  <strong>{fmtDay(r.fecha)}:</strong> {r.descripcion}
                  {r.url && <> · <a href={r.url} target="_blank" rel="noopener noreferrer">Ver documento</a></>}
                </span>
                <button type="button" className="xrow-x" onClick={() => removeRespuesta(r)} aria-label="Eliminar respuesta"><Icon name="close" size={14} /></button>
              </li>
            ))}
          </ul>
        )}
        <form className="xrow-add" onSubmit={addRespuesta}>
          <input className="cal-input" type="date" required value={resp.fecha} onChange={e => setResp(r => ({ ...r, fecha: e.target.value }))} aria-label="Fecha de la respuesta" />
          <input className="cal-input" required value={resp.descripcion} onChange={e => setResp(r => ({ ...r, descripcion: e.target.value }))} placeholder="Qué respondió la autoridad" aria-label="Descripción" />
          <input className="cal-input" type="url" value={resp.url} onChange={e => setResp(r => ({ ...r, url: e.target.value }))} placeholder="Link del oficio (opcional)" aria-label="Link del oficio" />
          <Btn type="submit" variant="ghost" size="sm" icon="check">Agregar</Btn>
        </form>
      </div>

      <div className="nrow-actions">
        <Btn variant="ghost" size="sm" icon="edit" onClick={() => { setDraft(exp); setEditing(true) }}>Editar</Btn>
        <Btn variant="danger" size="sm" icon="close" onClick={removeExpediente}>Eliminar</Btn>
      </div>
    </article>
  )
}

// ─── Módulo ──────────────────────────────────────────────────────────────────

export default function ExpedientesModule() {
  const [items, setItems] = useState(null)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('todos')

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('expedientes')
      .select('*, noticias(id, title, published, published_at), expediente_respuestas(*)')
      .order('created_at', { ascending: false })
    if (error) {
      setError(/expediente/.test(error.message)
        ? 'Falta crear la tabla: ejecuta supabase/05_expedientes.sql en el SQL Editor de Supabase.'
        : error.message)
      setItems([])
      return
    }
    setError('')
    setItems(data)
  }, [])

  useEffect(() => { load() }, [load])

  const list = (items || []).filter(x => filter === 'todos' || x.estado === filter)

  return (
    <div className="adm-page">
      <header className="adm-head">
        <div>
          <p className="adm-kicker">Módulo</p>
          <h1 className="adm-h1">Expedientes</h1>
        </div>
      </header>

      {error && <p className="adm-error">{error}</p>}

      <section className="adm-panel">
        <div className="who-filter">
          <button className={`who-chip${filter === 'todos' ? ' who-chip--on' : ''}`} onClick={() => setFilter('todos')}>
            Todos <em>{items?.length ?? 0}</em>
          </button>
          {ESTADOS_EXPEDIENTE.map(s => (
            <button key={s.id} className={`who-chip${filter === s.id ? ' who-chip--on' : ''}`} onClick={() => setFilter(s.id)}>
              {s.label} <em>{(items || []).filter(x => x.estado === s.id).length}</em>
            </button>
          ))}
        </div>

        {items === null ? <p className="adm-muted">Cargando…</p> : list.length === 0 ? (
          <p className="adm-muted">Aún no hay expedientes. Se crean desde el formulario de noticia.</p>
        ) : (
          <div className="nlist">
            {list.map(x => <ExpedienteRow key={x.id} exp={x} onChanged={load} />)}
          </div>
        )}
      </section>
    </div>
  )
}
