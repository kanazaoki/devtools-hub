'use client'

import { useState, useCallback, useMemo } from 'react'
import { auditCss, parseRules, type AuditResult } from '@/lib/cssTokenAudit'

function AuditPanel({ audit }: { audit: AuditResult }) {
  const problems =
    audit.themeGaps.length + (audit.unguardedMedia ? 1 : 0) + audit.rawColors.length + audit.undefinedRefs.length
  const Item = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="rounded border border-amber-400/30 bg-amber-400/5 px-3 py-2">
      <p className="font-mono text-xs font-semibold text-amber-300">{title}</p>
      <div className="mt-1 font-mono text-[11px] leading-relaxed text-amber-100/80">{children}</div>
    </div>
  )
  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <div className="border-b border-border bg-surface px-4 py-2.5">
        <span className="font-mono text-[11px] uppercase tracking-widest text-muted">テーマの点検</span>
        <span className="ml-3 font-mono text-[11px] text-dim">
          変数 {audit.definedCount} 個 ／ テーマで上書きしている場所 {audit.themeScopes.length} か所
        </span>
      </div>
      <div className="flex flex-col gap-2 p-4">
        {problems === 0 && (
          <p className="font-mono text-xs text-teal">
            上書きの漏れ・手動切替の問題・色の直書き・未定義の参照は見つかりませんでした
          </p>
        )}
        {audit.unguardedMedia && (
          <Item title="OS がダークだと、手動でライトを選んでもダークのままになります">
            @media (prefers-color-scheme: dark) の中の :root に :not([data-theme=&quot;light&quot;]) が付いていません。
            [data-theme] で手動切替をしているなら、:root:not([data-theme=&quot;light&quot;]) と書きます。
          </Item>
        )}
        {audit.themeGaps.map((g) => (
          <Item key={g.scope} title={`上書きの漏れ：${g.scope}`}>
            同じテーマを上書きしている別の場所にはあるのに、ここには無い変数：{g.missing.join(', ')}
          </Item>
        ))}
        {audit.undefinedRefs.length > 0 && (
          <Item title={`定義されていない変数の参照（${audit.undefinedRefs.length}）`}>
            {audit.undefinedRefs.map((r) => `${r.selector} で var(${r.name})`).join(' ／ ')}
            <span className="block text-amber-100/60">予備の値（var(--x, #fff) の2つ目）も無いので、この宣言は無効になります</span>
          </Item>
        )}
        {audit.rawColors.length > 0 && (
          <Item title={`色を直接書いている宣言（${audit.rawColors.length}）`}>
            {audit.rawColors.slice(0, 20).map((c, i) => (
              <span key={i} className="block">
                {c.selector} {'{'} {c.prop}: {c.value} {'}'}
              </span>
            ))}
            <span className="block text-amber-100/60">テーマを切り替えてもこの色は変わりません。意図した固定色でなければ変数に置き換えます</span>
          </Item>
        )}
      </div>
    </div>
  )
}

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
  /** 表示用（@ルールとセレクターを並べたもの） */
  scope: string
  selector: string
  atRules: string[]
  name: string
  value: string
  originalValue: string
}

function stripComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, '')
}

// ⚠ 以前は一番外側のブロックしか見ていなかったため、@media の中の :root が
// 「@media (...)」というスコープになり、出力CSSでは :root { } が抜けて無効な CSS になっていた。
// 入れ子を読む parseRules を使い、@ルールとセレクターを分けて持つ。
function parseCssVars(css: string): CssVar[] {
  const vars: CssVar[] = []
  let idCounter = 0
  for (const r of parseRules(stripComments(css))) {
    const selector = r.selector || ':root'
    for (const d of r.decls) {
      if (!d.prop.startsWith('--')) continue
      vars.push({
        id: `v${idCounter++}`,
        scope: [...r.atRules, selector].join(' '),
        selector,
        atRules: r.atRules,
        name: d.prop,
        value: d.value,
        originalValue: d.value,
      })
    }
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
  for (const scopeVars of byScope.values()) {
    const { atRules, selector } = scopeVars[0]
    const pad = '  '.repeat(atRules.length)
    atRules.forEach((a, k) => lines.push(`${'  '.repeat(k)}${a} {`))
    lines.push(`${pad}${selector} {`)
    for (const v of scopeVars) lines.push(`${pad}  ${v.name}: ${v.value};`)
    lines.push(`${pad}}`)
    atRules.forEach((_, k) => lines.push(`${'  '.repeat(atRules.length - 1 - k)}}`))
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
  const audit = useMemo(() => (parsed && inputCss.trim() ? auditCss(inputCss) : null), [parsed, inputCss])

  const handleParse = useCallback((css: string) => {
    setVars(parseCssVars(css))
    setParsed(true)
  }, [])

  const handleInputChange = useCallback((css: string) => {
    setInputCss(css)
    if (parsed) {
      const extracted = parseCssVars(css)
      setVars(prev => {
        // 手で編集した値だけを引き継ぐ。元の値が変わった変数（別のCSSを貼った等）は新しい値を使う。
        // ⚠ 以前は名前が同じなら前の値で上書きしていたので、サンプルの値が新しいCSSに混ざっていた
        const editedMap = new Map(
          prev.filter(v => v.value !== v.originalValue).map(v => [`${v.scope}::${v.name}`, v]),
        )
        return extracted.map(v => {
          const old = editedMap.get(`${v.scope}::${v.name}`)
          return old && old.originalValue === v.originalValue ? { ...v, value: old.value } : v
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

      {audit && <AuditPanel audit={audit} />}

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
