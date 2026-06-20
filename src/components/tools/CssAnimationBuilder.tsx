'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'

interface KF {
  percent: number
  translateX: number
  translateY: number
  rotate: number
  scale: number
  opacity: number
  bgColor: string
}

const ANIM_NAME = 'cab-preview'

const DEFAULT_KFS: KF[] = [
  { percent: 0, translateX: -100, translateY: 0, rotate: 0, scale: 1, opacity: 1, bgColor: '#6366f1' },
  { percent: 100, translateX: 100, translateY: 0, rotate: 360, scale: 1, opacity: 0.8, bgColor: '#ec4899' },
]

const EASINGS = [
  { label: 'ease', value: 'ease' },
  { label: 'linear', value: 'linear' },
  { label: 'ease-in', value: 'ease-in' },
  { label: 'ease-out', value: 'ease-out' },
  { label: 'ease-in-out', value: 'ease-in-out' },
  { label: 'spring (cubic-bezier)', value: 'cubic-bezier(0.68,-0.55,0.27,1.55)' },
]

const ITERATIONS = ['1', '2', '3', '5', '10', 'infinite']
const DIRECTIONS = ['normal', 'reverse', 'alternate', 'alternate-reverse']
const FILL_MODES = ['none', 'forwards', 'backwards', 'both']

function kfToBlock(kf: KF): string {
  return [
    `    transform: translateX(${kf.translateX}px) translateY(${kf.translateY}px) rotate(${kf.rotate}deg) scale(${kf.scale});`,
    `    opacity: ${kf.opacity};`,
    `    background-color: ${kf.bgColor};`,
  ].join('\n')
}

function generateCSS(
  kfs: KF[],
  duration: number,
  delay: number,
  easing: string,
  iteration: string,
  direction: string,
  fillMode: string,
): string {
  const sorted = [...kfs].sort((a, b) => a.percent - b.percent)
  const frames = sorted.map((kf) => `  ${kf.percent}% {\n${kfToBlock(kf)}\n  }`).join('\n')
  return [
    `@keyframes ${ANIM_NAME} {`,
    frames,
    `}`,
    ``,
    `.animated-element {`,
    `  animation-name: ${ANIM_NAME};`,
    `  animation-duration: ${duration}s;`,
    `  animation-delay: ${delay}s;`,
    `  animation-timing-function: ${easing};`,
    `  animation-iteration-count: ${iteration};`,
    `  animation-direction: ${direction};`,
    `  animation-fill-mode: ${fillMode};`,
    `}`,
  ].join('\n')
}

function generateKeyframesOnly(kfs: KF[]): string {
  const sorted = [...kfs].sort((a, b) => a.percent - b.percent)
  const frames = sorted.map((kf) => `  ${kf.percent}% {\n${kfToBlock(kf)}\n  }`).join('\n')
  return `@keyframes ${ANIM_NAME} {\n${frames}\n}`
}

export function CssAnimationBuilder() {
  const [duration, setDuration] = useState(1.5)
  const [delay, setDelay] = useState(0)
  const [easing, setEasing] = useState('ease')
  const [iteration, setIteration] = useState('infinite')
  const [direction, setDirection] = useState('alternate')
  const [fillMode, setFillMode] = useState('none')
  const [kfs, setKfs] = useState<KF[]>(DEFAULT_KFS)
  const [activeTab, setActiveTab] = useState(0)
  const [isPlaying, setIsPlaying] = useState(true)
  const [copied, setCopied] = useState(false)
  const styleRef = useRef<HTMLStyleElement | null>(null)

  const css = useMemo(
    () => generateCSS(kfs, duration, delay, easing, iteration, direction, fillMode),
    [kfs, duration, delay, easing, iteration, direction, fillMode],
  )

  const keyframesOnly = useMemo(() => generateKeyframesOnly(kfs), [kfs])

  useEffect(() => {
    if (!styleRef.current) {
      const el = document.createElement('style')
      el.id = 'cab-keyframes'
      document.head.appendChild(el)
      styleRef.current = el
    }
    styleRef.current.textContent = keyframesOnly
  }, [keyframesOnly])

  useEffect(() => {
    return () => {
      if (styleRef.current) {
        styleRef.current.remove()
        styleRef.current = null
      }
    }
  }, [])

  const activeKf = useMemo(
    () => kfs.find((k) => k.percent === activeTab) ?? kfs[0],
    [kfs, activeTab],
  )

  const updateActiveKf = useCallback(
    (patch: Partial<KF>) => {
      setKfs((prev) => prev.map((k) => (k.percent === activeTab ? { ...k, ...patch } : k)))
    },
    [activeTab],
  )

  const addKeyframe = useCallback(() => {
    const sorted = [...kfs].sort((a, b) => a.percent - b.percent)
    let bestPct = 50
    let bestGap = 0
    for (let i = 0; i < sorted.length - 1; i++) {
      const gap = sorted[i + 1].percent - sorted[i].percent
      if (gap > bestGap) {
        bestGap = gap
        bestPct = Math.round((sorted[i].percent + sorted[i + 1].percent) / 2)
      }
    }
    if (kfs.some((k) => k.percent === bestPct)) return
    const prevKf = sorted.filter((k) => k.percent <= bestPct).pop() ?? sorted[0]
    const nextKf = sorted.find((k) => k.percent > bestPct) ?? sorted[sorted.length - 1]
    const t =
      nextKf.percent - prevKf.percent > 0
        ? (bestPct - prevKf.percent) / (nextKf.percent - prevKf.percent)
        : 0.5
    const newKf: KF = {
      percent: bestPct,
      translateX: Math.round(prevKf.translateX + (nextKf.translateX - prevKf.translateX) * t),
      translateY: Math.round(prevKf.translateY + (nextKf.translateY - prevKf.translateY) * t),
      rotate: Math.round(prevKf.rotate + (nextKf.rotate - prevKf.rotate) * t),
      scale: parseFloat((prevKf.scale + (nextKf.scale - prevKf.scale) * t).toFixed(2)),
      opacity: parseFloat((prevKf.opacity + (nextKf.opacity - prevKf.opacity) * t).toFixed(2)),
      bgColor: prevKf.bgColor,
    }
    setKfs((prev) => [...prev, newKf])
    setActiveTab(bestPct)
  }, [kfs])

  const removeActiveKf = useCallback(() => {
    if (activeTab === 0 || activeTab === 100) return
    setKfs((prev) => prev.filter((k) => k.percent !== activeTab))
    setActiveTab(0)
  }, [activeTab])

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(css).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }, [css])

  const sortedKfs = useMemo(() => [...kfs].sort((a, b) => a.percent - b.percent), [kfs])

  return (
    <div className="space-y-3">

      {/* ── Timeline Control Strip ─────────────────── */}
      <div className="overflow-hidden rounded border border-border">
        {/* header */}
        <div className="flex items-center gap-2.5 border-b border-border bg-surface/60 px-4 py-2">
          <span className="h-1.5 w-1.5 rounded-full bg-indigo-500/70" />
          <span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-indigo-400/80">
            Animation
          </span>
        </div>

        {/* controls */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-3 bg-bg px-4 py-4 sm:grid-cols-3">
          {/* duration */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[9px] uppercase tracking-widest text-muted/50">duration</span>
              <span className="font-mono text-[10px] tabular-nums text-indigo-400">{duration}s</span>
            </div>
            <input
              type="range"
              min={0.1}
              max={5}
              step={0.1}
              value={duration}
              onChange={(e) => setDuration(parseFloat(e.target.value))}
              data-testid="duration-slider"
              className="accent-indigo-500"
            />
          </div>

          {/* delay */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[9px] uppercase tracking-widest text-muted/50">delay</span>
              <span className="font-mono text-[10px] tabular-nums text-indigo-400">{delay}s</span>
            </div>
            <input
              type="range"
              min={0}
              max={3}
              step={0.1}
              value={delay}
              onChange={(e) => setDelay(parseFloat(e.target.value))}
              data-testid="delay-slider"
              className="accent-indigo-500"
            />
          </div>

          {/* easing */}
          <div className="flex flex-col gap-1">
            <span className="font-mono text-[9px] uppercase tracking-widest text-muted/50">timing</span>
            <select
              value={easing}
              onChange={(e) => setEasing(e.target.value)}
              data-testid="easing-select"
              className="rounded border border-border bg-surface px-2 py-1 font-mono text-[10px] text-primary focus:outline-none focus:ring-1 focus:ring-indigo-500/30"
            >
              {EASINGS.map((e) => (
                <option key={e.value} value={e.value}>{e.label}</option>
              ))}
            </select>
          </div>

          {/* iteration */}
          <div className="flex flex-col gap-1">
            <span className="font-mono text-[9px] uppercase tracking-widest text-muted/50">iteration</span>
            <select
              value={iteration}
              onChange={(e) => setIteration(e.target.value)}
              data-testid="iteration-select"
              className="rounded border border-border bg-surface px-2 py-1 font-mono text-[10px] text-primary focus:outline-none focus:ring-1 focus:ring-indigo-500/30"
            >
              {ITERATIONS.map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>

          {/* direction */}
          <div className="flex flex-col gap-1">
            <span className="font-mono text-[9px] uppercase tracking-widest text-muted/50">direction</span>
            <select
              value={direction}
              onChange={(e) => setDirection(e.target.value)}
              data-testid="direction-select"
              className="rounded border border-border bg-surface px-2 py-1 font-mono text-[10px] text-primary focus:outline-none focus:ring-1 focus:ring-indigo-500/30"
            >
              {DIRECTIONS.map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>

          {/* fill-mode */}
          <div className="flex flex-col gap-1">
            <span className="font-mono text-[9px] uppercase tracking-widest text-muted/50">fill-mode</span>
            <select
              value={fillMode}
              onChange={(e) => setFillMode(e.target.value)}
              data-testid="fill-mode-select"
              className="rounded border border-border bg-surface px-2 py-1 font-mono text-[10px] text-primary focus:outline-none focus:ring-1 focus:ring-indigo-500/30"
            >
              {FILL_MODES.map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ── Keyframe Editor + Preview ─────────────── */}
      <div className="grid grid-cols-2 gap-3">

        {/* Keyframe Editor */}
        <div className="relative overflow-hidden rounded border border-border">
          {/* indigo left-accent */}
          <span aria-hidden="true" className="absolute inset-y-0 left-0 w-[2px] bg-indigo-500/40" />

          {/* header */}
          <div className="flex items-center justify-between border-b border-border bg-surface/60 px-4 py-2.5">
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted/60">
              Keyframes
            </span>
            <div className="flex items-center gap-1.5">
              {activeTab !== 0 && activeTab !== 100 && (
                <button
                  onClick={removeActiveKf}
                  className="rounded px-2 py-0.5 font-mono text-[9px] text-red-400/70 transition-colors hover:bg-red-500/10 hover:text-red-400"
                >
                  Remove
                </button>
              )}
              <button
                onClick={addKeyframe}
                data-testid="add-keyframe-btn"
                className="rounded border border-indigo-500/25 bg-indigo-500/10 px-2.5 py-0.5 font-mono text-[9px] text-indigo-400 transition-colors hover:bg-indigo-500/20"
              >
                + Add
              </button>
            </div>
          </div>

          {/* Keyframe tabs — timeline markers */}
          <div className="flex flex-wrap gap-1.5 border-b border-border bg-surface/30 px-3 py-2">
            {sortedKfs.map((k) => (
              <button
                key={k.percent}
                onClick={() => setActiveTab(k.percent)}
                data-testid={`keyframe-tab-${k.percent}`}
                className={`rounded-full px-2.5 py-0.5 font-mono text-[10px] transition-all duration-150 ${
                  activeTab === k.percent
                    ? 'bg-indigo-500 text-white shadow-[0_0_8px_rgba(99,102,241,0.4)]'
                    : 'border border-border bg-surface text-muted/60 hover:border-indigo-500/30 hover:text-indigo-400/80'
                }`}
              >
                {k.percent}%
              </button>
            ))}
          </div>

          {/* Property sliders */}
          <div className="space-y-2.5 bg-bg px-4 py-3.5">
            {(
              [
                { label: 'translateX', unit: 'px', key: 'translateX' as const, min: -200, max: 200, step: 1, val: activeKf.translateX },
                { label: 'translateY', unit: 'px', key: 'translateY' as const, min: -200, max: 200, step: 1, val: activeKf.translateY },
                { label: 'rotate', unit: '°', key: 'rotate' as const, min: -360, max: 360, step: 1, val: activeKf.rotate },
                { label: 'scale', unit: '', key: 'scale' as const, min: 0, max: 3, step: 0.05, val: activeKf.scale },
                { label: 'opacity', unit: '', key: 'opacity' as const, min: 0, max: 1, step: 0.01, val: activeKf.opacity },
              ] as const
            ).map(({ label, unit, key, min, max, step, val }) => (
              <div key={key} className="flex flex-col gap-0.5">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[9px] text-muted/45">{label}</span>
                  <span className="font-mono text-[9px] tabular-nums text-dim">{val}{unit}</span>
                </div>
                <input
                  type="range"
                  min={min}
                  max={max}
                  step={step}
                  value={val}
                  onChange={(e) => updateActiveKf({ [key]: parseFloat(e.target.value) })}
                  className="accent-indigo-500"
                />
              </div>
            ))}

            <div className="flex items-center gap-2.5 pt-0.5">
              <span className="font-mono text-[9px] text-muted/45">background-color</span>
              <div className="flex items-center gap-1.5">
                <input
                  type="color"
                  value={activeKf.bgColor}
                  onChange={(e) => updateActiveKf({ bgColor: e.target.value })}
                  className="h-5 w-8 cursor-pointer rounded border border-border"
                />
                <span className="font-mono text-[9px] tabular-nums text-muted/40">{activeKf.bgColor}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Preview */}
        <div className="flex flex-col overflow-hidden rounded border border-border">
          {/* header */}
          <div className="flex items-center justify-between border-b border-border bg-surface/40 px-4 py-2.5">
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted/60">
              Preview
            </span>
            <button
              onClick={() => setIsPlaying((p) => !p)}
              data-testid="play-pause-btn"
              className={`flex items-center gap-1.5 rounded border px-3 py-1 font-mono text-[9px] font-medium transition-all duration-150 ${
                isPlaying
                  ? 'border-indigo-500/30 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20'
                  : 'border-border bg-surface text-muted hover:border-indigo-500/30 hover:text-indigo-400'
              }`}
            >
              {isPlaying ? (
                <>
                  <svg width="8" height="8" viewBox="0 0 8 8" fill="currentColor">
                    <rect x="1" y="1" width="2" height="6" rx="0.5" />
                    <rect x="5" y="1" width="2" height="6" rx="0.5" />
                  </svg>
                  Pause
                </>
              ) : (
                <>
                  <svg width="8" height="8" viewBox="0 0 8 8" fill="currentColor">
                    <path d="M1.5 1L7 4L1.5 7V1Z" />
                  </svg>
                  Play
                </>
              )}
            </button>
          </div>

          {/* stage */}
          <div
            data-testid="preview-area"
            className="flex flex-1 items-center justify-center"
            style={{
              minHeight: '240px',
              background: 'radial-gradient(circle at 50% 50%, rgba(99,102,241,0.05) 0%, transparent 70%)',
              backgroundImage:
                'radial-gradient(circle at 50% 50%, rgba(99,102,241,0.05) 0%, transparent 70%), repeating-conic-gradient(rgba(255,255,255,0.02) 0% 25%, transparent 0% 50%)',
              backgroundSize: '100% 100%, 20px 20px',
            }}
          >
            <div
              data-testid="preview-box"
              className="h-10 w-10 rounded-lg"
              style={{
                animationName: ANIM_NAME,
                animationDuration: `${duration}s`,
                animationDelay: `${delay}s`,
                animationTimingFunction: easing,
                animationIterationCount: iteration,
                animationDirection: direction as CSSStyleDeclaration['animationDirection'],
                animationFillMode: fillMode as CSSStyleDeclaration['animationFillMode'],
                animationPlayState: isPlaying ? 'running' : 'paused',
                boxShadow: `0 0 16px ${activeKf.bgColor}60`,
              }}
            />
          </div>
        </div>
      </div>

      {/* ── CSS Output ───────────────────────────── */}
      <div className="overflow-hidden rounded border border-border">
        <div className="flex items-center justify-between border-b border-border bg-surface/60 px-4 py-2.5">
          <div className="flex items-center gap-2.5">
            <span className="h-1.5 w-1.5 rounded-full bg-teal/60" />
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted/60">
              Generated CSS
            </span>
          </div>
          <button
            onClick={handleCopy}
            data-testid="copy-button"
            className={`rounded px-2.5 py-1 font-mono text-[9px] font-medium transition-all duration-150 ${
              copied
                ? 'bg-teal/15 text-teal'
                : 'bg-surface-hi text-muted hover:bg-teal/10 hover:text-teal'
            }`}
          >
            {copied ? '✓ Copied!' : 'Copy'}
          </button>
        </div>
        <textarea
          readOnly
          value={css}
          data-testid="css-output"
          rows={14}
          className="w-full resize-none bg-bg p-4 font-mono text-xs leading-relaxed text-primary focus:outline-none"
        />
      </div>
    </div>
  )
}
