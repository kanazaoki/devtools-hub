'use client'

import { useState, useEffect, useCallback } from 'react'

type Mode = 'flatten' | 'unflatten'
type Delimiter = '.' | '_' | '/'

// ── Core logic ────────────────────────────────────────────────────
function flatten(obj: unknown, prefix = '', delim: Delimiter, result: Record<string, unknown> = {}): Record<string, unknown> {
  if (obj === null || typeof obj !== 'object') {
    result[prefix] = obj
    return result
  }
  if (Array.isArray(obj)) {
    obj.forEach((v, i) => flatten(v, prefix ? `${prefix}${delim}${i}` : String(i), delim, result))
    return result
  }
  const keys = Object.keys(obj as object)
  if (keys.length === 0 && prefix) { result[prefix] = {}; return result }
  for (const key of keys) {
    flatten((obj as Record<string, unknown>)[key], prefix ? `${prefix}${delim}${key}` : key, delim, result)
  }
  return result
}

function unflatten(flat: Record<string, unknown>, delim: Delimiter): unknown {
  const result: Record<string, unknown> = {}
  for (const [rawKey, value] of Object.entries(flat)) {
    const parts = rawKey.split(delim)
    let cur: Record<string, unknown> = result
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i]
      const nextPart = parts[i + 1]
      const nextIsIndex = /^\d+$/.test(nextPart)
      if (cur[part] === undefined || cur[part] === null || typeof cur[part] !== 'object') {
        cur[part] = nextIsIndex ? [] : {}
      }
      cur = cur[part] as Record<string, unknown>
    }
    const last = parts[parts.length - 1]
    cur[last] = value
  }
  // Convert objects with only numeric keys to arrays
  function toArray(v: unknown): unknown {
    if (Array.isArray(v)) return v.map(toArray)
    if (v !== null && typeof v === 'object') {
      const keys = Object.keys(v as object)
      if (keys.length > 0 && keys.every(k => /^\d+$/.test(k))) {
        const arr: unknown[] = []
        for (const k of keys) arr[Number(k)] = toArray((v as Record<string, unknown>)[k])
        return arr
      }
      const out: Record<string, unknown> = {}
      for (const k of keys) out[k] = toArray((v as Record<string, unknown>)[k])
      return out
    }
    return v
  }
  return toArray(result)
}

function convert(input: string, mode: Mode, delim: Delimiter): { output: string; error: string } {
  try {
    const parsed = JSON.parse(input)
    if (mode === 'flatten') {
      const flat = flatten(parsed, '', delim)
      return { output: JSON.stringify(flat, null, 2), error: '' }
    } else {
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        return { output: '', error: 'Unflatten はフラットなオブジェクト（{}）を入力してください' }
      }
      const result = unflatten(parsed as Record<string, unknown>, delim)
      return { output: JSON.stringify(result, null, 2), error: '' }
    }
  } catch (e) {
    return { output: '', error: `JSONパースエラー: ${(e as Error).message}` }
  }
}

const SAMPLE_FLAT = JSON.stringify({
  "user.name.first": "Alice",
  "user.name.last": "Smith",
  "user.age": 30,
  "address.city": "Tokyo",
  "tags.0": "developer",
  "tags.1": "designer"
}, null, 2)

const SAMPLE_NESTED = JSON.stringify({
  user: { name: { first: "Alice", last: "Smith" }, age: 30 },
  address: { city: "Tokyo" },
  tags: ["developer", "designer"]
}, null, 2)

export function JsonFlattener() {
  const [mode, setMode]         = useState<Mode>('flatten')
  const [delim, setDelim]       = useState<Delimiter>('.')
  const [input, setInput]       = useState(SAMPLE_NESTED)
  const [output, setOutput]     = useState('')
  const [error, setError]       = useState('')
  const [copied, setCopied]     = useState(false)

  const run = useCallback(() => {
    if (!input.trim()) { setOutput(''); setError(''); return }
    const { output: out, error: err } = convert(input, mode, delim)
    setOutput(out); setError(err)
  }, [input, mode, delim])

  useEffect(() => {
    const t = setTimeout(run, 300)
    return () => clearTimeout(t)
  }, [run])

  const copy = async () => {
    if (!output) return
    await navigator.clipboard.writeText(output)
    setCopied(true); setTimeout(() => setCopied(false), 1500)
  }

  const download = () => {
    if (!output) return
    const blob = new Blob([output], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const a    = Object.assign(document.createElement('a'), { href: url, download: 'flattened.json' })
    a.click(); URL.revokeObjectURL(url)
  }

  const loadSample = () => {
    setInput(mode === 'flatten' ? SAMPLE_NESTED : SAMPLE_FLAT)
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex gap-1">
          {(['flatten','unflatten'] as Mode[]).map(m => (
            <button key={m} onClick={() => setMode(m)}
              className={`rounded px-3 py-1.5 text-sm transition-colors ${mode === m ? 'bg-teal text-bg font-bold' : 'border border-border text-dim hover:border-teal'}`}
            >{m === 'flatten' ? 'Flatten ▼' : 'Unflatten ▲'}</button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted">区切り文字</span>
          {(['.','_','/'] as Delimiter[]).map(d => (
            <button key={d} onClick={() => setDelim(d)}
              className={`rounded px-2.5 py-1 font-mono text-sm transition-colors ${delim === d ? 'bg-teal text-bg font-bold' : 'border border-border text-dim hover:border-teal'}`}
            >{d}</button>
          ))}
        </div>
        <button onClick={loadSample} className="text-xs text-teal underline">サンプルを挿入</button>
      </div>

      {/* Panes */}
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <p className="mb-1.5 text-xs text-muted font-mono uppercase tracking-widest">Input (JSON)</p>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            className="h-72 w-full resize-y rounded border border-border bg-bg p-3 font-mono text-xs text-primary focus:border-teal focus:outline-none"
            placeholder={mode === 'flatten' ? '{"a":{"b":1}}' : '{"a.b":1}'}
          />
        </div>
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <p className="text-xs text-muted font-mono uppercase tracking-widest">Output</p>
            {output && (
              <div className="flex gap-2">
                <button onClick={copy} className={`text-xs font-medium transition-colors ${copied ? 'text-teal' : 'text-dim hover:text-teal'}`}>
                  {copied ? '✓ コピー済み' : 'コピー'}
                </button>
                <button onClick={download} className="text-xs text-dim hover:text-teal transition-colors">DL</button>
              </div>
            )}
          </div>
          <div className={`h-72 w-full overflow-auto rounded border p-3 font-mono text-xs ${error ? 'border-red-500/50 bg-red-500/5 text-red-400' : 'border-border/50 bg-surface text-primary'}`}>
            {error ? error : output ? (
              <pre className="whitespace-pre-wrap">{output}</pre>
            ) : (
              <span className="text-muted">変換結果がここに表示されます</span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
