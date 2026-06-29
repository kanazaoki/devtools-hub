'use client'

import { useState, useRef, useEffect } from 'react'

interface Pt { x: number; y: number }

const PRESETS: { name: string; values: [number, number, number, number] }[] = [
  { name: 'linear',           values: [0,     0,     1,     1    ] },
  { name: 'ease',             values: [0.25,  0.1,   0.25,  1    ] },
  { name: 'ease-in',          values: [0.42,  0,     1,     1    ] },
  { name: 'ease-out',         values: [0,     0,     0.58,  1    ] },
  { name: 'ease-in-out',      values: [0.42,  0,     0.58,  1    ] },
  { name: 'ease-in-back',     values: [0.36,  0,     0.66, -0.56 ] },
  { name: 'ease-out-back',    values: [0.34,  1.56,  0.64,  1    ] },
  { name: 'ease-in-out-back', values: [0.68, -0.55,  0.265, 1.55 ] },
  { name: 'spring',           values: [0.175, 0.885, 0.32,  1.275] },
]

const SZ = 280
const PAD = 32
const INNER = SZ - PAD * 2

function bz2svg(v: number, axis: 'x' | 'y'): number {
  return axis === 'x' ? PAD + v * INNER : PAD + (1 - v) * INNER
}

function svg2bz(px: number, axis: 'x' | 'y'): number {
  return axis === 'x' ? (px - PAD) / INNER : 1 - (px - PAD) / INNER
}

function PresetThumb({ values }: { values: [number, number, number, number] }) {
  const W = 48, H = 36, p = 5
  const iW = W - p * 2, iH = H - p * 2
  const [x1, y1, x2, y2] = values
  const p0 = { x: p,      y: p + iH }
  const p3 = { x: p + iW, y: p      }
  const c1 = { x: p + x1 * iW, y: p + (1 - y1) * iH }
  const c2 = { x: p + x2 * iW, y: p + (1 - y2) * iH }
  const d = `M ${p0.x} ${p0.y} C ${c1.x} ${c1.y} ${c2.x} ${c2.y} ${p3.x} ${p3.y}`
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={{ overflow: 'visible', display: 'block' }}>
      <line x1={p0.x} y1={p0.y} x2={p3.x} y2={p3.y} stroke="#24242C" strokeWidth="0.75" />
      <path d={d} fill="none" stroke="#00C896" strokeWidth="1.75" strokeLinecap="round" />
      <circle cx={p0.x} cy={p0.y} r="2" fill="#4E4E5C" />
      <circle cx={p3.x} cy={p3.y} r="2" fill="#4E4E5C" />
    </svg>
  )
}

export function BezierCurveEditor() {
  const [p1, setP1] = useState<Pt>({ x: 0.25, y: 0.1 })
  const [p2, setP2] = useState<Pt>({ x: 0.25, y: 1.0 })
  const [drag, setDrag] = useState<'p1' | 'p2' | null>(null)
  const [copied, setCopied] = useState(false)
  const [animKey, setAnimKey] = useState(0)
  const [activePreset, setActivePreset] = useState<string | null>('ease')
  const [inputSeq, setInputSeq] = useState(0)
  const svgRef = useRef<SVGSVGElement>(null)

  const fmt = (n: number) => n.toFixed(2)
  const cssValue = `cubic-bezier(${fmt(p1.x)}, ${fmt(p1.y)}, ${fmt(p2.x)}, ${fmt(p2.y)})`

  const p0s = { x: PAD,         y: PAD + INNER }
  const p3s = { x: PAD + INNER, y: PAD         }
  const p1s = { x: bz2svg(p1.x, 'x'), y: bz2svg(p1.y, 'y') }
  const p2s = { x: bz2svg(p2.x, 'x'), y: bz2svg(p2.y, 'y') }
  const pathD = `M ${p0s.x} ${p0s.y} C ${p1s.x} ${p1s.y} ${p2s.x} ${p2s.y} ${p3s.x} ${p3s.y}`

  useEffect(() => {
    if (drag === null) return
    const onMove = (e: PointerEvent) => {
      if (!svgRef.current) return
      const rect = svgRef.current.getBoundingClientRect()
      const scaleX = SZ / rect.width
      const scaleY = SZ / rect.height
      const px = (e.clientX - rect.left) * scaleX
      const py = (e.clientY - rect.top) * scaleY
      const bx = Math.max(0, Math.min(1, svg2bz(px, 'x')))
      const by = svg2bz(py, 'y')
      if (drag === 'p1') setP1({ x: bx, y: by })
      else               setP2({ x: bx, y: by })
      setActivePreset(null)
    }
    const onUp = () => { setDrag(null); setInputSeq(s => s + 1) }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }, [drag])

  const applyPreset = (name: string, [x1, y1, x2, y2]: [number, number, number, number]) => {
    setP1({ x: x1, y: y1 })
    setP2({ x: x2, y: y2 })
    setAnimKey(k => k + 1)
    setActivePreset(name)
    setInputSeq(s => s + 1)
  }

  const updateP1 = (axis: 'x' | 'y', raw: number) => {
    const v = isNaN(raw) ? 0 : axis === 'x' ? Math.max(0, Math.min(1, raw)) : raw
    setP1(prev => axis === 'x' ? { ...prev, x: v } : { ...prev, y: v })
    setActivePreset(null)
  }

  const updateP2 = (axis: 'x' | 'y', raw: number) => {
    const v = isNaN(raw) ? 0 : axis === 'x' ? Math.max(0, Math.min(1, raw)) : raw
    setP2(prev => axis === 'x' ? { ...prev, x: v } : { ...prev, y: v })
    setActivePreset(null)
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(cssValue)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard unavailable
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Presets grid with mini SVG thumbnails */}
      <div>
        <p className="mb-3 font-mono text-xs uppercase tracking-widest text-muted">Presets</p>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-9">
          {PRESETS.map((p) => {
            const isActive = activePreset === p.name
            return (
              <button
                key={p.name}
                onClick={() => applyPreset(p.name, p.values)}
                className={`flex flex-col items-center gap-1.5 rounded-lg border px-2 py-2.5 transition-all ${
                  isActive
                    ? 'border-teal bg-teal/5 text-teal'
                    : 'border-border text-dim hover:border-teal/50 hover:text-primary'
                }`}
              >
                <PresetThumb values={p.values} />
                <span className="w-full truncate text-center font-mono text-[9px] leading-none sm:text-[10px]">{p.name}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* SVG editor */}
        <div className="flex-shrink-0">
          <p className="mb-2 font-mono text-xs uppercase tracking-widest text-muted">Curve Editor</p>
          <div
            className="inline-block rounded-xl border border-border"
            style={{ background: '#0A0A0E' }}
          >
            <svg
              ref={svgRef}
              viewBox={`0 0 ${SZ} ${SZ}`}
              style={{ width: '100%', maxWidth: SZ, touchAction: 'none', display: 'block', overflow: 'visible' }}
            >
              <defs>
                {/* Dot grid */}
                <pattern id="bz-dots" x={PAD} y={PAD} width="22" height="22" patternUnits="userSpaceOnUse">
                  <circle cx="11" cy="11" r="0.6" fill="#1E1E2E" />
                </pattern>
                {/* Glow filter for curve */}
                <filter id="bz-glow" x="-30%" y="-30%" width="160%" height="160%">
                  <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                {/* Subtle glow for handles */}
                <filter id="bz-handle-glow" x="-60%" y="-60%" width="220%" height="220%">
                  <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* Dot grid background */}
              <rect x={PAD} y={PAD} width={INNER} height={INNER} fill="url(#bz-dots)" />

              {/* Border */}
              <rect x={PAD} y={PAD} width={INNER} height={INNER} fill="none" stroke="#1E1E2E" strokeWidth="1" />

              {/* Quarter lines */}
              {[0.25, 0.5, 0.75].map(t => (
                <g key={t}>
                  <line x1={PAD + t * INNER} y1={PAD} x2={PAD + t * INNER} y2={PAD + INNER} stroke="#1A1A28" strokeWidth="1" />
                  <line x1={PAD} y1={PAD + t * INNER} x2={PAD + INNER} y2={PAD + t * INNER} stroke="#1A1A28" strokeWidth="1" />
                </g>
              ))}

              {/* Diagonal reference */}
              <line x1={p0s.x} y1={p0s.y} x2={p3s.x} y2={p3s.y} stroke="#2A2A3E" strokeWidth="1" strokeDasharray="5 4" />

              {/* Control arm lines */}
              <line x1={p0s.x} y1={p0s.y} x2={p1s.x} y2={p1s.y} stroke="#00C896" strokeWidth="1" strokeDasharray="3 3" opacity="0.4" />
              <line x1={p3s.x} y1={p3s.y} x2={p2s.x} y2={p2s.y} stroke="#a78bfa" strokeWidth="1" strokeDasharray="3 3" opacity="0.4" />

              {/* Bezier curve with glow */}
              <path d={pathD} fill="none" stroke="#00C896" strokeWidth="1.5" strokeLinecap="round" opacity="0.3" />
              <path d={pathD} fill="none" stroke="#00C896" strokeWidth="2.5" strokeLinecap="round" filter="url(#bz-glow)" />

              {/* Anchor points */}
              <circle cx={p0s.x} cy={p0s.y} r="3.5" fill="#36364A" stroke="#4E4E6C" strokeWidth="1" />
              <circle cx={p3s.x} cy={p3s.y} r="3.5" fill="#36364A" stroke="#4E4E6C" strokeWidth="1" />

              {/* P1 handle (teal) */}
              <circle cx={p1s.x} cy={p1s.y} r="14" fill="#00C896" fillOpacity={drag === 'p1' ? 0.08 : 0.04} style={{ pointerEvents: 'none' }} />
              <circle
                cx={p1s.x} cy={p1s.y} r="9"
                fill="#00C896" fillOpacity="0.12" stroke="#00C896" strokeWidth="1.5"
                filter="url(#bz-handle-glow)"
                style={{ cursor: drag === 'p1' ? 'grabbing' : 'grab' }}
                onPointerDown={e => { e.preventDefault(); setDrag('p1') }}
              />
              <circle cx={p1s.x} cy={p1s.y} r="3.5" fill="#00C896" style={{ pointerEvents: 'none' }} />
              <text x={p1s.x + 12} y={p1s.y - 6} fill="#00C896" fontSize="8" fontFamily="monospace" fontWeight="600" style={{ pointerEvents: 'none' }}>P1</text>

              {/* P2 handle (purple) */}
              <circle cx={p2s.x} cy={p2s.y} r="14" fill="#a78bfa" fillOpacity={drag === 'p2' ? 0.08 : 0.04} style={{ pointerEvents: 'none' }} />
              <circle
                cx={p2s.x} cy={p2s.y} r="9"
                fill="#a78bfa" fillOpacity="0.12" stroke="#a78bfa" strokeWidth="1.5"
                filter="url(#bz-handle-glow)"
                style={{ cursor: drag === 'p2' ? 'grabbing' : 'grab' }}
                onPointerDown={e => { e.preventDefault(); setDrag('p2') }}
              />
              <circle cx={p2s.x} cy={p2s.y} r="3.5" fill="#a78bfa" style={{ pointerEvents: 'none' }} />
              <text x={p2s.x + 12} y={p2s.y - 6} fill="#a78bfa" fontSize="8" fontFamily="monospace" fontWeight="600" style={{ pointerEvents: 'none' }}>P2</text>

              {/* Axis labels */}
              <text x={PAD + INNER / 2} y={SZ - 6} fill="#36364A" fontSize="8" fontFamily="monospace" textAnchor="middle">time →</text>
              <text
                x={10} y={PAD + INNER / 2}
                fill="#36364A" fontSize="8" fontFamily="monospace" textAnchor="middle"
                transform={`rotate(-90, 10, ${PAD + INNER / 2})`}
              >progress</text>
            </svg>
          </div>
        </div>

        {/* Right panel */}
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          {/* P1 / P2 values */}
          <div>
            <p className="mb-2 font-mono text-xs uppercase tracking-widest text-muted">Control Points</p>
            <div className="grid grid-cols-2 gap-2">
              {/* P1 card */}
              <div className="rounded-lg border border-border bg-surface p-3" style={{ borderTopColor: '#00C896' }}>
                <div className="mb-2 flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ background: '#00C896', boxShadow: '0 0 6px #00C89666' }} />
                  <span className="font-mono text-xs font-semibold" style={{ color: '#00C896' }}>P1</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {(['x1', 'y1'] as const).map(lbl => {
                    const axis = lbl === 'x1' ? 'x' : 'y'
                    const val = axis === 'x' ? p1.x : p1.y
                    return (
                      <div key={lbl}>
                        <p className="mb-1 font-mono text-[10px] text-muted">{lbl}</p>
                        <input
                          key={`${lbl}-${inputSeq}`}
                          type="number"
                          step="0.01"
                          defaultValue={fmt(val)}
                          onFocus={e => e.target.select()}
                          onChange={e => updateP1(axis, parseFloat(e.target.value))}
                          className="w-full rounded border border-border bg-bg px-2 py-1 font-mono text-sm text-bright focus:border-teal focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                        />
                      </div>
                    )
                  })}
                </div>
              </div>
              {/* P2 card */}
              <div className="rounded-lg border border-border bg-surface p-3" style={{ borderTopColor: '#a78bfa' }}>
                <div className="mb-2 flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ background: '#a78bfa', boxShadow: '0 0 6px #a78bfa66' }} />
                  <span className="font-mono text-xs font-semibold" style={{ color: '#a78bfa' }}>P2</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {(['x2', 'y2'] as const).map(lbl => {
                    const axis = lbl === 'x2' ? 'x' : 'y'
                    const val = axis === 'x' ? p2.x : p2.y
                    return (
                      <div key={lbl}>
                        <p className="mb-1 font-mono text-[10px] text-muted">{lbl}</p>
                        <input
                          key={`${lbl}-${inputSeq}`}
                          type="number"
                          step="0.01"
                          defaultValue={fmt(val)}
                          onFocus={e => e.target.select()}
                          onChange={e => updateP2(axis, parseFloat(e.target.value))}
                          className="w-full rounded border border-border bg-bg px-2 py-1 font-mono text-sm text-bright focus:border-teal focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                        />
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Animation preview */}
          <div>
            <p className="mb-2 font-mono text-xs uppercase tracking-widest text-muted">Animation Preview</p>
            <div className="rounded-lg border border-border" style={{ background: '#0A0A0E', padding: '16px' }}>
              {/* Track */}
              <div className="relative h-12 select-none overflow-hidden rounded-md bg-bg">
                {/* Track markers */}
                {[0, 25, 50, 75, 100].map(pct => (
                  <div
                    key={pct}
                    className="absolute top-0 h-full border-l border-border/40"
                    style={{ left: `${pct}%` }}
                  >
                    <span className="absolute bottom-0.5 left-1 font-mono text-[9px] text-border">{pct}%</span>
                  </div>
                ))}
                {/* Rail line */}
                <div className="absolute top-1/2 left-3 right-3 -translate-y-1/2 border-t border-dashed border-border/40" />
                {/* Ball */}
                <style>{`
                  @keyframes bz-preview {
                    from { left: 10px; }
                    to   { left: calc(100% - 34px); }
                  }
                  .bz-ball-elem {
                    position: absolute;
                    top: 50%;
                    transform: translateY(-50%);
                    width: 24px;
                    height: 24px;
                    border-radius: 50%;
                    background: radial-gradient(circle at 40% 35%, #22ffbd, #00C896);
                    box-shadow: 0 0 12px #00C89688, 0 0 4px #00C896;
                    animation: bz-preview 1.5s ${cssValue} infinite alternate;
                  }
                `}</style>
                <div key={animKey} className="bz-ball-elem" />
              </div>
              <div className="mt-2 flex items-center justify-between">
                <p className="font-mono text-[10px] text-muted">1.5s · infinite · alternate</p>
                <p className="font-mono text-[10px] text-muted">{activePreset ?? 'custom'}</p>
              </div>
            </div>
          </div>

          {/* CSS output */}
          <div>
            <p className="mb-2 font-mono text-xs uppercase tracking-widest text-muted">Output</p>
            <div className="rounded-lg border border-border bg-bg p-3">
              <code className="break-all font-mono text-sm leading-relaxed">
                <span className="text-muted">animation-timing-function:{'  '}</span>
                <br />
                <span className="text-teal">{'  '}{cssValue}</span>
                <span className="text-muted">;</span>
              </code>
            </div>
            <button
              onClick={copy}
              className={`mt-2 w-full rounded-lg border px-4 py-2.5 font-mono text-xs transition-all ${
                copied
                  ? 'border-teal bg-teal/10 text-teal'
                  : 'border-border text-dim hover:border-teal hover:bg-teal/5 hover:text-teal'
              }`}
            >
              {copied ? '✓ コピーしました' : '↑ Copy CSS'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
