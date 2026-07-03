'use client'

import { useState, useId } from 'react'

type ShadowLayer = {
  id: string
  x: number
  y: number
  blur: number
  color: string
  opacity: number
}

type Preset = {
  label: string
  hint: string
  layers: Omit<ShadowLayer, 'id'>[]
}

const PRESETS: Preset[] = [
  {
    label: 'シンプル',
    hint: '控えめな影',
    layers: [{ x: 2, y: 2, blur: 4, color: '#000000', opacity: 0.5 }],
  },
  {
    label: 'グロー',
    hint: 'teal 発光',
    layers: [
      { x: 0, y: 0, blur: 8, color: '#00d4aa', opacity: 0.6 },
      { x: 0, y: 0, blur: 20, color: '#00d4aa', opacity: 0.4 },
    ],
  },
  {
    label: 'エンボス',
    hint: '立体感',
    layers: [
      { x: 2, y: 2, blur: 0, color: '#000000', opacity: 0.5 },
      { x: -2, y: -2, blur: 0, color: '#ffffff', opacity: 0.4 },
    ],
  },
  {
    label: 'ネオン',
    hint: 'ピンク霧',
    layers: [
      { x: 0, y: 0, blur: 4, color: '#ff0080', opacity: 1 },
      { x: 0, y: 0, blur: 12, color: '#ff0080', opacity: 0.8 },
      { x: 0, y: 0, blur: 24, color: '#ff0080', opacity: 0.4 },
    ],
  },
]

function hexToRgba(hex: string, opacity: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  if (opacity >= 1) return `rgb(${r}, ${g}, ${b})`
  return `rgba(${r}, ${g}, ${b}, ${opacity})`
}

function layerToCss(layer: ShadowLayer): string {
  return `${layer.x}px ${layer.y}px ${layer.blur}px ${hexToRgba(layer.color, layer.opacity)}`
}

function layersToCss(layers: ShadowLayer[]): string {
  return `text-shadow: ${layers.map(layerToCss).join(',\n             ')};`
}

let uid = 0
function nextId() { return String(++uid) }

const DEFAULT_LAYERS: ShadowLayer[] = [
  { id: nextId(), x: 2, y: 2, blur: 4, color: '#000000', opacity: 0.5 },
]

function SliderRow({
  label, value, min, max, step = 1, onChange,
}: { label: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void }) {
  return (
    <div className="grid grid-cols-[3rem_1fr_3.5rem] items-center gap-3">
      <span className="font-mono text-[10px] uppercase tracking-wider text-muted">{label}</span>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1.5 cursor-pointer appearance-none rounded-full bg-border accent-teal"
      />
      <input
        type="number" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="rounded border border-border bg-[#060a12] px-1.5 py-0.5 text-center font-mono text-xs text-teal outline-none focus:border-teal/60"
      />
    </div>
  )
}

export function CssTextShadowGenerator() {
  const [layers, setLayers] = useState<ShadowLayer[]>(DEFAULT_LAYERS)
  const [previewText, setPreviewText] = useState('Type Here')
  const [copied, setCopied] = useState(false)
  const [activePreset, setActivePreset] = useState<string | null>('シンプル')
  const baseId = useId()

  const textShadow = layers.map(layerToCss).join(', ')
  const cssOutput = layersToCss(layers)

  const updateLayer = (id: string, patch: Partial<ShadowLayer>) => {
    setActivePreset(null)
    setLayers((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)))
  }

  const addLayer = () => {
    if (layers.length >= 5) return
    setActivePreset(null)
    setLayers((prev) => [...prev, { id: nextId(), x: 0, y: 0, blur: 8, color: '#00d4aa', opacity: 0.6 }])
  }

  const removeLayer = (id: string) => {
    if (layers.length <= 1) return
    setActivePreset(null)
    setLayers((prev) => prev.filter((l) => l.id !== id))
  }

  const applyPreset = (preset: Preset) => {
    setActivePreset(preset.label)
    setLayers(preset.layers.map((l) => ({ ...l, id: nextId() })))
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(cssOutput).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  const handleHexInput = (id: string, raw: string) => {
    const hex = raw.startsWith('#') ? raw : `#${raw}`
    if (/^#[0-9a-fA-F]{6}$/.test(hex)) updateLayer(id, { color: hex })
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Preset bar */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted">Preset</span>
        <span className="text-border">—</span>
        {PRESETS.map((p) => {
          const isActive = activePreset === p.label
          return (
            <button
              key={p.label}
              onClick={() => applyPreset(p)}
              title={p.hint}
              className={`rounded px-3 py-1 text-xs font-medium transition-all ${
                isActive
                  ? 'bg-teal/15 text-teal ring-1 ring-teal/30'
                  : 'border border-border text-dim hover:border-teal/40 hover:text-teal'
              }`}
            >
              {p.label}
            </button>
          )
        })}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
        {/* Left: Layer controls */}
        <div className="flex flex-col gap-3">
          {layers.map((layer, idx) => (
            <div
              key={layer.id}
              className="overflow-hidden rounded-lg border border-border bg-[#070d1a]"
              style={{ borderLeftColor: layer.color, borderLeftWidth: '3px' }}
            >
              {/* Layer header */}
              <div className="flex items-center justify-between px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ backgroundColor: layer.color, opacity: layer.opacity }}
                  />
                  <span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-muted">
                    Layer {idx + 1}
                  </span>
                </div>
                <button
                  onClick={() => removeLayer(layer.id)}
                  disabled={layers.length <= 1}
                  className="rounded px-2 py-0.5 text-[10px] font-medium text-muted/60 transition-colors hover:text-red-400 disabled:pointer-events-none disabled:opacity-20"
                >
                  Remove
                </button>
              </div>

              {/* Sliders */}
              <div className="flex flex-col gap-2.5 border-t border-border/50 px-4 py-3">
                <SliderRow label="X" value={layer.x} min={-50} max={50} onChange={(v) => updateLayer(layer.id, { x: v })} />
                <SliderRow label="Y" value={layer.y} min={-50} max={50} onChange={(v) => updateLayer(layer.id, { y: v })} />
                <SliderRow label="Blur" value={layer.blur} min={0} max={50} onChange={(v) => updateLayer(layer.id, { blur: v })} />
                <SliderRow label="Alpha" value={layer.opacity} min={0} max={1} step={0.01} onChange={(v) => updateLayer(layer.id, { opacity: v })} />

                {/* Color row */}
                <div className="grid grid-cols-[3rem_1fr_3.5rem] items-center gap-3">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-muted">Color</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      id={`${baseId}-color-${layer.id}`}
                      value={layer.color}
                      onChange={(e) => updateLayer(layer.id, { color: e.target.value })}
                      className="h-6 w-8 cursor-pointer rounded border border-border bg-transparent p-0.5"
                    />
                    <input
                      type="text"
                      value={layer.color}
                      onChange={(e) => handleHexInput(layer.id, e.target.value)}
                      className="w-20 rounded border border-border bg-[#060a12] px-2 py-0.5 font-mono text-xs text-bright outline-none focus:border-teal"
                      maxLength={7}
                      spellCheck={false}
                    />
                  </div>
                  <div />
                </div>
              </div>
            </div>
          ))}

          <button
            onClick={addLayer}
            disabled={layers.length >= 5}
            className="flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-border/60 py-2.5 text-xs text-muted/70 transition-all hover:border-teal/40 hover:text-teal disabled:pointer-events-none disabled:opacity-30"
          >
            <span className="text-base leading-none">+</span>
            <span>レイヤーを追加</span>
            <span className="font-mono text-[10px] text-muted/50">{layers.length}/5</span>
          </button>
        </div>

        {/* Right: Preview + Output */}
        <div className="flex flex-col gap-4">
          {/* Preview stage */}
          <div className="flex flex-col gap-0 overflow-hidden rounded-lg border border-border">
            <div className="flex min-h-[150px] items-center justify-center bg-[#030608] px-6 py-8">
              <p
                className="break-all text-center font-serif text-5xl font-bold text-white"
                style={{ textShadow }}
              >
                {previewText || 'Type Here'}
              </p>
            </div>
            <div className="border-t border-border/50 bg-[#070d1a] px-3 py-2">
              <input
                type="text"
                value={previewText}
                onChange={(e) => setPreviewText(e.target.value)}
                placeholder="プレビューテキスト..."
                className="w-full bg-transparent text-sm text-dim outline-none placeholder:text-border/40"
              />
            </div>
          </div>

          {/* CSS Output */}
          <div className="rounded-lg border border-border bg-[#070d1a]">
            <div className="flex items-center justify-between border-b border-border/50 px-4 py-2.5">
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted">CSS</span>
              <button
                onClick={handleCopy}
                className={`rounded border px-3 py-1 text-xs font-medium transition-all ${
                  copied
                    ? 'border-teal/50 bg-teal/10 text-teal'
                    : 'border-border text-dim hover:border-teal/40 hover:text-teal'
                }`}
              >
                {copied ? '✓ Copied' : 'Copy'}
              </button>
            </div>
            <pre className="overflow-x-auto p-4 font-mono text-xs leading-relaxed text-bright/90">
              {cssOutput}
            </pre>
          </div>
        </div>
      </div>
    </div>
  )
}
