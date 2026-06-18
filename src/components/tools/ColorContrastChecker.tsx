'use client'

import { useState, useCallback, useMemo, useRef } from 'react'

// ── WCAG contrast engine ───────────────────────────────────────────────────────

function hexToRgb(hex: string): [number, number, number] | null {
  const clean = hex.replace('#', '')
  if (clean.length !== 3 && clean.length !== 6) return null
  const full = clean.length === 3
    ? clean.split('').map(c => c + c).join('')
    : clean
  const n = parseInt(full, 16)
  if (isNaN(n)) return null
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function relativeLuminance(r: number, g: number, b: number): number {
  const lin = (v: number) => {
    const s = v / 255
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  }
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}

function contrastRatio(fg: string, bg: string): number | null {
  const fgRgb = hexToRgb(fg)
  const bgRgb = hexToRgb(bg)
  if (!fgRgb || !bgRgb) return null
  const L1 = relativeLuminance(...fgRgb)
  const L2 = relativeLuminance(...bgRgb)
  return (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05)
}

// ── WCAG thresholds ───────────────────────────────────────────────────────────

const WCAG_LEVELS = [
  { id: 'aa-normal',  level: 'AA',  sublabel: '通常',  threshold: 4.5 },
  { id: 'aa-large',   level: 'AA',  sublabel: '大文字', threshold: 3.0 },
  { id: 'aaa-normal', level: 'AAA', sublabel: '通常',  threshold: 7.0 },
  { id: 'aaa-large',  level: 'AAA', sublabel: '大文字', threshold: 4.5 },
] as const

// ── Helpers ───────────────────────────────────────────────────────────────────

function isValidHex(hex: string): boolean {
  return /^#?([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(hex)
}

function normalizeHex(hex: string): string {
  const clean = hex.startsWith('#') ? hex : `#${hex}`
  if (clean.length === 4) {
    return `#${clean[1]}${clean[1]}${clean[2]}${clean[2]}${clean[3]}${clean[3]}`
  }
  return clean.toLowerCase()
}

function getRatioBarColor(ratio: number): string {
  if (ratio < 3) return '#f87171'       // red-400
  if (ratio < 4.5) return '#fb923c'     // orange-400
  if (ratio < 7) return '#2dd4bf'       // teal-400
  return '#a3e635'                       // lime-400
}

function getRatioLabel(ratio: number): string {
  if (ratio >= 7) return 'AAA'
  if (ratio >= 4.5) return 'AA'
  if (ratio >= 3) return 'AA Large'
  return 'Fail'
}

// ── Component ─────────────────────────────────────────────────────────────────

const DEFAULT_FG = '#1a1a1a'
const DEFAULT_BG = '#ffffff'

export function ColorContrastChecker() {
  const [fg, setFg] = useState(DEFAULT_FG)
  const [bg, setBg] = useState(DEFAULT_BG)
  const [fgInput, setFgInput] = useState(DEFAULT_FG)
  const [bgInput, setBgInput] = useState(DEFAULT_BG)

  const fgPickerRef = useRef<HTMLInputElement>(null)
  const bgPickerRef = useRef<HTMLInputElement>(null)

  const ratio = useMemo(() => contrastRatio(fg, bg), [fg, bg])

  const handleFgPicker = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setFg(val)
    setFgInput(val)
  }, [])

  const handleBgPicker = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setBg(val)
    setBgInput(val)
  }, [])

  const handleFgText = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setFgInput(val)
    if (isValidHex(val)) setFg(normalizeHex(val))
  }, [])

  const handleBgText = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setBgInput(val)
    if (isValidHex(val)) setBg(normalizeHex(val))
  }, [])

  const handleSwap = useCallback(() => {
    setFg(bg); setBg(fg)
    setFgInput(bg); setBgInput(fg)
  }, [fg, bg])

  const resolvedFg = isValidHex(fgInput) ? normalizeHex(fgInput) : fg
  const resolvedBg = isValidHex(bgInput) ? normalizeHex(bgInput) : bg

  const ratioStr = ratio !== null ? ratio.toFixed(2) : '—'
  const barWidth = ratio !== null ? Math.min(ratio / 21, 1) * 100 : 0
  const barColor = ratio !== null ? getRatioBarColor(ratio) : '#555'
  const ratioLabel = ratio !== null ? getRatioLabel(ratio) : '—'

  return (
    <div className="space-y-5">

      {/* ── Split swatch + pickers ── */}
      <div className="overflow-hidden rounded border border-border">

        {/* Large split color display */}
        <div className="relative flex h-24" style={{ cursor: 'default' }}>
          {/* Background half */}
          <button
            type="button"
            onClick={() => bgPickerRef.current?.click()}
            className="group relative flex-1 transition-opacity hover:opacity-90"
            style={{ backgroundColor: resolvedBg }}
            aria-label="背景色を変更"
          >
            <span
              className="absolute bottom-2 left-3 font-mono text-[9px] uppercase tracking-widest opacity-50 transition-opacity group-hover:opacity-80"
              style={{ color: resolvedFg, mixBlendMode: 'difference', filter: 'invert(1)' }}
            >
              BG
            </span>
          </button>

          {/* Center divider + ratio badge */}
          <div className="relative z-10 flex w-0 items-center justify-center">
            <div
              className="absolute flex flex-col items-center justify-center rounded border border-border/60 px-2.5 py-1 backdrop-blur-sm"
              style={{ backgroundColor: 'rgba(10,10,10,0.75)', minWidth: '56px' }}
            >
              <span className="font-mono text-[8px] uppercase tracking-wider text-muted/70">ratio</span>
              <span className="font-mono text-base font-bold tabular-nums leading-none text-bright">{ratioStr}</span>
              <span className="font-mono text-[8px] text-muted/50">:1</span>
            </div>
          </div>

          {/* Foreground half */}
          <button
            type="button"
            onClick={() => fgPickerRef.current?.click()}
            className="group relative flex-1 transition-opacity hover:opacity-90"
            style={{ backgroundColor: resolvedFg }}
            aria-label="前景色を変更"
          >
            <span
              className="absolute bottom-2 right-3 font-mono text-[9px] uppercase tracking-widest opacity-50 transition-opacity group-hover:opacity-80"
              style={{ color: resolvedBg, mixBlendMode: 'difference', filter: 'invert(1)' }}
            >
              FG
            </span>
          </button>
        </div>

        {/* Input row */}
        <div className="grid grid-cols-2 divide-x divide-border border-t border-border">
          {/* BG input */}
          <div className="flex items-center gap-2 px-3 py-2">
            <input
              ref={bgPickerRef}
              type="color"
              value={bg}
              onChange={handleBgPicker}
              className="sr-only"
              aria-label="背景色ピッカー"
            />
            <span className="font-mono text-[9px] text-muted/50">BG</span>
            <input
              type="text"
              value={bgInput}
              onChange={handleBgText}
              spellCheck={false}
              maxLength={7}
              placeholder="#ffffff"
              className="flex-1 bg-transparent font-mono text-[13px] text-primary outline-none placeholder:text-muted/30"
              aria-label="背景色HEX入力"
            />
          </div>

          {/* FG input */}
          <div className="flex items-center gap-2 px-3 py-2">
            <span className="font-mono text-[9px] text-muted/50">FG</span>
            <input
              type="text"
              value={fgInput}
              onChange={handleFgText}
              spellCheck={false}
              maxLength={7}
              placeholder="#1a1a1a"
              className="flex-1 bg-transparent font-mono text-[13px] text-primary outline-none placeholder:text-muted/30"
              aria-label="前景色HEX入力"
            />
            <input
              ref={fgPickerRef}
              type="color"
              value={fg}
              onChange={handleFgPicker}
              className="sr-only"
              aria-label="前景色ピッカー"
            />
          </div>
        </div>
      </div>

      {/* ── Ratio meter bar ── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[9px] uppercase tracking-widest text-muted">Contrast Ratio</span>
          <span className="font-mono text-[9px] tabular-nums" style={{ color: barColor }}>{ratioLabel}</span>
        </div>
        <div className="relative h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{ width: `${barWidth}%`, backgroundColor: barColor }}
          />
          {/* Threshold ticks */}
          {[3, 4.5, 7].map(t => (
            <div
              key={t}
              className="absolute top-0 h-full w-px bg-white/20"
              style={{ left: `${(t / 21) * 100}%` }}
            />
          ))}
        </div>
        <div className="flex justify-between font-mono text-[8px] tabular-nums text-muted/30">
          <span>0</span>
          <span style={{ marginLeft: `${(3 / 21) * 100}%` }}>3</span>
          <span>4.5</span>
          <span>7</span>
          <span>21</span>
        </div>
      </div>

      {/* ── Swap ── */}
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <button
          onClick={handleSwap}
          className="rounded border border-border px-3 py-1 font-mono text-[10px] text-muted/60 transition-colors hover:border-border-hi hover:text-muted"
          aria-label="前景色と背景色を入れ替え"
        >
          ⇅ swap
        </button>
        <div className="h-px flex-1 bg-border" />
      </div>

      {/* ── WCAG strip ── */}
      <div className="overflow-hidden rounded border border-border">
        <div className="border-b border-border px-4 py-2">
          <span className="font-mono text-[9px] uppercase tracking-widest text-muted">WCAG 2.1</span>
        </div>
        <div className="divide-y divide-border/50">
          {WCAG_LEVELS.map(({ id, level, sublabel, threshold }) => {
            const pass = ratio !== null && ratio >= threshold
            return (
              <div key={id} className="flex items-center gap-4 px-4 py-2.5">
                <span className={`w-10 font-mono text-xs font-semibold ${pass ? 'text-teal' : 'text-muted/40'}`}>
                  {level}
                </span>
                <span className="flex-1 font-mono text-[11px] text-muted/60">{sublabel}</span>
                <span className="font-mono text-[9px] tabular-nums text-muted/40">{threshold}:1</span>
                <span className={`w-14 text-right font-mono text-[10px] font-semibold ${pass ? 'text-teal' : 'text-red-400/70'}`}>
                  {pass ? '✓ PASS' : '✗ FAIL'}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Preview ── */}
      <div className="space-y-2">
        <span className="font-mono text-[9px] uppercase tracking-widest text-muted">Preview</span>
        <div
          className="rounded border border-border/50 p-5"
          style={{ backgroundColor: resolvedBg }}
        >
          <p className="text-2xl font-bold leading-tight" style={{ color: resolvedFg }}>
            大テキスト — Large Text
          </p>
          <p className="mt-3 text-base leading-relaxed" style={{ color: resolvedFg }}>
            通常テキスト — The quick brown fox jumps over the lazy dog.
          </p>
          <p className="mt-1.5 text-sm leading-relaxed" style={{ color: resolvedFg }}>
            小テキスト — アクセシビリティ対応の UI を作るために、コントラスト比を確認しましょう。
          </p>
        </div>
      </div>
    </div>
  )
}
