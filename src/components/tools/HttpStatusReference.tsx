'use client'

import { useState, useMemo } from 'react'

type Category = '1xx' | '2xx' | '3xx' | '4xx' | '5xx' | 'all'

interface StatusCode {
  code: number
  text: string
  ja: string
  desc: string
  usage: string
  headers?: string
}

const CODES: StatusCode[] = [
  // 1xx
  { code: 100, text: 'Continue', ja: '継続', desc: 'リクエストの最初の部分を受け取り、残りを続けてよい。', usage: 'クライアントがリクエストボディを送信する前にサーバーの確認を得る際に使用。' },
  { code: 101, text: 'Switching Protocols', ja: 'プロトコル切り替え', desc: 'サーバーがUpgradeヘッダーに従ってプロトコルを切り替える。', usage: 'HTTP→WebSocketへのアップグレード時に使用。', headers: 'Upgrade: websocket\nConnection: Upgrade' },
  { code: 102, text: 'Processing', ja: '処理中', desc: 'サーバーがリクエストを受け取り処理しているが、まだ応答がない。', usage: 'WebDAVで長時間の処理中にタイムアウトを防ぐために使用。' },
  { code: 103, text: 'Early Hints', ja: '早期ヒント', desc: 'メインのレスポンス前にリソースのプリロードヒントを送る。', usage: 'Critical CSSやJSのLink preloadを先行して送信しページ表示を高速化。', headers: 'Link: </style.css>; rel=preload; as=style' },
  // 2xx
  { code: 200, text: 'OK', ja: '成功', desc: 'リクエストが成功した。レスポンスボディに結果が含まれる。', usage: 'GET・POST等の成功時の標準レスポンス。' },
  { code: 201, text: 'Created', ja: '作成完了', desc: 'リクエストが成功し、新しいリソースが作成された。', usage: 'POSTでリソース作成成功時。Locationヘッダーで新URLを示す。', headers: 'Location: /resources/42' },
  { code: 202, text: 'Accepted', ja: '受理', desc: 'リクエストは受け付けられたが処理はまだ完了していない。', usage: '非同期処理のキューへの登録時など。' },
  { code: 204, text: 'No Content', ja: 'コンテンツなし', desc: 'リクエストは成功したがレスポンスボディはない。', usage: 'DELETE成功時・フォーム送信後にリダイレクトしない場合。' },
  { code: 206, text: 'Partial Content', ja: '部分コンテンツ', desc: '範囲指定リクエスト（Range）の部分レスポンス。', usage: '動画のシーク・大ファイルの分割ダウンロード。', headers: 'Content-Range: bytes 0-1023/4096' },
  // 3xx
  { code: 301, text: 'Moved Permanently', ja: '恒久移動', desc: 'リソースのURLが恒久的に変更された。', usage: 'ドメイン移行・URLリストラクチャリング。SEO的にもリダイレクト先に評価が引き継がれる。', headers: 'Location: https://new.example.com/' },
  { code: 302, text: 'Found', ja: '一時的移動', desc: 'リソースのURLが一時的に変更された。', usage: 'ログイン後のリダイレクト・メンテナンス中の一時転送。', headers: 'Location: /login' },
  { code: 303, text: 'See Other', ja: '他を参照', desc: 'GETで別URLを参照してほしい。', usage: 'POST/PUT後にGETにリダイレクト（PRG パターン）。', headers: 'Location: /success' },
  { code: 304, text: 'Not Modified', ja: '未更新', desc: 'リソースは変更されていない。キャッシュを使用できる。', usage: '条件付きリクエスト（If-None-Match/If-Modified-Since）のレスポンス。', headers: 'ETag: "abc123"' },
  { code: 307, text: 'Temporary Redirect', ja: '一時的リダイレクト', desc: 'メソッドを変えずに一時的に別URLへリダイレクト。', usage: 'POSTリクエストをメソッドそのままで別URLに転送する場合。', headers: 'Location: /new-endpoint' },
  { code: 308, text: 'Permanent Redirect', ja: '恒久的リダイレクト', desc: 'メソッドを変えずに恒久的に別URLへリダイレクト。', usage: 'APIエンドポイントの恒久移動でPOST等を維持したい場合。', headers: 'Location: /new-permanent-endpoint' },
  // 4xx
  { code: 400, text: 'Bad Request', ja: '不正なリクエスト', desc: 'サーバーがリクエストを解釈できない。構文エラーなど。', usage: 'バリデーションエラー・不正なJSONボディ・パラメータ欠如。' },
  { code: 401, text: 'Unauthorized', ja: '未認証', desc: '認証が必要。認証情報が正しくない場合も含む。', usage: 'Bearer tokenなし・期限切れJWTトークン。', headers: 'WWW-Authenticate: Bearer realm="api"' },
  { code: 403, text: 'Forbidden', ja: '禁止', desc: '認証済みだがそのリソースへのアクセス権限がない。', usage: '他ユーザーのリソースへのアクセス・管理者専用エンドポイントへの一般ユーザーアクセス。' },
  { code: 404, text: 'Not Found', ja: '未検出', desc: 'リクエストされたリソースが見つからない。', usage: '存在しないURL・削除済みリソース・タイプミスしたパス。' },
  { code: 405, text: 'Method Not Allowed', ja: 'メソッド不可', desc: 'リクエストメソッドがリソースでサポートされていない。', usage: 'GETのみ対応エンドポイントへのPOSTリクエスト。', headers: 'Allow: GET, HEAD' },
  { code: 408, text: 'Request Timeout', ja: 'リクエストタイムアウト', desc: 'サーバーがリクエストを待機している間にタイムアウトした。', usage: 'クライアントの接続が遅い・リクエストの送信が中断された場合。' },
  { code: 409, text: 'Conflict', ja: '競合', desc: 'リソースの現在の状態と競合がある。', usage: '重複したユーザー名での登録・楽観的ロックの競合・バージョン競合。' },
  { code: 410, text: 'Gone', ja: '削除済み', desc: 'リソースが恒久的に削除され今後も存在しない。', usage: '削除されたコンテンツ（404とは違い永久削除を明示）。SEO的にインデックス削除を促す。' },
  { code: 413, text: 'Content Too Large', ja: 'コンテンツが大きすぎる', desc: 'リクエストボディがサーバーの許可サイズを超えている。', usage: 'ファイルアップロードのサイズ制限超過。', headers: 'Retry-After: 60' },
  { code: 415, text: 'Unsupported Media Type', ja: 'サポートされないメディアタイプ', desc: 'リクエストのContent-Typeが受け付けられない。', usage: 'application/jsonを期待するAPIにtext/plainを送った場合。' },
  { code: 422, text: 'Unprocessable Content', ja: '処理不可能なコンテンツ', desc: '構文は正しいがセマンティクスが正しくない（バリデーションエラー）。', usage: 'フォームバリデーション失敗・ビジネスロジック違反（例: 年齢が負の値）。' },
  { code: 429, text: 'Too Many Requests', ja: 'リクエスト過多', desc: 'レート制限を超えたリクエスト。', usage: 'APIのレートリミット（例: 60req/min）超過。', headers: 'Retry-After: 60\nX-RateLimit-Limit: 60' },
  { code: 451, text: 'Unavailable For Legal Reasons', ja: '法的理由で利用不可', desc: '法的要求（著作権・政府要請など）によりリソースが利用できない。', usage: 'GDPR・著作権侵害・政府のコンテンツ削除要求への対応。' },
  // 5xx
  { code: 500, text: 'Internal Server Error', ja: 'サーバー内部エラー', desc: 'サーバー側で予期しないエラーが発生した。', usage: '未処理の例外・設定ミス・バグによるクラッシュ。' },
  { code: 501, text: 'Not Implemented', ja: '未実装', desc: 'サーバーがリクエストメソッドをサポートしていない。', usage: 'PATCH未実装のAPIへのリクエスト。' },
  { code: 502, text: 'Bad Gateway', ja: '不正なゲートウェイ', desc: 'ゲートウェイとして機能するサーバーが無効な応答を受けた。', usage: 'リバースプロキシ（Nginx/ELB）の後ろのアプリが落ちている。' },
  { code: 503, text: 'Service Unavailable', ja: 'サービス利用不可', desc: 'サーバーが一時的にリクエストを処理できない。', usage: 'メンテナンス中・過負荷・デプロイ中。', headers: 'Retry-After: 3600' },
  { code: 504, text: 'Gateway Timeout', ja: 'ゲートウェイタイムアウト', desc: 'ゲートウェイがアップストリームから応答を受け取れなかった。', usage: 'バックエンドサーバーの処理タイムアウト・DNSタイムアウト。' },
  { code: 507, text: 'Insufficient Storage', ja: 'ストレージ不足', desc: 'サーバーのストレージが不足しリクエストを完了できない。', usage: 'WebDAVでのファイルアップロード時・ディスクフル状態。' },
]

const CATEGORY_COLOR: Record<string, { bg: string; text: string; badge: string; left: string }> = {
  '1': { bg: 'bg-blue-500/8 border-blue-500/20',    text: 'text-blue-400',   badge: 'bg-blue-500/20 text-blue-300',   left: 'border-l-blue-500' },
  '2': { bg: 'bg-teal/8 border-teal/20',             text: 'text-teal',       badge: 'bg-teal/20 text-teal',           left: 'border-l-teal' },
  '3': { bg: 'bg-amber-400/8 border-amber-400/20',  text: 'text-amber-400',  badge: 'bg-amber-400/20 text-amber-300', left: 'border-l-amber-400' },
  '4': { bg: 'bg-orange-400/8 border-orange-400/20',text: 'text-orange-400', badge: 'bg-orange-400/20 text-orange-300',left: 'border-l-orange-400' },
  '5': { bg: 'bg-red-500/8 border-red-500/20',      text: 'text-red-400',    badge: 'bg-red-500/20 text-red-300',     left: 'border-l-red-500' },
}

function getCatColor(code: number) {
  return CATEGORY_COLOR[String(code)[0]] ?? CATEGORY_COLOR['5']
}

function getCategory(code: number): Category {
  if (code < 200) return '1xx'
  if (code < 300) return '2xx'
  if (code < 400) return '3xx'
  if (code < 500) return '4xx'
  return '5xx'
}

export function HttpStatusReference() {
  const [query, setQuery] = useState('')
  const [activeCat, setActiveCat] = useState<Category>('all')
  const [expanded, setExpanded] = useState<number | null>(null)
  const [copied, setCopied] = useState<number | null>(null)

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim()
    return CODES.filter((c) => {
      const catMatch = activeCat === 'all' || getCategory(c.code) === activeCat
      if (!catMatch) return false
      if (!q) return true
      return (
        String(c.code).includes(q) ||
        c.text.toLowerCase().includes(q) ||
        c.ja.includes(q) ||
        c.desc.includes(q) ||
        c.usage.includes(q)
      )
    })
  }, [query, activeCat])

  const handleCopy = (code: number) => {
    navigator.clipboard.writeText(String(code)).then(() => {
      setCopied(code)
      setTimeout(() => setCopied(null), 1200)
    })
  }

  const toggleExpand = (code: number) => setExpanded((e) => (e === code ? null : code))

  const cats: { key: Category; label: string }[] = [
    { key: 'all', label: 'すべて' },
    { key: '1xx', label: '1xx 情報' },
    { key: '2xx', label: '2xx 成功' },
    { key: '3xx', label: '3xx リダイレクト' },
    { key: '4xx', label: '4xx クライアントエラー' },
    { key: '5xx', label: '5xx サーバーエラー' },
  ]

  return (
    <div className="flex flex-col gap-4">
      {/* Search */}
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="コード番号・キーワードで検索（例: 404, not found, タイムアウト）"
          className="w-full rounded-lg border border-border bg-[#060a12] px-4 py-3 font-mono text-sm text-bright outline-none transition-colors focus:border-teal placeholder:text-border"
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-xs text-border hover:text-dim"
          >
            ✕
          </button>
        )}
      </div>

      {/* Category tabs */}
      <div className="flex flex-wrap gap-1">
        {cats.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveCat(key)}
            className={`rounded border px-3 py-1.5 font-mono text-xs transition-colors ${
              activeCat === key
                ? 'border-teal/50 bg-teal/10 text-teal'
                : 'border-border text-dim hover:border-teal/30 hover:text-primary'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Count */}
      <p className="font-mono text-[10px] text-muted">{filtered.length} 件</p>

      {/* Cards */}
      {filtered.length === 0 ? (
        <div className="rounded-lg border border-border/50 bg-[#070d1a] px-4 py-10 text-center">
          <p className="font-mono text-sm text-border">「{query}」に一致するコードは見つかりませんでした</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((s) => {
            const col = getCatColor(s.code)
            const isOpen = expanded === s.code
            return (
              <div key={s.code} className={`rounded-lg border-l-[3px] border border-l-transparent overflow-hidden transition-all ${col.bg} ${col.left}`}>
                <button
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.02] transition-colors"
                  onClick={() => toggleExpand(s.code)}
                >
                  {/* Code number — click to copy */}
                  <span
                    className={`shrink-0 rounded border px-2.5 py-0.5 font-mono text-sm font-bold tabular-nums cursor-copy transition-all hover:scale-105 ${col.badge}`}
                    onClick={(e) => { e.stopPropagation(); handleCopy(s.code) }}
                    title="クリックしてコピー"
                  >
                    {copied === s.code ? '✓' : s.code}
                  </span>
                  {/* Title */}
                  <div className="flex-1 min-w-0">
                    <span className={`font-mono text-sm font-semibold ${col.text}`}>{s.text}</span>
                    <span className="ml-2 font-mono text-xs text-muted">{s.ja}</span>
                  </div>
                  {/* Expand indicator */}
                  <span className={`shrink-0 font-mono text-[10px] text-border transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>▾</span>
                </button>

                {/* Description (always visible) */}
                <div className="px-4 pb-3 -mt-1">
                  <p className="text-xs text-primary/80 leading-relaxed">{s.desc}</p>
                </div>

                {/* Expanded detail */}
                {isOpen && (
                  <div className="border-t border-white/8 mx-4 mb-3 pt-3 flex flex-col gap-2.5">
                    <div>
                      <p className="mb-1 font-mono text-[9px] font-semibold uppercase tracking-widest text-muted">典型的な用途</p>
                      <p className="text-xs text-primary leading-relaxed">{s.usage}</p>
                    </div>
                    {s.headers && (
                      <div>
                        <p className="mb-1 font-mono text-[9px] font-semibold uppercase tracking-widest text-muted">レスポンスヘッダー例</p>
                        <pre className="rounded border border-teal/10 bg-[#060a12]/70 px-3 py-2 font-mono text-[11px] text-teal/80 leading-relaxed">{s.headers}</pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
