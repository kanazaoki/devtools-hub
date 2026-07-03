'use client'

import { useState, useMemo } from 'react'

interface ValidationResult {
  valid: boolean
  errors: { path: string; message: string }[]
}

function validate(schemaText: string, jsonText: string): ValidationResult | { parseError: string } {
  let schema: unknown
  let data: unknown

  try {
    schema = JSON.parse(schemaText)
  } catch (e) {
    return { parseError: `JSON Schema のパースエラー: ${(e as Error).message}` }
  }
  try {
    data = JSON.parse(jsonText)
  } catch (e) {
    return { parseError: `JSON のパースエラー: ${(e as Error).message}` }
  }

  const errors: { path: string; message: string }[] = []

  function check(schema: Record<string, unknown>, value: unknown, path: string) {
    if (schema.type !== undefined) {
      const types = Array.isArray(schema.type) ? schema.type : [schema.type]
      const actualType = value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value
      if (!types.includes(actualType)) {
        errors.push({ path, message: `型エラー: ${types.join(' | ')} が必要ですが ${actualType} です` })
        return
      }
    }

    if (schema.enum !== undefined && Array.isArray(schema.enum)) {
      if (!schema.enum.some((e) => JSON.stringify(e) === JSON.stringify(value))) {
        errors.push({ path, message: `値が enum に含まれていません: ${JSON.stringify(schema.enum)}` })
      }
    }

    if (typeof value === 'string') {
      if (typeof schema.minLength === 'number' && value.length < schema.minLength) {
        errors.push({ path, message: `文字数が minLength (${schema.minLength}) より少ない` })
      }
      if (typeof schema.maxLength === 'number' && value.length > schema.maxLength) {
        errors.push({ path, message: `文字数が maxLength (${schema.maxLength}) を超えています` })
      }
      if (schema.pattern !== undefined) {
        try {
          if (!new RegExp(schema.pattern as string).test(value)) {
            errors.push({ path, message: `pattern "${schema.pattern}" に一致しません` })
          }
        } catch {
          errors.push({ path, message: `pattern が不正な正規表現です: ${schema.pattern}` })
        }
      }
    }

    if (typeof value === 'number') {
      if (typeof schema.minimum === 'number' && value < schema.minimum) {
        errors.push({ path, message: `値が minimum (${schema.minimum}) より小さい` })
      }
      if (typeof schema.maximum === 'number' && value > schema.maximum) {
        errors.push({ path, message: `値が maximum (${schema.maximum}) より大きい` })
      }
      if (typeof schema.exclusiveMinimum === 'number' && value <= schema.exclusiveMinimum) {
        errors.push({ path, message: `値が exclusiveMinimum (${schema.exclusiveMinimum}) 以下` })
      }
      if (typeof schema.exclusiveMaximum === 'number' && value >= schema.exclusiveMaximum) {
        errors.push({ path, message: `値が exclusiveMaximum (${schema.exclusiveMaximum}) 以上` })
      }
      if (typeof schema.multipleOf === 'number' && value % schema.multipleOf !== 0) {
        errors.push({ path, message: `値が multipleOf (${schema.multipleOf}) の倍数ではありません` })
      }
    }

    if (Array.isArray(value)) {
      if (typeof schema.minItems === 'number' && value.length < schema.minItems) {
        errors.push({ path, message: `要素数が minItems (${schema.minItems}) より少ない` })
      }
      if (typeof schema.maxItems === 'number' && value.length > schema.maxItems) {
        errors.push({ path, message: `要素数が maxItems (${schema.maxItems}) を超えています` })
      }
      if (schema.items !== undefined && !Array.isArray(schema.items)) {
        value.forEach((item, idx) =>
          check(schema.items as Record<string, unknown>, item, `${path}[${idx}]`)
        )
      }
    }

    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      const obj = value as Record<string, unknown>
      if (Array.isArray(schema.required)) {
        schema.required.forEach((key: unknown) => {
          if (typeof key === 'string' && !(key in obj)) {
            errors.push({ path, message: `必須プロパティ "${key}" がありません` })
          }
        })
      }
      if (schema.properties !== undefined && typeof schema.properties === 'object') {
        const props = schema.properties as Record<string, Record<string, unknown>>
        Object.entries(props).forEach(([key, subSchema]) => {
          if (key in obj) {
            check(subSchema, obj[key], path ? `${path}/${key}` : `/${key}`)
          }
        })
      }
      if (schema.additionalProperties === false) {
        const allowed = new Set(Object.keys((schema.properties as Record<string, unknown>) ?? {}))
        Object.keys(obj).forEach((key) => {
          if (!allowed.has(key)) {
            errors.push({
              path: path ? `${path}/${key}` : `/${key}`,
              message: `追加プロパティ "${key}" は許可されていません`,
            })
          }
        })
      }
    }
  }

  check(schema as Record<string, unknown>, data, '')
  return { valid: errors.length === 0, errors }
}

const PRESETS = [
  {
    label: 'ユーザー',
    schema: JSON.stringify(
      { type: 'object', required: ['name', 'age'], properties: { name: { type: 'string', minLength: 1 }, age: { type: 'number', minimum: 0, maximum: 150 }, email: { type: 'string' } } },
      null, 2
    ),
    json: JSON.stringify({ name: 'Alice', age: 30, email: 'alice@example.com' }, null, 2),
  },
  {
    label: '配列',
    schema: JSON.stringify({ type: 'array', minItems: 1, items: { type: 'string', minLength: 1 } }, null, 2),
    json: JSON.stringify(['apple', 'banana', 'cherry'], null, 2),
  },
  {
    label: 'ネスト',
    schema: JSON.stringify(
      { type: 'object', required: ['product'], properties: { product: { type: 'object', required: ['id', 'price'], properties: { id: { type: 'number' }, price: { type: 'number', minimum: 0 }, tags: { type: 'array', items: { type: 'string' } } } } } },
      null, 2
    ),
    json: JSON.stringify({ product: { id: 1, price: 1200, tags: ['sale', 'new'] } }, null, 2),
  },
]

export function JsonSchemaValidator() {
  const [schemaText, setSchemaText] = useState(PRESETS[0].schema)
  const [jsonText, setJsonText] = useState(PRESETS[0].json)
  const [copiedSchema, setCopiedSchema] = useState(false)
  const [copiedJson, setCopiedJson] = useState(false)

  const result = useMemo(() => {
    if (!schemaText.trim() || !jsonText.trim()) return null
    return validate(schemaText, jsonText)
  }, [schemaText, jsonText])

  const copySchema = async () => {
    await navigator.clipboard.writeText(schemaText)
    setCopiedSchema(true)
    setTimeout(() => setCopiedSchema(false), 1500)
  }
  const copyJson = async () => {
    await navigator.clipboard.writeText(jsonText)
    setCopiedJson(true)
    setTimeout(() => setCopiedJson(false), 1500)
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Presets */}
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button
            key={p.label}
            onClick={() => { setSchemaText(p.schema); setJsonText(p.json) }}
            className="rounded border border-[var(--border)] px-3 py-1 font-mono text-xs text-[var(--dim)] transition-colors hover:border-[var(--teal)] hover:text-[var(--teal)]"
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Schema */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--muted)]">JSON Schema</span>
            <button
              onClick={copySchema}
              className="rounded border border-[var(--border)] px-2.5 py-0.5 font-mono text-xs text-[var(--dim)] transition-colors hover:border-[var(--teal)] hover:text-[var(--teal)]"
            >
              {copiedSchema ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <textarea
            value={schemaText}
            onChange={(e) => setSchemaText(e.target.value)}
            spellCheck={false}
            rows={16}
            className="w-full resize-y rounded border border-[var(--border)] bg-[var(--bg)] p-3 font-mono text-sm text-[var(--primary)] outline-none transition-colors focus:border-[var(--teal)]"
          />
        </div>

        {/* JSON */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--muted)]">JSON</span>
            <button
              onClick={copyJson}
              className="rounded border border-[var(--border)] px-2.5 py-0.5 font-mono text-xs text-[var(--dim)] transition-colors hover:border-[var(--teal)] hover:text-[var(--teal)]"
            >
              {copiedJson ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <textarea
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            spellCheck={false}
            rows={16}
            className="w-full resize-y rounded border border-[var(--border)] bg-[var(--bg)] p-3 font-mono text-sm text-[var(--primary)] outline-none transition-colors focus:border-[var(--teal)]"
          />
        </div>
      </div>

      {/* Result */}
      {result && (
        <div>
          {'parseError' in result ? (
            <div className="rounded border border-red-500/30 bg-red-500/8 p-4">
              <p className="font-mono text-xs font-semibold text-red-400">Parse error</p>
              <p className="mt-1.5 font-mono text-xs text-red-400/70">{result.parseError}</p>
            </div>
          ) : result.valid ? (
            <div className="flex items-center gap-3 rounded border border-[var(--teal)]/30 bg-[var(--teal)]/8 px-4 py-3">
              <span className="text-[var(--teal)] text-base leading-none">✓</span>
              <span className="font-mono text-sm font-semibold text-[var(--teal)]">Valid</span>
              <span className="font-mono text-xs text-[var(--dim)]">— スキーマに適合しています</span>
            </div>
          ) : (
            <div className="rounded border border-red-500/30 bg-red-500/8 p-4">
              <p className="mb-3 font-mono text-xs font-semibold text-red-400">
                Invalid — {result.errors.length} 件のエラー
              </p>
              <ul className="flex flex-col gap-2">
                {result.errors.map((e, i) => (
                  <li key={i} className="flex items-baseline gap-3">
                    <code className="shrink-0 rounded bg-red-500/10 px-1.5 py-0.5 font-mono text-[10px] text-red-400 border border-red-500/20">
                      {e.path || '/'}
                    </code>
                    <span className="font-mono text-xs text-red-400/80">{e.message}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
