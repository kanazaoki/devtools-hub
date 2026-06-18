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
  // 小数点以下は最大6桁、末尾ゼロ除去
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
    <div className="space-y-6">
      {/* ── Input row ── */}
      <div className="flex items-end gap-3">
        <div className="flex-1 space-y-1.5">
          <label className="font-mono text-[10px] uppercase tracking-widest text-muted">
            値
          </label>
          <input
            type="text"
            inputMode="decimal"
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            placeholder="16"
            className="w-full rounded border border-border bg-bg px-3 py-2 font-mono text-sm text-primary outline-none transition-colors placeholder:text-muted/30 focus:border-border-hi"
            aria-label="変換する値"
          />
        </div>
        <div className="space-y-1.5">
          <label className="font-mono text-[10px] uppercase tracking-widest text-muted">
            単位
          </label>
          <select
            value={inputUnit}
            onChange={e => setInputUnit(e.target.value as Unit)}
            className="rounded border border-border bg-bg px-3 py-2 font-mono text-sm text-primary outline-none transition-colors focus:border-border-hi"
            aria-label="入力単位"
          >
            {UNITS.map(u => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Settings ── */}
      <div className="rounded border border-border bg-surface p-4">
        <p className="mb-3 font-mono text-[9px] uppercase tracking-widest text-muted">設定</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="space-y-1">
            <label className="font-mono text-[10px] text-muted/70">
              ベースフォントサイズ (px)
            </label>
            <input
              type="number"
              min="1"
              step="1"
              value={basePxStr}
              onChange={e => handleBasePx(e.target.value)}
              className="w-full rounded border border-border bg-bg px-2 py-1.5 font-mono text-sm text-primary outline-none transition-colors focus:border-border-hi"
              aria-label="ベースフォントサイズ"
            />
          </div>
          <div className="space-y-1">
            <label className="font-mono text-[10px] text-muted/70">
              ビューポート幅 (px)
            </label>
            <input
              type="number"
              min="1"
              step="1"
              value={vpWStr}
              onChange={e => handleVpW(e.target.value)}
              className="w-full rounded border border-border bg-bg px-2 py-1.5 font-mono text-sm text-primary outline-none transition-colors focus:border-border-hi"
              aria-label="ビューポート幅"
            />
          </div>
          <div className="space-y-1">
            <label className="font-mono text-[10px] text-muted/70">
              ビューポート高 (px)
            </label>
            <input
              type="number"
              min="1"
              step="1"
              value={vpHStr}
              onChange={e => handleVpH(e.target.value)}
              className="w-full rounded border border-border bg-bg px-2 py-1.5 font-mono text-sm text-primary outline-none transition-colors focus:border-border-hi"
              aria-label="ビューポート高"
            />
          </div>
        </div>
      </div>

      {/* ── Results ── */}
      <div className="overflow-hidden rounded border border-border">
        {UNITS.map((unit, i) => {
          const row = results?.find(r => r.unit === unit)
          const value = row?.value ?? '—'
          const isFrom = unit === inputUnit
          const isCopied = copiedUnit === unit
          return (
            <div
              key={unit}
              className={`group flex items-center gap-3 border-l-2 px-4 py-2.5 transition-colors ${
                isFrom
                  ? 'border-l-teal/50 bg-white/[0.03]'
                  : 'border-l-transparent hover:border-l-teal/20 hover:bg-white/[0.02]'
              } ${i < UNITS.length - 1 ? 'border-b border-border' : ''}`}
            >
              <span
                className={`w-10 shrink-0 font-mono text-xs font-semibold ${
                  isFrom ? 'text-teal' : 'text-muted/50'
                }`}
              >
                {unit}
              </span>
              <span
                className={`flex-1 font-mono text-sm ${
                  value === '—' ? 'text-muted/30' : isFrom ? 'text-teal' : 'text-bright'
                }`}
              >
                {value}
              </span>
              <button
                onClick={() => copyUnit(unit, value)}
                disabled={value === '—'}
                className={`shrink-0 rounded border px-2.5 py-1 font-mono text-[10px] transition-all duration-100 ${
                  value === '—'
                    ? 'cursor-not-allowed opacity-0'
                    : isCopied
                    ? 'border-teal/50 bg-teal/8 text-teal opacity-100'
                    : 'border-border text-muted opacity-0 hover:border-border-hi hover:text-dim group-hover:opacity-100'
                }`}
              >
                {isCopied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          )
        })}
      </div>

      {!results && (
        <p className="text-center font-mono text-[11px] text-muted/40">
          値を入力すると変換結果が表示されます
        </p>
      )}
    </div>
  )
}
