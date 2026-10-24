'use client'

import { useState, useMemo } from 'react'
import { basicAuth, parseCurl, type ParsedCurl } from '@/lib/curlParse'

// ⚠ 以前は値を '...' にそのまま埋め込んでいたので、改行を含む JSON の本文や ' を含む値でコードが壊れていた。
// JavaScript と Python の文字列は JSON.stringify で作る（どちらの言語でも正しい文字列リテラルになる）
const js = (s: string) => JSON.stringify(s)
const py = (s: string) => JSON.stringify(s)
const sh = (s: string) => `'${s.replace(/'/g, `'\\''`)}'`

function allHeaders(p: ParsedCurl): [string, string][] {
  const h = [...p.headers]
  if (p.user) h.push(['Authorization', `Basic ${basicAuth(p.user)}`])
  if (p.cookies) h.push(['Cookie', p.cookies])
  // フォームのときは Content-Type をライブラリに任せる（境界の文字列が必要なため）
  return p.form.length ? h.filter(([k]) => k.toLowerCase() !== 'content-type') : h
}

const isJson = (p: ParsedCurl) => p.headers.some(([k, v]) => k.toLowerCase() === 'content-type' && /json/i.test(v))
const wantsJson = (p: ParsedCurl) => isJson(p) || p.headers.some(([k, v]) => k.toLowerCase() === 'accept' && /json/i.test(v))

function toFetch(p: ParsedCurl): string {
  const lines: string[] = []
  if (p.form.length) {
    lines.push('const form = new FormData()')
    for (const [k, v] of p.form) {
      lines.push(v.startsWith('@')
        ? `form.append(${js(k)}, fileInput.files[0]) // ${v.slice(1)} を選ばせる <input type="file"> から`
        : `form.append(${js(k)}, ${js(v)})`)
    }
    lines.push('')
  }
  lines.push(`fetch(${js(p.url)}, {`)
  if (p.method !== 'GET') lines.push(`  method: ${js(p.method)},`)
  const h = allHeaders(p)
  if (h.length) {
    lines.push('  headers: {')
    h.forEach(([k, v]) => lines.push(`    ${js(k)}: ${js(v)},`))
    lines.push('  },')
  }
  if (p.form.length) lines.push('  body: form,')
  else if (p.body !== null) lines.push(`  body: ${js(p.body)},`)
  lines.push('})')
  lines.push(wantsJson(p) ? '  .then((res) => res.json())' : '  .then((res) => res.text())')
  lines.push('  .then((data) => console.log(data))')
  lines.push('  .catch((err) => console.error(err))')
  if (p.insecure) lines.push('// ⚠ -k（証明書の検証をしない）はブラウザの fetch では指定できません')
  return lines.join('\n')
}

function toAxios(p: ParsedCurl): string {
  const lines: string[] = []
  if (p.form.length) {
    lines.push('const form = new FormData()')
    for (const [k, v] of p.form) lines.push(v.startsWith('@') ? `form.append(${js(k)}, fileInput.files[0]) // ${v.slice(1)}` : `form.append(${js(k)}, ${js(v)})`)
    lines.push('')
  }
  lines.push('axios({')
  lines.push(`  method: ${js(p.method.toLowerCase())},`)
  lines.push(`  url: ${js(p.url)},`)
  const h = allHeaders(p)
  if (h.length) {
    lines.push('  headers: {')
    h.forEach(([k, v]) => lines.push(`    ${js(k)}: ${js(v)},`))
    lines.push('  },')
  }
  if (p.form.length) lines.push('  data: form,')
  else if (p.body !== null) lines.push(`  data: ${js(p.body)},`)
  lines.push('})')
  lines.push('  .then((res) => console.log(res.data))')
  lines.push('  .catch((err) => console.error(err))')
  return lines.join('\n')
}

function toPython(p: ParsedCurl): string {
  const lines: string[] = ['import requests', '']
  const h = allHeaders(p).filter(([k]) => k !== 'Authorization' || !p.user)
  if (h.length) {
    lines.push('headers = {')
    h.forEach(([k, v]) => lines.push(`    ${py(k)}: ${py(v)},`))
    lines.push('}', '')
  }
  const args: string[] = [py(p.url)]
  if (h.length) args.push('headers=headers')
  if (p.user) {
    const i = p.user.indexOf(':')
    args.push(`auth=(${py(i < 0 ? p.user : p.user.slice(0, i))}, ${py(i < 0 ? '' : p.user.slice(i + 1))})`)
  }
  if (p.form.length) {
    const files = p.form.filter(([, v]) => v.startsWith('@'))
    const fields = p.form.filter(([, v]) => !v.startsWith('@'))
    if (fields.length) args.push(`data={${fields.map(([k, v]) => `${py(k)}: ${py(v)}`).join(', ')}}`)
    if (files.length) args.push(`files={${files.map(([k, v]) => `${py(k)}: open(${py(v.slice(1))}, "rb")`).join(', ')}}`)
  } else if (p.body !== null) {
    // 本文はバイト列のまま送る（data= に文字列を渡すと、そのまま本文になる）
    args.push(`data=${py(p.body)}.encode("utf-8")`)
  }
  if (p.insecure) args.push('verify=False')
  lines.push(`response = requests.request(`)
  lines.push(`    ${py(p.method)},`)
  args.forEach((a, idx) => lines.push(`    ${a}${idx < args.length - 1 ? ',' : ''}`))
  lines.push(')')
  lines.push(wantsJson(p) ? 'print(response.json())' : 'print(response.text)')
  return lines.join('\n')
}

function toHttpie(p: ParsedCurl): string {
  const parts: string[] = ['http']
  if (p.insecure) parts.push('--verify=no')
  if (p.form.length) parts.push('--multipart')
  parts.push(p.method, sh(p.url))
  if (p.user) parts.push(`--auth ${sh(p.user)}`)
  p.headers.forEach(([k, v]) => parts.push(sh(`${k}:${v}`)))
  if (p.cookies) parts.push(sh(`Cookie:${p.cookies}`))
  p.form.forEach(([k, v]) => parts.push(sh(v.startsWith('@') ? `${k}@${v.slice(1)}` : `${k}=${v}`)))
  let cmd = parts.join(' \\\n  ')
  if (!p.form.length && p.body !== null) cmd = `printf '%s' ${sh(p.body)} | ${cmd}`
  return cmd
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
        {parsed && parsed.ignored.length > 0 && (
          <p className="font-mono text-xs text-amber-300">⚠ 変換に反映していないオプション：{parsed.ignored.join('、')}</p>
        )}
        <p className="font-mono text-[10px] text-[var(--muted)]">
          bash の引用符（'…'・"…"・$'…'）と、Windows のコマンドプロンプト用（^ で続ける形）の両方を読めます。ブラウザの開発者ツールの「Copy as cURL」をそのまま貼り付けられます。
        </p>
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
