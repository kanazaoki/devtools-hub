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

export function QrCode() {
  const [input, setInput] = useState('')
  const [opts, setOpts] = useState<QrOptions>({ size: 256, fg: '#000000', bg: '#ffffff' })
  const [error, setError] = useState('')
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const generate = useCallback(async () => {
    if (!input.trim()) { setError(''); return }
    try {
      await QRCode.toCanvas(canvasRef.current!, input.trim(), {
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
    if (!canvas || !input.trim()) return
    const a = document.createElement('a')
    a.href = canvas.toDataURL('image/png')
    a.download = 'qrcode.png'
    a.click()
  }

  const downloadSvg = async () => {
    if (!input.trim()) return
    try {
      const svg = await QRCode.toString(input.trim(), {
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

  const hasContent = input.trim().length > 0

  return (
    <div className="space-y-4">
      {/* Input */}
      <div className="space-y-1.5">
        <label className="font-mono text-[10px] uppercase tracking-widest text-muted">入力テキスト / URL</label>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="https://example.com"
          spellCheck={false}
          rows={3}
          className="w-full rounded-lg border border-border bg-bg p-3 font-mono text-xs leading-relaxed text-primary outline-none placeholder:text-muted/30 focus:border-border-hi transition-colors resize-none"
        />
        {input && (
          <div className="flex justify-end">
            <button
              onClick={() => setInput('')}
              className="rounded border border-border px-2.5 py-1 font-mono text-[10px] text-muted transition-colors hover:border-border-hi hover:text-dim"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* Options */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Size */}
        <div className="space-y-1.5">
          <label className="font-mono text-[10px] uppercase tracking-widest text-muted">サイズ</label>
          <div className="flex gap-1.5 flex-wrap">
            {SIZE_OPTIONS.map((s) => (
              <button
                key={s}
                onClick={() => setOpts((o) => ({ ...o, size: s }))}
                className={`rounded border px-2.5 py-1 font-mono text-[10px] transition-colors ${
                  opts.size === s
                    ? 'border-teal/40 bg-teal/10 text-teal'
                    : 'border-border text-muted hover:border-border-hi hover:text-dim'
                }`}
              >
                {s}px
              </button>
            ))}
          </div>
        </div>

        {/* Foreground */}
        <div className="space-y-1.5">
          <label className="font-mono text-[10px] uppercase tracking-widest text-muted">前景色</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={opts.fg}
              onChange={(e) => setOpts((o) => ({ ...o, fg: e.target.value }))}
              className="h-8 w-8 cursor-pointer rounded border border-border bg-surface-hi p-0.5"
            />
            <span className="font-mono text-xs text-dim">{opts.fg.toUpperCase()}</span>
          </div>
        </div>

        {/* Background */}
        <div className="space-y-1.5">
          <label className="font-mono text-[10px] uppercase tracking-widest text-muted">背景色</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={opts.bg}
              onChange={(e) => setOpts((o) => ({ ...o, bg: e.target.value }))}
              className="h-8 w-8 cursor-pointer rounded border border-border bg-surface-hi p-0.5"
            />
            <span className="font-mono text-xs text-dim">{opts.bg.toUpperCase()}</span>
          </div>
        </div>
      </div>

      {/* Preview + download */}
      <div className="flex flex-col items-center gap-4 rounded-lg border border-border bg-surface p-6">
        {error && (
          <p className="font-mono text-[11px] text-red-400">{error}</p>
        )}

        <div className={`transition-opacity duration-200 ${hasContent && !error ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
          <canvas
            ref={canvasRef}
            width={opts.size}
            height={opts.size}
            className="rounded"
            style={{ maxWidth: '100%', height: 'auto' }}
          />
        </div>

        {!hasContent && !error && (
          <div className="flex flex-col items-center gap-2 py-8">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="text-border-hi">
              <rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.5"/>
              <rect x="14" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.5"/>
              <rect x="3" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.5"/>
              <rect x="5" y="5" width="3" height="3" fill="currentColor"/>
              <rect x="16" y="5" width="3" height="3" fill="currentColor"/>
              <rect x="5" y="16" width="3" height="3" fill="currentColor"/>
              <path d="M14 14h2v2h-2zM18 14h3v2h-3zM14 18h2v3h-2zM18 18h3v3h-3z" fill="currentColor" opacity="0.5"/>
            </svg>
            <p className="font-mono text-[11px] text-muted/30">テキストを入力すると QR コードが表示されます</p>
          </div>
        )}

        {hasContent && !error && (
          <div className="flex gap-2">
            <button
              onClick={downloadPng}
              className="inline-flex items-center gap-1.5 rounded border border-border px-3 py-1.5 font-mono text-[11px] text-muted transition-colors hover:border-teal/40 hover:text-teal"
            >
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                <path d="M6 1v7M3 6l3 3 3-3M1 10h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              PNG
            </button>
            <button
              onClick={downloadSvg}
              className="inline-flex items-center gap-1.5 rounded border border-border px-3 py-1.5 font-mono text-[11px] text-muted transition-colors hover:border-teal/40 hover:text-teal"
            >
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                <path d="M6 1v7M3 6l3 3 3-3M1 10h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              SVG
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
