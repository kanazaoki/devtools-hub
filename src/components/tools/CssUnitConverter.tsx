'use client'

import { useState, useCallback, useMemo } from 'react'

// ── Conversion engine ──────────────────────────────────────────────────────────

const UNITS = ['px', 'rem', 'em', 'vw', 'vh', 'pt', 'cm', 'mm'] as const
type Unit = (typeof UNITS)[number]

function toPx(value: number, unit: Unit, basePx: number, vpW: number, vpH: number): number {
  switch (unit) {
    case 'px':  return value
    case 'rem': return value * basePx
    case 'em':  return value * basePx
    case 'vw':  return value * vpW / 100
    case 'vh':  return value * vpH / 100
    case 'pt':  return value * 96 / 72
    case 'cm':  return value * 96 / 2.54
    case 'mm':  return value * 96 / 25.4
  }
}

function fromPx(px: number, unit: Unit, basePx: number, vpW: number, vpH: number): number {
  switch (unit) {
    case 'px':  return px
    case 'rem': return px / basePx
    case 'em':  return px / basePx
    case 'vw':  return px / vpW * 100
    case 'vh':  return px / vpH * 100
    case 'pt':  return px * 72 / 96
    case 'cm':  return px * 2.54 / 96
    case 'mm':  return px * 25.4 / 96
  }
}

function formatResult(n: number): string {
  if (!isFinite(n)) return '—'
  return parseFloat(n.toPrecision(7)).toString()
}

// ── Component ─────────────────────────────────────────────────────────────────

const DEFAULT_BASE = 16
const DEFAULT_VPW  = 1440
const DEFAULT_VPH  = 900

export function CssUnitConverter() {
  const [inputValue, setInputValue] = useState('16')
  const [inputUnit, setInputUnit]   = useState<Unit>('px')
  const [basePx,    setBasePx]      = useState(DEFAULT_BASE)
  const [basePxStr, setBasePxStr]   = useState(String(DEFAULT_BASE))
  const [vpW,       setVpW]         = useState(DEFAULT_VPW)
  const [vpWStr,    setVpWStr]      = useState(String(DEFAULT_VPW))
  const [vpH,       setVpH]         = useState(DEFAULT_VPH)
  const [vpHStr,    setVpHStr]      = useState(String(DEFAULT_VPH))
  const [copiedUnit, setCopiedUnit] = useState<string | null>(null)

  const results = useMemo(() => {
    const num = parseFloat(inputValue)
    if (inputValue.trim() === '' || isNaN(num)) return null
    const px = toPx(num, inputUnit, basePx, vpW, vpH)
    return UNITS.map(u => ({
      unit: u,
      value: formatResult(fromPx(px, u, basePx, vpW, vpH)),
    }))
  }, [inputValue, inputUnit, basePx, vpW, vpH])

  const handleBasePx = useCallback((v: string) => {
    setBasePxStr(v)
    const n = parseFloat(v)
    if (!isNaN(n) && n > 0) setBasePx(n)
  }, [])

  const handleVpW = useCallback((v: string) => {
    setVpWStr(v)
    const n = parseFloat(v)
    if (!isNaN(n) && n > 0) setVpW(n)
  }, [])

  const handleVpH = useCallback((v: string) => {
    setVpHStr(v)
    const n = parseFloat(v)
    if (!isNaN(n) && n > 0) setVpH(n)
  }, [])

  const copyUnit = useCallback(async (unit: string, value: string) => {
    if (value === '—') return
    await navigator.clipboard.writeText(value)
    setCopiedUnit(unit)
    setTimeout(() => setCopiedUnit(null), 1500)
  }, [])

  return (
    <div className="space-y-5">

      {/* ── Value input ── */}
      <div>
        <label
          htmlFor="cuc-value"
          className="mb-1.5 block font-mono text-[9px] uppercase tracking-widest text-muted/60"
        >
          値
        </label>
        <input
          id="cuc-value"
          type="text"
          inputMode="decimal"
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          placeholder="16"
          aria-label="変換する値"
          className="w-full rounded border border-border bg-bg px-4 py-3 font-mono text-2xl text-bright outline-none transition-colors placeholder:text-muted/20 focus:border-teal/40"
        />
      </div>

      {/* ── Unit segmented control ── */}
      <div
        role="group"
        aria-label="入力単位"
        className="flex flex-wrap gap-1.5"
      >
        {UNITS.map(u => (
          <button
            key={u}
            type="button"
            onClick={() => setInputUnit(u)}
            aria-pressed={u === inputUnit}
            className={`rounded px-3.5 py-1.5 font-mono text-xs font-medium transition-all duration-100 ${
              u === inputUnit
                ? 'bg-teal text-bg shadow-sm'
                : 'border border-border text-muted hover:border-teal/30 hover:text-dim'
            }`}
          >
            {u}
          </button>
        ))}
      </div>

      {/* ── Settings (inline) ── */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-y border-border/50 py-2.5">
        <span className="font-mono text-[9px] uppercase tracking-widest text-muted/40 shrink-0">
          設定
        </span>

        <label className="flex items-baseline gap-1">
          <span className="font-mono text-[10px] text-muted/50">base</span>
          <input
            type="number"
            min="1"
            step="1"
            value={basePxStr}
            onChange={e => handleBasePx(e.target.value)}
            aria-label="ベースフォントサイズ"
            className="w-12 border-b border-border bg-transparent pb-0.5 text-center font-mono text-xs text-dim outline-none transition-colors focus:border-teal/50"
          />
          <span className="font-mono text-[10px] text-muted/40">px</span>
        </label>

        <span className="text-border/50 select-none" aria-hidden="true">·</span>

        <label className="flex items-baseline gap-1">
          <span className="font-mono text-[10px] text-muted/50">vw</span>
          <input
            type="number"
            min="1"
            step="1"
            value={vpWStr}
            onChange={e => handleVpW(e.target.value)}
            aria-label="ビューポート幅"
            className="w-14 border-b border-border bg-transparent pb-0.5 text-center font-mono text-xs text-dim outline-none transition-colors focus:border-teal/50"
          />
          <span className="font-mono text-[10px] text-muted/40">px</span>
        </label>

        <span className="text-border/50 select-none" aria-hidden="true">·</span>

        <label className="flex items-baseline gap-1">
          <span className="font-mono text-[10px] text-muted/50">vh</span>
          <input
            type="number"
            min="1"
            step="1"
            value={vpHStr}
            onChange={e => handleVpH(e.target.value)}
            aria-label="ビューポート高"
            className="w-14 border-b border-border bg-transparent pb-0.5 text-center font-mono text-xs text-dim outline-none transition-colors focus:border-teal/50"
          />
          <span className="font-mono text-[10px] text-muted/40">px</span>
        </label>
      </div>

      {/* ── Results grid ── */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {UNITS.map(unit => {
          const row = results?.find(r => r.unit === unit)
          const value = row?.value ?? '—'
          const isFrom = unit === inputUnit
          const isCopied = copiedUnit === unit

          return (
            <div
              key={unit}
              className={`group relative overflow-hidden rounded border p-3 transition-colors ${
                isFrom
                  ? 'border-teal/35 bg-teal/[0.04]'
                  : 'border-border bg-surface hover:border-border-hi'
              }`}
            >
              {/* unit label + input badge */}
              <div className="mb-2 flex items-center justify-between gap-1">
                <span
                  className={`font-mono text-[9px] font-bold uppercase tracking-widest ${
                    isFrom ? 'text-teal' : 'text-muted/40'
                  }`}
                >
                  {unit}
                </span>
                {isFrom && (
                  <span className="rounded-sm bg-teal/10 px-1 font-mono text-[7px] uppercase tracking-wider text-teal/70">
                    in
                  </span>
                )}
              </div>

              {/* value */}
              <p
                className={`break-all font-mono text-sm leading-snug ${
                  value === '—'
                    ? 'text-muted/20'
                    : isFrom
                    ? 'text-teal'
                    : 'text-bright'
                }`}
              >
                {value}
              </p>

              {/* copy button */}
              <button
                type="button"
                onClick={() => copyUnit(unit, value)}
                disabled={value === '—'}
                className={`absolute bottom-2 right-2 rounded px-1.5 py-0.5 font-mono text-[8px] transition-all duration-100 ${
                  value === '—'
                    ? 'pointer-events-none opacity-0'
                    : isCopied
                    ? 'bg-teal/10 text-teal opacity-100'
                    : 'text-muted/50 opacity-0 hover:text-dim group-hover:opacity-100'
                }`}
                aria-label={`${unit} の値をコピー`}
              >
                {isCopied ? '✓ copied' : 'copy'}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
