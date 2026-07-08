'use client'

import { useState, useMemo } from 'react'

type OutputTab = 'curl' | 'fetch' | 'raw'
type BodyType = 'json' | 'html' | 'text' | 'none'

const STATUS_PRESETS: { code: number; text: string }[] = [
  { code: 200, text: 'OK' },
  { code: 201, text: 'Created' },
  { code: 204, text: 'No Content' },
  { code: 301, text: 'Moved Permanently' },
  { code: 302, text: 'Found' },
  { code: 400, text: 'Bad Request' },
  { code: 401, text: 'Unauthorized' },
  { code: 403, text: 'Forbidden' },
  { code: 404, text: 'Not Found' },
  { code: 422, text: 'Unprocessable Entity' },
  { code: 429, text: 'Too Many Requests' },
  { code: 500, text: 'Internal Server Error' },
  { code: 502, text: 'Bad Gateway' },
  { code: 503, text: 'Service Unavailable' },
]

const STATUS_TEXT_MAP = Object.fromEntries(STATUS_PRESETS.map(s => [s.code, s.text]))

const CONTENT_TYPE_PRESETS: Record<BodyType, string> = {
  json: 'application/json',
  html: 'text/html; charset=utf-8',
  text: 'text/plain; charset=utf-8',
  none: '',
}

interface Header { id: number; key: string; value: string }

function buildCurl(status: number, statusText: string, headers: Header[], body: string): string {
  const lines: string[] = []
  lines.push(`HTTP/1.1 ${status} ${statusText}`)
  for (const h of headers) {
    if (h.key.trim()) lines.push(`< ${h.key.trim()}: ${h.value.trim()}`)
  }
  lines.push('<')
  if (body) lines.push(body)
  return `# curl -i レスポンス形式\n${lines.join('\n')}`
}

function buildFetch(status: number, headers: Header[], body: string): string {
  const hdrs: Record<string, string> = {}
  for (const h of headers) {
    if (h.key.trim()) hdrs[h.key.trim()] = h.value.trim()
  }
  return [
    '// fetch モック (例: MSW / テスト用)',
    `new Response(${body ? JSON.stringify(body) : 'null'}, {`,
    `  status: ${status},`,
    `  headers: ${JSON.stringify(hdrs, null, 4).replace(/\n/g, '\n  ')},`,
    '});',
  ].join('\n')
}

function buildRaw(status: number, statusText: string, headers: Header[], body: string): string {
  const lines: string[] = []
  lines.push(`HTTP/1.1 ${status} ${statusText}`)
  for (const h of headers) {
    if (h.key.trim()) lines.push(`${h.key.trim()}: ${h.value.trim()}`)
  }
  lines.push('')
  if (body) lines.push(body)
  return lines.join('\r\n')
}

let nextId = 1

export function HttpResponseMock() {
  const [status, setStatus]         = useState(200)
  const [headers, setHeaders]       = useState<Header[]>([
    { id: nextId++, key: 'Content-Type', value: 'application/json' },
  ])
  const [body, setBody]             = useState('{\n  "message": "OK"\n}')
  const [bodyType, setBodyType]     = useState<BodyType>('json')
  const [tab, setTab]               = useState<OutputTab>('raw')
  const [copied, setCopied]         = useState(false)

  const statusText = STATUS_TEXT_MAP[status] ?? 'Unknown'

  const jsonError = useMemo(() => {
    if (bodyType !== 'json' || !body.trim()) return ''
    try { JSON.parse(body); return '' }
    catch (e) { return `JSON構文エラー: ${(e as Error).message}` }
  }, [body, bodyType])

  const addHeader = () => setHeaders(h => [...h, { id: nextId++, key: '', value: '' }])
  const removeHeader = (id: number) => setHeaders(h => h.filter(x => x.id !== id))
  const updateHeader = (id: number, field: 'key' | 'value', val: string) =>
    setHeaders(h => h.map(x => x.id === id ? { ...x, [field]: val } : x))

  const setContentType = (type: BodyType) => {
    setBodyType(type)
    const ct = CONTENT_TYPE_PRESETS[type]
    if (!ct) return
    setHeaders(h => {
      const existing = h.find(x => x.key.toLowerCase() === 'content-type')
      if (existing) return h.map(x => x.key.toLowerCase() === 'content-type' ? { ...x, value: ct } : x)
      return [...h, { id: nextId++, key: 'Content-Type', value: ct }]
    })
    if (type === 'json' && !body.trim()) setBody('{\n  "message": "OK"\n}')
    if (type === 'html' && !body.trim()) setBody('<html>\n<body><p>Hello</p></body>\n</html>')
  }

  const output = useMemo(() => {
    if (tab === 'curl') return buildCurl(status, statusText, headers, body)
    if (tab === 'fetch') return buildFetch(status, headers, body)
    return buildRaw(status, statusText, headers, body)
  }, [tab, status, statusText, headers, body])

  const copy = async () => {
    await navigator.clipboard.writeText(output)
    setCopied(true); setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        {/* Left: Builder */}
        <div className="space-y-5">
          {/* Status */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-primary">ステータスコード</label>
            <div className="flex gap-2 flex-wrap mb-2">
              {STATUS_PRESETS.slice(0, 7).map(p => (
                <button key={p.code} onClick={() => setStatus(p.code)}
                  className={`rounded px-2.5 py-1 text-xs font-mono transition-colors ${status === p.code ? 'bg-teal text-bg font-bold' : 'border border-border text-dim hover:border-teal'}`}
                >{p.code}</button>
              ))}
            </div>
            <div className="flex gap-2 flex-wrap mb-2">
              {STATUS_PRESETS.slice(7).map(p => (
                <button key={p.code} onClick={() => setStatus(p.code)}
                  className={`rounded px-2.5 py-1 text-xs font-mono transition-colors ${status === p.code ? 'bg-teal text-bg font-bold' : 'border border-border text-dim hover:border-teal'}`}
                >{p.code}</button>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <input type="number" value={status} onChange={e => setStatus(Number(e.target.value))}
                className="w-24 rounded border border-border bg-bg px-2 py-1 font-mono text-sm text-primary focus:border-teal focus:outline-none"
              />
              <span className="text-sm text-muted">{statusText}</span>
            </div>
          </div>

          {/* Headers */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm font-medium text-primary">レスポンスヘッダー</label>
              <button onClick={addHeader} className="text-xs text-teal hover:underline">+ 追加</button>
            </div>
            <div className="mb-2 flex flex-wrap gap-1.5">
              {(['json','html','text'] as BodyType[]).map(t => (
                <button key={t} onClick={() => setContentType(t)}
                  className="rounded border border-border px-2.5 py-1 text-xs text-dim hover:border-teal transition-colors"
                >Content-Type: {CONTENT_TYPE_PRESETS[t].split(';')[0]}</button>
              ))}
            </div>
            <div className="space-y-2">
              {headers.map(h => (
                <div key={h.id} className="flex gap-2">
                  <input value={h.key} onChange={e => updateHeader(h.id, 'key', e.target.value)}
                    placeholder="Key" className="w-1/3 rounded border border-border bg-bg px-2 py-1 font-mono text-xs text-primary focus:border-teal focus:outline-none"
                  />
                  <input value={h.value} onChange={e => updateHeader(h.id, 'value', e.target.value)}
                    placeholder="Value" className="flex-1 rounded border border-border bg-bg px-2 py-1 font-mono text-xs text-primary focus:border-teal focus:outline-none"
                  />
                  <button onClick={() => removeHeader(h.id)} className="text-muted hover:text-red-400 transition-colors">×</button>
                </div>
              ))}
            </div>
          </div>

          {/* Body */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-primary">ボディ</label>
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              rows={6}
              className="w-full resize-y rounded border border-border bg-bg p-3 font-mono text-xs text-primary focus:border-teal focus:outline-none"
              placeholder="レスポンスボディ（省略可）"
            />
            {jsonError && <p className="mt-1 text-xs text-yellow-400">⚠ {jsonError}</p>}
          </div>
        </div>

        {/* Right: Output */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <div className="flex gap-1">
              {(['raw','curl','fetch'] as OutputTab[]).map(t => (
                <button key={t} onClick={() => setTab(t)}
                  className={`rounded px-3 py-1.5 text-xs font-mono transition-colors ${tab === t ? 'bg-teal text-bg font-bold' : 'border border-border text-dim hover:border-teal'}`}
                >{t === 'raw' ? '生HTTP' : t}</button>
              ))}
            </div>
            <button onClick={copy} className="text-xs text-teal hover:underline">
              {copied ? '✓ コピー済み' : 'コピー'}
            </button>
          </div>
          <pre className="h-[420px] w-full overflow-auto rounded border border-border/50 bg-surface p-4 font-mono text-xs text-primary whitespace-pre leading-relaxed">
            {output}
          </pre>
        </div>
      </div>
    </div>
  )
}
