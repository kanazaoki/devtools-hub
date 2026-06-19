'use client'

import { useState, useCallback } from 'react'

// ── Conversion utilities ─────────────────────────────────────────────────────

type RGB = { r: number; g: number; b: number }
type HSL = { h: number; s: number; l: number }
type CMYK = { c: number; m: number; y: number; k: number }

function hexToRgb(hex: string): RGB | null {
  const clean = hex.replace(/^#/, '').trim()
  const full = clean.length === 3
    ? clean.split('').map(c => c + c).join('')
    : clean
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return null
  const n = parseInt(full, 16)
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
}

function rgbToHex({ r, g, b }: RGB): string {
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')
}

function rgbToHsl({ r, g, b }: RGB): HSL {
  const rn = r / 255, gn = g / 255, bn = b / 255
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn)
  const l = (max + min) / 2
  if (max === min) return { h: 0, s: 0, l: Math.round(l * 100) }
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h = 0
  if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6
  else if (max === gn) h = ((bn - rn) / d + 2) / 6
  else h = ((rn - gn) / d + 4) / 6
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) }
}

function hslToRgb({ h, s, l }: HSL): RGB {
  const sn = s / 100, ln = l / 100
  if (sn === 0) {
    const v = Math.round(ln * 255)
    return { r: v, g: v, b: v }
  }
  const q = ln < 0.5 ? ln * (1 + sn) : ln + sn - ln * sn
  const p = 2 * ln - q
  const hk = h / 360
  const [r, g, b] = [hk + 1 / 3, hk, hk - 1 / 3].map(t => {
    const nt = ((t % 1) + 1) % 1
    if (nt < 1 / 6) return p + (q - p) * 6 * nt
    if (nt < 1 / 2) return q
    if (nt < 2 / 3) return p + (q - p) * (2 / 3 - nt) * 6
    return p
  })
  return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) }
}

function rgbToCmyk({ r, g, b }: RGB): CMYK {
  if (r === 0 && g === 0 && b === 0) return { c: 0, m: 0, y: 0, k: 100 }
  const rn = r / 255, gn = g / 255, bn = b / 255
  const k = 1 - Math.max(rn, gn, bn)
  return {
    c: Math.round(((1 - rn - k) / (1 - k)) * 100),
    m: Math.round(((1 - gn - k) / (1 - k)) * 100),
    y: Math.round(((1 - bn - k) / (1 - k)) * 100),
    k: Math.round(k * 100),
  }
}

function cmykToRgb({ c, m, y, k }: CMYK): RGB {
  const kn = k / 100
  return {
    r: Math.round(255 * (1 - c / 100) * (1 - kn)),
    g: Math.round(255 * (1 - m / 100) * (1 - kn)),
    b: Math.round(255 * (1 - y / 100) * (1 - kn)),
  }
}

function cssNameToRgb(name: string): RGB | null {
  if (typeof document === 'undefined') return null
  const canvas = document.createElement('canvas')
  canvas.width = 1
  canvas.height = 1
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  const sentinel = '#f0f1f2'
  ctx.fillStyle = sentinel
  ctx.fillStyle = name.trim()
  const resolved = ctx.fillStyle
  if (resolved === sentinel) return null
  const m = resolved.match(/^#([0-9a-f]{6})$/)
  if (!m) return null
  const n = parseInt(m[1], 16)
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
}

// ── Component ────────────────────────────────────────────────────────────────

const DEFAULT_HEX = '#3b82f6'

function deriveAll(rgb: RGB) {
  const hsl = rgbToHsl(rgb)
  const cmyk = rgbToCmyk(rgb)
  return {
    hex: rgbToHex(rgb),
    r: String(rgb.r), g: String(rgb.g), b: String(rgb.b),
    h: String(hsl.h), s: String(hsl.s), l: String(hsl.l),
    c: String(cmyk.c), m: String(cmyk.m), y: String(cmyk.y), k: String(cmyk.k),
  }
}

const initial = (() => {
  const rgb = hexToRgb(DEFAULT_HEX)!
  return { ...deriveAll(rgb), preview: DEFAULT_HEX, cssName: '' }
})()

export function ColorFormatConverter() {
  const [hex, setHex] = useState(initial.hex)
  const [r, setR] = useState(initial.r)
  const [g, setG] = useState(initial.g)
  const [b, setB] = useState(initial.b)
  const [h, setH] = useState(initial.h)
  const [s, setS] = useState(initial.s)
  const [l, setL] = useState(initial.l)
  const [c, setC] = useState(initial.c)
  const [m, setM] = useState(initial.m)
  const [y, setY] = useState(initial.y)
  const [k, setK] = useState(initial.k)
  const [cssName, setCssName] = useState('')
  const [preview, setPreview] = useState(initial.preview)
  const [hexError, setHexError] = useState<string | null>(null)
  const [rgbError, setRgbError] = useState<string | null>(null)
  const [nameError, setNameError] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  const applyRgb = useCallback((rgb: RGB) => {
    const d = deriveAll(rgb)
    setHex(d.hex); setPreview(d.hex)
    setR(d.r); setG(d.g); setB(d.b)
    setH(d.h); setS(d.s); setL(d.l)
    setC(d.c); setM(d.m); setY(d.y); setK(d.k)
  }, [])

  const handleHexChange = useCallback((val: string) => {
    setHex(val)
    const rgb = hexToRgb(val)
    if (!rgb) {
      setHexError('無効な HEX 値です（例: #ff0000 / #f00）')
      return
    }
    setHexError(null)
    setR(String(rgb.r)); setG(String(rgb.g)); setB(String(rgb.b))
    const hsl = rgbToHsl(rgb)
    setH(String(hsl.h)); setS(String(hsl.s)); setL(String(hsl.l))
    const cmyk = rgbToCmyk(rgb)
    setC(String(cmyk.c)); setM(String(cmyk.m)); setY(String(cmyk.y)); setK(String(cmyk.k))
    setPreview(rgbToHex(rgb))
    setRgbError(null); setNameError(null)
  }, [])

  const handleRgbChange = useCallback((field: 'r' | 'g' | 'b', val: string) => {
    if (field === 'r') setR(val)
    else if (field === 'g') setG(val)
    else setB(val)
    const nr = field === 'r' ? val : r
    const ng = field === 'g' ? val : g
    const nb = field === 'b' ? val : b
    const ri = parseInt(nr), gi = parseInt(ng), bi = parseInt(nb)
    if (isNaN(ri) || isNaN(gi) || isNaN(bi) ||
        ri < 0 || ri > 255 || gi < 0 || gi > 255 || bi < 0 || bi > 255) {
      setRgbError('各チャンネルは 0〜255 の整数で入力してください')
      return
    }
    setRgbError(null)
    const rgb: RGB = { r: ri, g: gi, b: bi }
    const hexVal = rgbToHex(rgb)
    setHex(hexVal); setPreview(hexVal)
    const hsl = rgbToHsl(rgb)
    setH(String(hsl.h)); setS(String(hsl.s)); setL(String(hsl.l))
    const cmyk = rgbToCmyk(rgb)
    setC(String(cmyk.c)); setM(String(cmyk.m)); setY(String(cmyk.y)); setK(String(cmyk.k))
    setHexError(null); setNameError(null)
  }, [r, g, b])

  const handleHslChange = useCallback((field: 'h' | 's' | 'l', val: string) => {
    if (field === 'h') setH(val)
    else if (field === 's') setS(val)
    else setL(val)
    const nh = field === 'h' ? val : h
    const ns = field === 's' ? val : s
    const nl = field === 'l' ? val : l
    const hi = parseFloat(nh), si = parseFloat(ns), li = parseFloat(nl)
    if (isNaN(hi) || isNaN(si) || isNaN(li)) return
    if (hi < 0 || hi > 360 || si < 0 || si > 100 || li < 0 || li > 100) return
    const rgb = hslToRgb({ h: hi, s: si, l: li })
    const hexVal = rgbToHex(rgb)
    setHex(hexVal); setPreview(hexVal)
    setR(String(rgb.r)); setG(String(rgb.g)); setB(String(rgb.b))
    const cmyk = rgbToCmyk(rgb)
    setC(String(cmyk.c)); setM(String(cmyk.m)); setY(String(cmyk.y)); setK(String(cmyk.k))
    setHexError(null); setRgbError(null); setNameError(null)
  }, [h, s, l])

  const handleCmykChange = useCallback((field: 'c' | 'm' | 'y' | 'k', val: string) => {
    if (field === 'c') setC(val)
    else if (field === 'm') setM(val)
    else if (field === 'y') setY(val)
    else setK(val)
    const nc = field === 'c' ? val : c
    const nm = field === 'm' ? val : m
    const ny = field === 'y' ? val : y
    const nk = field === 'k' ? val : k
    const ci = parseFloat(nc), mi = parseFloat(nm), yi = parseFloat(ny), ki = parseFloat(nk)
    if (isNaN(ci) || isNaN(mi) || isNaN(yi) || isNaN(ki)) return
    if (ci < 0 || ci > 100 || mi < 0 || mi > 100 || yi < 0 || yi > 100 || ki < 0 || ki > 100) return
    const rgb = cmykToRgb({ c: ci, m: mi, y: yi, k: ki })
    const hexVal = rgbToHex(rgb)
    setHex(hexVal); setPreview(hexVal)
    setR(String(rgb.r)); setG(String(rgb.g)); setB(String(rgb.b))
    const hsl = rgbToHsl(rgb)
    setH(String(hsl.h)); setS(String(hsl.s)); setL(String(hsl.l))
    setHexError(null); setRgbError(null); setNameError(null)
  }, [c, m, y, k])

  const handleCssNameChange = useCallback((val: string) => {
    setCssName(val)
    if (!val.trim()) { setNameError(null); return }
    const rgb = cssNameToRgb(val)
    if (!rgb) {
      setNameError('認識できない色名です')
      return
    }
    setNameError(null)
    applyRgb(rgb)
    setHexError(null); setRgbError(null)
  }, [applyRgb])

  const handleCopy = useCallback(async (format: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(format)
      setTimeout(() => setCopied(null), 2000)
    } catch {
      // fallback
      const el = document.createElement('textarea')
      el.value = text
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
      setCopied(format)
      setTimeout(() => setCopied(null), 2000)
    }
  }, [])

  const hexString = hex
  const rgbString = `rgb(${r}, ${g}, ${b})`
  const hslString = `hsl(${h}, ${s}%, ${l}%)`
  const cmykString = `cmyk(${c}%, ${m}%, ${y}%, ${k}%)`

  const copyBtnClass = (format: string) =>
    `shrink-0 border px-2.5 py-1 font-mono text-[10px] transition-all duration-150 ${
      copied === format
        ? 'border-teal/50 bg-teal/10 text-teal'
        : 'border-border text-dim hover:border-teal/40 hover:text-teal'
    }`

  const inputClass =
    'w-full bg-transparent font-mono text-sm text-primary focus:outline-none'

  return (
    <div className="overflow-hidden rounded border border-border">

      {/* Top bar: CSS color name quick-resolve */}
      <div className="flex items-center gap-3 border-b border-border px-4 py-2.5">
        <span className="shrink-0 font-mono text-[9px] uppercase tracking-widest text-muted">
          CSS Name
        </span>
        <input
          type="text"
          value={cssName}
          onChange={e => handleCssNameChange(e.target.value)}
          placeholder="tomato, steelblue, …"
          className="min-w-0 flex-1 bg-transparent font-mono text-xs text-primary placeholder:text-muted/40 focus:outline-none"
          aria-label="CSS カラー名入力"
          data-testid="css-name-input"
        />
        {nameError && (
          <span className="shrink-0 font-mono text-[10px] text-red-400" role="alert">
            {nameError}
          </span>
        )}
        {!nameError && cssName && (
          <span className="shrink-0 font-mono text-[10px] text-teal">→ {hex}</span>
        )}
      </div>

      {/* Color swatch — dominant */}
      <div
        className="relative flex min-h-36 flex-col items-center justify-center gap-1.5 py-8"
        style={{ background: preview }}
        aria-label={`カラープレビュー: ${preview}`}
      >
        <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/20 to-transparent" />
        <span
          className="relative font-mono text-3xl font-bold tracking-widest text-white drop-shadow"
          style={{ textShadow: '0 1px 8px rgba(0,0,0,0.5)' }}
          data-testid="preview-hex"
        >
          {hexError ? '—' : hex.toUpperCase()}
        </span>
        <span
          className="relative font-mono text-xs text-white/70"
          style={{ textShadow: '0 1px 4px rgba(0,0,0,0.6)' }}
        >
          {!hexError && rgbString}
        </span>
      </div>

      {/* Format rows */}
      <div className="divide-y divide-border">

        {/* HEX row */}
        <div className="flex items-center gap-4 px-4 py-3">
          <span className="w-10 shrink-0 font-mono text-[9px] uppercase tracking-widest text-muted">
            HEX
          </span>
          <div className="flex flex-1 flex-col">
            <input
              type="text"
              value={hex}
              onChange={e => handleHexChange(e.target.value)}
              placeholder="#rrggbb"
              maxLength={7}
              className={inputClass}
              aria-label="HEX 入力"
              data-testid="hex-input"
            />
            {hexError && (
              <span className="mt-0.5 font-mono text-[9px] text-red-400" role="alert">
                {hexError}
              </span>
            )}
          </div>
          <button
            onClick={() => handleCopy('hex', hexString)}
            disabled={!!hexError}
            className={copyBtnClass('hex') + ' disabled:opacity-30'}
            aria-label="HEX をコピー"
          >
            {copied === 'hex' ? 'Copied!' : 'Copy'}
          </button>
        </div>

        {/* RGB row */}
        <div className="flex items-center gap-4 px-4 py-3">
          <span className="w-10 shrink-0 font-mono text-[9px] uppercase tracking-widest text-muted">
            RGB
          </span>
          <div className="flex flex-1 flex-col">
            <div className="flex gap-3">
              {(['r', 'g', 'b'] as const).map((field, i) => (
                <div key={field} className="flex items-baseline gap-1">
                  <span className="font-mono text-[9px] text-muted">{['R','G','B'][i]}</span>
                  <input
                    type="number"
                    value={field === 'r' ? r : field === 'g' ? g : b}
                    onChange={e => handleRgbChange(field, e.target.value)}
                    min={0} max={255}
                    className="w-14 bg-transparent font-mono text-sm text-primary focus:outline-none"
                    aria-label={`RGB ${field.toUpperCase()} 入力`}
                    data-testid={`rgb-${field}`}
                  />
                </div>
              ))}
            </div>
            {rgbError && (
              <span className="mt-0.5 font-mono text-[9px] text-red-400" role="alert">
                {rgbError}
              </span>
            )}
            {!rgbError && (
              <span className="mt-0.5 font-mono text-[9px] text-muted/60">{rgbString}</span>
            )}
          </div>
          <button
            onClick={() => handleCopy('rgb', rgbString)}
            disabled={!!rgbError}
            className={copyBtnClass('rgb') + ' disabled:opacity-30'}
            aria-label="RGB をコピー"
          >
            {copied === 'rgb' ? 'Copied!' : 'Copy'}
          </button>
        </div>

        {/* HSL row */}
        <div className="flex items-center gap-4 px-4 py-3">
          <span className="w-10 shrink-0 font-mono text-[9px] uppercase tracking-widest text-muted">
            HSL
          </span>
          <div className="flex flex-1 flex-col">
            <div className="flex gap-3">
              {(['h', 's', 'l'] as const).map((field, i) => (
                <div key={field} className="flex items-baseline gap-1">
                  <span className="font-mono text-[9px] text-muted">
                    {['H','S','L'][i]}<span className="text-muted/50">{i === 0 ? '°' : '%'}</span>
                  </span>
                  <input
                    type="number"
                    value={field === 'h' ? h : field === 's' ? s : l}
                    onChange={e => handleHslChange(field, e.target.value)}
                    min={0} max={i === 0 ? 360 : 100}
                    className="w-14 bg-transparent font-mono text-sm text-primary focus:outline-none"
                    aria-label={`HSL ${field.toUpperCase()} 入力`}
                    data-testid={`hsl-${field}`}
                  />
                </div>
              ))}
            </div>
            <span className="mt-0.5 font-mono text-[9px] text-muted/60">{hslString}</span>
          </div>
          <button
            onClick={() => handleCopy('hsl', hslString)}
            className={copyBtnClass('hsl')}
            aria-label="HSL をコピー"
          >
            {copied === 'hsl' ? 'Copied!' : 'Copy'}
          </button>
        </div>

        {/* CMYK row */}
        <div className="flex items-center gap-4 px-4 py-3">
          <span className="w-10 shrink-0 font-mono text-[9px] uppercase tracking-widest text-muted">
            CMYK
          </span>
          <div className="flex flex-1 flex-col">
            <div className="flex gap-3">
              {(['c', 'm', 'y', 'k'] as const).map((field) => (
                <div key={field} className="flex items-baseline gap-1">
                  <span className="font-mono text-[9px] text-muted">
                    {field.toUpperCase()}<span className="text-muted/50">%</span>
                  </span>
                  <input
                    type="number"
                    value={field === 'c' ? c : field === 'm' ? m : field === 'y' ? y : k}
                    onChange={e => handleCmykChange(field, e.target.value)}
                    min={0} max={100}
                    className="w-12 bg-transparent font-mono text-sm text-primary focus:outline-none"
                    aria-label={`CMYK ${field.toUpperCase()} 入力`}
                    data-testid={`cmyk-${field}`}
                  />
                </div>
              ))}
            </div>
            <span className="mt-0.5 font-mono text-[9px] text-muted/60">{cmykString}</span>
          </div>
          <button
            onClick={() => handleCopy('cmyk', cmykString)}
            className={copyBtnClass('cmyk')}
            aria-label="CMYK をコピー"
          >
            {copied === 'cmyk' ? 'Copied!' : 'Copy'}
          </button>
        </div>

      </div>
    </div>
  )
}
