'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

const SIZES = [16, 32, 64] as const
type Size = typeof SIZES[number]

const SAMPLE_EMOJI = '⚡'

function ColorField({ label, value, onChange, disabled }: { label: string; value: string; onChange: (v: string) => void; disabled?: boolean }) {
  return (
    <div className={`flex flex-col gap-1.5 ${disabled ? 'opacity-30' : ''}`}>
      <label className="font-mono text-[10px] font-semibold uppercase tracking-widest text-muted">{label}</label>
      <div className="flex items-stretch gap-1.5">
        <label className="relative cursor-pointer">
          <input type="color" value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0" />
          <span
            className="block h-full w-8 rounded-lg border border-border/70 transition-colors"
            style={{ background: disabled ? '#2a2a38' : value }}
          />
        </label>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="w-0 flex-1 rounded-lg border border-border bg-[#0a0a10] px-2 py-1.5 font-mono text-[11px] text-bright outline-none transition-all focus:border-teal"
        />
      </div>
    </div>
  )
}

export function FaviconGenerator() {
  const [text, setText] = useState(SAMPLE_EMOJI)
  const [bgColor, setBgColor] = useState('#1a1a2e')
  const [fgColor, setFgColor] = useState('#ffffff')
  const [transparent, setTransparent] = useState(false)
  const [size, setSize] = useState<Size>(32)
  const [copied, setCopied] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const s = size

    ctx.clearRect(0, 0, s, s)

    if (!transparent) {
      ctx.fillStyle = bgColor
      ctx.fillRect(0, 0, s, s)
    }

    if (text.trim()) {
      const fontSize = Math.floor(s * 0.65)
      ctx.font = `${fontSize}px system-ui, "Apple Color Emoji", "Segoe UI Emoji", sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = fgColor
      ctx.fillText(text.trim().slice(0, 2), s / 2, s / 2 + s * 0.03)
    }
  }, [text, bgColor, fgColor, transparent, size])

  useEffect(() => { draw() }, [draw])

  const handleDownload = () => {
    const canvas = canvasRef.current
    if (!canvas || !text.trim()) return
    const url = canvas.toDataURL('image/png')
    const a = document.createElement('a')
    a.href = url
    a.download = `favicon-${size}.png`
    a.click()
  }

  const handleCopy = async () => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.toBlob(async (blob) => {
      if (!blob) return
      try {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
      } catch {
        // fallback: copy data URL as text
        const url = canvas.toDataURL('image/png')
        await navigator.clipboard.writeText(url)
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
      }
    })
  }

  const isEmpty = !text.trim()

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      {/* Controls */}
      <div className="flex flex-col gap-5 lg:w-64 shrink-0">
        {/* Text input */}
        <div className="flex flex-col gap-1.5">
          <label className="font-mono text-[10px] font-semibold uppercase tracking-widest text-muted">
            絵文字 / テキスト（1〜2文字）
          </label>
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, 4))}
            placeholder="⚡"
            className="w-full rounded-lg border border-border bg-[#0a0a10] px-3 py-2.5 font-mono text-2xl text-bright outline-none transition-all focus:border-teal focus:shadow-[0_0_0_2px_rgba(0,200,150,0.12)] placeholder:text-muted/40 tracking-widest"
          />
        </div>

        {/* Color pair */}
        <div className="grid grid-cols-2 gap-3">
          <ColorField
            label="背景色"
            value={bgColor}
            onChange={setBgColor}
            disabled={transparent}
          />
          <ColorField
            label="文字色"
            value={fgColor}
            onChange={setFgColor}
          />
        </div>

        {/* Transparent background */}
        <label className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-border/50 bg-surface/50 px-3 py-2.5 transition-colors hover:border-border">
          <input
            type="checkbox"
            checked={transparent}
            onChange={(e) => setTransparent(e.target.checked)}
            className="h-3.5 w-3.5 rounded accent-teal"
          />
          <span className="font-mono text-[11px] text-dim">背景を透明にする</span>
        </label>

        {/* Size selector */}
        <div className="flex flex-col gap-1.5">
          <label className="font-mono text-[10px] font-semibold uppercase tracking-widest text-muted">サイズ</label>
          <div className="flex gap-1.5">
            {SIZES.map((s) => (
              <button
                key={s}
                onClick={() => setSize(s)}
                className={`flex-1 rounded-lg border py-2 text-[11px] font-mono font-medium transition-all ${size === s
                  ? 'border-teal/50 bg-teal/10 text-teal shadow-[0_0_8px_rgba(0,200,150,0.15)]'
                  : 'border-border text-muted hover:border-border-hi hover:text-dim'}`}
              >
                {s}px
              </button>
            ))}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col gap-2">
          <button
            onClick={handleDownload}
            disabled={isEmpty}
            className="w-full rounded-lg border border-teal/40 bg-teal/10 py-2.5 text-sm font-semibold text-teal transition-all hover:bg-teal/20 hover:border-teal/60 hover:shadow-[0_0_12px_rgba(0,200,150,0.2)] disabled:cursor-not-allowed disabled:opacity-30"
          >
            ↓ PNG ダウンロード ({size}px)
          </button>
          <button
            onClick={handleCopy}
            disabled={isEmpty}
            className={`w-full rounded-lg border py-2.5 text-xs font-mono transition-all disabled:cursor-not-allowed disabled:opacity-30 ${copied
              ? 'border-teal/40 bg-teal/5 text-teal'
              : 'border-border text-muted hover:border-border-hi hover:text-dim'}`}
          >
            {copied ? '✓ コピー済み' : 'クリップボードにコピー'}
          </button>
        </div>
      </div>

      {/* Preview */}
      <div className="flex flex-1 flex-col gap-5">
        <p className="font-mono text-[10px] font-semibold uppercase tracking-widest text-muted">プレビュー</p>

        {/* Main canvas preview */}
        <div className="flex flex-col items-center gap-4 rounded-xl border border-border bg-[#080810] p-8">
          <div
            className="rounded-xl overflow-hidden shadow-[0_0_40px_rgba(0,0,0,0.6)] ring-1 ring-white/5 transition-all"
            style={{ width: 128, height: 128 }}
          >
            <canvas
              ref={canvasRef}
              width={size}
              height={size}
              style={{
                width: 128,
                height: 128,
                imageRendering: 'pixelated',
                background: transparent
                  ? 'repeating-conic-gradient(#2a2a38 0% 25%, #1a1a26 0% 50%) 0 0 / 12px 12px'
                  : undefined,
              }}
            />
          </div>
          <p className="font-mono text-[10px] text-muted tabular-nums">
            {size} × {size} px &nbsp;·&nbsp; 表示 128 × 128
          </p>
        </div>

        {/* Browser tab simulation */}
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="flex items-center gap-1.5 border-b border-border bg-[#0f0f18] px-3 py-2">
            <span className="h-2.5 w-2.5 rounded-full bg-red-500/60" />
            <span className="h-2.5 w-2.5 rounded-full bg-yellow-500/60" />
            <span className="h-2.5 w-2.5 rounded-full bg-green-500/60" />
            <span className="ml-2 font-mono text-[10px] text-muted">ブラウザタブ</span>
          </div>
          <div className="bg-[#1a1a26] p-3">
            <div className="inline-flex items-center gap-2 rounded-t-lg border border-b-0 border-border/60 bg-[#0f0f18] px-3 py-1.5 shadow-sm">
              <canvas
                width={size}
                height={size}
                style={{ width: 14, height: 14, imageRendering: 'pixelated' }}
                className="shrink-0"
                ref={(el) => {
                  if (!el) return
                  const ctx = el.getContext('2d')
                  if (!ctx) return
                  ctx.clearRect(0, 0, size, size)
                  if (!transparent) { ctx.fillStyle = bgColor; ctx.fillRect(0, 0, size, size) }
                  if (text.trim()) {
                    const fs = Math.floor(size * 0.65)
                    ctx.font = `${fs}px system-ui, "Apple Color Emoji", "Segoe UI Emoji", sans-serif`
                    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
                    ctx.fillStyle = fgColor
                    ctx.fillText(text.trim().slice(0, 2), size / 2, size / 2 + size * 0.03)
                  }
                }}
              />
              <span className="font-mono text-[11px] text-dim">My Site</span>
              <span className="ml-1 text-[10px] text-muted/50">✕</span>
            </div>
          </div>
        </div>

        {/* HTML snippet */}
        {!isEmpty && (
          <div className="rounded-xl border border-border/50 bg-[#06090f]">
            <div className="border-b border-border/50 px-4 py-2">
              <span className="font-mono text-[10px] text-muted">HTML</span>
            </div>
            <div className="px-4 py-3">
              <code className="font-mono text-[11px] leading-relaxed text-teal/70 break-all">
                {`<link rel="icon" href="/favicon.png" type="image/png">`}
              </code>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
