'use client'

import { useState, useMemo, useEffect, useRef } from 'react'

const METHODS = ['srgb', 'srgb-linear', 'hsl', 'hwb', 'lch', 'oklch', 'lab', 'oklab'] as const
type Method = typeof METHODS[number]

function hexToRgb(hex: string): [number, number, number] | null {
  const m = hex.replace('#', '').match(/^([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i)
  if (!m) return null
  return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)]
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')
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

// Canvas-based color sampling for color-mix() result
function sampleColorMix(
  color1: string, color2: string, pct: number, method: Method,
  canvas: HTMLCanvasElement
): [number, number, number] | null {
  try {
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, 1, 1)
    ctx.fillStyle = `color-mix(in ${method}, ${color1} ${pct}%, ${color2})`
    ctx.fillRect(0, 0, 1, 1)
    const d = ctx.getImageData(0, 0, 1, 1).data
    return [d[0], d[1], d[2]]
  } catch {
    return null
  }
}

export function ColorMixPreviewer() {
  const [color1, setColor1] = useState('#ff6b6b')
  const [color2, setColor2] = useState('#4ecdc4')
  const [pct, setPct] = useState(50)
  const [method, setMethod] = useState<Method>('srgb')
  const [copied, setCopied] = useState(false)
  const [supported, setSupported] = useState(true)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    // Check color-mix() support
    try {
      const canvas = document.createElement('canvas')
      canvas.width = canvas.height = 1
      const ctx = canvas.getContext('2d')!
      ctx.fillStyle = 'color-mix(in srgb, red 50%, blue)'
      ctx.fillRect(0, 0, 1, 1)
      const d = ctx.getImageData(0, 0, 1, 1).data
      setSupported(d[0] !== 0 || d[2] !== 0)
    } catch {
      setSupported(false)
    }
  }, [])

  const result = useMemo(() => {
    if (!canvasRef.current) return null
    return sampleColorMix(color1, color2, pct, method, canvasRef.current)
  }, [color1, color2, pct, method])

  const resultHex = result ? rgbToHex(...result) : null
  const resultHsl = result ? rgbToHsl(...result) : null
  const cssCode = `color-mix(in ${method}, ${color1} ${pct}%, ${color2})`

  const handleCopy = () => {
    navigator.clipboard.writeText(cssCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const ColorPicker = ({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) => (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-mono font-semibold uppercase tracking-widest text-muted">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={e => onChange(e.target.value)}
          className="h-10 w-14 cursor-pointer rounded border border-border bg-transparent p-0.5"
        />
        <input
          type="text"
          value={value}
          onChange={e => { if (/^#[0-9a-fA-F]{0,6}$/.test(e.target.value)) onChange(e.target.value) }}
          className="w-24 rounded border border-border bg-bg px-2 py-1.5 font-mono text-sm text-primary focus:border-teal focus:outline-none"
          spellCheck={false}
          maxLength={7}
        />
        <div className="h-10 w-10 rounded border border-border flex-shrink-0" style={{ backgroundColor: value }} />
      </div>
    </div>
  )

  return (
    <div className="flex flex-col gap-5">
      <canvas ref={canvasRef} width={1} height={1} className="hidden" />

      {!supported && (
        <div className="rounded border border-border bg-surface px-4 py-3 text-sm text-muted">
          このブラウザは CSS <code>color-mix()</code> に対応していません。Chrome 111+、Safari 16.2+ が必要です。
        </div>
      )}

      {/* Color pickers */}
      <div className="grid grid-cols-2 gap-4">
        <ColorPicker label="Color 1" value={color1} onChange={setColor1} />
        <ColorPicker label="Color 2" value={color2} onChange={setColor2} />
      </div>

      {/* Mix ratio */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-mono font-semibold uppercase tracking-widest text-muted">Mix Ratio (Color 1)</label>
          <span className="font-mono text-sm text-teal">{pct}%</span>
        </div>
        <input
          type="range" min={0} max={100} value={pct}
          onChange={e => setPct(Number(e.target.value))}
          className="w-full accent-teal"
        />
        <div className="flex justify-between text-xs text-dim">
          <span>← Color 2 (100%)</span>
          <span>50 / 50</span>
          <span>Color 1 (100%) →</span>
        </div>
      </div>

      {/* Mixing method */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-mono font-semibold uppercase tracking-widest text-muted">Color Space</label>
        <div className="flex flex-wrap gap-2">
          {METHODS.map(m => (
            <button
              key={m}
              onClick={() => setMethod(m)}
              className={`rounded border px-3 py-1 font-mono text-xs transition-colors ${
                method === m
                  ? 'border-teal bg-teal/10 text-teal'
                  : 'border-border text-dim hover:border-teal/50 hover:text-muted'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Result */}
      <div className="rounded-lg border border-border bg-surface p-4">
        <div className="text-xs font-mono font-semibold uppercase tracking-widest text-muted mb-3">Result</div>
        <div className="flex gap-4 items-start">
          {/* Color preview with gradient */}
          <div className="flex flex-col gap-1 flex-shrink-0">
            <div
              className="h-16 w-32 rounded border border-border"
              style={{ backgroundColor: resultHex ?? color1 }}
            />
            {resultHex && (
              <div className="font-mono text-xs text-center text-bright">{resultHex.toUpperCase()}</div>
            )}
          </div>

          {/* Gradient bar */}
          <div className="flex-1 flex flex-col gap-1">
            <div
              className="h-8 rounded border border-border"
              style={{ background: `linear-gradient(to right, ${color1}, ${color2})` }}
            />
            <div className="text-xs text-dim text-center font-mono">Gradient preview (linear)</div>

            {result && resultHsl && (
              <div className="grid grid-cols-3 gap-2 mt-2">
                {[
                  ['HEX', resultHex?.toUpperCase()],
                  ['RGB', `rgb(${result.join(', ')})`],
                  ['HSL', `hsl(${resultHsl[0]}, ${resultHsl[1]}%, ${resultHsl[2]}%)`],
                ].map(([label, val]) => (
                  <div key={label} className="flex flex-col gap-0.5">
                    <span className="text-xs text-muted font-mono">{label}</span>
                    <span className="text-xs text-primary font-mono break-all">{val}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* CSS code */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-mono font-semibold uppercase tracking-widest text-muted">CSS Code</label>
        <div className="flex items-center gap-2">
          <code className="flex-1 rounded border border-border bg-bg px-3 py-2 font-mono text-sm text-primary overflow-x-auto whitespace-nowrap">
            {cssCode}
          </code>
          <button
            onClick={handleCopy}
            className="flex-shrink-0 rounded border border-border px-3 py-2 text-xs text-muted transition-colors hover:border-teal hover:text-teal"
          >
            {copied ? '✓ Copied' : 'Copy'}
          </button>
        </div>
      </div>
    </div>
  )
}
