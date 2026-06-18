'use client'

import { useState, useMemo } from 'react'

interface JwtParts {
  header: Record<string, unknown>
  payload: Record<string, unknown>
  signature: string
}

const CLAIM_LABELS: Record<string, string> = {
  iss: 'iss (Issuer)',
  sub: 'sub (Subject)',
  aud: 'aud (Audience)',
  exp: 'exp (Expires)',
  nbf: 'nbf (Not Before)',
  iat: 'iat (Issued At)',
  jti: 'jti (JWT ID)',
}

function b64urlDecode(str: string): string {
  str = str.replace(/-/g, '+').replace(/_/g, '/')
  while (str.length % 4) str += '='
  return atob(str)
}

function formatDate(ts: number): string {
  return new Date(ts * 1000).toLocaleString('ja-JP', { timeZoneName: 'short' })
}

function syntaxHighlight(json: string): string {
  return json.replace(
    /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
    (match) => {
      if (/^"/.test(match)) {
        if (/:$/.test(match)) return `<span class="text-blue-400">${match}</span>`
        return `<span class="text-teal">${match}</span>`
      }
      if (/true|false/.test(match)) return `<span class="text-violet-400">${match}</span>`
      if (/null/.test(match)) return `<span class="text-red-400">${match}</span>`
      return `<span class="text-amber-300">${match}</span>`
    }
  )
}

function decode(token: string): { parts: JwtParts; error: null } | { parts: null; error: string } {
  const segments = token.split('.')
  if (segments.length !== 3) return { parts: null, error: '不正なフォーマット — JWT は . で区切られた3つのパートが必要です' }
  try {
    const header = JSON.parse(b64urlDecode(segments[0]))
    const payload = JSON.parse(b64urlDecode(segments[1]))
    return { parts: { header, payload, signature: segments[2] }, error: null }
  } catch {
    return { parts: null, error: 'デコードに失敗しました — 正しい JWT か確認してください' }
  }
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <button
      onClick={copy}
      className="rounded border border-border px-2 py-0.5 font-mono text-[10px] text-muted transition-colors hover:border-border-hi hover:text-primary"
    >
      {copied ? '✓' : 'Copy'}
    </button>
  )
}

export function JwtDecoder() {
  const [token, setToken] = useState('')

  const result = useMemo(() => {
    if (!token.trim()) return null
    return decode(token.trim())
  }, [token])

  const segments = token.trim().split('.')

  return (
    <div className="space-y-4">
      {/* Input */}
      <div className="space-y-1.5">
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted">Token</p>
        <textarea
          value={token}
          onChange={e => setToken(e.target.value)}
          placeholder={'JWT トークンをここに貼り付け...\neyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'}
          spellCheck={false}
          rows={4}
          className={`w-full resize-y rounded-lg border bg-[#111827] p-4 font-mono text-xs leading-relaxed text-primary outline-none transition-colors focus:border-violet-500/40 ${
            result?.error ? 'border-red-500/50' : 'border-border'
          }`}
        />
        {/* Color visual */}
        {token && segments.length === 3 && (
          <p className="break-all font-mono text-[11px] leading-relaxed">
            <span className="text-red-400">{segments[0]}</span>
            <span className="text-muted">.</span>
            <span className="text-violet-400">{segments[1]}</span>
            <span className="text-muted">.</span>
            <span className="text-teal">{segments[2]}</span>
          </p>
        )}
      </div>

      {/* Error */}
      {result?.error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3">
          <p className="font-mono text-xs text-red-400">✕ {result.error}</p>
        </div>
      )}

      {/* Empty hint */}
      {!token && (
        <p className="py-6 text-center font-mono text-xs text-muted/40">
          JWT トークンを貼り付けるとデコード結果が表示されます
        </p>
      )}

      {result?.parts && (
        <p className="font-mono text-[10px] text-muted/40">
          ※ 署名の検証は行っていません。改ざん検知には秘密鍵・公開鍵が必要です。
        </p>
      )}

      {result?.parts && (() => {
        const { header, payload, signature } = result.parts
        const now = Math.floor(Date.now() / 1000)
        const presentClaims = Object.keys(CLAIM_LABELS).filter(k => k in payload)

        return (
          <div className="space-y-3">
            {/* Claims */}
            {presentClaims.length > 0 && (
              <div className="overflow-hidden rounded-lg border border-border">
                <div className="border-b border-border bg-surface-hi px-4 py-2">
                  <p className="font-mono text-[10px] uppercase tracking-widest text-amber-400">Claims</p>
                </div>
                <div className="divide-y divide-border">
                  {presentClaims.map(k => {
                    const v = payload[k] as number | string
                    let display = String(v)
                    let cls = 'text-primary'
                    if (['exp', 'nbf', 'iat'].includes(k) && typeof v === 'number') {
                      const dt = formatDate(v)
                      if (k === 'exp') {
                        const diff = v - now
                        if (diff > 0) {
                          const min = Math.floor(diff / 60)
                          const h = Math.floor(min / 60)
                          const remain = h > 0 ? `${h}h ${min % 60}m 後に期限切れ` : `${min}m 後に期限切れ`
                          display = `${dt}  (${remain})`
                          cls = diff < 300 ? 'text-amber-400' : 'text-teal'
                        } else {
                          const ago = Math.floor(-diff / 60)
                          display = `${dt}  (期限切れ ${ago}m 前)`
                          cls = 'text-red-400'
                        }
                      } else {
                        display = dt
                      }
                    }
                    return (
                      <div key={k} className="grid grid-cols-[120px_1fr] gap-3 px-4 py-2.5">
                        <span className="font-mono text-[11px] text-muted">{CLAIM_LABELS[k]}</span>
                        <span className={`break-all font-mono text-[11px] ${cls}`}>{display}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Header */}
            <div className="overflow-hidden rounded-lg border border-border">
              <div className="flex items-center justify-between border-b border-border bg-surface-hi px-4 py-2">
                <p className="font-mono text-[10px] uppercase tracking-widest text-red-400">Header</p>
                <CopyButton text={JSON.stringify(header, null, 2)} />
              </div>
              <pre
                className="overflow-x-auto bg-[#111827] p-4 font-mono text-xs leading-relaxed"
                dangerouslySetInnerHTML={{ __html: syntaxHighlight(JSON.stringify(header, null, 2)) }}
              />
            </div>

            {/* Payload */}
            <div className="overflow-hidden rounded-lg border border-border">
              <div className="flex items-center justify-between border-b border-border bg-surface-hi px-4 py-2">
                <p className="font-mono text-[10px] uppercase tracking-widest text-violet-400">Payload</p>
                <CopyButton text={JSON.stringify(payload, null, 2)} />
              </div>
              <pre
                className="overflow-x-auto bg-[#111827] p-4 font-mono text-xs leading-relaxed"
                dangerouslySetInnerHTML={{ __html: syntaxHighlight(JSON.stringify(payload, null, 2)) }}
              />
            </div>

            {/* Signature */}
            <div className="overflow-hidden rounded-lg border border-border">
              <div className="flex items-center justify-between border-b border-border bg-surface-hi px-4 py-2">
                <p className="font-mono text-[10px] uppercase tracking-widest text-teal">Signature</p>
                <CopyButton text={signature} />
              </div>
              <p className="break-all bg-[#111827] p-4 font-mono text-xs text-teal">{signature}</p>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
