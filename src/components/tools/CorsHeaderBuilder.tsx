'use client'

import { useState, useMemo, useCallback } from 'react'

const ALL_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'] as const
type OutputFormat = 'headers' | 'nginx' | 'express' | 'nextjs'

interface Config {
  origins: string
  methods: string[]
  allowHeaders: string
  exposeHeaders: string
  credentials: boolean
  maxAge: string
}

function parseList(s: string): string[] {
  return s
    .split(/[\n,]/)
    .map((x) => x.trim())
    .filter(Boolean)
}

function originValue(c: Config): string {
  if (c.origins.trim() === '*') return '*'
  return parseList(c.origins)[0] ?? ''
}

function headerList(raw: string): string {
  return raw.trim() === '*' ? '*' : parseList(raw).join(', ')
}

function buildHeaders(c: Config): string {
  const lines: string[] = []
  const origin = originValue(c)
  if (origin) lines.push(`Access-Control-Allow-Origin: ${origin}`)
  if (c.methods.length) lines.push(`Access-Control-Allow-Methods: ${c.methods.join(', ')}`)
  if (c.allowHeaders.trim()) lines.push(`Access-Control-Allow-Headers: ${headerList(c.allowHeaders)}`)
  if (c.exposeHeaders.trim()) lines.push(`Access-Control-Expose-Headers: ${headerList(c.exposeHeaders)}`)
  if (c.credentials) lines.push('Access-Control-Allow-Credentials: true')
  if (c.maxAge.trim()) lines.push(`Access-Control-Max-Age: ${c.maxAge.trim()}`)
  return lines.join('\n')
}

function buildNginx(c: Config): string {
  const origin = originValue(c)
  const l: string[] = []
  if (origin) l.push(`add_header 'Access-Control-Allow-Origin' '${origin}' always;`)
  if (c.methods.length) l.push(`add_header 'Access-Control-Allow-Methods' '${c.methods.join(', ')}' always;`)
  if (c.allowHeaders.trim()) l.push(`add_header 'Access-Control-Allow-Headers' '${headerList(c.allowHeaders)}' always;`)
  if (c.exposeHeaders.trim()) l.push(`add_header 'Access-Control-Expose-Headers' '${headerList(c.exposeHeaders)}' always;`)
  if (c.credentials) l.push(`add_header 'Access-Control-Allow-Credentials' 'true' always;`)
  if (c.maxAge.trim()) l.push(`add_header 'Access-Control-Max-Age' '${c.maxAge.trim()}' always;`)
  const body = l.map((x) => '    ' + x).join('\n')
  return `location / {\n${body}\n\n    # プリフライト（OPTIONS）は即 204 を返す\n    if ($request_method = 'OPTIONS') {\n        return 204;\n    }\n}`
}

function buildExpress(c: Config): string {
  const list = parseList(c.origins)
  const originExpr =
    c.origins.trim() === '*'
      ? `'*'`
      : list.length <= 1
        ? `'${list[0] ?? ''}'`
        : `[${list.map((o) => `'${o}'`).join(', ')}]`
  const parts: string[] = [`  origin: ${originExpr},`]
  if (c.methods.length) parts.push(`  methods: [${c.methods.map((m) => `'${m}'`).join(', ')}],`)
  if (c.allowHeaders.trim() && c.allowHeaders.trim() !== '*') {
    parts.push(`  allowedHeaders: [${parseList(c.allowHeaders).map((h) => `'${h}'`).join(', ')}],`)
  }
  if (c.exposeHeaders.trim() && c.exposeHeaders.trim() !== '*') {
    parts.push(`  exposedHeaders: [${parseList(c.exposeHeaders).map((h) => `'${h}'`).join(', ')}],`)
  }
  if (c.credentials) parts.push(`  credentials: true,`)
  if (c.maxAge.trim()) parts.push(`  maxAge: ${c.maxAge.trim()},`)
  return `import cors from 'cors'\n\n// 複数オリジンは配列で渡すと、一致した Origin だけ反映されます\napp.use(cors({\n${parts.join('\n')}\n}))`
}

function buildNextjs(c: Config): string {
  const origin = originValue(c)
  const entries: string[] = []
  if (origin) entries.push(`{ key: 'Access-Control-Allow-Origin', value: '${origin}' }`)
  if (c.methods.length) entries.push(`{ key: 'Access-Control-Allow-Methods', value: '${c.methods.join(', ')}' }`)
  if (c.allowHeaders.trim()) entries.push(`{ key: 'Access-Control-Allow-Headers', value: '${headerList(c.allowHeaders)}' }`)
  if (c.exposeHeaders.trim()) entries.push(`{ key: 'Access-Control-Expose-Headers', value: '${headerList(c.exposeHeaders)}' }`)
  if (c.credentials) entries.push(`{ key: 'Access-Control-Allow-Credentials', value: 'true' }`)
  if (c.maxAge.trim()) entries.push(`{ key: 'Access-Control-Max-Age', value: '${c.maxAge.trim()}' }`)
  const headers = entries.map((e) => '          ' + e + ',').join('\n')
  return `// next.config.js\nmodule.exports = {\n  async headers() {\n    return [\n      {\n        source: '/api/:path*',\n        headers: [\n${headers}\n        ],\n      },\n    ]\n  },\n}`
}

function buildOutput(c: Config, fmt: OutputFormat): string {
  switch (fmt) {
    case 'nginx':
      return buildNginx(c)
    case 'express':
      return buildExpress(c)
    case 'nextjs':
      return buildNextjs(c)
    default:
      return buildHeaders(c)
  }
}

function getWarnings(c: Config): string[] {
  const w: string[] = []
  const isWildcard = c.origins.trim() === '*'
  const multi = parseList(c.origins).length > 1
  if (c.credentials && isWildcard) {
    w.push('credentials:true と Access-Control-Allow-Origin: * は併用できません（ブラウザが拒否）。具体的なオリジンを指定してください。')
  }
  if (c.credentials && c.allowHeaders.trim() === '*') {
    w.push('credentials:true のとき Access-Control-Allow-Headers に * は使えません。許可ヘッダーを明示してください。')
  }
  if (c.credentials && c.exposeHeaders.trim() === '*') {
    w.push('credentials:true のとき Access-Control-Expose-Headers に * は使えません。')
  }
  if (multi && !isWildcard) {
    w.push('Access-Control-Allow-Origin は単一値か * のみ有効です。複数オリジンを許可するには、リクエストの Origin を許可リストと照合して動的に返す必要があります（Express の設定はこの形で生成しています）。')
  }
  if (c.methods.length && !c.methods.includes('OPTIONS')) {
    w.push('プリフライト対応のため、許可メソッドに OPTIONS を含めることを推奨します。')
  }
  return w
}

const FORMAT_LABELS: Record<OutputFormat, string> = {
  headers: 'Headers',
  nginx: 'nginx',
  express: 'Express',
  nextjs: 'Next.js',
}

const OUTPUT_EXT: Record<OutputFormat, string> = {
  headers: 'txt',
  nginx: 'conf',
  express: 'js',
  nextjs: 'js',
}

export function CorsHeaderBuilder() {
  const [config, setConfig] = useState<Config>({
    origins: 'https://app.example.com',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: 'Content-Type, Authorization',
    exposeHeaders: '',
    credentials: false,
    maxAge: '86400',
  })
  const [format, setFormat] = useState<OutputFormat>('headers')
  const [copied, setCopied] = useState(false)

  const output = useMemo(() => buildOutput(config, format), [config, format])
  const warnings = useMemo(() => getWarnings(config), [config])

  const set = <K extends keyof Config>(key: K, value: Config[K]) =>
    setConfig((c) => ({ ...c, [key]: value }))

  const toggleMethod = (m: string) =>
    setConfig((c) => ({
      ...c,
      methods: c.methods.includes(m) ? c.methods.filter((x) => x !== m) : [...c.methods, m],
    }))

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(output).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }, [output])

  return (
    <div className="space-y-4">
      {/* Config */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Allowed origins */}
        <div>
          <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-widest text-muted">
            許可するオリジン（1行1つ、または *）
          </label>
          <textarea
            value={config.origins}
            onChange={(e) => set('origins', e.target.value)}
            data-testid="origins-input"
            rows={3}
            spellCheck={false}
            placeholder={'https://app.example.com\nhttps://admin.example.com'}
            className="w-full resize-none rounded border border-border bg-bg p-3 font-mono text-xs leading-relaxed text-primary placeholder:text-muted/25 focus:border-teal/40 focus:outline-none"
          />
        </div>

        {/* Allowed headers */}
        <div className="flex flex-col gap-4">
          <div>
            <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-widest text-muted">
              許可するヘッダー（Allow-Headers）
            </label>
            <input
              type="text"
              value={config.allowHeaders}
              onChange={(e) => set('allowHeaders', e.target.value)}
              data-testid="allow-headers-input"
              spellCheck={false}
              placeholder="Content-Type, Authorization"
              className="w-full rounded border border-border bg-bg px-3 py-2 font-mono text-xs text-primary placeholder:text-muted/25 focus:border-teal/40 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-widest text-muted">
              公開するヘッダー（Expose-Headers・任意）
            </label>
            <input
              type="text"
              value={config.exposeHeaders}
              onChange={(e) => set('exposeHeaders', e.target.value)}
              spellCheck={false}
              placeholder="X-Total-Count, Link"
              className="w-full rounded border border-border bg-bg px-3 py-2 font-mono text-xs text-primary placeholder:text-muted/25 focus:border-teal/40 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Methods */}
      <div>
        <label className="mb-2 block font-mono text-[10px] uppercase tracking-widest text-muted">
          許可するメソッド
        </label>
        <div className="flex flex-wrap gap-2">
          {ALL_METHODS.map((m) => {
            const on = config.methods.includes(m)
            return (
              <button
                key={m}
                type="button"
                onClick={() => toggleMethod(m)}
                data-testid={`method-${m}`}
                className={`rounded border px-3 py-1.5 font-mono text-[11px] font-medium transition-all duration-150 ${
                  on
                    ? 'border-teal/50 bg-teal/10 text-teal'
                    : 'border-border bg-surface text-muted hover:border-border-hi hover:text-dim'
                }`}
              >
                {on ? '✓ ' : ''}
                {m}
              </button>
            )
          })}
        </div>
      </div>

      {/* Credentials + max-age */}
      <div className="flex flex-wrap items-end gap-4">
        <button
          type="button"
          onClick={() => set('credentials', !config.credentials)}
          data-testid="credentials-toggle"
          className={`rounded border px-3 py-1.5 font-mono text-[11px] transition-all duration-150 ${
            config.credentials
              ? 'border-teal/50 bg-teal/10 text-teal'
              : 'border-border bg-surface text-muted hover:border-border-hi hover:text-dim'
          }`}
        >
          {config.credentials ? '✓ ' : ''}Cookie・認証情報を許可（Allow-Credentials）
        </button>
        <div>
          <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-widest text-muted">
            プリフライトのキャッシュ秒数（Max-Age）
          </label>
          <input
            type="text"
            inputMode="numeric"
            value={config.maxAge}
            onChange={(e) => set('maxAge', e.target.value.replace(/[^0-9]/g, ''))}
            className="w-32 rounded border border-border bg-bg px-3 py-2 font-mono text-xs text-primary focus:border-teal/40 focus:outline-none"
          />
        </div>
      </div>

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="rounded border border-amber-500/30 bg-amber-500/5 p-3" data-testid="warnings">
          <p className="mb-1.5 font-mono text-[10px] uppercase tracking-widest text-amber-400">⚠ 設定の注意</p>
          <ul className="space-y-1">
            {warnings.map((w) => (
              <li key={w} className="text-[11px] leading-relaxed text-amber-200/80">
                ・{w}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Output */}
      <div className="overflow-hidden rounded border border-border">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-surface px-3 py-2">
          <div className="inline-flex overflow-hidden rounded border border-border" role="group" aria-label="出力形式">
            {(Object.keys(FORMAT_LABELS) as OutputFormat[]).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFormat(f)}
                data-testid={`format-${f}`}
                className={`px-3 py-1 font-mono text-[10px] font-bold tracking-wide transition-colors duration-100 ${
                  format === f ? 'bg-teal/15 text-teal' : 'bg-surface text-muted hover:text-dim'
                }`}
              >
                {FORMAT_LABELS[f]}
              </button>
            ))}
          </div>
          <button
            onClick={handleCopy}
            disabled={!output}
            data-testid="copy-button"
            className={`rounded px-2.5 py-1 font-mono text-[9px] font-medium transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-30 ${
              copied ? 'bg-teal/20 text-teal' : 'bg-surface-hi text-muted hover:bg-teal/10 hover:text-teal'
            }`}
          >
            {copied ? '✓ Copied!' : `Copy .${OUTPUT_EXT[format]}`}
          </button>
        </div>
        <textarea
          value={output}
          readOnly
          data-testid="output-area"
          rows={12}
          className="w-full resize-none bg-bg/70 p-4 font-mono text-xs leading-relaxed text-teal/80 focus:outline-none"
        />
      </div>

      <p className="font-mono text-[10px] leading-relaxed text-muted/50">
        CORS はブラウザ側の制限で、サーバーが返すレスポンスヘッダーで許可を伝えます。非シンプルリクエストは事前に OPTIONS（プリフライト）が飛ぶため、OPTIONS への応答も同じヘッダーを返す必要があります。処理はすべてブラウザ内で完結します。
      </p>
    </div>
  )
}
