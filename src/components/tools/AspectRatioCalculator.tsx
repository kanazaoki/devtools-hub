'use client'

import { useState, useMemo, useCallback } from 'react'

// ── Math engine ───────────────────────────────────────────────────────────────

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b)
}

function simplifyRatio(w: number, h: number): { rw: number; rh: number } {
  const g = gcd(Math.round(w), Math.round(h))
  return { rw: Math.round(w) / g, rh: Math.round(h) / g }
}

function formatDim(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(2)
}

// ── Presets ───────────────────────────────────────────────────────────────────

const PRESETS = [
  { label: '16:9',  rw: 16, rh: 9,  note: 'HD / 4K' },
  { label: '4:3',   rw: 4,  rh: 3,  note: 'SD / iPad' },
  { label: '1:1',   rw: 1,  rh: 1,  note: 'Square' },
  { label: '9:16',  rw: 9,  rh: 16, note: 'Portrait' },
  { label: '21:9',  rw: 21, rh: 9,  note: 'Ultrawide' },
  { label: '3:2',   rw: 3,  rh: 2,  note: 'DSLR / APS-C' },
  { label: '2:1',   rw: 2,  rh: 1,  note: 'Univisium' },
  { label: '5:4',   rw: 5,  rh: 4,  note: 'Classic' },
] as const

type Mode = 'forward' | 'reverse'
type ReverseFixed = 'width' | 'height'

// ── Live ratio shape visual ───────────────────────────────────────────────────

function RatioShape({ rw, rh }: { rw: number; rh: number }) {
  const MAX_W = 100
  const MAX_H = 64
  const aspect = rw / rh
  let w: number, h: number
  if (aspect >= MAX_W / MAX_H) {
    w = MAX_W
    h = MAX_W / aspect
  } else {
    h = MAX_H
    w = MAX_H * aspect
  }
  return (
    <div
      className="relative flex items-center justify-center shrink-0"
      style={{ width: MAX_W, height: MAX_H }}
      aria-hidden="true"
    >
      <div
        className="border border-teal/50 bg-teal/[0.06] transition-all duration-300 ease-out"
        style={{ width: Math.round(w), height: Math.round(h) }}
      >
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div
            className="border-t border-teal/20 w-full"
            style={{ position: 'absolute', top: '50%' }}
          />
          <div
            className="border-l border-teal/20 h-full"
            style={{ position: 'absolute', left: '50%' }}
          />
        </div>
      </div>
    </div>
  )
}

// ── Numeric input ─────────────────────────────────────────────────────────────

function NumInput({
  value,
  onChange,
  ariaLabel,
  placeholder,
  className = '',
}: {
  value: string
  onChange: (v: string) => void
  ariaLabel: string
  placeholder?: string
  className?: string
}) {
  return (
    <input
      type="number"
      min="1"
      step="1"
      value={value}
      onChange={e => onChange(e.target.value)}
      aria-label={ariaLabel}
      placeholder={placeholder}
      className={`rounded border border-border bg-bg px-3 py-2 font-mono text-base text-bright outline-none transition-colors placeholder:text-muted/20 focus:border-teal/50 ${className}`}
    />
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function AspectRatioCalculator() {
  const [mode, setMode]           = useState<Mode>('forward')
  const [widthStr, setWidthStr]   = useState('1920')
  const [heightStr, setHeightStr] = useState('1080')
  const [ratioWStr, setRatioWStr] = useState('16')
  const [ratioHStr, setRatioHStr] = useState('9')
  const [revFixed, setRevFixed]   = useState<ReverseFixed>('width')
  const [revDimStr, setRevDimStr] = useState('1920')

  const forwardResult = useMemo(() => {
    const w = parseFloat(widthStr)
    const h = parseFloat(heightStr)
    if (!widthStr.trim() || !heightStr.trim() || isNaN(w) || isNaN(h) || w <= 0 || h <= 0) return null
    return simplifyRatio(w, h)
  }, [widthStr, heightStr])

  const reverseResult = useMemo(() => {
    const rw  = parseFloat(ratioWStr)
    const rh  = parseFloat(ratioHStr)
    const dim = parseFloat(revDimStr)
    if (
      !ratioWStr.trim() || !ratioHStr.trim() || !revDimStr.trim() ||
      isNaN(rw) || isNaN(rh) || isNaN(dim) ||
      rw <= 0 || rh <= 0 || dim <= 0
    ) return null
    if (revFixed === 'width') return { width: dim, height: (dim * rh) / rw }
    return { width: (dim * rw) / rh, height: dim }
  }, [ratioWStr, ratioHStr, revDimStr, revFixed])

  const visualRatio = useMemo(() => {
    if (mode === 'forward') return forwardResult
    const rw = parseFloat(ratioWStr)
    const rh = parseFloat(ratioHStr)
    if (!isNaN(rw) && !isNaN(rh) && rw > 0 && rh > 0) return { rw, rh }
    return null
  }, [mode, forwardResult, ratioWStr, ratioHStr])

  const applyPreset = useCallback((rw: number, rh: number) => {
    setRatioWStr(String(rw))
    setRatioHStr(String(rh))
    if (mode === 'forward') setMode('reverse')
  }, [mode])

  const displayRatio = mode === 'forward'
    ? (forwardResult ? `${forwardResult.rw}:${forwardResult.rh}` : '—')
    : (parseFloat(ratioWStr) > 0 && parseFloat(ratioHStr) > 0 ? `${ratioWStr}:${ratioHStr}` : '—')

  return (
    <div className="space-y-5">

      {/* ── Mode toggle (technical notation) ── */}
      <div
        className="inline-flex items-center gap-0.5 rounded border border-border bg-bg p-0.5"
        role="group"
        aria-label="計算モード"
      >
        {(['forward', 'reverse'] as const).map(m => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            aria-pressed={mode === m}
            className={`rounded px-3.5 py-1 font-mono text-[10px] font-medium tracking-wide transition-all duration-100 ${
              mode === m
                ? 'bg-surface border border-border/80 text-dim'
                : 'text-muted/40 hover:text-muted/70'
            }`}
          >
            {m === 'forward' ? 'W × H → ratio' : 'ratio + dim → dim'}
          </button>
        ))}
      </div>

      {/* ── Result header ── */}
      <div className="flex items-center gap-5 rounded border border-border bg-surface px-5 py-4">
        {visualRatio
          ? <RatioShape rw={visualRatio.rw} rh={visualRatio.rh} />
          : (
            <div className="shrink-0 flex items-center justify-center border border-dashed border-border/30" style={{ width: 100, height: 64 }} aria-hidden="true">
              <span className="font-mono text-[8px] text-muted/20 tracking-widest uppercase">ratio</span>
            </div>
          )
        }
        <div className="min-w-0">
          <p className="font-mono text-[8px] uppercase tracking-[0.2em] text-muted/40 mb-0.5">Aspect Ratio</p>
          <p className="font-mono text-4xl font-bold tracking-tight text-bright leading-none">
            {displayRatio}
          </p>
        </div>
      </div>

      {/* ── Forward mode inputs ── */}
      {mode === 'forward' && (
        <div className="grid grid-cols-2 gap-3">
          <label className="block space-y-1.5">
            <span className="font-mono text-[9px] uppercase tracking-widest text-muted/50">Width</span>
            <NumInput
              value={widthStr}
              onChange={setWidthStr}
              ariaLabel="幅"
              className="w-full"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="font-mono text-[9px] uppercase tracking-widest text-muted/50">Height</span>
            <NumInput
              value={heightStr}
              onChange={setHeightStr}
              ariaLabel="高さ"
              className="w-full"
            />
          </label>
        </div>
      )}

      {/* ── Reverse mode inputs ── */}
      {mode === 'reverse' && (
        <div className="space-y-3">
          {/* Ratio row */}
          <div className="space-y-1.5">
            <span className="font-mono text-[9px] uppercase tracking-widest text-muted/50">Ratio</span>
            <div className="flex items-center gap-2">
              <NumInput value={ratioWStr} onChange={setRatioWStr} ariaLabel="比率 W" className="w-20" />
              <span className="font-mono text-base text-muted/30 select-none">:</span>
              <NumInput value={ratioHStr} onChange={setRatioHStr} ariaLabel="比率 H" className="w-20" />
            </div>
          </div>

          {/* Known dimension row */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[9px] uppercase tracking-widest text-muted/50">Known</span>
              <div className="flex gap-1" role="group" aria-label="固定する寸法">
                {(['width', 'height'] as const).map(f => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setRevFixed(f)}
                    aria-pressed={revFixed === f}
                    className={`rounded px-2.5 py-0.5 font-mono text-[10px] font-medium transition-all ${
                      revFixed === f
                        ? 'bg-teal/12 text-teal border border-teal/35'
                        : 'border border-border/60 text-muted/40 hover:text-muted/70'
                    }`}
                  >
                    {f === 'width' ? 'W' : 'H'}
                  </button>
                ))}
              </div>
            </div>
            <NumInput
              value={revDimStr}
              onChange={setRevDimStr}
              ariaLabel={revFixed === 'width' ? '固定する幅' : '固定する高さ'}
              placeholder={revFixed === 'width' ? 'width…' : 'height…'}
              className="w-full"
            />
          </div>

          {/* Reverse result tiles */}
          <div className="grid grid-cols-2 gap-2">
            {(['width', 'height'] as const).map(dim => {
              const isFixed  = revFixed === dim
              const isOutput = !isFixed
              const val = reverseResult
                ? formatDim(dim === 'width' ? reverseResult.width : reverseResult.height)
                : '—'
              return (
                <div
                  key={dim}
                  className={`rounded border p-3.5 transition-colors ${
                    isOutput
                      ? 'border-teal/30 bg-teal/[0.04]'
                      : 'border-border/50 bg-surface/40'
                  }`}
                >
                  <p className="font-mono text-[8px] uppercase tracking-widest text-muted/40 mb-1">
                    {dim === 'width' ? 'Width' : 'Height'}
                    {isFixed && <span className="ml-1.5 text-muted/25">→ fixed</span>}
                  </p>
                  <p className={`font-mono text-xl font-semibold leading-none ${
                    reverseResult
                      ? (isOutput ? 'text-teal' : 'text-bright/70')
                      : 'text-muted/15'
                  }`}>
                    {val}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Presets ── */}
      <div>
        <p className="mb-2 font-mono text-[8px] uppercase tracking-[0.18em] text-muted/35">Presets</p>
        <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-8">
          {PRESETS.map(p => {
            const isActive = ratioWStr === String(p.rw) && ratioHStr === String(p.rh) && mode === 'reverse'
            return (
              <button
                key={p.label}
                type="button"
                onClick={() => applyPreset(p.rw, p.rh)}
                title={p.note}
                className={`group flex flex-col items-center rounded border py-2.5 px-1 text-center transition-all duration-100 ${
                  isActive
                    ? 'border-teal/40 bg-teal/[0.06] text-teal'
                    : 'border-border/50 text-muted/50 hover:border-border hover:text-muted/80'
                }`}
              >
                <span className="block font-mono text-[10px] font-semibold leading-none">{p.label}</span>
                <span className={`mt-1 block font-mono text-[7px] leading-none transition-colors ${
                  isActive ? 'text-teal/60' : 'text-muted/25 group-hover:text-muted/40'
                }`}>{p.note}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
