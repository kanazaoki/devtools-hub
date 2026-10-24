'use client'

import { useState, useMemo, useCallback } from 'react'
import * as yaml from 'js-yaml'
import TOML from '@iarna/toml'

type Format = 'YAML' | 'JSON' | 'TOML'

const FORMATS: Format[] = ['YAML', 'JSON', 'TOML']

const FMT = {
  YAML: {
    dot:        'bg-amber-500',
    activeBg:   'bg-amber-500/10',
    activeText: 'text-amber-400',
    activeBorder:'border-amber-500/25',
    inactiveBg: 'bg-surface',
    inactiveText:'text-muted hover:text-amber-400/70',
    leftLine:   'bg-amber-500/50',
    headerText: 'text-amber-400/80',
    outputText: 'text-amber-300/80',
    placeholder:'name: Alice\nage: 30\ntags:\n  - admin\n  - user',
  },
  JSON: {
    dot:        'bg-sky-400',
    activeBg:   'bg-sky-500/10',
    activeText: 'text-sky-400',
    activeBorder:'border-sky-500/25',
    inactiveBg: 'bg-surface',
    inactiveText:'text-muted hover:text-sky-400/70',
    leftLine:   'bg-sky-500/50',
    headerText: 'text-sky-400/80',
    outputText: 'text-sky-300/80',
    placeholder:'{\n  "name": "Alice",\n  "age": 30\n}',
  },
  TOML: {
    dot:        'bg-violet-400',
    activeBg:   'bg-violet-500/10',
    activeText: 'text-violet-400',
    activeBorder:'border-violet-500/25',
    inactiveBg: 'bg-surface',
    inactiveText:'text-muted hover:text-violet-400/70',
    leftLine:   'bg-violet-500/50',
    headerText: 'text-violet-400/80',
    outputText: 'text-violet-300/80',
    placeholder:'name = "Alice"\nage = 30\ntags = ["admin", "user"]',
  },
} satisfies Record<Format, {
  dot: string; activeBg: string; activeText: string; activeBorder: string
  inactiveBg: string; inactiveText: string; leftLine: string
  headerText: string; outputText: string; placeholder: string
}>

// 変換で値の見た目が変わる・消えるものを探す。
// ⚠ 以前は何も言わずに 1.10 → 1.1、0123 → 123（郵便番号など）、20桁の整数の下の桁、
// 日付 → 時刻つきの値、TOML での null の消失が起きていた
function scalarWarnings(input: string, from: Format): string[] {
  const w = new Set<string>()
  if (from === 'YAML') {
    for (const line of input.split(/\r?\n/)) {
      const m = /^\s*(?:-\s+|[^#:'"]+:\s+)([^\s#'"][^#]*?)\s*(?:#.*)?$/.exec(line)
      if (!m) continue
      const v = m[1]
      if (/^0\d+$/.test(v)) w.add(`「${v}」は数値として読まれ、先頭の 0 が消えます。文字列として残すなら '${v}' のように引用符で囲んでください。`)
      else if (/^-?\d+\.\d*0$/.test(v)) w.add(`「${v}」は数値として読まれ、末尾の 0 が消えます（バージョン番号なら引用符で囲んでください）。`)
      else if (/^-?\d{16,}$/.test(v)) w.add(`「${v}」は桁が多すぎて、数値として読むと下の桁が変わります。引用符で囲んでください。`)
    }
  }
  if (from === 'JSON' && /[:[,]\s*-?\d{16,}\s*[,}\]]/.test(input)) {
    w.add('16桁以上の整数は JavaScript の数値の精度を超えるため、下の桁が変わります。ID などは文字列にしてください。')
  }
  return [...w]
}

function nullPaths(v: unknown, path = ''): string[] {
  if (v === null) return [path || '(ルート)']
  if (Array.isArray(v)) return v.flatMap((x, i) => nullPaths(x, `${path}[${i}]`))
  if (v && typeof v === 'object') return Object.entries(v).flatMap(([k, x]) => nullPaths(x, path ? `${path}.${k}` : k))
  return []
}

function convert(
  input: string,
  from: Format,
  to: Format
): { output: string; error: string | null; warnings: string[] } {
  if (!input.trim()) return { output: '', error: null, warnings: [] }
  const warnings = scalarWarnings(input, from)

  let parsed: unknown
  try {
    if (from === 'JSON') {
      parsed = JSON.parse(input)
    } else if (from === 'YAML') {
      // CORE_SCHEMA：日付を Date にせず文字列のまま残す（既定のスキーマは 2024-01-01 を時刻つきの値にする）
      const docs: unknown[] = []
      yaml.loadAll(input, (d) => docs.push(d), { schema: yaml.CORE_SCHEMA })
      if (docs.length > 1) {
        warnings.push(`「---」で区切られた ${docs.length} 個の文書を、配列としてまとめました。`)
        parsed = docs
      } else {
        parsed = docs[0] ?? null
      }
    } else {
      parsed = TOML.parse(input)
    }
  } catch (e) {
    return { output: '', error: `${from} 構文エラー: ${(e as Error).message}`, warnings }
  }

  try {
    let output: string
    if (to === 'JSON') {
      output = JSON.stringify(parsed, null, 2)
    } else if (to === 'YAML') {
      output = yaml.dump(parsed, { indent: 2, lineWidth: -1 })
    } else {
      if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return { output: '', error: 'TOML にできるのはオブジェクト（キーと値の組）だけです。配列や値そのものは TOML の一番外側に置けません。', warnings }
      }
      const nulls = nullPaths(parsed)
      if (nulls.length) warnings.push(`TOML には null が無いため、${nulls.slice(0, 5).join('・')}${nulls.length > 5 ? ' など' : ''} は出力から消えます。`)
      output = TOML.stringify(parsed as TOML.JsonMap)
    }
    return { output: output.trimEnd(), error: null, warnings }
  } catch (e) {
    const msg = (e as Error).message
    const hint = /mixed types/i.test(msg) ? '（この変換ライブラリは TOML 0.5 の規則で、数値と文字列が混ざった配列を書き出せません）' : ''
    return { output: '', error: `${to} 変換エラー: ${msg}${hint}`, warnings }
  }
}

function FormatSelector({
  label,
  value,
  onChange,
}: {
  label: string
  value: Format
  onChange: (f: Format) => void
}) {
  return (
    <div className="flex flex-1 flex-col gap-1.5">
      <span className="font-mono text-[8px] uppercase tracking-[0.2em] text-muted/50">{label}</span>
      <div className="flex overflow-hidden rounded border border-border">
        {FORMATS.map((fmt, i) => {
          const s = FMT[fmt]
          const active = value === fmt
          return (
            <button
              key={fmt}
              onClick={() => onChange(fmt)}
              className={`flex flex-1 items-center justify-center gap-1.5 border-r border-border py-2 font-mono text-[10px] font-bold tracking-wide transition-all duration-100 last:border-r-0 ${
                active
                  ? `${s.activeBg} ${s.activeText} border-b-2 ${s.activeBorder}`
                  : `${s.inactiveBg} ${s.inactiveText}`
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${s.dot} ${active ? 'opacity-100' : 'opacity-30'}`} />
              {fmt}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function YamlJsonConverter() {
  const [input, setInput] = useState('')
  const [from, setFrom] = useState<Format>('YAML')
  const [to, setTo] = useState<Format>('JSON')
  const [copied, setCopied] = useState(false)

  const { output, error, warnings } = useMemo(() => convert(input, from, to), [input, from, to])

  const handleSwap = useCallback(() => {
    setFrom(to)
    setTo(from)
    setInput(output)
  }, [from, to, output])

  const handleCopy = useCallback(() => {
    if (!output || error) return
    navigator.clipboard.writeText(output).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }, [output, error])

  const handleClear = useCallback(() => {
    setInput('')
  }, [])

  const fromStyle = FMT[from]
  const toStyle = FMT[to]

  return (
    <div className="space-y-3">
      {/* Pipeline selector bar */}
      <div className="flex items-end gap-2">
        <FormatSelector label="From" value={from} onChange={setFrom} />

        {/* Swap button — pipeline connector */}
        <div className="mb-0.5 shrink-0 pb-[1px]">
          <button
            onClick={handleSwap}
            data-testid="swap-button"
            title="From と To を入れ替え"
            className="group flex h-9 w-9 items-center justify-center rounded border border-border bg-surface text-muted/50 transition-all duration-150 hover:border-border-hi hover:bg-surface-hi hover:text-primary"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="transition-transform duration-200 group-hover:rotate-180"
            >
              <path d="M7 16V4m0 0L3 8m4-4 4 4" />
              <path d="M17 8v12m0 0 4-4m-4 4-4-4" />
            </svg>
          </button>
        </div>

        <FormatSelector label="To" value={to} onChange={setTo} />
      </div>

      {/* Split editor — stacks on mobile, side-by-side on sm+ */}
      <div className="grid grid-cols-1 overflow-hidden rounded border border-border sm:grid-cols-2">
        {/* Input column */}
        <div className="relative flex flex-col border-b border-border sm:border-b-0 sm:border-r">
          <span
            aria-hidden="true"
            className={`absolute inset-y-0 left-0 z-10 w-[2px] transition-colors duration-300 ${
              input.trim() && !error ? fromStyle.leftLine : 'bg-transparent'
            }`}
          />
          {/* Input header */}
          <div className="flex items-center justify-between border-b border-border bg-surface/60 px-4 py-2.5">
            <div className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${fromStyle.dot}`} />
              <span className={`font-mono text-[10px] font-semibold uppercase tracking-widest ${fromStyle.headerText}`}>
                {from}
              </span>
            </div>
            <button
              onClick={handleClear}
              data-testid="clear-button"
              className="rounded px-2 py-0.5 font-mono text-[9px] text-muted/40 transition-colors hover:text-muted"
            >
              Clear
            </button>
          </div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={fromStyle.placeholder}
            data-testid="input-area"
            rows={18}
            spellCheck={false}
            className="flex-1 resize-none bg-bg p-4 pl-5 font-mono text-xs leading-relaxed text-primary placeholder:text-muted/15 focus:outline-none"
          />
          {error && (
            <div
              className="border-t border-red-500/20 bg-red-500/5 px-4 py-2"
              data-testid="error-bar"
            >
              <p className="font-mono text-[10px] leading-relaxed text-red-400">{error}</p>
            </div>
          )}
          {warnings.length > 0 && (
            <div className="border-t border-amber-400/20 bg-amber-400/5 px-4 py-2">
              {warnings.map((w) => (
                <p key={w} className="font-mono text-[10px] leading-relaxed text-amber-300">⚠ {w}</p>
              ))}
            </div>
          )}
        </div>

        {/* Output column */}
        <div className="relative flex flex-col">
          <span
            aria-hidden="true"
            className={`absolute inset-y-0 left-0 z-10 w-[2px] transition-colors duration-300 ${
              output && !error ? toStyle.leftLine : 'bg-transparent'
            }`}
          />
          {/* Output header */}
          <div className="flex items-center justify-between border-b border-border bg-surface/40 px-4 py-2.5">
            <div className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${toStyle.dot}`} />
              <span className={`font-mono text-[10px] font-semibold uppercase tracking-widest ${toStyle.headerText}`}>
                {to}
              </span>
            </div>
            <button
              onClick={handleCopy}
              disabled={!output || !!error}
              data-testid="copy-button"
              className={`rounded px-2.5 py-1 font-mono text-[9px] font-medium transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-25 ${
                copied
                  ? 'bg-teal/15 text-teal'
                  : 'bg-surface-hi text-muted hover:bg-surface-hi hover:text-primary'
              }`}
            >
              {copied ? '✓ Copied!' : 'Copy'}
            </button>
          </div>
          <textarea
            value={output}
            readOnly
            placeholder="変換結果がここに表示されます"
            data-testid="output-area"
            rows={18}
            className={`flex-1 resize-none bg-bg/60 p-4 pl-5 font-mono text-xs leading-relaxed placeholder:text-muted/15 focus:outline-none ${toStyle.outputText}`}
          />
        </div>
      </div>
    </div>
  )
}
