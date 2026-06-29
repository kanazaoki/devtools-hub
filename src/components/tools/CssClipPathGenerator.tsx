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
      <div className="mb-1 flex justify-between">
        <span className="font-mono text-[10px] text-muted">{label}</span>
        <span className="font-mono text-xs text-primary">{value}{unit}</span>
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
      className={`rounded border px-3 py-1.5 font-mono text-xs transition-all ${
        copied
          ? 'border-teal/40 bg-teal/10 text-teal'
          : 'border-border text-dim hover:border-teal hover:text-teal'
      }`}
    >
      {copied ? '✓ copied' : 'Copy CSS'}
    </button>
  )
}

const DEFAULT_POINTS: Point[] = [[50,0],[100,50],[75,100],[25,100],[0,50]]

export function CssClipPathGenerator() {
  const [mode, setMode] = useState<ShapeMode>('polygon')
  const [points, setPoints] = useState<Point[]>(DEFAULT_POINTS)
  const [circle, setCircle] = useState<CircleState>({ r: 50, cx: 50, cy: 50 })
  const [ellipse, setEllipse] = useState<EllipseState>({ rx: 50, ry: 30, cx: 50, cy: 50 })
  const [inset, setInset] = useState<InsetState>({ top: 10, right: 10, bottom: 10, left: 10, radius: 0 })
  const [dragging, setDragging] = useState<number | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  const clipValue = getClipValue(mode, points, circle, ellipse, inset)
  const cssCode = `clip-path: ${clipValue};`

  // Global pointer move/up for drag
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

  const MODES: { key: ShapeMode; label: string }[] = [
    { key: 'polygon', label: 'Polygon' },
    { key: 'circle', label: 'Circle' },
    { key: 'ellipse', label: 'Ellipse' },
    { key: 'inset', label: 'Inset' },
  ]

  return (
    <div className="flex flex-col gap-6">
      {/* Shape tabs */}
      <div className="flex overflow-hidden rounded border border-border">
        {MODES.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setMode(key)}
            className={`flex-1 py-2 font-mono text-xs transition-colors ${
              mode === key ? 'bg-teal font-semibold text-bg' : 'text-muted hover:text-primary'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        {/* Preview area */}
        <div className="flex flex-col gap-2">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted">Preview</p>
          <div className="relative mx-auto aspect-square w-full max-w-[360px]">
            {/* Checkerboard bg */}
            <div
              className="absolute inset-0 rounded"
              style={{
                backgroundImage: 'repeating-conic-gradient(#2a2a2a 0% 25%, #1a1a1a 0% 50%)',
                backgroundSize: '16px 16px',
              }}
            />
            {/* Clipped element */}
            <div
              className="absolute inset-0 rounded"
              style={{
                background: 'linear-gradient(135deg, #2dd4bf 0%, #0d9488 50%, #0f766e 100%)',
                clipPath: clipValue,
              }}
            />
            {/* SVG overlay — polygon handles */}
            {mode === 'polygon' && (
              <svg
                ref={svgRef}
                className="absolute inset-0 h-full w-full select-none"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                style={{ cursor: dragging !== null ? 'grabbing' : 'default', touchAction: 'none' }}
              >
                {/* Polygon outline */}
                <polygon
                  points={points.map(([x,y]) => `${x},${y}`).join(' ')}
                  fill="none"
                  stroke="rgba(45,212,191,0.5)"
                  strokeWidth="1"
                  vectorEffect="non-scaling-stroke"
                />
                {/* Drag handles */}
                {points.map(([x,y], i) => (
                  <circle
                    key={i}
                    cx={x} cy={y} r={3}
                    fill="white"
                    stroke="rgb(45,212,191)"
                    strokeWidth="1.5"
                    vectorEffect="non-scaling-stroke"
                    style={{ cursor: dragging === i ? 'grabbing' : 'grab' }}
                    onPointerDown={e => { e.preventDefault(); e.stopPropagation(); setDragging(i) }}
                    onDoubleClick={e => { e.preventDefault(); removePoint(i) }}
                  />
                ))}
              </svg>
            )}
          </div>
          {mode === 'polygon' && (
            <div className="flex items-center gap-3">
              <button
                onClick={addPoint}
                disabled={points.length >= 12}
                className="rounded border border-border px-3 py-1 text-xs text-dim transition-colors hover:border-teal hover:text-teal disabled:opacity-40"
              >
                + ポイント追加
              </button>
              <span className="font-mono text-[10px] text-muted">
                {points.length} 点 · ダブルクリックで削除
              </span>
            </div>
          )}
        </div>

        {/* Controls panel */}
        <div className="flex flex-col gap-4">
          {/* Polygon point list */}
          {mode === 'polygon' && (
            <div>
              <p className="mb-1.5 font-mono text-[10px] uppercase tracking-widest text-muted">
                Points
              </p>
              <div className="max-h-52 divide-y divide-border/50 overflow-y-auto rounded border border-border">
                {points.map(([x,y], i) => (
                  <div key={i} className="flex items-center gap-2 px-3 py-1.5">
                    <span className="w-4 shrink-0 font-mono text-[10px] text-muted">{i+1}</span>
                    <span className="font-mono text-xs text-primary">{x}%</span>
                    <span className="font-mono text-[10px] text-muted">,</span>
                    <span className="font-mono text-xs text-primary">{y}%</span>
                    <button
                      onClick={() => removePoint(i)}
                      disabled={points.length <= 3}
                      className="ml-auto text-[10px] text-red-400/70 transition-colors hover:text-red-400 disabled:opacity-30"
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
              <Slider label="半径 (r)" value={circle.r} min={1} onChange={v => setCircle(s => ({...s, r: v}))} />
              <Slider label="中心 X (cx)" value={circle.cx} onChange={v => setCircle(s => ({...s, cx: v}))} />
              <Slider label="中心 Y (cy)" value={circle.cy} onChange={v => setCircle(s => ({...s, cy: v}))} />
            </div>
          )}

          {/* Ellipse sliders */}
          {mode === 'ellipse' && (
            <div className="flex flex-col gap-3">
              <Slider label="横半径 (rx)" value={ellipse.rx} min={1} onChange={v => setEllipse(s => ({...s, rx: v}))} />
              <Slider label="縦半径 (ry)" value={ellipse.ry} min={1} onChange={v => setEllipse(s => ({...s, ry: v}))} />
              <Slider label="中心 X (cx)" value={ellipse.cx} onChange={v => setEllipse(s => ({...s, cx: v}))} />
              <Slider label="中心 Y (cy)" value={ellipse.cy} onChange={v => setEllipse(s => ({...s, cy: v}))} />
            </div>
          )}

          {/* Inset sliders */}
          {mode === 'inset' && (
            <div className="flex flex-col gap-3">
              <Slider label="上 (top)" value={inset.top} max={49} onChange={v => setInset(s => ({...s, top: v}))} />
              <Slider label="右 (right)" value={inset.right} max={49} onChange={v => setInset(s => ({...s, right: v}))} />
              <Slider label="下 (bottom)" value={inset.bottom} max={49} onChange={v => setInset(s => ({...s, bottom: v}))} />
              <Slider label="左 (left)" value={inset.left} max={49} onChange={v => setInset(s => ({...s, left: v}))} />
              <Slider label="角丸 (round)" value={inset.radius} max={100} unit="px" onChange={v => setInset(s => ({...s, radius: v}))} />
            </div>
          )}

          {/* Generated CSS */}
          <div>
            <p className="mb-1.5 font-mono text-[10px] uppercase tracking-widest text-muted">
              Generated CSS
            </p>
            <pre className="min-h-12 overflow-x-auto whitespace-pre-wrap break-all rounded border border-border bg-bg p-3 font-mono text-xs text-primary">
              {cssCode}
            </pre>
            <div className="mt-2">
              <CopyButton value={cssCode} />
            </div>
          </div>
        </div>
      </div>

      {/* Presets */}
      <div>
        <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-muted">
          Presets
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {PRESETS.map(preset => (
            <button
              key={preset.name}
              onClick={() => { setMode('polygon'); setPoints(preset.points) }}
              className="rounded border border-border px-3 py-2 text-xs text-dim transition-colors hover:border-teal hover:text-primary"
            >
              {preset.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
