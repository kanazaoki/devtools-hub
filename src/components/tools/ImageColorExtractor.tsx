'use client'

import { useState, useCallback, useRef, useEffect } from 'react'

type RGB = [number, number, number]
type FormatTab = 'hex' | 'rgb' | 'hsl'

interface ColorResult {
  rgb: RGB
  freq: number
}

function distance(a: RGB, b: RGB): number {
  return (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2
}

function kmeans(pixels: RGB[], k: number): ColorResult[] {
  if (pixels.length === 0) return []

  const indices = new Set<number>()
  while (indices.size < Math.min(k, pixels.length)) {
    indices.add(Math.floor(Math.random() * pixels.length))
  }
  let centroids: RGB[] = Array.from(indices).map((i) => [...pixels[i]] as RGB)

  for (let iter = 0; iter < 25; iter++) {
    const clusters: RGB[][] = Array.from({ length: centroids.length }, () => [])
    for (const p of pixels) {
      let minDist = Infinity
      let nearest = 0
      for (let i = 0; i < centroids.length; i++) {
        const d = distance(p, centroids[i])
        if (d < minDist) { minDist = d; nearest = i }
      }
      clusters[nearest].push(p)
    }
    centroids = centroids.map((c, i) => {
      if (clusters[i].length === 0) return c
      const len = clusters[i].length
      const sum = clusters[i].reduce(
        (acc, p) => [acc[0] + p[0], acc[1] + p[1], acc[2] + p[2]] as RGB,
        [0, 0, 0] as RGB
      )
      return [sum[0] / len, sum[1] / len, sum[2] / len] as RGB
    })
  }

  const counts = new Array(centroids.length).fill(0)
  for (const p of pixels) {
    let minDist = Infinity
    let nearest = 0
    for (let i = 0; i < centroids.length; i++) {
      const d = distance(p, centroids[i])
      if (d < minDist) { minDist = d; nearest = i }
    }
    counts[nearest]++
  }
  const total = pixels.length
  return centroids
    .map((c, i) => ({
      rgb: [Math.round(c[0]), Math.round(c[1]), Math.round(c[2])] as RGB,
      freq: Math.round((counts[i] / total) * 100),
    }))
    .sort((a, b) => b.freq - a.freq)
}

function toHex(rgb: RGB): string {
  return `#${rgb.map((v) => v.toString(16).padStart(2, '0')).join('')}`
}

function toRgb(rgb: RGB): string {
  return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`
}

function toHsl(rgb: RGB): string {
  const r = rgb[0] / 255
  const g = rgb[1] / 255
  const b = rgb[2] / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0, s = 0
  const l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
      case g: h = ((b - r) / d + 2) / 6; break
      case b: h = ((r - g) / d + 4) / 6; break
    }
  }
  return `hsl(${Math.round(h * 360)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`
}

function formatColor(rgb: RGB, fmt: FormatTab): string {
  if (fmt === 'hex') return toHex(rgb)
  if (fmt === 'rgb') return toRgb(rgb)
  return toHsl(rgb)
}

function getPixelsFromDataUrl(dataUrl: string): Promise<RGB[]> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const MAX = 150
      const scale = Math.min(MAX / img.width, MAX / img.height, 1)
      const w = Math.max(1, Math.round(img.width * scale))
      const h = Math.max(1, Math.round(img.height * scale))
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      if (!ctx) { reject(new Error('Canvas not supported')); return }
      ctx.drawImage(img, 0, 0, w, h)
      const data = ctx.getImageData(0, 0, w, h).data
      const pixels: RGB[] = []
      for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] < 128) continue
        pixels.push([data[i], data[i + 1], data[i + 2]])
      }
      resolve(pixels)
    }
    img.onerror = () => reject(new Error('画像の読み込みに失敗しました'))
    img.src = dataUrl
  })
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }
  return (
    <button
      onClick={copy}
      className={`shrink-0 rounded border px-2 py-0.5 font-mono text-xs transition-all ${
        copied
          ? 'border-teal/40 bg-teal/10 text-teal'
          : 'border-border text-dim hover:border-teal hover:text-teal'
      }`}
    >
      {copied ? '✓ copied' : 'copy'}
    </button>
  )
}

const SPECTRUM_DOTS = ['#e63946', '#f4a261', '#e9c46a', '#2a9d8f', '#457b9d', '#8ecae6', '#c77dff']

export function ImageColorExtractor() {
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null)
  const [imageFileName, setImageFileName] = useState<string | null>(null)
  const [urlInput, setUrlInput] = useState('')
  const [colorCount, setColorCount] = useState(6)
  const [colors, setColors] = useState<ColorResult[]>([])
  const [fmt, setFmt] = useState<FormatTab>('hex')
  const [status, setStatus] = useState<'idle' | 'fetching' | 'extracting' | 'done' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const loadFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('PNG / JPG / WEBP / GIF の画像ファイルを選択してください')
      setStatus('error')
      return
    }
    const reader = new FileReader()
    reader.onload = (e) => {
      const result = e.target?.result as string
      setImageDataUrl(result)
      setImageFileName(file.name)
      setColors([])
      setError(null)
      setStatus('idle')
    }
    reader.readAsDataURL(file)
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) loadFile(file)
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) loadFile(file)
  }, [loadFile])

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true) }
  const handleDragLeave = () => setIsDragging(false)

  const fetchImageFromUrl = useCallback(async () => {
    if (!urlInput.trim()) {
      setError('URLを入力してください')
      setStatus('error')
      return
    }
    setStatus('fetching')
    setError(null)
    setColors([])
    try {
      const res = await fetch('/api/image-fetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: urlInput.trim() }),
      })
      const json = await res.json()
      if (!res.ok || json.error) {
        setError(json.error ?? '画像の取得に失敗しました')
        setStatus('error')
        return
      }
      setImageDataUrl(json.dataUrl)
      setImageFileName(null)
      setStatus('idle')
    } catch {
      setError('通信エラーが発生しました')
      setStatus('error')
    }
  }, [urlInput])

  const extractColors = useCallback(async () => {
    if (!imageDataUrl) {
      setError('先に画像を選択またはURLを取得してください')
      setStatus('error')
      return
    }
    setStatus('extracting')
    setError(null)
    try {
      const pixels = await getPixelsFromDataUrl(imageDataUrl)
      if (pixels.length === 0) {
        setError('ピクセルデータを取得できませんでした（透過のみの画像は対応外です）')
        setStatus('error')
        return
      }
      const result = kmeans(pixels, colorCount)
      setColors(result)
      setStatus('done')
    } catch (e) {
      setError(e instanceof Error ? e.message : '抽出に失敗しました')
      setStatus('error')
    }
  }, [imageDataUrl, colorCount])

  useEffect(() => {
    if (status === 'done') {
      setStatus('idle')
      setColors((prev) => prev)
    }
  }, [colorCount])

  const FORMATS: { key: FormatTab; label: string }[] = [
    { key: 'hex', label: 'HEX' },
    { key: 'rgb', label: 'RGB' },
    { key: 'hsl', label: 'HSL' },
  ]

  const hasResults = colors.length > 0

  return (
    <div className="flex flex-col gap-5">
      {/* Input row */}
      <div className="grid gap-3 sm:grid-cols-2">
        {/* File upload / drag & drop */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          className={`relative flex cursor-pointer flex-col items-center justify-center gap-2.5 overflow-hidden rounded-lg border-2 border-dashed px-4 py-7 transition-all ${
            isDragging
              ? 'border-teal bg-teal/5 scale-[1.01]'
              : 'border-border hover:border-teal/50 hover:bg-surface/30'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="hidden"
            onChange={handleFileChange}
          />
          {/* Image icon SVG */}
          <svg
            width="28" height="28" viewBox="0 0 28 28" fill="none"
            className="text-muted"
            stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
          >
            <rect x="2" y="5" width="24" height="18" rx="2" />
            <circle cx="9" cy="11" r="2" />
            <path d="M2 20l6-6 5 5 4-4 9 8" />
          </svg>
          <div className="text-center">
            <p className="text-sm font-medium text-primary">クリックまたはドロップ</p>
            <p className="mt-0.5 font-mono text-[10px] uppercase tracking-widest text-muted">PNG · JPG · WEBP · GIF</p>
          </div>
          {/* Spectrum hint dots */}
          <div className="flex gap-1">
            {SPECTRUM_DOTS.map((c) => (
              <div key={c} className="h-2 w-2 rounded-full opacity-50" style={{ backgroundColor: c }} />
            ))}
          </div>
          {imageFileName && (
            <p className="max-w-full truncate rounded bg-teal/10 px-2 py-0.5 font-mono text-[10px] text-teal border border-teal/20">
              {imageFileName}
            </p>
          )}
        </div>

        {/* URL input */}
        <div className="flex flex-col gap-2">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted">URL から取得</p>
          <input
            type="url"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchImageFromUrl()}
            placeholder="https://example.com/image.png"
            className="w-full rounded border border-border bg-bg px-3 py-2 font-mono text-xs text-primary placeholder-muted/40 outline-none transition-colors focus:border-teal"
          />
          <button
            onClick={fetchImageFromUrl}
            disabled={status === 'fetching'}
            className="rounded border border-border bg-surface px-4 py-2 text-xs font-medium text-primary transition-colors hover:border-teal/60 hover:text-teal disabled:cursor-not-allowed disabled:opacity-40"
          >
            {status === 'fetching' ? '取得中…' : '画像を取得'}
          </button>
          <p className="font-mono text-[10px] text-muted/60 leading-relaxed">
            CORS 制限を回避するためサーバー経由で画像を取得します
          </p>
        </div>
      </div>

      {/* Error */}
      {status === 'error' && error && (
        <div className="flex items-start gap-2 rounded border border-red-500/20 bg-red-500/8 px-4 py-3 text-sm text-red-400">
          <span className="mt-0.5 shrink-0">✕</span>
          {error}
        </div>
      )}

      {/* Image preview + controls */}
      {imageDataUrl && (
        <div className="grid gap-4 lg:grid-cols-[auto_1fr]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageDataUrl}
            alt="プレビュー"
            className="max-h-48 max-w-full rounded-lg border border-border object-contain lg:max-h-52 lg:max-w-[280px]"
          />
          <div className="flex flex-col gap-4">
            {/* Slider */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-widest text-muted">抽出色数</span>
                <span className="rounded bg-teal/10 px-2 py-0.5 font-mono text-xs font-semibold text-teal">
                  {colorCount} 色
                </span>
              </div>
              <input
                type="range"
                min={3}
                max={12}
                value={colorCount}
                onChange={(e) => setColorCount(Number(e.target.value))}
                className="w-full accent-teal"
              />
              {/* Tick marks */}
              <div className="flex justify-between px-0.5">
                {Array.from({ length: 10 }, (_, i) => {
                  const val = i + 3
                  return (
                    <div key={val} className="flex flex-col items-center gap-0.5">
                      <div className={`h-1 w-px ${val <= colorCount ? 'bg-teal' : 'bg-border'}`} />
                      {(val === 3 || val === 6 || val === 9 || val === 12) && (
                        <span className="font-mono text-[9px] text-muted">{val}</span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Extract button — always visible */}
      <button
        onClick={extractColors}
        disabled={status === 'extracting'}
        className="rounded border border-teal bg-teal px-5 py-2.5 text-sm font-semibold text-bg transition-all hover:bg-teal/90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
      >
        {status === 'extracting' ? '解析中…' : '色を抽出'}
      </button>

      {/* Extracting skeleton */}
      {status === 'extracting' && (
        <div className="flex flex-col gap-2">
          <div className="h-10 w-full animate-pulse rounded bg-surface" />
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 py-2">
              <div className="h-9 w-9 shrink-0 animate-pulse rounded bg-surface" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 w-32 animate-pulse rounded bg-surface" />
                <div className="h-2 w-24 animate-pulse rounded bg-surface" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Results */}
      {hasResults && (
        <div className="flex flex-col gap-4">
          {/* Proportional palette strip */}
          <div>
            <p className="mb-1.5 font-mono text-[10px] uppercase tracking-widest text-muted">
              カラーフィンガープリント
            </p>
            <div className="flex h-10 overflow-hidden rounded-md">
              {colors.map((c, i) => (
                <div
                  key={i}
                  title={`${toHex(c.rgb)} — ${c.freq}%`}
                  style={{ backgroundColor: toHex(c.rgb), flex: c.freq }}
                  className="transition-all hover:brightness-110 cursor-pointer"
                />
              ))}
            </div>
          </div>

          {/* Format switcher + count */}
          <div className="flex items-center justify-between">
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted">
              抽出色 <span className="text-teal">{colors.length}</span> 件
            </p>
            <div className="flex overflow-hidden rounded border border-border">
              {FORMATS.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setFmt(key)}
                  className={`px-3 py-1 font-mono text-xs transition-colors ${
                    fmt === key ? 'bg-teal text-bg' : 'text-muted hover:text-primary'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Swatch list — NOT a uniform grid */}
          <div className="divide-y divide-border rounded-lg border border-border overflow-hidden">
            {colors.map((c, i) => {
              const hex = toHex(c.rgb)
              const value = formatColor(c.rgb, fmt)
              const isTop = i === 0
              return (
                <div
                  key={i}
                  className="flex items-center gap-3 bg-bg px-3 py-2 hover:bg-surface/30 transition-colors"
                >
                  {/* Color block — larger for top color */}
                  <div
                    className={`shrink-0 rounded transition-all ${isTop ? 'h-12 w-12' : 'h-8 w-8'}`}
                    style={{ backgroundColor: hex }}
                  />
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="font-mono text-xs text-primary">{value}</span>
                    {/* Frequency bar */}
                    <div className="flex items-center gap-2">
                      <div className="h-1 flex-1 overflow-hidden rounded-full bg-surface">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${c.freq}%`, backgroundColor: hex }}
                        />
                      </div>
                      <span className="shrink-0 font-mono text-[10px] text-muted">{c.freq}%</span>
                    </div>
                  </div>
                  <CopyButton value={value} />
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Idle empty state */}
      {!imageDataUrl && status !== 'error' && (
        <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed border-border bg-bg/50 py-10">
          {/* Spectrum strip */}
          <div
            className="h-1.5 w-48 rounded-full"
            style={{
              background:
                'linear-gradient(to right, #e63946, #f4a261, #e9c46a, #2a9d8f, #457b9d, #8ecae6, #c77dff)',
            }}
          />
          <div className="flex gap-2">
            {SPECTRUM_DOTS.map((c) => (
              <div
                key={c}
                className="h-5 w-5 rounded"
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <p className="font-mono text-xs text-muted">
            画像をアップロードして配色を解析
          </p>
        </div>
      )}
    </div>
  )
}
