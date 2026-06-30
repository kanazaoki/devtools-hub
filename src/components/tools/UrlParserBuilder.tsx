'use client'

import { useState, useCallback, useEffect } from 'react'

interface ParsedUrl {
  protocol: string
  username: string
  password: string
  hostname: string
  port: string
  host: string
  pathname: string
  search: string
  hash: string
}

interface QueryParam {
  id: number
  key: string
  value: string
}

let nextId = 1

function parseUrl(raw: string): { parsed: ParsedUrl; params: QueryParam[] } | null {
  if (!raw.trim()) return null
  try {
    const u = new URL(raw)
    const params: QueryParam[] = []
    u.searchParams.forEach((v, k) => {
      params.push({ id: nextId++, key: k, value: v })
    })
    return {
      parsed: {
        protocol: u.protocol.replace(':', ''),
        username: u.username,
        password: u.password,
        hostname: u.hostname,
        port: u.port,
        host: u.host,
        pathname: u.pathname,
        search: u.search,
        hash: u.hash.replace('#', ''),
      },
      params,
    }
  } catch {
    return null
  }
}

function buildUrl(parsed: ParsedUrl, params: QueryParam[]): string {
  try {
    const auth = parsed.username
      ? `${encodeURIComponent(parsed.username)}${parsed.password ? ':' + encodeURIComponent(parsed.password) : ''}@`
      : ''
    const host = parsed.port ? `${parsed.hostname}:${parsed.port}` : parsed.hostname
    const search = params.filter((p) => p.key).length > 0
      ? '?' + params.filter((p) => p.key).map((p) => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`).join('&')
      : ''
    const hash = parsed.hash ? `#${parsed.hash}` : ''
    return `${parsed.protocol}://${auth}${host}${parsed.pathname}${search}${hash}`
  } catch {
    return ''
  }
}

const PART_LABELS: { key: keyof ParsedUrl; label: string }[] = [
  { key: 'protocol', label: 'protocol' },
  { key: 'username', label: 'username' },
  { key: 'password', label: 'password' },
  { key: 'host', label: 'host' },
  { key: 'pathname', label: 'pathname' },
  { key: 'search', label: 'search' },
  { key: 'hash', label: 'hash' },
]

function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    if (!text) return
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }
  return (
    <button
      onClick={copy}
      disabled={!text}
      className={`rounded border px-2 py-0.5 font-mono text-[10px] transition-colors disabled:opacity-30 ${
        copied ? 'border-teal/50 text-teal' : 'border-border text-dim hover:border-teal/50 hover:text-teal'
      }`}
    >
      {copied ? '✓' : (label ?? 'コピー')}
    </button>
  )
}

export function UrlParserBuilder() {
  const [input, setInput] = useState('https://user:pass@example.com:8080/path/to/page?foo=bar&baz=qux#section')
  const [error, setError] = useState('')
  const [parsed, setParsed] = useState<ParsedUrl | null>(null)
  const [params, setParams] = useState<QueryParam[]>([])
  const [decoded, setDecoded] = useState(true)
  const [fullUrl, setFullUrl] = useState('')
  const [copiedFull, setCopiedFull] = useState(false)

  const applyInput = useCallback((raw: string) => {
    if (!raw.trim()) {
      setParsed(null)
      setParams([])
      setFullUrl('')
      setError('')
      return
    }
    const result = parseUrl(raw)
    if (!result) {
      setError('無効なURLです。スキーム（https:// など）を含む完全なURLを入力してください。')
      setParsed(null)
      setParams([])
      setFullUrl('')
      return
    }
    setError('')
    setParsed(result.parsed)
    setParams(result.params)
    setFullUrl(raw.trim())
  }, [])

  useEffect(() => {
    applyInput(input)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleInput = (v: string) => {
    setInput(v)
    applyInput(v)
  }

  const updateParam = (id: number, field: 'key' | 'value', val: string) => {
    const next = params.map((p) => (p.id === id ? { ...p, [field]: val } : p))
    setParams(next)
    if (parsed) {
      setFullUrl(buildUrl(parsed, next))
    }
  }

  const addParam = () => {
    const next = [...params, { id: nextId++, key: '', value: '' }]
    setParams(next)
  }

  const removeParam = (id: number) => {
    const next = params.filter((p) => p.id !== id)
    setParams(next)
    if (parsed) {
      setFullUrl(buildUrl(parsed, next))
    }
  }

  const copyFull = () => {
    navigator.clipboard.writeText(fullUrl).then(() => {
      setCopiedFull(true)
      setTimeout(() => setCopiedFull(false), 1500)
    })
  }

  const displayValue = (raw: string) => {
    if (!decoded) return raw
    try { return decodeURIComponent(raw) } catch { return raw }
  }

  const inputClass = 'w-full rounded border border-border bg-[#070d1a] px-3 py-1.5 font-mono text-xs text-bright outline-none transition-colors focus:border-teal placeholder:text-border'

  return (
    <div className="flex flex-col gap-6">
      {/* URL Input */}
      <div>
        <label className="mb-1.5 block font-mono text-[10px] font-semibold uppercase tracking-widest text-muted">URL 入力</label>
        <input
          type="text"
          value={input}
          onChange={(e) => handleInput(e.target.value)}
          placeholder="https://example.com/path?key=value#hash"
          className="w-full rounded border border-border bg-[#070d1a] px-3 py-2.5 font-mono text-sm text-bright outline-none transition-colors focus:border-teal placeholder:text-border"
        />
        {error && <p className="mt-1.5 text-xs text-red-400">{error}</p>}
      </div>

      {parsed && (
        <>
          {/* Parts breakdown */}
          <div className="rounded border border-border bg-[#070d1a]">
            <div className="border-b border-border px-4 py-2.5 flex items-center justify-between">
              <p className="font-mono text-[10px] font-semibold uppercase tracking-widest text-muted">URL パーツ</p>
            </div>
            <div className="divide-y divide-border/50">
              {PART_LABELS.map(({ key, label }) => {
                const raw = parsed[key]
                if (!raw) return null
                const display = decoded && (key === 'search' || key === 'hash')
                  ? (() => { try { return decodeURIComponent(raw) } catch { return raw } })()
                  : raw
                return (
                  <div key={key} className="flex items-center gap-3 px-4 py-2.5">
                    <span className="w-20 shrink-0 font-mono text-[10px] text-muted">{label}</span>
                    <span className="flex-1 font-mono text-xs text-bright break-all">{display}</span>
                    <CopyButton text={raw} />
                  </div>
                )
              })}
            </div>
          </div>

          {/* Query Params */}
          <div className="rounded border border-border bg-[#070d1a]">
            <div className="border-b border-border px-4 py-2.5 flex items-center justify-between gap-2">
              <p className="font-mono text-[10px] font-semibold uppercase tracking-widest text-muted">クエリパラメータ</p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setDecoded((v) => !v)}
                  className="rounded border border-border px-2.5 py-1 font-mono text-[10px] text-dim transition-colors hover:border-teal/50 hover:text-teal"
                >
                  {decoded ? 'デコード表示中' : 'エンコード表示中'}
                </button>
              </div>
            </div>
            <div className="p-4 flex flex-col gap-2">
              {params.length === 0 && (
                <p className="text-xs text-border">クエリパラメータなし</p>
              )}
              {params.map((p) => (
                <div key={p.id} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={decoded ? ((() => { try { return decodeURIComponent(p.key) } catch { return p.key } })()) : p.key}
                    onChange={(e) => updateParam(p.id, 'key', decoded ? encodeURIComponent(e.target.value) : e.target.value)}
                    placeholder="key"
                    className={inputClass + ' flex-1'}
                  />
                  <span className="text-border">=</span>
                  <input
                    type="text"
                    value={displayValue(p.value)}
                    onChange={(e) => updateParam(p.id, 'value', decoded ? encodeURIComponent(e.target.value) : e.target.value)}
                    placeholder="value"
                    className={inputClass + ' flex-1'}
                  />
                  <button
                    onClick={() => removeParam(p.id)}
                    className="shrink-0 rounded border border-border/50 px-2 py-1.5 font-mono text-[10px] text-dim transition-colors hover:border-red-400/50 hover:text-red-400"
                  >
                    削除
                  </button>
                </div>
              ))}
              <button
                onClick={addParam}
                className="mt-1 rounded border border-dashed border-border py-1.5 text-xs text-muted transition-colors hover:border-teal/50 hover:text-teal"
              >
                ＋ パラメータを追加
              </button>
            </div>
          </div>

          {/* Full URL output */}
          <div className="rounded border border-border bg-[#070d1a]">
            <div className="border-b border-border px-4 py-2.5 flex items-center justify-between">
              <p className="font-mono text-[10px] font-semibold uppercase tracking-widest text-muted">完全 URL</p>
              <button
                onClick={copyFull}
                disabled={!fullUrl}
                className={`rounded border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-30 ${
                  copiedFull ? 'border-teal/50 text-teal' : 'border-border text-dim hover:border-teal/50 hover:text-teal'
                }`}
              >
                {copiedFull ? '✓ コピー済み' : 'コピー'}
              </button>
            </div>
            <div className="px-4 py-3">
              <p className="font-mono text-xs text-bright break-all leading-relaxed">{fullUrl || '—'}</p>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
