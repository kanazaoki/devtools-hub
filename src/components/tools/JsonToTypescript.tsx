'use client'

import { useState, useMemo, useCallback } from 'react'

interface TypeInfo {
  type: string
  optional: boolean
}

function toPascalCase(str: string): string {
  return str
    .replace(/[-_\s]+(.)/g, (_, c: string) => c.toUpperCase())
    .replace(/^(.)/, (c: string) => c.toUpperCase())
}

function singularize(str: string): string {
  if (str.endsWith('ies') && str.length > 3) return str.slice(0, -3) + 'y'
  if (str.endsWith('s') && !str.endsWith('ss') && str.length > 1) return str.slice(0, -1)
  return str
}

function isValidIdentifier(key: string): boolean {
  return /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key)
}

// ある位置で観測した値すべてから型を作る（配列の全要素、全オブジェクトの同じキー）。
// ⚠ 以前は配列の1つ目のオブジェクトだけで interface を作っていたため、2つ目以降にしか
// 無いキーが消え、一部にしか無いキーも省略可能（?）にならなかった。
// null も「たぶん string」と決めつけて string | null にしていた。
function typeOf(
  values: unknown[],
  keyName: string,
  interfaces: Map<string, Record<string, TypeInfo>>,
  singular = false
): string {
  const parts = new Set<string>()
  const objs: Record<string, unknown>[] = []
  const arrs: unknown[][] = []
  for (const v of values) {
    if (v === null || v === undefined) parts.add('null')
    else if (Array.isArray(v)) arrs.push(v)
    else if (typeof v === 'object') objs.push(v as Record<string, unknown>)
    else if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') parts.add(typeof v)
    else parts.add('unknown')
  }
  if (objs.length) {
    const base = toPascalCase(keyName)
    const name = singular ? singularize(base) : base
    mergeObjects(objs, name, interfaces)
    parts.add(name)
  }
  if (arrs.length) {
    const items = arrs.flat()
    const inner = items.length ? typeOf(items, keyName, interfaces, true) : 'unknown'
    parts.add(inner.includes(' | ') ? `(${inner})[]` : `${inner}[]`)
  }
  return [...parts].join(' | ') || 'unknown'
}

function mergeObjects(
  objs: Record<string, unknown>[],
  name: string,
  interfaces: Map<string, Record<string, TypeInfo>>
) {
  if (interfaces.has(name)) return
  const props: Record<string, TypeInfo> = {}
  interfaces.set(name, props)
  const keys: string[] = []
  for (const o of objs) for (const k of Object.keys(o)) if (!keys.includes(k)) keys.push(k)
  for (const key of keys) {
    const present = objs.filter((o) => key in o)
    props[key] = {
      type: typeOf(present.map((o) => o[key]), key, interfaces),
      // 一部のオブジェクトにしか無いキーは省略可能
      optional: present.length < objs.length,
    }
  }
}


function generateOutput(
  json: string,
  rootName: string
): { output: string; error: string | null } {
  if (!json.trim()) return { output: '', error: null }

  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch {
    return { output: '', error: '無効な JSON です。構文を確認してください。' }
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return { output: '', error: 'ルート要素はオブジェクト { } である必要があります。' }
  }

  const name = rootName.trim() || 'Root'
  const interfaces = new Map<string, Record<string, TypeInfo>>()
  mergeObjects([parsed as Record<string, unknown>], name, interfaces)

  const lines: string[] = []
  const entries = [...interfaces.entries()]
  const rootIdx = entries.findIndex(([n]) => n === name)
  const ordered = [
    ...entries.filter((_, i) => i !== rootIdx),
    ...(rootIdx >= 0 ? [entries[rootIdx]] : []),
  ]

  for (const [ifName, props] of ordered) {
    lines.push(`interface ${ifName} {`)
    for (const [key, { type, optional }] of Object.entries(props)) {
      const propKey = isValidIdentifier(key) ? key : `"${key}"`
      lines.push(`  ${propKey}${optional ? '?' : ''}: ${type};`)
    }
    lines.push('}')
    lines.push('')
  }

  return { output: lines.join('\n').trimEnd(), error: null }
}

export function JsonToTypescript() {
  const [input, setInput] = useState('')
  const [interfaceName, setInterfaceName] = useState('Root')
  const [copied, setCopied] = useState(false)

  const { output, error } = useMemo(
    () => generateOutput(input, interfaceName),
    [input, interfaceName]
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
      {/* Interface name — IDEファイルタブ風ヘッダー */}
      <div className="flex items-stretch overflow-hidden rounded border border-border">
        <div className="flex items-center border-r border-border bg-surface px-4 py-2.5 shrink-0">
          <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-muted/50 select-none">
            interface
          </span>
        </div>
        <div className="relative flex flex-1 items-center bg-surface/30">
          <input
            type="text"
            value={interfaceName}
            onChange={(e) => setInterfaceName(e.target.value)}
            placeholder="Root"
            data-testid="interface-name-input"
            className="w-full bg-transparent px-4 py-2.5 font-mono text-sm font-semibold text-bright placeholder:text-muted/30 focus:outline-none"
          />
          <span className="pointer-events-none mr-4 font-mono text-sm text-muted/25 select-none shrink-0">
            {'{  }'}
          </span>
        </div>
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
            placeholder={'{\n  "name": "Alice",\n  "age": 30\n}'}
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

        {/* TypeScript column */}
        <div className="flex flex-col">
          <div className="flex items-center justify-between border-b border-border bg-surface px-4 py-2.5">
            <div className="flex items-center gap-2.5">
              <span className="inline-flex h-4 w-6 items-center justify-center rounded-sm bg-sky-700/60 font-mono text-[8px] font-bold text-sky-200 shrink-0">
                TS
              </span>
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted">TypeScript</span>
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
            placeholder="TypeScript の interface がここに生成されます"
            data-testid="output-area"
            rows={16}
            className="flex-1 resize-none bg-bg/70 p-4 font-mono text-xs leading-relaxed text-sky-300/80 placeholder:text-muted/20 focus:outline-none"
          />
        </div>
      </div>
    </div>
  )
}
