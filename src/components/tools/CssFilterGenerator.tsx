'use client'

import { useState, useCallback, useMemo } from 'react'

type FilterKey =
  | 'blur' | 'brightness' | 'contrast' | 'grayscale'
  | 'hue-rotate' | 'invert' | 'opacity' | 'saturate' | 'sepia'

interface FilterDef {
  key: FilterKey
  label: string
  min: number
  max: number
  step: number
  default: number
  unit: string
  format: (v: number) => string
  accent: string
}

// Ordered: Light → Color → Effect
const FILTERS: FilterDef[] = [
  { key: 'brightness', label: 'Brightness', min: 0,   max: 200, step: 1,   default: 100, unit: '%',   format: v => `brightness(${v}%)`,   accent: '#fbbf24' },
  { key: 'contrast',   label: 'Contrast',   min: 0,   max: 200, step: 1,   default: 100, unit: '%',   format: v => `contrast(${v}%)`,     accent: '#60a5fa' },
  { key: 'opacity',    label: 'Opacity',    min: 0,   max: 100, step: 1,   default: 100, unit: '%',   format: v => `opacity(${v}%)`,      accent: '#34d399' },
  { key: 'saturate',   label: 'Saturate',   min: 0,   max: 200, step: 1,   default: 100, unit: '%',   format: v => `saturate(${v}%)`,     accent: '#f97316' },
  { key: 'hue-rotate', label: 'Hue Rotate', min: 0,   max: 360, step: 1,   default: 0,   unit: 'deg', format: v => `hue-rotate(${v}deg)`, accent: '#f43f5e' },
  { key: 'grayscale',  label: 'Grayscale',  min: 0,   max: 100, step: 1,   default: 0,   unit: '%',   format: v => `grayscale(${v}%)`,    accent: '#94a3b8' },
  { key: 'sepia',      label: 'Sepia',      min: 0,   max: 100, step: 1,   default: 0,   unit: '%',   format: v => `sepia(${v}%)`,        accent: '#d97706' },
  { key: 'blur',       label: 'Blur',       min: 0,   max: 20,  step: 0.5, default: 0,   unit: 'px',  format: v => `blur(${v}px)`,        accent: '#a78bfa' },
  { key: 'invert',     label: 'Invert',     min: 0,   max: 100, step: 1,   default: 0,   unit: '%',   format: v => `invert(${v}%)`,       accent: '#818cf8' },
]

const FILTER_GROUPS: { label: string; keys: FilterKey[] }[] = [
  { label: 'Light',  keys: ['brightness', 'contrast', 'opacity'] },
  { label: 'Color',  keys: ['saturate', 'hue-rotate', 'grayscale', 'sepia'] },
  { label: 'Effect', keys: ['blur', 'invert'] },
]

const DEFAULTS = Object.fromEntries(FILTERS.map(f => [f.key, f.default])) as Record<FilterKey, number>

function getDef(key: FilterKey): FilterDef {
  return FILTERS.find(f => f.key === key)!
}

function isDefault(key: FilterKey, value: number): boolean {
  return value === DEFAULTS[key]
}

// ── Sample SVG preview ────────────────────────────────────────────────────────

function SamplePreview({ filterCss }: { filterCss: string }) {
  return (
    <div
      className="overflow-hidden rounded-md"
      style={{ filter: filterCss || undefined }}
      aria-label="フィルタープレビュー"
    >
      <svg viewBox="0 0 400 240" xmlns="http://www.w3.org/2000/svg" className="block w-full" aria-hidden="true">
        <defs>
          <linearGradient id="cfg-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1e40af" />
            <stop offset="100%" stopColor="#60a5fa" />
          </linearGradient>
          <linearGradient id="cfg-ground" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#15803d" />
            <stop offset="100%" stopColor="#166534" />
          </linearGradient>
          <radialGradient id="cfg-sun" cx="75%" cy="25%" r="12%">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="100%" stopColor="#facc15" />
          </radialGradient>
        </defs>
        <rect width="400" height="160" fill="url(#cfg-sky)" />
        <circle cx="300" cy="60" r="32" fill="url(#cfg-sun)" />
        <ellipse cx="80"  cy="50" rx="45" ry="18" fill="white" fillOpacity="0.85" />
        <ellipse cx="110" cy="42" rx="30" ry="20" fill="white" fillOpacity="0.9"  />
        <ellipse cx="200" cy="70" rx="35" ry="14" fill="white" fillOpacity="0.75" />
        <ellipse cx="225" cy="63" rx="22" ry="16" fill="white" fillOpacity="0.8"  />
        <rect y="160" width="400" height="80" fill="url(#cfg-ground)" />
        <rect x="48"  y="120" width="8" height="50" fill="#78350f" />
        <rect x="148" y="130" width="6" height="40" fill="#78350f" />
        <rect x="248" y="115" width="8" height="55" fill="#78350f" />
        <circle cx="52"  cy="112" r="24" fill="#16a34a" />
        <circle cx="40"  cy="120" r="18" fill="#15803d" />
        <circle cx="64"  cy="118" r="18" fill="#15803d" />
        <circle cx="151" cy="124" r="18" fill="#16a34a" />
        <circle cx="141" cy="130" r="14" fill="#15803d" />
        <circle cx="161" cy="129" r="14" fill="#15803d" />
        <circle cx="252" cy="107" r="22" fill="#16a34a" />
        <circle cx="240" cy="116" r="17" fill="#15803d" />
        <circle cx="264" cy="115" r="17" fill="#15803d" />
        <ellipse cx="200" cy="220" rx="60" ry="20" fill="#d97706" fillOpacity="0.5" />
        <rect x="185" y="160" width="30" height="60" fill="#d97706" fillOpacity="0.4" />
        {[70, 130, 170, 330, 370].map((x, i) => (
          <g key={i}>
            <circle cx={x} cy={185 + (i % 3) * 6} r="4" fill={(['#f43f5e','#f97316','#facc15','#a78bfa','#34d399'] as const)[i]} />
            <circle cx={x} cy={185 + (i % 3) * 6} r="2" fill="white" />
          </g>
        ))}
      </svg>
    </div>
  )
}

// ── Slider row — bidirectional fill from default position ─────────────────────

function SliderRow({ def, value, onChange }: {
  def: FilterDef
  value: number
  onChange: (v: number) => void
}) {
  const modified = !isDefault(def.key, value)
  const range = def.max - def.min
  const defaultPct = ((def.default - def.min) / range) * 100
  const valuePct   = ((value   - def.min) / range) * 100
  const fillLeft  = Math.min(defaultPct, valuePct)
  const fillWidth = Math.abs(valuePct - defaultPct)

  return (
    <div className="grid items-center gap-x-2.5" style={{ gridTemplateColumns: '84px 1fr 46px 18px' }}>

      {/* Label + accent bar */}
      <div className="flex items-center gap-2 min-w-0">
        <span
          className="block h-3.5 w-[3px] rounded-full shrink-0 transition-all duration-200"
          style={{
            backgroundColor: modified ? def.accent : 'transparent',
            boxShadow: modified ? `0 0 5px ${def.accent}70` : 'none',
            outline: modified ? 'none' : '1px solid #2e2e2e',
            outlineOffset: '-1px',
          }}
          aria-hidden="true"
        />
        <span
          className="font-mono text-[11px] truncate transition-colors duration-200 select-none"
          style={{ color: modified ? def.accent : '#6b7280' }}
        >
          {def.label}
        </span>
      </div>

      {/* Track + range input */}
      <div
        className="relative flex items-center h-5"
        style={{ '--thumb-accent': modified ? def.accent : '#4b5563' } as React.CSSProperties}
      >
        <div className="absolute inset-x-0 h-px bg-border" aria-hidden="true" />
        {/* Default position tick (only when default is not at an edge) */}
        {defaultPct > 2 && defaultPct < 98 && (
          <div
            className="absolute w-px h-2.5 bg-border"
            style={{ left: `${defaultPct}%`, transform: 'translateX(-50%)' }}
            aria-hidden="true"
          />
        )}
        {/* Delta fill — from default toward current value */}
        {modified && fillWidth > 0 && (
          <div
            className="absolute h-[3px] rounded-full pointer-events-none"
            style={{
              left: `${fillLeft}%`,
              width: `${fillWidth}%`,
              backgroundColor: def.accent,
              boxShadow: `0 0 4px ${def.accent}60`,
            }}
            aria-hidden="true"
          />
        )}
        <input
          type="range"
          min={def.min}
          max={def.max}
          step={def.step}
          value={value}
          onChange={e => onChange(Number(e.target.value))}
          aria-label={`${def.label} (${def.min}〜${def.max}${def.unit})`}
          className="relative w-full cursor-pointer appearance-none bg-transparent [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[var(--thumb-accent)] [&::-webkit-slider-thumb]:transition-colors [&::-webkit-slider-thumb]:duration-200"
        />
      </div>

      {/* Number input */}
      <input
        type="number"
        min={def.min}
        max={def.max}
        step={def.step}
        value={value}
        onChange={e => {
          const n = Number(e.target.value)
          if (!isNaN(n) && n >= def.min && n <= def.max) onChange(n)
        }}
        aria-label={`${def.label} 数値入力`}
        className="w-full rounded border border-border bg-bg px-1 py-0.5 text-right font-mono text-[10px] text-bright outline-none focus:border-teal/40 transition-colors tabular-nums"
      />

      {/* Unit */}
      <span className="font-mono text-[9px] text-muted leading-none">{def.unit}</span>
    </div>
  )
}

// ── Syntax-highlighted CSS output ─────────────────────────────────────────────

function CssOutputContent({ values }: { values: Record<FilterKey, number> }) {
  const active = FILTERS.filter(f => !isDefault(f.key, values[f.key]))
  if (active.length === 0) {
    return <span className="text-muted italic">{'/* デフォルト値 */'}</span>
  }
  return (
    <>
      <span className="text-dim">{'filter: '}</span>
      {active.map((f, i) => (
        <span key={f.key}>
          <span style={{ color: f.accent }}>{f.format(values[f.key])}</span>
          {i < active.length - 1 && <span className="text-muted">{' '}</span>}
        </span>
      ))}
      <span className="text-dim">{';'}</span>
    </>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function CssFilterGenerator() {
  const [values, setValues] = useState<Record<FilterKey, number>>({ ...DEFAULTS })
  const [copied, setCopied] = useState(false)

  const update = useCallback((key: FilterKey, value: number) => {
    setValues(prev => ({ ...prev, [key]: value }))
  }, [])

  const reset = useCallback(() => setValues({ ...DEFAULTS }), [])

  const filterCss = useMemo(() => {
    return FILTERS
      .filter(f => !isDefault(f.key, values[f.key]))
      .map(f => f.format(values[f.key]))
      .join(' ')
  }, [values])

  const activeCount = FILTERS.filter(f => !isDefault(f.key, values[f.key])).length
  const hasChanges = activeCount > 0

  const copy = useCallback(async () => {
    if (!filterCss) return
    const text = `filter: ${filterCss};`
    try { await navigator.clipboard.writeText(text) }
    catch {
      const el = document.createElement('textarea')
      el.value = text
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [filterCss])

  return (
    <div className="space-y-4">

      {/* ── Slider panel (3 groups) ── */}
      <div className="overflow-hidden rounded-lg border border-border">
        {FILTER_GROUPS.map((group, gi) => (
          <div key={group.label} className={gi > 0 ? 'border-t border-border' : ''}>
            {/* Group header */}
            <div className="flex items-center gap-2.5 px-4 py-2 bg-surface">
              <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted">{group.label}</span>
              {/* Active dots for this group */}
              <div className="flex gap-1" aria-hidden="true">
                {group.keys.map(k => {
                  const mod = !isDefault(k, values[k])
                  return mod ? (
                    <span
                      key={k}
                      className="h-1 w-1 rounded-full"
                      style={{ backgroundColor: getDef(k).accent }}
                    />
                  ) : null
                })}
              </div>
            </div>
            {/* Sliders */}
            <div className="px-4 py-3 space-y-3">
              {group.keys.map(k => (
                <SliderRow
                  key={k}
                  def={getDef(k)}
                  value={values[k]}
                  onChange={v => update(k, v)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* ── Preview + CSS output ── */}
      <div className="grid gap-4 lg:grid-cols-2">

        {/* Preview */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <p className="font-mono text-[9px] uppercase tracking-widest text-muted">Preview</p>
            {hasChanges && (
              <p className="font-mono text-[9px] text-muted">
                <span className="text-teal">{activeCount}</span> filter{activeCount > 1 ? 's' : ''} active
              </p>
            )}
          </div>
          <SamplePreview filterCss={filterCss} />
        </div>

        {/* CSS output */}
        <div className="space-y-1.5">
          <p className="font-mono text-[9px] uppercase tracking-widest text-muted">CSS Output</p>
          <pre
            className="min-h-[80px] rounded-lg border border-border bg-bg px-4 py-3 font-mono text-xs leading-relaxed overflow-x-auto"
            aria-label="生成された CSS"
          >
            <code><CssOutputContent values={values} /></code>
          </pre>

          {/* Active filter badges */}
          {hasChanges && (
            <div className="flex flex-wrap gap-1.5" aria-label="適用中のフィルター">
              {FILTERS.filter(f => !isDefault(f.key, values[f.key])).map(f => (
                <span
                  key={f.key}
                  className="inline-flex items-center rounded px-1.5 py-0.5 font-mono text-[9px]"
                  style={{
                    color: f.accent,
                    backgroundColor: `${f.accent}14`,
                    border: `1px solid ${f.accent}30`,
                  }}
                >
                  {f.label}
                </span>
              ))}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2 pt-0.5">
            <button
              type="button"
              onClick={copy}
              disabled={!hasChanges}
              aria-label="CSS をクリップボードにコピー"
              className={`flex-1 rounded-md py-2 font-mono text-xs font-medium transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-35 ${
                copied
                  ? 'bg-teal/20 border border-teal/40 text-teal'
                  : hasChanges
                  ? 'bg-teal text-bg hover:opacity-85 active:opacity-70'
                  : 'border border-border text-muted'
              }`}
            >
              {copied ? '✓ Copied' : 'Copy CSS'}
            </button>
            <button
              type="button"
              onClick={reset}
              disabled={!hasChanges}
              aria-label="全フィルターをリセット"
              className="rounded-md border border-border px-4 py-2 font-mono text-xs text-muted transition-colors hover:text-dim disabled:opacity-35 disabled:cursor-not-allowed"
            >
              Reset
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
