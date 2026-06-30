'use client'

import { useState, useCallback, useMemo } from 'react'

const SCALE_PRESETS = [
  { name: 'Minor Second', ratio: 1.067 },
  { name: 'Major Second', ratio: 1.125 },
  { name: 'Minor Third', ratio: 1.200 },
  { name: 'Major Third', ratio: 1.250 },
  { name: 'Perfect Fourth', ratio: 1.333 },
  { name: 'Augmented Fourth', ratio: 1.414 },
  { name: 'Perfect Fifth', ratio: 1.500 },
  { name: 'Golden Ratio', ratio: 1.618 },
]

const STEP_SUFFIXES = ['base', 'md', 'lg', 'xl', '2xl', '3xl', '4xl']
const STEP_BELOW_SUFFIXES = ['sm', 'xs', 'xxs', 'xxxs']

function round2(n: number) {
  return Math.round(n * 100) / 100
}

function ColoredCSS({ css }: { css: string }) {
  const lines = css.split('\n')
  return (
    <pre className="overflow-x-auto text-xs leading-6">
      {lines.map((line, i) => {
        const propMatch = line.match(/^(\s*)(--[\w-]+)(\s*:\s*)([^;]+)(;?\s*\/\*.*)$/)
        const propMatchSimple = line.match(/^(\s*)(--[\w-]+)(\s*:\s*)([^;]+)(;.*)$/)
        const selectorMatch = line.match(/^([\w.:[\]"',*#\s-]+\{)$/)
        const closingBrace = line.trim() === '}'
        const commentMatch = line.match(/^(\s*\/\*.*)$/)

        if (commentMatch) return <span key={i} className="block text-muted/60">{line}<br /></span>
        if (selectorMatch) return <span key={i} className="block text-teal">{line}<br /></span>
        if (closingBrace) return <span key={i} className="block text-primary">{line}<br /></span>
        const m = propMatch || propMatchSimple
        if (m) {
          return (
            <span key={i} className="block">
              <span className="text-primary">{m[1]}</span>
              <span className="text-sky-400">{m[2]}</span>
              <span className="text-primary">{m[3]}</span>
              <span className="text-amber-400">{m[4]}</span>
              <span className="text-muted/60">{m[5]}</span>
              <br />
            </span>
          )
        }
        return <span key={i} className="block text-primary">{line}<br /></span>
      })}
    </pre>
  )
}

export function TypographyScaleGenerator() {
  const [baseSize, setBaseSize] = useState(16)
  const [selectedPreset, setSelectedPreset] = useState(4) // Perfect Fourth
  const [customRatio, setCustomRatio] = useState('')
  const [stepsUp, setStepsUp] = useState(4)
  const [stepsDown, setStepsDown] = useState(2)
  const [unit, setUnit] = useState<'px' | 'rem'>('rem')
  const [remBase, setRemBase] = useState(16)
  const [prefix, setPrefix] = useState('--fs-')
  const [copied, setCopied] = useState(false)

  const ratio = useMemo(() => {
    if (customRatio !== '') {
      const n = parseFloat(customRatio)
      if (!isNaN(n) && n >= 1.01 && n <= 3.0) return n
    }
    return SCALE_PRESETS[selectedPreset]?.ratio ?? 1.333
  }, [customRatio, selectedPreset])

  const steps = useMemo(() => {
    const result: { step: number; px: number; name: string }[] = []
    for (let i = stepsDown; i >= 1; i--) {
      result.push({
        step: -i,
        px: round2(baseSize / Math.pow(ratio, i)),
        name: STEP_BELOW_SUFFIXES[i - 1] ?? `n${i}`,
      })
    }
    for (let i = 0; i <= stepsUp; i++) {
      result.push({
        step: i,
        px: round2(baseSize * Math.pow(ratio, i)),
        name: STEP_SUFFIXES[i] ?? `${i}xl`,
      })
    }
    return result
  }, [baseSize, ratio, stepsUp, stepsDown])

  const formatValue = useCallback((px: number): string => {
    if (unit === 'px') return `${px}px`
    return `${round2(px / remBase)}rem`
  }, [unit, remBase])

  const generateCSS = useCallback((): string => {
    const lines: string[] = [':root {']
    for (const s of steps) {
      const val = formatValue(s.px)
      const comment = `/* ${s.px}px */`
      lines.push(`  ${prefix}${s.name}: ${val}; ${comment}`)
    }
    lines.push('}')
    return lines.join('\n')
  }, [steps, prefix, formatValue])

  const cssOutput = generateCSS()

  const copyCSS = async () => {
    await navigator.clipboard.writeText(cssOutput)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const currentPresetName = customRatio !== '' ? `custom (${ratio.toFixed(3)})` : SCALE_PRESETS[selectedPreset]?.name

  return (
    <div className="flex flex-col gap-4">
      {/* Stats bar */}
      <div className="flex flex-wrap items-center gap-2 rounded border border-border bg-[#0a0f1a] px-3 py-2 text-xs font-mono">
        <span className="text-teal">{steps.length} steps</span>
        <span className="text-muted">·</span>
        <span className="text-bright">{baseSize}px base</span>
        <span className="text-muted">·</span>
        <span className="text-sky-400">×{ratio.toFixed(3)}</span>
        <span className="text-muted">·</span>
        <span className="text-amber-400">{currentPresetName}</span>
      </div>

      <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
        {/* Left: settings */}
        <div className="flex flex-col gap-3 text-sm">
          {/* Base size */}
          <div className="rounded border border-border bg-[#0a0f1a] p-4">
            <p className="mb-3 font-mono text-xs uppercase tracking-widest text-muted">Base Size</p>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={8}
                max={32}
                value={baseSize}
                onChange={(e) => setBaseSize(Number(e.target.value))}
                className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-border accent-teal"
              />
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={8}
                  max={32}
                  value={baseSize}
                  onChange={(e) => {
                    const v = Number(e.target.value)
                    if (v >= 8 && v <= 32) setBaseSize(v)
                  }}
                  className="w-14 rounded border border-border bg-surface px-2 py-0.5 text-center font-mono text-xs text-bright focus:border-teal focus:outline-none"
                />
                <span className="font-mono text-xs text-muted">px</span>
              </div>
            </div>
          </div>

          {/* Scale ratio */}
          <div className="rounded border border-border bg-[#0a0f1a] p-4">
            <p className="mb-3 font-mono text-xs uppercase tracking-widest text-muted">Scale Ratio</p>
            <div className="grid grid-cols-2 gap-1">
              {SCALE_PRESETS.map((p, i) => (
                <button
                  key={p.name}
                  onClick={() => { setSelectedPreset(i); setCustomRatio('') }}
                  className={`rounded px-2 py-1.5 text-left font-mono text-xs transition-colors ${
                    selectedPreset === i && customRatio === ''
                      ? 'bg-teal/20 text-teal border border-teal/40'
                      : 'border border-border/40 text-muted hover:text-primary hover:border-border'
                  }`}
                >
                  <span className="block text-[10px] leading-tight">{p.name}</span>
                  <span className="text-[11px] font-semibold">{p.ratio}</span>
                </button>
              ))}
            </div>
            <div className="mt-3 flex items-center gap-2">
              <span className="text-xs text-muted">Custom:</span>
              <input
                type="number"
                min={1.01}
                max={3.0}
                step={0.001}
                value={customRatio}
                onChange={(e) => setCustomRatio(e.target.value)}
                placeholder="1.333"
                className="w-24 rounded border border-border bg-surface px-2 py-0.5 font-mono text-xs text-bright placeholder:text-muted/40 focus:border-teal focus:outline-none"
              />
            </div>
          </div>

          {/* Steps */}
          <div className="rounded border border-border bg-[#0a0f1a] p-4">
            <p className="mb-3 font-mono text-xs uppercase tracking-widest text-muted">Steps</p>
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-[80px_1fr_36px] items-center gap-2">
                <span className="text-xs text-muted">Above base</span>
                <input
                  type="range"
                  min={1}
                  max={6}
                  value={stepsUp}
                  onChange={(e) => setStepsUp(Number(e.target.value))}
                  className="h-1.5 cursor-pointer appearance-none rounded-full bg-border accent-teal"
                />
                <span className="text-right font-mono text-xs text-bright">{stepsUp}</span>
              </div>
              <div className="grid grid-cols-[80px_1fr_36px] items-center gap-2">
                <span className="text-xs text-muted">Below base</span>
                <input
                  type="range"
                  min={1}
                  max={4}
                  value={stepsDown}
                  onChange={(e) => setStepsDown(Number(e.target.value))}
                  className="h-1.5 cursor-pointer appearance-none rounded-full bg-border accent-teal"
                />
                <span className="text-right font-mono text-xs text-bright">{stepsDown}</span>
              </div>
            </div>
          </div>

          {/* Unit & rem base */}
          <div className="rounded border border-border bg-[#0a0f1a] p-4">
            <p className="mb-3 font-mono text-xs uppercase tracking-widest text-muted">Output Unit</p>
            <div className="flex gap-2">
              {(['px', 'rem'] as const).map((u) => (
                <button
                  key={u}
                  onClick={() => setUnit(u)}
                  className={`rounded px-3 py-1 font-mono text-xs transition-colors ${
                    unit === u ? 'bg-teal text-black' : 'border border-border text-muted hover:text-primary'
                  }`}
                >
                  {u}
                </button>
              ))}
            </div>
            {unit === 'rem' && (
              <div className="mt-3 flex items-center gap-2">
                <span className="text-xs text-muted">1rem =</span>
                <input
                  type="number"
                  min={12}
                  max={20}
                  value={remBase}
                  onChange={(e) => {
                    const v = Number(e.target.value)
                    if (v >= 12 && v <= 20) setRemBase(v)
                  }}
                  className="w-14 rounded border border-border bg-surface px-2 py-0.5 text-center font-mono text-xs text-bright focus:border-teal focus:outline-none"
                />
                <span className="text-xs text-muted">px</span>
              </div>
            )}
          </div>

          {/* Variable prefix */}
          <div className="rounded border border-border bg-[#0a0f1a] p-4">
            <p className="mb-3 font-mono text-xs uppercase tracking-widest text-muted">Variable Prefix</p>
            <input
              type="text"
              value={prefix}
              onChange={(e) => setPrefix(e.target.value)}
              className="w-full rounded border border-border bg-surface px-3 py-1.5 font-mono text-xs text-bright focus:border-teal focus:outline-none"
            />
          </div>
        </div>

        {/* Right: preview + output */}
        <div className="flex flex-col gap-4">
          {/* Scale preview */}
          <div className="rounded border border-border bg-[#0a0f1a]">
            <p className="border-b border-border px-4 py-2 font-mono text-xs uppercase tracking-widest text-muted">Scale Preview</p>
            <div className="max-h-96 overflow-y-auto p-4">
              <div className="flex flex-col gap-1">
                {[...steps].reverse().map((s) => {
                  const isBase = s.step === 0
                  const displaySize = formatValue(s.px)
                  const previewPx = Math.min(s.px, 64)
                  return (
                    <div
                      key={s.step}
                      className={`flex items-baseline gap-3 rounded px-2 py-1 transition-colors ${
                        isBase ? 'bg-teal/10 border border-teal/20' : 'hover:bg-border/20'
                      }`}
                    >
                      <span className={`w-16 shrink-0 font-mono text-[10px] ${isBase ? 'text-teal' : 'text-muted'}`}>
                        {prefix}{s.name}
                      </span>
                      <span className={`w-14 shrink-0 text-right font-mono text-[10px] ${isBase ? 'text-teal' : 'text-muted/60'}`}>
                        {displaySize}
                      </span>
                      <span
                        className={`overflow-hidden truncate leading-tight ${isBase ? 'text-bright' : 'text-primary'}`}
                        style={{ fontSize: `${previewPx}px`, lineHeight: 1.1 }}
                      >
                        {isBase ? '▶ base' : s.step > 0 ? 'heading' : 'caption'}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
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
            <div className="max-h-64 overflow-y-auto p-4">
              <ColoredCSS css={cssOutput} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
