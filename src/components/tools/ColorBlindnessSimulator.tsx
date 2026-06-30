'use client'

import { useState, useMemo, useCallback } from 'react'

// Brettel/Vienot color blindness simulation matrices
// Source: Fidaner et al. (2016), Machado et al. (2009)
// RGB linear space matrices
const CVD_MATRICES: Record<string, number[][]> = {
  normal: [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ],
  protanopia: [
    [0.152286, 1.052583, -0.204868],
    [0.114503, 0.786281, 0.099216],
    [-0.003882, -0.048116, 1.051998],
  ],
  deuteranopia: [
    [0.367322, 0.860646, -0.227968],
    [0.280085, 0.672501, 0.047413],
    [-0.011820, 0.042940, 0.968881],
  ],
  tritanopia: [
    [1.255528, -0.076749, -0.178779],
    [-0.078411, 0.930809, 0.147602],
    [0.004733, 0.691367, 0.303900],
  ],
  achromatopsia: [
    [0.299, 0.587, 0.114],
    [0.299, 0.587, 0.114],
    [0.299, 0.587, 0.114],
  ],
}

const CVD_LABELS: Record<string, { en: string; ja: string }> = {
  normal:       { en: 'Normal',       ja: '正常色覚' },
  protanopia:   { en: 'Protanopia',   ja: '第一色盲（赤が見えにくい）' },
  deuteranopia: { en: 'Deuteranopia', ja: '第二色盲（緑が見えにくい）' },
  tritanopia:   { en: 'Tritanopia',   ja: '第三色盲（青が見えにくい）' },
  achromatopsia:{ en: 'Achromatopsia',ja: '全色盲（色の区別がない）' },
}

const CVD_TYPES = Object.keys(CVD_MATRICES)

const PRESET_COLORS = [
  { hex: '#e74c3c', label: '赤' },
  { hex: '#2ecc71', label: '緑' },
  { hex: '#3498db', label: '青' },
  { hex: '#f1c40f', label: '黄' },
]

// Convert sRGB byte to linear
function srgbToLinear(v: number): number {
  const s = v / 255
  return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
}

// Convert linear to sRGB byte
function linearToSrgb(v: number): number {
  const c = Math.max(0, Math.min(1, v))
  const s = c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055
  return Math.round(s * 255)
}

function hexToRgb(hex: string): [number, number, number] | null {
  const m = hex.replace('#', '').match(/^([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i)
  if (!m) return null
  return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)]
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

function simulateColor(hex: string, type: string): string {
  const rgb = hexToRgb(hex)
  if (!rgb) return hex
  const m = CVD_MATRICES[type]
  if (!m) return hex

  const lr = srgbToLinear(rgb[0])
  const lg = srgbToLinear(rgb[1])
  const lb = srgbToLinear(rgb[2])

  const sr = linearToSrgb(m[0][0] * lr + m[0][1] * lg + m[0][2] * lb)
  const sg = linearToSrgb(m[1][0] * lr + m[1][1] * lg + m[1][2] * lb)
  const sb = linearToSrgb(m[2][0] * lr + m[2][1] * lg + m[2][2] * lb)

  return rgbToHex(sr, sg, sb)
}

// WCAG relative luminance
function luminance(hex: string): number {
  const rgb = hexToRgb(hex)
  if (!rgb) return 0
  return 0.2126 * srgbToLinear(rgb[0]) + 0.7152 * srgbToLinear(rgb[1]) + 0.0722 * srgbToLinear(rgb[2])
}

function contrastRatio(hex: string, bgHex: string): number {
  const l1 = luminance(hex)
  const l2 = luminance(bgHex)
  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)
  return Math.round(((lighter + 0.05) / (darker + 0.05)) * 100) / 100
}

function wcagBadge(ratio: number): { label: string; pass: boolean }[] {
  return [
    { label: 'AA', pass: ratio >= 4.5 },
    { label: 'AAA', pass: ratio >= 7 },
  ]
}

function isValidHex(hex: string): boolean {
  return /^#?[0-9a-f]{6}$/i.test(hex)
}

function normalizeHex(hex: string): string {
  return hex.startsWith('#') ? hex.toLowerCase() : `#${hex.toLowerCase()}`
}

interface ColorEntry {
  id: number
  hex: string
}

let nextId = 5

export function ColorBlindnessSimulator() {
  const [colors, setColors] = useState<ColorEntry[]>(
    PRESET_COLORS.map((c, i) => ({ id: i + 1, hex: c.hex }))
  )
  const [newHex, setNewHex] = useState('#')
  const [pickerColor, setPickerColor] = useState('#3498db')
  const [selectedType, setSelectedType] = useState('protanopia')
  const [copied, setCopied] = useState(false)
  const [hexError, setHexError] = useState(false)

  const addColor = useCallback((hex: string) => {
    if (!isValidHex(hex)) { setHexError(true); return }
    setHexError(false)
    if (colors.length >= 8) return
    const normalized = normalizeHex(hex)
    setColors(prev => [...prev, { id: nextId++, hex: normalized }])
    setNewHex('#')
    setPickerColor(normalized)
  }, [colors.length])

  const removeColor = useCallback((id: number) => {
    setColors(prev => prev.length > 1 ? prev.filter(c => c.id !== id) : prev)
  }, [])

  const updateColor = useCallback((id: number, hex: string) => {
    setColors(prev => prev.map(c => c.id === id ? { ...c, hex } : c))
  }, [])

  const simulated = useMemo(() => {
    const result: Record<string, Record<number, string>> = {}
    for (const type of CVD_TYPES) {
      result[type] = {}
      for (const c of colors) {
        result[type][c.id] = simulateColor(c.hex, type)
      }
    }
    return result
  }, [colors])

  const generateOutput = useCallback((): string => {
    return colors.map(c => {
      const sim = simulated[selectedType]?.[c.id] ?? c.hex
      return `${c.hex} → ${sim}`
    }).join('\n')
  }, [colors, simulated, selectedType])

  const copyOutput = async () => {
    await navigator.clipboard.writeText(generateOutput())
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Stats bar */}
      <div className="flex flex-wrap items-center gap-2 rounded border border-border bg-[#0a0f1a] px-3 py-2 text-xs font-mono">
        <span className="text-teal">{colors.length} colors</span>
        <span className="text-muted">·</span>
        <span className="text-sky-400">{CVD_LABELS[selectedType]?.en}</span>
        <span className="text-muted">·</span>
        <span className="text-muted">{CVD_LABELS[selectedType]?.ja}</span>
      </div>

      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        {/* Left: color input + type selector */}
        <div className="flex flex-col gap-3">
          {/* Color input */}
          <div className="rounded border border-border bg-[#0a0f1a] p-4">
            <p className="mb-3 font-mono text-xs uppercase tracking-widest text-muted">Colors ({colors.length}/8)</p>
            <div className="flex flex-col gap-2 mb-3">
              {colors.map((c) => (
                <div key={c.id} className="flex items-center gap-2">
                  <div className="h-5 w-5 shrink-0 rounded border border-border/40" style={{ backgroundColor: c.hex }} />
                  <input
                    type="color"
                    value={c.hex}
                    onChange={(e) => updateColor(c.id, e.target.value)}
                    className="h-5 w-7 cursor-pointer rounded border-0 bg-transparent p-0"
                  />
                  <span className="flex-1 font-mono text-xs text-bright">{c.hex}</span>
                  <button
                    onClick={() => removeColor(c.id)}
                    disabled={colors.length <= 1}
                    className="rounded px-1 font-mono text-xs text-muted hover:text-rose-400 disabled:opacity-30"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            {colors.length < 8 && (
              <div className="flex gap-2">
                <input
                  type="color"
                  value={pickerColor}
                  onChange={(e) => { setPickerColor(e.target.value); setNewHex(e.target.value) }}
                  className="h-8 w-10 cursor-pointer rounded border border-border bg-transparent"
                />
                <input
                  type="text"
                  value={newHex}
                  onChange={(e) => { setNewHex(e.target.value); setHexError(false) }}
                  onKeyDown={(e) => e.key === 'Enter' && addColor(newHex)}
                  placeholder="#rrggbb"
                  maxLength={7}
                  className={`flex-1 rounded border px-2 py-1 font-mono text-xs text-bright placeholder:text-muted/40 focus:outline-none bg-surface ${hexError ? 'border-rose-400 focus:border-rose-400' : 'border-border focus:border-teal'}`}
                />
                <button
                  onClick={() => addColor(newHex)}
                  disabled={colors.length >= 8}
                  className="rounded border border-border px-2 py-1 font-mono text-xs text-muted hover:text-teal hover:border-teal/40 disabled:opacity-30"
                >
                  +
                </button>
              </div>
            )}
            {hexError && <p className="mt-1 text-xs text-rose-400">有効な HEX (#rrggbb) を入力してください</p>}
          </div>

          {/* CVD type selector */}
          <div className="rounded border border-border bg-[#0a0f1a] p-4">
            <p className="mb-3 font-mono text-xs uppercase tracking-widest text-muted">Vision Type</p>
            <div className="flex flex-col gap-1">
              {CVD_TYPES.map((type) => (
                <button
                  key={type}
                  onClick={() => setSelectedType(type)}
                  className={`rounded px-3 py-2 text-left transition-colors ${
                    selectedType === type
                      ? 'bg-teal/20 border border-teal/40 text-teal'
                      : 'border border-transparent text-muted hover:text-primary hover:border-border/40'
                  }`}
                >
                  <span className="block font-mono text-xs font-semibold">{CVD_LABELS[type]?.en}</span>
                  <span className="block text-[10px] leading-tight opacity-70">{CVD_LABELS[type]?.ja}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Copy output */}
          <div className="rounded border border-border bg-[#0a0f1a] p-4">
            <div className="flex items-center justify-between">
              <p className="font-mono text-xs uppercase tracking-widest text-muted">Export ({CVD_LABELS[selectedType]?.en})</p>
              <button
                onClick={copyOutput}
                className={`rounded border px-3 py-1 font-mono text-xs transition-colors ${
                  copied ? 'border-teal text-teal' : 'border-border text-muted hover:text-primary'
                }`}
              >
                {copied ? 'copied ✓' : 'copy'}
              </button>
            </div>
            <div className="mt-2 rounded bg-[#060a12] p-2">
              {colors.map(c => {
                const sim = simulated[selectedType]?.[c.id] ?? c.hex
                return (
                  <div key={c.id} className="flex items-center gap-2 py-0.5 font-mono text-xs">
                    <span className="text-muted">{c.hex}</span>
                    <span className="text-border">→</span>
                    <span className="text-teal">{sim}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Right: simulation grid + contrast */}
        <div className="flex flex-col gap-4">
          {/* Simulation swatches grid */}
          <div className="rounded border border-border bg-[#0a0f1a]">
            <p className="border-b border-border px-4 py-2 font-mono text-xs uppercase tracking-widest text-muted">Color Simulation</p>
            <div className="overflow-x-auto p-4">
              <table className="w-full min-w-[480px]">
                <thead>
                  <tr>
                    <th className="pb-2 text-left font-mono text-[10px] text-muted w-20">Color</th>
                    {CVD_TYPES.map(type => (
                      <th key={type} className="pb-2 text-center font-mono text-[10px] text-muted">
                        <span className={selectedType === type ? 'text-teal' : ''}>{CVD_LABELS[type]?.en}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {colors.map((c) => (
                    <tr key={c.id} className="border-t border-border/30">
                      <td className="py-2 font-mono text-xs text-muted pr-2">
                        <div className="flex items-center gap-1.5">
                          <div className="h-4 w-4 rounded border border-border/40 shrink-0" style={{ backgroundColor: c.hex }} />
                          <span className="text-[10px]">{c.hex}</span>
                        </div>
                      </td>
                      {CVD_TYPES.map(type => {
                        const sim = simulated[type]?.[c.id] ?? c.hex
                        const isSelected = selectedType === type
                        return (
                          <td key={type} className="py-2 text-center">
                            <div className="flex flex-col items-center gap-1">
                              <div
                                className={`h-8 w-12 rounded ${isSelected ? 'ring-1 ring-teal/60 ring-offset-1 ring-offset-[#0a0f1a]' : ''}`}
                                style={{ backgroundColor: sim }}
                              />
                              <span className="font-mono text-[9px] text-muted/60">{sim}</span>
                            </div>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Contrast ratios */}
          <div className="rounded border border-border bg-[#0a0f1a]">
            <p className="border-b border-border px-4 py-2 font-mono text-xs uppercase tracking-widest text-muted">WCAG Contrast</p>
            <div className="overflow-x-auto p-4">
              <table className="w-full min-w-[400px]">
                <thead>
                  <tr>
                    <th className="pb-2 text-left font-mono text-[10px] text-muted w-24">Color</th>
                    <th className="pb-2 text-center font-mono text-[10px] text-muted">vs White</th>
                    <th className="pb-2 text-center font-mono text-[10px] text-muted">vs Black</th>
                    <th className="pb-2 text-center font-mono text-[10px] text-muted">Sim ({CVD_LABELS[selectedType]?.en}) vs White</th>
                    <th className="pb-2 text-center font-mono text-[10px] text-muted">Sim vs Black</th>
                  </tr>
                </thead>
                <tbody>
                  {colors.map((c) => {
                    const sim = simulated[selectedType]?.[c.id] ?? c.hex
                    const vsWhite = contrastRatio(c.hex, '#ffffff')
                    const vsBlack = contrastRatio(c.hex, '#000000')
                    const simVsWhite = contrastRatio(sim, '#ffffff')
                    const simVsBlack = contrastRatio(sim, '#000000')
                    return (
                      <tr key={c.id} className="border-t border-border/30">
                        <td className="py-2">
                          <div className="flex items-center gap-1.5">
                            <div className="h-3.5 w-3.5 rounded shrink-0" style={{ backgroundColor: c.hex }} />
                            <span className="font-mono text-[10px] text-muted">{c.hex}</span>
                          </div>
                        </td>
                        {[
                          { ratio: vsWhite, bg: 'white' },
                          { ratio: vsBlack, bg: 'black' },
                          { ratio: simVsWhite, bg: 'white' },
                          { ratio: simVsBlack, bg: 'black' },
                        ].map(({ ratio: r, bg }, i) => {
                          const badges = wcagBadge(r)
                          return (
                            <td key={i} className="py-2 text-center">
                              <div className="flex flex-col items-center gap-0.5">
                                <span className="font-mono text-xs text-bright">{r}:1</span>
                                <div className="flex gap-0.5">
                                  {badges.map(b => (
                                    <span
                                      key={b.label}
                                      className={`rounded px-1 py-px font-mono text-[9px] ${
                                        b.pass ? 'bg-teal/20 text-teal' : 'bg-rose-400/10 text-rose-400'
                                      }`}
                                    >
                                      {b.label}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
