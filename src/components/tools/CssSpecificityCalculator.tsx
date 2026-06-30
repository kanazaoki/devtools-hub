'use client'

import { useState, useCallback, useMemo } from 'react'

// ── Specificity parser ──────────────────────────────────────────────────────────

const PSEUDO_ELEMENTS = new Set([
  'before', 'after', 'first-line', 'first-letter', 'marker',
  'placeholder', 'selection', 'backdrop', 'spelling-error',
  'grammar-error', 'cue', 'part', 'slotted', 'file-selector-button',
  'highlight', 'target-text',
])

interface Specificity {
  a: number
  b: number
  c: number
}

function splitAtTopLevel(str: string): string[] {
  const parts: string[] = []
  let depth = 0
  let start = 0
  for (let i = 0; i < str.length; i++) {
    if (str[i] === '(') depth++
    else if (str[i] === ')') depth--
    else if (depth === 0 && str[i] === ',') {
      parts.push(str.slice(start, i))
      start = i + 1
    }
  }
  parts.push(str.slice(start))
  return parts
}

function parseInner(sel: string): Specificity {
  let a = 0, b = 0, c = 0
  let i = 0

  while (i < sel.length) {
    const ch = sel[i]

    if (' \t\n>+~|'.includes(ch)) { i++; continue }

    if (ch === '#') {
      a++; i++
      while (i < sel.length && /[\w-]/.test(sel[i])) i++
    } else if (ch === '.') {
      b++; i++
      while (i < sel.length && /[\w-]/.test(sel[i])) i++
    } else if (ch === '[') {
      b++; i++
      let depth = 1
      while (i < sel.length && depth > 0) {
        if (sel[i] === '[') depth++
        else if (sel[i] === ']') depth--
        i++
      }
    } else if (ch === ':') {
      i++
      const isDouble = sel[i] === ':'
      if (isDouble) i++
      const nameStart = i
      while (i < sel.length && /[\w-]/.test(sel[i])) i++
      const name = sel.slice(nameStart, i).toLowerCase()

      let args = ''
      if (sel[i] === '(') {
        i++
        let depth = 1
        const argStart = i
        while (i < sel.length && depth > 0) {
          if (sel[i] === '(') depth++
          else if (sel[i] === ')') depth--
          i++
        }
        args = sel.slice(argStart, i - 1)
      }

      if (name === 'where') {
        // :where() always 0
      } else if (name === 'is' || name === 'not' || name === 'has') {
        const parts = splitAtTopLevel(args)
        let ma = 0, mb = 0, mc = 0
        for (const p of parts) {
          const s = parseInner(p.trim())
          if (s.a > ma || (s.a === ma && s.b > mb) || (s.a === ma && s.b === mb && s.c > mc)) {
            ma = s.a; mb = s.b; mc = s.c
          }
        }
        a += ma; b += mb; c += mc
      } else if (isDouble || PSEUDO_ELEMENTS.has(name)) {
        c++
      } else {
        b++
      }
    } else if (ch === '*') {
      i++
    } else if (/[a-zA-Z_]/.test(ch)) {
      while (i < sel.length && /[\w-]/.test(sel[i])) i++
      if (sel[i] === '|') {
        i++
        if (i < sel.length && /[a-zA-Z_]/.test(sel[i])) {
          c++
          while (i < sel.length && /[\w-]/.test(sel[i])) i++
        } else if (sel[i] === '*') {
          i++
        }
      } else {
        c++
      }
    } else {
      i++
    }
  }

  return { a, b, c }
}

function calcSpecificity(selector: string): { spec: Specificity; hasImportant: boolean; isValid: boolean } {
  if (!selector.trim()) return { spec: { a: 0, b: 0, c: 0 }, hasImportant: false, isValid: false }
  const hasImportant = /!important/i.test(selector)
  const cleaned = selector.replace(/!important/gi, '').trim()
  try {
    const spec = parseInner(cleaned)
    return { spec, hasImportant, isValid: true }
  } catch {
    return { spec: { a: 0, b: 0, c: 0 }, hasImportant, isValid: false }
  }
}

function compareSpecs(a: Specificity, b: Specificity): number {
  if (a.a !== b.a) return b.a - a.a
  if (a.b !== b.b) return b.b - a.b
  return b.c - a.c
}

// ── Constants ─────────────────────────────────────────────────────────────────

const COLOR_A = '#c084fc'  // purple — ID
const COLOR_B = '#38bdf8'  // sky — class/attr/pseudo-class
const COLOR_C = '#34d399'  // emerald — element/pseudo-element

interface Row { id: string; value: string }
let _rid = 0
function nextRowId() { return `row-${++_rid}` }

const SAMPLES = ['*', 'h1', '.class', '#id', '[type="text"]', 'a:hover', '#nav .item', '.btn.active:focus']

// ── Helpers ───────────────────────────────────────────────────────────────────

function rankAccentColor(rank: number, hasData: boolean): string {
  if (!hasData) return 'transparent'
  if (rank === 1) return '#f59e0b'
  if (rank === 2) return '#8b9eb0'
  if (rank === 3) return '#b87333'
  return '#2dd4bf'
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function SpecTuple({ spec }: { spec: Specificity }) {
  return (
    <div className="flex shrink-0 items-baseline gap-px font-mono text-sm leading-none">
      <span className="text-muted">(</span>
      <span className="font-bold tabular-nums" style={{ color: COLOR_A }}>{spec.a}</span>
      <span className="text-muted">,</span>
      <span className="font-bold tabular-nums" style={{ color: COLOR_B }}>{spec.b}</span>
      <span className="text-muted">,</span>
      <span className="font-bold tabular-nums" style={{ color: COLOR_C }}>{spec.c}</span>
      <span className="text-muted">)</span>
    </div>
  )
}

function WeightBar({ value, max, color, label }: { value: number; max: number; color: string; label: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0
  const hasValue = value > 0
  return (
    <div className="grid items-center gap-2" style={{ gridTemplateColumns: '1rem 1fr 1.5rem' }}>
      <span className="text-right font-mono text-xs font-bold" style={{ color }}>{label}</span>
      <div className="overflow-hidden rounded-sm" style={{ background: color + '18', height: 7 }}>
        <div
          className="h-full rounded-sm transition-all duration-300"
          style={{
            width: `${pct}%`,
            background: color,
            boxShadow: hasValue ? `0 0 6px ${color}80` : 'none',
          }}
        />
      </div>
      <span
        className="text-right font-mono text-xs font-bold tabular-nums transition-colors"
        style={{ color: hasValue ? color : 'var(--color-border)' }}
      >
        {value}
      </span>
    </div>
  )
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <span
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-mono text-xs font-black"
        style={{ background: '#f59e0b', color: '#1a0a00', boxShadow: '0 0 8px #f59e0b66' }}
      >
        1
      </span>
    )
  }
  if (rank === 2) {
    return (
      <span
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-mono text-xs font-bold"
        style={{ background: '#475569', color: '#e2e8f0', boxShadow: '0 0 6px #47556966' }}
      >
        2
      </span>
    )
  }
  if (rank === 3) {
    return (
      <span
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-mono text-xs font-bold"
        style={{ background: '#7c3b0a', color: '#fcd34d', boxShadow: '0 0 6px #b8733366' }}
      >
        3
      </span>
    )
  }
  return (
    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border font-mono text-xs text-muted">
      {rank}
    </span>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function CssSpecificityCalculator() {
  const [rows, setRows] = useState<Row[]>([{ id: nextRowId(), value: '' }])

  const addRow = useCallback(() => {
    if (rows.length >= 8) return
    setRows(prev => [...prev, { id: nextRowId(), value: '' }])
  }, [rows.length])

  const removeRow = useCallback((id: string) => {
    setRows(prev => prev.filter(r => r.id !== id))
  }, [])

  const updateRow = useCallback((id: string, value: string) => {
    setRows(prev => prev.map(r => r.id === id ? { ...r, value } : r))
  }, [])

  const loadSamples = useCallback(() => {
    setRows(SAMPLES.map(s => ({ id: nextRowId(), value: s })))
  }, [])

  const results = useMemo(() => rows.map(r => ({ ...r, ...calcSpecificity(r.value) })), [rows])

  const sorted = useMemo(() => [...results].sort((a, b) => compareSpecs(a.spec, b.spec)), [results])

  const ranks = useMemo(() => {
    const map = new Map<string, number>()
    let rank = 1
    for (let i = 0; i < sorted.length; i++) {
      if (i > 0 && compareSpecs(sorted[i].spec, sorted[i - 1].spec) !== 0) rank = i + 1
      map.set(sorted[i].id, rank)
    }
    return map
  }, [sorted])

  const maxA = useMemo(() => Math.max(1, ...results.map(r => r.spec.a)), [results])
  const maxB = useMemo(() => Math.max(1, ...results.map(r => r.spec.b)), [results])
  const maxC = useMemo(() => Math.max(1, ...results.map(r => r.spec.c)), [results])

  const hasMultiple = rows.length > 1

  return (
    <div className="space-y-3">

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-1">
        <p className="text-xs text-muted">
          セレクターを入力すると詳細度 (a,b,c) をリアルタイムで計算します。
          {hasMultiple && <span className="text-dim"> 複数並べると自動で優先度順にランキングされます。</span>}
        </p>
        <button
          onClick={loadSamples}
          className="rounded border border-border px-3 py-1.5 font-mono text-xs text-muted transition-all hover:border-teal hover:text-teal"
        >
          サンプルを読み込む
        </button>
      </div>

      {/* Rows */}
      <div className="space-y-2.5">
        {sorted.map((row) => {
          const { id, value, spec, hasImportant, isValid } = row
          const isEmpty = value.trim() === ''
          const hasData = !isEmpty && isValid
          const rank = ranks.get(id) ?? 1
          const accentColor = rankAccentColor(hasMultiple ? rank : 0, hasData)

          return (
            <div
              key={id}
              className="overflow-hidden rounded-lg border border-border bg-bg transition-all duration-200"
              style={{ borderLeftColor: accentColor, borderLeftWidth: '3px' }}
            >
              {/* Input row */}
              <div className="flex items-center gap-2.5 px-3 py-3">
                {/* Rank badge or spacer */}
                <div className="shrink-0 transition-all duration-200">
                  {hasMultiple && hasData
                    ? <RankBadge rank={rank} />
                    : <div className="h-6 w-6" />
                  }
                </div>

                {/* Input */}
                <input
                  type="text"
                  value={value}
                  onChange={e => updateRow(id, e.target.value)}
                  placeholder="例: #nav .item:hover span"
                  spellCheck={false}
                  className="min-w-0 flex-1 rounded border border-border bg-surface px-3 py-2 font-mono text-sm text-bright outline-none transition-colors placeholder:text-muted focus:border-teal"
                />

                {/* Result readout */}
                <div className="flex shrink-0 items-center gap-2">
                  {hasData && <SpecTuple spec={spec} />}
                  {hasData && hasImportant && (
                    <span className="rounded border border-red-500/30 bg-red-500/10 px-2 py-0.5 font-mono text-xs font-bold text-red-400">
                      !important
                    </span>
                  )}
                  {!isEmpty && !isValid && (
                    <span className="font-mono text-xs text-muted">—</span>
                  )}
                </div>

                {/* Delete */}
                {rows.length > 1 && (
                  <button
                    onClick={() => removeRow(id)}
                    className="ml-0.5 shrink-0 rounded p-1.5 text-muted transition-colors hover:bg-surface hover:text-dim"
                    aria-label="削除"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                )}
              </div>

              {/* Weight bars */}
              {hasData && (
                <div
                  className="space-y-1.5 px-4 pb-3"
                  style={{ paddingLeft: '3.25rem' }}
                >
                  <WeightBar value={spec.a} max={maxA} color={COLOR_A} label="a" />
                  <WeightBar value={spec.b} max={maxB} color={COLOR_B} label="b" />
                  <WeightBar value={spec.c} max={maxC} color={COLOR_C} label="c" />
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Add row */}
      {rows.length < 8 && (
        <button
          onClick={addRow}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border py-3 font-mono text-xs text-muted transition-all hover:border-teal hover:text-teal"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          セレクターを追加 ({rows.length}/8)
        </button>
      )}

      {/* Legend */}
      <div className="mt-2 rounded-lg border border-border" style={{ background: 'var(--color-bg)' }}>
        <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
          <div className="h-1.5 w-1.5 rounded-full" style={{ background: COLOR_A }} />
          <div className="h-1.5 w-1.5 rounded-full" style={{ background: COLOR_B }} />
          <div className="h-1.5 w-1.5 rounded-full" style={{ background: COLOR_C }} />
          <span className="ml-1 font-mono text-xs uppercase tracking-widest text-muted">Specificity Reference</span>
        </div>
        <div className="grid gap-0 text-xs sm:grid-cols-3">
          {[
            { key: 'a', color: COLOR_A, label: 'ID', examples: ['#id'] },
            { key: 'b', color: COLOR_B, label: 'Class / Attr / Pseudo-class', examples: ['.class', '[attr]', ':hover'] },
            { key: 'c', color: COLOR_C, label: 'Element / Pseudo-element', examples: ['div', '::before'] },
          ].map(({ key, color, label, examples }, i) => (
            <div
              key={key}
              className={`px-4 py-3 ${i < 2 ? 'sm:border-r sm:border-border' : ''}`}
            >
              <div className="mb-1.5 flex items-center gap-2">
                <span className="font-mono font-black" style={{ color }}>{key}</span>
                <span className="text-dim">{label}</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {examples.map(ex => (
                  <code key={ex} className="rounded bg-surface px-1.5 py-0.5 font-mono text-xs text-muted">{ex}</code>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="border-t border-border px-4 py-2.5">
          <p className="font-mono text-xs text-muted">
            <code className="text-dim">*</code> → (0,0,0) &nbsp;·&nbsp;
            <code className="text-dim">:where()</code> → 0 &nbsp;·&nbsp;
            <code className="text-dim">:is() :not() :has()</code> → 引数の最大詳細度
          </p>
        </div>
      </div>

    </div>
  )
}
