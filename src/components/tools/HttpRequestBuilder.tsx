'use client'

import { useState } from 'react'

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS'
type BodyMode = 'raw' | 'json'
type OutputTab = 'curl' | 'fetch' | 'axios'

interface Header {
  id: number
  key: string
  value: string
}

let nextId = 1

function generateCurl(method: Method, url: string, headers: Header[], body: string, bodyMode: BodyMode): string {
  if (!url) return ''
  const parts = [`curl -X ${method}`]
  for (const h of headers) {
    if (h.key) parts.push(`  -H '${h.key}: ${h.value}'`)
  }
  if (bodyMode === 'json' && body) {
    parts.push(`  -H 'Content-Type: application/json'`)
    parts.push(`  -d '${body.replace(/'/g, "\\'")}'`)
  } else if (body && method !== 'GET' && method !== 'HEAD') {
    parts.push(`  -d '${body.replace(/'/g, "\\'")}'`)
  }
  parts.push(`  '${url}'`)
  return parts.join(' \\\n')
}

function generateFetch(method: Method, url: string, headers: Header[], body: string, bodyMode: BodyMode): string {
  if (!url) return ''
  const headerObj: Record<string, string> = {}
  for (const h of headers) {
    if (h.key) headerObj[h.key] = h.value
  }
  if (bodyMode === 'json' && body) {
    headerObj['Content-Type'] = 'application/json'
  }
  const opts: string[] = [`  method: '${method}'`]
  if (Object.keys(headerObj).length > 0) {
    opts.push(`  headers: ${JSON.stringify(headerObj, null, 2).replace(/^/gm, '  ').trimStart()}`)
  }
  if (body && method !== 'GET' && method !== 'HEAD') {
    opts.push(`  body: ${bodyMode === 'json' ? `JSON.stringify(${body})` : `'${body.replace(/'/g, "\\'")}'`}`)
  }
  return `fetch('${url}', {\n${opts.join(',\n')}\n})\n  .then(res => res.json())\n  .then(data => console.log(data))\n  .catch(err => console.error(err))`
}

function generateAxios(method: Method, url: string, headers: Header[], body: string, bodyMode: BodyMode): string {
  if (!url) return ''
  const headerObj: Record<string, string> = {}
  for (const h of headers) {
    if (h.key) headerObj[h.key] = h.value
  }
  const config: string[] = []
  if (Object.keys(headerObj).length > 0) {
    config.push(`  headers: ${JSON.stringify(headerObj, null, 2).replace(/^/gm, '  ').trimStart()}`)
  }
  const hasBody = body && method !== 'GET' && method !== 'HEAD'
  const methodLower = method.toLowerCase()
  if (hasBody) {
    const bodyArg = bodyMode === 'json' ? body : `'${body.replace(/'/g, "\\'")}'`
    if (config.length > 0) {
      return `axios.${methodLower}(\n  '${url}',\n  ${bodyArg},\n  {\n${config.join(',\n')}\n  }\n)\n  .then(res => console.log(res.data))\n  .catch(err => console.error(err))`
    }
    return `axios.${methodLower}('${url}', ${bodyArg})\n  .then(res => console.log(res.data))\n  .catch(err => console.error(err))`
  }
  if (config.length > 0) {
    return `axios.${methodLower}(\n  '${url}',\n  {\n${config.join(',\n')}\n  }\n)\n  .then(res => console.log(res.data))\n  .catch(err => console.error(err))`
  }
  return `axios.${methodLower}('${url}')\n  .then(res => console.log(res.data))\n  .catch(err => console.error(err))`
}

const METHOD_CONFIG: Record<Method, { color: string; bg: string }> = {
  GET:     { color: 'text-teal',       bg: 'bg-teal/10 border-teal/30' },
  POST:    { color: 'text-green-400',  bg: 'bg-green-400/10 border-green-400/30' },
  PUT:     { color: 'text-yellow-400', bg: 'bg-yellow-400/10 border-yellow-400/30' },
  PATCH:   { color: 'text-orange-400', bg: 'bg-orange-400/10 border-orange-400/30' },
  DELETE:  { color: 'text-red-400',    bg: 'bg-red-400/10 border-red-400/30' },
  HEAD:    { color: 'text-blue-400',   bg: 'bg-blue-400/10 border-blue-400/30' },
  OPTIONS: { color: 'text-purple-400', bg: 'bg-purple-400/10 border-purple-400/30' },
}

const METHODS: Method[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']

export function HttpRequestBuilder() {
  const [method, setMethod] = useState<Method>('GET')
  const [url, setUrl] = useState('')
  const [headers, setHeaders] = useState<Header[]>([{ id: nextId++, key: '', value: '' }])
  const [body, setBody] = useState('')
  const [bodyMode, setBodyMode] = useState<BodyMode>('raw')
  const [activeTab, setActiveTab] = useState<OutputTab>('curl')
  const [copied, setCopied] = useState(false)
  const [jsonError, setJsonError] = useState('')

  const addHeader = () => setHeaders(h => [...h, { id: nextId++, key: '', value: '' }])
  const removeHeader = (id: number) => setHeaders(h => h.filter(x => x.id !== id))
  const updateHeader = (id: number, field: 'key' | 'value', val: string) =>
    setHeaders(h => h.map(x => x.id === id ? { ...x, [field]: val } : x))

  const handleBodyChange = (val: string) => {
    setBody(val)
    if (bodyMode === 'json') {
      try { if (val) JSON.parse(val); setJsonError('') }
      catch { setJsonError('無効なJSON形式です') }
    }
  }

  const handleBodyModeChange = (mode: BodyMode) => {
    setBodyMode(mode)
    setJsonError('')
    if (mode === 'json' && body) {
      try { JSON.parse(body); setJsonError('') }
      catch { setJsonError('無効なJSON形式です') }
    }
  }

  const getOutput = () => {
    if (activeTab === 'curl') return generateCurl(method, url, headers, body, bodyMode)
    if (activeTab === 'fetch') return generateFetch(method, url, headers, body, bodyMode)
    return generateAxios(method, url, headers, body, bodyMode)
  }

  const output = getOutput()

  const handleCopy = async () => {
    if (!output) return
    await navigator.clipboard.writeText(output)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const showBody = method !== 'GET' && method !== 'HEAD'
  const mc = METHOD_CONFIG[method]

  const SectionLabel = ({ children }: { children: React.ReactNode }) => (
    <span className="font-mono text-xs uppercase tracking-widest text-muted">{children}</span>
  )

  return (
    <div className="space-y-5">
      {/* Method + URL bar */}
      <div className="flex overflow-hidden rounded-lg border border-border focus-within:border-teal/60 transition-colors">
        <select
          value={method}
          onChange={e => setMethod(e.target.value as Method)}
          className={`shrink-0 border-r border-border px-3 py-2.5 font-mono text-sm font-bold focus:outline-none cursor-pointer transition-colors ${mc.color} ${mc.bg} bg-transparent`}
          style={{ minWidth: '5.5rem' }}
        >
          {METHODS.map(m => (
            <option key={m} value={m} className="bg-[#14141A] text-[#CCCCE0] font-normal">{m}</option>
          ))}
        </select>
        <input
          type="text"
          value={url}
          onChange={e => setUrl(e.target.value)}
          placeholder="https://api.example.com/users"
          className="flex-1 bg-bg px-4 py-2.5 font-mono text-sm text-primary placeholder:text-muted focus:outline-none"
        />
      </div>

      {/* Headers */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <SectionLabel>Headers</SectionLabel>
          <button
            onClick={addHeader}
            className="flex items-center gap-1 rounded px-2 py-0.5 text-xs text-teal hover:bg-teal/10 transition-colors"
          >
            <span className="text-base leading-none">+</span> 追加
          </button>
        </div>
        <div className="space-y-1.5">
          {headers.map((h, i) => (
            <div key={h.id} className="flex items-center gap-1.5">
              <span className="w-5 shrink-0 text-center font-mono text-xs text-muted">{i + 1}</span>
              <input
                value={h.key}
                onChange={e => updateHeader(h.id, 'key', e.target.value)}
                placeholder="Key"
                className="flex-1 rounded border border-border bg-bg px-3 py-1.5 font-mono text-xs text-primary placeholder:text-muted focus:border-teal/50 focus:outline-none transition-colors"
              />
              <span className="text-muted">:</span>
              <input
                value={h.value}
                onChange={e => updateHeader(h.id, 'value', e.target.value)}
                placeholder="Value"
                className="flex-1 rounded border border-border bg-bg px-3 py-1.5 font-mono text-xs text-primary placeholder:text-muted focus:border-teal/50 focus:outline-none transition-colors"
              />
              <button
                onClick={() => removeHeader(h.id)}
                className="w-6 shrink-0 rounded text-muted hover:text-red-400 transition-colors text-base leading-none"
                aria-label="ヘッダーを削除"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Body */}
      {showBody && (
        <div>
          <div className="mb-2 flex items-center gap-3">
            <SectionLabel>Body</SectionLabel>
            <div className="flex rounded border border-border overflow-hidden">
              {(['raw', 'json'] as BodyMode[]).map(m => (
                <button
                  key={m}
                  onClick={() => handleBodyModeChange(m)}
                  className={`px-3 py-0.5 text-xs font-mono transition-colors ${
                    bodyMode === m
                      ? 'bg-surface-hi text-bright'
                      : 'text-dim hover:text-primary'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
            {bodyMode === 'json' && (
              <span className="text-xs text-muted">JSON は自動バリデーション</span>
            )}
          </div>
          <textarea
            value={body}
            onChange={e => handleBodyChange(e.target.value)}
            placeholder={bodyMode === 'json' ? '{\n  "key": "value"\n}' : 'Request body'}
            rows={4}
            className={`w-full rounded border bg-bg px-3 py-2 font-mono text-sm text-primary placeholder:text-muted focus:outline-none resize-y transition-colors ${
              jsonError ? 'border-red-500/60 focus:border-red-500' : 'border-border focus:border-teal/50'
            }`}
          />
          {jsonError && (
            <p className="mt-1 flex items-center gap-1.5 text-xs text-red-400">
              <span>⚠</span> {jsonError}
            </p>
          )}
        </div>
      )}

      {/* Output */}
      <div className="rounded-lg border border-border overflow-hidden">
        {/* Tab bar */}
        <div className="flex items-center justify-between border-b border-border bg-surface px-2">
          <div className="flex">
            {(['curl', 'fetch', 'axios'] as OutputTab[]).map(t => (
              <button
                key={t}
                onClick={() => setActiveTab(t)}
                className={`px-3 py-2 text-xs font-mono transition-colors relative ${
                  activeTab === t
                    ? 'text-bright after:absolute after:bottom-0 after:left-0 after:right-0 after:h-px after:bg-teal'
                    : 'text-dim hover:text-primary'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <button
            onClick={handleCopy}
            disabled={!output}
            className={`mr-1 flex items-center gap-1.5 rounded px-2.5 py-1 text-xs transition-all ${
              copied
                ? 'text-teal'
                : 'text-dim hover:text-primary disabled:opacity-20 disabled:cursor-not-allowed'
            }`}
          >
            {copied ? (
              <><span>✓</span> コピー済み</>
            ) : (
              <><span className="opacity-60">⎘</span> コピー</>
            )}
          </button>
        </div>
        {/* Code area */}
        <div className="relative bg-[#0a0a0d]">
          <pre className="min-h-[7rem] overflow-x-auto px-5 py-4 font-mono text-xs leading-relaxed text-primary whitespace-pre">
            {output || (
              <span className="text-muted italic">
                {'// URLを入力するとコードが生成されます'}
              </span>
            )}
          </pre>
          {/* Left accent bar */}
          {output && (
            <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-teal/30" />
          )}
        </div>
      </div>
    </div>
  )
}
