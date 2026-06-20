'use client'

import { useState, useCallback, useMemo } from 'react'

interface SvgInfo {
  viewBox: string | null
  width: string | null
  height: string | null
  colors: string[]
}

interface ParseResult {
  valid: boolean
  svgContent: string | null
  error: string | null
  info: SvgInfo | null
}

function parseSvg(code: string): ParseResult {
  const trimmed = code.trim()
  if (!trimmed) return { valid: false, svgContent: null, error: null, info: null }

  if (!trimmed.toLowerCase().includes('<svg')) {
    return {
      valid: false,
      svgContent: null,
      error: 'SVG 要素が見つかりません。<svg> タグを含む SVG コードを貼り付けてください。',
      info: null,
    }
  }

  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(trimmed, 'image/svg+xml')
    const errorNode = doc.querySelector('parsererror')
    if (errorNode) {
      const msg = errorNode.textContent?.replace(/\s+/g, ' ').slice(0, 120) ?? ''
      return { valid: false, svgContent: null, error: `SVG 構文エラー: ${msg}`, info: null }
    }
    const svg = doc.querySelector('svg')
    if (!svg) {
      return { valid: false, svgContent: null, error: 'SVG 要素が見つかりません', info: null }
    }

    const viewBox = svg.getAttribute('viewBox')
    const width = svg.getAttribute('width')
    const height = svg.getAttribute('height')

    const colorSet = new Set<string>()
    doc.querySelectorAll('*').forEach((el) => {
      for (const attr of ['fill', 'stroke']) {
        const v = el.getAttribute(attr)
        if (v && v !== 'none' && v !== 'transparent' && v !== 'currentColor' && !v.startsWith('url(')) {
          colorSet.add(v.toLowerCase())
        }
      }
    })

    return {
      valid: true,
      svgContent: trimmed,
      error: null,
      info: { viewBox, width, height, colors: [...colorSet].slice(0, 5) },
    }
  } catch {
    return { valid: false, svgContent: null, error: 'SVG の解析に失敗しました', info: null }
  }
}

function getSvgDimensions(svgContent: string): { w: number; h: number } {
  try {
    const doc = new DOMParser().parseFromString(svgContent, 'image/svg+xml')
    const svg = doc.querySelector('svg')
    if (!svg) return { w: 300, h: 150 }
    const attrW = parseFloat(svg.getAttribute('width') ?? '')
    const attrH = parseFloat(svg.getAttribute('height') ?? '')
    if (!isNaN(attrW) && !isNaN(attrH)) return { w: attrW, h: attrH }
    const vb = svg.getAttribute('viewBox')
    if (vb) {
      const parts = vb.trim().split(/[\s,]+/)
      const w = parseFloat(parts[2])
      const h = parseFloat(parts[3])
      if (!isNaN(w) && !isNaN(h)) return { w, h }
    }
  } catch { /* ignore */ }
  return { w: 300, h: 150 }
}

export function SvgViewer() {
  const [code, setCode] = useState('')
  const [zoom, setZoom] = useState(100)
  const [copied, setCopied] = useState(false)

  const { valid, svgContent, error, info } = useMemo(() => parseSvg(code), [code])

  const handleCopy = useCallback(() => {
    if (!code.trim()) return
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }, [code])

  const handleClear = useCallback(() => {
    setCode('')
    setZoom(100)
  }, [])

  const handleDownload = useCallback(() => {
    if (!svgContent) return
    const { w, h } = getSvgDimensions(svgContent)
    const scale = zoom / 100
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, w * scale)
    canvas.height = Math.max(1, h * scale)
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const img = new Image()
    img.onload = () => {
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      const a = document.createElement('a')
      a.href = canvas.toDataURL('image/png')
      a.download = 'svg-export.png'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }
    img.onerror = () => {
      const a = document.createElement('a')
      a.href = url
      a.download = 'svg-export.svg'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    }
    img.src = url
  }, [svgContent, zoom])

  const lineCount = code ? code.split('\n').length : 0

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 overflow-hidden rounded border border-border">

        {/* ── Left: code editor ────────────────────── */}
        <div className="relative flex flex-col border-r border-border">
          {/* orange left-accent when valid */}
          <span
            aria-hidden="true"
            className={`absolute inset-y-0 left-0 z-10 w-[2px] transition-colors duration-300 ${
              valid ? 'bg-orange-500/50' : 'bg-transparent'
            }`}
          />

          {/* header */}
          <div className="flex items-center justify-between border-b border-border bg-surface/60 px-4 py-2.5">
            <div className="flex items-center gap-2.5">
              <span className="h-2 w-2 rounded-full bg-orange-500/70" />
              <span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-orange-400/80">
                SVG
              </span>
              {code && (
                <span className="font-mono text-[9px] tabular-nums text-muted/35">
                  {code.length} chars · {lineCount} lines
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleClear}
                className="rounded px-2 py-0.5 font-mono text-[9px] text-muted/40 transition-colors hover:text-muted"
              >
                Clear
              </button>
              <button
                onClick={handleCopy}
                disabled={!code.trim()}
                data-testid="copy-button"
                className={`rounded px-2.5 py-1 font-mono text-[9px] font-medium transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-25 ${
                  copied
                    ? 'bg-teal/15 text-teal'
                    : 'bg-surface-hi text-muted hover:bg-teal/10 hover:text-teal'
                }`}
              >
                {copied ? '✓ Copied!' : 'Copy'}
              </button>
            </div>
          </div>

          {/* textarea */}
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder={
              '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"\n     fill="none" stroke="#f97316" stroke-width="2">\n  <circle cx="12" cy="12" r="10"/>\n  <path d="M12 6v6l4 2"/>\n</svg>'
            }
            data-testid="svg-input"
            rows={17}
            spellCheck={false}
            className="flex-1 resize-none bg-bg p-4 pl-5 font-mono text-xs leading-relaxed text-primary placeholder:text-muted/15 focus:outline-none"
          />

          {/* info bar — pill badges */}
          {info && (
            <div
              className="border-t border-border bg-surface/30 px-4 py-2.5"
              data-testid="info-bar"
            >
              <div className="flex flex-wrap items-center gap-1.5">
                {info.viewBox && (
                  <span className="flex items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-0.5">
                    <span className="font-mono text-[8px] uppercase tracking-wide text-muted/40">
                      viewBox
                    </span>
                    <span className="font-mono text-[9px] text-dim">{info.viewBox}</span>
                  </span>
                )}
                {(info.width || info.height) && (
                  <span className="flex items-center gap-1 rounded-full border border-border bg-surface px-2.5 py-0.5">
                    <span className="font-mono text-[9px] text-dim">
                      {info.width ?? '—'} × {info.height ?? '—'}
                    </span>
                  </span>
                )}
                {info.colors.length > 0 && (
                  <span className="flex items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-0.5">
                    <span className="font-mono text-[8px] uppercase tracking-wide text-muted/40">
                      fill
                    </span>
                    <span className="flex items-center gap-1">
                      {info.colors.map((c, i) => (
                        <span
                          key={i}
                          title={c}
                          className="h-3 w-3 rounded-full border border-white/15"
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </span>
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Right: preview panel ─────────────────── */}
        <div className="flex flex-col">
          {/* header */}
          <div className="flex items-center justify-between border-b border-border bg-surface/40 px-4 py-2.5">
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted/60">
              Preview
            </span>
            <div className="flex items-center gap-3">
              {/* zoom control */}
              <div className="flex items-center gap-2">
                <span className="font-mono text-[9px] tabular-nums text-muted/50">{zoom}%</span>
                <input
                  type="range"
                  min={25}
                  max={400}
                  step={25}
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  data-testid="zoom-slider"
                  className="w-24 accent-orange-500"
                />
              </div>
              {/* download */}
              <button
                onClick={handleDownload}
                disabled={!valid}
                data-testid="download-btn"
                className={`flex items-center gap-1.5 rounded border px-2.5 py-1 font-mono text-[9px] font-medium transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-25 ${
                  valid
                    ? 'border-orange-500/30 bg-orange-500/10 text-orange-400 hover:bg-orange-500/20'
                    : 'border-border bg-surface text-muted'
                }`}
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <path d="M5 1v6M2 7l3 2 3-2" />
                  <path d="M1 9h8" />
                </svg>
                PNG
              </button>
            </div>
          </div>

          {/* canvas */}
          <div
            data-testid="preview-area"
            className="relative flex flex-1 items-center justify-center overflow-auto"
            style={{
              minHeight: '360px',
              backgroundImage: 'repeating-conic-gradient(#ffffff06 0% 25%, transparent 0% 50%)',
              backgroundSize: '16px 16px',
            }}
          >
            {/* empty state */}
            {!code.trim() && (
              <div className="flex flex-col items-center gap-3 select-none opacity-[0.18]">
                <svg
                  width="52"
                  height="52"
                  viewBox="0 0 52 52"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="text-primary"
                >
                  <rect x="2" y="2" width="48" height="48" rx="6" stroke="currentColor" strokeWidth="2" />
                  <path d="M10 36L20 22L28 30L36 20L42 28" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="20" cy="18" r="4" stroke="currentColor" strokeWidth="2" />
                </svg>
                <p className="font-mono text-xs tracking-wide text-primary">
                  SVGコードを貼り付けてください
                </p>
              </div>
            )}

            {/* error */}
            {error && code.trim() && (
              <div
                className="mx-6 max-w-[280px] rounded-lg border border-red-500/25 bg-red-500/8 px-4 py-3"
                data-testid="error-message"
              >
                <div className="mb-1.5 flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                  <span className="font-mono text-[8px] uppercase tracking-widest text-red-500/60">
                    Parse Error
                  </span>
                </div>
                <p className="font-mono text-[10px] leading-relaxed text-red-400">{error}</p>
              </div>
            )}

            {/* rendered SVG */}
            {valid && svgContent && (
              <div
                style={{
                  transform: `scale(${zoom / 100})`,
                  transformOrigin: 'center center',
                  transition: 'transform 0.1s ease',
                }}
                dangerouslySetInnerHTML={{ __html: svgContent }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
