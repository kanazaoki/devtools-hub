'use client'

import { useState, useMemo } from 'react'

interface ParsedCurl {
  method: string
  url: string
  headers: Record<string, string>
  body: string | null
  user: string | null
  cookies: Record<string, string>
  insecure: boolean
}

function parseCurl(input: string): ParsedCurl | null {
  const trimmed = input.trim()
  if (!trimmed.startsWith('curl ') && !trimmed.startsWith("curl\n")) return null

  const joined = trimmed.replace(/\\\n\s*/g, ' ')

  const tokens: string[] = []
  const re = /(?:[^\s"']+|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')+/g
  let m: RegExpExecArray | null
  while ((m = re.exec(joined)) !== null) tokens.push(m[0])

  const strip = (s: string) => s.replace(/^['"]|['"]$/g, '')

  const result: ParsedCurl = {
    method: 'GET',
    url: '',
    headers: {},
    body: null,
    user: null,
    cookies: {},
    insecure: false,
  }

  let i = 1
  while (i < tokens.length) {
    const t = tokens[i]
    if (t === '-X' || t === '--request') {
      result.method = strip(tokens[++i] ?? 'GET').toUpperCase()
    } else if (t === '-H' || t === '--header') {
      const raw = strip(tokens[++i] ?? '')
      const colon = raw.indexOf(':')
      if (colon > -1) {
        result.headers[raw.slice(0, colon).trim()] = raw.slice(colon + 1).trim()
      }
    } else if (t === '-d' || t === '--data' || t === '--data-raw' || t === '--data-ascii') {
      result.body = strip(tokens[++i] ?? '')
      if (result.method === 'GET') result.method = 'POST'
    } else if (t === '--data-urlencode') {
      const raw = strip(tokens[++i] ?? '')
      result.body = result.body ? result.body + '&' + raw : raw
      if (result.method === 'GET') result.method = 'POST'
    } else if (t === '-u' || t === '--user') {
      result.user = strip(tokens[++i] ?? '')
    } else if (t === '-b' || t === '--cookie') {
      const raw = strip(tokens[++i] ?? '')
      raw.split(';').forEach((pair) => {
        const [k, v = ''] = pair.trim().split('=')
        if (k) result.cookies[k.trim()] = v.trim()
      })
    } else if (t === '-k' || t === '--insecure') {
      result.insecure = true
    } else if (t === '--compressed' || t === '-s' || t === '--silent' || t === '-L' || t === '--location') {
      // no-op
    } else if (!t.startsWith('-')) {
      if (!result.url) result.url = strip(t)
    }
    i++
  }

  if (!result.url) return null
  return result
}

function toFetch(p: ParsedCurl): string {
  const headers: Record<string, string> = { ...p.headers }
  if (p.user) headers['Authorization'] = `Basic ${btoa(p.user)}`
  if (Object.keys(p.cookies).length) {
    headers['Cookie'] = Object.entries(p.cookies).map(([k, v]) => `${k}=${v}`).join('; ')
  }
  const lines: string[] = [`fetch('${p.url}', {`]
  if (p.method !== 'GET') lines.push(`  method: '${p.method}',`)
  if (Object.keys(headers).length) {
    lines.push('  headers: {')
    Object.entries(headers).forEach(([k, v]) => lines.push(`    '${k}': '${v}',`))
    lines.push('  },')
  }
  if (p.body !== null) lines.push(`  body: '${p.body.replace(/'/g, "\\'")}',`)
  lines.push('})')
  lines.push("  .then(res => res.json())")
  lines.push("  .then(data => console.log(data))")
  lines.push("  .catch(err => console.error(err))")
  return lines.join('\n')
}

function toAxios(p: ParsedCurl): string {
  const headers: Record<string, string> = { ...p.headers }
  if (p.user) headers['Authorization'] = `Basic ${btoa(p.user)}`
  if (Object.keys(p.cookies).length) {
    headers['Cookie'] = Object.entries(p.cookies).map(([k, v]) => `${k}=${v}`).join('; ')
  }
  const lines: string[] = ['axios({']
  lines.push(`  method: '${p.method.toLowerCase()}',`)
  lines.push(`  url: '${p.url}',`)
  if (Object.keys(headers).length) {
    lines.push('  headers: {')
    Object.entries(headers).forEach(([k, v]) => lines.push(`    '${k}': '${v}',`))
    lines.push('  },')
  }
  if (p.body !== null) lines.push(`  data: '${p.body.replace(/'/g, "\\'")}',`)
  lines.push('})')
  lines.push("  .then(res => console.log(res.data))")
  lines.push("  .catch(err => console.error(err))")
  return lines.join('\n')
}

function toPython(p: ParsedCurl): string {
  const headers: Record<string, string> = { ...p.headers }
  if (p.user) headers['Authorization'] = `Basic ${btoa(p.user)}`
  const lines: string[] = ['import requests', '']
  if (Object.keys(headers).length) {
    lines.push('headers = {')
    Object.entries(headers).forEach(([k, v]) => lines.push(`    '${k}': '${v}',`))
    lines.push('}')
    lines.push('')
  }
  if (Object.keys(p.cookies).length) {
    lines.push('cookies = {')
    Object.entries(p.cookies).forEach(([k, v]) => lines.push(`    '${k}': '${v}',`))
    lines.push('}')
    lines.push('')
  }
  const method = p.method.toLowerCase()
  const args: string[] = [`'${p.url}'`]
  if (Object.keys(headers).length) args.push('headers=headers')
  if (Object.keys(p.cookies).length) args.push('cookies=cookies')
  if (p.body !== null) args.push(`data='${p.body.replace(/'/g, "\\'")}'`)
  if (p.insecure) args.push('verify=False')
  lines.push(`response = requests.${method}(`)
  args.forEach((a, idx) => lines.push(`    ${a}${idx < args.length - 1 ? ',' : ''}`))
  lines.push(')')
  lines.push('print(response.json())')
  return lines.join('\n')
}

function toHttpie(p: ParsedCurl): string {
  const parts: string[] = ['http']
  if (p.insecure) parts.push('--verify=no')
  if (p.method !== 'GET') parts.push(p.method)
  parts.push(`'${p.url}'`)
  if (p.user) parts.push(`--auth '${p.user}'`)
  Object.entries(p.headers).forEach(([k, v]) => parts.push(`'${k}:${v}'`))
  Object.entries(p.cookies).forEach(([k, v]) => parts.push(`Cookie:'${k}=${v}'`))
  if (p.body !== null) parts.push(`<<<'${p.body.replace(/'/g, "\\'")}'`)
  return parts.join(' \\\n  ')
}

const SAMPLE = `curl 'https://api.example.com/users' \\
  -H 'Authorization: Bearer YOUR_TOKEN' \\
  -H 'Content-Type: application/json'`

const TABS = ['fetch', 'axios', 'Python requests', 'HTTPie'] as const
type Tab = (typeof TABS)[number]

export function CurlToCode() {
  const [input, setInput] = useState(SAMPLE)
  const [activeTab, setActiveTab] = useState<Tab>('fetch')
  const [copied, setCopied] = useState(false)

  const parsed = useMemo(() => parseCurl(input), [input])

  const output = useMemo(() => {
    if (!parsed) return null
    switch (activeTab) {
      case 'fetch': return toFetch(parsed)
      case 'axios': return toAxios(parsed)
      case 'Python requests': return toPython(parsed)
      case 'HTTPie': return toHttpie(parsed)
    }
  }, [parsed, activeTab])

  const copy = async () => {
    if (!output) return
    await navigator.clipboard.writeText(output)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Input */}
      <div className="flex flex-col gap-2">
        <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--muted)]">cURL コマンド</span>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          spellCheck={false}
          rows={5}
          placeholder={SAMPLE}
          className="w-full resize-y rounded border border-[var(--border)] bg-[var(--bg)] p-3 font-mono text-sm text-[var(--primary)] outline-none transition-colors focus:border-[var(--teal)]"
        />
        {input.trim() && !parsed && (
          <p className="font-mono text-xs text-red-400">
            有効な cURL コマンドを入力してください（<span className="text-[var(--dim)]">curl</span> で始まり URL を含む）
          </p>
        )}
      </div>

      {/* Output */}
      {parsed && output && (
        <div className="flex flex-col gap-3">
          {/* Tab bar */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex gap-1">
              {TABS.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`rounded px-3 py-1 font-mono text-xs transition-colors ${
                    activeTab === tab
                      ? 'bg-[var(--teal)] text-[var(--bg)] font-semibold'
                      : 'border border-[var(--border)] text-[var(--dim)] hover:border-[var(--teal)] hover:text-[var(--teal)]'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
            <button
              onClick={copy}
              className="rounded border border-[var(--border)] px-2.5 py-0.5 font-mono text-xs text-[var(--dim)] transition-colors hover:border-[var(--teal)] hover:text-[var(--teal)]"
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>

          <div className="relative overflow-hidden rounded border border-[var(--border)] bg-[var(--bg)]">
            <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[var(--teal)] opacity-30 rounded-l" />
            <pre className="overflow-x-auto p-4 pl-5 font-mono text-sm text-[var(--primary)] leading-relaxed">
              {output}
            </pre>
          </div>
        </div>
      )}
    </div>
  )
}
