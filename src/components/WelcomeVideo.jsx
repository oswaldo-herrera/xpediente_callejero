import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { Icon } from './ui'
import { youtubeId } from '../data'

const SEEN_KEY = 'xc-bienvenida-vista'

const yaVisto = () => {
  try { return sessionStorage.getItem(SEEN_KEY) === '1' } catch { return false }
}
const marcarVisto = () => {
  try { sessionStorage.setItem(SEEN_KEY, '1') } catch { /* sin almacenamiento: solo se repite al recargar */ }
}

// Pop-up de bienvenida: sale una vez por visita y se cierra al terminar el video.
// `ready` lo retiene mientras el teaser siga en pantalla.
export default function WelcomeVideo({ src, vertical, ready }) {
  const [open, setOpen] = useState(() => !yaVisto())
  const [muted, setMuted] = useState(false)
  const videoRef = useRef(null)
  const visible = Boolean(src) && open && ready
  const yt = youtubeId(src)

  const close = () => {
    marcarVisto()
    setOpen(false)
  }

  useEffect(() => {
    if (!visible) return
    const onKey = e => e.key === 'Escape' && close()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [visible])

  // Intenta con sonido; si el navegador lo bloquea, arranca en silencio y ofrece activarlo
  const attachVideo = v => {
    videoRef.current = v
    if (!v || v.dataset.started) return
    v.dataset.started = '1'
    v.play().catch(() => {
      v.muted = true
      setMuted(true)
      v.play().catch(() => {})
    })
  }

  const activarSonido = () => {
    const v = videoRef.current
    if (!v) return
    v.muted = false
    v.currentTime = 0
    v.play().catch(() => {})
    setMuted(false)
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div className="modal-wrap welcome-wrap" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={close}>
          <motion.div
            className="welcome"
            role="dialog"
            aria-modal="true"
            aria-label="Video de bienvenida"
            initial={{ y: 30, scale: 0.96, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            onClick={e => e.stopPropagation()}
          >
            <button className="modal-close" onClick={close} aria-label="Cerrar video de bienvenida"><Icon name="close" /></button>
            {yt ? (
              <iframe
                className={`welcome-yt${vertical ? ' welcome-yt--v' : ''}`}
                src={`https://www.youtube.com/embed/${yt}?autoplay=1&mute=1&rel=0`}
                title="Video de bienvenida"
                allow="autoplay; encrypted-media; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <video ref={attachVideo} src={src} controls controlsList="nodownload" onContextMenu={e => e.preventDefault()} playsInline preload="auto" onEnded={close} />
            )}
            {muted && (
              <button className="welcome-sound" onClick={activarSonido}>
                <Icon name="live" size={16} /> Activar sonido
              </button>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
