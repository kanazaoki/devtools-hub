'use client'

import { useState, useMemo } from 'react'

interface ParsedCookie {
  name: string
  value: string
  expires?: string
  maxAge?: number
  path?: string
  domain?: string
  httpOnly: boolean
  secure: boolean
  sameSite?: string
  raw: string
  isExpired: boolean
  remainingMs?: number
}

function parseSetCookie(raw: string): ParsedCookie {
  const parts = raw.split(';').map(s => s.trim())
  const firstEq = parts[0].indexOf('=')
  const name = firstEq === -1 ? parts[0] : parts[0].slice(0, firstEq).trim()
  const value = firstEq === -1 ? '' : parts[0].slice(firstEq + 1).trim()

  const cookie: ParsedCookie = {
    name, value, httpOnly: false, secure: false, raw, isExpired: false,
  }

  for (let i = 1; i < parts.length; i++) {
    const p = parts[i]
    const lower = p.toLowerCase()
    if (lower === 'httponly') {
      cookie.httpOnly = true
    } else if (lower === 'secure') {
      cookie.secure = true
    } else if (lower.startsWith('expires=')) {
      cookie.expires = p.slice('expires='.length)
      const d = new Date(cookie.expires)
      if (!isNaN(d.getTime())) {
        cookie.remainingMs = d.getTime() - Date.now()
        cookie.isExpired = cookie.remainingMs <= 0
      }
    } else if (lower.startsWith('max-age=')) {
      cookie.maxAge = parseInt(p.slice('max-age='.length), 10)
      if (!isNaN(cookie.maxAge)) {
        cookie.remainingMs = cookie.maxAge * 1000
        cookie.isExpired = cookie.maxAge <= 0
      }
    } else if (lower.startsWith('path=')) {
      cookie.path = p.slice('path='.length)
    } else if (lower.startsWith('domain=')) {
      cookie.domain = p.slice('domain='.length)
    } else if (lower.startsWith('samesite=')) {
      cookie.sameSite = p.slice('samesite='.length)
    }
  }

  return cookie
}

function parseCookieHeader(raw: string): ParsedCookie[] {
  return raw.split(';').map(s => s.trim()).filter(Boolean).map(pair => {
    const eq = pair.indexOf('=')
    const name = eq === -1 ? pair : pair.slice(0, eq).trim()
    const value = eq === -1 ? '' : pair.slice(eq + 1).trim()
    return { name, value, httpOnly: false, secure: false, raw: pair, isExpired: false }
  })
}

function formatRemaining(ms: number): string {
  if (ms <= 0) return '期限切れ'
  const s = Math.floor(ms / 1000)
  if (s < 60) return `${s}秒`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}分`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}時間`
  return `${Math.floor(h / 24)}日`
}

const SAMPLE_SET_COOKIE = `session_id=abc123xyz; Expires=Thu, 01 Jan 2027 00:00:00 GMT; Path=/; Domain=example.com; HttpOnly; Secure; SameSite=Strict
auth_token=eyJhbGciOiJIUzI1NiJ9; Max-Age=86400; Path=/api; HttpOnly
tracking=visitor42; Expires=Sun, 01 Jan 2023 00:00:00 GMT; Path=/`

const SAMPLE_COOKIE = `session_id=abc123xyz; auth_token=eyJhbGciOiJIUzI1NiJ9; user_pref=dark`

export function CookieInspector() {
  const [mode, setMode] = useState<'set-cookie' | 'cookie'>('set-cookie')
  const [input, setInput] = useState('')

  const cookies = useMemo<ParsedCookie[]>(() => {
    if (!input.trim()) return []
    if (mode === 'set-cookie') {
      return input.split('\n').map(l => l.trim()).filter(Boolean).map(parseSetCookie)
    }
    return parseCookieHeader(input)
  }, [input, mode])

  const loadSample = () => {
    setInput(mode === 'set-cookie' ? SAMPLE_SET_COOKIE : SAMPLE_COOKIE)
  }

  const Flag = ({ on, label }: { on: boolean; label: string }) => (
    <span className={`inline-flex items-center rounded px-2 py-0.5 font-mono text-xs ${
      on ? 'bg-teal/10 text-teal border border-teal/30' : 'bg-surface text-muted border border-border'
    }`}>
      {on ? '✓' : '·'} {label}
    </span>
  )

  return (
    <div className="space-y-4">
      {/* Mode toggle */}
      <div className="flex items-center gap-3">
        <div className="flex overflow-hidden rounded border border-border">
          {(['set-cookie', 'cookie'] as const).map(m => (
            <button
              key={m}
              onClick={() => { setMode(m); setInput('') }}
              className={`px-3 py-1.5 font-mono text-xs transition-colors ${
                mode === m ? 'bg-teal/15 text-teal' : 'text-dim hover:text-primary'
              }`}
            >
              {m === 'set-cookie' ? 'Set-Cookie' : 'Cookie'}
            </button>
          ))}
        </div>
        <button
          onClick={loadSample}
          className="flex items-center gap-1.5 rounded px-2.5 py-1 text-xs text-dim hover:text-teal hover:bg-teal/10 transition-colors"
        >
          <span className="opacity-60">⊞</span> サンプルを挿入
        </button>
      </div>

      {/* Input */}
      <div>
        <span className="font-mono text-xs uppercase tracking-widest text-muted">
          {mode === 'set-cookie' ? 'Set-Cookie ヘッダー（複数行可）' : 'Cookie ヘッダー値'}
        </span>
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          rows={mode === 'set-cookie' ? 5 : 3}
          spellCheck={false}
          placeholder={mode === 'set-cookie'
            ? 'session_id=abc123; Expires=...; HttpOnly; Secure'
            : 'session_id=abc123; auth_token=xyz'}
          className="mt-1.5 w-full rounded border border-border bg-[#0a0a0d] px-3 py-2.5 font-mono text-xs text-primary placeholder:text-muted focus:border-teal/50 focus:outline-none resize-y leading-relaxed"
        />
      </div>

      {/* Results */}
      {cookies.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs uppercase tracking-widest text-muted">Parsed</span>
            <span className="font-mono text-xs text-dim">{cookies.length}件</span>
          </div>
          {cookies.map((c, i) => (
            <CookieCard key={i} cookie={c} mode={mode} />
          ))}
        </div>
      )}
    </div>
  )
}

function CookieCard({ cookie, mode }: { cookie: ParsedCookie; mode: string }) {
  const [copied, setCopied] = useState(false)
  const [showValue, setShowValue] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(cookie.raw)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const secureScore = (cookie.httpOnly ? 1 : 0) + (cookie.secure ? 1 : 0) + (cookie.sameSite ? 1 : 0)
  const scoreColor = secureScore === 3 ? 'text-teal' : secureScore >= 1 ? 'text-yellow-400' : 'text-red-400'
  const scoreLabel = secureScore === 3 ? 'Secure' : secureScore >= 1 ? 'Partial' : 'Unsafe'
  const isLongValue = cookie.value.length > 40

  const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="flex items-start gap-3 px-4 py-2">
      <span className="w-20 shrink-0 font-mono text-xs text-muted">{label}</span>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  )

  return (
    <div className={`rounded-lg border overflow-hidden ${
      cookie.isExpired ? 'border-red-800/50' : 'border-border'
    }`}>
      {/* Header */}
      <div className={`flex items-center justify-between px-4 py-2.5 ${
        cookie.isExpired ? 'bg-red-950/30' : 'bg-surface'
      }`}>
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-mono text-sm font-bold text-bright truncate">{cookie.name}</span>
          {cookie.isExpired && (
            <span className="shrink-0 rounded bg-red-900/60 px-1.5 py-0.5 font-mono text-xs text-red-400 border border-red-800/50">
              期限切れ
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {mode === 'set-cookie' && (
            <span className={`font-mono text-xs ${scoreColor}`}>{scoreLabel}</span>
          )}
          <button
            onClick={handleCopy}
            className={`rounded px-2 py-0.5 text-xs transition-colors ${
              copied ? 'text-teal' : 'text-dim hover:text-primary hover:bg-surface-hi'
            }`}
          >
            {copied ? '✓' : '⎘'}
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="divide-y divide-border/60 bg-bg/50">
        {/* Value */}
        <Row label="value">
          {cookie.value ? (
            <div>
              <span className="font-mono text-xs text-primary break-all">
                {isLongValue && !showValue
                  ? cookie.value.slice(0, 40) + '…'
                  : cookie.value}
              </span>
              {isLongValue && (
                <button
                  onClick={() => setShowValue(v => !v)}
                  className="ml-2 font-mono text-xs text-dim hover:text-teal transition-colors"
                >
                  {showValue ? '折りたたむ' : `全表示 (${cookie.value.length}文字)`}
                </button>
              )}
            </div>
          ) : (
            <span className="font-mono text-xs text-muted italic">(空)</span>
          )}
        </Row>

        {/* Expires */}
        {cookie.expires && (
          <Row label="expires">
            <span className="font-mono text-xs text-primary">{cookie.expires}</span>
            {cookie.remainingMs !== undefined && (
              <span className={`ml-2 font-mono text-xs ${cookie.isExpired ? 'text-red-400' : 'text-teal'}`}>
                ({formatRemaining(cookie.remainingMs)})
              </span>
            )}
          </Row>
        )}

        {/* Max-Age */}
        {cookie.maxAge !== undefined && (
          <Row label="max-age">
            <span className="font-mono text-xs text-primary">{cookie.maxAge}秒</span>
            {cookie.remainingMs !== undefined && !cookie.isExpired && (
              <span className="ml-2 font-mono text-xs text-teal">({formatRemaining(cookie.remainingMs)})</span>
            )}
          </Row>
        )}

        {/* Path + Domain */}
        {cookie.path && <Row label="path"><span className="font-mono text-xs text-primary">{cookie.path}</span></Row>}
        {cookie.domain && <Row label="domain"><span className="font-mono text-xs text-primary">{cookie.domain}</span></Row>}

        {/* Flags */}
        {mode === 'set-cookie' && (
          <div className="flex flex-wrap gap-2 px-4 py-3">
            {[
              { key: 'HttpOnly', on: cookie.httpOnly },
              { key: 'Secure', on: cookie.secure },
            ].map(({ key, on }) => (
              <span key={key} className={`inline-flex items-center gap-1 rounded px-2 py-0.5 font-mono text-xs border transition-colors ${
                on
                  ? 'bg-teal/10 text-teal border-teal/30'
                  : 'text-muted border-border/50 opacity-50'
              }`}>
                {on ? '✓' : '○'} {key}
              </span>
            ))}
            {cookie.sameSite ? (
              <span className="inline-flex items-center gap-1 rounded px-2 py-0.5 font-mono text-xs bg-purple-900/30 text-purple-400 border border-purple-800/40">
                ✓ SameSite={cookie.sameSite}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded px-2 py-0.5 font-mono text-xs text-muted border border-border/50 opacity-50">
                ○ SameSite
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
