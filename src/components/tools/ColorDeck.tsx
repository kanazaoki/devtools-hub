'use client'

import { useState, useEffect } from 'react'

// ---- Color math ----

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n))
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const clean = hex.replace('#', '').trim()
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) return null
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
  }
}

function rgbToHex(r: number, g: number, b: number): string {
  return (
    '#' +
    [r, g, b]
      .map((v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0'))
      .join('')
  )
}

function rgbToHsl(r: number, g: number, b: number) {
  const rn = r / 255
  const gn = g / 255
  const bn = b / 255
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const l = (max + min) / 2
  if (max === min) return { h: 0, s: 0, l: Math.round(l * 100) }
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h: number
  switch (max) {
    case rn:
      h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6
      break
    case gn:
      h = ((bn - rn) / d + 2) / 6
      break
    default:
      h = ((rn - gn) / d + 4) / 6
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) }
}

function rgbToHsv(r: number, g: number, b: number) {
  const rn = r / 255
  const gn = g / 255
  const bn = b / 255
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const v = max
  const d = max - min
  const s = max === 0 ? 0 : d / max
  let h: number
  if (max === min) {
    h = 0
  } else {
    switch (max) {
      case rn:
        h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6
        break
      case gn:
        h = ((bn - rn) / d + 2) / 6
        break
      default:
        h = ((rn - gn) / d + 4) / 6
    }
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), v: Math.round(v * 100) }
}

function getFormats(hex: string, alpha: number) {
  const rgb = hexToRgb(hex)
  if (!rgb) return null
  const { r, g, b } = rgb
  const hsl = rgbToHsl(r, g, b)
  const hsv = rgbToHsv(r, g, b)
  const a = Math.round(alpha * 100) / 100
  return {
    hex: hex.toUpperCase(),
    rgb: `rgb(${r}, ${g}, ${b})`,
    cssRgba: `rgba(${r}, ${g}, ${b}, ${a.toFixed(2)})`,
    rgbaFloat: `${(r / 255).toFixed(3)}, ${(g / 255).toFixed(3)}, ${(b / 255).toFixed(3)}, ${a.toFixed(3)}`,
    hsv: `hsv(${hsv.h}°, ${hsv.s}%, ${hsv.v}%)`,
    hsl: `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`,
  }
}

// ---- Palette storage ----

const PALETTE_KEY = 'color-deck-palette'
const MAX_PALETTE = 8

function loadPalette(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(PALETTE_KEY)
    return raw ? (JSON.parse(raw) as string[]) : []
  } catch {
    return []
  }
}

function savePalette(palette: string[]) {
  try {
    localStorage.setItem(PALETTE_KEY, JSON.stringify(palette))
  } catch {}
}

// ---- CopyButton ----

function CopyButton({ text, label = 'COPY' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {}
  }

  return (
    <button
      onClick={handleCopy}
      className={`min-w-[52px] rounded px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider transition-all duration-150 ${
        copied
          ? 'bg-teal text-bg'
          : 'border border-border text-muted hover:border-border-hi hover:text-dim'
      }`}
    >
      {copied ? '✓' : label}
    </button>
  )
}

// ---- Main ----

export function ColorDeck() {
  const [hex, setHex] = useState('#00C896')
  const [hexInput, setHexInput] = useState('#00C896')
  const [alpha, setAlpha] = useState(1)
  const [palette, setPalette] = useState<string[]>([])

  useEffect(() => {
    setPalette(loadPalette())
  }, [])

  const formats = getFormats(hex, alpha)
  const rgb = hexToRgb(hex)
  const previewBg = rgb
    ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`
    : hex

  function handlePickerChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    setHex(val)
    setHexInput(val.toUpperCase())
  }

  function handleHexInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    setHexInput(val)
    const normalized = val.startsWith('#') ? val : `#${val}`
    if (/^#[0-9a-fA-F]{6}$/.test(normalized)) {
      setHex(normalized.toLowerCase())
    }
  }

  function handleHexInputBlur() {
    if (rgb) {
      const norm = rgbToHex(rgb.r, rgb.g, rgb.b).toUpperCase()
      setHex(norm)
      setHexInput(norm)
    } else {
      setHexInput(hex.toUpperCase())
    }
  }

  function handleSave() {
    const entry = hex.toUpperCase()
    if (palette.includes(entry) || palette.length >= MAX_PALETTE) return
    const next = [...palette, entry]
    setPalette(next)
    savePalette(next)
  }

  function handleLoadColor(color: string) {
    setHex(color.toLowerCase())
    setHexInput(color.toUpperCase())
  }

  function handleRemoveColor(e: React.MouseEvent, color: string) {
    e.preventDefault()
    const next = palette.filter((c) => c !== color)
    setPalette(next)
    savePalette(next)
  }

  if (!formats) return null

  const formatRows: { label: string; value: string }[] = [
    { label: 'RGB', value: formats.rgb },
    { label: 'CSS rgba()', value: formats.cssRgba },
    { label: 'RGBA float', value: formats.rgbaFloat },
    { label: 'HSV', value: formats.hsv },
    { label: 'HSL', value: formats.hsl },
  ]

  return (
    <div className="space-y-5">
      {/* Top: preview + controls */}
      <div className="flex flex-wrap items-stretch gap-4">
        {/* Color preview with checkerboard (alpha visualization) */}
        <div
          className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl border border-border"
          style={{
            backgroundImage:
              'repeating-conic-gradient(#1E1E26 0% 25%, #24242C 0% 50%)',
            backgroundSize: '10px 10px',
          }}
          aria-label="カラープレビュー"
        >
          <div
            className="absolute inset-0 transition-colors duration-100"
            style={{ backgroundColor: previewBg }}
          />
        </div>

        <div className="flex flex-col justify-between flex-1 min-w-[200px] gap-3">
          {/* Native picker */}
          <div className="flex items-center gap-3">
            <label className="font-mono text-[10px] uppercase tracking-widest text-muted w-14 shrink-0">
              Picker
            </label>
            <label className="relative cursor-pointer">
              <input
                type="color"
                value={hex.length === 7 ? hex : '#000000'}
                onChange={handlePickerChange}
                className="sr-only"
              />
              <span
                className="block h-8 w-14 rounded border border-border transition-transform hover:scale-105"
                style={{ backgroundColor: hex }}
                aria-hidden="true"
              />
            </label>
          </div>

          {/* Alpha slider with gradient track */}
          <div className="flex items-center gap-3">
            <label className="font-mono text-[10px] uppercase tracking-widest text-muted w-14 shrink-0">
              Alpha
            </label>
            <div className="relative flex-1 flex items-center">
              {/* Gradient track background */}
              <div
                className="absolute inset-0 h-1.5 my-auto rounded-full pointer-events-none"
                style={{
                  backgroundImage: rgb
                    ? `linear-gradient(to right, rgba(${rgb.r},${rgb.g},${rgb.b},0), rgba(${rgb.r},${rgb.g},${rgb.b},1))`
                    : undefined,
                }}
              />
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(alpha * 100)}
                onChange={(e) => setAlpha(Number(e.target.value) / 100)}
                className="relative w-full accent-teal"
              />
            </div>
            <span className="font-mono text-xs text-dim w-9 text-right tabular-nums">
              {Math.round(alpha * 100)}%
            </span>
          </div>
        </div>
      </div>

      {/* HEX editable input — primary row, colored left border */}
      <div
        className="flex items-center gap-3 rounded-lg border border-border bg-surface-hi px-4 py-3 pl-4"
        style={{ borderLeftColor: hex, borderLeftWidth: '3px' }}
      >
        <span className="font-mono text-[10px] uppercase tracking-wider text-muted w-20 shrink-0">
          HEX
        </span>
        <input
          type="text"
          value={hexInput}
          onChange={handleHexInputChange}
          onBlur={handleHexInputBlur}
          maxLength={7}
          placeholder="#000000"
          className="flex-1 bg-transparent font-mono text-sm font-medium text-bright outline-none placeholder:text-muted"
          spellCheck={false}
        />
        <CopyButton text={formats.hex} />
      </div>

      {/* Other format rows */}
      <div className="overflow-hidden rounded-lg border border-border divide-y divide-border">
        {formatRows.map((row) => (
          <div
            key={row.label}
            className="flex items-center gap-3 px-4 py-2.5 hover:bg-surface-hi/50 transition-colors"
          >
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted w-20 shrink-0">
              {row.label}
            </span>
            <span className="font-mono text-xs text-primary flex-1 truncate tabular-nums">
              {row.value}
            </span>
            <CopyButton text={row.value} />
          </div>
        ))}
      </div>

      {/* Palette */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted">
            Palette{' '}
            <span className="text-dim">
              {palette.length}/{MAX_PALETTE}
            </span>
          </span>
          <button
            onClick={handleSave}
            disabled={palette.length >= MAX_PALETTE || palette.includes(hex.toUpperCase())}
            className="rounded border border-teal/50 px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-teal transition-colors hover:bg-teal/10 disabled:cursor-not-allowed disabled:opacity-30"
          >
            + Save
          </button>
        </div>

        {palette.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {palette.map((color) => (
              <button
                key={color}
                onClick={() => handleLoadColor(color)}
                onContextMenu={(e) => handleRemoveColor(e, color)}
                title={`${color} — クリックで読み込み / 右クリックで削除`}
                className="group relative h-10 w-10 rounded-lg border-2 transition-all duration-150 hover:scale-110 hover:shadow-lg"
                style={{
                  backgroundColor: color,
                  borderColor:
                    hex.toUpperCase() === color ? 'rgb(0,200,150)' : 'rgba(255,255,255,0.08)',
                  boxShadow:
                    hex.toUpperCase() === color
                      ? `0 0 0 1px rgb(0,200,150), 0 0 8px rgba(0,200,150,0.3)`
                      : undefined,
                }}
              >
                <span className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/60 font-mono text-[8px] text-white opacity-0 transition-opacity group-hover:opacity-100">
                  {color.slice(1)}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <p className="rounded-lg border border-dashed border-border px-4 py-3 text-xs italic text-muted">
            「+ Save」で現在の色を保存。右クリックで削除。ページをリロードしても保持されます。
          </p>
        )}
      </div>
    </div>
  )
}
