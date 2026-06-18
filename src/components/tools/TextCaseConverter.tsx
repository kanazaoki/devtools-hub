'use client'

import { useState, useCallback, useMemo } from 'react'

// ── Conversion engine ──────────────────────────────────────────────────────────

function tokenize(text: string): string[] {
  return text
    .trim()
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .replace(/[-_]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
}

function toCamel(words: string[]): string {
  return words
    .map((w, i) => i === 0 ? w.toLowerCase() : w[0].toUpperCase() + w.slice(1).toLowerCase())
    .join('')
}

function toPascal(words: string[]): string {
  return words.map(w => w[0].toUpperCase() + w.slice(1).toLowerCase()).join('')
}

function toSnake(words: string[]): string {
  return words.map(w => w.toLowerCase()).join('_')
}

function toKebab(words: string[]): string {
  return words.map(w => w.toLowerCase()).join('-')
}

function toScreaming(words: string[]): string {
  return words.map(w => w.toUpperCase()).join('_')
}

function toTitle(words: string[]): string {
  return words.map(w => w[0].toUpperCase() + w.slice(1).toLowerCase()).join(' ')
}

function toUpper(words: string[]): string {
  return words.map(w => w.toUpperCase()).join(' ')
}

function toLower(words: string[]): string {
  return words.map(w => w.toLowerCase()).join(' ')
}

const FORMATS = [
  { id: 'camel',     label: 'camelCase',           fn: toCamel },
  { id: 'pascal',    label: 'PascalCase',           fn: toPascal },
  { id: 'snake',     label: 'snake_case',           fn: toSnake },
  { id: 'kebab',     label: 'kebab-case',           fn: toKebab },
  { id: 'screaming', label: 'SCREAMING_SNAKE_CASE', fn: toScreaming },
  { id: 'title',     label: 'Title Case',           fn: toTitle },
  { id: 'upper',     label: 'UPPERCASE',            fn: toUpper },
  { id: 'lower',     label: 'lowercase',            fn: toLower },
] as const

const SAMPLE = 'hello world example'

// ── Component ──────────────────────────────────────────────────────────────────

export function TextCaseConverter() {
  const [input, setInput] = useState(SAMPLE)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [copiedAll, setCopiedAll] = useState(false)

  const words = useMemo(() => tokenize(input), [input])

  const results = useMemo(() => {
    if (words.length === 0) return null
    return FORMATS.map(({ id, label, fn }) => ({ id, label, value: fn(words) }))
  }, [words])

  const wordCount = useMemo(() => words.length, [words])
  const charCount = useMemo(() => input.length, [input])

  const copyOne = useCallback(async (id: string, value: string) => {
    await navigator.clipboard.writeText(value)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 1500)
  }, [])

  const copyAll = useCallback(async () => {
    if (!results) return
    const text = results.map(r => `${r.label}: ${r.value}`).join('\n')
    await navigator.clipboard.writeText(text)
    setCopiedAll(true)
    setTimeout(() => setCopiedAll(false), 1500)
  }, [results])

  return (
    <div className="space-y-4">

      {/* Input */}
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <label htmlFor="case-input" className="font-mono text-[9px] uppercase tracking-widest text-muted">
            <span className="mr-1.5 text-muted/40">{'>'}</span>Input
          </label>
          {(wordCount > 0 || charCount > 0) && (
            <span className="font-mono text-[9px] tabular-nums text-muted/50">
              {wordCount} words · {charCount} chars
            </span>
          )}
        </div>
        <textarea
          id="case-input"
          value={input}
          onChange={e => setInput(e.target.value)}
          spellCheck={false}
          placeholder="Enter text to convert…"
          rows={3}
          className="w-full resize-none rounded border border-border border-l-2 border-l-teal/40 bg-bg px-4 py-3 font-mono text-sm leading-relaxed text-primary outline-none transition-colors placeholder:text-muted/30 focus:border-border-hi focus:border-l-teal/70"
        />
      </div>

      {/* Results */}
      {results ? (
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <span className="font-mono text-[9px] uppercase tracking-widest text-muted">
              <span className="mr-1.5 text-muted/40">#</span>Results
            </span>
            <button
              onClick={copyAll}
              className={`rounded border px-2.5 py-1 font-mono text-[10px] transition-all duration-100 ${
                copiedAll
                  ? 'border-teal/50 bg-teal/8 text-teal'
                  : 'border-border text-muted hover:border-border-hi hover:text-dim'
              }`}
            >
              {copiedAll ? 'Copied!' : '全形式をコピー'}
            </button>
          </div>

          <div className="overflow-hidden rounded border border-border">
            {results.map(({ id, label, value }, i) => (
              <div
                key={id}
                className={`group flex items-center gap-3 border-l-2 border-l-transparent px-4 py-2.5 transition-colors hover:border-l-teal/30 hover:bg-white/[0.02] ${
                  i < results.length - 1 ? 'border-b border-border' : ''
                }`}
              >
                <span className="w-7 shrink-0 font-mono text-[9px] tabular-nums text-muted/30">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="w-40 shrink-0 font-mono text-[10px] text-muted/60">{label}</span>
                <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap font-mono text-sm text-bright">
                  {value}
                </span>
                <button
                  onClick={() => copyOne(id, value)}
                  className={`shrink-0 rounded border px-2.5 py-1 font-mono text-[10px] opacity-0 transition-all duration-100 group-hover:opacity-100 ${
                    copiedId === id
                      ? 'border-teal/50 bg-teal/8 text-teal opacity-100'
                      : 'border-border text-muted hover:border-border-hi hover:text-dim'
                  }`}
                >
                  {copiedId === id ? 'Copied!' : 'Copy'}
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded border border-border px-4 py-10 text-center">
          <p className="font-mono text-[11px] text-muted/40">テキストを入力すると変換結果が表示されます</p>
        </div>
      )}
    </div>
  )
}
