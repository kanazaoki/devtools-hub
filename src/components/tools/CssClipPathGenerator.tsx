'use client'

import { useState, useRef, useEffect } from 'react'

type ShapeMode = 'polygon' | 'circle' | 'ellipse' | 'inset'
type Point = [number, number]

interface CircleState { r: number; cx: number; cy: number }
interface EllipseState { rx: number; ry: number; cx: number; cy: number }
interface InsetState { top: number; right: number; bottom: number; left: number; radius: number }

const PRESETS: { name: string; points: Point[] }[] = [
  { name: '三角形', points: [[50,0],[100,100],[0,100]] },
  { name: '矢印 →', points: [[0,20],[60,20],[60,0],[100,50],[60,100],[60,80],[0,80]] },
  { name: '六角形', points: [[50,0],[100,25],[100,75],[50,100],[0,75],[0,25]] },
  { name: '菱形', points: [[50,0],[100,50],[50,100],[0,50]] },
  { name: '★ 星', points: [[50,0],[61,35],[98,35],[68,57],[79,91],[50,70],[21,91],[32,57],[2,35],[39,35]] },
  { name: '五角形', points: [[50,0],[100,38],[82,100],[18,100],[0,38]] },
  { name: '平行四辺形', points: [[20,0],[100,0],[80,100],[0,100]] },
  { name: 'ノッチ', points: [[0,0],[100,0],[100,100],[55,100],[50,80],[45,100],[0,100]] },
]

/* Distinct hue per point index — wraps at 12 */
function pointHue(i: number): string {
  const hues = [0, 210, 130, 45, 280, 170, 340, 80, 190, 25, 300, 155]
  return `hsl(${hues[i % hues.length]}, 80%, 62%)`
}

function getClipValue(mode: ShapeMode, points: Point[], circle: CircleState, ellipse: EllipseState, inset: InsetState): string {
  switch (mode) {
    case 'polygon': return `polygon(${points.map(([x,y]) => `${x}% ${y}%`).join(', ')})`
    case 'circle': return `circle(${circle.r}% at ${circle.cx}% ${circle.cy}%)`
    case 'ellipse': return `ellipse(${ellipse.rx}% ${ellipse.ry}% at ${ellipse.cx}% ${ellipse.cy}%)`
    case 'inset': {
      const r = inset.radius > 0 ? ` round ${inset.radius}px` : ''
      return `inset(${inset.top}% ${inset.right}% ${inset.bottom}% ${inset.left}%${r})`
    }
  }
}

function Slider({ label, value, min = 0, max = 100, unit = '%', onChange }: {
  label: string; value: number; min?: number; max?: number; unit?: string; onChange: (v: number) => void
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted">{label}</span>
        <span className="rounded bg-surface px-1.5 py-0.5 font-mono text-[10px] tabular-nums text-primary">{value}{unit}</span>
      </div>
      <input
        type="range" min={min} max={max} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full accent-teal"
      />
    </div>
  )
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(value).then(() => {
          setCopied(true)
          setTimeout(() => setCopied(false), 1500)
        })
      }}
      className={`w-full rounded border py-2 font-mono text-xs font-semibold transition-all ${
        copied
          ? 'border-teal/50 bg-teal/10 text-teal'
          : 'border-border bg-surface text-dim hover:border-teal hover:text-teal'
      }`}
    >
      {copied ? '✓ CSS をコピーしました' : '↑ Copy CSS'}
    </button>
  )
}

/* Mini SVG thumbnail for preset button */
function PresetThumb({ points }: { points: Point[] }) {
  const pad = 4
  const size = 48
  const inner = size - pad * 2
  const scaled = points.map(([x,y]): [number, number] => [
    pad + (x / 100) * inner,
    pad + (y / 100) * inner,
  ])
  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="h-12 w-12 shrink-0">
      <polygon
        points={scaled.map(([x,y]) => `${x},${y}`).join(' ')}
        fill="rgba(45,212,191,0.15)"
        stroke="rgb(45,212,191)"
        strokeWidth="1"
        strokeLinejoin="round"
      />
    </svg>
  )
}

const DEFAULT_POINTS: Point[] = [[50,0],[100,50],[75,100],[25,100],[0,50]]

const MODES: { key: ShapeMode; label: string; icon: string; hint: string }[] = [
  { key: 'polygon', label: 'Polygon', icon: '◆', hint: 'ポイントをドラッグして自由形状を作成' },
  { key: 'circle', label: 'Circle', icon: '●', hint: '半径と中心位置をスライダーで調整' },
  { key: 'ellipse', label: 'Ellipse', icon: '⬬', hint: 'X/Y半径を独立して調整できる楕円' },
  { key: 'inset', label: 'Inset', icon: '▣', hint: '内側から切り取る矩形クリッピング' },
]

export function CssClipPathGenerator() {
  const [mode, setMode] = useState<ShapeMode>('polygon')
  const [points, setPoints] = useState<Point[]>(DEFAULT_POINTS)
  const [circle, setCircle] = useState<CircleState>({ r: 50, cx: 50, cy: 50 })
  const [ellipse, setEllipse] = useState<EllipseState>({ rx: 50, ry: 30, cx: 50, cy: 50 })
  const [inset, setInset] = useState<InsetState>({ top: 10, right: 10, bottom: 10, left: 10, radius: 0 })
  const [dragging, setDragging] = useState<number | null>(null)
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  const clipValue = getClipValue(mode, points, circle, ellipse, inset)
  const cssCode = `clip-path: ${clipValue};`
  const currentMode = MODES.find(m => m.key === mode)!

  /* Global pointer drag */
  useEffect(() => {
    if (dragging === null) return
    const handleMove = (e: PointerEvent) => {
      if (!svgRef.current) return
      const rect = svgRef.current.getBoundingClientRect()
      const x = Math.round(Math.min(100, Math.max(0, ((e.clientX - rect.left) / rect.width) * 100)))
      const y = Math.round(Math.min(100, Math.max(0, ((e.clientY - rect.top) / rect.height) * 100)))
      setPoints(prev => prev.map((p, i) => i === dragging ? [x, y] as Point : p))
    }
    const handleUp = () => setDragging(null)
    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleUp)
    return () => {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
    }
  }, [dragging])

  const addPoint = () => {
    if (points.length >= 12) return
    const last = points[points.length - 1]
    const first = points[0]
    setPoints(prev => [...prev, [
      Math.round((last[0] + first[0]) / 2),
      Math.round((last[1] + first[1]) / 2),
    ]])
  }

  const removePoint = (idx: number) => {
    if (points.length <= 3) return
    setPoints(prev => prev.filter((_, i) => i !== idx))
  }

  return (
    <div className="flex flex-col gap-5">

      {/* Mode tabs — editor tab style */}
      <div className="flex border-b border-border">
        {MODES.map(({ key, label, icon }) => (
          <button
            key={key}
            onClick={() => setMode(key)}
            className={`flex items-center gap-1.5 border-b-2 px-4 py-2.5 font-mono text-xs transition-all ${
              mode === key
                ? 'border-teal text-teal'
                : 'border-transparent text-muted hover:border-border hover:text-primary'
            }`}
          >
            <span className="text-[11px]">{icon}</span>
            {label}
          </button>
        ))}
      </div>

      {/* Hint text */}
      <p className="font-mono text-[11px] text-muted/70">{currentMode.hint}</p>

      <div className="grid gap-5 lg:grid-cols-[1fr_260px]">

        {/* Preview canvas */}
        <div className="flex flex-col gap-2">
          <div className="relative mx-auto aspect-square w-full max-w-[380px] overflow-hidden rounded-lg border border-border">
            {/* Fine grid bg */}
            <div
              className="absolute inset-0"
              style={{
                backgroundColor: '#0d0d0d',
                backgroundImage: [
                  'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px)',
                  'linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)',
                  'linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px)',
                  'linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)',
                ].join(', '),
                backgroundSize: '40px 40px, 40px 40px, 8px 8px, 8px 8px',
              }}
            />
            {/* Clipped subject — conic gradient makes shape instantly visible */}
            <div
              className="absolute inset-0 transition-none"
              style={{
                background: 'conic-gradient(from 0deg at 50% 50%, #e63946 0deg, #f4a261 60deg, #e9c46a 120deg, #2a9d8f 180deg, #457b9d 240deg, #8ecae6 300deg, #e63946 360deg)',
                clipPath: clipValue,
              }}
            />
            {/* SVG overlay for polygon editing */}
            {mode === 'polygon' && (
              <svg
                ref={svgRef}
                className="absolute inset-0 h-full w-full select-none"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                style={{ cursor: dragging !== null ? 'grabbing' : 'crosshair', touchAction: 'none' }}
              >
                {/* Edges */}
                <polygon
                  points={points.map(([x,y]) => `${x},${y}`).join(' ')}
                  fill="none"
                  stroke="rgba(255,255,255,0.25)"
                  strokeWidth="0.8"
                  strokeDasharray="2,2"
                  vectorEffect="non-scaling-stroke"
                />
                {/* Edge lines with individual point colors */}
                {points.map(([x,y], i) => {
                  const next = points[(i + 1) % points.length]
                  return (
                    <line
                      key={`e${i}`}
                      x1={x} y1={y} x2={next[0]} y2={next[1]}
                      stroke={pointHue(i)}
                      strokeWidth="0.6"
                      strokeOpacity="0.6"
                      vectorEffect="non-scaling-stroke"
                    />
                  )
                })}
                {/* Drag handles — color-coded */}
                {points.map(([x,y], i) => (
                  <g key={i}>
                    {/* Glow ring on hover/drag */}
                    {(hoveredPoint === i || dragging === i) && (
                      <circle
                        cx={x} cy={y} r={6}
                        fill={pointHue(i)}
                        fillOpacity="0.2"
                        vectorEffect="non-scaling-stroke"
                      />
                    )}
                    <circle
                      cx={x} cy={y} r={3}
                      fill={pointHue(i)}
                      stroke="rgba(0,0,0,0.6)"
                      strokeWidth="1"
                      vectorEffect="non-scaling-stroke"
                      style={{ cursor: dragging === i ? 'grabbing' : 'grab' }}
                      onPointerDown={e => { e.preventDefault(); e.stopPropagation(); setDragging(i) }}
                      onPointerEnter={() => setHoveredPoint(i)}
                      onPointerLeave={() => setHoveredPoint(null)}
                      onDoubleClick={e => { e.preventDefault(); removePoint(i) }}
                    />
                    {/* Point index label */}
                    <text
                      x={x + 4} y={y - 3}
                      fill={pointHue(i)}
                      fontSize="5"
                      fontFamily="monospace"
                      vectorEffect="non-scaling-stroke"
                      style={{ pointerEvents: 'none', userSelect: 'none' }}
                    >
                      {i+1}
                    </text>
                  </g>
                ))}
              </svg>
            )}
          </div>

          {/* Polygon controls below preview */}
          {mode === 'polygon' && (
            <div className="flex items-center gap-2">
              <button
                onClick={addPoint}
                disabled={points.length >= 12}
                className="rounded border border-border px-3 py-1 font-mono text-[10px] text-dim transition-colors hover:border-teal hover:text-teal disabled:opacity-40"
              >
                + 追加
              </button>
              <span className="font-mono text-[10px] text-muted/60">
                {points.length} pts · ダブルクリックで削除
              </span>
            </div>
          )}
        </div>

        {/* Controls sidebar */}
        <div className="flex flex-col gap-4">

          {/* Polygon: color-coded point list */}
          {mode === 'polygon' && (
            <div>
              <p className="mb-1.5 font-mono text-[9px] uppercase tracking-widest text-muted">
                Vertices
              </p>
              <div className="max-h-48 divide-y divide-border/40 overflow-y-auto rounded border border-border bg-bg">
                {points.map(([x,y], i) => (
                  <div
                    key={i}
                    className={`flex items-center gap-2 px-2.5 py-1.5 transition-colors ${
                      hoveredPoint === i || dragging === i ? 'bg-surface/60' : ''
                    }`}
                    onMouseEnter={() => setHoveredPoint(i)}
                    onMouseLeave={() => setHoveredPoint(null)}
                  >
                    {/* Color dot matching SVG handle */}
                    <div
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: pointHue(i) }}
                    />
                    <span className="w-3 shrink-0 font-mono text-[9px] text-muted/60">{i+1}</span>
                    <span className="font-mono text-[10px] tabular-nums text-primary">{x}%</span>
                    <span className="font-mono text-[9px] text-muted/50">,</span>
                    <span className="font-mono text-[10px] tabular-nums text-primary">{y}%</span>
                    <button
                      onClick={() => removePoint(i)}
                      disabled={points.length <= 3}
                      className="ml-auto text-[9px] text-red-400/50 transition-colors hover:text-red-400 disabled:opacity-20"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Circle sliders */}
          {mode === 'circle' && (
            <div className="flex flex-col gap-3">
              <Slider label="半径 r" value={circle.r} min={1} onChange={v => setCircle(s => ({...s, r: v}))} />
              <Slider label="中心 X" value={circle.cx} onChange={v => setCircle(s => ({...s, cx: v}))} />
              <Slider label="中心 Y" value={circle.cy} onChange={v => setCircle(s => ({...s, cy: v}))} />
            </div>
          )}

          {/* Ellipse sliders */}
          {mode === 'ellipse' && (
            <div className="flex flex-col gap-3">
              <Slider label="横半径 rx" value={ellipse.rx} min={1} onChange={v => setEllipse(s => ({...s, rx: v}))} />
              <Slider label="縦半径 ry" value={ellipse.ry} min={1} onChange={v => setEllipse(s => ({...s, ry: v}))} />
              <Slider label="中心 X" value={ellipse.cx} onChange={v => setEllipse(s => ({...s, cx: v}))} />
              <Slider label="中心 Y" value={ellipse.cy} onChange={v => setEllipse(s => ({...s, cy: v}))} />
            </div>
          )}

          {/* Inset sliders */}
          {mode === 'inset' && (
            <div className="flex flex-col gap-3">
              <Slider label="上 top" value={inset.top} max={49} onChange={v => setInset(s => ({...s, top: v}))} />
              <Slider label="右 right" value={inset.right} max={49} onChange={v => setInset(s => ({...s, right: v}))} />
              <Slider label="下 bottom" value={inset.bottom} max={49} onChange={v => setInset(s => ({...s, bottom: v}))} />
              <Slider label="左 left" value={inset.left} max={49} onChange={v => setInset(s => ({...s, left: v}))} />
              <Slider label="角丸 round" value={inset.radius} max={100} unit="px" onChange={v => setInset(s => ({...s, radius: v}))} />
            </div>
          )}

          {/* CSS output with syntax highlight */}
          <div>
            <p className="mb-1.5 font-mono text-[9px] uppercase tracking-widest text-muted">
              Output
            </p>
            <div className="rounded border border-border bg-bg p-3 font-mono text-xs leading-relaxed">
              <span className="text-muted/60">clip-path</span>
              <span className="text-border">: </span>
              <span className="text-teal break-all">{clipValue}</span>
              <span className="text-muted/60">;</span>
            </div>
            <div className="mt-2">
              <CopyButton value={cssCode} />
            </div>
          </div>
        </div>
      </div>

      {/* Presets — SVG thumbnail grid (NOT uniform text buttons) */}
      <div>
        <p className="mb-2 font-mono text-[9px] uppercase tracking-widest text-muted">
          Presets
        </p>
        <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-8">
          {PRESETS.map(preset => (
            <button
              key={preset.name}
              onClick={() => { setMode('polygon'); setPoints(preset.points) }}
              title={preset.name}
              className="group flex flex-col items-center gap-1 rounded border border-border bg-bg p-1.5 transition-all hover:border-teal/60 hover:bg-surface/50"
            >
              <PresetThumb points={preset.points} />
              <span className="font-mono text-[8px] leading-tight text-muted/70 transition-colors group-hover:text-primary">
                {preset.name}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
