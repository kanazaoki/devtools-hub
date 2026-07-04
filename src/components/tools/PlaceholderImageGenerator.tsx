'use client'

import { useState, useCallback } from 'react'

const PRESETS = [
  { label: '16:9', w: 1280, h: 720 },
  { label: '4:3', w: 800, h: 600 },
  { label: '1:1', w: 400, h: 400 },
  { label: 'OG', w: 1200, h: 630 },
  { label: 'Banner', w: 728, h: 90 },
]

function buildSvg(w: number, h: number, bg: string, fg: string, text: string): string {
  const fontSize = Math.max(12, Math.min(52, Math.floor(Math.min(w, h) / 7)))
  const textEl = text
    ? `<text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="ui-monospace,monospace" font-size="${fontSize}" fill="${fg}">${escapeXml(text)}</text>`
    : ''
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="${w}" height="${h}" fill="${bg}"/>${textEl}</svg>`
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function svgToDataUrl(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <label className="font-mono text-[10px] uppercase tracking-widest text-muted">{label}</label>
      <div className="flex items-center gap-2 rounded-lg border border-border bg-surface-hi px-3 py-2 transition-colors focus-within:border-teal/40">
        <div className="relative h-5 w-5 shrink-0 overflow-hidden rounded-sm border border-border/60">
          <input
            type="color" value={value}
            onChange={e => onChange(e.target.value)}
            className="absolute -inset-1 h-8 w-8 cursor-pointer border-none bg-transparent p-0 opacity-0"
          />
          <div className="h-full w-full rounded-sm" style={{ background: value }} />
        </div>
        <input
          type="text" value={value}
          onChange={e => onChange(e.target.value)}
          className="min-w-0 flex-1 bg-transparent font-mono text-sm text-primary outline-none"
          spellCheck={false}
        />
      </div>
    </div>
  )
}

export function PlaceholderImageGenerator() {
  const [width, setWidth] = useState(400)
  const [height, setHeight] = useState(300)
  const [widthStr, setWidthStr] = useState('400')
  const [heightStr, setHeightStr] = useState('300')
  const [bg, setBg] = useState('#cccccc')
  const [fg, setFg] = useState('#666666')
  const [text, setText] = useState('400×300')
  const [copied, setCopied] = useState<string | null>(null)

  const isElectron = typeof window !== 'undefined' && !!(window as any).electronAPI?.isElectron

  const wErr = widthStr !== '' && (isNaN(Number(widthStr)) || Number(widthStr) < 1 || Number(widthStr) > 2000)
  const hErr = heightStr !== '' && (isNaN(Number(heightStr)) || Number(heightStr) < 1 || Number(heightStr) > 2000)

  const applyWidth = useCallback((val: string) => {
    setWidthStr(val)
    const n = parseInt(val, 10)
    if (!isNaN(n) && n >= 1 && n <= 2000) setWidth(n)
  }, [])

  const applyHeight = useCallback((val: string) => {
    setHeightStr(val)
    const n = parseInt(val, 10)
    if (!isNaN(n) && n >= 1 && n <= 2000) setHeight(n)
  }, [])

  const applyPreset = (w: number, h: number) => {
    setWidth(w); setHeight(h)
    setWidthStr(String(w)); setHeightStr(String(h))
    setText(`${w}×${h}`)
  }

  const svg = buildSvg(width, height, bg, fg, text)
  const dataUrl = svgToDataUrl(svg)
  const imgTag = `<img src="${dataUrl}" width="${width}" height="${height}" alt="placeholder">`

  const copy = async (content: string, key: string) => {
    await navigator.clipboard.writeText(content)
    setCopied(key)
    setTimeout(() => setCopied(null), 1500)
  }

  const savePng = () => {
    const canvas = document.createElement('canvas')
    canvas.width = width; canvas.height = height
    const ctx = canvas.getContext('2d')!
    const img = new Image()
    img.onload = async () => {
      ctx.drawImage(img, 0, 0)
      const blob = await new Promise<Blob>(res => canvas.toBlob(b => res(b!), 'image/png'))
      const buf = await blob.arrayBuffer()
      await (window as any).electronAPI.savePngBuffer(new Uint8Array(buf), `placeholder-${width}x${height}.png`)
    }
    img.src = dataUrl
  }

  const maxPreviewW = 520
  const maxPreviewH = 320
  const scale = Math.min(1, maxPreviewW / width, maxPreviewH / height)
  const previewW = Math.round(width * scale)
  const previewH = Math.round(height * scale)

  return (
    <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
      {/* ── Left: controls ── */}
      <div className="w-full space-y-4 lg:w-64 lg:shrink-0">
        {/* Size */}
        <div className="space-y-3">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted">Size</p>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="font-mono text-[10px] text-muted/70">W (px)</label>
              <input
                type="number" min={1} max={2000} value={widthStr}
                onChange={e => applyWidth(e.target.value)}
                className={`w-full rounded-md border px-3 py-2 font-mono text-sm bg-surface-hi text-primary outline-none transition-colors focus:border-teal/40 ${wErr ? 'border-red-500/50 text-red-400' : 'border-border'}`}
              />
            </div>
            <div className="space-y-1">
              <label className="font-mono text-[10px] text-muted/70">H (px)</label>
              <input
                type="number" min={1} max={2000} value={heightStr}
                onChange={e => applyHeight(e.target.value)}
                className={`w-full rounded-md border px-3 py-2 font-mono text-sm bg-surface-hi text-primary outline-none transition-colors focus:border-teal/40 ${hErr ? 'border-red-500/50 text-red-400' : 'border-border'}`}
              />
            </div>
          </div>
          {(wErr || hErr) && (
            <p className="font-mono text-[10px] text-red-400">1〜2000 px で入力してください</p>
          )}
        </div>

        {/* Presets */}
        <div className="space-y-2">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted">Presets</p>
          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map(p => (
              <button
                key={p.label}
                onClick={() => applyPreset(p.w, p.h)}
                className="rounded border border-border px-2.5 py-1 font-mono text-[11px] text-dim transition-all hover:border-teal/50 hover:bg-teal/5 hover:text-teal"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Colors */}
        <div className="space-y-3">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted">Colors</p>
          <ColorField label="Background" value={bg} onChange={setBg} />
          <ColorField label="Text" value={fg} onChange={setFg} />
        </div>

        {/* Label text */}
        <div className="space-y-1.5">
          <label className="font-mono text-[10px] uppercase tracking-widest text-muted">Label Text</label>
          <input
            type="text" value={text}
            onChange={e => setText(e.target.value)}
            placeholder="空で文字なし"
            className="w-full rounded-lg border border-border bg-surface-hi px-3 py-2 font-mono text-sm text-primary outline-none transition-colors focus:border-teal/40 placeholder:text-muted/30"
          />
        </div>

        {/* Actions */}
        <div className="space-y-2 pt-1">
          <button
            onClick={() => copy(dataUrl, 'url')}
            className={`w-full rounded-lg border px-4 py-2.5 font-mono text-xs transition-all ${
              copied === 'url'
                ? 'border-teal/40 bg-teal/10 text-teal'
                : 'border-border text-dim hover:border-border-hi hover:text-primary'
            }`}
          >
            {copied === 'url' ? '✓ Copied!' : 'Copy Data URL'}
          </button>
          <button
            onClick={() => copy(imgTag, 'img')}
            className={`w-full rounded-lg border px-4 py-2.5 font-mono text-xs transition-all ${
              copied === 'img'
                ? 'border-teal/40 bg-teal/10 text-teal'
                : 'border-border text-dim hover:border-border-hi hover:text-primary'
            }`}
          >
            {copied === 'img' ? '✓ Copied!' : 'Copy <img> tag'}
          </button>
          {isElectron && (
            <button
              onClick={savePng}
              className="w-full rounded-lg border border-teal/30 bg-teal/10 px-4 py-2.5 font-mono text-xs text-teal transition-all hover:border-teal/50 hover:bg-teal/20"
            >
              Save as PNG…
            </button>
          )}
        </div>
      </div>

      {/* ── Right: preview ── */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between mb-2">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted">Preview</p>
          <span className="font-mono text-[10px] text-muted/50">{width} × {height}px</span>
        </div>
        {/* Canvas area with checkerboard bg */}
        <div
          className="flex items-center justify-center rounded-xl border border-border overflow-hidden"
          style={{
            minHeight: 180,
            background: 'repeating-conic-gradient(#1e2535 0% 25%, #161c2a 0% 50%) 0 0 / 20px 20px',
          }}
        >
          <div className="m-6">
            <img
              src={dataUrl}
              width={previewW}
              height={previewH}
              alt="placeholder preview"
              style={{ display: 'block', imageRendering: 'pixelated' }}
            />
          </div>
        </div>
        {/* Scale note */}
        {scale < 1 && (
          <p className="mt-1.5 font-mono text-[10px] text-muted/40 text-right">
            {Math.round(scale * 100)}% preview
          </p>
        )}
      </div>
    </div>
  )
}
