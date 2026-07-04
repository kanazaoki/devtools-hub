'use client'

import { useState } from 'react'

// ─── Data ────────────────────────────────────────────────────────────────────

type Category = 'request' | 'response' | 'both'

interface Header {
  name: string
  category: Category
  description: string
  syntax: string
  example: string
  tags: string[]
}

const HEADERS: Header[] = [
  // ── Request ──────────────────────────────────────────────────────────────
  {
    name: 'Accept',
    category: 'request',
    description: 'クライアントが受け入れ可能なコンテンツタイプを指定する。サーバーはこの情報に基づいてレスポンス形式を選択する。',
    syntax: 'Accept: <MIME_type>/<MIME_subtype>, <MIME_type>/*;q=<quality>',
    example: 'Accept: text/html, application/json;q=0.9, */*;q=0.8',
    tags: ['content negotiation'],
  },
  {
    name: 'Accept-Encoding',
    category: 'request',
    description: 'クライアントが対応している圧縮アルゴリズムを指定する。サーバーはレスポンスボディを圧縮して転送量を削減できる。',
    syntax: 'Accept-Encoding: gzip, deflate, br',
    example: 'Accept-Encoding: gzip, deflate, br',
    tags: ['compression'],
  },
  {
    name: 'Accept-Language',
    category: 'request',
    description: '優先する自然言語を指定する。サーバーはこれをもとにローカライズされたコンテンツを返すことができる。',
    syntax: 'Accept-Language: <language>;q=<quality>',
    example: 'Accept-Language: ja, en-US;q=0.9, en;q=0.8',
    tags: ['i18n', 'content negotiation'],
  },
  {
    name: 'Accept-Charset',
    category: 'request',
    description: 'クライアントが受け入れ可能な文字セットを指定する。現在は UTF-8 が事実上の標準となり、省略されることが多い。',
    syntax: 'Accept-Charset: <charset>;q=<quality>',
    example: 'Accept-Charset: utf-8, iso-8859-1;q=0.5',
    tags: ['content negotiation'],
  },
  {
    name: 'Authorization',
    category: 'request',
    description: 'サーバーにクライアントの認証情報を送信する。Bearer トークンや Basic 認証など複数のスキームに対応する。',
    syntax: 'Authorization: <scheme> <credentials>',
    example: 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    tags: ['auth', 'security'],
  },
  {
    name: 'Cookie',
    category: 'request',
    description: 'サーバーが以前に Set-Cookie ヘッダーで設定したクッキーを送信する。セッション管理や状態保持に使われる。',
    syntax: 'Cookie: <name>=<value>; <name2>=<value2>',
    example: 'Cookie: sessionId=abc123; theme=dark',
    tags: ['state', 'session'],
  },
  {
    name: 'Host',
    category: 'request',
    description: 'リクエスト先のサーバーのホスト名とポートを指定する。HTTP/1.1 では必須。仮想ホスティングに不可欠。',
    syntax: 'Host: <host>:<port>',
    example: 'Host: example.com:443',
    tags: ['routing'],
  },
  {
    name: 'If-Modified-Since',
    category: 'request',
    description: '指定した日時以降にリソースが変更されている場合のみレスポンスを返すよう要求する。キャッシュの検証に使用する。',
    syntax: 'If-Modified-Since: <day-name>, <day> <month> <year> <hour>:<minute>:<second> GMT',
    example: 'If-Modified-Since: Fri, 01 Jan 2025 00:00:00 GMT',
    tags: ['cache', 'conditional'],
  },
  {
    name: 'If-None-Match',
    category: 'request',
    description: '指定した ETag と一致しない場合のみレスポンスを返すよう要求する。ETag ベースのキャッシュ検証に使用する。',
    syntax: 'If-None-Match: "<etag_value>"',
    example: 'If-None-Match: "686897696a7c876b7e"',
    tags: ['cache', 'conditional'],
  },
  {
    name: 'Origin',
    category: 'request',
    description: 'クロスオリジンリクエストの送信元オリジンを示す。CORS の判定で使われる。Referer と異なりパスを含まない。',
    syntax: 'Origin: <scheme>://<host>:<port>',
    example: 'Origin: https://example.com',
    tags: ['CORS', 'security'],
  },
  {
    name: 'Referer',
    category: 'request',
    description: '現在のリクエストが行われたページの URL を示す。アナリティクスやリンク元追跡に使われる。',
    syntax: 'Referer: <url>',
    example: 'Referer: https://example.com/page.html',
    tags: ['analytics'],
  },
  {
    name: 'User-Agent',
    category: 'request',
    description: 'リクエストを送信しているソフトウェア（ブラウザ・OSなど）の情報を示す。コンテンツの出し分けやログ分析に利用される。',
    syntax: 'User-Agent: <product>/<version> <comment>',
    example: 'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    tags: ['browser'],
  },
  {
    name: 'X-Requested-With',
    category: 'request',
    description: '非標準ヘッダー。Ajax リクエストを識別するためにブラウザや JavaScript フレームワークが送信することがある。',
    syntax: 'X-Requested-With: XMLHttpRequest',
    example: 'X-Requested-With: XMLHttpRequest',
    tags: ['ajax'],
  },
  // ── Both ─────────────────────────────────────────────────────────────────
  {
    name: 'Cache-Control',
    category: 'both',
    description: 'リクエスト・レスポンス両方でキャッシュの動作を指定する。max-age, no-cache, no-store などのディレクティブで制御する。',
    syntax: 'Cache-Control: <directive>[, <directive>...]',
    example: 'Cache-Control: max-age=3600, must-revalidate',
    tags: ['cache'],
  },
  {
    name: 'Content-Type',
    category: 'both',
    description: 'リソースのメディアタイプを指定する。リクエスト時はボディの形式を、レスポンス時はコンテンツの形式をサーバーに伝える。',
    syntax: 'Content-Type: <MIME_type>/<MIME_subtype>; charset=<charset>',
    example: 'Content-Type: application/json; charset=utf-8',
    tags: ['content negotiation'],
  },
  {
    name: 'Content-Length',
    category: 'both',
    description: 'メッセージボディのバイト数を示す。サーバーがボディの終端を判断するために使用する。',
    syntax: 'Content-Length: <length>',
    example: 'Content-Length: 348',
    tags: ['body'],
  },
  {
    name: 'Content-Encoding',
    category: 'both',
    description: 'ボディに適用されている圧縮エンコーディングを示す。クライアントはこれを見てデコード方法を決める。',
    syntax: 'Content-Encoding: gzip | deflate | br | identity',
    example: 'Content-Encoding: gzip',
    tags: ['compression'],
  },
  {
    name: 'Content-Language',
    category: 'both',
    description: 'コンテンツの対象言語を示す。複数の言語を指定することも可能。',
    syntax: 'Content-Language: <language-tag>',
    example: 'Content-Language: ja, en',
    tags: ['i18n'],
  },
  {
    name: 'Connection',
    category: 'both',
    description: '現在のトランザクション完了後にネットワーク接続を維持するかを制御する。HTTP/1.1 ではデフォルト keep-alive。',
    syntax: 'Connection: keep-alive | close',
    example: 'Connection: keep-alive',
    tags: ['networking'],
  },
  {
    name: 'Transfer-Encoding',
    category: 'both',
    description: 'ボディをユーザーに転送する際に使用するエンコード形式を指定する。chunked 転送を使うと Content-Length が不要になる。',
    syntax: 'Transfer-Encoding: chunked | gzip | deflate | identity',
    example: 'Transfer-Encoding: chunked',
    tags: ['body', 'networking'],
  },
  {
    name: 'Pragma',
    category: 'both',
    description: 'HTTP/1.0 のキャッシュ制御ヘッダー。後方互換性のために使用。Pragma: no-cache は Cache-Control: no-cache に相当する。',
    syntax: 'Pragma: no-cache',
    example: 'Pragma: no-cache',
    tags: ['cache', 'legacy'],
  },
  // ── Response ─────────────────────────────────────────────────────────────
  {
    name: 'Access-Control-Allow-Origin',
    category: 'response',
    description: 'CORS でリソースへのアクセスを許可するオリジンを指定する。* で全オリジン許可、特定ドメインで制限できる。',
    syntax: 'Access-Control-Allow-Origin: * | <origin>',
    example: 'Access-Control-Allow-Origin: https://example.com',
    tags: ['CORS', 'security'],
  },
  {
    name: 'Access-Control-Allow-Methods',
    category: 'response',
    description: 'CORS のプリフライトレスポンスで、許可する HTTP メソッドを指定する。',
    syntax: 'Access-Control-Allow-Methods: <method>, <method>',
    example: 'Access-Control-Allow-Methods: GET, POST, PUT, DELETE',
    tags: ['CORS'],
  },
  {
    name: 'Access-Control-Allow-Headers',
    category: 'response',
    description: 'プリフライトリクエストへの応答で、実際のリクエスト時に使用できるヘッダーを指定する。',
    syntax: 'Access-Control-Allow-Headers: <header-name>, <header-name>',
    example: 'Access-Control-Allow-Headers: Content-Type, Authorization',
    tags: ['CORS'],
  },
  {
    name: 'Access-Control-Max-Age',
    category: 'response',
    description: 'プリフライトリクエストの結果をキャッシュできる秒数を指定する。ブラウザが同じプリフライトを繰り返さない時間。',
    syntax: 'Access-Control-Max-Age: <delta-seconds>',
    example: 'Access-Control-Max-Age: 86400',
    tags: ['CORS', 'cache'],
  },
  {
    name: 'Age',
    category: 'response',
    description: 'オブジェクトがプロキシキャッシュに保存されてからの秒数を示す。',
    syntax: 'Age: <delta-seconds>',
    example: 'Age: 120',
    tags: ['cache'],
  },
  {
    name: 'Allow',
    category: 'response',
    description: 'リソースに対してサポートされている HTTP メソッドの一覧を示す。405 Method Not Allowed レスポンスに含める。',
    syntax: 'Allow: <http-methods>',
    example: 'Allow: GET, HEAD, POST',
    tags: ['methods'],
  },
  {
    name: 'Content-Disposition',
    category: 'response',
    description: 'コンテンツをインライン表示するか、ダウンロードするかを指示する。ファイルのダウンロード処理に使用する。',
    syntax: 'Content-Disposition: inline | attachment; filename="<filename>"',
    example: 'Content-Disposition: attachment; filename="report.pdf"',
    tags: ['download'],
  },
  {
    name: 'Content-Range',
    category: 'response',
    description: 'Range リクエストへの応答で、送信されたデータのボディ内での位置を示す。ファイルの部分ダウンロードに使用する。',
    syntax: 'Content-Range: <unit> <range-start>-<range-end>/<size>',
    example: 'Content-Range: bytes 200-1000/67589',
    tags: ['range'],
  },
  {
    name: 'ETag',
    category: 'response',
    description: 'リソースの特定バージョンを識別するための識別子。クライアントはこれをキャッシュ検証に使う。',
    syntax: 'ETag: "<etag_value>" | W/"<etag_value>"',
    example: 'ETag: "33a64df5"',
    tags: ['cache', 'conditional'],
  },
  {
    name: 'Expires',
    category: 'response',
    description: 'レスポンスが陳腐化する日時を示す。Cache-Control に max-age がある場合は無視される。',
    syntax: 'Expires: <http-date>',
    example: 'Expires: Wed, 01 Jan 2026 00:00:00 GMT',
    tags: ['cache'],
  },
  {
    name: 'Last-Modified',
    category: 'response',
    description: 'リソースが最後に変更された日時を示す。If-Modified-Since ヘッダーによる条件付きリクエストに使われる。',
    syntax: 'Last-Modified: <day-name>, <day> <month> <year> <hour>:<minute>:<second> GMT',
    example: 'Last-Modified: Mon, 01 Jul 2024 10:00:00 GMT',
    tags: ['cache', 'conditional'],
  },
  {
    name: 'Location',
    category: 'response',
    description: 'リダイレクト先の URL を示す。3xx リダイレクトや 201 Created レスポンスで使用される。',
    syntax: 'Location: <url>',
    example: 'Location: https://example.com/new-page',
    tags: ['redirect'],
  },
  {
    name: 'Retry-After',
    category: 'response',
    description: 'サービスが使用不可な場合（503）やレート制限時（429）に、次のリクエストまでの待機時間を示す。',
    syntax: 'Retry-After: <delay-seconds> | <http-date>',
    example: 'Retry-After: 120',
    tags: ['rate-limit'],
  },
  {
    name: 'Server',
    category: 'response',
    description: 'リクエストを処理したサーバーソフトウェアの情報を示す。セキュリティ上の理由で詳細を隠すことが推奨される。',
    syntax: 'Server: <product>',
    example: 'Server: nginx/1.24.0',
    tags: ['server-info'],
  },
  {
    name: 'Set-Cookie',
    category: 'response',
    description: 'クライアントにクッキーを設定する。Secure・HttpOnly・SameSite などの属性でセキュリティを強化できる。',
    syntax: 'Set-Cookie: <name>=<value>; [attributes]',
    example: 'Set-Cookie: sessionId=abc123; HttpOnly; Secure; SameSite=Strict',
    tags: ['cookie', 'session', 'security'],
  },
  {
    name: 'Vary',
    category: 'response',
    description: 'キャッシュがどのリクエストヘッダーに基づいてレスポンスを変えるかを示す。CDN やプロキシキャッシュに重要。',
    syntax: 'Vary: <header-name>, <header-name>',
    example: 'Vary: Accept-Encoding, Accept-Language',
    tags: ['cache'],
  },
  {
    name: 'WWW-Authenticate',
    category: 'response',
    description: '401 Unauthorized レスポンスで、リソースへのアクセスに必要な認証方式を示す。',
    syntax: 'WWW-Authenticate: <scheme> realm="<realm>"',
    example: 'WWW-Authenticate: Bearer realm="api", charset="UTF-8"',
    tags: ['auth'],
  },
  // ── Security headers ─────────────────────────────────────────────────────
  {
    name: 'Content-Security-Policy',
    category: 'response',
    description: 'ブラウザが読み込み可能なリソースのソースを制限する。XSS やデータインジェクション攻撃を防ぐ重要なセキュリティヘッダー。',
    syntax: "Content-Security-Policy: <policy-directive>; <policy-directive>",
    example: "Content-Security-Policy: default-src 'self'; script-src 'self' https://cdn.example.com",
    tags: ['security', 'XSS'],
  },
  {
    name: 'Strict-Transport-Security',
    category: 'response',
    description: 'ブラウザに HTTPS のみでサーバーに接続するよう指示する（HSTS）。max-age で有効期間を指定する。',
    syntax: 'Strict-Transport-Security: max-age=<seconds>; includeSubDomains; preload',
    example: 'Strict-Transport-Security: max-age=31536000; includeSubDomains; preload',
    tags: ['security', 'HTTPS', 'HSTS'],
  },
  {
    name: 'X-Content-Type-Options',
    category: 'response',
    description: 'ブラウザの MIME タイプスニッフィングを防止する。nosniff を指定することで宣言された Content-Type のみを使用させる。',
    syntax: 'X-Content-Type-Options: nosniff',
    example: 'X-Content-Type-Options: nosniff',
    tags: ['security'],
  },
  {
    name: 'X-Frame-Options',
    category: 'response',
    description: 'ページを iframe 内に表示することを制御する。クリックジャッキング攻撃を防ぐために使用する。',
    syntax: 'X-Frame-Options: DENY | SAMEORIGIN',
    example: 'X-Frame-Options: SAMEORIGIN',
    tags: ['security', 'clickjacking'],
  },
  {
    name: 'X-XSS-Protection',
    category: 'response',
    description: '古いブラウザの XSS フィルターを有効化する。CSP が普及した現在は非推奨とされているが、古いブラウザ向けに設定されることがある。',
    syntax: 'X-XSS-Protection: 0 | 1 | 1; mode=block',
    example: 'X-XSS-Protection: 1; mode=block',
    tags: ['security', 'XSS', 'legacy'],
  },
  {
    name: 'Referrer-Policy',
    category: 'response',
    description: 'Referer ヘッダーに含める情報量を制御する。プライバシー保護とデバッグ情報のバランスを取る。',
    syntax: 'Referrer-Policy: no-referrer | same-origin | strict-origin-when-cross-origin | ...',
    example: 'Referrer-Policy: strict-origin-when-cross-origin',
    tags: ['security', 'privacy'],
  },
  {
    name: 'Permissions-Policy',
    category: 'response',
    description: 'ブラウザの機能や API（カメラ・マイク・位置情報など）をページや iframe で使用できるかを制御する。',
    syntax: 'Permissions-Policy: <feature>=(<allowlist>)',
    example: 'Permissions-Policy: camera=(), microphone=(), geolocation=(self)',
    tags: ['security', 'privacy'],
  },
]

// ─── Component ───────────────────────────────────────────────────────────────

type FilterCategory = 'all' | Category

const FILTER_OPTIONS: { label: string; value: FilterCategory }[] = [
  { label: 'すべて', value: 'all' },
  { label: 'リクエスト', value: 'request' },
  { label: 'レスポンス', value: 'response' },
  { label: '両方', value: 'both' },
]

const CATEGORY_LABEL: Record<Category, string> = {
  request: 'リクエスト',
  response: 'レスポンス',
  both: '両方',
}

// Left border accent color per category
const CATEGORY_BORDER: Record<Category, string> = {
  request: 'border-l-blue-500/60',
  response: 'border-l-teal/60',
  both: 'border-l-purple-400/60',
}

// Badge text color per category
const CATEGORY_TEXT: Record<Category, string> = {
  request: 'text-blue-400/80',
  response: 'text-teal/80',
  both: 'text-purple-400/80',
}

function HeaderCard({ header }: { header: Header }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(header.name)
    setCopied(true)
    setTimeout(() => setCopied(false), 1200)
  }

  return (
    <div
      className={`group rounded-lg border border-border border-l-2 ${CATEGORY_BORDER[header.category]} bg-surface-hi transition-colors hover:border-border-hi hover:border-l-2`}
    >
      {/* Top bar: name + category */}
      <div className="flex items-center justify-between gap-3 px-4 pt-3.5 pb-2">
        <button
          onClick={handleCopy}
          className="font-mono text-[15px] font-semibold text-bright transition-colors hover:text-teal text-left leading-tight"
          title="クリックでコピー"
        >
          {copied ? (
            <span className="text-teal text-sm font-normal">✓ Copied!</span>
          ) : (
            <>
              {header.name}
              <span className="ml-1.5 font-mono text-[10px] text-muted/0 group-hover:text-muted/40 transition-colors align-middle">
                ⎘
              </span>
            </>
          )}
        </button>
        <span className={`shrink-0 font-mono text-[10px] uppercase tracking-wider ${CATEGORY_TEXT[header.category]}`}>
          {CATEGORY_LABEL[header.category]}
        </span>
      </div>

      {/* Description */}
      <p className="px-4 pb-3 text-sm text-primary leading-relaxed border-b border-border/40">{header.description}</p>

      {/* Syntax + Example stacked */}
      <div className="px-4 py-3 space-y-2">
        <div>
          <span className="font-mono text-[9px] uppercase tracking-widest text-muted/60">syntax</span>
          <code className="mt-1 block font-mono text-[11px] text-dim leading-relaxed break-all">
            {header.syntax}
          </code>
        </div>
        <div>
          <span className="font-mono text-[9px] uppercase tracking-widest text-muted/60">example</span>
          <code className="mt-1 block font-mono text-[11px] leading-relaxed break-all text-teal/70">
            {header.example}
          </code>
        </div>
      </div>

      {/* Tags */}
      {header.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 px-4 pb-3">
          {header.tags.map((tag) => (
            <span key={tag} className="font-mono text-[9px] text-muted/40 border border-border/40 rounded px-1.5 py-0.5">
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

export function HttpHeadersReference() {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<FilterCategory>('all')

  const filtered = HEADERS.filter((h) => {
    const matchesFilter = filter === 'all' || h.category === filter
    if (!matchesFilter) return false

    if (!query.trim()) return true
    const q = query.toLowerCase()
    return (
      h.name.toLowerCase().includes(q) ||
      h.description.toLowerCase().includes(q) ||
      h.tags.some((t) => t.toLowerCase().includes(q))
    )
  })

  return (
    <div className="space-y-4">
      {/* Search + Filter */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ヘッダー名またはキーワードで検索…"
            className="w-full rounded-lg border border-border bg-surface-hi px-4 py-2.5 font-mono text-sm text-primary outline-none transition-colors focus:border-teal/40 placeholder:text-muted/25"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-xs text-muted/50 hover:text-dim transition-colors"
            >
              ✕
            </button>
          )}
        </div>
        <div className="flex shrink-0 overflow-hidden rounded-lg border border-border">
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setFilter(opt.value)}
              className={`border-r border-border px-3.5 py-2 font-mono text-xs transition-colors last:border-0 ${
                filter === opt.value
                  ? 'bg-teal/10 text-teal'
                  : 'text-dim hover:bg-surface-hi hover:text-primary'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Count */}
      <p className="font-mono text-[10px] text-muted/50">
        {filtered.length} / {HEADERS.length} headers
        {filter !== 'all' && (
          <span className="ml-2 text-muted/30">— {CATEGORY_LABEL[filter as Category]} でフィルタ中</span>
        )}
      </p>

      {/* Results */}
      {filtered.length === 0 ? (
        <div className="rounded-lg border border-border/40 px-4 py-12 text-center">
          <p className="font-mono text-sm text-muted/60">該当するヘッダーが見つかりません</p>
          <button
            onClick={() => { setQuery(''); setFilter('all') }}
            className="mt-3 font-mono text-xs text-teal/60 hover:text-teal transition-colors underline underline-offset-2"
          >
            検索をクリア
          </button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map((h) => (
            <HeaderCard key={h.name} header={h} />
          ))}
        </div>
      )}
    </div>
  )
}
