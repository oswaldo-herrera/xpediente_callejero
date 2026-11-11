import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Btn, Icon } from './ui'

// La cámara solo existe en https (o localhost) y en navegadores que la soportan
export const camaraDisponible = () => Boolean(window.isSecureContext && navigator.mediaDevices?.getUserMedia)

const LADO_MAX = 1920 // la foto se reduce a este lado mayor para que suba rápido

// Cámara dentro de la página: evita abrir la app de cámara, que en algunos Android
// cierra la pestaña y la foto se pierde. Entrega la foto como File a `onFoto`.
export default function CamaraFoto({ onFoto, onClose }) {
  const videoRef = useRef(null)
  const [frente, setFrente] = useState(false) // false = cámara trasera
  const [error, setError] = useState('')
  const [foto, setFoto] = useState(null) // { blob, url } ya tomada, esperando confirmación

  useEffect(() => {
    if (foto) return
    let stream
    let cancelado = false
    setError('')
    navigator.mediaDevices
      .getUserMedia({
        video: { facingMode: frente ? 'user' : 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      })
      .then(s => {
        if (cancelado) return s.getTracks().forEach(t => t.stop())
        stream = s
        if (videoRef.current) videoRef.current.srcObject = s
      })
      .catch(err => setError(
        err?.name === 'NotAllowedError'
          ? 'No diste permiso para usar la cámara. Actívalo en el navegador o usa «Agregar foto».'
          : 'No se pudo abrir la cámara. Usa «Agregar foto» para elegirla de tu galería.',
      ))
    return () => {
      cancelado = true
      stream?.getTracks().forEach(t => t.stop())
    }
  }, [frente, foto])

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    const onKey = e => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      document.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  useEffect(() => () => foto && URL.revokeObjectURL(foto.url), [foto])

  const tomar = () => {
    const v = videoRef.current
    if (!v?.videoWidth) return
    const escala = Math.min(1, LADO_MAX / Math.max(v.videoWidth, v.videoHeight))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(v.videoWidth * escala)
    canvas.height = Math.round(v.videoHeight * escala)
    canvas.getContext('2d').drawImage(v, 0, 0, canvas.width, canvas.height)
    canvas.toBlob(blob => blob && setFoto({ blob, url: URL.createObjectURL(blob) }), 'image/jpeg', 0.85)
  }

  const usar = () => {
    onFoto(new File([foto.blob], `foto-${Date.now()}.jpg`, { type: 'image/jpeg' }))
    onClose()
  }

  return createPortal(
    <div className="cam" role="dialog" aria-modal="true" aria-label="Tomar foto">
      <button type="button" className="cam-close" onClick={onClose} aria-label="Cerrar cámara"><Icon name="close" size={20} /></button>
      <div className="cam-stage">
        {foto ? (
          <img className="cam-view" src={foto.url} alt="Foto tomada" />
        ) : error ? (
          <p className="cam-error">{error}</p>
        ) : (
          <video ref={videoRef} className={`cam-view${frente ? ' cam-view--espejo' : ''}`} autoPlay playsInline muted />
        )}
      </div>
      <div className="cam-actions">
        {foto ? (
          <>
            <Btn type="button" variant="ghost" icon="close" onClick={() => setFoto(null)}>Repetir</Btn>
            <Btn type="button" variant="primary" icon="check" onClick={usar}>Usar foto</Btn>
          </>
        ) : !error && (
          <>
            <Btn type="button" variant="ghost" onClick={() => setFrente(f => !f)}>Girar cámara</Btn>
            <button type="button" className="cam-shutter" onClick={tomar} aria-label="Tomar foto" />
          </>
        )}
      </div>
    </div>,
    document.body,
  )
}
