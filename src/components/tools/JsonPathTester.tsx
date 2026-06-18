'use client'

import { useState, useCallback, useMemo } from 'react'

// ── JSONPath engine ────────────────────────────────────────────────────────────

type JsonValue = string | number | boolean | null | JsonValue[] | { [k: string]: JsonValue }

/**
 * Evaluate a JSONPath expression against a root value.
 * Supported: $ . .. [] * [n] [n,m] [n:m] [?(@.key op val)]
 */
function jsonPath(root: JsonValue, expr: string): JsonValue[] {
  if (!expr.startsWith('$')) throw new Error('式は $ から始める必要があります')

  const results: JsonValue[] = []

  function traverse(node: JsonValue, tokens: string[]): void {
    if (tokens.length === 0) {
      results.push(node)
      return
    }
    const [head, ...rest] = tokens

    if (head === '*') {
      if (Array.isArray(node)) {
        node.forEach(item => traverse(item, rest))
      } else if (node !== null && typeof node === 'object') {
        Object.values(node).forEach(v => traverse(v, rest))
      }
      return
    }

    // Recursive descent (..)
    if (head === '..') {
      // Apply rest to current node
      traverse(node, rest)
      // Then recurse into children
      if (Array.isArray(node)) {
        node.forEach(item => traverse(item, tokens))
      } else if (node !== null && typeof node === 'object') {
        Object.values(node).forEach(v => traverse(v, tokens))
      }
      return
    }

    // Bracket expression [...]
    if (head.startsWith('[') && head.endsWith(']')) {
      const inner = head.slice(1, -1).trim()

      // Filter: [?(@.key op value)] or [?(@.key)]
      if (inner.startsWith('?(') && inner.endsWith(')')) {
        const filterExpr = inner.slice(2, -1).trim()
        const items = Array.isArray(node) ? node : (node !== null && typeof node === 'object' ? Object.values(node) : [])
        items.forEach(item => {
          if (evalFilter(item, filterExpr)) traverse(item, rest)
        })
        return
      }

      // Wildcard [*]
      if (inner === '*') {
        if (Array.isArray(node)) {
          node.forEach(item => traverse(item, rest))
        } else if (node !== null && typeof node === 'object') {
          Object.values(node).forEach(v => traverse(v, rest))
        }
        return
      }

      // Multiple keys ['a','b'] or ["a","b"]
      if (inner.includes(',') && (inner.includes("'") || inner.includes('"'))) {
        const keys = inner.split(',').map(k => k.trim().replace(/^['"]|['"]$/g, ''))
        if (!Array.isArray(node) && node !== null && typeof node === 'object') {
          keys.forEach(k => { if (k in node) traverse((node as Record<string, JsonValue>)[k], rest) })
        }
        return
      }

      // Slice [n:m]
      if (inner.includes(':')) {
        if (Array.isArray(node)) {
          const [startStr, endStr] = inner.split(':')
          const start = startStr === '' ? 0 : parseInt(startStr, 10)
          const end = endStr === '' ? node.length : parseInt(endStr, 10)
          const s = start < 0 ? Math.max(0, node.length + start) : start
          const e = end < 0 ? Math.max(0, node.length + end) : Math.min(node.length, end)
          for (let i = s; i < e; i++) traverse(node[i], rest)
        }
        return
      }

      // Quoted key ['key'] or ["key"]
      if ((inner.startsWith("'") && inner.endsWith("'")) || (inner.startsWith('"') && inner.endsWith('"'))) {
        const key = inner.slice(1, -1)
        if (!Array.isArray(node) && node !== null && typeof node === 'object') {
          if (key in node) traverse((node as Record<string, JsonValue>)[key], rest)
        }
        return
      }

      // Index [n] or multiple indices [0,1,2]
      if (/^-?\d+(,-?\d+)*$/.test(inner)) {
        const indices = inner.split(',').map(s => parseInt(s.trim(), 10))
        if (Array.isArray(node)) {
          indices.forEach(idx => {
            const i = idx < 0 ? node.length + idx : idx
            if (i >= 0 && i < node.length) traverse(node[i], rest)
          })
        }
        return
      }

      // Bare key [key]
      if (!Array.isArray(node) && node !== null && typeof node === 'object') {
        if (inner in node) traverse((node as Record<string, JsonValue>)[inner], rest)
      }
      return
    }

    // Dot-notation key
    if (!Array.isArray(node) && node !== null && typeof node === 'object') {
      if (head in node) traverse((node as Record<string, JsonValue>)[head], rest)
    }
  }

  // Tokenize expression: split on . but keep bracket groups intact
  function tokenize(path: string): string[] {
    // Remove leading $
    let s = path.slice(1)
    const tokens: string[] = []
    let i = 0

    while (i < s.length) {
      if (s[i] === '[') {
        // find matching ]
        let depth = 0
        let j = i
        while (j < s.length) {
          if (s[j] === '[') depth++
          else if (s[j] === ']') { depth--; if (depth === 0) break }
          j++
        }
        tokens.push(s.slice(i, j + 1))
        i = j + 1
        if (s[i] === '.') i++ // consume dot after bracket
      } else if (s[i] === '.') {
        if (s[i + 1] === '.') {
          tokens.push('..')
          i += 2
        } else {
          i++ // skip dot
        }
      } else {
        // read until . or [
        let j = i
        while (j < s.length && s[j] !== '.' && s[j] !== '[') j++
        if (j > i) tokens.push(s.slice(i, j))
        i = j
      }
    }
    return tokens
  }

  const tokens = tokenize(expr)
  traverse(root, tokens)
  return results
}

// Filter evaluator for [?(...)] expressions
function evalFilter(node: JsonValue, expr: string): boolean {
  // @.key op value
  const opMatch = expr.match(/^@\.(\w+)\s*(==|!=|<=|>=|<|>)\s*(.+)$/)
  if (opMatch) {
    const [, key, op, rawVal] = opMatch
    if (node === null || typeof node !== 'object' || Array.isArray(node)) return false
    const actual = (node as Record<string, JsonValue>)[key]
    let expected: JsonValue
    try {
      expected = JSON.parse(rawVal)
    } catch {
      expected = rawVal.replace(/^['"]|['"]$/g, '')
    }
    switch (op) {
      case '==': return actual == expected
      case '!=': return actual != expected
      case '<':  return typeof actual === 'number' && typeof expected === 'number' && actual < expected
      case '<=': return typeof actual === 'number' && typeof expected === 'number' && actual <= expected
      case '>':  return typeof actual === 'number' && typeof expected === 'number' && actual > expected
      case '>=': return typeof actual === 'number' && typeof expected === 'number' && actual >= expected
    }
  }
  // @.key existence check
  const existMatch = expr.match(/^@\.(\w+)$/)
  if (existMatch) {
    if (node === null || typeof node !== 'object' || Array.isArray(node)) return false
    return existMatch[1] in node
  }
  return false
}

// ── Sample JSON ────────────────────────────────────────────────────────────────

const SAMPLE_JSON = `{
  "store": {
    "book": [
      { "title": "草枕", "author": "夏目漱石", "price": 8.95, "category": "fiction" },
      { "title": "吾輩は猫である", "author": "夏目漱石", "price": 12.99, "category": "fiction" },
      { "title": "注文の多い料理店", "author": "宮沢賢治", "price": 6.50, "category": "fiction" },
      { "title": "銀河鉄道の夜", "author": "宮沢賢治", "price": 9.99, "category": "fiction" }
    ],
    "bicycle": {
      "color": "red",
      "price": 19.95
    }
  }
}`

// ── Presets ────────────────────────────────────────────────────────────────────

const PRESETS = [
  { label: '全 book', expr: '$.store.book[*]' },
  { label: 'タイトル一覧', expr: '$.store.book[*].title' },
  { label: '全 price', expr: '$..price' },
  { label: '最初の本', expr: '$.store.book[0]' },
  { label: '価格 < 10', expr: '$.store.book[?(@.price < 10)]' },
  { label: '著者一覧', expr: '$.store.book[*].author' },
]

// ── Component ─────────────────────────────────────────────────────────────────

export function JsonPathTester() {
  const [jsonInput, setJsonInput] = useState(SAMPLE_JSON)
  const [pathExpr, setPathExpr] = useState('$.store.book[*].title')
  const [copied, setCopied] = useState(false)

  const { results, jsonError, pathError } = useMemo(() => {
    let parsed: JsonValue
    try {
      parsed = JSON.parse(jsonInput)
    } catch (e) {
      return { results: [], jsonError: `無効な JSON です: ${(e as Error).message}`, pathError: '' }
    }

    if (!pathExpr.trim()) return { results: [], jsonError: '', pathError: '' }

    try {
      const res = jsonPath(parsed, pathExpr)
      return { results: res, jsonError: '', pathError: '' }
    } catch (e) {
      return { results: [], jsonError: '', pathError: `式エラー: ${(e as Error).message}` }
    }
  }, [jsonInput, pathExpr])

  const handlePreset = useCallback((expr: string) => {
    setPathExpr(expr)
  }, [])

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(JSON.stringify(results, null, 2))
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }, [results])

  const resultJson = JSON.stringify(results, null, 2)

  return (
    <div className="space-y-4">

      {/* Presets */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-2 font-mono text-[9px] uppercase tracking-widest text-muted/60">Quick:</span>
        {PRESETS.map(({ label, expr }) => (
          <button
            key={label}
            onClick={() => handlePreset(expr)}
            className={`rounded border px-2.5 py-1 font-mono text-[10px] transition-all duration-100 ${
              pathExpr === expr
                ? 'border-teal/40 bg-teal/8 text-teal'
                : 'border-border text-muted hover:border-border-hi hover:text-dim'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Connected two-pane inspector */}
      <div className="overflow-hidden rounded-md border border-border flex flex-col lg:flex-row" style={{ minHeight: '420px' }}>

        {/* Left: JSON source */}
        <div className={`flex flex-1 flex-col border-b border-border lg:border-b-0 lg:border-r ${jsonError ? 'border-l-2 border-l-red-400/60' : ''}`}>
          <div className="flex items-center justify-between border-b border-border px-4 py-2">
            <span className="font-mono text-[9px] uppercase tracking-widest text-muted">
              <span className="mr-1.5 text-muted/40">{'{}'}</span>JSON Source
            </span>
            {jsonError && (
              <span className="font-mono text-[10px] text-red-400 truncate max-w-[200px]" title={jsonError}>{jsonError}</span>
            )}
          </div>
          <textarea
            value={jsonInput}
            onChange={e => setJsonInput(e.target.value)}
            spellCheck={false}
            className={`flex-1 resize-none bg-bg px-4 py-3 font-mono text-xs leading-5 text-primary outline-none transition-colors placeholder:text-muted/40 ${
              jsonError ? 'text-red-400/80' : ''
            }`}
            style={{ minHeight: '360px' }}
          />
        </div>

        {/* Right: Query + Result */}
        <div className="flex flex-1 flex-col divide-y divide-border">

          {/* Path input section */}
          <div className="flex flex-col gap-2.5 px-4 py-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[9px] uppercase tracking-widest text-muted">
                <span className="mr-1.5 text-teal/40">{'>'}</span>Query
              </span>
              {pathError && (
                <span className="font-mono text-[10px] text-red-400">{pathError}</span>
              )}
            </div>
            <input
              type="text"
              value={pathExpr}
              onChange={e => setPathExpr(e.target.value)}
              spellCheck={false}
              placeholder="$.store.book[*].title"
              className={`w-full rounded border-l-2 bg-bg px-3 py-2 font-mono text-sm tracking-wide text-bright outline-none transition-colors ${
                pathError
                  ? 'border border-red-400/30 border-l-red-400'
                  : 'border border-border border-l-teal/40 focus:border-border-hi focus:border-l-teal/70'
              }`}
            />
          </div>

          {/* Result section */}
          <div className="flex flex-1 flex-col gap-2 px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[9px] uppercase tracking-widest text-muted">Result</span>
                {!jsonError && !pathError && pathExpr.trim() && (
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 font-mono text-[9px] tabular-nums ${
                    results.length > 0
                      ? 'bg-teal/10 text-teal'
                      : 'bg-border/40 text-muted'
                  }`}>
                    {results.length} 件
                  </span>
                )}
              </div>
              <button
                onClick={handleCopy}
                disabled={results.length === 0}
                className={`rounded border px-2.5 py-1 font-mono text-[10px] transition-all duration-100 disabled:cursor-not-allowed disabled:opacity-25 ${
                  copied
                    ? 'border-teal/50 bg-teal/8 text-teal'
                    : 'border-border text-muted hover:border-border-hi hover:text-dim'
                }`}
              >
                {copied ? 'Copied!' : 'Copy JSON'}
              </button>
            </div>
            <pre className="flex-1 overflow-auto rounded border border-border/60 bg-bg px-4 py-3 font-mono text-xs leading-5 text-primary" style={{ minHeight: '200px' }}>
              {jsonError
                ? <span className="text-red-400/50 text-[11px]">{jsonError}</span>
                : pathError
                  ? <span className="text-red-400/50 text-[11px]">{pathError}</span>
                  : results.length === 0 && pathExpr.trim()
                    ? <span className="text-muted/50 text-[11px]">— 一致なし —</span>
                    : <span className="text-primary/90">{resultJson}</span>}
            </pre>
          </div>

        </div>
      </div>
    </div>
  )
}
