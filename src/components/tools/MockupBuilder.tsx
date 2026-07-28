'use client'

import { useState, useRef, useEffect } from 'react'
import JSZip from 'jszip'

// 基準幅（この幅を1.0としてフォント等をスケール）
const BASE_W = 1080

const BG_PRESETS = [
  { label: 'ネイビー', from: '#0d1b3e', to: '#050d1f' },
  { label: 'パープル', from: '#1a0e2e', to: '#0d0718' },
  { label: 'ダーク',   from: '#0f0f1a', to: '#050508' },
  { label: 'グリーン', from: '#0a1a12', to: '#051009' },
  { label: 'ライト',   from: '#dde6f0', to: '#f0f5fa' },
]

// App Store / Google Play 対応の各サイズ
const DEVICE_PRESETS = [
  { label: 'iPhone 6.7"', w: 1290, h: 2796, file: 'iphone-6_7' },
  { label: 'iPhone 6.5"', w: 1242, h: 2688, file: 'iphone-6_5' },
  { label: 'iPhone 5.5"', w: 1242, h: 2208, file: 'iphone-5_5' },
  { label: 'Android',     w: 1080, h: 1920, file: 'android' },
]

type FrameType = 'island' | 'notch' | 'punch'
const FRAME_TYPES: { key: FrameType; label: string }[] = [
  { key: 'island', label: 'Dynamic Island' },
  { key: 'notch',  label: 'ノッチ' },
  { key: 'punch',  label: 'パンチホール' },
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

interface DrawParams {
  bgIndex: number
  catchcopy: string
  fontSize: number // BASE_W 基準のpx
  frameType: FrameType
  img?: HTMLImageElement | null
}

// 任意サイズ W×H のキャンバスにモックアップを描画（比率ベースなので全サイズ対応）
function drawMockup(ctx: CanvasRenderingContext2D, W: number, H: number, p: DrawParams) {
  const s = W / BASE_W
  const bg = BG_PRESETS[p.bgIndex]
  const isLight = p.bgIndex === BG_PRESETS.length - 1
  const textColor = isLight ? '#0a0a14' : '#ffffff'

  // 背景グラデーション
  const bgGrad = ctx.createLinearGradient(0, 0, 0, H)
  bgGrad.addColorStop(0, bg.from)
  bgGrad.addColorStop(1, bg.to)
  ctx.fillStyle = bgGrad
  ctx.fillRect(0, 0, W, H)

  // 上部の放射グロー
  const glow = ctx.createRadialGradient(W / 2, 0, 0, W / 2, 0, 680 * s)
  glow.addColorStop(0, isLight ? 'rgba(0,200,150,0.06)' : 'rgba(0,200,150,0.18)')
  glow.addColorStop(1, 'transparent')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, W, H)

  // キャッチコピー
  const TEXT_START_Y = H * 0.073
  const TEXT_MAX_W = W - 120 * s
  const effFont = p.fontSize * s

  ctx.shadowColor = isLight ? 'rgba(0,0,0,0.10)' : 'rgba(0,0,0,0.55)'
  ctx.shadowBlur = 24 * s
  ctx.shadowOffsetY = 6 * s
  ctx.fillStyle = textColor
  ctx.font = `bold ${effFont}px 'Helvetica Neue', Helvetica, Arial, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'

  const lines = wrapText(ctx, p.catchcopy, TEXT_MAX_W)
  const lineH = effFont * 1.3
  lines.forEach((line, i) => ctx.fillText(line, W / 2, TEXT_START_Y + i * lineH))

  ctx.shadowColor = 'transparent'
  ctx.shadowBlur = 0
  ctx.shadowOffsetY = 0

  // アクセントバー
  const barY = TEXT_START_Y + lines.length * lineH + 32 * s
  const barW = 80 * s
  roundRectPath(ctx, (W - barW) / 2, barY, barW, 8 * s, 4 * s)
  ctx.fillStyle = '#00C896'
  ctx.fill()

  // 端末フレーム
  const PHONE_W = 780 * s
  const PHONE_Y = barY + 56 * s
  const PHONE_H = H - PHONE_Y - 60 * s
  const PHONE_X = (W - PHONE_W) / 2
  const BORDER = 26 * s
  const OUTER_R = 72 * s
  const INNER_R = 50 * s

  const frameGrad = ctx.createLinearGradient(PHONE_X, PHONE_Y, PHONE_X + PHONE_W, PHONE_Y + PHONE_H)
  frameGrad.addColorStop(0, '#3a3a3c')
  frameGrad.addColorStop(0.5, '#1c1c1e')
  frameGrad.addColorStop(1, '#282828')
  roundRectPath(ctx, PHONE_X, PHONE_Y, PHONE_W, PHONE_H, OUTER_R)
  ctx.fillStyle = frameGrad
  ctx.fill()

  roundRectPath(ctx, PHONE_X, PHONE_Y, PHONE_W, PHONE_H, OUTER_R)
  ctx.strokeStyle = 'rgba(255,255,255,0.16)'
  ctx.lineWidth = 2 * s
  ctx.stroke()

  roundRectPath(ctx, PHONE_X + 2 * s, PHONE_Y + 2 * s, PHONE_W - 4 * s, PHONE_H - 4 * s, OUTER_R - 2 * s)
  ctx.strokeStyle = 'rgba(0,0,0,0.35)'
  ctx.lineWidth = 3 * s
  ctx.stroke()

  // スクリーン
  const SCR_X = PHONE_X + BORDER
  const SCR_Y = PHONE_Y + BORDER
  const SCR_W = PHONE_W - BORDER * 2
  const SCR_H = PHONE_H - BORDER * 2

  roundRectPath(ctx, SCR_X, SCR_Y, SCR_W, SCR_H, INNER_R)
  ctx.fillStyle = '#000'
  ctx.fill()

  if (p.img) {
    ctx.save()
    roundRectPath(ctx, SCR_X, SCR_Y, SCR_W, SCR_H, INNER_R)
    ctx.clip()
    const scale = Math.min(SCR_W / p.img.width, SCR_H / p.img.height)
    const dw = p.img.width * scale
    const dh = p.img.height * scale
    const dx = SCR_X + (SCR_W - dw) / 2
    const dy = SCR_Y
    ctx.drawImage(p.img, dx, dy, dw, dh)
    ctx.restore()
  } else {
    ctx.fillStyle = 'rgba(255,255,255,0.04)'
    roundRectPath(ctx, SCR_X + 20 * s, SCR_Y + 20 * s, SCR_W - 40 * s, SCR_H - 40 * s, INNER_R - 8 * s)
    ctx.fill()
    ctx.fillStyle = 'rgba(255,255,255,0.28)'
    ctx.font = `${38 * s}px 'Helvetica Neue', Helvetica, Arial, sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('スクリーンショット', SCR_X + SCR_W / 2, SCR_Y + SCR_H / 2)
  }

  // 上部カットアウト（フレームタイプ別）
  if (p.frameType === 'island') {
    const diW = SCR_W * 0.27
    const diH = SCR_W * 0.047
    roundRectPath(ctx, SCR_X + (SCR_W - diW) / 2, SCR_Y + SCR_W * 0.022, diW, diH, diH / 2)
    ctx.fillStyle = '#000'
    ctx.fill()
  } else if (p.frameType === 'notch') {
    const nW = SCR_W * 0.5
    const nH = SCR_W * 0.048
    const nx = SCR_X + (SCR_W - nW) / 2
    const ny = SCR_Y
    const nr = nH * 0.6
    ctx.beginPath()
    ctx.moveTo(nx, ny)
    ctx.lineTo(nx + nW, ny)
    ctx.lineTo(nx + nW, ny + nH - nr)
    ctx.quadraticCurveTo(nx + nW, ny + nH, nx + nW - nr, ny + nH)
    ctx.lineTo(nx + nr, ny + nH)
    ctx.quadraticCurveTo(nx, ny + nH, nx, ny + nH - nr)
    ctx.closePath()
    ctx.fillStyle = '#000'
    ctx.fill()
  } else {
    // punch-hole
    const r = SCR_W * 0.022
    ctx.beginPath()
    ctx.arc(SCR_X + SCR_W / 2, SCR_Y + SCR_W * 0.035, r, 0, Math.PI * 2)
    ctx.fillStyle = '#000'
    ctx.fill()
  }

  // ホームインジケータ（iPhone系のみ）
  if (p.frameType !== 'punch') {
    const hiW = 120 * s
    roundRectPath(ctx, SCR_X + (SCR_W - hiW) / 2, SCR_Y + SCR_H - 22 * s, hiW, 5 * s, 3 * s)
    ctx.fillStyle = 'rgba(255,255,255,0.42)'
    ctx.fill()
  }

  // サイドボタン
  const BTN_R = 4 * s;
  [
    { x: PHONE_X - 8 * s, y: PHONE_Y + 180 * s, w: 8 * s, h: 64 * s },
    { x: PHONE_X - 8 * s, y: PHONE_Y + 264 * s, w: 8 * s, h: 64 * s },
    { x: PHONE_X + PHONE_W, y: PHONE_Y + 220 * s, w: 8 * s, h: 100 * s },
  ].forEach(({ x, y, w, h }) => {
    const btnGrad = ctx.createLinearGradient(x, y, x + w, y)
    btnGrad.addColorStop(0, '#3a3a3c')
    btnGrad.addColorStop(1, '#222224')
    roundRectPath(ctx, x, y, w, h, BTN_R)
    ctx.fillStyle = btnGrad
    ctx.fill()
    ctx.strokeStyle = 'rgba(255,255,255,0.10)'
    ctx.lineWidth = 1 * s
    ctx.stroke()
  })
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = url
  })
}

export function MockupBuilder() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null)
  const [catchcopy, setCatchcopy] = useState('アプリの\nキャッチコピー')
  const [fontSize, setFontSize] = useState(80)
  const [bgIndex, setBgIndex] = useState(0)
  const [frameType, setFrameType] = useState<FrameType>('island')
  const [sizeIndex, setSizeIndex] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [zipping, setZipping] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const device = DEVICE_PRESETS[sizeIndex]

  // プレビュー描画（選択中サイズ）
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    let cancelled = false

    const render = (img?: HTMLImageElement) => {
      if (cancelled) return
      drawMockup(ctx, device.w, device.h, { bgIndex, catchcopy, fontSize, frameType, img })
    }

    if (screenshotUrl) {
      loadImage(screenshotUrl).then(render).catch(() => render())
    } else {
      render()
    }
    return () => { cancelled = true }
  }, [screenshotUrl, catchcopy, fontSize, bgIndex, frameType, device.w, device.h])

  function setFile(file: File) {
    if (screenshotUrl) URL.revokeObjectURL(screenshotUrl)
    setScreenshotUrl(URL.createObjectURL(file))
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file?.type.startsWith('image/')) setFile(file)
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) setFile(file)
    e.target.value = ''
  }

  // 選択中サイズを単体PNGでダウンロード
  function handleDownload() {
    const canvas = canvasRef.current
    if (!canvas) return
    const link = document.createElement('a')
    link.download = `mockup_${device.file}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  // 全サイズを一括ZIPで生成（BOOTHデスクトップ版と同等）
  async function handleZip() {
    if (zipping) return
    setZipping(true)
    try {
      const img = screenshotUrl ? await loadImage(screenshotUrl).catch(() => null) : null
      const zip = new JSZip()
      for (const d of DEVICE_PRESETS) {
        const off = document.createElement('canvas')
        off.width = d.w
        off.height = d.h
        const octx = off.getContext('2d')
        if (!octx) continue
        drawMockup(octx, d.w, d.h, { bgIndex, catchcopy, fontSize, frameType, img })
        const blob = await new Promise<Blob | null>((res) => off.toBlob(res, 'image/png'))
        if (blob) zip.file(`mockup_${d.file}.png`, blob)
      }
      const out = await zip.generateAsync({ type: 'blob' })
      const url = URL.createObjectURL(out)
      const link = document.createElement('a')
      link.download = 'mockups.zip'
      link.href = url
      link.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } finally {
      setZipping(false)
    }
  }

  const displayW = 270
  const displayH = Math.round(displayW * (device.h / device.w))

  return (
    <div className="space-y-5">
      {/* Controls */}
      <div className="overflow-hidden rounded-xl border border-border bg-surface-hi divide-y divide-border">
        {/* Device size */}
        <div className="flex flex-wrap items-center gap-3 px-4 py-2.5">
          <span className="w-20 shrink-0 font-mono text-[10px] uppercase tracking-widest text-muted">
            サイズ
          </span>
          <div className="flex flex-wrap gap-1.5">
            {DEVICE_PRESETS.map((d, i) => (
              <button
                key={d.file}
                onClick={() => setSizeIndex(i)}
                className={`rounded-full border px-3 py-1 font-mono text-[10px] transition-all duration-150 ${
                  sizeIndex === i
                    ? 'border-teal/60 bg-teal/10 text-teal'
                    : 'border-border text-muted hover:border-border-hi hover:text-dim'
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        {/* Frame type */}
        <div className="flex flex-wrap items-center gap-3 px-4 py-2.5">
          <span className="w-20 shrink-0 font-mono text-[10px] uppercase tracking-widest text-muted">
            フレーム
          </span>
          <div className="flex flex-wrap gap-1.5">
            {FRAME_TYPES.map((f) => (
              <button
                key={f.key}
                onClick={() => setFrameType(f.key)}
                className={`rounded-full border px-3 py-1 font-mono text-[10px] transition-all duration-150 ${
                  frameType === f.key
                    ? 'border-teal/60 bg-teal/10 text-teal'
                    : 'border-border text-muted hover:border-border-hi hover:text-dim'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

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
              {device.w}×{device.h}px
            </span>
          </div>
          <div className="flex flex-col items-center gap-3 bg-surface-hi p-3">
            <canvas
              ref={canvasRef}
              width={device.w}
              height={device.h}
              className="rounded"
              style={{ width: `${displayW}px`, height: `${displayH}px`, display: 'block' }}
            />
            <div className="grid w-full grid-cols-2 gap-2">
              <button
                onClick={handleDownload}
                className="rounded-lg border border-border bg-surface px-4 py-2 font-mono text-sm font-semibold text-primary transition-colors hover:border-border-hi"
              >
                PNG（{device.label}）
              </button>
              <button
                onClick={handleZip}
                disabled={zipping}
                className="rounded-lg bg-teal px-4 py-2 font-mono text-sm font-semibold text-bg transition-opacity hover:opacity-80 disabled:opacity-50"
              >
                {zipping ? '生成中…' : '全サイズ ZIP'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
