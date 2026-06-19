'use client'

import { useState, useCallback, useMemo } from 'react'

// ── Types & helpers ───────────────────────────────────────────────────────────

interface Shadow {
  id: number
  x: number
  y: number
  blur: number
  spread: number
  color: string
  alpha: number
  inset: boolean
}

let _id = 0
function nextId() { return ++_id }

function makeShadow(overrides?: Partial<Shadow>): Shadow {
  return {
    id: nextId(),
    x: 0, y: 4, blur: 12, spread: 0,
    color: '#000000', alpha: 0.25, inset: false,
    ...overrides,
  }
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '')
  const full = clean.length === 3
    ? clean.split('').map(c => c + c).join('')
    : clean
  if (!/^[0-9A-Fa-f]{6}$/.test(full)) return [0, 0, 0]
  const n = parseInt(full, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function shadowToCSS(s: Shadow): string {
  const [r, g, b] = hexToRgb(s.color)
  const a = Math.round(s.alpha * 100) / 100
  return `${s.inset ? 'inset ' : ''}${s.x}px ${s.y}px ${s.blur}px ${s.spread}px rgba(${r}, ${g}, ${b}, ${a})`
}

function buildCSS(shadows: Shadow[]): string {
  if (shadows.length === 0) return 'box-shadow: none;'
  const parts = shadows.map(shadowToCSS)
  return `box-shadow:\n  ${parts.join(',\n  ')};`
}

// ── SliderField ───────────────────────────────────────────────────────────────

interface SliderFieldProps {
  label: string
  value: number
  min: number
  max: number
  unit: string
  onChange: (v: number) => void
}

function SliderField({ label, value, min, max, unit, onChange }: SliderFieldProps) {
  const pct = ((value - min) / (max - min)) * 100

  return (
    <div className="grid grid-cols-[80px_1fr_60px] items-center gap-3">
      <span className="font-mono text-[11px] text-muted">{label}</span>
      <div className="relative h-1.5 rounded-full bg-border">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-teal/60 transition-none"
          style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
          aria-hidden="true"
        />
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={e => onChange(Number(e.target.value))}
          aria-label={label}
          className="absolute inset-0 h-full w-full cursor-pointer appearance-none bg-transparent opacity-0"
        />
      </div>
      <div className="flex items-center justify-end gap-0.5">
        <input
          type="number"
          min={min}
          max={max}
          value={value}
          onChange={e => {
            const n = parseInt(e.target.value, 10)
            if (!isNaN(n)) onChange(Math.min(max, Math.max(min, n)))
          }}
          aria-label={`${label} 数値入力`}
          className="w-10 rounded border border-border bg-bg px-1 py-0.5 font-mono text-[11px] text-bright outline-none focus:border-teal/50 text-right tabular-nums"
        />
        <span className="w-5 font-mono text-[9px] text-muted">{unit}</span>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function BoxShadowGenerator() {
  const [shadows, setShadows] = useState<Shadow[]>([makeShadow({ y: 4, blur: 12, alpha: 0.25 })])
  const [activeIdx, setActiveIdx] = useState(0)
  const [copied, setCopied] = useState(false)

  const css = useMemo(() => buildCSS(shadows), [shadows])
  const previewBoxShadow = useMemo(() => shadows.map(shadowToCSS).join(', '), [shadows])

  const safeIdx = Math.min(activeIdx, shadows.length - 1)
  const active = shadows[safeIdx]

  const updateActive = useCallback((patch: Partial<Shadow>) => {
    setShadows(prev =>
      prev.map((s, i) => (i === Math.min(activeIdx, prev.length - 1) ? { ...s, ...patch } : s))
    )
  }, [activeIdx])

  const addLayer = useCallback(() => {
    if (shadows.length >= 5) return
    const newIdx = shadows.length
    setShadows(prev => [...prev, makeShadow()])
    setActiveIdx(newIdx)
  }, [shadows.length])

  const removeLayer = useCallback((idx: number) => {
    if (shadows.length <= 1) return
    setShadows(prev => prev.filter((_, i) => i !== idx))
    setActiveIdx(prev => (prev >= idx && prev > 0 ? prev - 1 : prev))
  }, [shadows.length])

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(css)
    } catch {
      const el = document.createElement('textarea')
      el.value = css
      document.body.appendChild(el); el.select(); document.execCommand('copy'); document.body.removeChild(el)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [css])

  if (!active) return null

  return (
    <div className="space-y-5">

      {/* ── Preview canvas ─────────────────────────────────────────────────── */}
      <div
        className="relative flex items-center justify-center overflow-hidden rounded-lg py-14"
        style={{
          background: 'repeating-linear-gradient(45deg, #181818 0px, #181818 8px, #141414 8px, #141414 16px)',
        }}
        aria-label="box-shadow プレビュー領域"
      >
        <div
          className="h-24 w-40 rounded-xl bg-[#242424] transition-all duration-100"
          style={{ boxShadow: previewBoxShadow || 'none' }}
          aria-label="box-shadow プレビュー"
        />
      </div>

      {/* ── Two-column: editor + layers ─────────────────────────────────── */}
      <div className="grid gap-5 lg:grid-cols-[1fr_220px]">

        {/* Editor panel */}
        <div className="rounded-lg border border-border bg-surface">
          <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted">
              Layer {String(safeIdx + 1).padStart(2, '0')}
            </p>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] text-muted">inset</span>
              <button
                type="button"
                role="switch"
                aria-checked={active.inset}
                aria-label="inset シャドウ"
                onClick={() => updateActive({ inset: !active.inset })}
                className={`relative inline-flex h-4 w-7 cursor-pointer rounded-full border-0 bg-transparent p-0 transition-colors focus:outline-none`}
              >
                <span
                  className={`absolute inset-0 rounded-full transition-colors ${
                    active.inset ? 'bg-teal/70' : 'bg-border'
                  }`}
                />
                <span
                  className={`absolute top-0.5 h-3 w-3 rounded-full bg-white shadow transition-transform ${
                    active.inset ? 'translate-x-3.5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
          </div>

          <div className="space-y-3 px-4 py-4">
            <SliderField label="X offset" value={active.x}      min={-100} max={100} unit="px" onChange={v => updateActive({ x: v })} />
            <SliderField label="Y offset" value={active.y}      min={-100} max={100} unit="px" onChange={v => updateActive({ y: v })} />
            <SliderField label="Blur"     value={active.blur}   min={0}    max={200} unit="px" onChange={v => updateActive({ blur: v })} />
            <SliderField label="Spread"   value={active.spread} min={-100} max={100} unit="px" onChange={v => updateActive({ spread: v })} />
            <SliderField
              label="Alpha"
              value={Math.round(active.alpha * 100)}
              min={0} max={100} unit="%" onChange={v => updateActive({ alpha: v / 100 })}
            />

            {/* Divider */}
            <div className="border-t border-border pt-3">
              <div className="grid grid-cols-[80px_1fr] items-center gap-3">
                <span className="font-mono text-[11px] text-muted">Color</span>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={active.color}
                    onChange={e => updateActive({ color: e.target.value })}
                    aria-label="シャドウカラー"
                    className="h-7 w-9 shrink-0 cursor-pointer rounded border border-border bg-bg p-0.5"
                  />
                  <input
                    type="text"
                    value={active.color}
                    onChange={e => {
                      const v = e.target.value
                      if (/^#[0-9A-Fa-f]{0,6}$/.test(v)) updateActive({ color: v })
                    }}
                    aria-label="シャドウカラー HEX"
                    maxLength={7}
                    className="w-20 rounded border border-border bg-bg px-2 py-1 font-mono text-[11px] text-bright outline-none focus:border-teal/50"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Layer panel */}
        <div className="flex flex-col gap-2">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted">Layers</p>
          <div className="flex flex-col gap-1">
            {shadows.map((s, i) => (
              <div
                key={s.id}
                role="button"
                aria-pressed={i === safeIdx}
                aria-label={`レイヤー ${i + 1}`}
                onClick={() => setActiveIdx(i)}
                className={`group flex cursor-pointer items-center gap-2.5 rounded-md border px-2.5 py-2 transition-all ${
                  i === safeIdx
                    ? 'border-teal/40 bg-teal/[0.06]'
                    : 'border-border hover:border-border/60 hover:bg-surface'
                }`}
              >
                <span className={`shrink-0 font-mono text-[10px] tabular-nums ${
                  i === safeIdx ? 'text-teal' : 'text-muted'
                }`}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div
                  className="h-3.5 w-3.5 shrink-0 rounded-sm border border-white/10"
                  style={{ backgroundColor: s.color, opacity: Math.min(1, s.alpha + 0.5) }}
                  aria-hidden="true"
                />
                <span className={`flex-1 truncate font-mono text-[10px] ${
                  i === safeIdx ? 'text-dim' : 'text-muted'
                }`}>
                  {s.inset ? '↙ ' : ''}{s.x},{s.y} b{s.blur}
                </span>
                {shadows.length > 1 && (
                  <button
                    type="button"
                    onClick={e => { e.stopPropagation(); removeLayer(i) }}
                    aria-label={`レイヤー ${i + 1} を削除`}
                    className="shrink-0 font-mono text-[10px] text-transparent transition-colors group-hover:text-muted hover:!text-red-400"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>

          {shadows.length < 5 ? (
            <button
              type="button"
              onClick={addLayer}
              aria-label="シャドウレイヤーを追加"
              className="flex items-center justify-center gap-1.5 rounded-md border border-dashed border-border py-2 font-mono text-[11px] text-muted transition-all hover:border-teal/30 hover:text-dim"
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                <path d="M5 1v8M1 5h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              Add layer
            </button>
          ) : (
            <p className="py-1 text-center font-mono text-[10px] text-muted">Max 5 layers</p>
          )}
          <p className="text-right font-mono text-[10px] text-muted">{shadows.length} / 5</p>
        </div>
      </div>

      {/* ── CSS output ──────────────────────────────────────────────────── */}
      <div className="overflow-hidden rounded-lg border border-border">
        <div className="flex items-center justify-between border-b border-border bg-surface px-4 py-2">
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted">CSS Output</span>
          <button
            type="button"
            onClick={handleCopy}
            aria-label="CSS をコピー"
            className={`flex items-center gap-1.5 rounded px-3 py-1 font-mono text-xs transition-all ${
              copied
                ? 'bg-teal/10 text-teal'
                : 'text-muted hover:text-dim'
            }`}
          >
            {copied ? (
              <>
                <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden="true">
                  <path d="M2 5.5l2.5 2.5L9 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Copied
              </>
            ) : (
              <>
                <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden="true">
                  <rect x="1.5" y="3.5" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.2"/>
                  <path d="M3.5 3.5V2a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 .5.5v5a.5.5 0 0 1-.5.5H7.5" stroke="currentColor" strokeWidth="1.2"/>
                </svg>
                Copy CSS
              </>
            )}
          </button>
        </div>
        <pre
          aria-label="生成された CSS"
          className="overflow-x-auto bg-bg px-5 py-4 font-mono text-[12px] leading-relaxed"
        >
          <span className="text-teal/80">box-shadow</span>
          <span className="text-muted">:</span>
          {'\n  '}
          {shadows.map((s, i) => (
            <span key={s.id}>
              <span className="text-dim">{shadowToCSS(s)}</span>
              {i < shadows.length - 1 && <span className="text-muted">,{'\n  '}</span>}
            </span>
          ))}
          <span className="text-muted">;</span>
        </pre>
      </div>
    </div>
  )
}
