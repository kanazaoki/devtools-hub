'use client'

import { useState, useCallback } from 'react'

type Direction = 'top' | 'bottom' | 'left' | 'right' | 'radial-out' | 'radial-in'

interface MaskLayer {
  id: number
  direction: Direction
  start: number
  end: number
}

let nextId = 1

function defaultLayer(): MaskLayer {
  return { id: nextId++, direction: 'bottom', start: 0, end: 50 }
}

function buildGradient(layer: MaskLayer): string {
  const { direction, start, end } = layer
  const opaque = `rgba(0,0,0,1) ${start}%`
  const transparent = `rgba(0,0,0,0) ${end}%`

  if (direction === 'radial-out') {
    return `radial-gradient(ellipse at center, ${opaque}, ${transparent})`
  }
  if (direction === 'radial-in') {
    return `radial-gradient(ellipse at center, ${transparent}, ${opaque})`
  }

  const dirMap: Record<string, string> = {
    top: 'to bottom',
    bottom: 'to top',
    left: 'to right',
    right: 'to left',
  }
  return `linear-gradient(${dirMap[direction]}, ${opaque}, ${transparent})`
}

function buildMaskValue(layers: MaskLayer[]): string {
  return layers.map(buildGradient).join(',\n  ')
}

function buildCss(layers: MaskLayer[]): string {
  const val = buildMaskValue(layers)
  return `-webkit-mask-image:\n  ${val};\nmask-image:\n  ${val};`
}

const DIRECTION_DEFS: { key: Direction; label: string; arrow: string }[] = [
  { key: 'top', label: '上→透明', arrow: '↑' },
  { key: 'bottom', label: '下→透明', arrow: '↓' },
  { key: 'left', label: '左→透明', arrow: '←' },
  { key: 'right', label: '右→透明', arrow: '→' },
  { key: 'radial-out', label: '放射（中→外）', arrow: '◎' },
  { key: 'radial-in', label: '放射（外→中）', arrow: '●' },
]

const LAYER_COLORS = [
  { border: 'border-teal/40', bg: 'bg-teal/5', text: 'text-teal', label: 'A' },
  { border: 'border-blue-400/40', bg: 'bg-blue-400/5', text: 'text-blue-400', label: 'B' },
  { border: 'border-violet-400/40', bg: 'bg-violet-400/5', text: 'text-violet-400', label: 'C' },
]

export function CssMaskGenerator() {
  const [layers, setLayers] = useState<MaskLayer[]>([defaultLayer()])
  const [copied, setCopied] = useState(false)

  const addLayer = () => {
    if (layers.length >= 3) return
    setLayers((prev) => [...prev, defaultLayer()])
  }

  const removeLayer = (id: number) => {
    if (layers.length <= 1) return
    setLayers((prev) => prev.filter((l) => l.id !== id))
  }

  const updateLayer = useCallback((id: number, patch: Partial<MaskLayer>) => {
    setLayers((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)))
  }, [])

  const css = buildCss(layers)
  const previewMaskStyle: React.CSSProperties = {
    WebkitMaskImage: buildMaskValue(layers),
    maskImage: buildMaskValue(layers),
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(css).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      {/* Controls */}
      <div className="flex flex-col gap-3 lg:w-72 xl:w-80">
        {layers.map((layer, index) => {
          const col = LAYER_COLORS[index]
          return (
            <div key={layer.id} className={`rounded border ${col.border} ${col.bg} p-4`}>
              {/* Layer header */}
              <div className="mb-4 flex items-center gap-2">
                <span className={`flex h-5 w-5 items-center justify-center rounded font-mono text-xs font-bold ${col.text} border ${col.border}`}>
                  {col.label}
                </span>
                <span className="font-mono text-xs text-dim">レイヤー {index + 1}</span>
                {layers.length > 1 && (
                  <button
                    onClick={() => removeLayer(layer.id)}
                    className="ml-auto text-xs text-border transition-colors hover:text-red-400"
                  >
                    削除
                  </button>
                )}
              </div>

              {/* Direction grid */}
              <div className="mb-4">
                <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-muted">方向</p>
                <div className="grid grid-cols-3 gap-1">
                  {DIRECTION_DEFS.map(({ key, label, arrow }) => (
                    <button
                      key={key}
                      onClick={() => updateLayer(layer.id, { direction: key })}
                      className={`flex flex-col items-center gap-0.5 rounded border px-1 py-1.5 text-center transition-colors ${
                        layer.direction === key
                          ? `${col.border} ${col.text} bg-white/5`
                          : 'border-border/50 text-dim hover:border-border hover:text-primary'
                      }`}
                    >
                      <span className="text-sm leading-none">{arrow}</span>
                      <span className="text-[9px] leading-tight">{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Sliders */}
              <div className="space-y-3">
                <div>
                  <div className="mb-1 flex justify-between">
                    <span className="font-mono text-[10px] text-muted">開始位置</span>
                    <span className="font-mono text-[10px] tabular-nums text-bright">{layer.start}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={layer.start}
                    onChange={(e) => {
                      const v = Number(e.target.value)
                      updateLayer(layer.id, { start: v, end: Math.max(layer.end, v + 5) })
                    }}
                    className="h-1 w-full cursor-pointer appearance-none rounded-full bg-border"
                    style={{ accentColor: '#14b8a6' }}
                  />
                </div>
                <div>
                  <div className="mb-1 flex justify-between">
                    <span className="font-mono text-[10px] text-muted">終了位置</span>
                    <span className="font-mono text-[10px] tabular-nums text-bright">{layer.end}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={layer.end}
                    onChange={(e) => {
                      const v = Number(e.target.value)
                      updateLayer(layer.id, { end: v, start: Math.min(layer.start, v - 5) })
                    }}
                    className="h-1 w-full cursor-pointer appearance-none rounded-full bg-border"
                    style={{ accentColor: '#14b8a6' }}
                  />
                </div>
              </div>
            </div>
          )
        })}

        {layers.length < 3 && (
          <button
            onClick={addLayer}
            className="rounded border border-dashed border-border py-2 text-xs text-muted transition-colors hover:border-teal/50 hover:text-teal"
          >
            + レイヤーを追加（最大3枚）
          </button>
        )}
      </div>

      {/* Right: Preview + Output */}
      <div className="flex flex-1 flex-col gap-4">
        {/* Preview */}
        <div className="overflow-hidden rounded border border-border">
          <div className="border-b border-border px-4 py-2.5">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-widest text-muted">プレビュー</p>
          </div>
          <div className="relative h-56 overflow-hidden">
            {/* Rich background so mask effect is visible */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#0f2a4a] via-[#0d3d5a] to-[#0a1a3a]">
              <div className="absolute inset-0"
                style={{
                  backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 39px, rgba(20,184,166,0.06) 40px), repeating-linear-gradient(90deg, transparent, transparent 39px, rgba(20,184,166,0.06) 40px)',
                }}
              />
            </div>
            {/* Masked content */}
            <div className="absolute inset-0" style={previewMaskStyle}>
              <div className="flex h-full flex-col items-center justify-center gap-3 p-6">
                <p className="font-mono text-2xl font-bold tracking-wider text-teal">mask-image</p>
                <p className="text-sm text-[#7dd3fc]">グラデーションマスクでコンテンツをフェード</p>
                <div className="mt-1 flex gap-2">
                  {['#14b8a6', '#38bdf8', '#818cf8', '#f472b6'].map((c) => (
                    <div key={c} className="h-6 w-12 rounded" style={{ backgroundColor: c }} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CSS Output */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-widest text-muted">CSS 出力</p>
            <button
              onClick={handleCopy}
              className={`rounded border px-3 py-1.5 text-xs font-medium transition-colors ${
                copied
                  ? 'border-teal/50 text-teal'
                  : 'border-border text-dim hover:border-teal/50 hover:text-teal'
              }`}
            >
              {copied ? '✓ コピー済み' : 'コピー'}
            </button>
          </div>
          <div className="rounded border border-border bg-[#070d1a] p-4">
            <pre className="overflow-x-auto font-mono text-xs leading-relaxed text-bright">{css}</pre>
          </div>
        </div>
      </div>
    </div>
  )
}
