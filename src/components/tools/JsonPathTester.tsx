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
          keys.forEach(k => { if (Object.prototype.hasOwnProperty.call(node, k)) traverse((node as Record<string, JsonValue>)[k], rest) })
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
          if (Object.prototype.hasOwnProperty.call(node, key)) traverse((node as Record<string, JsonValue>)[key], rest)
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
        if (Object.prototype.hasOwnProperty.call(node, inner)) traverse((node as Record<string, JsonValue>)[inner], rest)
      }
      return
    }

    // Dot-notation key
    if (!Array.isArray(node) && node !== null && typeof node === 'object') {
      if (Object.prototype.hasOwnProperty.call(node, head)) traverse((node as Record<string, JsonValue>)[head], rest)
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
// ⚠ 以前は「@.key 演算子 値」1つだけで、@.a.b（入れ子）・&& / ||・!・日本語のキー名が使えず、
// == はゆるい比較（@.x == 0 が "" や false にも当たる）だった。小さな式の読み取り器にした
type Tok =
  | { t: 'path'; v: string[] }
  | { t: 'lit'; v: JsonValue | undefined }
  | { t: 're'; v: RegExp }
  | { t: 'op'; v: string }

function lexFilter(src: string): Tok[] {
  const toks: Tok[] = []
  let i = 0
  const readQuoted = (q: string) => {
    let s = ''
    i++
    while (i < src.length && src[i] !== q) {
      if (src[i] === '\\' && i + 1 < src.length) { s += src[i + 1]; i += 2; continue }
      s += src[i++]
    }
    i++
    return s
  }
  while (i < src.length) {
    const c = src[i]
    if (/\s/.test(c)) { i++; continue }
    if (c === '@') {
      i++
      const path: string[] = []
      while (i < src.length) {
        if (src[i] === '.') {
          i++
          let k = ''
          while (i < src.length && /[^\s.[\]()=!<>&|~]/.test(src[i])) k += src[i++]
          path.push(k)
        } else if (src[i] === '[') {
          i++
          while (/\s/.test(src[i] ?? '')) i++
          const q = src[i]
          if (q === "'" || q === '"') path.push(readQuoted(q))
          else { let k = ''; while (i < src.length && src[i] !== ']') k += src[i++]; path.push(k.trim()) }
          while (i < src.length && src[i] !== ']') i++
          i++
        } else break
      }
      toks.push({ t: 'path', v: path })
      continue
    }
    if (c === "'" || c === '"') { toks.push({ t: 'lit', v: readQuoted(c) }); continue }
    if (c === '/' && toks.length && toks[toks.length - 1].t === 'op' && (toks[toks.length - 1] as { v: string }).v === '=~') {
      i++
      let body = ''
      while (i < src.length && src[i] !== '/') { if (src[i] === '\\') { body += src[i++] } body += src[i++] }
      i++
      let flags = ''
      while (/[gimsuy]/.test(src[i] ?? '')) flags += src[i++]
      toks.push({ t: 're', v: new RegExp(body, flags.replace('g', '')) })
      continue
    }
    const two = src.slice(i, i + 2)
    if (['==', '!=', '<=', '>=', '&&', '||', '=~'].includes(two)) {
      // === / !== も受け付ける
      if ((two === '==' || two === '!=') && src[i + 2] === '=') i++
      toks.push({ t: 'op', v: two }); i += 2; continue
    }
    if ('<>!()'.includes(c)) { toks.push({ t: 'op', v: c }); i++; continue }
    const m = /^(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|true|false|null)/.exec(src.slice(i))
    if (m) { toks.push({ t: 'lit', v: JSON.parse(m[1]) }); i += m[1].length; continue }
    throw new Error(`フィルター式を読めません: ${src.slice(i, i + 10)}`)
  }
  return toks
}

function getPath(node: JsonValue, path: string[]): JsonValue | undefined {
  let cur: JsonValue | undefined = node
  for (const k of path) {
    if (k === 'length' && (Array.isArray(cur) || typeof cur === 'string')) { cur = cur.length; continue }
    if (cur === null || typeof cur !== 'object') return undefined
    if (!Object.prototype.hasOwnProperty.call(cur, k)) return undefined
    cur = (cur as Record<string, JsonValue>)[k]
  }
  return cur
}

function evalFilter(node: JsonValue, expr: string): boolean {
  const toks = lexFilter(expr)
  let p = 0
  const peek = () => toks[p]
  const isOp = (v: string) => peek()?.t === 'op' && (peek() as { v: string }).v === v
  const value = (): JsonValue | undefined | RegExp => {
    const tk = toks[p++]
    if (!tk) throw new Error('フィルター式が途中で終わっています')
    if (tk.t === 'path') return getPath(node, tk.v)
    if (tk.t === 'lit' || tk.t === 're') return tk.v
    if (tk.v === '(') { const r = or(); if (!isOp(')')) throw new Error(') がありません'); p++; return r }
    throw new Error(`予期しない ${tk.v}`)
  }
  const cmp = (): boolean => {
    const a = value()
    const tk = peek()
    if (tk?.t === 'op' && ['==', '!=', '<', '<=', '>', '>=', '=~'].includes(tk.v)) {
      p++
      const b = value()
      switch (tk.v) {
        case '==': return a === b
        case '!=': return a !== b
        case '=~': return typeof a === 'string' && b instanceof RegExp && b.test(a)
        default: {
          const ok = (typeof a === 'number' && typeof b === 'number') || (typeof a === 'string' && typeof b === 'string')
          if (!ok) return false
          const x = a as number | string, y = b as number | string
          return tk.v === '<' ? x < y : tk.v === '<=' ? x <= y : tk.v === '>' ? x > y : x >= y
        }
      }
    }
    // 単独のパスは「存在する」、真偽値の結果はそのまま
    return typeof a === 'boolean' ? a : a !== undefined
  }
  const not = (): boolean => {
    if (isOp('!')) { p++; return !not() }
    return cmp()
  }
  const and = (): boolean => { let r = not(); while (isOp('&&')) { p++; const n = not(); r = r && n } return r }
  const or = (): boolean => { let r = and(); while (isOp('||')) { p++; const n = and(); r = r || n } return r }
  const r = or()
  if (p < toks.length) throw new Error('フィルター式の後ろに余分なものがあります')
  return r
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
  { label: '条件を組み合わせる', expr: "$.store.book[?(@.author == '宮沢賢治' && @.price < 10)].title" },
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
