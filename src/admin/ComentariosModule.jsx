import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { MUNICIPIOS } from '../data'
import { Btn, Icon, Tabs } from '../components/ui'
import { RankBars } from '../components/Charts'

// Redes del reporte; las que aún no están conectadas aparecen como "pronto"
const REDES = [
  { id: 'youtube', label: 'YouTube' },
  { id: 'facebook', label: 'Facebook', pronto: true },
  { id: 'instagram', label: 'Instagram', pronto: true },
  { id: 'tiktok', label: 'TikTok', pronto: true },
  { id: 'x', label: 'X', pronto: true },
]
const nombreRed = id => REDES.find(r => r.id === id)?.label || id

// Miniatura de la publicación comentada
const miniatura = c => c.red === 'youtube' && c.publicacion_id ? `https://i.ytimg.com/vi/${c.publicacion_id}/mqdefault.jpg` : null

const PERIODOS = [
  { id: '7', label: '7 días' },
  { id: '30', label: '30 días' },
  { id: '90', label: '90 días' },
  { id: 'todo', label: 'Todo' },
]

const norm = s => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

// Palabras que no dicen nada del tema
const VACIAS = new Set(('que de la el en y a los las se del por un una con no es lo para al su sus mas pero como ya le si me mi te tu son fue ha hay muy sin sobre este esta estos estas eso esa ese todo todos todas tambien porque cuando donde quien ni o u yo el ella ellos nos les solo asi bien aqui ahi alla ser estar tiene tienen hace hacen va van era eran sea han hasta desde entre cada otro otra otros tan uno dos pues nada algo mismo vez ver aun hoy dia jaja jajaja jajajaja xd q k x d pa pq ya'
).split(' '))
const ZONAS = MUNICIPIOS.map(m => ({ nombre: m.name, n: norm(m.name) }))

const fmt = iso => iso ? new Date(iso).toLocaleString('es-MX', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''
const fmtDia = d => new Date(`${d}T12:00:00`).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })

const api = async body => {
  const { data } = await supabase.auth.getSession()
  const r = await fetch('/api/comentarios', {
    method: 'POST',
    headers: { Authorization: `Bearer ${data.session?.access_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const json = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(json.mensaje || json.errores?.join(' · ') || 'No se pudo actualizar.')
  return json
}

// Botón Excel oculto por ahora; cambiar a true para mostrarlo
const EXCEL_ACTIVO = false

// Excel abre bien el CSV con BOM y punto y coma
const exportarCsv = (filas, periodo) => {
  const col = v => `"${String(v ?? '').replace(/"/g, '""').replace(/\r?\n/g, ' ')}"`
  const enc = ['Red', 'Fecha', 'Autor', 'Comentario', 'Me gusta', 'Respuestas', 'Publicación', 'Enlace']
  const lineas = filas.map(c => [nombreRed(c.red), fmt(c.fecha), c.autor, c.texto, c.likes, c.respuestas, c.publicacion_titulo, c.publicacion_url].map(col).join(';'))
  const blob = new Blob(['﻿' + [enc.map(col).join(';'), ...lineas].join('\r\n')], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `comentarios-${periodo === 'todo' ? 'todo' : `${periodo}-dias`}-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(a.href)
}

export default function ComentariosModule() {
  const [todos, setTodos] = useState(null)
  const [error, setError] = useState('')
  const [aviso, setAviso] = useState('')
  const [sincronizando, setSincronizando] = useState(false)
  const [vista, setVista] = useState('reporte')
  const [periodo, setPeriodo] = useState('30')
  const [red, setRed] = useState('todas')
  const [texto, setTexto] = useState('')

  const cargar = useCallback(async () => {
    const { data, error } = await supabase.from('comentarios').select('*').order('fecha', { ascending: false }).limit(10000)
    if (error) {
      setError(/comentarios/.test(error.message) ? 'Falta ejecutar supabase/11_comentarios.sql en Supabase.' : error.message)
      setTodos([])
    } else {
      setError('')
      setTodos(data)
    }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  const sincronizar = async () => {
    setSincronizando(true)
    setAviso('')
    try {
      const r = await api({ accion: 'sincronizar' })
      const partes = Object.entries(r.redes).map(([k, v]) => `${nombreRed(k)}: ${v.comentarios} comentarios`)
      setAviso(`Actualizado · ${partes.join(' · ')}${r.errores.length ? ` · con errores: ${r.errores.join(' · ')}` : ''}`)
      await cargar()
    } catch (e) {
      setAviso(e.message)
    }
    setSincronizando(false)
  }

  // Comentarios del público (sin los nuestros) dentro del periodo y la red elegidos
  const lista = useMemo(() => {
    if (!todos) return []
    const desde = periodo === 'todo' ? 0 : Date.now() - Number(periodo) * 864e5
    return todos.filter(c => !c.del_canal && (red === 'todas' || c.red === red) && new Date(c.fecha).getTime() >= desde)
  }, [todos, periodo, red])

  const reporte = useMemo(() => {
    const porPub = new Map()
    const porDia = new Map()
    const palabras = new Map()
    const zonas = new Map()
    const autores = new Set()
    for (const c of lista) {
      autores.add(c.autor)
      const p = porPub.get(c.publicacion_id) || { name: c.publicacion_titulo, url: c.publicacion_url, red: c.red, n: 0 }
      p.n++
      porPub.set(c.publicacion_id, p)
      const dia = c.fecha.slice(0, 10)
      porDia.set(dia, (porDia.get(dia) || 0) + 1)
      const t = norm(c.texto)
      for (const w of new Set(t.split(/[^a-z0-9ñ]+/))) if (w.length > 3 && !VACIAS.has(w) && !/^\d+$/.test(w)) palabras.set(w, (palabras.get(w) || 0) + 1)
      for (const z of ZONAS) if (t.includes(z.n)) zonas.set(z.nombre, (zonas.get(z.nombre) || 0) + 1)
    }
    const top = (m, k = 10) => [...m.entries()].map(([name, n]) => ({ name, n })).sort((a, b) => b.n - a.n).slice(0, k)

    // Serie diaria continua (días sin comentarios en cero)
    const dias = [...porDia.keys()].sort()
    const serie = []
    if (dias.length) {
      for (let d = new Date(`${dias[0]}T12:00:00`); d <= new Date(`${dias.at(-1)}T12:00:00`); d.setDate(d.getDate() + 1)) {
        const k = d.toISOString().slice(0, 10)
        serie.push({ dia: k, n: porDia.get(k) || 0 })
      }
    }
    return {
      total: lista.length,
      publicaciones: porPub.size,
      personas: autores.size,
      respuestasNuestras: (todos || []).filter(c => c.del_canal && (red === 'todas' || c.red === red)).length,
      pubs: [...porPub.values()].sort((a, b) => b.n - a.n).slice(0, 10),
      palabras: top(palabras, 12),
      zonas: top(zonas, 10),
      destacados: [...lista].sort((a, b) => b.likes - a.likes || b.respuestas - a.respuestas).slice(0, 5),
      serie,
    }
  }, [lista, todos, red])

  const filtrados = useMemo(() => {
    const b = norm(texto.trim())
    return b ? lista.filter(c => norm(`${c.texto} ${c.autor} ${c.publicacion_titulo}`).includes(b)) : lista
  }, [lista, texto])

  const ultima = todos?.reduce((m, c) => c.sincronizado_at > m ? c.sincronizado_at : m, '')
  const maxDia = Math.max(1, ...reporte.serie.map(d => d.n))
  const tituloPeriodo = PERIODOS.find(p => p.id === periodo)?.label

  return (
    <div className="adm-page com-page">
      <header className="adm-head">
        <div>
          <p className="adm-kicker">Módulo</p>
          <h1 className="adm-h1">Comentarios en redes</h1>
          <p className="adm-stats com-sub">
            Reporte de {red === 'todas' ? 'todas las redes' : nombreRed(red)} · {periodo === 'todo' ? 'todo el historial' : `últimos ${tituloPeriodo}`}
            {ultima && <> · datos al {fmt(ultima)}</>}
          </p>
        </div>
        <div className="mon-head-actions com-no-print">
          {EXCEL_ACTIVO && <Btn variant="ghost" icon="doc" onClick={() => exportarCsv(filtrados, periodo)} disabled={!filtrados.length}>Excel</Btn>}
          <Btn variant="ghost" icon="share" onClick={() => window.print()} disabled={!lista.length}>PDF</Btn>
          <Btn variant="primary" icon="search" onClick={sincronizar} disabled={sincronizando}>{sincronizando ? 'Actualizando…' : 'Actualizar'}</Btn>
        </div>
      </header>

      {error && <p className="adm-error">{error}</p>}
      {aviso && <p className="adm-p com-aviso com-no-print">{aviso}</p>}

      <section className="adm-panel mon-filtros com-no-print">
        <div className="mon-tabs">
          <Tabs id="comvista" small items={[{ id: 'reporte', label: 'Reporte' }, { id: 'lista', label: 'Comentarios' }]} value={vista} onChange={setVista} />
          <Tabs id="comper" small items={PERIODOS} value={periodo} onChange={setPeriodo} />
        </div>
        <div className="who-filter mon-medios">
          <button className={`who-chip${red === 'todas' ? ' who-chip--on' : ''}`} onClick={() => setRed('todas')}>Todas las redes</button>
          {REDES.filter(r => !r.pronto).map(r => (
            <button key={r.id} className={`who-chip${red === r.id ? ' who-chip--on' : ''}`} disabled={r.pronto} onClick={() => setRed(r.id)}>
              {r.label} {r.pronto && <em>pronto</em>}
            </button>
          ))}
        </div>
      </section>

      {todos === null ? <p className="adm-muted">Cargando comentarios…</p> : !todos.length && !error ? (
        <section className="adm-panel">
          <p className="adm-p">Aún no hay comentarios guardados. Presiona <strong>Actualizar</strong> para traerlos de las redes conectadas.</p>
        </section>
      ) : vista === 'reporte' ? (
        <>
          <div className="cal-stats com-stats">
            <div className="cal-stat"><strong>{reporte.total}</strong> comentarios</div>
            <div className="cal-stat"><strong>{reporte.personas}</strong> personas distintas</div>
            <div className="cal-stat"><strong>{reporte.publicaciones}</strong> publicaciones comentadas</div>
            <div className="cal-stat"><strong>{reporte.respuestasNuestras}</strong> respuestas nuestras</div>
          </div>

          {reporte.total === 0 ? (
            <section className="adm-panel"><p className="adm-muted">No hay comentarios en este periodo. Prueba con más días.</p></section>
          ) : (
            <div className="com-grid">
              <section className="adm-panel com-full">
                <h2 className="adm-h2"><Icon name="chart" size={18} /> Comentarios por día</h2>
                <div className="com-dias" role="img" aria-label="Comentarios por día">
                  {reporte.serie.map(d => (
                    <div key={d.dia} className="com-dia" title={`${fmtDia(d.dia)}: ${d.n} comentarios`}>
                      <span className="com-dia-n">{d.n || ''}</span>
                      <span className="com-dia-barra" style={{ height: `${(d.n / maxDia) * 100}%` }} />
                    </div>
                  ))}
                </div>
                <p className="com-dias-eje"><span>{fmtDia(reporte.serie[0].dia)}</span><span>{fmtDia(reporte.serie.at(-1).dia)}</span></p>
              </section>

              <section className="adm-panel">
                <h2 className="adm-h2"><Icon name="play" size={18} /> Publicaciones más comentadas</h2>
                <RankBars rows={reporte.pubs} valueKey="n" />
              </section>

              <section className="adm-panel">
                <h2 className="adm-h2"><Icon name="quote" size={18} /> Palabras más repetidas</h2>
                {reporte.palabras.length ? <RankBars rows={reporte.palabras} valueKey="n" /> : <p className="adm-muted">Sin datos suficientes.</p>}
              </section>

              <section className="adm-panel">
                <h2 className="adm-h2"><Icon name="pin" size={18} /> Municipios mencionados</h2>
                {reporte.zonas.length ? <RankBars rows={reporte.zonas} valueKey="n" /> : <p className="adm-muted">Ningún comentario menciona municipios de la zona en este periodo.</p>}
              </section>

              <section className="adm-panel">
                <h2 className="adm-h2"><Icon name="users" size={18} /> Comentarios destacados</h2>
                <ul className="com-dest">
                  {reporte.destacados.map(c => (
                    <li key={c.id}>
                      <p className="com-texto">“{c.texto}”</p>
                      <p className="mon-meta"><strong>{c.autor}</strong> · {nombreRed(c.red)} · {c.likes} me gusta · {c.respuestas} respuestas</p>
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          )}
        </>
      ) : (
        <section className="adm-panel">
          <label className="field com-no-print">
            <span>Buscar en los comentarios</span>
            <input type="search" value={texto} onChange={e => setTexto(e.target.value)} placeholder="Ej. agua, Morena, Ecatepec…" />
          </label>
          <p className="mon-pie">{filtrados.length} comentarios</p>
          <div className="nlist">
            {filtrados.map(c => (
              <article key={c.id} className="com-row">
                <a className="com-thumb" href={c.publicacion_url} target="_blank" rel="noopener noreferrer" title={c.publicacion_titulo}>
                  {miniatura(c) ? <img src={miniatura(c)} alt="" loading="lazy" /> : <Icon name="doc" size={20} />}
                </a>
                <div className="com-cuerpo">
                <p className="mon-meta">
                  <strong>{c.autor}</strong> · {fmt(c.fecha)} · {nombreRed(c.red)}
                  {c.es_respuesta && <span className="com-tag">respuesta</span>}
                </p>
                <p className="com-texto">{c.texto}</p>
                <p className="mon-meta">
                  {c.likes} me gusta{!c.es_respuesta && <> · {c.respuestas} respuestas</>} · en <a href={c.publicacion_url} target="_blank" rel="noopener noreferrer">{c.publicacion_titulo}</a>
                </p>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
