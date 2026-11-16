import { useEffect, useState } from 'react'
import { NavLink, Navigate, Route, Routes } from 'react-router-dom'
import { motion } from 'framer-motion'
import '../App.css'
import './admin.css'
import { supabase, supabaseReady } from '../lib/supabase'
import { Btn, Icon } from '../components/ui'
import VideosModule from './VideosModule'
import CalendarModule from './CalendarModule'
import NoticiasModule from './NoticiasModule'
import ExpedientesModule from './ExpedientesModule'
import MonitoreoModule from './MonitoreoModule'
import UsuariosModule from './UsuariosModule'

// ─── Sesión ──────────────────────────────────────────────────────────────────

function useSession() {
  const [session, setSession] = useState(undefined) // undefined = cargando
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])
  return session
}

// Rol de la cuenta: 'admin' (tabla admins), 'periodista' (tabla equipo),
// 'none' (sin acceso), 'error' o 'loading'
function useRol(session) {
  const [rol, setRol] = useState('loading')
  useEffect(() => {
    if (!session) return
    setRol('loading')
    const id = session.user.id
    supabase.from('admins').select('user_id').eq('user_id', id).maybeSingle()
      .then(async ({ data, error }) => {
        if (error) return setRol('error')
        if (data) return setRol('admin')
        // Sin 09_roles.sql la tabla equipo no existe: se trata como sin acceso
        const { data: miembro } = await supabase.from('equipo').select('rol').eq('user_id', id).maybeSingle()
        setRol(miembro?.rol || 'none')
      })
  }, [session])
  return rol
}

// ─── Pantallas ───────────────────────────────────────────────────────────────

function Shell({ children }) {
  return (
    <div className="adm-center">
      <motion.div
        className="adm-card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      >
        <span className="stamp stamp--side adm-logo" role="img" aria-label="Xpediente Callejero" />
        {children}
      </motion.div>
    </div>
  )
}

function SetupScreen() {
  return (
    <Shell>
      <h1 className="adm-h1">Configura Supabase</h1>
      <p className="adm-p">El admin necesita conectarse a tu proyecto de Supabase:</p>
      <ol className="adm-steps">
        <li>Crea un proyecto gratis en <a href="https://supabase.com" target="_blank" rel="noopener noreferrer">supabase.com</a>.</li>
        <li>En <strong>SQL Editor</strong> ejecuta el archivo <code>supabase/schema.sql</code>.</li>
        <li>Copia <code>.env.example</code> como <code>.env.local</code> y pega la URL y la <em>anon key</em> (Project Settings → API).</li>
        <li>Reinicia el servidor (<code>npm run dev</code>).</li>
      </ol>
    </Shell>
  )
}

function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async e => {
    e.preventDefault()
    setBusy(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError(error.message === 'Invalid login credentials' ? 'Correo o contraseña incorrectos.' : error.message)
    setBusy(false)
  }

  return (
    <Shell>
      <h1 className="adm-h1">Panel de administración</h1>
      <p className="adm-p">Ingresa con tu cuenta del equipo.</p>
      <form className="adm-form" onSubmit={submit}>
        <label className="field">
          <span>Correo</span>
          <input type="email" required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} />
        </label>
        <label className="field">
          <span>Contraseña</span>
          <input type="password" required autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} />
        </label>
        {error && <p className="adm-error" role="alert">{error}</p>}
        <Btn type="submit" variant="primary" icon="shield" iconRight="arrow" block disabled={busy}>
          {busy ? 'Entrando…' : 'Entrar'}
        </Btn>
      </form>
      <a className="adm-back" href="/">← Volver al sitio</a>
    </Shell>
  )
}

function NoAccess({ email, state }) {
  return (
    <Shell>
      <h1 className="adm-h1">{state === 'error' ? 'No se pudo verificar el acceso' : 'Sin acceso al panel'}</h1>
      <p className="adm-p">
        {state === 'error'
          ? 'Revisa que ejecutaste supabase/schema.sql en tu proyecto.'
          : <>La cuenta <strong>{email}</strong> no tiene permisos en el panel. Pide a un administrador que te dé acceso.</>}
      </p>
      <Btn variant="ghost" icon="close" block onClick={() => supabase.auth.signOut()}>Cerrar sesión</Btn>
    </Shell>
  )
}

// ─── Layout del admin ────────────────────────────────────────────────────────

const MODULES = [
  { to: 'videos', label: 'Videos', icon: 'play', element: <VideosModule /> },
  { to: 'noticias', label: 'Noticias', icon: 'doc', element: <NoticiasModule /> },
  { to: 'expedientes', label: 'Expedientes', icon: 'folder', element: <ExpedientesModule /> },
  { to: 'monitoreo', label: 'Monitoreo', icon: 'search' },
  { to: 'calendario', label: 'Calendario', icon: 'clock', element: <CalendarModule /> },
  { label: 'Denuncias', icon: 'megaphone', soon: true },
  { to: 'usuarios', label: 'Usuarios', icon: 'users', element: <UsuariosModule /> },
]

// Qué módulos ve cada rol (el admin ve todos)
const VISTAS = {
  periodista: ['monitoreo'],
}
const puedeVer = (rol, m) => rol === 'admin' || (!m.soon && VISTAS[rol]?.includes(m.to))
const TITULO_ROL = { admin: 'Admin', periodista: 'Periodista' }

function Layout({ session, rol }) {
  const modulos = MODULES.filter(m => puedeVer(rol, m))
  const inicio = modulos.find(m => !m.soon)?.to || 'monitoreo'
  return (
    <div className="adm">
      <aside className="adm-side">
        <span className="stamp adm-side-logo" role="img" aria-label="Xpediente Callejero" />
        <p className="adm-side-title">{TITULO_ROL[rol] || 'Admin'}</p>
        <nav className="adm-nav">
          {modulos.map(m => m.soon ? (
            <span key={m.label} className="adm-link adm-link--soon">
              <Icon name={m.icon} size={17} />{m.label}<em>Pronto</em>
            </span>
          ) : (
            <NavLink key={m.to} to={m.to} className={({ isActive }) => `adm-link${isActive ? ' adm-link--on' : ''}`}>
              <Icon name={m.icon} size={17} />{m.label}
            </NavLink>
          ))}
        </nav>
        <div className="adm-user">
          <span className="adm-user-mail">{session.user.email}</span>
          <a className="adm-link" href="/" target="_blank" rel="noopener noreferrer"><Icon name="ext" size={16} />Ver sitio</a>
          <button className="adm-link" onClick={() => supabase.auth.signOut()}><Icon name="close" size={16} />Cerrar sesión</button>
        </div>
      </aside>
      <main className="adm-main">
        <Routes>
          <Route index element={<Navigate to={inicio} replace />} />
          {modulos.filter(m => !m.soon).map(m => (
            <Route key={m.to} path={m.to} element={m.to === 'monitoreo' ? <MonitoreoModule puedeCrear={rol === 'admin'} /> : m.element} />
          ))}
          <Route path="*" element={<Navigate to={inicio} replace />} />
        </Routes>
      </main>
    </div>
  )
}

// ─── Entrada ─────────────────────────────────────────────────────────────────

function Gate() {
  const session = useSession()
  const rol = useRol(session)
  if (session === undefined) return null
  if (!session) return <Login />
  if (rol === 'loading') return null
  if (rol === 'none' || rol === 'error') return <NoAccess email={session.user.email} state={rol} />
  return <Layout session={session} rol={rol} />
}

export default function AdminApp() {
  useEffect(() => {
    document.title = 'Admin · Xpediente Callejero'
    document.body.classList.remove('teaser-open') // el teaser es solo del sitio público
  }, [])
  return supabaseReady ? <Gate /> : <SetupScreen />
}
