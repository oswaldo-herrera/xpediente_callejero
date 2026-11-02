import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { Icon } from './ui'

const WORD = 'PRÓXIMAMENTE'

// Se reinicia solo al recargar la página: al cerrarlo, navegar entre
// páginas del sitio (p. ej. a un personaje) ya no lo vuelve a mostrar.
let dismissed = false

// Intro: "PRÓXIMAMENTE" se arma y se difumina; después el teaser se repite
// con sonido sobre la página desenfocada. Con closable=false no se puede cerrar
// y el sitio queda bloqueado detrás del teaser.
export default function TeaserIntro({ src, closable = true, onDone }) {
  const [open, setOpenState] = useState(Boolean(src) && !dismissed)
  const setOpen = v => {
    if (!v) dismissed = true
    setOpenState(v)
  }
  const [phase, setPhase] = useState('title') // title → video
  const [needsTap, setNeedsTap] = useState(false) // false | 'sound' | 'play'
  const videoRef = useRef(null)

  useEffect(() => {
    if (!open) onDone?.()
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    // index.html ya trae la clase para que no se vea la página al recargar
    if (!open) {
      document.body.classList.remove('teaser-open')
      return
    }
    const t = setTimeout(() => setPhase('video'), 3400)
    const onKey = e => closable && e.key === 'Escape' && setOpen(false)
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    document.body.classList.add('teaser-open')
    return () => {
      clearTimeout(t)
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
      document.body.classList.remove('teaser-open')
    }
  }, [open, closable])

  // Se llama cuando el <video> aparece en pantalla (tras desvanecerse el título).
  // 1) Arranca SIN sonido (permitido en todos los navegadores).
  // 2) Ya corriendo, intenta activar el sonido; si el navegador lo frena
  //    (pausa el video), vuelve a silencio y pide un toque para el audio.
  // 3) Si ni en silencio puede reproducir (ahorro de batería), pide un toque.
  const attachVideo = v => {
    videoRef.current = v
    if (!v || v.dataset.started) return
    v.dataset.started = '1'
    v.defaultMuted = true
    v.muted = true
    v.play()
      .then(() => {
        const blocked = () => {
          v.muted = true
          v.play().catch(() => setNeedsTap('play'))
          setNeedsTap('sound')
        }
        v.addEventListener('pause', blocked, { once: true })
        v.muted = false
        setTimeout(() => {
          v.removeEventListener('pause', blocked)
          if (v.muted) return
          if (v.paused) blocked()
        }, 400)
      })
      .catch(() => setNeedsTap('play'))
  }

  useEffect(() => {
    if (!needsTap) return
    // Solo estos eventos cuentan como "interacción" para permitir audio:
    // en Android el toque vale al levantar el dedo (touchend / click),
    // no al apoyarlo (touchstart / pointerdown).
    const evs = ['click', 'touchend', 'keydown']
    const unmute = () => {
      const v = videoRef.current
      if (!v) return
      evs.forEach(e => window.removeEventListener(e, unmute))
      if (needsTap === 'play') v.currentTime = 0
      v.muted = false
      v.play()
        .then(() => setNeedsTap(false))
        .catch(() => {
          // Si aún así lo bloquea, sigue corriendo en silencio y espera otro toque
          v.muted = true
          v.play().catch(() => {})
          evs.forEach(e => window.addEventListener(e, unmute))
        })
    }
    evs.forEach(e => window.addEventListener(e, unmute))
    return () => evs.forEach(e => window.removeEventListener(e, unmute))
  }, [needsTap])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="teaser"
          role="dialog"
          aria-modal="true"
          aria-label="Avance: próximamente"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.9 }}
        >
          <div className="teaser-grain" aria-hidden />

          <AnimatePresence mode="wait">
            {phase === 'title' ? (
              <motion.h2
                key="title"
                className="teaser-title"
                exit={{ opacity: 0, filter: 'blur(28px)', scale: 1.15 }}
                transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
              >
                {WORD.split('').map((ch, i) => (
                  <motion.span
                    key={i}
                    initial={{ opacity: 0, filter: 'blur(18px)', y: 18 }}
                    animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
                    transition={{ delay: 0.35 + i * 0.07, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                  >
                    {ch}
                  </motion.span>
                ))}
                <motion.span
                  className="teaser-line"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: 1.3, duration: 1, ease: [0.22, 1, 0.36, 1] }}
                />
              </motion.h2>
            ) : (
              <motion.div
                key="video"
                className="teaser-stage"
                initial={{ opacity: 0, scale: 0.94, filter: 'blur(16px)' }}
                animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className="teaser-frame">
                  <video ref={attachVideo} src={src} loop playsInline preload="auto" />
                  <span className="teaser-tag"><span className="live-dot" />Próximamente</span>
                  <AnimatePresence>
                    {needsTap && (
                      <motion.span
                        className="teaser-tap"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                      >
                        <Icon name={needsTap === 'play' ? 'play' : 'live'} size={16} />
                        {needsTap === 'play' ? 'Toca la pantalla para reproducir' : 'Toca la pantalla para activar el sonido'}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {closable && (
            <button className="teaser-skip" onClick={() => setOpen(false)} aria-label="Cerrar avance">
              <Icon name="close" size={20} />
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
