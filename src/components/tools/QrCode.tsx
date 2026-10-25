'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import QRCode from 'qrcode'

const SIZE_OPTIONS = [128, 256, 384, 512] as const
type SizeOption = typeof SIZE_OPTIONS[number]

interface QrOptions {
  size: SizeOption
  fg: string
  bg: string
}

function ScannerCorner({ pos }: { pos: 'tl' | 'tr' | 'bl' | 'br' }) {
  const base = 'absolute w-5 h-5 pointer-events-none'
  const corners: Record<string, string> = {
    tl: 'top-0 left-0 border-t-2 border-l-2',
    tr: 'top-0 right-0 border-t-2 border-r-2',
    bl: 'bottom-0 left-0 border-b-2 border-l-2',
    br: 'bottom-0 right-0 border-b-2 border-r-2',
  }
  return <span className={`${base} ${corners[pos]} border-teal/60`} aria-hidden="true" />
}

// Wi-Fi の QR は WIFI:T:WPA;S:名前;P:パスワード;; の形。名前とパスワードの中の \ ; , : " は \ で逃がす必要がある
function wifiString(ssid: string, password: string, enc: 'WPA' | 'WEP' | 'nopass', hidden: boolean): string {
  const esc = (v: string) => v.replace(/([\\;,:"])/g, '\\$1')
  return `WIFI:T:${enc};S:${esc(ssid)};${enc === 'nopass' ? '' : `P:${esc(password)};`}${hidden ? 'H:true;' : ''};`
}

function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16)
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => { const x = v / 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4 })
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
}

export function QrCode() {
  const [input, setInput] = useState('')
  const [mode, setMode] = useState<'text' | 'wifi'>('text')
  const [wifi, setWifi] = useState({ ssid: '', password: '', enc: 'WPA' as 'WPA' | 'WEP' | 'nopass', hidden: false })
  const [opts, setOpts] = useState<QrOptions>({ size: 256, fg: '#000000', bg: '#ffffff' })
  const [error, setError] = useState('')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const content = mode === 'text' ? input.trim() : wifi.ssid ? wifiString(wifi.ssid, wifi.password, wifi.enc, wifi.hidden) : ''
  // 読み取れない色の組み合わせ：明暗の差が小さい、または明るい点を暗い背景に置く（読めないアプリが多い）
  const lf = luminance(opts.fg), lb = luminance(opts.bg)
  const colorWarning = lf > lb
    ? '前景が背景より明るい（白黒反転）と、読み取れないアプリが多くあります。前景を暗い色にしてください。'
    : (lb + 0.05) / (lf + 0.05) < 4
      ? '前景と背景の明るさの差が小さく、読み取りにくくなります。'
      : ''

  const generate = useCallback(async () => {
    if (!content) { setError(''); return }
    try {
      await QRCode.toCanvas(canvasRef.current!, content, {
        width: opts.size,
        margin: 2,
        color: { dark: opts.fg, light: opts.bg },
        errorCorrectionLevel: 'M',
      })
      setError('')
    } catch {
      setError('QR コードを生成できませんでした（入力が長すぎる可能性があります）')
    }
  }, [input, opts])

  useEffect(() => { generate() }, [generate])

  const downloadPng = () => {
    const canvas = canvasRef.current
    if (!canvas || !content) return
    const a = document.createElement('a')
    a.href = canvas.toDataURL('image/png')
    a.download = 'qrcode.png'
    a.click()
  }

  const downloadSvg = async () => {
    if (!content) return
    try {
      const svg = await QRCode.toString(content, {
        type: 'svg',
        width: opts.size,
        margin: 2,
        color: { dark: opts.fg, light: opts.bg },
        errorCorrectionLevel: 'M',
      })
      const blob = new Blob([svg], { type: 'image/svg+xml' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'qrcode.svg'
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      setError('SVG の生成に失敗しました')
    }
  }

  const hasContent = content.length > 0 && !error

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-[1fr_auto]">

      {/* ── Left: controls ── */}
      <div className="flex flex-col gap-5">

        <div className="flex gap-1.5">
          {([['text', 'テキスト / URL'], ['wifi', 'Wi-Fi']] as const).map(([m, label]) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`rounded border px-2.5 py-1 font-mono text-[10px] ${mode === m ? 'border-teal/40 bg-teal/10 text-teal' : 'border-border text-muted hover:text-dim'}`}
            >
              {label}
            </button>
          ))}
        </div>

        {mode === 'wifi' ? (
          <div className="flex flex-col gap-2">
            <input value={wifi.ssid} onChange={(e) => setWifi((w) => ({ ...w, ssid: e.target.value }))} placeholder="ネットワーク名（SSID）" className="rounded-md border border-border bg-bg px-3 py-2 font-mono text-xs text-primary outline-none focus:border-teal/40" />
            {wifi.enc !== 'nopass' && (
              <input value={wifi.password} onChange={(e) => setWifi((w) => ({ ...w, password: e.target.value }))} placeholder="パスワード" className="rounded-md border border-border bg-bg px-3 py-2 font-mono text-xs text-primary outline-none focus:border-teal/40" />
            )}
            <div className="flex flex-wrap items-center gap-3 font-mono text-[11px] text-muted">
              <select value={wifi.enc} onChange={(e) => setWifi((w) => ({ ...w, enc: e.target.value as 'WPA' | 'WEP' | 'nopass' }))} className="rounded border border-border bg-bg px-2 py-1 text-primary">
                <option value="WPA">WPA / WPA2 / WPA3</option>
                <option value="WEP">WEP</option>
                <option value="nopass">パスワードなし</option>
              </select>
              <label className="flex items-center gap-1"><input type="checkbox" checked={wifi.hidden} onChange={(e) => setWifi((w) => ({ ...w, hidden: e.target.checked }))} className="accent-teal" />ステルス（非公開）ネットワーク</label>
            </div>
            {content && <p className="break-all font-mono text-[10px] text-muted/70">{content}</p>}
            <p className="text-[10px] text-muted/60">パスワードは QR の中にそのまま入ります。画像を共有する相手に注意してください（このページは何も送信しません）。</p>
          </div>
        ) : (
        <div className="flex flex-col gap-1.5">
          <label className="font-mono text-[10px] uppercase tracking-widest text-muted">テキスト / URL</label>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="https://example.com"
            spellCheck={false}
            rows={4}
            className="w-full rounded-md border border-border bg-bg p-3 font-mono text-xs leading-relaxed text-primary outline-none placeholder:text-muted/25 focus:border-border-hi transition-colors resize-none"
          />
        </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label className="font-mono text-[10px] uppercase tracking-widest text-muted">サイズ</label>
          <div className="flex gap-1.5">
            {SIZE_OPTIONS.map((s) => (
              <button
                key={s}
                onClick={() => setOpts((o) => ({ ...o, size: s }))}
                className={`rounded border px-2.5 py-1 font-mono text-[10px] transition-all duration-100 ${
                  opts.size === s
                    ? 'border-teal/40 bg-teal/10 text-teal'
                    : 'border-border text-muted hover:border-border-hi hover:text-dim'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="font-mono text-[10px] uppercase tracking-widest text-muted">前景色</label>
            <label className="flex cursor-pointer items-center gap-2.5 rounded-md border border-border bg-bg px-3 py-2 transition-colors hover:border-border-hi group">
              <span className="h-4 w-4 shrink-0 rounded-sm border border-white/10" style={{ background: opts.fg }} />
              <span className="font-mono text-[11px] text-dim group-hover:text-primary transition-colors">{opts.fg.toUpperCase()}</span>
              <input type="color" value={opts.fg} onChange={(e) => setOpts((o) => ({ ...o, fg: e.target.value }))} className="sr-only" />
            </label>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="font-mono text-[10px] uppercase tracking-widest text-muted">背景色</label>
            <label className="flex cursor-pointer items-center gap-2.5 rounded-md border border-border bg-bg px-3 py-2 transition-colors hover:border-border-hi group">
              <span className="h-4 w-4 shrink-0 rounded-sm border border-white/10" style={{ background: opts.bg }} />
              <span className="font-mono text-[11px] text-dim group-hover:text-primary transition-colors">{opts.bg.toUpperCase()}</span>
              <input type="color" value={opts.bg} onChange={(e) => setOpts((o) => ({ ...o, bg: e.target.value }))} className="sr-only" />
            </label>
          </div>
        </div>

        {input && (
          <button onClick={() => setInput('')} className="self-start rounded border border-border px-2.5 py-1 font-mono text-[10px] text-muted/60 transition-colors hover:border-border-hi hover:text-dim">
            Clear
          </button>
        )}

        {error && <p className="font-mono text-[11px] text-red-400">{error}</p>}
        {colorWarning && <p className="font-mono text-[11px] text-amber-300">⚠ {colorWarning}</p>}
      </div>

      {/* ── Right: scanner frame ── */}
      <div className="flex flex-col items-center gap-4 md:min-w-[288px]">

        <div className="relative p-5">
          <ScannerCorner pos="tl" />
          <ScannerCorner pos="tr" />
          <ScannerCorner pos="bl" />
          <ScannerCorner pos="br" />

          <div className={`transition-opacity duration-200 ${hasContent ? 'opacity-100' : 'opacity-0 pointer-events-none absolute inset-5'}`}>
            <canvas
              ref={canvasRef}
              width={opts.size}
              height={opts.size}
              className="rounded-sm"
              style={{ display: 'block', maxWidth: '256px', height: 'auto' }}
            />
          </div>

          {!hasContent && (
            <div className="flex h-[256px] w-[256px] flex-col items-center justify-center gap-3">
              <svg width="44" height="44" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="text-border-hi/60">
                <rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.2"/>
                <rect x="14" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.2"/>
                <rect x="3" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.2"/>
                <rect x="5" y="5" width="3" height="3" fill="currentColor"/>
                <rect x="16" y="5" width="3" height="3" fill="currentColor"/>
                <rect x="5" y="16" width="3" height="3" fill="currentColor"/>
                <path d="M14 14h2v2h-2zM18 14h3v2h-3zM14 18h2v3h-2zM18 18h3v3h-3z" fill="currentColor" opacity="0.4"/>
              </svg>
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted/30">ready to scan</p>
            </div>
          )}
        </div>

        <div className={`flex gap-2 transition-opacity duration-200 ${hasContent ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
          <button
            onClick={downloadPng}
            className="inline-flex items-center gap-1.5 rounded border border-border bg-surface px-4 py-2 font-mono text-[11px] text-muted transition-all hover:border-teal/40 hover:bg-teal/5 hover:text-teal"
          >
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true">
              <path d="M6 1v7M3 6l3 3 3-3M1 10h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            PNG
          </button>
          <button
            onClick={downloadSvg}
            className="inline-flex items-center gap-1.5 rounded border border-border bg-surface px-4 py-2 font-mono text-[11px] text-muted transition-all hover:border-teal/40 hover:bg-teal/5 hover:text-teal"
          >
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true">
              <path d="M6 1v7M3 6l3 3 3-3M1 10h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            SVG
          </button>
        </div>

        {hasContent && (
          <p className="font-mono text-[10px] text-muted/40">{content.length} chars</p>
        )}
      </div>
    </div>
  )
}
