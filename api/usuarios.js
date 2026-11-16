// Función de Vercel (/api/usuarios): crear usuarios del CRM, cambiar contraseñas y roles.
// Usa la llave service_role, que solo existe aquí (variable de entorno del servidor,
// nunca en el código de la página). Solo responde a administradores (tabla admins).
//
// GET  /api/usuarios                                   → lista del equipo
// POST /api/usuarios { accion: 'crear', nombre, email, password, rol }
// POST /api/usuarios { accion: 'password', user_id, password }
// POST /api/usuarios { accion: 'rol', user_id, rol }    rol: admin | periodista | ninguno
import { createClient } from '@supabase/supabase-js'

const ROLES = ['admin', 'periodista', 'ninguno']
const MIN_PASSWORD = 8

const responder = (res, status, data) => {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  res.end(JSON.stringify(data))
}

const leerJson = async req => {
  if (req.body && typeof req.body === 'object') return req.body
  let raw = ''
  for await (const chunk of req) raw += chunk
  try { return JSON.parse(raw || '{}') } catch { return {} }
}

// Deja a la persona con un solo rol: admin (tabla admins), periodista (tabla equipo) o ninguno
const asignarRol = async (db, userId, rol, nombre) => {
  if (rol === 'admin') {
    await db.from('equipo').delete().eq('user_id', userId)
    const { error } = await db.from('admins').upsert({ user_id: userId, ...(nombre ? { nombre } : {}) })
    return error
  }
  await db.from('admins').delete().eq('user_id', userId)
  if (rol === 'ninguno') {
    const { error } = await db.from('equipo').delete().eq('user_id', userId)
    return error
  }
  const { error } = await db.from('equipo').upsert({ user_id: userId, rol, ...(nombre ? { nombre } : {}) })
  return error
}

export default async function handler(req, res) {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const llave = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !llave) return responder(res, 500, { error: 'falta_llave', mensaje: 'Falta configurar SUPABASE_SERVICE_ROLE_KEY en el servidor.' })

  const db = createClient(url, llave, { auth: { persistSession: false, autoRefreshToken: false } })

  // ¿Quién llama? Debe traer su sesión y ser administrador
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '')
  const { data: quien } = token ? await db.auth.getUser(token) : { data: null }
  const yo = quien?.user
  if (!yo) return responder(res, 401, { mensaje: 'Inicia sesión de nuevo.' })
  const { data: esAdmin } = await db.from('admins').select('user_id').eq('user_id', yo.id).maybeSingle()
  if (!esAdmin) return responder(res, 403, { mensaje: 'Solo los administradores pueden gestionar usuarios.' })

  if (req.method === 'GET') {
    const [{ data: lista, error }, { data: admins }, { data: equipo }] = await Promise.all([
      db.auth.admin.listUsers({ perPage: 1000 }),
      db.from('admins').select('user_id, nombre'),
      db.from('equipo').select('user_id, nombre, rol'),
    ])
    if (error) return responder(res, 500, { mensaje: error.message })
    const porId = new Map([
      ...(equipo || []).map(e => [e.user_id, { rol: e.rol, nombre: e.nombre }]),
      ...(admins || []).map(a => [a.user_id, { rol: 'admin', nombre: a.nombre }]),
    ])
    const usuarios = lista.users.map(u => ({
      id: u.id,
      email: u.email,
      nombre: porId.get(u.id)?.nombre || '',
      rol: porId.get(u.id)?.rol || 'ninguno',
      creado: u.created_at,
      ultimoAcceso: u.last_sign_in_at,
      soyYo: u.id === yo.id,
    })).sort((a, b) => a.email.localeCompare(b.email))
    return responder(res, 200, { usuarios })
  }

  if (req.method !== 'POST') return responder(res, 405, { mensaje: 'Método no permitido.' })
  const body = await leerJson(req)

  if (body.accion === 'crear') {
    const email = String(body.email || '').trim().toLowerCase()
    const password = String(body.password || '')
    const nombre = String(body.nombre || '').trim()
    const rol = ROLES.includes(body.rol) ? body.rol : 'periodista'
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return responder(res, 400, { mensaje: 'Escribe un correo válido.' })
    if (password.length < MIN_PASSWORD) return responder(res, 400, { mensaje: `La contraseña debe tener al menos ${MIN_PASSWORD} caracteres.` })
    // email_confirm: la cuenta queda lista sin mandar correo de confirmación
    const { data, error } = await db.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { nombre } })
    if (error) return responder(res, 400, { mensaje: /already/i.test(error.message) ? 'Ya existe una cuenta con ese correo.' : error.message })
    const errRol = await asignarRol(db, data.user.id, rol, nombre)
    if (errRol) return responder(res, 500, { mensaje: `Se creó la cuenta, pero no se pudo asignar el rol: ${errRol.message}` })
    return responder(res, 200, { ok: true })
  }

  if (body.accion === 'password') {
    const password = String(body.password || '')
    if (password.length < MIN_PASSWORD) return responder(res, 400, { mensaje: `La contraseña debe tener al menos ${MIN_PASSWORD} caracteres.` })
    const { error } = await db.auth.admin.updateUserById(String(body.user_id), { password })
    if (error) return responder(res, 400, { mensaje: error.message })
    return responder(res, 200, { ok: true })
  }

  if (body.accion === 'rol') {
    if (!ROLES.includes(body.rol)) return responder(res, 400, { mensaje: 'Rol no válido.' })
    if (body.user_id === yo.id && body.rol !== 'admin') return responder(res, 400, { mensaje: 'No puedes quitarte a ti mismo el rol de administrador.' })
    const error = await asignarRol(db, String(body.user_id), body.rol)
    if (error) return responder(res, 500, { mensaje: error.message })
    return responder(res, 200, { ok: true })
  }

  return responder(res, 400, { mensaje: 'Acción no válida.' })
}
