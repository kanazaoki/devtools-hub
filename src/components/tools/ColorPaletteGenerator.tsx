'use client'

import { useState, useCallback, useMemo } from 'react'

// ── Color math ────────────────────────────────────────────────────────────────

function hexToRgb(hex: string): [number, number, number] {
  const c = hex.replace('#', '')
  const full = c.length === 3 ? c.split('').map(x => x + x).join('') : c
  if (!/^[0-9A-Fa-f]{6}$/.test(full)) return [0, 0, 0]
  const n = parseInt(full, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255, gn = g / 255, bn = b / 255
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn)
  const l = (max + min) / 2
  if (max === min) return [0, 0, Math.round(l * 100)]
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h = 0
  if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6
  else if (max === gn) h = ((bn - rn) / d + 2) / 6
  else h = ((rn - gn) / d + 4) / 6
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)]
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const hn = h / 360, sn = s / 100, ln = l / 100
  if (sn === 0) {
    const v = Math.round(ln * 255)
    return [v, v, v]
  }
  const q = ln < 0.5 ? ln * (1 + sn) : ln + sn - ln * sn
  const p = 2 * ln - q
  const hue2rgb = (p: number, q: number, t: number) => {
    let tc = t
    if (tc < 0) tc += 1
    if (tc > 1) tc -= 1
    if (tc < 1 / 6) return p + (q - p) * 6 * tc
    if (tc < 1 / 2) return q
    if (tc < 2 / 3) return p + (q - p) * (2 / 3 - tc) * 6
    return p
  }
  return [
    Math.round(hue2rgb(p, q, hn + 1 / 3) * 255),
    Math.round(hue2rgb(p, q, hn) * 255),
    Math.round(hue2rgb(p, q, hn - 1 / 3) * 255),
  ]
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')
}

function rotateHue(h: number, deg: number): number {
  return ((h + deg) % 360 + 360) % 360
}

function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map(v => {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function labelColor(hex: string): string {
  return relativeLuminance(hex) > 0.3 ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.72)'
}

// ── Harmony generators ────────────────────────────────────────────────────────

type HarmonyType = 'complementary' | 'analogous' | 'triadic' | 'tetradic' | 'monochromatic'

function generateHarmony(base: string, type: HarmonyType): string[] {
  const [r, g, b] = hexToRgb(base)
  const [h, s, l] = rgbToHsl(r, g, b)

  switch (type) {
    case 'complementary':
      return [base, rgbToHex(...hslToRgb(rotateHue(h, 180), s, l))]
    case 'analogous':
      return [
        rgbToHex(...hslToRgb(rotateHue(h, -60), s, l)),
        rgbToHex(...hslToRgb(rotateHue(h, -30), s, l)),
        base,
        rgbToHex(...hslToRgb(rotateHue(h, 30), s, l)),
        rgbToHex(...hslToRgb(rotateHue(h, 60), s, l)),
      ]
    case 'triadic':
      return [
        base,
        rgbToHex(...hslToRgb(rotateHue(h, 120), s, l)),
        rgbToHex(...hslToRgb(rotateHue(h, 240), s, l)),
      ]
    case 'tetradic':
      return [
        base,
        rgbToHex(...hslToRgb(rotateHue(h, 90), s, l)),
        rgbToHex(...hslToRgb(rotateHue(h, 180), s, l)),
        rgbToHex(...hslToRgb(rotateHue(h, 270), s, l)),
      ]
    case 'monochromatic': {
      const steps = [15, 30, l, Math.min(85, l + 25), Math.min(95, l + 45)]
        .sort((a, b) => a - b)
        .map(light => rgbToHex(...hslToRgb(h, s, Math.max(5, Math.min(95, light)))))
      return [...new Set(steps)]
    }
  }
}

function hexToDisplayRgb(hex: string): string {
  const [r, g, b] = hexToRgb(hex)
  return `rgb(${r}, ${g}, ${b})`
}

function hexToDisplayHsl(hex: string): string {
  const [r, g, b] = hexToRgb(hex)
  const [h, s, l] = rgbToHsl(r, g, b)
  return `hsl(${h}, ${s}%, ${l}%)`
}

// ── ColorStrip — tall horizontal bars ────────────────────────────────────────

function ColorStrip({ colors, base }: { colors: string[]; base: string }) {
  const [copied, setCopied] = useState<string | null>(null)

  const copy = useCallback(async (text: string, key: string) => {
    try { await navigator.clipboard.writeText(text) }
    catch {
      const el = document.createElement('textarea')
      el.value = text; document.body.appendChild(el); el.select()
      document.execCommand('copy'); document.body.removeChild(el)
    }
    setCopied(key)
    setTimeout(() => setCopied(null), 1400)
  }, [])

  return (
    <div className="space-y-4">
      {/* Color bars */}
      <div className="flex overflow-hidden rounded-xl" style={{ height: '9.5rem' }}>
        {colors.map((hex, i) => {
          const lc = labelColor(hex)
          const isBase = hex.toLowerCase() === base.toLowerCase()
          const key = `bar-${i}`
          return (
            <div
              key={i}
              className="group relative flex-1 cursor-pointer transition-[flex] duration-300 hover:flex-[1.7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/40"
              style={{ backgroundColor: hex }}
              title={hex.toUpperCase()}
              onClick={() => copy(hex.toUpperCase(), key)}
              role="button"
              tabIndex={0}
              aria-label={`${hex.toUpperCase()}${isBase ? '（ベースカラー）' : ''} — クリックでコピー`}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); copy(hex.toUpperCase(), key) } }}
            >
              {isBase && (
                <span
                  className="absolute left-2 top-2 rounded px-1.5 py-0.5 font-mono text-[8px] font-bold uppercase tracking-widest"
                  style={{ backgroundColor: 'rgba(0,0,0,0.18)', color: lc }}
                  aria-hidden="true"
                >
                  BASE
                </span>
              )}
              <span
                className="absolute inset-x-0 bottom-0 flex flex-col items-center justify-end pb-2.5 opacity-0 transition-opacity duration-150 group-hover:opacity-100"
                style={{ color: lc }}
                aria-hidden="true"
              >
                <span className="font-mono text-[11px] font-semibold tracking-wider">
                  {copied === key ? '✓ Copied' : hex.toUpperCase()}
                </span>
              </span>
            </div>
          )
        })}
      </div>

      {/* Per-color detail table */}
      <div
        className="grid gap-x-3"
        style={{ gridTemplateColumns: `repeat(${colors.length}, minmax(0, 1fr))` }}
      >
        {colors.map((hex, i) => {
          const rgb = hexToDisplayRgb(hex)
          const hsl = hexToDisplayHsl(hex)
          return (
            <div key={i} className="min-w-0 space-y-0.5">
              <button
                type="button"
                onClick={() => copy(hex.toUpperCase(), `hex-${i}`)}
                aria-label={`HEX ${hex.toUpperCase()} をコピー`}
                className={`w-full truncate rounded px-1 py-1 text-left font-mono font-semibold transition-colors ${
                  copied === `hex-${i}` ? 'text-teal' : 'text-bright hover:text-teal'
                }`}
                style={{ fontSize: '11px' }}
              >
                {copied === `hex-${i}` ? '✓' : hex.toUpperCase()}
              </button>
              <button
                type="button"
                onClick={() => copy(rgb, `rgb-${i}`)}
                aria-label={`RGB ${rgb} をコピー`}
                className={`w-full truncate rounded px-1 py-0.5 text-left font-mono transition-colors ${
                  copied === `rgb-${i}` ? 'text-teal' : 'text-muted hover:text-dim'
                }`}
                style={{ fontSize: '9px' }}
              >
                {copied === `rgb-${i}` ? '✓' : rgb}
              </button>
              <button
                type="button"
                onClick={() => copy(hsl, `hsl-${i}`)}
                aria-label={`HSL ${hsl} をコピー`}
                className={`w-full truncate rounded px-1 py-0.5 text-left font-mono transition-colors ${
                  copied === `hsl-${i}` ? 'text-teal' : 'text-muted hover:text-dim'
                }`}
                style={{ fontSize: '9px' }}
              >
                {copied === `hsl-${i}` ? '✓' : hsl}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Harmony tab with mini dot preview ────────────────────────────────────────

const HARMONIES: { type: HarmonyType; labelJa: string; desc: string }[] = [
  { type: 'complementary', labelJa: '補色',       desc: '反対の色相 · 2色' },
  { type: 'analogous',     labelJa: '類似色',     desc: '隣接する色相 · 5色' },
  { type: 'triadic',       labelJa: 'トライアド', desc: '120° 等分 · 3色' },
  { type: 'tetradic',      labelJa: 'テトラド',   desc: '90° 等分 · 4色' },
  { type: 'monochromatic', labelJa: 'モノクロ',   desc: '同色相 · 明度変化 · 5色' },
]

function HarmonyTab({
  type, labelJa, desc, palette, active, onClick,
}: {
  type: HarmonyType; labelJa: string; desc: string
  palette: string[]; active: boolean; onClick: () => void
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      aria-controls={`panel-${type}`}
      onClick={onClick}
      className={`group flex items-center gap-2.5 rounded-lg border px-3 py-2 text-left transition-all duration-150 ${
        active
          ? 'border-border/80 bg-surface text-bright shadow-sm shadow-black/10'
          : 'border-transparent text-muted hover:text-dim'
      }`}
    >
      <span className="flex shrink-0 items-center gap-0.5">
        {palette.slice(0, 5).map((c, i) => (
          <span
            key={i}
            className="block h-3 w-3 rounded-full ring-1 ring-inset ring-black/10"
            style={{ backgroundColor: c }}
            aria-hidden="true"
          />
        ))}
      </span>
      <span className="min-w-0">
        <span className="block font-mono text-xs font-medium leading-tight">{labelJa}</span>
        <span className="block font-mono text-[9px] leading-tight text-muted/70 transition-colors group-hover:text-muted">{desc}</span>
      </span>
    </button>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function ColorPaletteGenerator() {
  const [baseColor, setBaseColor] = useState('#3b82f6')
  const [hexInput, setHexInput]   = useState('#3b82f6')
  const [activeTab, setActiveTab] = useState<HarmonyType>('complementary')
  const [copiedAll, setCopiedAll] = useState(false)

  const palettes = useMemo(() =>
    Object.fromEntries(
      HARMONIES.map(({ type }) => [type, generateHarmony(baseColor, type)])
    ) as Record<HarmonyType, string[]>,
    [baseColor]
  )

  const activePalette = palettes[activeTab]

  const handlePicker = useCallback((v: string) => { setBaseColor(v); setHexInput(v) }, [])
  const handleHex    = useCallback((v: string) => {
    setHexInput(v)
    if (/^#[0-9A-Fa-f]{6}$/.test(v)) setBaseColor(v)
  }, [])

  const copyAll = useCallback(async () => {
    const text = activePalette.map(c => c.toUpperCase()).join('  ')
    try { await navigator.clipboard.writeText(text) }
    catch {
      const el = document.createElement('textarea')
      el.value = text; document.body.appendChild(el); el.select()
      document.execCommand('copy'); document.body.removeChild(el)
    }
    setCopiedAll(true)
    setTimeout(() => setCopiedAll(false), 2000)
  }, [activePalette])

  const [bh, bs, bl] = useMemo(() => {
    const [r, g, b] = hexToRgb(baseColor)
    return rgbToHsl(r, g, b)
  }, [baseColor])

  return (
    <div className="space-y-6">

      {/* ── Base color ── */}
      <div className="flex flex-wrap items-stretch gap-3">
        <div className="flex items-center gap-3">
          <label htmlFor="cpg-picker" className="font-mono text-[10px] uppercase tracking-widest text-muted">
            Base
          </label>
          <input
            id="cpg-picker"
            type="color"
            value={baseColor}
            onChange={e => handlePicker(e.target.value)}
            aria-label="ベースカラーピッカー"
            className="h-10 w-14 cursor-pointer rounded-md border border-border bg-bg p-0.5 transition-shadow hover:shadow-sm"
          />
          <input
            type="text"
            value={hexInput}
            onChange={e => handleHex(e.target.value)}
            aria-label="ベースカラー HEX 入力"
            maxLength={7}
            placeholder="#3b82f6"
            spellCheck={false}
            className="w-24 rounded-md border border-border bg-bg px-2.5 py-2 font-mono text-xs text-bright outline-none transition-colors focus:border-teal/40"
          />
        </div>
        <div className="flex min-w-0 flex-1 items-center gap-0 overflow-hidden rounded-lg border border-border/60">
          <div
            className="h-full w-14 shrink-0"
            style={{ backgroundColor: baseColor }}
            aria-hidden="true"
          />
          <div className="min-w-0 px-3 py-2 space-y-0.5">
            <p className="font-mono text-xs font-semibold text-bright">{baseColor.toUpperCase()}</p>
            <p className="font-mono text-[9px] text-muted truncate">{hexToDisplayRgb(baseColor)}</p>
            <p className="font-mono text-[9px] text-muted truncate">hsl({bh}, {bs}%, {bl}%)</p>
          </div>
        </div>
      </div>

      {/* ── Harmony selector ── */}
      <div
        className="grid gap-1.5"
        style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(168px, 1fr))' }}
        role="tablist"
        aria-label="カラーハーモニー選択"
      >
        {HARMONIES.map(({ type, labelJa, desc }) => (
          <HarmonyTab
            key={type}
            type={type}
            labelJa={labelJa}
            desc={desc}
            palette={palettes[type]}
            active={activeTab === type}
            onClick={() => setActiveTab(type)}
          />
        ))}
      </div>

      {/* ── Palette panels ── */}
      {HARMONIES.map(({ type }) => (
        <div
          key={type}
          id={`panel-${type}`}
          role="tabpanel"
          aria-label={`${type} パレット`}
          hidden={activeTab !== type}
          className="space-y-4"
        >
          <ColorStrip colors={palettes[type]} base={baseColor} />

          {/* Copy all row */}
          <div className="flex items-center justify-between gap-4 rounded-lg border border-dashed border-border/60 px-4 py-2.5">
            <p
              className="min-w-0 flex-1 truncate font-mono text-[10px] text-muted"
              aria-label="パレットの全HEXカラー"
            >
              {palettes[type].map(c => c.toUpperCase()).join('  ')}
            </p>
            <button
              type="button"
              onClick={copyAll}
              aria-label="パレット全体の HEX をコピー"
              className={`shrink-0 rounded border px-3 py-1 font-mono text-xs transition-all duration-150 ${
                copiedAll
                  ? 'border-teal/40 bg-teal/[0.08] text-teal'
                  : 'border-border text-muted hover:text-dim'
              }`}
            >
              {copiedAll ? '✓ Copied' : 'Copy all'}
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
