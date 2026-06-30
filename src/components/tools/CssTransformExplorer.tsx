'use client'

import { useState, useCallback } from 'react'

interface Transform2D {
  translateX: number
  translateY: number
  rotate: number
  scaleX: number
  scaleY: number
  skewX: number
  skewY: number
}

interface Transform3D {
  translateZ: number
  rotateX: number
  rotateY: number
  perspective: number
}

type OriginH = 'left' | 'center' | 'right'
type OriginV = 'top' | 'center' | 'bottom'

const DEFAULT_2D: Transform2D = {
  translateX: 0,
  translateY: 0,
  rotate: 0,
  scaleX: 1,
  scaleY: 1,
  skewX: 0,
  skewY: 0,
}

const DEFAULT_3D: Transform3D = {
  translateZ: 0,
  rotateX: 0,
  rotateY: 0,
  perspective: 800,
}

function SliderRow({
  label,
  value,
  min,
  max,
  step = 1,
  unit,
  defaultValue,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step?: number
  unit: string
  defaultValue?: number
  onChange: (v: number) => void
}) {
  const isDefault = defaultValue !== undefined ? value === defaultValue : value === 0
  return (
    <div className="grid grid-cols-[100px_1fr_64px] items-center gap-2">
      <span className={`font-mono text-xs transition-colors ${isDefault ? 'text-muted' : 'text-teal'}`}>{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-border accent-teal"
      />
      <span className={`text-right font-mono text-xs transition-colors ${isDefault ? 'text-muted' : 'text-bright'}`}>
        {step < 1 ? value.toFixed(1) : value}
        <span className="text-muted/60">{unit}</span>
      </span>
    </div>
  )
}

function ColoredCSS({ css }: { css: string }) {
  const tokens = css.split(/(\{|\}|;|\n)/).flatMap((part) => {
    if (['{', '}', ';', '\n'].includes(part)) return [{ type: 'punct', text: part }]
    const propMatch = part.match(/^(\s*)([\w-]+)(\s*:\s*)(.+)$/)
    if (propMatch) {
      return [
        { type: 'space', text: propMatch[1] },
        { type: 'prop', text: propMatch[2] },
        { type: 'colon', text: propMatch[3] },
        { type: 'val', text: propMatch[4] },
      ]
    }
    const selectorMatch = part.match(/^([\w.#\s,*:[\]"'=^$~|>+~-]+)$/)
    if (selectorMatch && part.trim()) return [{ type: 'selector', text: part }]
    return [{ type: 'other', text: part }]
  })

  return (
    <pre className="overflow-x-auto text-xs leading-6">
      {tokens.map((t, i) => {
        if (t.text === '\n') return <br key={i} />
        if (t.type === 'selector') return <span key={i} className="text-teal">{t.text}</span>
        if (t.type === 'prop') return <span key={i} className="text-sky-400">{t.text}</span>
        if (t.type === 'val') return <span key={i} className="text-amber-400">{t.text}</span>
        return <span key={i} className="text-primary">{t.text}</span>
      })}
    </pre>
  )
}

export function CssTransformExplorer() {
  const [t2d, setT2d] = useState<Transform2D>(DEFAULT_2D)
  const [t3d, setT3d] = useState<Transform3D>(DEFAULT_3D)
  const [is3D, setIs3D] = useState(false)
  const [originH, setOriginH] = useState<OriginH>('center')
  const [originV, setOriginV] = useState<OriginV>('center')
  const [copied, setCopied] = useState(false)
  const [previewBg, setPreviewBg] = useState('#14b8a6')
  const [previewText, setPreviewText] = useState('CSS')

  const update2d = useCallback(<K extends keyof Transform2D>(key: K, val: Transform2D[K]) => {
    setT2d((prev) => ({ ...prev, [key]: val }))
  }, [])

  const update3d = useCallback(<K extends keyof Transform3D>(key: K, val: Transform3D[K]) => {
    setT3d((prev) => ({ ...prev, [key]: val }))
  }, [])

  const reset = useCallback(() => {
    setT2d(DEFAULT_2D)
    setT3d(DEFAULT_3D)
    setOriginH('center')
    setOriginV('center')
  }, [])

  const buildTransform = (): string => {
    const parts: string[] = []
    if (t2d.translateX !== 0 || t2d.translateY !== 0) {
      if (t2d.translateX !== 0 && t2d.translateY === 0) parts.push(`translateX(${t2d.translateX}px)`)
      else if (t2d.translateX === 0 && t2d.translateY !== 0) parts.push(`translateY(${t2d.translateY}px)`)
      else parts.push(`translate(${t2d.translateX}px, ${t2d.translateY}px)`)
    }
    if (is3D && t3d.translateZ !== 0) parts.push(`translateZ(${t3d.translateZ}px)`)
    if (t2d.rotate !== 0) parts.push(`rotate(${t2d.rotate}deg)`)
    if (is3D && t3d.rotateX !== 0) parts.push(`rotateX(${t3d.rotateX}deg)`)
    if (is3D && t3d.rotateY !== 0) parts.push(`rotateY(${t3d.rotateY}deg)`)
    if (t2d.scaleX !== 1 || t2d.scaleY !== 1) {
      if (t2d.scaleX === t2d.scaleY) parts.push(`scale(${t2d.scaleX.toFixed(1)})`)
      else if (t2d.scaleX !== 1 && t2d.scaleY === 1) parts.push(`scaleX(${t2d.scaleX.toFixed(1)})`)
      else if (t2d.scaleX === 1 && t2d.scaleY !== 1) parts.push(`scaleY(${t2d.scaleY.toFixed(1)})`)
      else parts.push(`scale(${t2d.scaleX.toFixed(1)}, ${t2d.scaleY.toFixed(1)})`)
    }
    if (t2d.skewX !== 0 || t2d.skewY !== 0) {
      if (t2d.skewX !== 0 && t2d.skewY === 0) parts.push(`skewX(${t2d.skewX}deg)`)
      else if (t2d.skewX === 0 && t2d.skewY !== 0) parts.push(`skewY(${t2d.skewY}deg)`)
      else parts.push(`skew(${t2d.skewX}deg, ${t2d.skewY}deg)`)
    }
    return parts.length > 0 ? parts.join(' ') : 'none'
  }

  const buildOrigin = (): string => `${originH} ${originV}`

  const transformStr = buildTransform()
  const originStr = buildOrigin()
  const isDefaultOrigin = originH === 'center' && originV === 'center'

  const generateCSS = (): string => {
    const lines: string[] = ['.element {']
    if (is3D) lines.push(`  perspective: ${t3d.perspective}px;`)
    if (transformStr !== 'none') lines.push(`  transform: ${transformStr};`)
    if (!isDefaultOrigin) lines.push(`  transform-origin: ${originStr};`)
    lines.push('}')
    return lines.join('\n')
  }

  const cssOutput = generateCSS()

  const copyCSS = async () => {
    await navigator.clipboard.writeText(cssOutput)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const previewStyle: React.CSSProperties = {
    transform: transformStr === 'none' ? undefined : transformStr,
    transformOrigin: isDefaultOrigin ? undefined : originStr,
    perspective: is3D ? t3d.perspective : undefined,
    backgroundColor: previewBg,
    transition: 'transform 0.05s linear',
  }

  const originGrid: [OriginH, OriginV][] = [
    ['left', 'top'], ['center', 'top'], ['right', 'top'],
    ['left', 'center'], ['center', 'center'], ['right', 'center'],
    ['left', 'bottom'], ['center', 'bottom'], ['right', 'bottom'],
  ]

  const activeCount = [
    t2d.translateX !== 0, t2d.translateY !== 0, t2d.rotate !== 0,
    t2d.scaleX !== 1, t2d.scaleY !== 1, t2d.skewX !== 0, t2d.skewY !== 0,
    is3D && t3d.translateZ !== 0, is3D && t3d.rotateX !== 0, is3D && t3d.rotateY !== 0,
    !isDefaultOrigin,
  ].filter(Boolean).length

  const activePills = [
    t2d.translateX !== 0 && `translateX(${t2d.translateX}px)`,
    t2d.translateY !== 0 && `translateY(${t2d.translateY}px)`,
    t2d.rotate !== 0 && `rotate(${t2d.rotate}deg)`,
    (t2d.scaleX !== 1 || t2d.scaleY !== 1) && (
      t2d.scaleX === t2d.scaleY ? `scale(${t2d.scaleX.toFixed(1)})`
      : t2d.scaleX !== 1 && t2d.scaleY === 1 ? `scaleX(${t2d.scaleX.toFixed(1)})`
      : t2d.scaleX === 1 && t2d.scaleY !== 1 ? `scaleY(${t2d.scaleY.toFixed(1)})`
      : `scale(${t2d.scaleX.toFixed(1)}, ${t2d.scaleY.toFixed(1)})`
    ),
    t2d.skewX !== 0 && `skewX(${t2d.skewX}deg)`,
    t2d.skewY !== 0 && `skewY(${t2d.skewY}deg)`,
    is3D && t3d.translateZ !== 0 && `translateZ(${t3d.translateZ}px)`,
    is3D && t3d.rotateX !== 0 && `rotateX(${t3d.rotateX}deg)`,
    is3D && t3d.rotateY !== 0 && `rotateY(${t3d.rotateY}deg)`,
  ].filter(Boolean) as string[]

  return (
    <div className="flex flex-col gap-4">
      {/* Stats bar */}
      <div className="flex flex-wrap items-center gap-2 rounded border border-border bg-[#0a0f1a] px-3 py-2 text-xs">
        <span className="font-mono text-teal">{activeCount} active</span>
        {activePills.length === 0 ? (
          <span className="font-mono text-muted">all defaults</span>
        ) : (
          activePills.map((pill) => (
            <span key={pill} className="rounded bg-teal/10 px-1.5 py-0.5 font-mono text-teal border border-teal/20">
              {pill}
            </span>
          ))
        )}
        {!isDefaultOrigin && (
          <span className="rounded bg-sky-400/10 px-1.5 py-0.5 font-mono text-sky-400 border border-sky-400/20">
            origin: {originStr}
          </span>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        {/* Left pane: controls */}
        <div className="flex flex-col gap-4 text-sm">
          {/* 2D Section */}
          <div className="rounded border border-border bg-[#0a0f1a] p-4">
            <p className="mb-3 font-mono text-xs uppercase tracking-widest text-muted">2D Transform</p>
            <div className="flex flex-col gap-3">
              <SliderRow label="translateX" value={t2d.translateX} min={-300} max={300} unit="px" defaultValue={0} onChange={(v) => update2d('translateX', v)} />
              <SliderRow label="translateY" value={t2d.translateY} min={-300} max={300} unit="px" defaultValue={0} onChange={(v) => update2d('translateY', v)} />
              <SliderRow label="rotate" value={t2d.rotate} min={-180} max={180} unit="deg" defaultValue={0} onChange={(v) => update2d('rotate', v)} />
              <SliderRow label="scaleX" value={t2d.scaleX} min={0} max={3} step={0.1} unit="" defaultValue={1} onChange={(v) => update2d('scaleX', v)} />
              <SliderRow label="scaleY" value={t2d.scaleY} min={0} max={3} step={0.1} unit="" defaultValue={1} onChange={(v) => update2d('scaleY', v)} />
              <SliderRow label="skewX" value={t2d.skewX} min={-60} max={60} unit="deg" defaultValue={0} onChange={(v) => update2d('skewX', v)} />
              <SliderRow label="skewY" value={t2d.skewY} min={-60} max={60} unit="deg" defaultValue={0} onChange={(v) => update2d('skewY', v)} />
            </div>
          </div>

          {/* 3D Section */}
          <div className="rounded border border-border bg-[#0a0f1a] p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="font-mono text-xs uppercase tracking-widest text-muted">3D Transform</p>
              <button
                onClick={() => setIs3D((v) => !v)}
                className={`rounded px-2 py-0.5 font-mono text-xs transition-colors ${
                  is3D ? 'bg-teal text-black' : 'border border-border text-muted hover:text-primary'
                }`}
              >
                {is3D ? 'ON' : 'OFF'}
              </button>
            </div>
            <div className={`flex flex-col gap-3 transition-opacity ${is3D ? 'opacity-100' : 'pointer-events-none opacity-30'}`}>
              <SliderRow label="translateZ" value={t3d.translateZ} min={-300} max={300} unit="px" defaultValue={0} onChange={(v) => update3d('translateZ', v)} />
              <SliderRow label="rotateX" value={t3d.rotateX} min={-180} max={180} unit="deg" defaultValue={0} onChange={(v) => update3d('rotateX', v)} />
              <SliderRow label="rotateY" value={t3d.rotateY} min={-180} max={180} unit="deg" defaultValue={0} onChange={(v) => update3d('rotateY', v)} />
              <SliderRow label="perspective" value={t3d.perspective} min={100} max={2000} unit="px" defaultValue={800} onChange={(v) => update3d('perspective', v)} />
            </div>
          </div>

          {/* Transform origin */}
          <div className="rounded border border-border bg-[#0a0f1a] p-4">
            <p className="mb-3 font-mono text-xs uppercase tracking-widest text-muted">transform-origin</p>
            <div className="flex items-start gap-4">
              <div className="grid grid-cols-3 gap-1">
                {originGrid.map(([h, v]) => {
                  const active = originH === h && originV === v
                  return (
                    <button
                      key={`${h}-${v}`}
                      onClick={() => { setOriginH(h); setOriginV(v) }}
                      className={`h-7 w-7 rounded transition-colors ${
                        active ? 'bg-teal' : 'bg-border/40 hover:bg-border'
                      }`}
                      title={`${h} ${v}`}
                    />
                  )
                })}
              </div>
              <div>
                <p className="font-mono text-xs text-bright">{originH} {originV}</p>
                <p className="mt-0.5 text-xs text-muted">transform-origin</p>
              </div>
            </div>
          </div>

          {/* Preview customization */}
          <div className="rounded border border-border bg-[#0a0f1a] p-4">
            <p className="mb-3 font-mono text-xs uppercase tracking-widest text-muted">Preview</p>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="w-16 text-xs text-muted">Color</span>
                <input
                  type="color"
                  value={previewBg}
                  onChange={(e) => setPreviewBg(e.target.value)}
                  className="h-6 w-10 cursor-pointer rounded border border-border bg-transparent"
                />
                <span className="font-mono text-xs text-muted">{previewBg}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-16 text-xs text-muted">Label</span>
                <input
                  type="text"
                  value={previewText}
                  onChange={(e) => setPreviewText(e.target.value.slice(0, 8))}
                  className="w-24 rounded border border-border bg-surface px-2 py-0.5 font-mono text-xs text-bright focus:border-teal focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right pane: preview + CSS */}
        <div className="flex flex-col gap-4">
          {/* Preview */}
          <div
            className="relative flex min-h-72 items-center justify-center overflow-hidden rounded border border-border"
            style={{
              backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)',
              backgroundSize: '20px 20px',
              backgroundColor: '#060a12',
            }}
          >
            {/* Transform-origin crosshair */}
            {!isDefaultOrigin && (
              <div
                className="pointer-events-none absolute"
                style={{
                  left: originH === 'left' ? '20%' : originH === 'right' ? '80%' : '50%',
                  top: originV === 'top' ? '20%' : originV === 'bottom' ? '80%' : '50%',
                  transform: 'translate(-50%, -50%)',
                }}
              >
                <div className="relative">
                  <div className="absolute left-1/2 top-1/2 h-4 w-px -translate-x-1/2 -translate-y-1/2 bg-amber-400/60" />
                  <div className="absolute left-1/2 top-1/2 h-px w-4 -translate-x-1/2 -translate-y-1/2 bg-amber-400/60" />
                  <div className="h-2 w-2 rounded-full border border-amber-400/80 bg-amber-400/30" />
                </div>
              </div>
            )}
            <div
              style={previewStyle}
              className="flex h-24 w-24 items-center justify-center rounded font-bold text-white shadow-xl"
            >
              {previewText}
            </div>
            {/* Reset button */}
            <button
              onClick={reset}
              className="absolute right-3 top-3 rounded border border-border bg-[#060a12]/90 px-3 py-1 font-mono text-xs text-muted transition-colors hover:border-teal/40 hover:text-teal"
            >
              ↺ reset
            </button>
            {/* 3D mode badge */}
            {is3D && (
              <div className="absolute left-3 top-3 rounded bg-teal/10 px-2 py-0.5 font-mono text-xs text-teal border border-teal/20">
                3D
              </div>
            )}
          </div>

          {/* CSS output */}
          <div className="rounded border border-border bg-[#0a0f1a]">
            <div className="flex items-center justify-between border-b border-border px-4 py-2">
              <span className="font-mono text-xs uppercase tracking-widest text-muted">Generated CSS</span>
              <button
                onClick={copyCSS}
                className={`rounded border px-3 py-1 font-mono text-xs transition-colors ${
                  copied
                    ? 'border-teal text-teal'
                    : 'border-border text-muted hover:text-primary'
                }`}
              >
                {copied ? 'copied ✓' : 'copy'}
              </button>
            </div>
            <div className="p-4">
              <ColoredCSS css={cssOutput} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
