import { AnimatePresence, motion } from 'framer-motion'
import { useMemo, useState } from 'react'
import { MAP_W, MAP_H, PATHS, project } from '../edomexMap'
import { MUNICIPIOS, MAP_FILTERS } from '../data'
import { Icon, Tabs } from './ui'

const STATE_LABELS = [
  { name: 'Hidalgo', lon: -98.95, lat: 20.3 },
  { name: 'Querétaro', lon: -100.15, lat: 20.38 },
  { name: 'Michoacán', lon: -100.68, lat: 19.45 },
  { name: 'Guerrero', lon: -99.95, lat: 18.32 },
  { name: 'Morelos', lon: -99.12, lat: 18.72 },
  { name: 'Puebla', lon: -98.55, lat: 18.95 },
  { name: 'Tlaxcala', lon: -98.5, lat: 19.58 },
]

const ZOOMS = [1, 1.5, 2]
const ZOOM_ZM = ZOOMS.length - 1 // Arranca enfocado en la zona metropolitana
const FOCUS = project(-99.15, 19.49)

// Columnas de etiquetas a cada lado de la zona metropolitana
const LABEL_X = { izq: 548, der: 770 }
const LABEL_GAP = 14

const MES_MS = 30 * 24 * 60 * 60 * 1000
const MAX_MIN = 5 // Con pocas notas el mapa no arranca al máximo de intensidad

export default function HeatMap({ notas }) {
  const [filter, setFilter] = useState('todas')
  const [zoom, setZoom] = useState(ZOOM_ZM)
  const [hover, setHover] = useState(null)

  const points = useMemo(() => {
    const f = MAP_FILTERS.find(x => x.id === filter)
    const visibles = notas.filter(n => !f?.categoria || n.expedientes?.categoria === f.categoria)
    const desde = Date.now() - MES_MS
    return MUNICIPIOS.map(m => {
      const propias = visibles.filter(n => n.municipio === m.name)
      const [x, y] = project(m.lon, m.lat)
      return {
        ...m,
        value: propias.length,
        mes: propias.filter(n => new Date(n.published_at) >= desde).length,
        x,
        y,
      }
    })
  }, [filter, notas])

  const max = Math.max(MAX_MIN, ...points.map(p => p.value))
  // Cada columna se reparte parejo, en el orden vertical de sus puntos
  const labelY = {}
  for (const lado of ['izq', 'der']) {
    const col = points.filter(p => p.lado === lado).sort((a, b) => a.y - b.y)
    col.forEach((p, i) => { labelY[p.name] = FOCUS[1] + (i - (col.length - 1) / 2) * LABEL_GAP })
  }

  const z = ZOOMS[zoom]
  const vw = MAP_W / z, vh = MAP_H / z
  const vx = z === 1 ? 0 : Math.min(Math.max(FOCUS[0] - vw / 2, 0), MAP_W - vw)
  const vy = z === 1 ? 0 : Math.min(Math.max(FOCUS[1] - vh / 2, 0), MAP_H - vh)

  return (
    <div className="map">
      <div className="map-toolbar">
        <Tabs items={MAP_FILTERS} value={filter} onChange={setFilter} id="mapf" small />
      </div>

      <div className="map-stage">
        <motion.svg
          className="map-svg"
          viewBox={`0 0 ${MAP_W} ${MAP_H}`}
          animate={{ viewBox: `${vx} ${vy} ${vw} ${vh}` }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          role="img"
          aria-label="Mapa de calor de notas en la zona metropolitana"
        >
          <defs>
            <radialGradient id="heat">
              <stop offset="0" stopColor="#FFD27A" stopOpacity="1" />
              <stop offset="0.25" stopColor="#FF8A1F" stopOpacity="0.85" />
              <stop offset="0.6" stopColor="#E5262B" stopOpacity="0.35" />
              <stop offset="1" stopColor="#E5262B" stopOpacity="0" />
            </radialGradient>
            <pattern id="mapgrid" width="24" height="24" patternUnits="userSpaceOnUse">
              <path d="M24 0H0V24" fill="none" stroke="rgba(255,255,255,.04)" strokeWidth="1" />
            </pattern>
            <filter id="edoGlow" x="-10%" y="-10%" width="120%" height="120%">
              <feGaussianBlur stdDeviation="6" result="b" />
              <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          <rect width={MAP_W} height={MAP_H} fill="url(#mapgrid)" />

          {Object.entries(PATHS).filter(([k]) => k !== 'edomex' && k !== 'cdmx').map(([k, d]) => (
            <path key={k} d={d} className="map-neighbor" />
          ))}

          <motion.path
            d={PATHS.edomex}
            className="map-edomex"
            filter="url(#edoGlow)"
            fillRule="evenodd"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 2, ease: 'easeInOut' }}
          />
          <path d={PATHS.cdmx} className="map-cdmx" />

          {STATE_LABELS.map(s => {
            const [x, y] = project(s.lon, s.lat)
            return <text key={s.name} x={x} y={y} className="map-state" textAnchor="middle">{s.name.toUpperCase()}</text>
          })}
          {(() => {
            const [x, y] = project(-99.14, 19.33)
            return <text x={x} y={y} className="map-state map-state--cdmx" textAnchor="middle">CDMX</text>
          })()}

          <g className="heat-layer">
            {points.map(p => (
              <motion.circle
                key={p.name}
                cx={p.x}
                cy={p.y}
                fill="url(#heat)"
                initial={false}
                animate={{ r: p.value ? (22 + Math.sqrt(p.value / max) * 78) / z : 0 }}
                transition={{ duration: 0.6 }}
              />
            ))}
          </g>

          {points.map(p => (
            <g
              key={p.name}
              className="map-pt"
              onPointerEnter={() => setHover(p)}
              onPointerLeave={() => setHover(null)}
            >
              <circle cx={p.x} cy={p.y} r="9" fill="transparent" />
              <circle cx={p.x} cy={p.y} r={hover?.name === p.name ? 6 : 3.5} className={`map-dot${p.value ? '' : ' map-dot--off'}`} />
              {p.value / max > 0.55 && <circle cx={p.x} cy={p.y} r="6" className="map-pulse" />}
              {zoom === ZOOM_ZM && (p.lado === 'cerca' ? (
                <text x={p.x + 8} y={p.y} dy=".35em" className="map-callout">{p.name}</text>
              ) : (
                <>
                  <line x1={p.x} y1={p.y} x2={LABEL_X[p.lado] + (p.lado === 'izq' ? 2 : -2)} y2={labelY[p.name]} className="map-leader" />
                  <text
                    x={LABEL_X[p.lado]}
                    y={labelY[p.name]}
                    dy=".35em"
                    textAnchor={p.lado === 'izq' ? 'end' : 'start'}
                    className="map-callout"
                  >
                    {p.name}
                  </text>
                </>
              ))}
            </g>
          ))}
        </motion.svg>

        <div className="map-scan" aria-hidden />

        <AnimatePresence>
          {hover && (
            <motion.div
              className="map-tip"
              style={{
                left: `${((hover.x - vx) / vw) * 100}%`,
                top: `${((hover.y - vy) / vh) * 100}%`,
              }}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <strong>{hover.name}</strong>
              <span>{hover.value} {hover.value === 1 ? 'nota' : 'notas'}</span>
              <span className="map-tip-sub">{hover.mes} en los últimos 30 días</span>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="map-legend">
          <span>Menos notas</span>
          <span className="map-legend-bar" />
          <span>Más notas</span>
        </div>

        <div className="map-zoom">
          <button className="map-zbtn" onClick={() => setZoom(v => Math.min(v + 1, ZOOMS.length - 1))} aria-label="Acercar">+</button>
          <button className="map-zbtn" onClick={() => setZoom(v => Math.max(v - 1, 0))} aria-label="Alejar">−</button>
          <button className="map-zbtn" onClick={() => setZoom(ZOOM_ZM)} aria-label="Centrar mapa"><Icon name="gps" size={15} /></button>
        </div>
      </div>
    </div>
  )
}
