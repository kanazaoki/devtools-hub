'use client'

import { useState } from 'react'

type Direction = 'x' | 'y' | 'both'
type SnapType = 'mandatory' | 'proximity'
type SnapAlign = 'start' | 'center' | 'end'

const PREVIEW_ITEMS = [
  { label: '01', bg: 'bg-teal/20', border: 'border-teal/40' },
  { label: '02', bg: 'bg-blue-400/20', border: 'border-blue-400/40' },
  { label: '03', bg: 'bg-violet-400/20', border: 'border-violet-400/40' },
  { label: '04', bg: 'bg-amber-400/20', border: 'border-amber-400/40' },
  { label: '05', bg: 'bg-rose-400/20', border: 'border-rose-400/40' },
  { label: '06', bg: 'bg-emerald-400/20', border: 'border-emerald-400/40' },
]

function buildCss(dir: Direction, snapType: SnapType, snapAlign: SnapAlign, padding: number, margin: number): string {
  const axis = dir === 'both' ? 'both' : dir
  const lines = [
    '/* コンテナ */',
    `.scroll-container {`,
    `  overflow: ${dir === 'x' ? 'auto hidden' : dir === 'y' ? 'hidden auto' : 'auto'};`,
    `  scroll-snap-type: ${axis} ${snapType};`,
    padding > 0 ? `  scroll-padding: ${padding}px;` : null,
    `}`,
    '',
    '/* アイテム */',
    `.scroll-item {`,
    `  scroll-snap-align: ${snapAlign};`,
    margin > 0 ? `  scroll-margin: ${margin}px;` : null,
    `}`,
  ]
  return lines.filter((l) => l !== null).join('\n')
}

const SLIDER_CLASS = 'h-1 w-full cursor-pointer appearance-none rounded-full bg-border'

export function CssScrollSnapGenerator() {
  const [dir, setDir] = useState<Direction>('x')
  const [snapType, setSnapType] = useState<SnapType>('mandatory')
  const [snapAlign, setSnapAlign] = useState<SnapAlign>('start')
  const [padding, setPadding] = useState(0)
  const [margin, setMargin] = useState(0)
  const [copied, setCopied] = useState(false)

  const css = buildCss(dir, snapType, snapAlign, padding, margin)

  const handleCopy = () => {
    navigator.clipboard.writeText(css).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  const containerStyle: React.CSSProperties = {
    overflowX: dir === 'x' || dir === 'both' ? 'auto' : 'hidden',
    overflowY: dir === 'y' || dir === 'both' ? 'auto' : 'hidden',
    scrollSnapType: `${dir === 'both' ? 'both' : dir} ${snapType}`,
    scrollPadding: padding > 0 ? `${padding}px` : undefined,
    display: dir === 'y' ? 'flex' : 'flex',
    flexDirection: dir === 'y' ? 'column' : 'row',
  }

  const itemStyle: React.CSSProperties = {
    scrollSnapAlign: snapAlign,
    scrollMargin: margin > 0 ? `${margin}px` : undefined,
    flexShrink: 0,
    width: dir === 'y' ? '100%' : '80%',
    height: dir === 'y' ? '140px' : '160px',
  }

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      {/* Controls */}
      <div className="flex flex-col gap-5 lg:w-72 xl:w-80">
        {/* Direction */}
        <div>
          <p className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-widest text-muted">スクロール方向</p>
          <div className="flex gap-1">
            {(['x', 'y', 'both'] as Direction[]).map((d) => (
              <button
                key={d}
                onClick={() => setDir(d)}
                className={`flex-1 rounded border py-2 text-xs font-medium transition-colors ${
                  dir === d ? 'border-teal/50 bg-teal/10 text-teal' : 'border-border text-dim hover:border-teal/30 hover:text-primary'
                }`}
              >
                {d === 'x' ? '横 (x)' : d === 'y' ? '縦 (y)' : '両方'}
              </button>
            ))}
          </div>
        </div>

        {/* Snap Type */}
        <div>
          <p className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-widest text-muted">scroll-snap-type</p>
          <div className="flex gap-1">
            {(['mandatory', 'proximity'] as SnapType[]).map((t) => (
              <button
                key={t}
                onClick={() => setSnapType(t)}
                className={`flex-1 rounded border py-2 text-xs font-medium transition-colors ${
                  snapType === t ? 'border-teal/50 bg-teal/10 text-teal' : 'border-border text-dim hover:border-teal/30 hover:text-primary'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Snap Align */}
        <div>
          <p className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-widest text-muted">scroll-snap-align</p>
          <div className="flex gap-1">
            {(['start', 'center', 'end'] as SnapAlign[]).map((a) => (
              <button
                key={a}
                onClick={() => setSnapAlign(a)}
                className={`flex-1 rounded border py-2 text-xs font-medium transition-colors ${
                  snapAlign === a ? 'border-teal/50 bg-teal/10 text-teal' : 'border-border text-dim hover:border-teal/30 hover:text-primary'
                }`}
              >
                {a}
              </button>
            ))}
          </div>
        </div>

        {/* Scroll Padding */}
        <div>
          <div className="mb-1.5 flex justify-between">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-widest text-muted">scroll-padding</p>
            <span className="font-mono text-[10px] tabular-nums text-bright">{padding}px</span>
          </div>
          <input
            type="range" min={0} max={80} value={padding}
            onChange={(e) => setPadding(Number(e.target.value))}
            className={SLIDER_CLASS}
            style={{ accentColor: '#14b8a6' }}
          />
        </div>

        {/* Scroll Margin */}
        <div>
          <div className="mb-1.5 flex justify-between">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-widest text-muted">scroll-margin</p>
            <span className="font-mono text-[10px] tabular-nums text-bright">{margin}px</span>
          </div>
          <input
            type="range" min={0} max={40} value={margin}
            onChange={(e) => setMargin(Number(e.target.value))}
            className={SLIDER_CLASS}
            style={{ accentColor: '#14b8a6' }}
          />
        </div>
      </div>

      {/* Right: Preview + Output */}
      <div className="flex flex-1 flex-col gap-4">
        {/* Preview */}
        <div className="rounded border border-border">
          <div className="border-b border-border px-4 py-2.5">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-widest text-muted">プレビュー（スクロールできます）</p>
          </div>
          <div className="p-4">
            <div
              className="rounded border border-border/60 bg-[#070d1a]"
              style={{
                ...containerStyle,
                maxHeight: dir === 'y' ? '200px' : undefined,
                gap: '12px',
                padding: '12px',
              }}
            >
              {PREVIEW_ITEMS.map((item) => (
                <div
                  key={item.label}
                  className={`rounded border ${item.bg} ${item.border} flex items-center justify-center`}
                  style={itemStyle}
                >
                  <span className="font-mono text-2xl font-bold text-bright/60">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
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
          <div className="rounded border border-border bg-[#070d1a] p-4">
            <pre className="overflow-x-auto font-mono text-xs leading-relaxed text-bright">{css}</pre>
          </div>
        </div>
      </div>
    </div>
  )
}
