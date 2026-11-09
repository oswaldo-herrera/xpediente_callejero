import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import './App.css'
import { Denuncia } from './App'

// Enlace directo al formulario: xpedientecallejero.com/denuncia
// Funciona aunque la sección esté oculta en la portada (DENUNCIA_ACTIVA).
export default function DenunciaPage() {
  useEffect(() => {
    window.scrollTo(0, 0)
    document.title = 'Denuncia ciudadana · Xpediente Callejero'
  }, [])

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
            <span>Denuncia ciudadana</span>
          </nav>
        </header>
        <Denuncia />
        <footer className="sp-foot">© 2026 Xpediente Callejero · <Link to="/">Ir al sitio</Link></footer>
      </div>
    </div>
  )
}
