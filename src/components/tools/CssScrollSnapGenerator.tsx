'use client'

import { useState } from 'react'

type Direction = 'x' | 'y' | 'both'
type SnapType = 'mandatory' | 'proximity'
type SnapAlign = 'start' | 'center' | 'end'

const SLIDES = [
  { num: '01', accent: '#14b8a6', label: 'Teal',   sub: 'scroll-snap-align' },
  { num: '02', accent: '#60a5fa', label: 'Blue',   sub: 'scroll-snap-type'  },
  { num: '03', accent: '#a78bfa', label: 'Violet', sub: 'scroll-padding'    },
  { num: '04', accent: '#fb923c', label: 'Orange', sub: 'scroll-margin'     },
  { num: '05', accent: '#34d399', label: 'Emerald',sub: 'overflow: auto'    },
  { num: '06', accent: '#f472b6', label: 'Pink',   sub: 'scroll-behavior'   },
]

function buildCss(dir: Direction, snapType: SnapType, snapAlign: SnapAlign, padding: number, margin: number): string {
  const axis = dir === 'both' ? 'both' : dir
  const lines = [
    '/* コンテナ */',
    `.scroll-container {`,
    `  overflow: ${dir === 'x' ? 'auto hidden' : dir === 'y' ? 'hidden auto' : 'auto'};`,
    `  scroll-snap-type: ${axis} ${snapType};`,
    ...(padding > 0 ? [`  scroll-padding: ${padding}px;`] : []),
    `}`,
    '',
    '/* アイテム */',
    `.scroll-item {`,
    `  scroll-snap-align: ${snapAlign};`,
    ...(margin > 0 ? [`  scroll-margin: ${margin}px;`] : []),
    `}`,
  ]
  return lines.join('\n')
}

const BTN_BASE = 'flex-1 rounded border py-2 text-xs font-medium transition-colors'
const BTN_ON  = 'border-teal/50 bg-teal/10 text-teal'
const BTN_OFF = 'border-border text-dim hover:border-teal/30 hover:text-primary'

export function CssScrollSnapGenerator() {
  const [dir, setDir]           = useState<Direction>('x')
  const [snapType, setSnapType] = useState<SnapType>('mandatory')
  const [snapAlign, setSnapAlign] = useState<SnapAlign>('start')
  const [padding, setPadding]   = useState(0)
  const [margin, setMargin]     = useState(0)
  const [copied, setCopied]     = useState(false)

  const css = buildCss(dir, snapType, snapAlign, padding, margin)

  const handleCopy = () => {
    navigator.clipboard.writeText(css).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 1500)
    })
  }

  const containerStyle: React.CSSProperties = {
    overflowX:       dir !== 'y' ? 'auto' : 'hidden',
    overflowY:       dir !== 'x' ? 'auto' : 'hidden',
    scrollSnapType:  `${dir} ${snapType}`,
    scrollPadding:   padding > 0 ? `${padding}px` : undefined,
    display:         'flex',
    flexDirection:   dir === 'y' ? 'column' : 'row',
    gap:             '10px',
    padding:         '10px',
  }

  const itemStyle: React.CSSProperties = {
    scrollSnapAlign: snapAlign,
    scrollMargin:    margin > 0 ? `${margin}px` : undefined,
    flexShrink:      0,
    width:           dir === 'y' ? '100%' : '82%',
    height:          dir === 'y' ? '130px' : '170px',
  }

  const alignHint = { start: '← 左端', center: '↔ 中央', end: '→ 右端' }[snapAlign]

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      {/* Controls */}
      <div className="flex flex-col gap-5 lg:w-72 xl:w-80">
        <div>
          <p className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-widest text-muted">スクロール方向</p>
          <div className="flex gap-1">
            {(['x', 'y', 'both'] as Direction[]).map((d) => (
              <button key={d} onClick={() => setDir(d)} className={`${BTN_BASE} ${dir === d ? BTN_ON : BTN_OFF}`}>
                {d === 'x' ? '→ 横' : d === 'y' ? '↓ 縦' : '↗ 両方'}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-1.5 font-mono text-[10px] font-semibold uppercase tracking-widest text-muted">scroll-snap-type</p>
          <p className="mb-2 font-mono text-[10px] text-border">
            mandatory = 必ずスナップ / proximity = 近い場合のみ
          </p>
          <div className="flex gap-1">
            {(['mandatory', 'proximity'] as SnapType[]).map((t) => (
              <button key={t} onClick={() => setSnapType(t)} className={`${BTN_BASE} ${snapType === t ? BTN_ON : BTN_OFF}`}>
                {t}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-1.5 font-mono text-[10px] font-semibold uppercase tracking-widest text-muted">scroll-snap-align</p>
          <p className="mb-2 font-mono text-[10px] text-border">現在: <span className="text-teal">{alignHint}</span></p>
          <div className="flex gap-1">
            {(['start', 'center', 'end'] as SnapAlign[]).map((a) => (
              <button key={a} onClick={() => setSnapAlign(a)} className={`${BTN_BASE} ${snapAlign === a ? BTN_ON : BTN_OFF}`}>
                {a}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-4 rounded-lg border border-border bg-[#070d1a] p-4">
          <div>
            <div className="mb-2 flex justify-between">
              <span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-muted">scroll-padding</span>
              <span className="font-mono text-[10px] tabular-nums text-bright">{padding}px</span>
            </div>
            <input type="range" min={0} max={80} value={padding}
              onChange={(e) => setPadding(Number(e.target.value))}
              className="h-1 w-full cursor-pointer appearance-none rounded-full bg-border"
              style={{ accentColor: '#14b8a6' }}
            />
          </div>
          <div>
            <div className="mb-2 flex justify-between">
              <span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-muted">scroll-margin</span>
              <span className="font-mono text-[10px] tabular-nums text-bright">{margin}px</span>
            </div>
            <input type="range" min={0} max={40} value={margin}
              onChange={(e) => setMargin(Number(e.target.value))}
              className="h-1 w-full cursor-pointer appearance-none rounded-full bg-border"
              style={{ accentColor: '#14b8a6' }}
            />
          </div>
        </div>
      </div>

      {/* Preview + Output */}
      <div className="flex flex-1 flex-col gap-4">
        {/* Preview */}
        <div className="rounded-lg border border-border overflow-hidden">
          <div className="border-b border-border bg-[#070d1a] px-4 py-2.5 flex items-center justify-between">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-widest text-muted">
              ライブプレビュー
            </p>
            <span className="font-mono text-[10px] text-border">← スクロールして体験</span>
          </div>
          <div className="bg-[#060a12] p-3">
            {/* snap-align position indicator */}
            <div className="mb-2 flex items-center gap-1.5">
              <div className="h-px flex-1 bg-border/30" />
              <span className="font-mono text-[10px] text-border">{snapAlign}</span>
              <div className="h-px flex-1 bg-border/30" />
            </div>
            <div
              className="rounded-lg border border-border/60"
              style={{
                ...containerStyle,
                maxHeight: dir === 'y' ? '220px' : undefined,
              }}
            >
              {SLIDES.map((s) => (
                <div
                  key={s.num}
                  className="rounded-md border border-white/5 relative overflow-hidden"
                  style={{
                    ...itemStyle,
                    background: `linear-gradient(135deg, ${s.accent}18 0%, #060a12 60%)`,
                    borderColor: `${s.accent}30`,
                  }}
                >
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 p-3">
                    <span className="font-mono text-4xl font-bold leading-none" style={{ color: `${s.accent}60` }}>
                      {s.num}
                    </span>
                    <span className="font-mono text-xs font-semibold" style={{ color: s.accent }}>
                      {s.label}
                    </span>
                    <span className="font-mono text-[9px] text-border/80">{s.sub}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CSS Output */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-widest text-muted">CSS 出力</p>
            <button onClick={handleCopy}
              className={`rounded border px-3 py-1.5 text-xs font-medium transition-colors ${copied ? 'border-teal/50 text-teal' : 'border-border text-dim hover:border-teal/50 hover:text-teal'}`}
            >{copied ? '✓ コピー済み' : 'コピー'}</button>
          </div>
          <div className="rounded-lg border border-border bg-[#060a12] p-4">
            <pre className="overflow-x-auto font-mono text-xs leading-relaxed text-bright">{css}</pre>
          </div>
        </div>
      </div>
    </div>
  )
}
