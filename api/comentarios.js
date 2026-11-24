// Función de Vercel (/api/comentarios): trae los comentarios de las redes y los
// guarda en la tabla comentarios. Solo responde a administradores.
//
// POST /api/comentarios { accion: 'sincronizar' }  → actualiza todas las redes conectadas
//
// Variables del servidor (nunca en la página):
//   SUPABASE_SERVICE_ROLE_KEY, YOUTUBE_API_KEY, YOUTUBE_CANAL (opcional, @usuario del canal)
import { createClient } from '@supabase/supabase-js'

const CANAL_YOUTUBE = '@xpedientecallejero'
const MAX_PAGINAS = 30 // 100 hilos por página

const responder = (res, status, data) => {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  res.end(JSON.stringify(data))
}

const yt = async (ruta, params) => {
  const q = new URLSearchParams({ ...params, key: process.env.YOUTUBE_API_KEY })
  const r = await fetch(`https://www.googleapis.com/youtube/v3/${ruta}?${q}`)
  const json = await r.json()
  if (json.error) throw new Error(`YouTube: ${json.error.message}`)
  return json
}

// Todos los comentarios del canal (hilos + respuestas) con el título de cada video
export async function comentariosYoutube() {
  const handle = process.env.YOUTUBE_CANAL || CANAL_YOUTUBE
  const { items: [canal] = [] } = await yt('channels', { part: 'id,statistics', forHandle: handle })
  if (!canal) throw new Error(`YouTube: no se encontró el canal ${handle}`)

  const hilos = []
  let pageToken
  for (let i = 0; i < MAX_PAGINAS; i++) {
    const r = await yt('commentThreads', { part: 'snippet,replies', maxResults: 100, order: 'time', allThreadsRelatedToChannelId: canal.id, ...(pageToken ? { pageToken } : {}) })
    hilos.push(...r.items)
    pageToken = r.nextPageToken
    if (!pageToken) break
  }

  // Títulos de los videos (de 50 en 50)
  const ids = [...new Set(hilos.map(h => h.snippet.videoId).filter(Boolean))]
  const titulos = new Map()
  for (let i = 0; i < ids.length; i += 50) {
    const r = await yt('videos', { part: 'snippet', id: ids.slice(i, i + 50).join(',') })
    for (const v of r.items) titulos.set(v.id, v.snippet.title)
  }

  const fila = (c, videoId, esRespuesta, respuestas = 0) => ({
    id: `youtube:${c.id}`,
    red: 'youtube',
    publicacion_id: videoId,
    publicacion_titulo: titulos.get(videoId) || 'Video',
    publicacion_url: `https://www.youtube.com/watch?v=${videoId}`,
    autor: c.snippet.authorDisplayName,
    texto: c.snippet.textOriginal || '',
    fecha: c.snippet.publishedAt,
    likes: c.snippet.likeCount || 0,
    respuestas,
    es_respuesta: esRespuesta,
    del_canal: c.snippet.authorChannelId?.value === canal.id,
    sincronizado_at: new Date().toISOString(),
  })

  const filas = []
  for (const h of hilos) {
    const videoId = h.snippet.videoId
    filas.push(fila(h.snippet.topLevelComment, videoId, false, h.snippet.totalReplyCount || 0))
    for (const r of h.replies?.comments || []) filas.push(fila(r, videoId, true))
  }
  return { filas, estadisticas: canal.statistics }
}

export default async function handler(req, res) {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const llave = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !llave) return responder(res, 500, { mensaje: 'Falta configurar SUPABASE_SERVICE_ROLE_KEY en el servidor.' })
  const db = createClient(url, llave, { auth: { persistSession: false, autoRefreshToken: false } })

  // Solo administradores
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '')
  const { data: quien } = token ? await db.auth.getUser(token) : { data: null }
  if (!quien?.user) return responder(res, 401, { mensaje: 'Inicia sesión de nuevo.' })
  const { data: esAdmin } = await db.from('admins').select('user_id').eq('user_id', quien.user.id).maybeSingle()
  const { data: miembro } = esAdmin ? { data: null } : await db.from('equipo').select('modulos').eq('user_id', quien.user.id).maybeSingle()
  if (!esAdmin && !miembro?.modulos?.includes('comentarios')) return responder(res, 403, { mensaje: 'No tienes permiso para el módulo Comentarios.' })

  if (req.method !== 'POST') return responder(res, 405, { mensaje: 'Método no permitido.' })

  const resultado = { redes: {}, errores: [] }
  if (process.env.YOUTUBE_API_KEY) {
    try {
      const { filas, estadisticas } = await comentariosYoutube()
      for (let i = 0; i < filas.length; i += 500) {
        const { error } = await db.from('comentarios').upsert(filas.slice(i, i + 500))
        if (error) throw new Error(/comentarios/.test(error.message) && /exist|find/.test(error.message)
          ? 'Falta ejecutar supabase/11_comentarios.sql' : error.message)
      }
      resultado.redes.youtube = { comentarios: filas.length, suscriptores: Number(estadisticas.subscriberCount), vistas: Number(estadisticas.viewCount), videos: Number(estadisticas.videoCount) }
    } catch (e) {
      resultado.errores.push(e.message)
    }
  } else {
    resultado.errores.push('YouTube: falta YOUTUBE_API_KEY en el servidor')
  }
  return responder(res, resultado.errores.length && !Object.keys(resultado.redes).length ? 500 : 200, resultado)
}
