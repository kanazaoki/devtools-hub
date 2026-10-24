'use client'

import { useState, useMemo, useCallback } from 'react'

// Common Go initialisms — capitalized fully for idiomatic exported names.
const INITIALISMS = new Set([
  'acl', 'api', 'ascii', 'cpu', 'css', 'dns', 'eof', 'guid', 'html', 'http',
  'https', 'id', 'ip', 'json', 'lhs', 'qps', 'ram', 'rhs', 'rpc', 'sla',
  'smtp', 'sql', 'ssh', 'tcp', 'tls', 'ttl', 'udp', 'ui', 'uid', 'uuid',
  'uri', 'url', 'utf8', 'vm', 'xml', 'xmpp', 'xsrf', 'xss',
])

// Split a JSON key into words on separators AND camelCase boundaries.
function splitWords(key: string): string[] {
  return key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
}

// JSON key -> exported Go identifier (PascalCase, initialisms upper-cased).
function toGoName(key: string): string {
  const words = splitWords(key)
  if (words.length === 0) return 'Field'
  let name = words
    .map((w) => {
      const lower = w.toLowerCase()
      if (INITIALISMS.has(lower)) return w.toUpperCase()
      return w.charAt(0).toUpperCase() + w.slice(1)
    })
    .join('')
  if (/^[0-9]/.test(name)) name = 'Field' + name
  return name
}

// Merge an array of objects into an ordered key->value list (union of keys,
// first non-null value wins) so array-of-objects yields a complete struct.
// ある位置で観測した値すべてから Go の型を決める（配列の全要素、全オブジェクトの同じキー）。
// ⚠ 以前は各キーの最初の null でない値だけで型を決めていたため、1 と 1.5 が混ざると int、
// 入れ子のオブジェクトは最初の1つのキーしか拾えなかった
function inferGoTypeFrom(values: unknown[], indent: number, omitempty: boolean): string {
  const present = values.filter((v) => v !== null && v !== undefined)
  const hasNull = present.length < values.length
  if (present.length === 0) return 'interface{}'
  const kinds = new Set(present.map((v) => (Array.isArray(v) ? 'array' : typeof v)))
  if (kinds.size > 1) return 'interface{}'
  const kind = [...kinds][0]
  let typ: string
  if (kind === 'string') typ = 'string'
  else if (kind === 'boolean') typ = 'bool'
  else if (kind === 'number') typ = present.every((v) => Number.isInteger(v)) ? 'int' : 'float64'
  else if (kind === 'array') {
    const items = (present as unknown[][]).flat()
    return '[]' + (items.length ? inferGoTypeFrom(items, indent, omitempty) : 'interface{}')
  } else if (kind === 'object') typ = structFromObjects(present as Record<string, unknown>[], indent, omitempty)
  else return 'interface{}'
  // null になりうる値はポインタにして、null と「ゼロ値」を区別できるようにする
  return hasNull ? `*${typ}` : typ
}

function structFromObjects(objs: Record<string, unknown>[], indent: number, omitempty: boolean): string {
  const keys: string[] = []
  for (const o of objs) for (const k of Object.keys(o)) if (!keys.includes(k)) keys.push(k)
  if (keys.length === 0) return 'struct{}'
  const pad = '\t'.repeat(indent + 1)
  const closePad = '\t'.repeat(indent)
  const lines = keys.map((key) => {
    const field = toGoName(key)
    const values = objs.filter((o) => key in o).map((o) => o[key])
    const typ = inferGoTypeFrom(values, indent + 1, omitempty)
    const tag = `\`json:"${key}${omitempty ? ',omitempty' : ''}"\``
    return `${pad}${field} ${typ} ${tag}`
  })
  return `struct {\n${lines.join('\n')}\n${closePad}}`
}

function inferGoType(value: unknown, indent: number, omitempty: boolean): string {
  return inferGoTypeFrom([value], indent, omitempty)
}

function generateGo(json: string, rootName: string, omitempty: boolean): { output: string; error: string | null } {
  if (!json.trim()) return { output: '', error: null }

  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch {
    return { output: '', error: '無効な JSON です。構文を確認してください。' }
  }

  const name = toGoName(rootName.trim() || 'Root') || 'Root'
  const typeExpr = inferGoType(parsed, 0, omitempty)
  return { output: `type ${name} ${typeExpr}`, error: null }
}

export function JsonToGo() {
  const [input, setInput] = useState('')
  const [typeName, setTypeName] = useState('Root')
  const [omitempty, setOmitempty] = useState(false)
  const [copied, setCopied] = useState(false)

  const { output, error } = useMemo(
    () => generateGo(input, typeName, omitempty),
    [input, typeName, omitempty]
  )

  const handleCopy = useCallback(() => {
    if (!output || error) return
    navigator.clipboard.writeText(output).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }, [output, error])

  return (
    <div className="space-y-3">
      {/* Type name — IDE file-tab style header */}
      <div className="flex items-stretch overflow-hidden rounded border border-border">
        <div className="flex items-center border-r border-border bg-surface px-4 py-2.5 shrink-0">
          <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-muted/50 select-none">
            type
          </span>
        </div>
        <div className="relative flex flex-1 items-center bg-surface/30">
          <input
            type="text"
            value={typeName}
            onChange={(e) => setTypeName(e.target.value)}
            placeholder="Root"
            data-testid="type-name-input"
            className="w-full bg-transparent px-4 py-2.5 font-mono text-sm font-semibold text-bright placeholder:text-muted/30 focus:outline-none"
          />
          <span className="pointer-events-none mr-4 font-mono text-sm text-muted/25 select-none shrink-0">
            struct
          </span>
        </div>
      </div>

      {/* Options */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setOmitempty((v) => !v)}
          data-testid="omitempty-toggle"
          className={`rounded border px-3 py-1.5 font-mono text-[10px] transition-all duration-150 ${
            omitempty
              ? 'border-cyan-500/50 bg-cyan-500/10 text-cyan-300'
              : 'border-border bg-surface text-muted hover:border-border-hi hover:text-dim'
          }`}
        >
          {omitempty ? '✓ ' : ''}omitempty を付ける
        </button>
        <span className="font-mono text-[10px] text-muted/40 select-none">
          json:&quot;field{omitempty ? ',omitempty' : ''}&quot;
        </span>
      </div>

      {/* Split editor panel — stacks on mobile, side-by-side on sm+ */}
      <div className="grid grid-cols-1 overflow-hidden rounded border border-border sm:grid-cols-2">
        {/* JSON column */}
        <div className="flex flex-col border-b border-border sm:border-b-0 sm:border-r">
          <div className="flex items-center justify-between border-b border-border bg-surface px-4 py-2.5">
            <div className="flex items-center gap-2.5">
              <span className="h-2 w-2 rounded-full bg-amber-500/70 shrink-0" />
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted">JSON</span>
            </div>
            {input.length > 0 && (
              <span className="font-mono text-[9px] tabular-nums text-muted/40">{input.length} chars</span>
            )}
          </div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={'{\n  "id": 1,\n  "userName": "alice",\n  "isActive": true,\n  "tags": ["a", "b"],\n  "profile": { "age": 30, "city": "Tokyo" }\n}'}
            data-testid="input-area"
            rows={16}
            spellCheck={false}
            className="flex-1 resize-none bg-bg p-4 font-mono text-xs leading-relaxed text-primary placeholder:text-muted/20 focus:outline-none"
          />
          {error && (
            <div className="border-t border-red-500/20 bg-red-500/5 px-4 py-2">
              <p className="font-mono text-[10px] text-red-400">{error}</p>
            </div>
          )}
        </div>

        {/* Go column */}
        <div className="flex flex-col">
          <div className="flex items-center justify-between border-b border-border bg-surface px-4 py-2.5">
            <div className="flex items-center gap-2.5">
              <span className="inline-flex h-4 w-6 items-center justify-center rounded-sm bg-cyan-700/60 font-mono text-[8px] font-bold text-cyan-100 shrink-0">
                GO
              </span>
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted">Go struct</span>
            </div>
            <button
              onClick={handleCopy}
              disabled={!output || !!error}
              data-testid="copy-button"
              className={`rounded px-2.5 py-1 font-mono text-[9px] font-medium transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-30 ${
                copied
                  ? 'bg-teal/20 text-teal'
                  : 'bg-surface-hi text-muted hover:bg-teal/10 hover:text-teal'
              }`}
            >
              {copied ? '✓ Copied!' : 'Copy'}
            </button>
          </div>
          <textarea
            value={output}
            readOnly
            placeholder="Go の struct 定義がここに生成されます"
            data-testid="output-area"
            rows={16}
            className="flex-1 resize-none bg-bg/70 p-4 font-mono text-xs leading-relaxed text-cyan-300/80 placeholder:text-muted/20 focus:outline-none"
          />
        </div>
      </div>

      <p className="font-mono text-[10px] leading-relaxed text-muted/50">
        ネストは無名 struct にインライン展開。配列内オブジェクトは全要素のキーをマージ。数値は整数=int / 小数=float64、null=interface&#123;&#125; に推論します。生成後 <code className="text-muted/70">gofmt</code> を通すと整形されます。
      </p>
    </div>
  )
}
