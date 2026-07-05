'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

// Permutation table for Perlin/Simplex noise
function buildPermTable(seed: number): number[] {
  const p: number[] = []
  for (let i = 0; i < 256; i++) p[i] = i
  let s = seed
  for (let i = 255; i > 0; i--) {
    s = (s * 1664525 + 1013904223) & 0xffffffff
    const j = Math.abs(s) % (i + 1);
    [p[i], p[j]] = [p[j], p[i]]
  }
  return [...p, ...p]
}

function fade(t: number) { return t * t * t * (t * (t * 6 - 15) + 10) }
function lerp(a: number, b: number, t: number) { return a + t * (b - a) }

function grad(hash: number, x: number, y: number): number {
  const h = hash & 3
  const u = h < 2 ? x : y
  const v = h < 2 ? y : x
  return ((h & 1) ? -u : u) + ((h & 2) ? -v : v)
}

function perlin2D(px: number[], x: number, y: number): number {
  const xi = Math.floor(x) & 255
  const yi = Math.floor(y) & 255
  const xf = x - Math.floor(x)
  const yf = y - Math.floor(y)
  const u = fade(xf)
  const v = fade(yf)
  const aa = px[px[xi] + yi]
  const ab = px[px[xi] + yi + 1]
  const ba = px[px[xi + 1] + yi]
  const bb = px[px[xi + 1] + yi + 1]
  return lerp(
    lerp(grad(aa, xf, yf), grad(ba, xf - 1, yf), u),
    lerp(grad(ab, xf, yf - 1), grad(bb, xf - 1, yf - 1), u),
    v
  )
}

// Simplex noise 2D
function simplex2D(px: number[], xin: number, yin: number): number {
  const F2 = 0.5 * (Math.sqrt(3) - 1)
  const G2 = (3 - Math.sqrt(3)) / 6
  const s = (xin + yin) * F2
  const i = Math.floor(xin + s)
  const j = Math.floor(yin + s)
  const t = (i + j) * G2
  const x0 = xin - (i - t)
  const y0 = yin - (j - t)
  const i1 = x0 > y0 ? 1 : 0
  const j1 = x0 > y0 ? 0 : 1
  const x1 = x0 - i1 + G2
  const y1 = y0 - j1 + G2
  const x2 = x0 - 1 + 2 * G2
  const y2 = y0 - 1 + 2 * G2
  const ii = i & 255
  const jj = j & 255
  const g0 = grad(px[ii + px[jj]], x0, y0)
  const g1 = grad(px[ii + i1 + px[jj + j1]], x1, y1)
  const g2 = grad(px[ii + 1 + px[jj + 1]], x2, y2)
  const t0 = Math.max(0, 0.5 - x0 * x0 - y0 * y0)
  const t1 = Math.max(0, 0.5 - x1 * x1 - y1 * y1)
  const t2 = Math.max(0, 0.5 - x2 * x2 - y2 * y2)
  return 70 * (t0 * t0 * t0 * t0 * g0 + t1 * t1 * t1 * t1 * g1 + t2 * t2 * t2 * t2 * g2)
}

type NoiseType = 'perlin' | 'simplex'
type ColorMap = 'grayscale' | 'viridis' | 'plasma' | 'inferno'

function viridis(t: number): [number, number, number] {
  const r = Math.round(Math.min(255, Math.max(0, 68 + t * (59 - 68) + t * t * (180 - 59))))
  const g = Math.round(Math.min(255, Math.max(0, 1 + t * 130 + t * t * (104 - 130))))
  const b = Math.round(Math.min(255, Math.max(0, 84 + t * (179 - 84) + t * t * (30 - 179))))
  return [r, g, b]
}

function plasma(t: number): [number, number, number] {
  const r = Math.round(Math.min(255, 13 + t * (240 - 13)))
  const g = Math.round(Math.min(255, 8 + t * (249 - 8)))
  const b = Math.round(Math.min(255, 135 + t * (33 - 135)))
  return [r, g, b]
}

function inferno(t: number): [number, number, number] {
  const r = Math.round(Math.min(255, t * t * 252))
  const g = Math.round(Math.min(255, t * 165))
  const b = Math.round(Math.min(255, 4 + t * (t < 0.5 ? 128 : -60)))
  return [r, g, b]
}

function applyColorMap(v: number, map: ColorMap): [number, number, number] {
  const t = Math.max(0, Math.min(1, (v + 1) / 2))
  if (map === 'grayscale') { const c = Math.round(t * 255); return [c, c, c] }
  if (map === 'viridis') return viridis(t)
  if (map === 'plasma') return plasma(t)
  return inferno(t)
}

const SIZE = 512

export function CanvasNoiseGenerator() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [noiseType, setNoiseType] = useState<NoiseType>('perlin')
  const [scale, setScale] = useState(0.015)
  const [octaves, setOctaves] = useState(4)
  const [persistence, setPersistence] = useState(0.5)
  const [lacunarity, setLacunarity] = useState(2.0)
  const [seed, setSeed] = useState(42)
  const [colorMap, setColorMap] = useState<ColorMap>('grayscale')

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const px = buildPermTable(seed)
    const imageData = ctx.createImageData(SIZE, SIZE)
    const data = imageData.data

    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        let val = 0
        let amp = 1
        let freq = scale
        let maxVal = 0
        for (let o = 0; o < octaves; o++) {
          const nx = x * freq
          const ny = y * freq
          val += (noiseType === 'perlin' ? perlin2D(px, nx, ny) : simplex2D(px, nx, ny)) * amp
          maxVal += amp
          amp *= persistence
          freq *= lacunarity
        }
        val /= maxVal
        const [r, g, b] = applyColorMap(val, colorMap)
        const idx = (y * SIZE + x) * 4
        data[idx] = r; data[idx + 1] = g; data[idx + 2] = b; data[idx + 3] = 255
      }
    }
    ctx.putImageData(imageData, 0, 0)
  }, [noiseType, scale, octaves, persistence, lacunarity, seed, colorMap])

  useEffect(() => {
    const timer = setTimeout(draw, 50)
    return () => clearTimeout(timer)
  }, [draw])

  const handleDownload = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const a = document.createElement('a')
    a.href = canvas.toDataURL('image/png')
    a.download = `noise-${noiseType}-${Date.now()}.png`
    a.click()
  }

  const Slider = ({ label, value, min, max, step, onChange, display, hint }: {
    label: string; value: number; min: number; max: number; step: number
    onChange: (v: number) => void; display?: string; hint?: string
  }) => (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <label className="font-mono text-xs text-primary">{label}</label>
          {hint && <span className="text-xs text-muted">{hint}</span>}
        </div>
        <span className="font-mono text-xs tabular-nums text-teal">{display ?? value}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full accent-teal cursor-pointer" />
    </div>
  )

  const COLORMAP_PREVIEW: Record<ColorMap, string> = {
    grayscale: 'linear-gradient(to right, #000, #fff)',
    viridis: 'linear-gradient(to right, #440154, #31688e, #35b779, #fde725)',
    plasma: 'linear-gradient(to right, #0d0887, #7e03a8, #cc4778, #f89540, #f0f921)',
    inferno: 'linear-gradient(to right, #000004, #420a68, #932667, #dd513a, #fca50a, #fcffa4)',
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-6 lg:grid-cols-[1fr_auto]">
        {/* Controls */}
        <div className="space-y-5">
          {/* Algorithm + Color map side by side */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <span className="mb-2 block font-mono text-xs uppercase tracking-widest text-muted">Algorithm</span>
              <div className="flex overflow-hidden rounded border border-border">
                {(['perlin', 'simplex'] as NoiseType[]).map(t => (
                  <button key={t} onClick={() => setNoiseType(t)}
                    className={`flex-1 py-1.5 text-xs font-mono transition-colors ${noiseType === t ? 'bg-teal/20 text-teal border-r border-teal/30' : 'text-dim hover:text-primary'}`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <span className="mb-2 block font-mono text-xs uppercase tracking-widest text-muted">Color Map</span>
              <div className="grid grid-cols-2 gap-1.5">
                {(['grayscale', 'viridis', 'plasma', 'inferno'] as ColorMap[]).map(c => (
                  <button key={c} onClick={() => setColorMap(c)}
                    className={`flex items-center gap-2 rounded border px-2 py-1 text-xs font-mono transition-colors ${colorMap === c ? 'border-teal/50 text-teal' : 'border-border text-dim hover:text-primary hover:border-border-hi'}`}>
                    <span
                      className="h-2 w-6 shrink-0 rounded"
                      style={{ background: COLORMAP_PREVIEW[c] }}
                    />
                    {c}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Sliders */}
          <div className="space-y-4 rounded border border-border bg-surface p-4">
            <Slider label="Scale" value={scale} min={0.001} max={0.1} step={0.001}
              onChange={setScale} display={scale.toFixed(3)} hint="zoom" />
            <Slider label="Octaves" value={octaves} min={1} max={8} step={1}
              onChange={setOctaves} hint="layers" />
            <Slider label="Persistence" value={persistence} min={0.1} max={0.9} step={0.05}
              onChange={setPersistence} display={persistence.toFixed(2)} hint="roughness" />
            <Slider label="Lacunarity" value={lacunarity} min={1.0} max={4.0} step={0.1}
              onChange={setLacunarity} display={lacunarity.toFixed(1)} hint="frequency" />
            <Slider label="Seed" value={seed} min={0} max={999} step={1} onChange={setSeed} />
          </div>

          <button onClick={handleDownload}
            className="flex items-center gap-2 rounded border border-teal/40 px-4 py-2 text-sm text-teal hover:bg-teal/10 transition-colors">
            <span>↓</span> PNG をダウンロード
          </button>
        </div>

        {/* Canvas */}
        <div>
          <span className="mb-2 block font-mono text-xs uppercase tracking-widest text-muted">Preview</span>
          <canvas ref={canvasRef} width={SIZE} height={SIZE}
            className="w-full max-w-[400px] rounded border border-border" />
          <p className="mt-1 text-xs text-muted text-right">512 × 512 px</p>
        </div>
      </div>
    </div>
  )
}
