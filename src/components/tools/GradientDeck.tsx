'use client'

import { useState, useRef } from 'react'

type GradientType = 'linear' | 'radial' | 'conic'

interface Stop {
  id: string
  color: string
  position: number
}

interface Preset {
  name: string
  type: GradientType
  angle: number
  stops: Omit<Stop, 'id'>[]
}

const PRESETS: Preset[] = [
  {
    name: 'Sunset',
    type: 'linear',
    angle: 135,
    stops: [
      { color: '#ff6b6b', position: 0 },
      { color: '#feca57', position: 50 },
      { color: '#ff9ff3', position: 100 },
    ],
  },
  {
    name: 'Ocean',
    type: 'linear',
    angle: 45,
    stops: [
      { color: '#0ea5e9', position: 0 },
      { color: '#6366f1', position: 100 },
    ],
  },
  {
    name: 'Forest',
    type: 'radial',
    angle: 0,
    stops: [
      { color: '#22c55e', position: 0 },
      { color: '#14532d', position: 100 },
    ],
  },
  {
    name: 'Neon',
    type: 'linear',
    angle: 90,
    stops: [
      { color: '#ff0080', position: 0 },
      { color: '#7928ca', position: 50 },
      { color: '#00d2ff', position: 100 },
    ],
  },
  {
    name: 'Gold',
    type: 'conic',
    angle: 0,
    stops: [
      { color: '#f59e0b', position: 0 },
      { color: '#fef3c7', position: 50 },
      { color: '#d97706', position: 100 },
    ],
  },
]

function buildCss(type: GradientType, angle: number, stops: Stop[]): string {
  const sorted = stops
    .slice()
    .sort((a, b) => a.position - b.position)
    .map((s) => `${s.color} ${s.position}%`)
    .join(', ')

  switch (type) {
    case 'linear':
      return `linear-gradient(${angle}deg, ${sorted})`
    case 'radial':
      return `radial-gradient(circle, ${sorted})`
    case 'conic':
      return `conic-gradient(from ${angle}deg, ${sorted})`
  }
}

function PresetSwatch({ preset }: { preset: Preset }) {
  const fakestops = preset.stops.map((s, i) => ({ ...s, id: String(i) }))
  const css = buildCss(preset.type, preset.angle, fakestops)
  return <div className="h-12 w-full rounded-t" style={{ background: css }} />
}

export function GradientDeck() {
  const idRef = useRef(100)
  const newId = () => String(idRef.current++)

  const [type, setType] = useState<GradientType>('linear')
  const [angle, setAngle] = useState(135)
  const [stops, setStops] = useState<Stop[]>([
    { id: '1', color: '#00C896', position: 0 },
    { id: '2', color: '#6366f1', position: 100 },
  ])
  const [copied, setCopied] = useState(false)

  const css = buildCss(type, angle, stops)
  const fullCss = `background: ${css};`

  function handleStopColor(id: string, color: string) {
    setStops((prev) => prev.map((s) => (s.id === id ? { ...s, color } : s)))
  }

  function handleStopPosition(id: string, position: number) {
    setStops((prev) => prev.map((s) => (s.id === id ? { ...s, position } : s)))
  }

  function handleAddStop() {
    setStops((prev) => [...prev, { id: newId(), color: '#ffffff', position: 50 }])
  }

  function handleDeleteStop(id: string) {
    if (stops.length <= 2) return
    setStops((prev) => prev.filter((s) => s.id !== id))
  }

  function handleLoadPreset(preset: Preset) {
    setType(preset.type)
    setAngle(preset.angle)
    setStops(preset.stops.map((s) => ({ ...s, id: newId() })))
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(fullCss)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {}
  }

  return (
    <div className="space-y-6">
      {/* Preview */}
      <div
        className="h-44 w-full rounded-xl border border-border shadow-inner"
        style={{ background: css }}
        aria-label="グラデーションプレビュー"
      />

      {/* Type switcher */}
      <div className="flex gap-1 rounded-lg border border-border bg-surface-hi p-1">
        {(['linear', 'radial', 'conic'] as GradientType[]).map((t) => (
          <button
            key={t}
            onClick={() => setType(t)}
            className={`flex-1 rounded py-1.5 font-mono text-xs uppercase tracking-wider transition-all duration-150 ${
              type === t
                ? 'bg-teal font-semibold text-bg shadow-sm'
                : 'text-muted hover:text-dim'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Angle slider — linear and conic only */}
      {type !== 'radial' && (
        <div className="flex items-center gap-3">
          <label className="w-14 shrink-0 font-mono text-[10px] uppercase tracking-widest text-muted">
            Angle
          </label>
          <input
            type="range"
            min={0}
            max={360}
            value={angle}
            onChange={(e) => setAngle(Number(e.target.value))}
            className="flex-1 accent-teal"
          />
          <span className="w-10 text-right font-mono text-xs tabular-nums text-dim">{angle}°</span>
        </div>
      )}

      {/* Color stops */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted">
            Color Stops{' '}
            <span className="text-dim">{stops.length}</span>
          </span>
          <button
            onClick={handleAddStop}
            className="rounded border border-teal/50 px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-teal transition-colors hover:bg-teal/10"
          >
            + Add
          </button>
        </div>

        {/* Live gradient strip */}
        <div
          className="mb-3 h-2 w-full rounded-full border border-border/50"
          style={{ background: css }}
        />

        <div className="space-y-2">
          {stops.map((stop) => (
            <div
              key={stop.id}
              className="flex items-center gap-3 rounded-lg border border-border bg-surface-hi px-3 py-2.5 transition-colors hover:border-border-hi"
            >
              <label className="relative shrink-0 cursor-pointer">
                <input
                  type="color"
                  value={stop.color}
                  onChange={(e) => handleStopColor(stop.id, e.target.value)}
                  className="sr-only"
                />
                <span
                  className="block h-7 w-7 rounded-md border border-border/50 transition-transform hover:scale-110"
                  style={{ backgroundColor: stop.color }}
                />
              </label>
              <span className="w-[5.5rem] shrink-0 font-mono text-[10px] uppercase text-muted">
                {stop.color.toUpperCase()}
              </span>
              <input
                type="range"
                min={0}
                max={100}
                value={stop.position}
                onChange={(e) => handleStopPosition(stop.id, Number(e.target.value))}
                className="flex-1 accent-teal"
              />
              <span className="w-8 shrink-0 text-right font-mono text-[10px] tabular-nums text-dim">
                {stop.position}%
              </span>
              <button
                onClick={() => handleDeleteStop(stop.id)}
                disabled={stops.length <= 2}
                title="このストップを削除"
                className="ml-1 shrink-0 font-mono text-xs text-muted transition-colors hover:text-primary disabled:cursor-not-allowed disabled:opacity-20"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* CSS output */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted">
            CSS Output
          </span>
          <button
            onClick={handleCopy}
            className={`rounded px-3 py-1 font-mono text-[10px] uppercase tracking-wider transition-all duration-150 ${
              copied
                ? 'bg-teal text-bg'
                : 'border border-border text-muted hover:border-border-hi hover:text-dim'
            }`}
          >
            {copied ? '✓ Copied' : 'Copy CSS'}
          </button>
        </div>
        <div
          className="overflow-hidden rounded-lg border border-border"
          style={{ borderLeftColor: 'transparent', borderLeftWidth: '3px', borderImage: `${css} 1` }}
        >
          <pre className="overflow-x-auto bg-surface-hi px-4 py-3 font-mono text-xs text-primary">
            {fullCss}
          </pre>
        </div>
      </div>

      {/* Presets */}
      <div>
        <p className="mb-3 font-mono text-[10px] uppercase tracking-widest text-muted">Presets</p>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {PRESETS.map((preset) => (
            <button
              key={preset.name}
              onClick={() => handleLoadPreset(preset)}
              className="group overflow-hidden rounded-lg border border-border bg-surface-hi transition-all duration-150 hover:border-border-hi hover:shadow-md"
            >
              <PresetSwatch preset={preset} />
              <p className="py-2 font-mono text-[10px] text-muted transition-colors group-hover:text-dim">
                {preset.name}
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
