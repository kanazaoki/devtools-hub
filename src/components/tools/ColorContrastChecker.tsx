'use client'

import { useState, useCallback, useMemo } from 'react'

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
  const linearize = (v: number) => {
    const s = v / 255
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  }
  return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b)
}

function contrastRatio(fg: string, bg: string): number | null {
  const fgRgb = hexToRgb(fg)
  const bgRgb = hexToRgb(bg)
  if (!fgRgb || !bgRgb) return null
  const L1 = relativeLuminance(...fgRgb)
  const L2 = relativeLuminance(...bgRgb)
  const lighter = Math.max(L1, L2)
  const darker = Math.min(L1, L2)
  return (lighter + 0.05) / (darker + 0.05)
}

// ── WCAG thresholds ───────────────────────────────────────────────────────────

const WCAG_LEVELS = [
  { id: 'aa-normal',  label: 'AA',  sublabel: '通常テキスト', ratio: 4.5 },
  { id: 'aa-large',   label: 'AA',  sublabel: '大テキスト',   ratio: 3.0 },
  { id: 'aaa-normal', label: 'AAA', sublabel: '通常テキスト', ratio: 7.0 },
  { id: 'aaa-large',  label: 'AAA', sublabel: '大テキスト',   ratio: 4.5 },
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

// ── Component ─────────────────────────────────────────────────────────────────

const DEFAULT_FG = '#1a1a1a'
const DEFAULT_BG = '#ffffff'

export function ColorContrastChecker() {
  const [fg, setFg] = useState(DEFAULT_FG)
  const [bg, setBg] = useState(DEFAULT_BG)
  const [fgInput, setFgInput] = useState(DEFAULT_FG)
  const [bgInput, setBgInput] = useState(DEFAULT_BG)

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
    if (isValidHex(val)) {
      setFg(normalizeHex(val))
    }
  }, [])

  const handleBgText = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setBgInput(val)
    if (isValidHex(val)) {
      setBg(normalizeHex(val))
    }
  }, [])

  const handleSwap = useCallback(() => {
    setFg(bg)
    setBg(fg)
    setFgInput(bg)
    setBgInput(fg)
  }, [fg, bg])

  const ratioStr = ratio !== null ? ratio.toFixed(2) : '—'

  return (
    <div className="space-y-6">
      {/* Color inputs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Foreground */}
        <div className="space-y-2">
          <label className="font-mono text-[10px] uppercase tracking-widest text-muted">
            前景色（テキスト）
          </label>
          <div className="flex items-center gap-3 rounded-md border border-border bg-bg px-3 py-2">
            <input
              type="color"
              value={fg}
              onChange={handleFgPicker}
              className="h-8 w-8 cursor-pointer rounded border-0 bg-transparent p-0"
              aria-label="前景色ピッカー"
            />
            <input
              type="text"
              value={fgInput}
              onChange={handleFgText}
              spellCheck={false}
              maxLength={7}
              placeholder="#1a1a1a"
              className="flex-1 bg-transparent font-mono text-sm text-primary outline-none placeholder:text-muted/40"
              aria-label="前景色HEX入力"
            />
            <span
              className="h-6 w-6 rounded border border-border"
              style={{ background: isValidHex(fgInput) ? normalizeHex(fgInput) : '#888' }}
            />
          </div>
        </div>

        {/* Background */}
        <div className="space-y-2">
          <label className="font-mono text-[10px] uppercase tracking-widest text-muted">
            背景色
          </label>
          <div className="flex items-center gap-3 rounded-md border border-border bg-bg px-3 py-2">
            <input
              type="color"
              value={bg}
              onChange={handleBgPicker}
              className="h-8 w-8 cursor-pointer rounded border-0 bg-transparent p-0"
              aria-label="背景色ピッカー"
            />
            <input
              type="text"
              value={bgInput}
              onChange={handleBgText}
              spellCheck={false}
              maxLength={7}
              placeholder="#ffffff"
              className="flex-1 bg-transparent font-mono text-sm text-primary outline-none placeholder:text-muted/40"
              aria-label="背景色HEX入力"
            />
            <span
              className="h-6 w-6 rounded border border-border"
              style={{ background: isValidHex(bgInput) ? normalizeHex(bgInput) : '#888' }}
            />
          </div>
        </div>
      </div>

      {/* Swap button */}
      <div className="flex justify-center">
        <button
          onClick={handleSwap}
          className="rounded border border-border px-4 py-1.5 font-mono text-[10px] text-muted transition-colors hover:border-border-hi hover:text-dim"
          aria-label="前景色と背景色を入れ替え"
        >
          ⇅ 前景↔背景 スワップ
        </button>
      </div>

      {/* Contrast ratio */}
      <div className="rounded-md border border-border bg-surface p-5 text-center">
        <p className="mb-1 font-mono text-[10px] uppercase tracking-widest text-muted">Contrast Ratio</p>
        <p className="font-mono text-5xl font-bold text-bright">{ratioStr}<span className="ml-1 text-2xl text-muted">:1</span></p>
      </div>

      {/* WCAG badges */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {WCAG_LEVELS.map(({ id, label, sublabel, ratio: threshold }) => {
          const pass = ratio !== null && ratio >= threshold
          return (
            <div
              key={id}
              className={`rounded-md border p-3 text-center ${
                pass
                  ? 'border-green-500/30 bg-green-500/8'
                  : 'border-red-400/30 bg-red-400/8'
              }`}
            >
              <p className={`font-mono text-lg font-bold ${pass ? 'text-green-400' : 'text-red-400'}`}>
                {label}
              </p>
              <p className="mt-0.5 font-mono text-[9px] text-muted/70">{sublabel}</p>
              <p className={`mt-1 font-mono text-[10px] font-semibold ${pass ? 'text-green-400' : 'text-red-400'}`}>
                {pass ? '✓ 合格' : '✗ 不合格'}
              </p>
              <p className="mt-0.5 font-mono text-[9px] text-muted/50">{threshold}:1 以上</p>
            </div>
          )
        })}
      </div>

      {/* Preview */}
      <div className="space-y-2">
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted">Preview</p>
        <div
          className="rounded-md border border-border p-5"
          style={{ backgroundColor: isValidHex(bgInput) ? normalizeHex(bgInput) : bg }}
        >
          <p
            className="text-2xl font-bold"
            style={{ color: isValidHex(fgInput) ? normalizeHex(fgInput) : fg }}
          >
            大テキスト（18pt / 14pt Bold 相当）
          </p>
          <p
            className="mt-2 text-base"
            style={{ color: isValidHex(fgInput) ? normalizeHex(fgInput) : fg }}
          >
            通常テキスト — The quick brown fox jumps over the lazy dog.
          </p>
          <p
            className="mt-1 text-sm"
            style={{ color: isValidHex(fgInput) ? normalizeHex(fgInput) : fg }}
          >
            小テキスト — アクセシビリティ対応の UI を作るために、コントラスト比を確認しましょう。
          </p>
        </div>
      </div>
    </div>
  )
}
