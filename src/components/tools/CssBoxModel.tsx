'use client'

import { useState, useCallback } from 'react'

type Side = 'top' | 'right' | 'bottom' | 'left'
type BoxProp = 'margin' | 'padding' | 'border'

interface BoxValues { top: number; right: number; bottom: number; left: number }

const DEFAULT: Record<BoxProp, BoxValues> = {
  margin:  { top: 20, right: 20, bottom: 20, left: 20 },
  padding: { top: 16, right: 16, bottom: 16, left: 16 },
  border:  { top: 2,  right: 2,  bottom: 2,  left: 2  },
}

const COLORS = {
  margin:  { bg: 'rgba(251,146,60,0.15)',  border: 'rgba(251,146,60,0.6)',  label: '#fb923c', text: 'Margin' },
  border:  { bg: 'rgba(250,204,21,0.2)',   border: 'rgba(250,204,21,0.7)',  label: '#facc15', text: 'Border' },
  padding: { bg: 'rgba(34,197,94,0.15)',   border: 'rgba(34,197,94,0.6)',   label: '#22c55e', text: 'Padding' },
  content: { bg: 'rgba(96,165,250,0.15)',  border: 'rgba(96,165,250,0.6)',  label: '#60a5fa', text: 'Content' },
}

const MAX: Record<BoxProp, number> = { margin: 100, padding: 100, border: 20 }

function SpinBox({ value, onChange, min = 0, max = 100 }: { value: number; onChange: (v: number) => void; min?: number; max?: number }) {
  return (
    <div className="flex items-center gap-1">
      <input
        type="range" min={min} max={max} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-20 accent-teal"
      />
      <input
        type="number" min={min} max={max} value={value}
        onChange={e => onChange(Math.max(min, Math.min(max, Number(e.target.value) || 0)))}
        className="w-14 rounded border border-border bg-surface px-2 py-1 font-mono text-xs text-primary focus:border-teal focus:outline-none"
      />
    </div>
  )
}

function SideControls({ label, values, linked, onLinkToggle, onChange, max }: {
  label: string; values: BoxValues; linked: boolean
  onLinkToggle: () => void; onChange: (side: Side, v: number) => void; max: number
}) {
  const sides: Side[] = ['top', 'right', 'bottom', 'left']
  const sideLabels: Record<Side, string> = { top: 'T', right: 'R', bottom: 'B', left: 'L' }

  return (
    <div className="rounded border border-border bg-surface/50 p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="font-mono text-[11px] font-semibold uppercase tracking-widest text-muted">{label}</span>
        <button
          onClick={onLinkToggle}
          className={`rounded border px-2 py-0.5 font-mono text-[10px] transition-colors ${linked ? 'border-teal/40 bg-teal/10 text-teal' : 'border-border text-muted hover:border-border-hi'}`}
        >
          {linked ? '🔗 一括' : '⚙ 個別'}
        </button>
      </div>
      {linked ? (
        <div className="flex items-center gap-3">
          <span className="w-4 font-mono text-xs text-muted">全</span>
          <SpinBox value={values.top} onChange={v => sides.forEach(s => onChange(s, v))} max={max} />
        </div>
      ) : (
        <div className="space-y-1.5">
          {sides.map(s => (
            <div key={s} className="flex items-center gap-3">
              <span className="w-4 font-mono text-xs text-muted">{sideLabels[s]}</span>
              <SpinBox value={values[s]} onChange={v => onChange(s, v)} max={max} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function CssBoxModel() {
  const [margin,  setMargin]  = useState<BoxValues>(DEFAULT.margin)
  const [padding, setPadding] = useState<BoxValues>(DEFAULT.padding)
  const [border,  setBorder]  = useState<BoxValues>(DEFAULT.border)
  const [contentW, setContentW] = useState(150)
  const [contentH, setContentH] = useState(80)
  const [boxSizing, setBoxSizing] = useState<'content-box' | 'border-box'>('content-box')
  const [linked, setLinked] = useState<Record<BoxProp, boolean>>({ margin: true, padding: true, border: true })
  const [copied, setCopied] = useState(false)

  const update = useCallback((prop: BoxProp, side: Side, v: number) => {
    const setter = { margin: setMargin, padding: setPadding, border: setBorder }[prop]
    setter(prev => ({ ...prev, [side]: v }))
  }, [])

  const toggleLink = (prop: BoxProp) => setLinked(p => ({ ...p, [prop]: !p[prop] }))

  // Compute effective dimensions for border-box
  const effW = boxSizing === 'content-box'
    ? contentW
    : Math.max(10, contentW - border.left - border.right - padding.left - padding.right)
  const effH = boxSizing === 'content-box'
    ? contentH
    : Math.max(10, contentH - border.top - border.bottom - padding.top - padding.bottom)

  // Visual sizes (scaling for display)
  const scale = 0.5
  const padW  = effW + (padding.left + padding.right) * scale
  const padH  = effH + (padding.top + padding.bottom) * scale
  const borW  = padW + (border.left + border.right) * scale
  const borH  = padH + (border.top + border.bottom) * scale
  const marW  = borW + (margin.left + margin.right) * scale
  const marH  = borH + (margin.top + margin.bottom) * scale

  function shorthand(v: BoxValues, unit = 'px') {
    if (v.top === v.right && v.top === v.bottom && v.top === v.left) return `${v.top}${unit}`
    if (v.top === v.bottom && v.right === v.left) return `${v.top}${unit} ${v.right}${unit}`
    return `${v.top}${unit} ${v.right}${unit} ${v.bottom}${unit} ${v.left}${unit}`
  }

  const css = [
    `width: ${contentW}px;`,
    `height: ${contentH}px;`,
    `margin: ${shorthand(margin)};`,
    `padding: ${shorthand(padding)};`,
    `border: ${shorthand(border)} solid;`,
    `box-sizing: ${boxSizing};`,
  ].join('\n')

  async function copy() {
    try {
      await navigator.clipboard.writeText(css)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {}
  }

  const layers: Array<{ key: keyof typeof COLORS; w: number; h: number }> = [
    { key: 'margin',  w: marW, h: marH },
    { key: 'border',  w: borW, h: borH },
    { key: 'padding', w: padW, h: padH },
    { key: 'content', w: effW, h: effH },
  ]

  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-2">
        {/* Controls */}
        <div className="space-y-3">
          <SideControls label="Margin"  values={margin}  linked={linked.margin}  onLinkToggle={() => toggleLink('margin')}  onChange={(s,v) => update('margin',s,v)}  max={100} />
          <SideControls label="Padding" values={padding} linked={linked.padding} onLinkToggle={() => toggleLink('padding')} onChange={(s,v) => update('padding',s,v)} max={100} />
          <SideControls label="Border"  values={border}  linked={linked.border}  onLinkToggle={() => toggleLink('border')}  onChange={(s,v) => update('border',s,v)}  max={20}  />

          <div className="rounded border border-border bg-surface/50 p-3">
            <span className="mb-2 block font-mono text-[11px] font-semibold uppercase tracking-widest text-muted">Content</span>
            <div className="space-y-1.5">
              <div className="flex items-center gap-3">
                <span className="w-4 font-mono text-xs text-muted">W</span>
                <SpinBox value={contentW} onChange={setContentW} min={50} max={400} />
              </div>
              <div className="flex items-center gap-3">
                <span className="w-4 font-mono text-xs text-muted">H</span>
                <SpinBox value={contentH} onChange={setContentH} min={50} max={400} />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="font-mono text-xs text-muted">box-sizing:</span>
            {(['content-box', 'border-box'] as const).map(v => (
              <button key={v} onClick={() => setBoxSizing(v)}
                className={`rounded border px-3 py-1 font-mono text-xs transition-colors ${boxSizing === v ? 'border-teal bg-teal/10 text-teal' : 'border-border text-muted hover:border-border-hi hover:text-dim'}`}>
                {v}
              </button>
            ))}
          </div>
        </div>

        {/* Visual */}
        <div className="flex flex-col items-center justify-center gap-4">
          <div className="relative flex items-center justify-center overflow-hidden rounded"
            style={{ width: `${marW + 24}px`, height: `${marH + 24}px`, minWidth: '200px', minHeight: '120px' }}>
            {layers.map(({ key, w, h }) => (
              <div key={key} className="absolute flex items-center justify-center rounded"
                style={{
                  width: `${w}px`, height: `${h}px`,
                  backgroundColor: COLORS[key].bg,
                  border: `1px solid ${COLORS[key].border}`,
                }}>
                {key === 'margin' && (
                  <span className="absolute left-1 top-1 font-mono text-[9px]" style={{ color: COLORS[key].label }}>
                    {COLORS[key].text}
                  </span>
                )}
                {key === 'content' && (
                  <div className="text-center">
                    <p className="font-mono text-[10px]" style={{ color: COLORS[key].label }}>{COLORS[key].text}</p>
                    <p className="font-mono text-[9px] text-muted">{effW}×{effH}px</p>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap justify-center gap-3">
            {(['margin','border','padding','content'] as const).map(k => (
              <div key={k} className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded" style={{ background: COLORS[k].bg, border: `1px solid ${COLORS[k].border}` }} />
                <span className="font-mono text-[10px]" style={{ color: COLORS[k].label }}>{COLORS[k].text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CSS Output */}
      <div className="rounded border border-border bg-surface/50">
        <div className="flex items-center justify-between border-b border-border px-4 py-2">
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted">Generated CSS</span>
          <button onClick={copy}
            className={`rounded border px-3 py-1 font-mono text-xs transition-colors ${copied ? 'border-teal/40 bg-teal/10 text-teal' : 'border-border text-muted hover:border-border-hi hover:text-dim'}`}>
            {copied ? '✓ Copied' : 'コピー'}
          </button>
        </div>
        <pre className="overflow-x-auto px-4 py-3 font-mono text-xs text-primary">{css}</pre>
      </div>
    </div>
  )
}
