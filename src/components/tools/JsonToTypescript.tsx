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

function inferElementType(
  value: unknown,
  keyName: string,
  interfaces: Map<string, Record<string, TypeInfo>>
): string {
  if (value === null || value === undefined) return 'null'
  if (typeof value === 'string') return 'string'
  if (typeof value === 'number') return 'number'
  if (typeof value === 'boolean') return 'boolean'
  if (Array.isArray(value)) return inferType(value, keyName, interfaces).type
  if (typeof value === 'object') {
    const nestedName = singularize(toPascalCase(keyName))
    processObject(value as Record<string, unknown>, nestedName, interfaces)
    return nestedName
  }
  return 'unknown'
}

function inferType(
  value: unknown,
  keyName: string,
  interfaces: Map<string, Record<string, TypeInfo>>
): TypeInfo {
  if (value === null || value === undefined) {
    return { type: 'string | null', optional: true }
  }
  if (typeof value === 'string') return { type: 'string', optional: false }
  if (typeof value === 'number') return { type: 'number', optional: false }
  if (typeof value === 'boolean') return { type: 'boolean', optional: false }
  if (Array.isArray(value)) {
    if (value.length === 0) return { type: 'unknown[]', optional: false }
    const elementTypes = [...new Set(value.map(item => inferElementType(item, keyName, interfaces)))]
    const elementType =
      elementTypes.length === 1 ? elementTypes[0] : `(${elementTypes.join(' | ')})`
    return { type: `${elementType}[]`, optional: false }
  }
  if (typeof value === 'object') {
    const nestedName = toPascalCase(keyName)
    processObject(value as Record<string, unknown>, nestedName, interfaces)
    return { type: nestedName, optional: false }
  }
  return { type: 'unknown', optional: false }
}

function processObject(
  obj: Record<string, unknown>,
  name: string,
  interfaces: Map<string, Record<string, TypeInfo>>
) {
  if (interfaces.has(name)) return
  const props: Record<string, TypeInfo> = {}
  interfaces.set(name, props)
  for (const [key, val] of Object.entries(obj)) {
    props[key] = inferType(val, key, interfaces)
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
  processObject(parsed as Record<string, unknown>, name, interfaces)

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

      {/* Split editor panel */}
      <div className="overflow-hidden rounded border border-border">
        {/* Panel headers */}
        <div className="grid grid-cols-2 border-b border-border">
          {/* JSON header */}
          <div className="flex items-center justify-between border-r border-border bg-surface px-4 py-2.5">
            <div className="flex items-center gap-2.5">
              <span className="h-2 w-2 rounded-full bg-amber-500/70 shrink-0" />
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted">JSON</span>
            </div>
            {input.length > 0 && (
              <span className="font-mono text-[9px] tabular-nums text-muted/40">{input.length} chars</span>
            )}
          </div>
          {/* TypeScript header */}
          <div className="flex items-center justify-between bg-surface px-4 py-2.5">
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
        </div>

        {/* Editor body */}
        <div className="grid grid-cols-2">
          {/* JSON input */}
          <div className="flex flex-col border-r border-border">
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

          {/* TypeScript output */}
          <div className="relative flex flex-col">
            {/* 左アクセントライン */}
            <span
              aria-hidden="true"
              className={`absolute inset-y-0 left-0 w-[2px] transition-colors duration-300 ${
                output && !error ? 'bg-sky-500/40' : 'bg-border/0'
              }`}
            />
            <textarea
              value={output}
              readOnly
              placeholder="TypeScript の interface がここに生成されます"
              data-testid="output-area"
              rows={16}
              className="flex-1 resize-none bg-bg/70 p-4 pl-5 font-mono text-xs leading-relaxed text-sky-300/80 placeholder:text-muted/20 focus:outline-none"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
