'use client'

import { useState } from 'react'

const DEFAULT_TEXT = `吾輩は猫である。名前はまだ無い。
どこで生れたかとんと見当がつかぬ。
何でも薄暗いじめじめした所でニャーニャー泣いていた事だけは記憶している。`

interface Params {
  fontSize: number
  lineHeight: number
  letterSpacing: number
  maxWidth: number
}

function buildCss(p: Params): string {
  return `font-size: ${p.fontSize}px;
line-height: ${p.lineHeight.toFixed(2)};
letter-spacing: ${p.letterSpacing.toFixed(2)}em;
max-width: ${p.maxWidth}px;`
}

function buildJson(p: Params): string {
  return JSON.stringify(
    {
      fontSize: p.fontSize,
      lineHeight: p.lineHeight,
      letterSpacing: p.letterSpacing,
      maxWidth: p.maxWidth,
    },
    null,
    2
  )
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {}
  }

  return (
    <button
      onClick={handleCopy}
      className={`rounded px-3 py-1 font-mono text-[10px] uppercase tracking-wider transition-all duration-150 ${
        copied
          ? 'bg-teal text-bg'
          : 'border border-border text-muted hover:border-border-hi hover:text-dim'
      }`}
    >
      {copied ? '✓ Copied' : label}
    </button>
  )
}

export function TextLayoutChecker() {
  const [text, setText] = useState(DEFAULT_TEXT)
  const [params, setParams] = useState<Params>({
    fontSize: 16,
    lineHeight: 1.8,
    letterSpacing: 0.05,
    maxWidth: 600,
  })

  function set(key: keyof Params, val: number) {
    setParams((prev) => ({ ...prev, [key]: val }))
  }

  const css = buildCss(params)
  const json = buildJson(params)

  const sliders: {
    label: string
    key: keyof Params
    min: number
    max: number
    step: number
    unit: string
    display: string
  }[] = [
    {
      label: 'Font Size',
      key: 'fontSize',
      min: 8,
      max: 64,
      step: 1,
      unit: 'px',
      display: `${params.fontSize}px`,
    },
    {
      label: 'Line Height',
      key: 'lineHeight',
      min: 1.0,
      max: 3.0,
      step: 0.05,
      unit: '',
      display: params.lineHeight.toFixed(2),
    },
    {
      label: 'Letter Spacing',
      key: 'letterSpacing',
      min: -0.1,
      max: 0.5,
      step: 0.01,
      unit: 'em',
      display: `${params.letterSpacing.toFixed(2)}em`,
    },
    {
      label: 'Max Width',
      key: 'maxWidth',
      min: 200,
      max: 1200,
      step: 10,
      unit: 'px',
      display: `${params.maxWidth}px`,
    },
  ]

  return (
    <div className="space-y-5">
      {/* Sliders panel */}
      <div className="rounded-lg border border-border bg-surface-hi divide-y divide-border">
        {sliders.map((s) => (
          <div key={s.key} className="flex items-center gap-3 px-4 py-2.5">
            <label className="w-28 shrink-0 font-mono text-[10px] uppercase tracking-widest text-muted">
              {s.label}
            </label>
            <input
              type="range"
              min={s.min}
              max={s.max}
              step={s.step}
              value={params[s.key]}
              onChange={(e) => set(s.key, Number(e.target.value))}
              className="flex-1 accent-teal"
            />
            <span className="w-16 shrink-0 text-right font-mono text-xs tabular-nums text-bright">
              {s.display}
            </span>
          </div>
        ))}
      </div>

      {/* Preview area */}
      <div className="overflow-hidden rounded-xl border border-border">
        {/* Preview header */}
        <div className="flex items-center justify-between border-b border-border bg-surface-hi px-4 py-2">
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted">Preview</span>
          <span className="font-mono text-[10px] text-muted/60 tabular-nums">
            max-width: {params.maxWidth}px
          </span>
        </div>
        <div className="relative bg-surface" style={{ minHeight: '160px' }}>
          {/* Max-width boundary line */}
          <div
            className="pointer-events-none absolute inset-y-0 border-r border-dashed border-teal/30"
            style={{ left: `${Math.min(params.maxWidth, 1100)}px` }}
            aria-hidden="true"
          />
          {/* Teal label at the boundary line */}
          <div
            className="pointer-events-none absolute top-2 font-mono text-[8px] text-teal/50"
            style={{ left: `${Math.min(params.maxWidth, 1100) + 4}px` }}
            aria-hidden="true"
          >
            ← {params.maxWidth}px
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full resize-none bg-transparent px-4 py-4 text-primary outline-none"
            style={{
              fontSize: `${params.fontSize}px`,
              lineHeight: params.lineHeight,
              letterSpacing: `${params.letterSpacing}em`,
              maxWidth: `${params.maxWidth}px`,
            }}
            rows={6}
            aria-label="プレビューテキスト"
          />
        </div>
      </div>

      {/* CSS output */}
      <div
        className="overflow-hidden rounded-lg border border-border"
        style={{ borderLeftColor: 'rgb(0,200,150)', borderLeftWidth: '3px' }}
      >
        <div className="flex items-center justify-between border-b border-border bg-surface-hi px-4 py-2">
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted">CSS</span>
          <CopyButton text={css} label="Copy CSS" />
        </div>
        <pre className="overflow-x-auto bg-surface-hi px-4 py-3 font-mono text-xs text-primary">
          {css}
        </pre>
      </div>

      {/* JSON output */}
      <div
        className="overflow-hidden rounded-lg border border-border"
        style={{ borderLeftColor: 'rgba(0,200,150,0.4)', borderLeftWidth: '3px' }}
      >
        <div className="flex items-center justify-between border-b border-border bg-surface-hi px-4 py-2">
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted">JSON</span>
          <CopyButton text={json} label="Copy JSON" />
        </div>
        <pre className="overflow-x-auto bg-surface-hi px-4 py-3 font-mono text-xs text-primary">
          {json}
        </pre>
      </div>
    </div>
  )
}
