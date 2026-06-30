'use client'

import { useState, useMemo } from 'react'

type PatternType = 'stripes-h' | 'stripes-v' | 'stripes-d' | 'grid' | 'dots' | 'checker'

interface PatternConfig {
  type: PatternType
  fgColor: string
  bgColor: string
  size: number
  angle: number
  opacity: number
  lineWidth: number
}

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

function buildCss(cfg: PatternConfig): string {
  const { type, fgColor, bgColor, size, angle, opacity, lineWidth } = cfg
  const fg = hexToRgba(fgColor, opacity)

  switch (type) {
    case 'stripes-h':
      return `.pattern {
  background-color: ${bgColor};
  background-image: repeating-linear-gradient(
    0deg,
    ${fg},
    ${fg} ${lineWidth}px,
    transparent ${lineWidth}px,
    transparent ${size}px
  );
}`

    case 'stripes-v':
      return `.pattern {
  background-color: ${bgColor};
  background-image: repeating-linear-gradient(
    90deg,
    ${fg},
    ${fg} ${lineWidth}px,
    transparent ${lineWidth}px,
    transparent ${size}px
  );
}`

    case 'stripes-d':
      return `.pattern {
  background-color: ${bgColor};
  background-image: repeating-linear-gradient(
    ${angle}deg,
    ${fg},
    ${fg} ${lineWidth}px,
    transparent ${lineWidth}px,
    transparent ${size}px
  );
}`

    case 'grid':
      return `.pattern {
  background-color: ${bgColor};
  background-image:
    repeating-linear-gradient(0deg, ${fg}, ${fg} ${lineWidth}px, transparent ${lineWidth}px, transparent ${size}px),
    repeating-linear-gradient(90deg, ${fg}, ${fg} ${lineWidth}px, transparent ${lineWidth}px, transparent ${size}px);
}`

    case 'dots':
      return `.pattern {
  background-color: ${bgColor};
  background-image: radial-gradient(
    circle,
    ${fg} ${Math.round(lineWidth)}px,
    transparent ${Math.round(lineWidth)}px
  );
  background-size: ${size}px ${size}px;
}`

    case 'checker':
      return `.pattern {
  background-color: ${bgColor};
  background-image:
    repeating-conic-gradient(${fg} 0% 25%, transparent 0% 50%);
  background-size: ${size}px ${size}px;
}`
  }
}

function buildStyle(cfg: PatternConfig): React.CSSProperties {
  const { type, fgColor, bgColor, size, angle, opacity, lineWidth } = cfg
  const fg = hexToRgba(fgColor, opacity)

  switch (type) {
    case 'stripes-h':
      return {
        backgroundColor: bgColor,
        backgroundImage: `repeating-linear-gradient(0deg,${fg},${fg} ${lineWidth}px,transparent ${lineWidth}px,transparent ${size}px)`,
      }
    case 'stripes-v':
      return {
        backgroundColor: bgColor,
        backgroundImage: `repeating-linear-gradient(90deg,${fg},${fg} ${lineWidth}px,transparent ${lineWidth}px,transparent ${size}px)`,
      }
    case 'stripes-d':
      return {
        backgroundColor: bgColor,
        backgroundImage: `repeating-linear-gradient(${angle}deg,${fg},${fg} ${lineWidth}px,transparent ${lineWidth}px,transparent ${size}px)`,
      }
    case 'grid':
      return {
        backgroundColor: bgColor,
        backgroundImage: `repeating-linear-gradient(0deg,${fg},${fg} ${lineWidth}px,transparent ${lineWidth}px,transparent ${size}px),repeating-linear-gradient(90deg,${fg},${fg} ${lineWidth}px,transparent ${lineWidth}px,transparent ${size}px)`,
      }
    case 'dots':
      return {
        backgroundColor: bgColor,
        backgroundImage: `radial-gradient(circle,${fg} ${lineWidth}px,transparent ${lineWidth}px)`,
        backgroundSize: `${size}px ${size}px`,
      }
    case 'checker':
      return {
        backgroundColor: bgColor,
        backgroundImage: `repeating-conic-gradient(${fg} 0% 25%,transparent 0% 50%)`,
        backgroundSize: `${size}px ${size}px`,
      }
  }
}

const PATTERNS: { key: PatternType; label: string }[] = [
  { key: 'stripes-h', label: '横ストライプ' },
  { key: 'stripes-v', label: '縦ストライプ' },
  { key: 'stripes-d', label: '斜めストライプ' },
  { key: 'grid', label: 'グリッド' },
  { key: 'dots', label: 'ドット' },
  { key: 'checker', label: 'チェッカー' },
]

const hasAngle = (t: PatternType) => t === 'stripes-d'

export function CssPatternGenerator() {
  const [cfg, setCfg] = useState<PatternConfig>({
    type: 'stripes-d',
    fgColor: '#14b8a6',
    bgColor: '#060a12',
    size: 20,
    angle: 45,
    opacity: 0.4,
    lineWidth: 2,
  })
  const [copied, setCopied] = useState(false)

  const css = useMemo(() => buildCss(cfg), [cfg])
  const previewStyle = useMemo(() => buildStyle(cfg), [cfg])

  const set = <K extends keyof PatternConfig>(key: K, val: PatternConfig[K]) =>
    setCfg((c) => ({ ...c, [key]: val }))

  const handleCopy = () => {
    navigator.clipboard.writeText(css).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  const fmtOpacity = (v: number) => Math.round(v * 100) + '%'

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      {/* Controls */}
      <div className="flex flex-col gap-5 lg:w-72 xl:w-80">
        {/* Pattern type */}
        <div>
          <p className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-widest text-muted">パターン</p>
          <div className="grid grid-cols-3 gap-1">
            {PATTERNS.map(({ key, label }) => {
              const miniStyle: React.CSSProperties = (() => {
                const fg = 'rgba(20,184,166,0.5)'
                const bg = '#060a12'
                switch (key) {
                  case 'stripes-h': return { backgroundImage: `repeating-linear-gradient(0deg,${fg},${fg} 2px,transparent 2px,transparent 10px)`, backgroundColor: bg }
                  case 'stripes-v': return { backgroundImage: `repeating-linear-gradient(90deg,${fg},${fg} 2px,transparent 2px,transparent 10px)`, backgroundColor: bg }
                  case 'stripes-d': return { backgroundImage: `repeating-linear-gradient(45deg,${fg},${fg} 2px,transparent 2px,transparent 10px)`, backgroundColor: bg }
                  case 'grid': return { backgroundImage: `repeating-linear-gradient(0deg,${fg},${fg} 1px,transparent 1px,transparent 10px),repeating-linear-gradient(90deg,${fg},${fg} 1px,transparent 1px,transparent 10px)`, backgroundColor: bg }
                  case 'dots': return { backgroundImage: `radial-gradient(circle,${fg} 2px,transparent 2px)`, backgroundSize: '10px 10px', backgroundColor: bg }
                  case 'checker': return { backgroundImage: `repeating-conic-gradient(${fg} 0% 25%,transparent 0% 50%)`, backgroundSize: '10px 10px', backgroundColor: bg }
                }
              })()
              return (
                <button
                  key={key}
                  onClick={() => set('type', key)}
                  className={`group flex flex-col items-center gap-1 rounded border py-2 px-1 text-xs font-medium transition-all ${
                    cfg.type === key
                      ? 'border-teal/50 bg-teal/5 text-teal'
                      : 'border-border text-dim hover:border-teal/30 hover:text-primary'
                  }`}
                >
                  <div className="h-8 w-full rounded overflow-hidden border border-white/5" style={miniStyle} />
                  <span className="text-[10px]">{label}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Colors */}
        <div className="rounded-lg border border-border bg-[#070d1a] p-4 flex flex-col gap-3">
          <div>
            <p className="mb-1.5 font-mono text-[10px] font-semibold uppercase tracking-widest text-muted">パターン色</p>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={cfg.fgColor}
                onChange={(e) => set('fgColor', e.target.value)}
                className="h-8 w-10 cursor-pointer rounded border border-border bg-transparent"
              />
              <input
                type="text"
                value={cfg.fgColor}
                onChange={(e) => /^#[0-9a-fA-F]{0,6}$/.test(e.target.value) && set('fgColor', e.target.value)}
                className="flex-1 rounded border border-border bg-[#060a12] px-2 py-1.5 font-mono text-xs text-bright outline-none focus:border-teal"
              />
            </div>
          </div>
          <div>
            <p className="mb-1.5 font-mono text-[10px] font-semibold uppercase tracking-widest text-muted">背景色</p>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={cfg.bgColor}
                onChange={(e) => set('bgColor', e.target.value)}
                className="h-8 w-10 cursor-pointer rounded border border-border bg-transparent"
              />
              <input
                type="text"
                value={cfg.bgColor}
                onChange={(e) => /^#[0-9a-fA-F]{0,6}$/.test(e.target.value) && set('bgColor', e.target.value)}
                className="flex-1 rounded border border-border bg-[#060a12] px-2 py-1.5 font-mono text-xs text-bright outline-none focus:border-teal"
              />
            </div>
          </div>
        </div>

        {/* Sliders */}
        <div className="rounded-lg border border-border bg-[#070d1a] p-4 flex flex-col gap-4">
          {[
            { label: 'サイズ (繰り返し)', key: 'size' as const, min: 4, max: 120, val: cfg.size, fmt: (v: number) => `${v}px` },
            { label: 'ライン幅', key: 'lineWidth' as const, min: 1, max: 30, val: cfg.lineWidth, fmt: (v: number) => `${v}px` },
            { label: '透明度', key: 'opacity' as const, min: 0.05, max: 1, step: 0.05, val: cfg.opacity, fmt: fmtOpacity },
            ...(hasAngle(cfg.type) ? [{ label: '角度', key: 'angle' as const, min: 0, max: 180, val: cfg.angle, fmt: (v: number) => `${v}°` }] : []),
          ].map(({ label, key, min, max, step, val, fmt }) => (
            <div key={key}>
              <div className="mb-2 flex justify-between">
                <span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-muted">{label}</span>
                <span className="font-mono text-[10px] tabular-nums text-bright">{fmt(val)}</span>
              </div>
              <input
                type="range"
                min={min}
                max={max}
                step={step ?? 1}
                value={val}
                onChange={(e) => set(key, Number(e.target.value) as PatternConfig[typeof key])}
                className="h-1 w-full cursor-pointer appearance-none rounded-full bg-border"
                style={{ accentColor: '#14b8a6' }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Preview + Output */}
      <div className="flex flex-1 flex-col gap-4">
        {/* Preview */}
        <div className="rounded-lg border border-border overflow-hidden">
          <div className="border-b border-border bg-[#070d1a] px-4 py-2.5">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-widest text-muted">ライブプレビュー</p>
          </div>
          <div style={{ ...previewStyle, height: '220px', width: '100%' }} />
        </div>

        {/* CSS Output */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-widest text-muted">CSS 出力</p>
            <button
              onClick={handleCopy}
              className={`rounded border px-3 py-1.5 text-xs font-medium transition-colors ${
                copied ? 'border-teal/50 text-teal' : 'border-border text-dim hover:border-teal/50 hover:text-teal'
              }`}
            >
              {copied ? '✓ コピー済み' : 'コピー'}
            </button>
          </div>
          <div className="rounded-lg border border-border bg-[#060a12] p-4">
            <pre className="overflow-x-auto font-mono text-xs leading-relaxed text-bright">{css}</pre>
          </div>
        </div>
      </div>
    </div>
  )
}
