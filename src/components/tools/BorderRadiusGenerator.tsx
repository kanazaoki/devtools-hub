'use client'

import { useState, useCallback } from 'react'

type Unit = 'px' | '%'
type Mode = 'unified' | 'individual'
type OutputFormat = 'shorthand' | 'longhand'

interface CornerValue {
  x: number
  y: number
}

interface Corners {
  tl: CornerValue
  tr: CornerValue
  br: CornerValue
  bl: CornerValue
}

const DEFAULT_CORNERS: Corners = {
  tl: { x: 0, y: 0 },
  tr: { x: 0, y: 0 },
  br: { x: 0, y: 0 },
  bl: { x: 0, y: 0 },
}

function buildBorderRadius(corners: Corners, unit: Unit): string {
  const { tl, tr, br, bl } = corners
  const xVals = [tl.x, tr.x, br.x, bl.x]
  const yVals = [tl.y, tr.y, br.y, bl.y]
  const u = unit

  const isCircular = xVals.every((x, i) => x === yVals[i])
  const allEqual = xVals.every((v) => v === xVals[0]) && yVals.every((v) => v === yVals[0])

  if (allEqual) {
    if (isCircular) return `border-radius: ${tl.x}${u};`
    return `border-radius: ${tl.x}${u} / ${tl.y}${u};`
  }

  const xPart = xVals.map((v) => `${v}${u}`).join(' ')
  if (isCircular) return `border-radius: ${xPart};`
  const yPart = yVals.map((v) => `${v}${u}`).join(' ')
  return `border-radius: ${xPart} / ${yPart};`
}

function buildLonghand(corners: Corners, unit: Unit): string {
  const { tl, tr, br, bl } = corners
  const u = unit
  const fmt = (c: CornerValue) =>
    c.x === c.y ? `${c.x}${u}` : `${c.x}${u} ${c.y}${u}`
  return [
    `border-top-left-radius: ${fmt(tl)};`,
    `border-top-right-radius: ${fmt(tr)};`,
    `border-bottom-right-radius: ${fmt(br)};`,
    `border-bottom-left-radius: ${fmt(bl)};`,
  ].join('\n')
}

const CORNER_DEFS = [
  { key: 'tl' as const, label: 'TL', ja: '左上', pos: 'top-0 left-0' },
  { key: 'tr' as const, label: 'TR', ja: '右上', pos: 'top-0 right-0' },
  { key: 'br' as const, label: 'BR', ja: '右下', pos: 'bottom-0 right-0' },
  { key: 'bl' as const, label: 'BL', ja: '左下', pos: 'bottom-0 left-0' },
]

function CornerSlider({
  axis,
  value,
  max,
  unit,
  onChange,
}: {
  axis: 'X' | 'Y'
  value: number
  max: number
  unit: Unit
  onChange: (v: number) => void
}) {
  const label = axis === 'X' ? '水平' : '垂直'
  return (
    <div className="flex items-center gap-2.5">
      <span className="w-8 shrink-0 font-mono text-[10px] text-muted">{label}</span>
      <div className="relative flex-1">
        <input
          type="range"
          min={0}
          max={max}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="h-1 w-full cursor-pointer appearance-none rounded-full bg-border accent-teal"
          style={{ accentColor: '#14b8a6' }}
        />
      </div>
      <span className="w-12 text-right font-mono text-xs tabular-nums text-bright">
        {value}{unit}
      </span>
    </div>
  )
}

export function BorderRadiusGenerator() {
  const [mode, setMode] = useState<Mode>('unified')
  const [unit, setUnit] = useState<Unit>('px')
  const [outputFormat, setOutputFormat] = useState<OutputFormat>('shorthand')
  const [corners, setCorners] = useState<Corners>(DEFAULT_CORNERS)
  const [unified, setUnified] = useState<CornerValue>({ x: 0, y: 0 })
  const [activeCorner, setActiveCorner] = useState<keyof Corners | null>(null)
  const [copied, setCopied] = useState(false)

  const max = unit === 'px' ? 200 : 50

  const effectiveCorners: Corners =
    mode === 'unified'
      ? { tl: unified, tr: unified, br: unified, bl: unified }
      : corners

  const cssValue = buildBorderRadius(effectiveCorners, unit)
  const cssOutput =
    outputFormat === 'shorthand' ? cssValue : buildLonghand(effectiveCorners, unit)

  const previewStyle = {
    borderRadius: cssValue.replace('border-radius: ', '').replace(';', ''),
  }

  const handleUnifiedX = useCallback((v: number) => setUnified((p) => ({ ...p, x: v })), [])
  const handleUnifiedY = useCallback((v: number) => setUnified((p) => ({ ...p, y: v })), [])

  const handleCorner = useCallback(
    (corner: keyof Corners, axis: 'x' | 'y', v: number) =>
      setCorners((p) => ({ ...p, [corner]: { ...p[corner], [axis]: v } })),
    []
  )

  const handleUnitChange = (newUnit: Unit) => {
    const ratio = newUnit === '%' ? 50 / 200 : 200 / 50
    const clamp = (v: number) =>
      Math.round(Math.min(v * ratio, newUnit === '%' ? 50 : 200))
    setUnit(newUnit)
    setUnified((p) => ({ x: clamp(p.x), y: clamp(p.y) }))
    setCorners((p) => {
      const conv = (c: CornerValue): CornerValue => ({ x: clamp(c.x), y: clamp(c.y) })
      return { tl: conv(p.tl), tr: conv(p.tr), br: conv(p.br), bl: conv(p.bl) }
    })
  }

  const handleReset = () => {
    setCorners(DEFAULT_CORNERS)
    setUnified({ x: 0, y: 0 })
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(cssOutput).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      {/* Controls */}
      <div className="flex flex-col gap-4 lg:w-72 xl:w-80">
        {/* Mode + Unit toggles */}
        <div className="flex flex-wrap gap-2">
          <div className="flex rounded border border-border p-0.5">
            {(['unified', 'individual'] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setActiveCorner(null) }}
                className={`rounded px-3 py-1.5 text-xs font-medium transition-colors ${
                  mode === m
                    ? 'bg-teal/20 text-teal'
                    : 'text-dim hover:text-primary'
                }`}
              >
                {m === 'unified' ? '一括' : '個別'}
              </button>
            ))}
          </div>
          <div className="flex rounded border border-border p-0.5">
            {(['px', '%'] as Unit[]).map((u) => (
              <button
                key={u}
                onClick={() => handleUnitChange(u)}
                className={`rounded px-3 py-1.5 text-xs font-medium transition-colors ${
                  unit === u
                    ? 'bg-teal/20 text-teal'
                    : 'text-dim hover:text-primary'
                }`}
              >
                {u}
              </button>
            ))}
          </div>
        </div>

        {/* Sliders */}
        {mode === 'unified' ? (
          <div className="rounded border border-border bg-[#0a1020]/60 p-4">
            <p className="mb-4 font-mono text-[10px] font-semibold uppercase tracking-widest text-muted">
              全コーナー
            </p>
            <div className="space-y-3">
              <CornerSlider axis="X" value={unified.x} max={max} unit={unit} onChange={handleUnifiedX} />
              <CornerSlider axis="Y" value={unified.y} max={max} unit={unit} onChange={handleUnifiedY} />
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {CORNER_DEFS.map(({ key, label, ja }) => {
              const isActive = activeCorner === key
              return (
                <div
                  key={key}
                  className={`rounded border transition-colors ${
                    isActive ? 'border-teal/50 bg-teal/5' : 'border-border bg-[#0a1020]/60'
                  }`}
                >
                  <button
                    onClick={() => setActiveCorner(isActive ? null : key)}
                    className="flex w-full items-center justify-between px-4 py-2.5 text-left"
                  >
                    <div className="flex items-center gap-2">
                      <span className={`font-mono text-xs font-semibold ${isActive ? 'text-teal' : 'text-muted'}`}>
                        {label}
                      </span>
                      <span className="text-xs text-dim">{ja}</span>
                    </div>
                    <span className="font-mono text-xs text-muted">
                      {corners[key].x}{unit}
                      {corners[key].x !== corners[key].y && ` / ${corners[key].y}${unit}`}
                    </span>
                  </button>
                  {isActive && (
                    <div className="border-t border-border/60 px-4 pb-4 pt-3 space-y-3">
                      <CornerSlider
                        axis="X"
                        value={corners[key].x}
                        max={max}
                        unit={unit}
                        onChange={(v) => handleCorner(key, 'x', v)}
                      />
                      <CornerSlider
                        axis="Y"
                        value={corners[key].y}
                        max={max}
                        unit={unit}
                        onChange={(v) => handleCorner(key, 'y', v)}
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        <button
          onClick={handleReset}
          className="self-start rounded border border-border px-4 py-1.5 text-xs text-dim transition-colors hover:border-border hover:text-primary"
        >
          リセット
        </button>
      </div>

      {/* Right: Preview + Output */}
      <div className="flex flex-1 flex-col gap-4">
        {/* Preview */}
        <div className="relative overflow-hidden rounded border border-border bg-[#070d1a]">
          {/* Checker background */}
          <div
            className="absolute inset-0 opacity-30"
            style={{
              backgroundImage:
                'repeating-conic-gradient(#1a2740 0% 25%, transparent 0% 50%)',
              backgroundSize: '20px 20px',
            }}
          />
          <div className="relative flex min-h-44 items-center justify-center p-8">
            {/* Corner indicators */}
            {mode === 'individual' && (
              <>
                {CORNER_DEFS.map(({ key, label, pos }) => (
                  <span
                    key={key}
                    className={`absolute ${pos} m-2 font-mono text-[9px] ${
                      activeCorner === key ? 'text-teal' : 'text-muted/40'
                    }`}
                  >
                    {label}
                  </span>
                ))}
              </>
            )}
            <div
              className="h-36 w-36 bg-gradient-to-br from-teal/80 via-teal/50 to-cyan-400/30 shadow-lg shadow-teal/10 transition-all duration-150"
              style={previewStyle}
            />
          </div>
        </div>

        {/* Output format + copy */}
        <div className="flex items-center gap-2">
          <div className="flex rounded border border-border p-0.5">
            {(['shorthand', 'longhand'] as OutputFormat[]).map((f) => (
              <button
                key={f}
                onClick={() => setOutputFormat(f)}
                className={`rounded px-3 py-1.5 text-xs font-medium transition-colors ${
                  outputFormat === f
                    ? 'bg-teal/20 text-teal'
                    : 'text-dim hover:text-primary'
                }`}
              >
                {f === 'shorthand' ? '短縮形' : '個別プロパティ'}
              </button>
            ))}
          </div>
          <button
            onClick={handleCopy}
            className={`ml-auto rounded border px-3 py-1.5 text-xs font-medium transition-colors ${
              copied
                ? 'border-teal/50 text-teal'
                : 'border-border text-dim hover:border-teal/50 hover:text-teal'
            }`}
          >
            {copied ? '✓ コピー済み' : 'コピー'}
          </button>
        </div>

        {/* CSS Output */}
        <div className="rounded border border-border bg-[#070d1a] p-4">
          <pre className="font-mono text-sm leading-relaxed text-bright">{cssOutput}</pre>
        </div>
      </div>
    </div>
  )
}
