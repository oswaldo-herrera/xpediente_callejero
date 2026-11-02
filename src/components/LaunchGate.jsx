import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { LANZAMIENTO } from '../data'

export const antesDelLanzamiento = () => Date.now() < new Date(LANZAMIENTO).getTime()

const COLORES = ['#E5262B', '#FFFFFF', '#FFC814', '#8C0F14', '#FF8A1F']
const pad = n => String(n).padStart(2, '0')

function Confeti() {
  const ref = useRef(null)
  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas.getContext('2d')
    const quieto = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let frame
    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)
    const piezas = Array.from({ length: 160 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      w: 6 + Math.random() * 7,
      h: 8 + Math.random() * 10,
      color: COLORES[Math.floor(Math.random() * COLORES.length)],
      vy: 1.2 + Math.random() * 2.6,
      vx: -0.8 + Math.random() * 1.6,
      giro: Math.random() * Math.PI * 2,
      vg: -0.1 + Math.random() * 0.2,
    }))
    const dibujar = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      for (const p of piezas) {
        if (!quieto) {
          p.y += p.vy
          p.x += p.vx
          p.giro += p.vg
          if (p.y > canvas.height + 20) { p.y = -20; p.x = Math.random() * canvas.width }
        }
        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate(p.giro)
        ctx.fillStyle = p.color
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h)
        ctx.restore()
      }
      if (!quieto) frame = requestAnimationFrame(dibujar)
    }
    dibujar()
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', resize)
    }
  }, [])
  return <canvas ref={ref} className="gate-confeti" aria-hidden />
}

// Entrada de estreno: cubre el sitio hasta LANZAMIENTO. A esa hora recarga la página
// para traer la primera nota, que abre el pop-up de bienvenida.
export default function LaunchGate() {
  const [ahora, setAhora] = useState(() => Date.now())
  const activa = useRef(antesDelLanzamiento()).current
  const meta = new Date(LANZAMIENTO).getTime()

  useEffect(() => {
    if (!activa) return
    document.body.style.overflow = 'hidden'
    const t = setInterval(() => {
      const n = Date.now()
      setAhora(n)
      // Margen de unos segundos para que la base de datos ya considere publicada la nota
      if (n >= meta + 3000) window.location.reload()
    }, 1000)
    return () => {
      clearInterval(t)
      document.body.style.overflow = ''
    }
  }, [activa, meta])

  if (!activa) return null
  const falta = Math.max(0, Math.floor((meta - ahora) / 1000))

  return createPortal(
    <div className="gate" role="dialog" aria-modal="true" aria-label="Estreno de Xpediente Callejero">
      <Confeti />
      <div className="gate-body">
        <img className="gate-logo" src="/logos/LOGO%20SELLO%20BLANCO.png" alt="Xpediente Callejero" />
        <h1 className="gate-title">Hoy a las 2 p.&nbsp;m. iniciamos</h1>
        <p className="gate-count" aria-live="off">
          {falta > 0
            ? `${pad(Math.floor(falta / 3600))}:${pad(Math.floor((falta % 3600) / 60))}:${pad(falta % 60)}`
            : '¡Ya comenzamos!'}
        </p>
      </div>
    </div>,
    document.body,
  )
}
