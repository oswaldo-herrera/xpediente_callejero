import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MUNICIPIOS } from '../data'
import { supabase } from '../lib/supabase'
import { Btn, Icon, Tabs } from '../components/ui'

// Texto sin acentos y en minúsculas para comparar
const norm = s => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

// Cómo se reconoce cada municipio en el texto (patrones sobre texto normalizado)
const PATRONES = {
  'Cuautitlán': /\bcuautitlan\b(?! izcalli)/,
  'Atizapán de Zaragoza': /\batizapan\b/,
  'Gustavo A. Madero': /\bgustavo a\.? madero\b|\bgam\b/,
  'Nicolás Romero': /\bnicolas romero\b/,
}
const patron = nombre => PATRONES[nombre] || new RegExp(`\\b${norm(nombre).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`)
const ZONAS = MUNICIPIOS.map(m => ({ nombre: m.name, re: patron(m.name) }))
const EDOMEX = /\bestado de mexico\b|\bedomex\b|\bmexiquense|\bedomex\b/

const TEMAS = [
  { id: 'todos', label: 'Todos' },
  { id: 'politica', label: 'Política', re: /alcald|cabildo|ayuntamiento|regidor|sindic|diputad|senador|congreso|legislat|gobernador|delfina|morena|\bpri\b|\bpan\b|\bmc\b|partido|eleccion|electoral|presidente municipal|presidenta municipal|funcionari|transparencia|corrupci/ },
  { id: 'seguridad', label: 'Seguridad', re: /seguridad|polic|homicid|asesin|\brobo|asalt|detenid|balacera|ataque armado|extorsi|secuestr|fiscal|delincu|violenc|feminicid/ },
  { id: 'servicios', label: 'Obras y servicios', re: /\bobra|bache|\bagua\b|drenaje|alumbrado|basura|pavimen|socavon|inundaci|transporte|vialidad|mexibus|\btren\b|predial|mercado/ },
]

const ALCANCES = [
  { id: 'zonas', label: 'Las 21 zonas del mapa' },
  { id: 'edomex', label: 'Todo el Estado de México' },
  ...ZONAS.map(z => ({ id: z.nombre, label: z.nombre })),
]

const PERIODOS = [
  { id: '1', label: 'Hoy' },
  { id: '3', label: '3 días' },
  { id: '7', label: '7 días' },
  { id: 'todo', label: 'Todo' },
]

// Notas "parecidas" (mismo tema en varios medios): palabras de 4+ letras en común
const palabras = t => new Set(norm(t).split(/[^a-z0-9ñ]+/).filter(w => w.length >= 4))
const parecido = (a, b) => {
  let comun = 0
  for (const w of a) if (b.has(w)) comun++
  return comun / Math.min(a.size, b.size || 1)
}

const fmt = iso => iso ? new Date(iso).toLocaleString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Sin fecha'

// Notas guardadas del usuario (tabla notas_guardadas; cada quien ve solo las suyas)
function useGuardadas() {
  const [lista, setLista] = useState([])
  const [error, setError] = useState('')
  useEffect(() => {
    supabase.from('notas_guardadas').select('*').order('created_at', { ascending: false })
      .then(({ data, error }) => error ? setError('No se pudieron cargar tus notas guardadas. ¿Ya se ejecutó 10_notas_guardadas.sql?') : setLista(data))
  }, [])
  const links = useMemo(() => new Set(lista.map(g => g.link)), [lista])
  const alternar = async n => {
    setError('')
    if (links.has(n.link)) {
      const { error } = await supabase.from('notas_guardadas').delete().eq('link', n.link)
      if (error) return setError('No se pudo quitar la nota. Intenta de nuevo.')
      setLista(l => l.filter(g => g.link !== n.link))
    } else {
      const fila = { link: n.link, titulo: n.titulo, medio: n.medio, fecha: n.fecha || null, imagen: n.imagen || null, resumen: n.resumen || null, zonas: n.zonas || [] }
      const { data, error } = await supabase.from('notas_guardadas').insert(fila).select().single()
      if (error) return setError('No se pudo guardar la nota. Intenta de nuevo.')
      setLista(l => [data, ...l])
    }
  }
  return { lista, links, alternar, error }
}

// Tarjeta de una nota (en el monitoreo o en Guardadas)
function NotaCard({ n, grupo, guardada, onGuardar, onCrear, extra }) {
  return (
    <article className="mon-row">
      {n.imagen ? <img className="nrow-cover" src={n.imagen} alt="" loading="lazy" referrerPolicy="no-referrer" />
        : <span className="nrow-cover nrow-cover--empty"><Icon name="doc" size={20} /></span>}
      <div className="nrow-main">
        <p className="mon-meta">
          <strong>{n.medio}</strong> · {fmt(n.fecha)}
          {grupo?.medios.length > 1 && <span className="mon-cob">{grupo.medios.length} medios</span>}
          {extra}
        </p>
        <h3 className="nrow-title"><a href={n.link} target="_blank" rel="noopener noreferrer">{n.titulo}</a></h3>
        {n.resumen && <p className="mon-resumen">{n.resumen}</p>}
        {n.zonas?.length > 0 && (
          <p className="mon-zonas">{n.zonas.map(z => <span key={z}>{z}</span>)}</p>
        )}
        {grupo?.notas.length > 1 && (
          <details className="mon-mas">
            <summary>También en: {grupo.medios.filter(m => m !== n.medio).join(', ')}</summary>
            <ul>
              {grupo.notas.slice(1).map(x => (
                <li key={x.link}><a href={x.link} target="_blank" rel="noopener noreferrer">{x.medio}: {x.titulo}</a></li>
              ))}
            </ul>
          </details>
        )}
        <div className="nrow-actions">
          <Btn as="a" variant="ghost" size="sm" icon="ext" href={n.link} target="_blank" rel="noopener noreferrer">Leer nota</Btn>
          <Btn variant={guardada ? 'primary' : 'ghost'} size="sm" icon={guardada ? 'check' : 'bookmark'} onClick={() => onGuardar(n)}>
            {guardada ? 'Guardada' : 'Guardar'}
          </Btn>
          {onCrear && <Btn variant="ghost" size="sm" icon="edit" onClick={() => onCrear(n)}>Crear nuestra nota</Btn>}
        </div>
      </div>
    </article>
  )
}

export default function MonitoreoModule({ puedeCrear = true }) {
  const navigate = useNavigate()
  const guardadas = useGuardadas()
  const [vista, setVista] = useState('medios')
  const [datos, setDatos] = useState(null)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')
  const [alcance, setAlcance] = useState('edomex')
  const [tema, setTema] = useState('politica')
  const [periodo, setPeriodo] = useState('7')
  const [medio, setMedio] = useState('todos')
  const [orden, setOrden] = useState('cobertura')
  const [texto, setTexto] = useState('')

  const municipio = ZONAS.find(z => z.nombre === alcance)

  // Con un municipio elegido, además se busca su nombre en los medios que lo permiten
  const cargar = useCallback(async () => {
    setCargando(true)
    setError('')
    try {
      const q = municipio ? `?buscar=${encodeURIComponent(municipio.nombre)}` : ''
      const r = await fetch(`/api/monitoreo${q}`)
      if (!r.ok) throw new Error(String(r.status))
      setDatos(await r.json())
    } catch {
      setError('No se pudieron cargar las noticias. Revisa tu conexión e intenta de nuevo.')
    } finally {
      setCargando(false)
    }
  }, [municipio])

  useEffect(() => { cargar() }, [cargar])

  const grupos = useMemo(() => {
    if (!datos) return []
    const desde = periodo === 'todo' ? 0 : Date.now() - Number(periodo) * 24 * 60 * 60 * 1000
    const temaRe = TEMAS.find(t => t.id === tema)?.re
    const busca = norm(texto.trim())

    const filtradas = datos.noticias
      .map(n => {
        const t = norm(`${n.titulo} ${n.resumen}`)
        const zonas = ZONAS.filter(z => z.re.test(t)).map(z => z.nombre)
        if (n.busqueda && !zonas.includes(n.busqueda)) zonas.unshift(n.busqueda)
        return { ...n, t, zonas }
      })
      .filter(n => (!n.fecha && periodo === 'todo') || (n.fecha && new Date(n.fecha).getTime() >= desde))
      .filter(n => alcance === 'zonas' ? n.zonas.length > 0
        : alcance === 'edomex' ? n.zonas.length > 0 || n.local || EDOMEX.test(n.t)
        : n.zonas.includes(alcance))
      .filter(n => !temaRe || temaRe.test(n.t))
      .filter(n => !busca || n.t.includes(busca))

    // Agrupa la misma historia contada por varios medios
    const lista = []
    for (const n of filtradas) {
      const p = palabras(n.titulo)
      const g = lista.find(x => p.size >= 3 && parecido(p, x.p) >= 0.5)
      if (g) g.notas.push(n)
      else lista.push({ p, notas: [n] })
    }
    return lista
      .map(g => {
        const notas = g.notas.sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''))
        return { id: notas[0].link, notas, medios: [...new Set(notas.map(x => x.medio))], fecha: notas[0].fecha || '' }
      })
      .filter(g => medio === 'todos' || g.medios.includes(medio))
      .sort((a, b) => orden === 'cobertura'
        ? b.medios.length - a.medios.length || b.fecha.localeCompare(a.fecha)
        : b.fecha.localeCompare(a.fecha))
  }, [datos, alcance, tema, periodo, medio, orden, texto])

  const conteoMedios = useMemo(() => {
    const c = {}
    for (const g of grupos) for (const m of g.medios) c[m] = (c[m] || 0) + 1
    return c
  }, [grupos])

  const googleNoticias = () => {
    const lugar = municipio ? `"${municipio.nombre}"` : '"Estado de México"'
    const t = TEMAS.find(x => x.id === tema)
    const extra = t?.id === 'politica' ? ' alcalde OR cabildo OR ayuntamiento' : t?.id === 'seguridad' ? ' seguridad' : t?.id === 'servicios' ? ' obras OR servicios' : ''
    window.open(`https://news.google.com/search?q=${encodeURIComponent(lugar + extra + (texto ? ` ${texto}` : ''))}&hl=es-419&gl=MX&ceid=MX:es-419`, '_blank', 'noopener')
  }

  // Abre el formulario de noticia con el municipio y la fuente para citarla
  const crearNoticia = (n, zona) => navigate('/admin/noticias', {
    state: { prefill: { municipio: zona || '', body: `Fuente de referencia: ${n.medio}. ${n.link}` } },
  })

  return (
    <div className="adm-page">
      <header className="adm-head">
        <div>
          <p className="adm-kicker">Módulo</p>
          <h1 className="adm-h1">Monitoreo de medios</h1>
        </div>
        <div className="mon-head-actions">
          <Btn variant="ghost" icon="ext" onClick={googleNoticias}>Ver en Google Noticias</Btn>
          <Btn variant="primary" icon="search" onClick={cargar} disabled={cargando}>{cargando ? 'Actualizando…' : 'Actualizar'}</Btn>
        </div>
      </header>

      <div className="mon-vistas">
        <Tabs id="monvista" items={[{ id: 'medios', label: 'Notas de los medios' }, { id: 'guardadas', label: `Mis guardadas (${guardadas.lista.length})` }]} value={vista} onChange={setVista} />
      </div>
      {guardadas.error && <p className="adm-error">{guardadas.error}</p>}

      {vista === 'guardadas' ? (
        <section className="adm-panel">
          {guardadas.lista.length === 0 ? (
            <p className="adm-muted">Aún no guardas notas. En «Notas de los medios», usa el botón «Guardar» en las que quieras revisar después.</p>
          ) : (
            <div className="nlist">
              {guardadas.lista.map(n => (
                <NotaCard key={n.id} n={n} guardada onGuardar={guardadas.alternar}
                  onCrear={puedeCrear ? x => crearNoticia(x, x.zonas?.[0]) : null}
                  extra={<span className="mon-guardada-el">· guardada el {fmt(n.created_at)}</span>} />
              ))}
            </div>
          )}
        </section>
      ) : (<>
      <section className="adm-panel mon-filtros">
        <div className="adm-grid">
          <label className="field">
            <span>Zona</span>
            <select value={alcance} onChange={e => setAlcance(e.target.value)}>
              {ALCANCES.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}
            </select>
          </label>
          <label className="field">
            <span>Buscar en los titulares</span>
            <input type="search" value={texto} onChange={e => setTexto(e.target.value)} placeholder="Ej. alcaldesa, predial, Morena…" />
          </label>
        </div>
        <div className="mon-tabs">
          <Tabs id="montema" small items={TEMAS} value={tema} onChange={setTema} />
          <Tabs id="monper" small items={PERIODOS} value={periodo} onChange={setPeriodo} />
          <Tabs id="monord" small items={[{ id: 'cobertura', label: 'Más cubiertas' }, { id: 'recientes', label: 'Más recientes' }]} value={orden} onChange={setOrden} />
        </div>
        {datos && (
          <div className="who-filter mon-medios">
            <button className={`who-chip${medio === 'todos' ? ' who-chip--on' : ''}`} onClick={() => setMedio('todos')}>
              Todos los medios <em>{grupos.length}</em>
            </button>
            {datos.medios.map(m => (
              <button key={m} className={`who-chip${medio === m ? ' who-chip--on' : ''}`} onClick={() => setMedio(m)}>
                {m} <em>{conteoMedios[m] || 0}</em>
              </button>
            ))}
          </div>
        )}
      </section>

      {error && <p className="adm-error">{error}</p>}

      <section className="adm-panel">
        {!datos || cargando ? <p className="adm-muted">{municipio ? `Buscando notas de ${municipio.nombre} en los medios… puede tardar unos segundos.` : 'Cargando titulares de los medios…'}</p> : grupos.length === 0 ? (
          <p className="adm-muted">
            No hay notas con estos filtros. Prueba con otro tema, más días o «Ver en Google Noticias» para una búsqueda más amplia.
          </p>
        ) : (
          <div className="nlist">
            {grupos.map(g => {
              const n = g.notas[0]
              const zona = municipio?.nombre || n.zonas[0]
              return (
                <NotaCard key={g.id} n={n} grupo={g} guardada={guardadas.links.has(n.link)} onGuardar={guardadas.alternar}
                  onCrear={puedeCrear ? x => crearNoticia(x, zona) : null} />
              )
            })}
          </div>
        )}
        {datos && (
          <p className="mon-pie">
            {datos.noticias.length} titulares de {datos.medios.length} medios · actualizado {fmt(datos.actualizado)}
            {datos.errores.length > 0 && <> · sin respuesta: {datos.errores.join(', ')}</>}
          </p>
        )}
      </section>
      </>)}
    </div>
  )
}
