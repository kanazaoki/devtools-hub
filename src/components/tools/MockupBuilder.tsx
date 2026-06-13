'use client'

import { useState, useRef, useEffect } from 'react'

const CANVAS_W = 1080
const CANVAS_H = 1920

const BG_PRESETS = [
  { label: 'ネイビー', from: '#0d1b3e', to: '#050d1f' },
  { label: 'パープル', from: '#1a0e2e', to: '#0d0718' },
  { label: 'ダーク',   from: '#0f0f1a', to: '#050508' },
  { label: 'グリーン', from: '#0a1a12', to: '#051009' },
  { label: 'ライト',   from: '#dde6f0', to: '#f0f5fa' },
]

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number
) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = []
  let line = ''
  for (const char of text) {
    if (char === '\n') { lines.push(line); line = ''; continue }
    const test = line + char
    if (ctx.measureText(test).width > maxWidth && line.length > 0) {
      lines.push(line); line = char
    } else {
      line = test
    }
  }
  if (line) lines.push(line)
  return lines
}

export function MockupBuilder() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null)
  const [catchcopy, setCatchcopy] = useState('アプリの\nキャッチコピー')
  const [fontSize, setFontSize] = useState(80)
  const [bgIndex, setBgIndex] = useState(0)
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const currentBg = BG_PRESETS[bgIndex]
  const isLight = bgIndex === BG_PRESETS.length - 1
  const textColor = isLight ? '#0a0a14' : '#ffffff'

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    let cancelled = false

    const draw = (img?: HTMLImageElement) => {
      if (cancelled) return

      // ── Background gradient ──────────────────────────────────────
      const bgGrad = ctx.createLinearGradient(0, 0, 0, CANVAS_H)
      bgGrad.addColorStop(0, currentBg.from)
      bgGrad.addColorStop(1, currentBg.to)
      ctx.fillStyle = bgGrad
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)

      // Radial glow at top-center
      const glow = ctx.createRadialGradient(CANVAS_W / 2, 0, 0, CANVAS_W / 2, 0, 680)
      glow.addColorStop(0, isLight ? 'rgba(0,200,150,0.06)' : 'rgba(0,200,150,0.18)')
      glow.addColorStop(1, 'transparent')
      ctx.fillStyle = glow
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)

      // ── Catchcopy text ───────────────────────────────────────────
      const TEXT_START_Y = 140
      const TEXT_MAX_W = CANVAS_W - 120

      ctx.shadowColor = isLight ? 'rgba(0,0,0,0.10)' : 'rgba(0,0,0,0.55)'
      ctx.shadowBlur = 24
      ctx.shadowOffsetY = 6
      ctx.fillStyle = textColor
      ctx.font = `bold ${fontSize}px 'Helvetica Neue', Helvetica, Arial, sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'top'

      const lines = wrapText(ctx, catchcopy, TEXT_MAX_W)
      const lineH = fontSize * 1.3
      lines.forEach((line, i) => {
        ctx.fillText(line, CANVAS_W / 2, TEXT_START_Y + i * lineH)
      })

      ctx.shadowColor = 'transparent'
      ctx.shadowBlur = 0
      ctx.shadowOffsetY = 0

      // Teal accent bar
      const barY = TEXT_START_Y + lines.length * lineH + 32
      roundRectPath(ctx, (CANVAS_W - 80) / 2, barY, 80, 8, 4)
      ctx.fillStyle = '#00C896'
      ctx.fill()

      // ── Phone frame ──────────────────────────────────────────────
      const PHONE_W = 780
      const PHONE_Y = barY + 56
      const PHONE_H = Math.min(1380, CANVAS_H - PHONE_Y - 60)
      const PHONE_X = (CANVAS_W - PHONE_W) / 2
      const BORDER = 26
      const OUTER_R = 72
      const INNER_R = 50

      // Body gradient
      const frameGrad = ctx.createLinearGradient(PHONE_X, PHONE_Y, PHONE_X + PHONE_W, PHONE_Y + PHONE_H)
      frameGrad.addColorStop(0, '#3a3a3c')
      frameGrad.addColorStop(0.5, '#1c1c1e')
      frameGrad.addColorStop(1, '#282828')
      roundRectPath(ctx, PHONE_X, PHONE_Y, PHONE_W, PHONE_H, OUTER_R)
      ctx.fillStyle = frameGrad
      ctx.fill()

      // Edge highlight
      roundRectPath(ctx, PHONE_X, PHONE_Y, PHONE_W, PHONE_H, OUTER_R)
      ctx.strokeStyle = 'rgba(255,255,255,0.16)'
      ctx.lineWidth = 2
      ctx.stroke()

      // Inner edge shadow
      roundRectPath(ctx, PHONE_X + 2, PHONE_Y + 2, PHONE_W - 4, PHONE_H - 4, OUTER_R - 2)
      ctx.strokeStyle = 'rgba(0,0,0,0.35)'
      ctx.lineWidth = 3
      ctx.stroke()

      // Screen
      const SCR_X = PHONE_X + BORDER
      const SCR_Y = PHONE_Y + BORDER
      const SCR_W = PHONE_W - BORDER * 2
      const SCR_H = PHONE_H - BORDER * 2

      roundRectPath(ctx, SCR_X, SCR_Y, SCR_W, SCR_H, INNER_R)
      ctx.fillStyle = '#000'
      ctx.fill()

      if (img) {
        ctx.save()
        roundRectPath(ctx, SCR_X, SCR_Y, SCR_W, SCR_H, INNER_R)
        ctx.clip()
        const scale = Math.min(SCR_W / img.width, SCR_H / img.height)
        const dw = img.width * scale
        const dh = img.height * scale
        const dx = SCR_X + (SCR_W - dw) / 2
        // Align screenshot to top of screen (natural for app screenshots)
        const dy = SCR_Y
        ctx.drawImage(img, dx, dy, dw, dh)
        ctx.restore()
      } else {
        ctx.fillStyle = 'rgba(255,255,255,0.04)'
        roundRectPath(ctx, SCR_X + 20, SCR_Y + 20, SCR_W - 40, SCR_H - 40, INNER_R - 8)
        ctx.fill()
        ctx.fillStyle = 'rgba(255,255,255,0.28)'
        ctx.font = `38px 'Helvetica Neue', Helvetica, Arial, sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText('スクリーンショット', SCR_X + SCR_W / 2, SCR_Y + SCR_H / 2)
      }

      // Dynamic Island
      const DI_W = 196
      const DI_H = 34
      roundRectPath(ctx, SCR_X + (SCR_W - DI_W) / 2, SCR_Y + 16, DI_W, DI_H, DI_H / 2)
      ctx.fillStyle = '#000'
      ctx.fill()

      // Home indicator
      roundRectPath(ctx, SCR_X + (SCR_W - 120) / 2, SCR_Y + SCR_H - 22, 120, 5, 3)
      ctx.fillStyle = 'rgba(255,255,255,0.42)'
      ctx.fill()

      // Side buttons
      const BTN_R = 4;
      [
        // Volume up
        { x: PHONE_X - 8, y: PHONE_Y + 180, w: 8, h: 64 },
        // Volume down
        { x: PHONE_X - 8, y: PHONE_Y + 264, w: 8, h: 64 },
        // Power
        { x: PHONE_X + PHONE_W, y: PHONE_Y + 220, w: 8, h: 100 },
      ].forEach(({ x, y, w, h }) => {
        const btnGrad = ctx.createLinearGradient(x, y, x + w, y)
        btnGrad.addColorStop(0, '#3a3a3c')
        btnGrad.addColorStop(1, '#222224')
        roundRectPath(ctx, x, y, w, h, BTN_R)
        ctx.fillStyle = btnGrad
        ctx.fill()
        ctx.strokeStyle = 'rgba(255,255,255,0.10)'
        ctx.lineWidth = 1
        ctx.stroke()
      })
    }

    if (screenshotUrl) {
      const img = new Image()
      img.onload = () => draw(img)
      img.onerror = () => draw()
      img.src = screenshotUrl
    } else {
      draw()
    }

    return () => { cancelled = true }
  }, [screenshotUrl, catchcopy, fontSize, bgIndex, currentBg, isLight, textColor])

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file?.type.startsWith('image/')) {
      if (screenshotUrl) URL.revokeObjectURL(screenshotUrl)
      setScreenshotUrl(URL.createObjectURL(file))
    }
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      if (screenshotUrl) URL.revokeObjectURL(screenshotUrl)
      setScreenshotUrl(URL.createObjectURL(file))
    }
    e.target.value = ''
  }

  function handleDownload() {
    const canvas = canvasRef.current
    if (!canvas) return
    const link = document.createElement('a')
    link.download = 'mockup.png'
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  const displayW = 270
  const displayH = Math.round(displayW * (CANVAS_H / CANVAS_W))

  return (
    <div className="space-y-5">
      {/* Controls */}
      <div className="overflow-hidden rounded-xl border border-border bg-surface-hi divide-y divide-border">
        {/* Background presets */}
        <div className="flex flex-wrap items-center gap-3 px-4 py-2.5">
          <span className="w-20 shrink-0 font-mono text-[10px] uppercase tracking-widest text-muted">
            背景
          </span>
          <div className="flex flex-wrap gap-1.5">
            {BG_PRESETS.map((p, i) => (
              <button
                key={p.label}
                onClick={() => setBgIndex(i)}
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-[10px] transition-all duration-150 ${
                  bgIndex === i
                    ? 'border-teal/60 bg-teal/10 text-teal'
                    : 'border-border text-muted hover:border-border-hi hover:text-dim'
                }`}
              >
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full border border-white/20 shrink-0"
                  style={{ background: `linear-gradient(135deg, ${p.from}, ${p.to})` }}
                />
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Font size slider */}
        <div className="flex items-center gap-3 px-4 py-2.5">
          <label className="w-20 shrink-0 font-mono text-[10px] uppercase tracking-widest text-muted">
            Font Size
          </label>
          <input
            type="range"
            min={40}
            max={120}
            step={2}
            value={fontSize}
            onChange={(e) => setFontSize(Number(e.target.value))}
            className="flex-1 accent-teal"
          />
          <span className="w-12 text-right font-mono text-xs tabular-nums text-bright">
            {fontSize}px
          </span>
        </div>

        {/* Catchcopy */}
        <div className="flex items-start gap-3 px-4 py-2.5">
          <label className="w-20 shrink-0 font-mono text-[10px] uppercase tracking-widest text-muted mt-1.5">
            コピー
          </label>
          <textarea
            value={catchcopy}
            onChange={(e) => setCatchcopy(e.target.value)}
            rows={3}
            className="flex-1 resize-none rounded border border-border bg-surface px-2.5 py-1.5 font-mono text-xs text-primary outline-none focus:border-teal/50 transition-colors"
          />
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        {/* Drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-14 text-center transition-all duration-150 ${
            dragging ? 'border-teal bg-teal/8 scale-[1.01]' : 'border-border hover:border-border-hi'
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={handleFileInput}
          />
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`transition-colors ${dragging ? 'text-teal' : 'text-muted/40'}`}
            aria-hidden="true"
          >
            <rect x="2" y="3" width="20" height="14" rx="2" />
            <line x1="8" y1="21" x2="16" y2="21" />
            <line x1="12" y1="17" x2="12" y2="21" />
          </svg>
          <p className="font-mono text-sm text-muted">
            {screenshotUrl ? '別の画像に変更するにはドロップ' : 'スクリーンショットをドロップ'}
          </p>
          <p className="font-mono text-xs text-muted/50">PNG / JPG</p>
          {screenshotUrl && (
            <p className="font-mono text-[10px] text-teal">✓ 画像読み込み済み</p>
          )}
        </div>

        {/* Canvas preview */}
        <div
          className="overflow-hidden rounded-xl border border-border"
          style={{ borderLeftColor: 'rgb(0,200,150)', borderLeftWidth: '3px' }}
        >
          <div className="flex items-center justify-between border-b border-border bg-surface-hi px-4 py-2">
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted">Preview</span>
            <span className="font-mono text-[10px] text-muted/60 tabular-nums">
              {CANVAS_W}×{CANVAS_H}px
            </span>
          </div>
          <div className="flex flex-col items-center gap-3 bg-surface-hi p-3">
            <canvas
              ref={canvasRef}
              width={CANVAS_W}
              height={CANVAS_H}
              className="rounded"
              style={{ width: `${displayW}px`, height: `${displayH}px`, display: 'block' }}
            />
            <button
              onClick={handleDownload}
              className="w-full rounded-lg bg-teal px-4 py-2 font-mono text-sm font-semibold text-bg transition-opacity hover:opacity-80"
            >
              PNG ダウンロード
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
