import { motion, useInView, animate } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'

// ─── Icons (trazo 1.8, 24×24) ─────────────────────────────────────────────────

const ICONS = {
  home: 'M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10',
  folder: 'M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z',
  target: 'M12 21a9 9 0 100-18 9 9 0 000 18zM12 16a4 4 0 100-8 4 4 0 000 8zM12 12h.01',
  check: 'M20 6L9 17l-5-5',
  doc: 'M14 3H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V9zM14 3v6h6M8 13h8M8 17h5',
  pin: 'M12 21s-7-6.2-7-11.5a7 7 0 0114 0C19 14.8 12 21 12 21zM12 12a2.5 2.5 0 100-5 2.5 2.5 0 000 5z',
  map: 'M9 4L3 6v14l6-2 6 2 6-2V4l-6 2zM9 4v14M15 6v14',
  chart: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  drone: 'M12 10h0M8 10h8l-1.5 4h-5zM4 6h5M15 6h5M6.5 6v4M17.5 6v4M10 14l-1 3M14 14l1 3',
  megaphone: 'M3 11v2a1 1 0 001 1h2l5 4V6L6 10H4a1 1 0 00-1 1zM15 8a5 5 0 010 8M18 5a9 9 0 010 14',
  users: 'M16 20v-1a4 4 0 00-4-4H7a4 4 0 00-4 4v1M9.5 11a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM21 20v-1a4 4 0 00-3-3.9M16 4.1a3.5 3.5 0 010 6.8',
  search: 'M11 19a8 8 0 100-16 8 8 0 000 16zM21 21l-4.3-4.3',
  bell: 'M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 01-3.4 0',
  arrow: 'M5 12h14M13 6l6 6-6 6',
  play: 'M7 4l13 8-13 8z',
  close: 'M18 6L6 18M6 6l12 12',
  menu: 'M4 7h16M4 12h16M4 17h16',
  alert: 'M12 3l10 18H2zM12 10v5M12 18h.01',
  camera: 'M3 8a2 2 0 012-2h2l2-2h6l2 2h2a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2zM12 17a4 4 0 100-8 4 4 0 000 8z',
  gps: 'M12 19a7 7 0 100-14 7 7 0 000 14zM12 2v3M12 19v3M2 12h3M19 12h3M12 14a2 2 0 100-4 2 2 0 000 4z',
  mask: 'M12 12a4 4 0 100-8 4 4 0 000 8zM4 21v-1a6 6 0 016-6h4a6 6 0 016 6v1M3 3l18 18',
  share: 'M18 8a3 3 0 100-6 3 3 0 000 6zM6 15a3 3 0 100-6 3 3 0 000 6zM18 22a3 3 0 100-6 3 3 0 000 6zM8.6 13.5l6.8 4M15.4 6.5l-6.8 4',
  ext: 'M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1h5',
  layers: 'M12 3l9 5-9 5-9-5zM3 13l9 5 9-5',
  shield: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z',
  coin: 'M12 21a9 9 0 100-18 9 9 0 000 18zM15 9.5c-.5-1-1.6-1.5-3-1.5-1.7 0-3 .8-3 2s1.3 1.7 3 2 3 .8 3 2-1.3 2-3 2c-1.4 0-2.5-.5-3-1.5M12 6v2M12 16v2',
  drop: 'M12 3s-6 6.5-6 11a6 6 0 0012 0c0-4.5-6-11-6-11z',
  crane: 'M4 21h10M7 21V5l12 3M7 5L4 8M19 8v4M17 12h4v3h-4z',
  clock: 'M12 21a9 9 0 100-18 9 9 0 000 18zM12 7v5l3 2',
  live: 'M12 13a1 1 0 100-2 1 1 0 000 2zM8.5 8.5a5 5 0 000 7M15.5 8.5a5 5 0 010 7M5.6 5.6a9 9 0 000 12.8M18.4 5.6a9 9 0 010 12.8',
  quote: 'M7 7h4v4c0 3-1.5 5-4 6M15 7h4v4c0 3-1.5 5-4 6',
  info: 'M12 21a9 9 0 100-18 9 9 0 000 18zM12 11v6M12 7.5h.01',
  mail: 'M3 6h18v12H3zM3 7l9 6 9-6',
  edit: 'M12 20h9M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4z',
  bookmark: 'M6 3h12v18l-6-4-6 4z',
}

export function Icon({ name, size = 18, className = '', stroke = 1.8 }) {
  return (
    <svg
      className={`ico ${className}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={ICONS[name] || ICONS.info} />
    </svg>
  )
}

// ─── Botón futurista ─────────────────────────────────────────────────────────
// Esquinas de mira, barrido de luz, brillo que sigue al cursor y pulso al tocar.

export function Btn({
  as = 'button', variant = 'primary', size = 'md', icon, iconRight, children,
  className = '', block, ...rest
}) {
  const Comp = as === 'a' ? motion.a : motion.button
  const ref = useRef(null)

  const onMove = e => {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    el.style.setProperty('--mx', `${e.clientX - r.left}px`)
    el.style.setProperty('--my', `${e.clientY - r.top}px`)
  }

  return (
    <Comp
      ref={ref}
      className={`btn btn--${variant} btn--${size}${block ? ' btn--block' : ''} ${className}`}
      onPointerMove={onMove}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.95, y: 0 }}
      transition={{ type: 'spring', stiffness: 420, damping: 22 }}
      {...rest}
    >
      <span className="btn-glow" aria-hidden />
      <span className="btn-sweep" aria-hidden />
      <span className="btn-corners" aria-hidden />
      {icon && <Icon name={icon} size={size === 'sm' ? 14 : 17} />}
      {children && <span className="btn-label">{children}</span>}
      {iconRight && <Icon name={iconRight} size={size === 'sm' ? 14 : 16} className="btn-ico-r" />}
    </Comp>
  )
}

// Grupo de pestañas con indicador deslizante
export function Tabs({ items, value, onChange, id, small }) {
  return (
    <div className={`tabs${small ? ' tabs--sm' : ''}`} role="tablist">
      {items.map(it => {
        const key = typeof it === 'string' ? it : it.id
        const label = typeof it === 'string' ? it : it.label
        const on = key === value
        return (
          <motion.button
            key={key}
            role="tab"
            aria-selected={on}
            className={`tab${on ? ' tab--on' : ''}`}
            onClick={() => onChange(key)}
            whileTap={{ scale: 0.94 }}
          >
            {on && (
              <motion.span
                className="tab-pill"
                layoutId={`tab-${id}`}
                transition={{ type: 'spring', stiffness: 500, damping: 36 }}
              />
            )}
            {typeof it !== 'string' && it.icon && <Icon name={it.icon} size={14} />}
            <span>{label}</span>
          </motion.button>
        )
      })}
    </div>
  )
}

// ─── Panel ───────────────────────────────────────────────────────────────────

export function Panel({ children, className = '', id, delay = 0, ...rest }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })
  return (
    <motion.section
      ref={ref}
      id={id}
      className={`panel ${className}`}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ delay, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      {...rest}
    >
      {children}
    </motion.section>
  )
}

export function PanelHead({ icon, title, sub, children }) {
  return (
    <header className="panel-head">
      <div>
        <h2 className="panel-title">
          {icon && <Icon name={icon} size={17} className="panel-title-ico" />}
          {title}
        </h2>
        {sub && <p className="panel-sub">{sub}</p>}
      </div>
      {children && <div className="panel-head-aside">{children}</div>}
    </header>
  )
}

// ─── Contador animado ────────────────────────────────────────────────────────

export function Counter({ value, duration = 1.4 }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true })
  const [n, setN] = useState(0)
  useEffect(() => {
    if (!inView) return
    const c = animate(0, value, { duration, ease: [0.16, 1, 0.3, 1], onUpdate: v => setN(Math.round(v)) })
    return () => c.stop()
  }, [inView, value, duration])
  return <span ref={ref}>{n.toLocaleString('es-MX')}</span>
}

export function StatusBadge({ status }) {
  const tone = status === 'En investigación' ? 'red' : status === 'En seguimiento' ? 'yellow' : 'green'
  return <span className={`badge badge--${tone}`}>{status}</span>
}
