'use client'
import { useState } from 'react'

interface ParsedUrl {
  protocol: string
  host: string
  port: string
  path: string
  hash: string
  params: { key: string; value: string }[]
}

function parseUrl(raw: string): ParsedUrl | null {
  try {
    const u = new URL(raw)
    const params = Array.from(u.searchParams.entries()).map(([key, value]) => ({ key, value }))
    return {
      protocol: u.protocol.replace(':', ''),
      host: u.hostname,
      port: u.port,
      path: u.pathname,
      hash: u.hash.replace('#', ''),
      params: params.length > 0 ? params : [{ key: '', value: '' }],
    }
  } catch {
    return null
  }
}

function buildUrl(p: ParsedUrl): string {
  try {
    const portPart = p.port ? `:${p.port}` : ''
    const base = `${p.protocol}://${p.host}${portPart}${p.path || '/'}`
    const u = new URL(base)
    p.params.filter((q) => q.key.trim()).forEach(({ key, value }) => u.searchParams.set(key, value))
    if (p.hash.trim()) u.hash = p.hash
    return u.toString()
  } catch {
    return ''
  }
}

const INITIAL_URL = 'https://api.example.com/v1/users?limit=20&offset=0#results'

export function UrlBuilder() {
  const [raw, setRaw] = useState(INITIAL_URL)
  const [parsed, setParsed] = useState<ParsedUrl>(
    () => parseUrl(INITIAL_URL) ?? { protocol: 'https', host: '', port: '', path: '/', hash: '', params: [{ key: '', value: '' }] },
  )
  const [parseError, setParseError] = useState('')
  const [copied, setCopied] = useState(false)

  const built = buildUrl(parsed)

  const handleParse = () => {
    const result = parseUrl(raw)
    if (result) { setParsed(result); setParseError('') }
    else setParseError('有効なURLを入力してください（https://... 形式）')
  }

  const set = <K extends keyof ParsedUrl>(field: K, val: ParsedUrl[K]) =>
    setParsed((p) => ({ ...p, [field]: val }))

  const addParam = () =>
    setParsed((p) => ({ ...p, params: [...p.params, { key: '', value: '' }] }))

  const removeParam = (i: number) =>
    setParsed((p) => ({ ...p, params: p.params.filter((_, idx) => idx !== i) }))

  const updateParam = (i: number, field: 'key' | 'value', val: string) =>
    setParsed((p) => ({
      ...p,
      params: p.params.map((pp, idx) => (idx === i ? { ...pp, [field]: val } : pp)),
    }))

  const copy = async () => {
    if (!built) return
    await navigator.clipboard.writeText(built)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const PROTOCOLS = ['https', 'http', 'wss', 'ws', 'ftp', 'ftps']

  return (
    <div className="space-y-5">
      {/* Raw URL input */}
      <div>
        <label className="mb-1 block text-xs font-medium text-muted">URLを貼り付けて分解</label>
        <div className="flex gap-2">
          <input
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleParse()}
            placeholder="https://..."
            className="flex-1 rounded border border-border bg-bg px-3 py-2 font-mono text-sm text-bright placeholder:text-muted focus:border-teal focus:outline-none"
          />
          <button
            onClick={handleParse}
            className="rounded bg-teal/20 px-4 py-2 text-sm font-medium text-teal hover:bg-teal/30"
          >
            分解
          </button>
        </div>
        {parseError && <p className="mt-1 text-xs text-red-400">{parseError}</p>}
      </div>

      {/* Fields */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-muted">Protocol</label>
          <select
            value={parsed.protocol}
            onChange={(e) => set('protocol', e.target.value)}
            className="w-full rounded border border-border bg-bg px-3 py-2 text-sm text-bright focus:border-teal focus:outline-none"
          >
            {PROTOCOLS.map((p) => <option key={p}>{p}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted">Host</label>
          <input
            value={parsed.host}
            onChange={(e) => set('host', e.target.value)}
            placeholder="api.example.com"
            className="w-full rounded border border-border bg-bg px-3 py-2 font-mono text-sm text-bright placeholder:text-muted focus:border-teal focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted">Port（省略可）</label>
          <input
            value={parsed.port}
            onChange={(e) => set('port', e.target.value)}
            placeholder="8080"
            className="w-full rounded border border-border bg-bg px-3 py-2 font-mono text-sm text-bright placeholder:text-muted focus:border-teal focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted">Path</label>
          <input
            value={parsed.path}
            onChange={(e) => set('path', e.target.value)}
            placeholder="/api/v1/users"
            className="w-full rounded border border-border bg-bg px-3 py-2 font-mono text-sm text-bright placeholder:text-muted focus:border-teal focus:outline-none"
          />
        </div>
      </div>

      {/* Query params */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="text-xs font-medium text-muted">Query Parameters</label>
          <button onClick={addParam} className="text-xs text-teal hover:underline">
            ＋ パラメータを追加
          </button>
        </div>
        <div className="space-y-2">
          {parsed.params.map((p, i) => (
            <div key={i} className="flex gap-2">
              <input
                value={p.key}
                onChange={(e) => updateParam(i, 'key', e.target.value)}
                placeholder="key"
                className="w-2/5 rounded border border-border bg-bg px-2 py-1.5 font-mono text-sm text-bright placeholder:text-muted focus:border-teal focus:outline-none"
              />
              <span className="self-center text-muted">=</span>
              <input
                value={p.value}
                onChange={(e) => updateParam(i, 'value', e.target.value)}
                placeholder="value"
                className="flex-1 rounded border border-border bg-bg px-2 py-1.5 font-mono text-sm text-bright placeholder:text-muted focus:border-teal focus:outline-none"
              />
              <button
                onClick={() => removeParam(i)}
                className="px-1 text-muted hover:text-red-400"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Hash */}
      <div>
        <label className="mb-1 block text-xs font-medium text-muted">Hash Fragment（省略可）</label>
        <div className="flex items-center gap-2">
          <span className="text-muted font-mono text-sm">#</span>
          <input
            value={parsed.hash}
            onChange={(e) => set('hash', e.target.value)}
            placeholder="section-id"
            className="flex-1 rounded border border-border bg-bg px-3 py-2 font-mono text-sm text-bright placeholder:text-muted focus:border-teal focus:outline-none"
          />
        </div>
      </div>

      {/* Output */}
      {built && (
        <div className="rounded border border-teal/30 bg-teal/5 p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-mono text-xs text-muted">生成された URL</span>
            <button onClick={copy} className="text-xs font-medium text-teal hover:underline">
              {copied ? 'コピー済み ✓' : 'コピー'}
            </button>
          </div>
          <p className="break-all font-mono text-sm text-bright">{built}</p>
        </div>
      )}
    </div>
  )
}
