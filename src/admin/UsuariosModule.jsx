import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Btn, Icon } from '../components/ui'

const ROLES = [
  { id: 'admin', label: 'Administrador', hint: 'Ve y edita todo el panel' },
  { id: 'periodista', label: 'Periodista', hint: 'Solo ve Monitoreo' },
  { id: 'ninguno', label: 'Sin acceso', hint: 'La cuenta existe pero no entra al panel' },
]
const MIN_PASSWORD = 8
const fmt = iso => iso ? new Date(iso).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' }) : 'Nunca'

// Contraseña aleatoria sin caracteres que se confunden (0/O, 1/l)
const generar = () => {
  const c = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const n = new Uint32Array(12)
  crypto.getRandomValues(n)
  return [...n].map(x => c[x % c.length]).join('')
}

// Llama a /api/usuarios con la sesión del administrador
const api = async (metodo, body) => {
  const { data } = await supabase.auth.getSession()
  const r = await fetch('/api/usuarios', {
    method: metodo,
    headers: { Authorization: `Bearer ${data.session?.access_token}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  const json = await r.json().catch(() => ({}))
  if (!r.ok) throw Object.assign(new Error(json.mensaje || 'No se pudo completar la acción.'), { codigo: json.error })
  return json
}

function UsuarioRow({ u, onChanged }) {
  const [pass, setPass] = useState(null) // null = cerrado; texto = editando
  const [aviso, setAviso] = useState('')
  const [busy, setBusy] = useState(false)

  const cambiarRol = async rol => {
    setBusy(true)
    setAviso('')
    try { await api('POST', { accion: 'rol', user_id: u.id, rol }); onChanged() } catch (e) { setAviso(e.message) }
    setBusy(false)
  }

  const guardarPass = async e => {
    e.preventDefault()
    setBusy(true)
    setAviso('')
    try {
      await api('POST', { accion: 'password', user_id: u.id, password: pass })
      setAviso(`Contraseña actualizada. Compártela con ${u.nombre || u.email} por un medio seguro.`)
      setPass(null)
    } catch (err) { setAviso(err.message) }
    setBusy(false)
  }

  return (
    <article className="usr-row">
      <div className="usr-main">
        <h3 className="nrow-title">{u.nombre || u.email}{u.soyYo && <em className="usr-yo"> · tú</em>}</h3>
        <p className="nrow-meta">{u.email} · último acceso: {fmt(u.ultimoAcceso)}</p>
      </div>
      <label className="field usr-rol">
        <span>Rol</span>
        <select value={u.rol} disabled={busy || u.soyYo} onChange={e => cambiarRol(e.target.value)}>
          {ROLES.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
        </select>
      </label>
      <div className="usr-pass">
        {pass === null ? (
          <Btn variant="ghost" size="sm" icon="shield" onClick={() => { setAviso(''); setPass(generar()) }}>Cambiar contraseña</Btn>
        ) : (
          <form className="usr-pass-form" onSubmit={guardarPass}>
            <input className="cal-input" value={pass} onChange={e => setPass(e.target.value)} minLength={MIN_PASSWORD} required aria-label="Nueva contraseña" />
            <Btn type="button" variant="ghost" size="sm" onClick={() => setPass(generar())}>Generar</Btn>
            <Btn type="submit" variant="primary" size="sm" icon="check" disabled={busy}>Guardar</Btn>
            <Btn type="button" variant="ghost" size="sm" icon="close" onClick={() => setPass(null)}>Cancelar</Btn>
          </form>
        )}
      </div>
      {aviso && <p className="field-hint usr-aviso">{aviso}</p>}
    </article>
  )
}

export default function UsuariosModule() {
  const [usuarios, setUsuarios] = useState(null)
  const [error, setError] = useState('')
  const [faltaLlave, setFaltaLlave] = useState(false)
  const [form, setForm] = useState({ nombre: '', email: '', password: generar(), rol: 'periodista' })
  const [creando, setCreando] = useState(false)
  const [aviso, setAviso] = useState('')
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const load = useCallback(async () => {
    try {
      const { usuarios } = await api('GET')
      setUsuarios(usuarios)
      setError('')
    } catch (e) {
      setFaltaLlave(e.codigo === 'falta_llave')
      setError(e.message)
      setUsuarios([])
    }
  }, [])

  useEffect(() => { load() }, [load])

  const crear = async e => {
    e.preventDefault()
    setCreando(true)
    setAviso('')
    try {
      await api('POST', { accion: 'crear', ...form })
      setAviso(`Cuenta creada: ${form.email} · contraseña: ${form.password}. Cópiala y compártela por un medio seguro; no se volverá a mostrar.`)
      setForm({ nombre: '', email: '', password: generar(), rol: 'periodista' })
      load()
    } catch (err) { setAviso(err.message) }
    setCreando(false)
  }

  return (
    <div className="adm-page">
      <header className="adm-head">
        <div>
          <p className="adm-kicker">Módulo</p>
          <h1 className="adm-h1">Usuarios</h1>
        </div>
      </header>

      {faltaLlave ? (
        <section className="adm-panel">
          <h2 className="adm-h2"><Icon name="shield" size={18} /> Falta un paso de configuración</h2>
          {error && <p className="adm-error">{error}</p>}
          <p className="adm-p">Para crear usuarios, el servidor necesita la llave <strong>service_role</strong> de Supabase (Project Settings → API). Nunca la pegues en el código ni en un chat:</p>
          <ol className="adm-steps">
            <li><strong>En local:</strong> agrégala a <code>.env.local</code> como <code>SUPABASE_SERVICE_ROLE_KEY=…</code> y reinicia el servidor.</li>
            <li><strong>En línea:</strong> en Vercel → tu proyecto → Settings → Environment Variables, agrega <code>SUPABASE_SERVICE_ROLE_KEY</code> y vuelve a publicar.</li>
          </ol>
        </section>
      ) : (
        <>
          <section className="adm-panel">
            <h2 className="adm-h2"><Icon name="users" size={18} /> Nuevo usuario</h2>
            <form className="adm-grid" onSubmit={crear}>
              <label className="field">
                <span>Nombre</span>
                <input required value={form.nombre} onChange={set('nombre')} placeholder="Nombre y apellido" />
              </label>
              <label className="field">
                <span>Correo</span>
                <input type="email" required value={form.email} onChange={set('email')} placeholder="correo@ejemplo.com" />
              </label>
              <label className="field">
                <span>Contraseña</span>
                <div className="usr-pass-form">
                  <input className="cal-input" required minLength={MIN_PASSWORD} value={form.password} onChange={set('password')} />
                  <Btn type="button" variant="ghost" size="sm" onClick={() => setForm(f => ({ ...f, password: generar() }))}>Generar</Btn>
                </div>
              </label>
              <label className="field">
                <span>Rol</span>
                <select value={form.rol} onChange={set('rol')}>
                  {ROLES.filter(r => r.id !== 'ninguno').map(r => <option key={r.id} value={r.id}>{r.label} · {r.hint}</option>)}
                </select>
              </label>
              <div className="cal-actions field--full">
                <Btn type="submit" variant="primary" icon="check" disabled={creando}>{creando ? 'Creando…' : 'Crear usuario'}</Btn>
              </div>
              {aviso && <p className="adm-p field--full usr-aviso">{aviso}</p>}
            </form>
          </section>

          <section className="adm-panel">
            <h2 className="adm-h2"><Icon name="shield" size={18} /> Equipo</h2>
            {error && <p className="adm-error">{error}</p>}
            {usuarios === null ? <p className="adm-muted">Cargando…</p> : (
              <div className="nlist">
                {usuarios.map(u => <UsuarioRow key={u.id} u={u} onChanged={load} />)}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  )
}
