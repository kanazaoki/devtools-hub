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
    const search =
      params.filter((p) => p.key).length > 0
        ? '?' + params.filter((p) => p.key).map((p) => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`).join('&')
        : ''
    const hash = parsed.hash ? `#${parsed.hash}` : ''
    return `${parsed.protocol}://${auth}${host}${parsed.pathname}${search}${hash}`
  } catch {
    return ''
  }
}

const PART_DEFS: { key: keyof ParsedUrl; label: string; color: string; bg: string; dot: string }[] = [
  { key: 'protocol', label: 'protocol', color: 'text-teal',         bg: 'bg-teal/10 border-teal/30',        dot: 'bg-teal' },
  { key: 'username', label: 'username', color: 'text-amber-400',    bg: 'bg-amber-400/10 border-amber-400/30', dot: 'bg-amber-400' },
  { key: 'password', label: 'password', color: 'text-orange-400',   bg: 'bg-orange-400/10 border-orange-400/30', dot: 'bg-orange-400' },
  { key: 'host',     label: 'host',     color: 'text-blue-400',     bg: 'bg-blue-400/10 border-blue-400/30',  dot: 'bg-blue-400' },
  { key: 'pathname', label: 'pathname', color: 'text-violet-400',   bg: 'bg-violet-400/10 border-violet-400/30', dot: 'bg-violet-400' },
  { key: 'search',   label: 'search',   color: 'text-emerald-400',  bg: 'bg-emerald-400/10 border-emerald-400/30', dot: 'bg-emerald-400' },
  { key: 'hash',     label: 'hash',     color: 'text-pink-400',     bg: 'bg-pink-400/10 border-pink-400/30',  dot: 'bg-pink-400' },
]

function CopyButton({ text }: { text: string }) {
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
      className={`shrink-0 rounded border px-2 py-0.5 font-mono text-[10px] transition-colors disabled:opacity-30 ${
        copied ? 'border-teal/50 text-teal' : 'border-border text-dim hover:border-teal/50 hover:text-teal'
      }`}
    >
      {copied ? '✓' : 'copy'}
    </button>
  )
}

export function UrlParserBuilder() {
  const [input, setInput] = useState(
    'https://user:pass@example.com:8080/path/to/page?foo=bar&baz=qux#section'
  )
  const [error, setError] = useState('')
  const [parsed, setParsed] = useState<ParsedUrl | null>(null)
  const [params, setParams] = useState<QueryParam[]>([])
  const [decoded, setDecoded] = useState(true)
  const [fullUrl, setFullUrl] = useState('')
  const [copiedFull, setCopiedFull] = useState(false)

  const applyInput = useCallback((raw: string) => {
    if (!raw.trim()) {
      setParsed(null); setParams([]); setFullUrl(''); setError(''); return
    }
    const result = parseUrl(raw)
    if (!result) {
      setError('無効なURLです。スキーム（https:// など）を含む完全なURLを入力してください。')
      setParsed(null); setParams([]); setFullUrl(''); return
    }
    setError('')
    setParsed(result.parsed)
    setParams(result.params)
    setFullUrl(raw.trim())
  }, [])

  useEffect(() => { applyInput(input) }, []) // eslint-disable-line

  const handleInput = (v: string) => { setInput(v); applyInput(v) }

  const updateParam = (id: number, field: 'key' | 'value', val: string) => {
    const next = params.map((p) => (p.id === id ? { ...p, [field]: val } : p))
    setParams(next)
    if (parsed) setFullUrl(buildUrl(parsed, next))
  }

  const addParam = () => {
    const next = [...params, { id: nextId++, key: '', value: '' }]
    setParams(next)
  }

  const removeParam = (id: number) => {
    const next = params.filter((p) => p.id !== id)
    setParams(next)
    if (parsed) setFullUrl(buildUrl(parsed, next))
  }

  const dv = (raw: string) => {
    if (!decoded) return raw
    try { return decodeURIComponent(raw) } catch { return raw }
  }

  const inputCls =
    'w-full rounded border border-border bg-[#060a12] px-3 py-1.5 font-mono text-xs text-bright outline-none transition-colors focus:border-teal placeholder:text-border'

  return (
    <div className="flex flex-col gap-5">
      {/* URL Input */}
      <div>
        <label className="mb-1.5 block font-mono text-[10px] font-semibold uppercase tracking-widest text-muted">
          URL 入力
        </label>
        <input
          type="text"
          value={input}
          onChange={(e) => handleInput(e.target.value)}
          placeholder="https://example.com/path?key=value#hash"
          className="w-full rounded border border-border bg-[#060a12] px-3 py-3 font-mono text-sm text-bright outline-none transition-colors focus:border-teal placeholder:text-border"
          spellCheck={false}
        />
        {error && (
          <p className="mt-1.5 flex items-center gap-1.5 text-xs text-red-400">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-400" />
            {error}
          </p>
        )}
      </div>

      {parsed && (
        <>
          {/* Color-coded anatomy */}
          <div className="rounded-lg border border-border bg-[#070d1a] overflow-hidden">
            <div className="border-b border-border px-4 py-2.5">
              <p className="font-mono text-[10px] font-semibold uppercase tracking-widest text-muted">URL 解剖</p>
            </div>
            {/* Visual URL strip */}
            <div className="px-4 pt-4 pb-2 overflow-x-auto">
              <div className="flex items-baseline flex-wrap gap-0 font-mono text-sm leading-none min-w-max">
                {parsed.protocol && (
                  <span className="text-teal">{parsed.protocol}</span>
                )}
                <span className="text-border">://</span>
                {parsed.username && (
                  <>
                    <span className="text-amber-400">{parsed.username}</span>
                    {parsed.password && <><span className="text-border">:</span><span className="text-orange-400">{parsed.password}</span></>}
                    <span className="text-border">@</span>
                  </>
                )}
                <span className="text-blue-400">{parsed.host}</span>
                <span className="text-violet-400">{parsed.pathname}</span>
                {parsed.search && <span className="text-emerald-400">{decoded ? (() => { try { return decodeURIComponent(parsed.search) } catch { return parsed.search } })() : parsed.search}</span>}
                {parsed.hash && <><span className="text-border">#</span><span className="text-pink-400">{parsed.hash}</span></>}
              </div>
            </div>
            {/* Legend rows */}
            <div className="divide-y divide-border/40 px-4 pb-2">
              {PART_DEFS.map(({ key, label, color, bg, dot }) => {
                const raw = parsed[key]
                if (!raw) return null
                const display = decoded && (key === 'search' || key === 'hash')
                  ? (() => { try { return decodeURIComponent(raw) } catch { return raw } })()
                  : raw
                return (
                  <div key={key} className="flex items-center gap-3 py-2">
                    <div className="flex items-center gap-1.5 w-24 shrink-0">
                      <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${dot}`} />
                      <span className={`font-mono text-[10px] ${color}`}>{label}</span>
                    </div>
                    <span className={`flex-1 rounded border px-2 py-0.5 font-mono text-xs break-all ${bg} ${color}`}>
                      {display}
                    </span>
                    <CopyButton text={raw} />
                  </div>
                )
              })}
            </div>
          </div>

          {/* Query Params editor */}
          <div className="rounded-lg border border-border bg-[#070d1a] overflow-hidden">
            <div className="border-b border-border px-4 py-2.5 flex items-center justify-between gap-2">
              <p className="font-mono text-[10px] font-semibold uppercase tracking-widest text-muted">
                クエリパラメータ
                {params.length > 0 && (
                  <span className="ml-2 rounded bg-emerald-400/15 px-1.5 py-0.5 text-emerald-400">{params.length}</span>
                )}
              </p>
              <button
                onClick={() => setDecoded((v) => !v)}
                className={`rounded border px-2.5 py-1 font-mono text-[10px] transition-colors ${
                  decoded
                    ? 'border-teal/40 bg-teal/10 text-teal'
                    : 'border-border text-dim hover:border-teal/40 hover:text-teal'
                }`}
              >
                {decoded ? 'デコード' : 'エンコード'}
              </button>
            </div>
            <div className="p-4 flex flex-col gap-2">
              {params.length === 0 && (
                <p className="text-xs text-border italic">クエリパラメータなし</p>
              )}
              {params.map((p, i) => (
                <div key={p.id} className="flex items-center gap-2">
                  <span className="shrink-0 font-mono text-[10px] text-border w-4 text-right">{i + 1}</span>
                  <input
                    type="text"
                    value={decoded ? (() => { try { return decodeURIComponent(p.key) } catch { return p.key } })() : p.key}
                    onChange={(e) => updateParam(p.id, 'key', decoded ? encodeURIComponent(e.target.value) : e.target.value)}
                    placeholder="key"
                    className={inputCls + ' flex-1 text-emerald-300'}
                  />
                  <span className="text-border font-mono text-xs">=</span>
                  <input
                    type="text"
                    value={dv(p.value)}
                    onChange={(e) => updateParam(p.id, 'value', decoded ? encodeURIComponent(e.target.value) : e.target.value)}
                    placeholder="value"
                    className={inputCls + ' flex-1'}
                  />
                  <button
                    onClick={() => removeParam(p.id)}
                    className="shrink-0 h-7 w-7 flex items-center justify-center rounded border border-border/50 font-mono text-xs text-dim transition-colors hover:border-red-400/50 hover:text-red-400"
                    title="削除"
                  >
                    ×
                  </button>
                </div>
              ))}
              <button
                onClick={addParam}
                className="mt-1 rounded border border-dashed border-border/60 py-2 text-xs text-muted transition-colors hover:border-teal/50 hover:text-teal"
              >
                ＋ パラメータを追加
              </button>
            </div>
          </div>

          {/* Full URL output */}
          <div className="rounded-lg border border-teal/20 bg-teal/5 overflow-hidden">
            <div className="border-b border-teal/20 px-4 py-2.5 flex items-center justify-between">
              <p className="font-mono text-[10px] font-semibold uppercase tracking-widest text-teal/70">完全 URL</p>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(fullUrl).then(() => {
                    setCopiedFull(true)
                    setTimeout(() => setCopiedFull(false), 1500)
                  })
                }}
                disabled={!fullUrl}
                className={`rounded border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-30 ${
                  copiedFull ? 'border-teal/50 text-teal' : 'border-teal/30 text-teal/70 hover:border-teal hover:text-teal'
                }`}
              >
                {copiedFull ? '✓ コピー済み' : 'コピー'}
              </button>
            </div>
            <div className="px-4 py-3">
              <p className="font-mono text-xs text-teal/90 break-all leading-relaxed">{fullUrl || '—'}</p>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
