// Función de Vercel (/api/monitoreo): reúne los titulares que los medios publican en
// sus RSS para el módulo Monitoreo del CRM. Los navegadores no pueden leer esos RSS
// directo (CORS), por eso pasa por aquí. En local la sirve vite.config.js.
//
// GET /api/monitoreo              → titulares recientes de todos los medios
// GET /api/monitoreo?buscar=Ecatepec → además busca el término en los medios que lo permiten

// local: medio del Estado de México (todo lo que publica cuenta como Edomex)
// wp: sitio WordPress, acepta búsqueda por término (?s=…&feed=rss2)
const MEDIOS = [
  { id: 'universal', nombre: 'El Universal', rss: 'https://www.eluniversal.com.mx/arc/outboundfeeds/rss/?outputType=xml' },
  { id: 'universalmetro', nombre: 'El Universal Metrópoli', rss: 'https://www.eluniversal.com.mx/arc/outboundfeeds/rss/category/metropoli/?outputType=xml' },
  { id: 'reforma', nombre: 'Reforma', rss: 'https://www.reforma.com/rss/portada.xml' },
  { id: 'jornada', nombre: 'La Jornada', rss: 'https://www.jornada.com.mx/rss/estados.xml' },
  { id: 'jornadacapital', nombre: 'La Jornada Capital', rss: 'https://www.jornada.com.mx/rss/capital.xml' },
  { id: 'heraldo', nombre: 'El Heraldo de México', rss: 'https://heraldodemexico.com.mx/rss/' },
  { id: 'infobae', nombre: 'Infobae México', rss: 'https://www.infobae.com/arc/outboundfeeds/rss/category/mexico/?outputType=xml' },
  { id: 'financiero', nombre: 'El Financiero', rss: 'https://www.elfinanciero.com.mx/arc/outboundfeeds/rss/?outputType=xml' },
  { id: 'financieroestados', nombre: 'El Financiero Estados', rss: 'https://www.elfinanciero.com.mx/arc/outboundfeeds/rss/category/estados/?outputType=xml' },
  { id: '24horas', nombre: '24 Horas', rss: 'https://www.24-horas.mx/feed/' },
  { id: 'sdp', nombre: 'SDP Noticias', rss: 'https://www.sdpnoticias.com/arc/outboundfeeds/rss/?outputType=xml' },
  { id: 'soltoluca', nombre: 'El Sol de Toluca', rss: 'https://www.elsoldetoluca.com.mx/rss.xml', local: true },
  { id: 'quadratin', nombre: 'Quadratín Edomex', rss: 'https://edomex.quadratin.com.mx/feed/', wp: 'https://edomex.quadratin.com.mx/', local: true },
  { id: 'asisucede', nombre: 'Así Sucede', rss: 'https://www.asisucede.com.mx/feed/', wp: 'https://www.asisucede.com.mx/', local: true },
  { id: 'adnoticias', nombre: 'AD Noticias', rss: 'https://adnoticias.mx/feed/', wp: 'https://adnoticias.mx/', local: true },
  { id: 'amanecer', nombre: 'Diario Amanecer', rss: 'https://diarioamanecer.com.mx/feed/', wp: 'https://diarioamanecer.com.mx/', local: true },
]

const UA = 'Mozilla/5.0 (compatible; XpedienteCallejeroMonitoreo/1.0; +https://www.xpedientecallejero.com)'

const ENTIDADES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', hellip: '…', ndash: '–', mdash: '—', laquo: '«', raquo: '»', ldquo: '“', rdquo: '”', lsquo: '‘', rsquo: '’' }
const decodificar = s => s
  .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
  .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
  .replace(/&([a-z]+);/gi, (m, n) => ENTIDADES[n.toLowerCase()] ?? m)

const sinCdata = s => (s || '').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
const etiqueta = (xml, nombre) => sinCdata(xml.match(new RegExp(`<${nombre}(?:\\s[^>]*)?>([\\s\\S]*?)</${nombre}>`, 'i'))?.[1] || '').trim()
const texto = html => decodificar(html.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim()

const imagenDe = item => {
  const media = item.match(/<media:(?:content|thumbnail)[^>]*url="([^"]+)"/i)?.[1]
  const enclosure = item.match(/<enclosure[^>]*url="([^"]+)"[^>]*type="image/i)?.[1]
  const enHtml = sinCdata(item).match(/<img[^>]*src="([^"]+)"/i)?.[1]
  return decodificar(media || enclosure || enHtml || '') || null
}

const parsear = (xml, medio, busqueda) => [...xml.matchAll(/<item[\s>][\s\S]*?<\/item>/gi)].map(([item]) => {
  const fecha = new Date(etiqueta(item, 'pubDate') || etiqueta(item, 'dc:date'))
  return {
    titulo: texto(etiqueta(item, 'title')),
    link: decodificar(etiqueta(item, 'link') || etiqueta(item, 'guid')),
    fecha: Number.isNaN(fecha.getTime()) ? null : fecha.toISOString(),
    resumen: texto(etiqueta(item, 'description')).slice(0, 320),
    imagen: imagenDe(item),
    medio: medio.nombre,
    medioId: medio.id,
    local: Boolean(medio.local),
    busqueda: busqueda || null, // municipio buscado: la nota es de ahí aunque no lo nombre
  }
}).filter(n => n.titulo && n.link)

const leer = async (url, medio, busqueda) => {
  const tipo = busqueda ? ' (búsqueda)' : ''
  try {
    const r = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/rss+xml, application/xml, text/xml' }, signal: AbortSignal.timeout(busqueda ? 15000 : 8000) })
    if (!r.ok) return { items: [], error: `${medio.nombre}${tipo}: ${r.status}` }
    const charset = r.headers.get('content-type')?.match(/charset=([\w-]+)/i)?.[1] || 'utf-8'
    let xml
    try { xml = new TextDecoder(charset).decode(await r.arrayBuffer()) } catch { xml = '' }
    return { items: parsear(xml, medio, busqueda) }
  } catch {
    return { items: [], error: `${medio.nombre}${tipo}: sin respuesta` }
  }
}

export default async function handler(req, res) {
  const url = new URL(req.url, 'http://localhost')
  const buscar = (url.searchParams.get('buscar') || '').trim().slice(0, 60)

  const tareas = MEDIOS.map(m => leer(m.rss, m))
  if (buscar) {
    for (const m of MEDIOS.filter(x => x.wp)) {
      tareas.push(leer(`${m.wp}?s=${encodeURIComponent(buscar)}&feed=rss2`, m, buscar))
    }
  }
  const resultados = await Promise.all(tareas)

  // Sin duplicados: si el enlace vino del RSS general y de la búsqueda, conserva la marca de búsqueda
  const porLink = new Map()
  for (const n of resultados.flatMap(r => r.items)) {
    const previa = porLink.get(n.link)
    if (!previa) porLink.set(n.link, n)
    else if (n.busqueda) previa.busqueda = n.busqueda
  }
  const noticias = [...porLink.values()]
  const errores = [...new Set(resultados.map(r => r.error).filter(Boolean))]

  res.statusCode = 200
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  // La CDN de Vercel guarda la respuesta 10 minutos: los medios no reciben una consulta por clic
  res.setHeader('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=300')
  res.end(JSON.stringify({ actualizado: new Date().toISOString(), medios: MEDIOS.map(m => m.nombre), errores, noticias }))
}
