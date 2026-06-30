'use client'

import { useState, useCallback, useMemo } from 'react'

// ── CSS Syntax Highlight ────────────────────────────────────────────────────

function CssSyntaxHighlight({ code }: { code: string }) {
  const lines = code.split('\n')
  return (
    <>
      {lines.map((line, i) => {
        if (/^[^\s{].*\{$/.test(line.trim())) {
          return <div key={i}><span className="text-teal">{line}</span>{'\n'}</div>
        }
        const m = line.match(/^(\s*)(--[\w-]+)(\s*:\s*)(.+?)(;?)$/)
        if (m) {
          return (
            <div key={i}>
              {m[1]}
              <span className="text-[#7dd3fc]">{m[2]}</span>
              <span className="text-muted">{m[3]}</span>
              <span className="text-amber-300">{m[4]}</span>
              <span className="text-muted">{m[5]}</span>
              {'\n'}
            </div>
          )
        }
        return <div key={i}><span className="text-dim">{line}</span>{'\n'}</div>
      })}
    </>
  )
}

// ── CSS Variable Parser ─────────────────────────────────────────────────────

interface CssVar {
  id: string
  scope: string
  name: string
  value: string
  originalValue: string
}

function stripComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, '')
}

function parseCssVars(css: string): CssVar[] {
  const clean = stripComments(css)
  const vars: CssVar[] = []
  let idCounter = 0

  let i = 0
  while (i < clean.length) {
    const braceStart = clean.indexOf('{', i)
    if (braceStart === -1) break

    const selectorRaw = clean.slice(i, braceStart).trim()
    const selector = selectorRaw.replace(/\s+/g, ' ').trim() || ':root'

    let depth = 1
    let j = braceStart + 1
    while (j < clean.length && depth > 0) {
      if (clean[j] === '{') depth++
      else if (clean[j] === '}') depth--
      j++
    }
    const blockContent = clean.slice(braceStart + 1, j - 1)

    const varPattern = /(--[\w-]+)\s*:\s*([^;{]+?)\s*;/g
    let match
    while ((match = varPattern.exec(blockContent)) !== null) {
      vars.push({
        id: `v${idCounter++}`,
        scope: selector,
        name: match[1],
        value: match[2].trim(),
        originalValue: match[2].trim(),
      })
    }

    i = j
  }

  return vars
}

// ── Type Detection ──────────────────────────────────────────────────────────

type VarType = 'color' | 'number' | 'string'

const COLOR_RE = /^(#[0-9a-fA-F]{3,8}|rgb\(|rgba\(|hsl\(|hsla\()/.source
const NUMBER_RE = /^-?(\d+\.?\d*|\.\d+)(px|rem|em|vh|vw|vmin|vmax|%|pt|cm|mm|ex|ch|fr|deg|rad|turn|ms|s)?$/.source

function detectType(value: string): VarType {
  if (new RegExp(COLOR_RE).test(value)) return 'color'
  if (new RegExp(NUMBER_RE).test(value.trim())) return 'number'
  return 'string'
}

function parseNumber(value: string): { num: number; unit: string } {
  const m = value.trim().match(/^(-?[\d.]+)(.*)$/)
  if (!m) return { num: 0, unit: '' }
  return { num: parseFloat(m[1]), unit: m[2].trim() }
}

function unitRange(unit: string): { min: number; max: number; step: number } {
  switch (unit) {
    case 'px':  return { min: 0, max: 200, step: 1 }
    case 'rem':
    case 'em':  return { min: 0, max: 10, step: 0.1 }
    case '%':   return { min: 0, max: 100, step: 1 }
    case 'vh':
    case 'vw':  return { min: 0, max: 100, step: 1 }
    case 'deg': return { min: 0, max: 360, step: 1 }
    case 'ms':  return { min: 0, max: 2000, step: 10 }
    case 's':   return { min: 0, max: 10, step: 0.1 }
    case '':    return { min: 0, max: 10, step: 0.1 }
    default:    return { min: 0, max: 100, step: 1 }
  }
}

function toHexColor(value: string): string {
  const v = value.trim()
  if (/^#[0-9a-fA-F]{6}$/i.test(v)) return v
  if (/^#[0-9a-fA-F]{3}$/i.test(v)) {
    const r = v[1], g = v[2], b = v[3]
    return `#${r}${r}${g}${g}${b}${b}`
  }
  if (/^#[0-9a-fA-F]{8}$/i.test(v)) return v.slice(0, 7)
  const rgbM = v.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/)
  if (rgbM) {
    const [, r, g, b] = rgbM
    return '#' + [r, g, b].map(n => parseInt(n).toString(16).padStart(2, '0')).join('')
  }
  return '#000000'
}

// ── Sample CSS ──────────────────────────────────────────────────────────────

const SAMPLE_CSS = `:root {
  /* Colors */
  --color-primary: #3b82f6;
  --color-secondary: #8b5cf6;
  --color-background: #0f172a;
  --color-surface: rgb(30, 41, 59);
  --color-text: #e2e8f0;
  --color-accent: hsl(142, 76%, 36%);

  /* Typography */
  --font-size-base: 16px;
  --font-size-lg: 1.125rem;
  --line-height: 1.5;
  --letter-spacing: 0.05em;

  /* Spacing */
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 32px;

  /* Misc */
  --border-radius: 8px;
  --transition-duration: 300ms;
  --font-family: "Inter", sans-serif;
}

.card {
  --card-padding: 24px;
  --card-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}`

// ── Build Output CSS ────────────────────────────────────────────────────────

function buildOutputCss(vars: CssVar[]): string {
  const byScope = new Map<string, CssVar[]>()
  for (const v of vars) {
    if (!byScope.has(v.scope)) byScope.set(v.scope, [])
    byScope.get(v.scope)!.push(v)
  }
  const lines: string[] = []
  for (const [scope, scopeVars] of byScope) {
    lines.push(`${scope} {`)
    for (const v of scopeVars) lines.push(`  ${v.name}: ${v.value};`)
    lines.push('}')
    lines.push('')
  }
  return lines.join('\n').trimEnd()
}

// ── Type badge ──────────────────────────────────────────────────────────────

function TypeBadge({ type }: { type: VarType }) {
  const styles: Record<VarType, string> = {
    color:  'bg-amber-500/15 text-amber-400 border-amber-500/30',
    number: 'bg-teal/15 text-teal border-teal/30',
    string: 'bg-pink-500/15 text-pink-400 border-pink-500/30',
  }
  return (
    <span className={`w-fit rounded border px-1.5 py-px font-mono text-[10px] leading-tight ${styles[type]}`}>
      {type}
    </span>
  )
}

// ── VarName ─────────────────────────────────────────────────────────────────

function VarName({ name }: { name: string }) {
  return (
    <span className="font-mono text-xs">
      <span className="text-muted">--</span>
      <span className="text-bright">{name.slice(2)}</span>
    </span>
  )
}

// ── Editors ─────────────────────────────────────────────────────────────────

function ColorEditor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const hex = toHexColor(value)
  return (
    <div className="flex items-center gap-2.5">
      <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-md border border-border shadow-inner">
        <input
          type="color"
          value={hex}
          onChange={e => onChange(e.target.value)}
          className="absolute inset-[-4px] h-[calc(100%+8px)] w-[calc(100%+8px)] cursor-pointer border-0 bg-transparent p-0"
          title="カラーピッカー"
        />
      </div>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-40 rounded border border-border bg-bg px-2 py-1 font-mono text-xs text-bright outline-none transition-colors focus:border-teal focus:ring-1 focus:ring-teal/20"
        spellCheck={false}
      />
    </div>
  )
}

function NumberEditor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { num, unit } = parseNumber(value)
  const range = unitRange(unit)
  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        type="range"
        min={range.min}
        max={range.max}
        step={range.step}
        value={Math.max(range.min, Math.min(range.max, num))}
        onChange={e => onChange(e.target.value + unit)}
        className="w-32 cursor-pointer accent-teal"
      />
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-24 rounded border border-border bg-bg px-2 py-1 font-mono text-xs text-bright outline-none transition-colors focus:border-teal focus:ring-1 focus:ring-teal/20"
        spellCheck={false}
      />
    </div>
  )
}

function StringEditor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full max-w-sm rounded border border-border bg-bg px-2 py-1 font-mono text-xs text-bright outline-none transition-colors focus:border-teal focus:ring-1 focus:ring-teal/20"
      spellCheck={false}
    />
  )
}

// ── Main Component ──────────────────────────────────────────────────────────

export function CssVariableInspector() {
  const [inputCss, setInputCss] = useState('')
  const [vars, setVars] = useState<CssVar[]>([])
  const [copied, setCopied] = useState(false)
  const [parsed, setParsed] = useState(false)

  const handleParse = useCallback((css: string) => {
    setVars(parseCssVars(css))
    setParsed(true)
  }, [])

  const handleInputChange = useCallback((css: string) => {
    setInputCss(css)
    if (parsed) {
      const extracted = parseCssVars(css)
      setVars(prev => {
        const editedMap = new Map(prev.map(v => [`${v.scope}::${v.name}`, v.value]))
        return extracted.map(v => {
          const key = `${v.scope}::${v.name}`
          return editedMap.has(key) ? { ...v, value: editedMap.get(key)! } : v
        })
      })
    }
  }, [parsed])

  const handleVarChange = useCallback((id: string, newValue: string) => {
    setVars(prev => prev.map(v => v.id === id ? { ...v, value: newValue } : v))
  }, [])

  const outputCss = useMemo(() => buildOutputCss(vars), [vars])

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(outputCss)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = outputCss
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [outputCss])

  const handleSample = useCallback(() => {
    setInputCss(SAMPLE_CSS)
    setVars(parseCssVars(SAMPLE_CSS))
    setParsed(true)
  }, [])

  const byScope = useMemo(() => {
    const map = new Map<string, CssVar[]>()
    for (const v of vars) {
      if (!map.has(v.scope)) map.set(v.scope, [])
      map.get(v.scope)!.push(v)
    }
    return map
  }, [vars])

  return (
    <div className="flex flex-col gap-8">

      {/* ── Input panel ── */}
      <div className="overflow-hidden rounded-lg border border-border">
        <div className="flex items-center justify-between border-b border-border bg-surface px-4 py-2.5">
          <span className="font-mono text-[11px] uppercase tracking-widest text-muted">CSS Input</span>
          <button
            onClick={handleSample}
            className="rounded border border-border px-3 py-1 font-mono text-[11px] text-dim transition-colors hover:border-teal hover:text-teal"
          >
            サンプルを読み込む
          </button>
        </div>
        <textarea
          value={inputCss}
          onChange={e => handleInputChange(e.target.value)}
          onBlur={() => { if (inputCss.trim()) handleParse(inputCss) }}
          placeholder={`:root {\n  --color-primary: #3b82f6;\n  --font-size-base: 16px;\n  --font-family: "Inter", sans-serif;\n}`}
          rows={10}
          className="w-full resize-y bg-bg p-4 font-mono text-xs leading-relaxed text-bright outline-none placeholder:text-muted/50"
          spellCheck={false}
        />
        <div className="flex items-center justify-end border-t border-border bg-surface px-4 py-2.5">
          <button
            onClick={() => handleParse(inputCss)}
            disabled={!inputCss.trim()}
            className="rounded bg-teal px-4 py-1.5 font-mono text-[11px] font-medium text-bg transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-30"
          >
            変数を抽出
          </button>
        </div>
      </div>

      {/* ── Variable list ── */}
      {parsed && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <span className="font-mono text-[11px] uppercase tracking-widest text-muted">Extracted Variables</span>
            {vars.length > 0 && (
              <span className="rounded-full border border-border px-2 py-px font-mono text-[10px] text-dim">
                {vars.length}
              </span>
            )}
          </div>

          {vars.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border py-12">
              <p className="font-mono text-xs text-muted">変数が見つかりません</p>
              <p className="text-xs text-muted/60">
                CSSに{' '}
                <code className="rounded bg-surface px-1 py-px font-mono text-dim">--変数名: 値;</code>
                {' '}が含まれているか確認してください
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {[...byScope.entries()].map(([scope, scopeVars]) => (
                <div key={scope} className="overflow-hidden rounded-lg border border-border">
                  {/* Scope header with left teal accent bar */}
                  <div className="flex items-center gap-0 border-b border-border bg-surface">
                    <div className="w-0.5 self-stretch bg-teal" />
                    <div className="flex flex-1 items-center gap-3 px-4 py-2.5">
                      <span className="font-mono text-xs text-teal">{scope}</span>
                      <span className="ml-auto rounded-full bg-teal/10 px-2 py-px font-mono text-[10px] text-teal/70">
                        {scopeVars.length}
                      </span>
                    </div>
                  </div>

                  {/* Variable rows */}
                  <div className="divide-y divide-border/40">
                    {scopeVars.map(v => {
                      const type = detectType(v.value)
                      return (
                        <div
                          key={v.id}
                          className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 transition-colors hover:bg-white/[0.025]"
                        >
                          <div className="flex min-w-0 w-52 shrink-0 flex-col gap-1.5">
                            <VarName name={v.name} />
                            <TypeBadge type={type} />
                          </div>
                          <div className="flex-1 min-w-0">
                            {type === 'color' && (
                              <ColorEditor value={v.value} onChange={val => handleVarChange(v.id, val)} />
                            )}
                            {type === 'number' && (
                              <NumberEditor value={v.value} onChange={val => handleVarChange(v.id, val)} />
                            )}
                            {type === 'string' && (
                              <StringEditor value={v.value} onChange={val => handleVarChange(v.id, val)} />
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Output CSS ── */}
      {vars.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-border">
          <div className="flex items-center justify-between border-b border-border bg-surface px-4 py-2.5">
            <span className="font-mono text-[11px] uppercase tracking-widest text-muted">Output CSS</span>
            <button
              onClick={handleCopy}
              className={`rounded border px-3 py-1 font-mono text-[11px] transition-all ${
                copied
                  ? 'border-teal/40 bg-teal/10 text-teal'
                  : 'border-border text-dim hover:border-teal hover:text-teal'
              }`}
            >
              {copied ? 'コピー完了!' : 'コピー'}
            </button>
          </div>
          <pre className="overflow-x-auto bg-bg p-4 font-mono text-xs leading-relaxed">
            <CssSyntaxHighlight code={outputCss} />
          </pre>
        </div>
      )}
    </div>
  )
}
