import { motion, useInView } from 'framer-motion'
import { useRef, useState } from 'react'

// ─── Ranking (barras horizontales) ───────────────────────────────────────────

export function RankBars({ rows, valueKey }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-40px' })
  const max = Math.max(...rows.map(r => r[valueKey]))
  return (
    <ol ref={ref} className="rank">
      {rows.map((r, i) => (
        <li key={r.name} className="rank-row" title={`${r.name}: ${r[valueKey]} ${r[valueKey] === 1 ? 'nota' : 'notas'}`}>
          <span className={`rank-num${i < 3 ? ' rank-num--top' : ''}`}>{i + 1}</span>
          <span className="rank-name">{r.name}</span>
          <span className="rank-track">
            <motion.span
              className="rank-bar"
              initial={{ width: 0 }}
              animate={inView ? { width: `${(r[valueKey] / max) * 100}%` } : {}}
              transition={{ delay: 0.1 + i * 0.05, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            />
          </span>
          <span className="rank-val">{r[valueKey]}</span>
        </li>
      ))}
    </ol>
  )
}

// ─── Dona ────────────────────────────────────────────────────────────────────

export function Donut({ data, total, label }) {
  const [hover, setHover] = useState(null)
  const R = 70, r = 50, C = 90
  const sum = data.reduce((a, d) => a + d.value, 0)
  const gap = 0.025 // separación entre segmentos (rad)
  let acc = -Math.PI / 2

  const arc = (a0, a1) => {
    const p = (rad, a) => [C + rad * Math.cos(a), C + rad * Math.sin(a)]
    const large = a1 - a0 > Math.PI ? 1 : 0
    const [x0, y0] = p(R, a0), [x1, y1] = p(R, a1), [x2, y2] = p(r, a1), [x3, y3] = p(r, a0)
    return `M${x0},${y0}A${R},${R} 0 ${large} 1 ${x1},${y1}L${x2},${y2}A${r},${r} 0 ${large} 0 ${x3},${y3}Z`
  }

  const h = hover != null ? data[hover] : null

  return (
    <div className="donut">
      <svg viewBox="0 0 180 180" className="donut-svg" role="img" aria-label={`${label}: distribución por tipo`}>
        {data.map((d, i) => {
          if (!d.value) return null
          const a0 = acc + gap / 2
          const a1 = acc + (d.value / sum) * Math.PI * 2 - gap / 2
          acc += (d.value / sum) * Math.PI * 2
          return (
            <motion.path
              key={d.label}
              d={arc(a0, a1)}
              fill={d.color}
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: hover == null || hover === i ? 1 : 0.35, scale: hover === i ? 1.05 : 1 }}
              viewport={{ once: false }}
              transition={{ duration: 0.4, delay: hover == null ? i * 0.06 : 0 }}
              style={{ transformOrigin: '90px 90px', cursor: 'pointer' }}
              onPointerEnter={() => setHover(i)}
              onPointerLeave={() => setHover(null)}
            />
          )
        })}
        <text x="90" y="88" textAnchor="middle" className="donut-big">
          {h ? `${h.value}%` : total.toLocaleString('es-MX')}
        </text>
        <text x="90" y="108" textAnchor="middle" className="donut-small">
          {h ? h.label : label}
        </text>
      </svg>
      <ul className="legend">
        {data.map((d, i) => (
          <li
            key={d.label}
            className={`legend-row${hover === i ? ' legend-row--on' : ''}`}
            onPointerEnter={() => setHover(i)}
            onPointerLeave={() => setHover(null)}
          >
            <span className="legend-dot" style={{ background: d.color }} />
            <span className="legend-label">{d.label}</span>
            <span className="legend-val">{d.value}%</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

// ─── Línea de tendencia con cursor ───────────────────────────────────────────

export function TrendLine({ data }) {
  const [hi, setHi] = useState(null)
  const W = 420, H = 170, pl = 34, pr = 12, pt = 14, pb = 26
  const max = Math.max(10, Math.ceil(Math.max(...data.map(d => d.v)) / 10) * 10)
  const x = i => pl + (i * (W - pl - pr)) / (data.length - 1)
  const y = v => pt + (1 - v / max) * (H - pt - pb)
  const line = data.map((d, i) => `${i ? 'L' : 'M'}${x(i)},${y(d.v)}`).join('')
  const area = `${line}L${x(data.length - 1)},${H - pb}L${x(0)},${H - pb}Z`
  const ticks = [0, max / 2, max]

  const onMove = e => {
    const svg = e.currentTarget
    const pt2 = svg.createSVGPoint()
    pt2.x = e.clientX; pt2.y = e.clientY
    const p = pt2.matrixTransform(svg.getScreenCTM().inverse())
    const i = Math.round(((p.x - pl) / (W - pl - pr)) * (data.length - 1))
    setHi(Math.max(0, Math.min(data.length - 1, i)))
  }

  return (
    <div className="trend">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="trend-svg"
        role="img"
        aria-label="Notas publicadas por mes, últimos 12 meses"
        onPointerMove={onMove}
        onPointerLeave={() => setHi(null)}
      >
        <defs>
          <linearGradient id="trendFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="var(--yellow)" stopOpacity="0.35" />
            <stop offset="1" stopColor="var(--yellow)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {ticks.map(t => (
          <g key={t}>
            <line x1={pl} x2={W - pr} y1={y(t)} y2={y(t)} className="grid" />
            <text x={pl - 6} y={y(t) + 3} textAnchor="end" className="axis">{t}</text>
          </g>
        ))}
        {data.map((d, i) => (
          <text key={d.m} x={x(i)} y={H - 8} textAnchor="middle" className="axis">{d.m}</text>
        ))}
        <motion.path
          d={area}
          fill="url(#trendFill)"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1, delay: 0.4 }}
        />
        <motion.path
          d={line}
          fill="none"
          stroke="var(--yellow)"
          strokeWidth="2"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          whileInView={{ pathLength: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1.4, ease: 'easeInOut' }}
        />
        {hi != null && (
          <g>
            <line x1={x(hi)} x2={x(hi)} y1={pt} y2={H - pb} className="crosshair" />
            <circle cx={x(hi)} cy={y(data[hi].v)} r="5" fill="var(--yellow)" stroke="var(--panel)" strokeWidth="2" />
          </g>
        )}
        <rect x={pl} y={pt} width={W - pl - pr} height={H - pt - pb} fill="transparent" />
      </svg>
      {hi != null && (
        <div className="tip" style={{ left: `${(x(hi) / W) * 100}%`, top: `${(y(data[hi].v) / H) * 100}%` }}>
          <strong>{data[hi].v}</strong> {data[hi].v === 1 ? 'nota' : 'notas'} · {data[hi].m}
        </div>
      )}
    </div>
  )
}
