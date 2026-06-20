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

function convert(
  input: string,
  from: Format,
  to: Format
): { output: string; error: string | null } {
  if (!input.trim()) return { output: '', error: null }

  let parsed: unknown
  try {
    if (from === 'JSON') {
      parsed = JSON.parse(input)
    } else if (from === 'YAML') {
      parsed = yaml.load(input)
    } else {
      parsed = TOML.parse(input)
    }
  } catch (e) {
    return { output: '', error: `${from} 構文エラー: ${(e as Error).message}` }
  }

  try {
    let output: string
    if (to === 'JSON') {
      output = JSON.stringify(parsed, null, 2)
    } else if (to === 'YAML') {
      output = yaml.dump(parsed, { indent: 2, lineWidth: -1 })
    } else {
      output = TOML.stringify(parsed as TOML.JsonMap)
    }
    return { output: output.trimEnd(), error: null }
  } catch (e) {
    return { output: '', error: `${to} 変換エラー: ${(e as Error).message}` }
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

  const { output, error } = useMemo(() => convert(input, from, to), [input, from, to])

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

      {/* Split editor */}
      <div className="overflow-hidden rounded border border-border">
        {/* Panel headers */}
        <div className="grid grid-cols-2 border-b border-border">
          {/* Input header */}
          <div className="flex items-center justify-between border-r border-border bg-surface/60 px-4 py-2.5">
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

          {/* Output header */}
          <div className="flex items-center justify-between bg-surface/40 px-4 py-2.5">
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
        </div>

        {/* Editor body */}
        <div className="grid grid-cols-2">
          {/* Input panel */}
          <div className="relative flex flex-col border-r border-border">
            <span
              aria-hidden="true"
              className={`absolute inset-y-0 left-0 w-[2px] transition-colors duration-300 ${
                input.trim() && !error ? fromStyle.leftLine : 'bg-transparent'
              }`}
            />
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
          </div>

          {/* Output panel */}
          <div className="relative flex flex-col">
            <span
              aria-hidden="true"
              className={`absolute inset-y-0 left-0 w-[2px] transition-colors duration-300 ${
                output && !error ? toStyle.leftLine : 'bg-transparent'
              }`}
            />
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
    </div>
  )
}
