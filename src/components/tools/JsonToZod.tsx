'use client'

import { useState, useMemo } from 'react'

// ─── Zod schema generator ────────────────────────────────────────────────────

function generateZodSchema(value: unknown, indent: number, opts: Options): string {
  const pad = '  '.repeat(indent)
  const innerPad = '  '.repeat(indent + 1)

  if (value === null) return 'z.null()'
  if (value === undefined) return 'z.undefined()'

  switch (typeof value) {
    case 'boolean':
      return 'z.boolean()'
    case 'number':
      return opts.intForIntegers && Number.isInteger(value) ? 'z.number().int()' : 'z.number()'
    case 'string':
      return 'z.string()'
    case 'object':
      if (Array.isArray(value)) {
        if (value.length === 0) return 'z.array(z.unknown())'
        // Collect unique type schemas
        const itemSchemas = [...new Set(value.map((item) => generateZodSchema(item, indent, opts)))]
        if (itemSchemas.length === 1) return `z.array(${itemSchemas[0]})`
        return `z.array(z.union([${itemSchemas.join(', ')}]))`
      }
      // Object
      const entries = Object.entries(value as Record<string, unknown>)
      if (entries.length === 0) return 'z.object({})'
      const fields = entries.map(([k, v]) => {
        const safeKey = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(k) ? k : JSON.stringify(k)
        let schema = generateZodSchema(v, indent + 1, opts)
        if (opts.allOptional) schema += '.optional()'
        return `${innerPad}${safeKey}: ${schema},`
      })
      return `z.object({\n${fields.join('\n')}\n${pad}})`
    default:
      return 'z.unknown()'
  }
}

interface Options {
  allOptional: boolean
  intForIntegers: boolean
}

// ─── Component ───────────────────────────────────────────────────────────────

const EXAMPLE_JSON = `{
  "id": 1,
  "name": "Alice",
  "email": "alice@example.com",
  "age": 30,
  "active": true,
  "score": 98.5,
  "tags": ["admin", "user"],
  "address": {
    "city": "Tokyo",
    "zip": "100-0001"
  },
  "nickname": null
}`

export function JsonToZod() {
  const [input, setInput] = useState(EXAMPLE_JSON)
  const [opts, setOpts] = useState<Options>({ allOptional: false, intForIntegers: true })
  const [copied, setCopied] = useState(false)

  const { output, error } = useMemo(() => {
    if (!input.trim()) return { output: '', error: '' }
    try {
      const parsed = JSON.parse(input)
      const schema = generateZodSchema(parsed, 0, opts)
      return { output: `import { z } from 'zod'\n\nexport const schema = ${schema}`, error: '' }
    } catch (e) {
      return { output: '', error: e instanceof Error ? e.message : '無効な JSON です' }
    }
  }, [input, opts])

  function handleCopy() {
    if (!output) return
    navigator.clipboard.writeText(output).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  function toggleOpt<K extends keyof Options>(key: K) {
    setOpts((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <div className="space-y-4">
      {/* Options */}
      <div className="flex flex-wrap gap-4">
        <label className="flex cursor-pointer items-center gap-2 text-sm text-primary">
          <input
            type="checkbox"
            checked={opts.allOptional}
            onChange={() => toggleOpt('allOptional')}
            className="h-4 w-4 cursor-pointer accent-teal"
          />
          全フィールドに <code className="font-mono text-teal">.optional()</code> を付ける
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-primary">
          <input
            type="checkbox"
            checked={opts.intForIntegers}
            onChange={() => toggleOpt('intForIntegers')}
            className="h-4 w-4 cursor-pointer accent-teal"
          />
          整数を <code className="font-mono text-teal">z.number().int()</code> にする
        </label>
      </div>

      {/* Editor area */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Input */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted">JSON 入力</p>
            <button
              onClick={() => setInput(EXAMPLE_JSON)}
              className="text-xs text-muted transition-colors hover:text-teal"
            >
              サンプルを挿入
            </button>
          </div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            spellCheck={false}
            className="h-80 w-full resize-none rounded border border-border bg-base p-3 font-mono text-xs text-primary focus:border-teal focus:outline-none"
            placeholder='{"key": "value"}'
          />
          {error && (
            <p className="rounded border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
              ⚠ {error}
            </p>
          )}
        </div>

        {/* Output */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted">Zod スキーマ</p>
            <button
              onClick={handleCopy}
              disabled={!output}
              className="text-xs text-muted transition-colors hover:text-teal disabled:opacity-40"
            >
              {copied ? '✓ コピー済み' : 'コピー'}
            </button>
          </div>
          <pre className="h-80 overflow-auto rounded border border-border bg-base p-3 text-xs leading-relaxed text-primary">
            {output || (error ? '' : <span className="text-muted">JSON を入力すると Zod スキーマが生成されます</span>)}
          </pre>
        </div>
      </div>
    </div>
  )
}
