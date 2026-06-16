'use client'

import { useState, useMemo, useCallback } from 'react'

type IndentMode = '2' | '4' | 'tab'

function sortObjKeys(obj: unknown): unknown {
  if (Array.isArray(obj)) return obj.map(sortObjKeys)
  if (obj !== null && typeof obj === 'object') {
    return Object.fromEntries(
      Object.keys(obj as object)
        .sort()
        .map((k) => [k, sortObjKeys((obj as Record<string, unknown>)[k])])
    )
  }
  return obj
}

function getIndentArg(mode: IndentMode): string | number {
  return mode === 'tab' ? '\t' : parseInt(mode)
}

function processJson(
  input: string,
  indent: IndentMode,
  sort: boolean
): { result: string; error: string | null } {
  if (!input.trim()) return { result: '', error: null }
  try {
    let parsed = JSON.parse(input)
    if (sort) parsed = sortObjKeys(parsed)
    return { result: JSON.stringify(parsed, null, getIndentArg(indent)), error: null }
  } catch (e) {
    return { result: '', error: (e as Error).message }
  }
}

function highlight(json: string): string {
  const escaped = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  return escaped.replace(
    /("(?:\\u[0-9a-fA-F]{4}|\\[^u]|[^\\"])*"(?:\s*:)?|\b(?:true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g,
    (match) => {
      let color: string
      if (match.startsWith('"')) {
        color = match.trimEnd().endsWith(':') ? '#79b8ff' : '#9ecbff'
      } else if (match === 'true' || match === 'false') {
        color = '#56d364'
      } else if (match === 'null') {
        color = '#d2a8ff'
      } else {
        color = '#f8c555'
      }
      return `<span style="color:${color}">${match}</span>`
    }
  )
}

export function JsonStudio() {
  const [input, setInput] = useState('')
  const [indent, setIndent] = useState<IndentMode>('2')
  const [sortKeys, setSortKeys] = useState(false)
  const [copied, setCopied] = useState(false)

  const { result, error } = useMemo(
    () => processJson(input, indent, sortKeys),
    [input, indent, sortKeys]
  )

  const handleMinify = () => {
    if (!input.trim()) return
    try {
      setInput(JSON.stringify(JSON.parse(input)))
    } catch { /* invalid JSON — ignore */ }
  }

  const handleCopy = useCallback(() => {
    if (!result) return
    navigator.clipboard.writeText(result)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }, [result])

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-border bg-surface-hi px-4 py-2.5">
        <label className="flex items-center gap-2 font-mono text-xs text-dim">
          インデント
          <select
            value={indent}
            onChange={(e) => setIndent(e.target.value as IndentMode)}
            className="rounded border border-border bg-surface px-2 py-1 text-xs text-primary"
          >
            <option value="2">2 スペース</option>
            <option value="4">4 スペース</option>
            <option value="tab">タブ</option>
          </select>
        </label>

        <label className="flex cursor-pointer items-center gap-1.5 font-mono text-xs text-dim">
          <input
            type="checkbox"
            checked={sortKeys}
            onChange={(e) => setSortKeys(e.target.checked)}
            className="accent-teal"
          />
          Sort Keys
        </label>

        <button
          onClick={handleMinify}
          disabled={!input.trim() || !!error}
          className="rounded-md border border-border px-3 py-1 font-mono text-xs text-dim transition-colors hover:border-border-hi hover:text-primary disabled:cursor-not-allowed disabled:opacity-30"
        >
          Minify
        </button>

        <button
          onClick={handleCopy}
          disabled={!result}
          className="ml-auto rounded-md bg-teal px-3 py-1 font-mono text-xs font-semibold text-bg transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-30"
        >
          {copied ? '✓ コピー済み' : 'コピー'}
        </button>
      </div>

      {/* Error */}
      {error && input.trim() && (
        <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5">
          <span className="shrink-0 font-mono text-xs text-red-400">✕</span>
          <p className="font-mono text-xs text-red-400">{error}</p>
        </div>
      )}

      {/* Two-pane */}
      <div className="grid gap-3 lg:grid-cols-2">
        <div className="flex flex-col gap-1">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted">Input</p>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={'{\n  "key": "value"\n}'}
            spellCheck={false}
            className="h-80 w-full resize-y rounded-lg border border-border bg-[#111827] p-4 font-mono text-xs leading-relaxed text-primary outline-none transition-colors focus:border-teal/40"
          />
        </div>

        <div className="flex flex-col gap-1">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted">Output</p>
          <div
            className="h-80 overflow-auto rounded-lg border border-border bg-[#111827] p-4 font-mono text-xs leading-relaxed"
            style={{ whiteSpace: 'pre' }}
            dangerouslySetInnerHTML={{
              __html: result
                ? highlight(result)
                : `<span style="color:#374151">${error ? '' : '整形後の JSON が表示されます'}</span>`,
            }}
          />
        </div>
      </div>
    </div>
  )
}
