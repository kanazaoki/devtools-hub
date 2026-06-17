'use client'

import { useState, useMemo } from 'react'

type Flag = 'g' | 'i' | 'm' | 's'
type Tab = 'match' | 'replace'

interface MatchDetail {
  index: number
  value: string
  line: number
  col: number
  groups: string[]
}

function buildRegex(pattern: string, flags: Set<Flag>): RegExp | null {
  try {
    return new RegExp(pattern, Array.from(flags).join(''))
  } catch {
    return null
  }
}

function getMatches(text: string, regex: RegExp): MatchDetail[] {
  const matches: MatchDetail[] = []
  const lines = text.split('\n')
  const lineStarts: number[] = []
  let pos = 0
  for (const line of lines) {
    lineStarts.push(pos)
    pos += line.length + 1
  }

  const getLineCol = (idx: number) => {
    let line = 0
    for (let i = lineStarts.length - 1; i >= 0; i--) {
      if (idx >= lineStarts[i]) { line = i; break }
    }
    return { line: line + 1, col: idx - lineStarts[line] }
  }

  if (regex.flags.includes('g')) {
    let m: RegExpExecArray | null
    const r = new RegExp(regex.source, regex.flags)
    while ((m = r.exec(text)) !== null) {
      const { line, col } = getLineCol(m.index)
      matches.push({ index: m.index, value: m[0], line, col, groups: m.slice(1).map(g => g ?? '') })
      if (m[0].length === 0) r.lastIndex++
    }
  } else {
    const m = regex.exec(text)
    if (m) {
      const { line, col } = getLineCol(m.index)
      matches.push({ index: m.index, value: m[0], line, col, groups: m.slice(1).map(g => g ?? '') })
    }
  }
  return matches
}

function HighlightedText({ text, matches }: { text: string; matches: MatchDetail[] }) {
  if (!text) return <span className="text-muted/30">テキストがここに表示されます</span>

  const spans: { start: number; end: number }[] = matches.map(m => ({
    start: m.index,
    end: m.index + m.value.length,
  }))

  const parts: { str: string; highlight: boolean }[] = []
  let cursor = 0
  for (const span of spans) {
    if (cursor < span.start) parts.push({ str: text.slice(cursor, span.start), highlight: false })
    parts.push({ str: text.slice(span.start, span.end), highlight: true })
    cursor = span.end
  }
  if (cursor < text.length) parts.push({ str: text.slice(cursor), highlight: false })

  return (
    <>
      {parts.map((p, i) =>
        p.highlight ? (
          <mark key={i} className="rounded-sm bg-amber-400/30 text-amber-200">{p.str}</mark>
        ) : (
          <span key={i}>{p.str}</span>
        )
      )}
    </>
  )
}

export function RegexStudio() {
  const [pattern, setPattern] = useState('')
  const [text, setText] = useState('')
  const [flags, setFlags] = useState<Set<Flag>>(new Set<Flag>(['g']))
  const [tab, setTab] = useState<Tab>('match')
  const [replacement, setReplacement] = useState('')
  const [copied, setCopied] = useState(false)

  const toggleFlag = (f: Flag) => {
    setFlags(prev => {
      const next = new Set<Flag>(prev)
      next.has(f) ? next.delete(f) : next.add(f)
      return next
    })
  }

  const regex = useMemo(() => pattern ? buildRegex(pattern, flags) : null, [pattern, flags])
  const isError = pattern.length > 0 && regex === null
  const matches = useMemo(() => {
    if (!regex || !text) return []
    try { return getMatches(text, regex) } catch { return [] }
  }, [regex, text])

  const replaceResult = useMemo(() => {
    if (!regex || !text || tab !== 'replace') return null
    try { return text.replace(regex, replacement) } catch { return null }
  }, [regex, text, replacement, tab, flags])

  const copyPattern = () => {
    navigator.clipboard.writeText(pattern)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="space-y-3">
      {/* Pattern bar */}
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-surface-hi px-4 py-3">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span className="shrink-0 font-mono text-xs text-muted">/</span>
          <input
            type="text"
            value={pattern}
            onChange={e => setPattern(e.target.value)}
            placeholder="正規表現パターン"
            spellCheck={false}
            className={`min-w-0 flex-1 bg-transparent font-mono text-sm outline-none transition-colors ${
              isError ? 'text-red-400' : 'text-primary placeholder:text-muted/30'
            }`}
          />
          <span className="shrink-0 font-mono text-xs text-muted">/</span>
          {/* Flags */}
          <div className="flex gap-1">
            {(['g', 'i', 'm', 's'] as Flag[]).map(f => (
              <button
                key={f}
                onClick={() => toggleFlag(f)}
                className={`rounded px-2 py-0.5 font-mono text-xs transition-all ${
                  flags.has(f)
                    ? 'bg-violet-500/20 text-violet-300'
                    : 'text-muted hover:text-primary'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isError && <span className="font-mono text-[10px] text-red-400">構文エラー</span>}
          {!isError && matches.length > 0 && (
            <span className="rounded-full bg-teal/15 px-2.5 py-0.5 font-mono text-[10px] text-teal">
              {matches.length} match{matches.length > 1 ? 'es' : ''}
            </span>
          )}
          {pattern && (
            <button
              onClick={copyPattern}
              className="rounded border border-border px-2 py-0.5 font-mono text-[10px] text-muted transition-colors hover:border-border-hi hover:text-primary"
            >
              {copied ? '✓' : 'Copy'}
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-md border border-border bg-surface-hi p-1 w-fit">
        {(['match', 'replace'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded px-4 py-1 font-mono text-xs font-semibold transition-all ${
              tab === t ? 'bg-teal text-bg' : 'text-muted hover:text-primary'
            }`}
          >
            {t === 'match' ? 'Match' : 'Replace'}
          </button>
        ))}
      </div>

      {/* Main panels */}
      <div className="grid gap-3 lg:grid-cols-2">
        {/* Left: Test text */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted">Test Text</p>
            {text && (
              <button
                onClick={() => setText('')}
                className="ml-auto font-mono text-[10px] text-muted/50 transition-colors hover:text-red-400"
              >
                Clear
              </button>
            )}
          </div>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder={'テストしたいテキストを入力...\n例: user@example.com'}
            spellCheck={false}
            className="h-48 w-full resize-y rounded-lg border border-border bg-[#111827] p-4 font-mono text-xs leading-relaxed text-primary outline-none transition-colors focus:border-teal/40"
          />
        </div>

        {/* Right: Preview */}
        <div className="flex flex-col gap-2">
          {tab === 'match' ? (
            <>
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted">Match Preview</p>
              <div className="h-48 overflow-auto rounded-lg border border-border bg-[#111827] p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap">
                {text ? (
                  <HighlightedText text={text} matches={matches} />
                ) : (
                  <span className="text-muted/30">マッチ結果がここに表示されます</span>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <p className="font-mono text-[10px] uppercase tracking-widest text-muted">Replacement</p>
              </div>
              <input
                type="text"
                value={replacement}
                onChange={e => setReplacement(e.target.value)}
                placeholder="置換文字列（$1 $2 でグループ参照）"
                spellCheck={false}
                className="rounded-lg border border-border bg-[#111827] px-4 py-2.5 font-mono text-xs text-primary outline-none transition-colors focus:border-teal/40"
              />
              <div className="flex-1 overflow-auto rounded-lg border border-border bg-[#111827] p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap text-dim" style={{ minHeight: '7rem' }}>
                {replaceResult ?? <span className="text-muted/30">置換結果がここに表示されます</span>}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Match details */}
      {tab === 'match' && matches.length > 0 && (
        <div className="rounded-lg border border-border bg-surface-hi">
          <div className="border-b border-border px-4 py-2">
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted">Match Details</p>
          </div>
          <div className="max-h-48 overflow-auto divide-y divide-border">
            {matches.map((m, i) => (
              <div key={i} className="flex flex-wrap items-center gap-3 px-4 py-2.5">
                <span className="font-mono text-[10px] text-muted">Match {i + 1}</span>
                <span className="rounded-sm bg-amber-400/20 px-2 py-0.5 font-mono text-[10px] text-amber-200">{m.value}</span>
                <span className="font-mono text-[10px] text-muted">Ln {m.line}</span>
                <span className="font-mono text-[10px] text-muted/50">
                  @{m.index}–{m.index + m.value.length - 1}
                </span>
                {m.groups.length > 0 && m.groups.some(g => g !== '') && (
                  <span className="font-mono text-[10px] text-dim">
                    groups: [{m.groups.map(g => `"${g}"`).join(', ')}]
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {isError && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3">
          <p className="font-mono text-xs text-red-400">✕ 正規表現の構文エラー — パターンを確認してください</p>
        </div>
      )}
    </div>
  )
}
