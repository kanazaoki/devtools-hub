'use client'

import { useState, useCallback } from 'react'

type Tab = 'scale' | 'tints' | 'shades' | 'tones'
type OutputFormat = 'css' | 'tailwind'

function hexToRgb(hex: string): [number, number, number] | null {
  const clean = hex.replace('#', '')
  if (clean.length !== 6) return null
  const n = parseInt(clean, 16)
  if (isNaN(n)) return null
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function rgbToHex(r: number, g: number, b: number): string {
  return (
    '#' +
    [r, g, b]
      .map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0'))
      .join('')
  )
}

function mix(c1: [number, number, number], c2: [number, number, number], t: number): string {
  return rgbToHex(
    c1[0] + (c2[0] - c1[0]) * t,
    c1[1] + (c2[1] - c1[1]) * t,
    c1[2] + (c2[2] - c1[2]) * t
  )
}

function luminance(hex: string): number {
  const rgb = hexToRgb(hex)
  if (!rgb) return 0
  return (rgb[0] * 299 + rgb[1] * 587 + rgb[2] * 114) / 1000
}

function generatePalette(hex: string, steps: number, tab: Tab): { label: string; hex: string }[] {
  const rgb = hexToRgb(hex)
  if (!rgb) return []
  const white: [number, number, number] = [255, 255, 255]
  const black: [number, number, number] = [0, 0, 0]
  const gray: [number, number, number] = [128, 128, 128]

  if (tab === 'scale') {
    // 50（いちばん明るい）〜900（いちばん暗い）で、入力した色を 500 に置く。
    // ⚠ 以前は Tints タブで入力色そのものを「50」、白を「600」と呼んでいて、
    // Tailwind の 50＝最も明るい という並びと逆になっていた
    return SCALE.map(([label, toward, t]) => ({
      label,
      hex: toward === 'white' ? mix(rgb, white, t) : toward === 'black' ? mix(rgb, black, t) : mix(rgb, rgb, 0),
    }))
  }

  return Array.from({ length: steps }, (_, i) => {
    const t = i / (steps - 1)
    let color: string
    if (tab === 'tints') {
      color = mix(rgb, white, t)
    } else if (tab === 'shades') {
      color = mix(rgb, black, t)
    } else {
      color = mix(rgb, gray, t)
    }
    // Tints / Shades / Tones は入力色から順に並べた段階なので、明るさの番号ではなく段階の番号を付ける
    return { label: `${tab.slice(0, -1)}-${i}`, hex: color }
  })
}

const SCALE: [string, 'white' | 'black' | 'base', number][] = [
  ['50', 'white', 0.95],
  ['100', 'white', 0.9],
  ['200', 'white', 0.75],
  ['300', 'white', 0.55],
  ['400', 'white', 0.3],
  ['500', 'base', 0],
  ['600', 'black', 0.15],
  ['700', 'black', 0.35],
  ['800', 'black', 0.55],
  ['900', 'black', 0.75],
]

const tokenName = (name: string) => name.trim().replace(/[^\w-]+/g, '-').replace(/^-+|-+$/g, '') || 'primary'

function buildCssVars(palette: { label: string; hex: string }[], name: string): string {
  const n = tokenName(name)
  return [':root {', ...palette.map(({ label, hex }) => `  --color-${n}-${label}: ${hex};`), '}'].join('\n')
}

function buildTailwind(palette: { label: string; hex: string }[], name: string): string {
  const n = tokenName(name)
  return `colors: {\n  '${n}': {\n${palette.map(({ label, hex }) => `    '${label}': '${hex}',`).join('\n')}\n  },\n}`
}

const TAB_DEFS: { key: Tab; label: string; desc: string }[] = [
  { key: 'scale', label: 'Scale', desc: '50〜900（入力色を500に）' },
  { key: 'tints', label: 'Tints', desc: '白混じり' },
  { key: 'shades', label: 'Shades', desc: '黒混じり' },
  { key: 'tones', label: 'Tones', desc: 'グレー混じり' },
]

export function ColorShadeGenerator() {
  const [hex, setHex] = useState('#14b8a6')
  const [hexInput, setHexInput] = useState('#14b8a6')
  const [tab, setTab] = useState<Tab>('scale')
  const [name, setName] = useState('primary')
  const [steps, setSteps] = useState(7)
  const [outputFormat, setOutputFormat] = useState<OutputFormat>('css')
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  const [copiedAll, setCopiedAll] = useState(false)

  const palette = generatePalette(hex, steps, tab)
  const output = outputFormat === 'css' ? buildCssVars(palette, name) : buildTailwind(palette, name)

  const handleHexInput = (v: string) => {
    setHexInput(v)
    const clean = v.startsWith('#') ? v : '#' + v
    if (hexToRgb(clean)) setHex(clean)
  }

  const handlePickerChange = (v: string) => {
    setHex(v)
    setHexInput(v)
  }

  const copyColor = useCallback((index: number, value: string) => {
    navigator.clipboard.writeText(value).then(() => {
      setCopiedIndex(index)
      setTimeout(() => setCopiedIndex(null), 1200)
    })
  }, [])

  const copyAll = useCallback(() => {
    navigator.clipboard.writeText(output).then(() => {
      setCopiedAll(true)
      setTimeout(() => setCopiedAll(false), 1500)
    })
  }, [output])

  return (
    <div className="flex flex-col gap-6">
      {/* Controls Row */}
      <div className="flex flex-wrap items-center gap-4 rounded border border-border bg-[#070d1a] px-4 py-3">
        {/* Color Picker */}
        <div className="flex items-center gap-2">
          <div className="relative h-9 w-9 overflow-hidden rounded border border-border">
            <input
              type="color"
              value={hex}
              onChange={(e) => handlePickerChange(e.target.value)}
              className="absolute inset-[-4px] h-[calc(100%+8px)] w-[calc(100%+8px)] cursor-pointer border-none bg-transparent p-0"
              aria-label="カラーピッカー"
            />
          </div>
          <input
            type="text"
            value={hexInput}
            onChange={(e) => handleHexInput(e.target.value)}
            placeholder="#14b8a6"
            className="w-28 rounded border border-border bg-transparent px-3 py-1.5 font-mono text-sm text-bright outline-none transition-colors focus:border-teal"
          />
        </div>

        <div className="h-8 w-px bg-border" />

        <label className="flex items-center gap-2">
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted">名前</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="primary"
            className="w-28 rounded border border-border bg-transparent px-3 py-1.5 font-mono text-sm text-bright outline-none transition-colors focus:border-teal"
          />
        </label>

        {/* Steps */}
        <div className={`flex items-center gap-3 ${tab === 'scale' ? 'hidden' : ''}`}>
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted">Steps</span>
          <input
            type="range"
            min={5}
            max={10}
            value={steps}
            onChange={(e) => setSteps(Number(e.target.value))}
            className="w-24 cursor-pointer accent-teal"
            style={{ accentColor: '#14b8a6' }}
          />
          <span className="w-4 font-mono text-sm font-semibold text-bright tabular-nums">{steps}</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-border">
        {TAB_DEFS.map(({ key, label, desc }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex flex-col items-start px-4 pb-3 pt-2 text-left transition-colors ${
              tab === key
                ? 'border-b-2 border-teal text-bright'
                : 'border-b-2 border-transparent text-muted hover:text-primary'
            }`}
          >
            <span className="font-mono text-xs font-semibold">{label}</span>
            <span className="text-[10px] text-dim">{desc}</span>
          </button>
        ))}
      </div>

      {/* Palette Swatches */}
      <div className="flex flex-wrap gap-2">
        {palette.map(({ label, hex: color }, i) => {
          const lum = luminance(color)
          const textDark = lum > 140
          return (
            <button
              key={label}
              onClick={() => copyColor(i, color)}
              title={`${color} をコピー`}
              className="group relative flex flex-col overflow-hidden rounded border border-white/10 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-lg"
              style={{ width: '72px' }}
            >
              <div className="h-16 w-full transition-all" style={{ backgroundColor: color }}>
                {copiedIndex === i && (
                  <div className="flex h-full items-center justify-center">
                    <span className={`text-sm font-bold ${textDark ? 'text-black/70' : 'text-white/80'}`}>✓</span>
                  </div>
                )}
              </div>
              <div className="flex flex-col items-center gap-0.5 bg-[#0c1525] px-1 py-1.5">
                <span className="font-mono text-[10px] text-muted">{label}</span>
                <span className="font-mono text-[10px] text-bright">{color}</span>
              </div>
            </button>
          )
        })}
      </div>

      {/* Horizontal bar preview */}
      <div className="h-8 overflow-hidden rounded border border-border/50">
        <div className="flex h-full">
          {palette.map(({ label, hex: color }) => (
            <div
              key={label}
              className="flex-1"
              style={{ backgroundColor: color }}
              title={color}
            />
          ))}
        </div>
      </div>

      {/* Output */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded border border-border p-0.5">
            {(['css', 'tailwind'] as OutputFormat[]).map((f) => (
              <button
                key={f}
                onClick={() => setOutputFormat(f)}
                className={`rounded px-3 py-1.5 text-xs font-medium transition-colors ${
                  outputFormat === f
                    ? 'bg-teal/20 text-teal'
                    : 'text-dim hover:text-primary'
                }`}
              >
                {f === 'css' ? 'CSS変数' : 'Tailwind'}
              </button>
            ))}
          </div>
          <button
            onClick={copyAll}
            className={`ml-auto rounded border px-3 py-1.5 text-xs font-medium transition-colors ${
              copiedAll
                ? 'border-teal/50 text-teal'
                : 'border-border text-dim hover:border-teal/50 hover:text-teal'
            }`}
          >
            {copiedAll ? '✓ コピー済み' : '全てコピー'}
          </button>
        </div>
        <div className="rounded border border-border bg-[#070d1a] p-4">
          <pre className="overflow-x-auto font-mono text-xs leading-relaxed text-bright">{output}</pre>
        </div>
      </div>
    </div>
  )
}
