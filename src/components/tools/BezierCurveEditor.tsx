'use client'

import { useState, useRef, useEffect } from 'react'

interface Pt { x: number; y: number }

const PRESETS: { name: string; values: [number, number, number, number] }[] = [
  { name: 'linear',            values: [0,     0,     1,     1    ] },
  { name: 'ease',              values: [0.25,  0.1,   0.25,  1    ] },
  { name: 'ease-in',           values: [0.42,  0,     1,     1    ] },
  { name: 'ease-out',          values: [0,     0,     0.58,  1    ] },
  { name: 'ease-in-out',       values: [0.42,  0,     0.58,  1    ] },
  { name: 'ease-in-back',      values: [0.36,  0,     0.66,  -0.56] },
  { name: 'ease-out-back',     values: [0.34,  1.56,  0.64,  1    ] },
  { name: 'ease-in-out-back',  values: [0.68, -0.55,  0.265, 1.55 ] },
  { name: 'spring',            values: [0.175, 0.885, 0.32,  1.275] },
]

const SZ = 260
const PAD = 30
const INNER = SZ - PAD * 2

function bz2svg(v: number, axis: 'x' | 'y'): number {
  return axis === 'x' ? PAD + v * INNER : PAD + (1 - v) * INNER
}

function svg2bz(px: number, axis: 'x' | 'y'): number {
  return axis === 'x' ? (px - PAD) / INNER : 1 - (px - PAD) / INNER
}

export function BezierCurveEditor() {
  const [p1, setP1] = useState<Pt>({ x: 0.25, y: 0.1 })
  const [p2, setP2] = useState<Pt>({ x: 0.25, y: 1.0 })
  const [drag, setDrag] = useState<'p1' | 'p2' | null>(null)
  const [copied, setCopied] = useState(false)
  const [animKey, setAnimKey] = useState(0)
  const svgRef = useRef<SVGSVGElement>(null)

  const fmt = (n: number) => n.toFixed(2)
  const cssValue = `cubic-bezier(${fmt(p1.x)}, ${fmt(p1.y)}, ${fmt(p2.x)}, ${fmt(p2.y)})`

  const p0s = { x: PAD,          y: PAD + INNER }
  const p3s = { x: PAD + INNER,  y: PAD         }
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
    }
    const onUp = () => setDrag(null)
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }, [drag])

  const applyPreset = ([x1, y1, x2, y2]: [number, number, number, number]) => {
    setP1({ x: x1, y: y1 })
    setP2({ x: x2, y: y2 })
    setAnimKey(k => k + 1)
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(cssValue)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard unavailable — silent fail
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Presets */}
      <div>
        <p className="mb-2 font-mono text-xs uppercase tracking-widest text-muted">Presets</p>
        <div className="flex flex-wrap gap-1.5">
          {PRESETS.map((p) => (
            <button
              key={p.name}
              onClick={() => applyPreset(p.values)}
              className="rounded border border-border px-2.5 py-1 font-mono text-xs text-dim transition-colors hover:border-teal hover:text-teal"
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* SVG editor */}
        <div className="flex-shrink-0">
          <p className="mb-2 font-mono text-xs uppercase tracking-widest text-muted">Curve Editor</p>
          <div className="inline-block rounded-lg border border-border bg-bg">
            <svg
              ref={svgRef}
              viewBox={`0 0 ${SZ} ${SZ}`}
              style={{ width: '100%', maxWidth: SZ, touchAction: 'none', display: 'block', overflow: 'visible' }}
            >
              {/* Grid lines */}
              {[0.25, 0.5, 0.75].map(t => (
                <g key={t} stroke="#1E1E26" strokeWidth="1">
                  <line x1={PAD + t * INNER} y1={PAD} x2={PAD + t * INNER} y2={PAD + INNER} />
                  <line x1={PAD} y1={PAD + t * INNER} x2={PAD + INNER} y2={PAD + t * INNER} />
                </g>
              ))}

              {/* Inner border */}
              <rect x={PAD} y={PAD} width={INNER} height={INNER} fill="none" stroke="#24242C" strokeWidth="1" />

              {/* Diagonal reference */}
              <line x1={p0s.x} y1={p0s.y} x2={p3s.x} y2={p3s.y} stroke="#2a2a36" strokeWidth="1" strokeDasharray="4 4" />

              {/* Control arm lines */}
              <line x1={p0s.x} y1={p0s.y} x2={p1s.x} y2={p1s.y} stroke="#00C896" strokeWidth="1" strokeDasharray="3 3" opacity="0.5" />
              <line x1={p3s.x} y1={p3s.y} x2={p2s.x} y2={p2s.y} stroke="#a78bfa" strokeWidth="1" strokeDasharray="3 3" opacity="0.5" />

              {/* Bezier curve */}
              <path d={pathD} fill="none" stroke="#00C896" strokeWidth="2.5" strokeLinecap="round" />

              {/* Anchor dots */}
              <circle cx={p0s.x} cy={p0s.y} r="4" fill="#4E4E5C" />
              <circle cx={p3s.x} cy={p3s.y} r="4" fill="#4E4E5C" />

              {/* P1 handle (teal) */}
              <circle
                cx={p1s.x} cy={p1s.y} r="8"
                fill="#00C896" fillOpacity="0.15" stroke="#00C896" strokeWidth="2"
                style={{ cursor: drag === 'p1' ? 'grabbing' : 'grab' }}
                onPointerDown={e => { e.preventDefault(); setDrag('p1') }}
              />
              <circle cx={p1s.x} cy={p1s.y} r="3" fill="#00C896" style={{ pointerEvents: 'none' }} />
              <text x={p1s.x + 11} y={p1s.y - 5} fill="#00C896" fontSize="8" fontFamily="monospace" style={{ pointerEvents: 'none' }}>P1</text>

              {/* P2 handle (purple) */}
              <circle
                cx={p2s.x} cy={p2s.y} r="8"
                fill="#a78bfa" fillOpacity="0.15" stroke="#a78bfa" strokeWidth="2"
                style={{ cursor: drag === 'p2' ? 'grabbing' : 'grab' }}
                onPointerDown={e => { e.preventDefault(); setDrag('p2') }}
              />
              <circle cx={p2s.x} cy={p2s.y} r="3" fill="#a78bfa" style={{ pointerEvents: 'none' }} />
              <text x={p2s.x + 11} y={p2s.y - 5} fill="#a78bfa" fontSize="8" fontFamily="monospace" style={{ pointerEvents: 'none' }}>P2</text>

              {/* Axis labels */}
              <text x={PAD + INNER / 2} y={SZ - 4} fill="#4E4E5C" fontSize="8" fontFamily="monospace" textAnchor="middle">time →</text>
              <text
                x={9} y={PAD + INNER / 2}
                fill="#4E4E5C" fontSize="8" fontFamily="monospace" textAnchor="middle"
                transform={`rotate(-90, 9, ${PAD + INNER / 2})`}
              >progress</text>
            </svg>
          </div>
        </div>

        {/* Right panel */}
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          {/* Control point values */}
          <div>
            <p className="mb-2 font-mono text-xs uppercase tracking-widest text-muted">Control Points</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'x1', value: p1.x, color: '#00C896' },
                { label: 'y1', value: p1.y, color: '#00C896' },
                { label: 'x2', value: p2.x, color: '#a78bfa' },
                { label: 'y2', value: p2.y, color: '#a78bfa' },
              ].map(({ label, value, color }) => (
                <div key={label} className="rounded border border-border bg-surface p-2">
                  <p className="font-mono text-xs text-muted">{label}</p>
                  <p className="font-mono text-lg font-bold text-bright" style={{ color }}>{fmt(value)}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Animation preview */}
          <div>
            <p className="mb-2 font-mono text-xs uppercase tracking-widest text-muted">Animation Preview</p>
            <div className="rounded border border-border bg-surface p-4">
              <div className="relative h-10 overflow-hidden rounded bg-bg">
                <div className="pointer-events-none absolute inset-0 flex items-center px-5">
                  <div className="h-px w-full border-t border-dashed border-border" />
                </div>
                <style>{`
                  @keyframes bz-preview {
                    from { left: 8px; }
                    to   { left: calc(100% - 32px); }
                  }
                  .bz-ball-elem {
                    position: absolute;
                    top: 50%;
                    transform: translateY(-50%);
                    width: 24px;
                    height: 24px;
                    border-radius: 50%;
                    background: #00C896;
                    box-shadow: 0 0 10px #00C89655;
                    animation: bz-preview 1.5s ${cssValue} infinite alternate;
                  }
                `}</style>
                <div key={animKey} className="bz-ball-elem" />
              </div>
              <p className="mt-2 font-mono text-xs text-muted">1.5s · infinite · alternate</p>
            </div>
          </div>

          {/* CSS output */}
          <div>
            <p className="mb-2 font-mono text-xs uppercase tracking-widest text-muted">Output</p>
            <div className="rounded border border-border bg-bg p-3">
              <code className="break-all font-mono text-sm">
                <span className="text-muted">animation-timing-function: </span>
                <span className="text-teal">{cssValue}</span>
                <span className="text-muted">;</span>
              </code>
            </div>
            <button
              onClick={copy}
              className="mt-2 w-full rounded border border-border px-4 py-2 font-mono text-xs text-dim transition-colors hover:border-teal hover:text-teal"
            >
              {copied ? '✓ コピーしました' : '↑ Copy CSS'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
