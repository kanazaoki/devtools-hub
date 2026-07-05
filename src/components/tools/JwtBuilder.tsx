'use client'

import { useState, useEffect } from 'react'

type Algorithm = 'HS256' | 'HS384' | 'HS512'

const ALG_TO_HASH: Record<Algorithm, string> = {
  HS256: 'SHA-256',
  HS384: 'SHA-384',
  HS512: 'SHA-512',
}

function b64url(input: string): string {
  return btoa(input).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function b64urlBytes(bytes: Uint8Array): string {
  let str = ''
  bytes.forEach(b => { str += String.fromCharCode(b) })
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

async function signJwt(header: string, payload: string, secret: string, alg: Algorithm): Promise<string> {
  const enc = new TextEncoder()
  const keyData = enc.encode(secret)
  const signingInput = b64url(header) + '.' + b64url(payload)

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: ALG_TO_HASH[alg] },
    false,
    ['sign']
  )
  const sigBytes = await crypto.subtle.sign('HMAC', cryptoKey, enc.encode(signingInput))
  return signingInput + '.' + b64urlBytes(new Uint8Array(sigBytes))
}

const DEFAULT_HEADER = JSON.stringify({ alg: 'HS256', typ: 'JWT' }, null, 2)
const DEFAULT_PAYLOAD = JSON.stringify({
  sub: '1234567890',
  name: 'John Doe',
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 3600,
}, null, 2)
const DEFAULT_SECRET = 'your-256-bit-secret'

export function JwtBuilder() {
  const [header, setHeader] = useState(DEFAULT_HEADER)
  const [payload, setPayload] = useState(DEFAULT_PAYLOAD)
  const [secret, setSecret] = useState(DEFAULT_SECRET)
  const [alg, setAlg] = useState<Algorithm>('HS256')
  const [token, setToken] = useState('')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [showSecret, setShowSecret] = useState(false)

  useEffect(() => {
    let cancelled = false

    const generate = async () => {
      try {
        JSON.parse(header)
      } catch {
        if (!cancelled) { setToken(''); setError('Header: 無効なJSON形式です') }
        return
      }
      try {
        JSON.parse(payload)
      } catch {
        if (!cancelled) { setToken(''); setError('Payload: 無効なJSON形式です') }
        return
      }

      try {
        // Inject alg into header for signing
        const headerObj = JSON.parse(header)
        headerObj.alg = alg
        const jwt = await signJwt(JSON.stringify(headerObj), payload, secret, alg)
        if (!cancelled) { setToken(jwt); setError('') }
      } catch (e) {
        if (!cancelled) { setToken(''); setError('署名の生成に失敗しました: ' + String(e)) }
      }
    }

    generate()
    return () => { cancelled = true }
  }, [header, payload, secret, alg])

  const handleCopy = async () => {
    if (!token) return
    await navigator.clipboard.writeText(token)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const parts = token.split('.')

  const SectionLabel = ({ children }: { children: React.ReactNode }) => (
    <span className="font-mono text-xs uppercase tracking-widest text-muted">{children}</span>
  )

  return (
    <div className="space-y-5">
      {/* Algorithm */}
      <div>
        <SectionLabel>Algorithm</SectionLabel>
        <div className="mt-2 flex gap-2">
          {(['HS256', 'HS384', 'HS512'] as Algorithm[]).map(a => (
            <button
              key={a}
              onClick={() => setAlg(a)}
              className={`rounded border px-3 py-1.5 font-mono text-xs transition-colors ${
                alg === a
                  ? 'border-teal bg-teal/10 text-teal'
                  : 'border-border text-dim hover:text-primary'
              }`}
            >
              {a}
            </button>
          ))}
        </div>
      </div>

      {/* Header + Payload */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <div className="mb-1.5 flex items-center gap-2">
            <SectionLabel>Header</SectionLabel>
            <span className="h-1.5 w-1.5 rounded-full bg-red-400/70" />
          </div>
          <textarea
            value={header}
            onChange={e => setHeader(e.target.value)}
            rows={5}
            spellCheck={false}
            className="w-full rounded border border-border bg-[#0a0a0d] px-3 py-2 font-mono text-xs text-primary focus:border-red-500/40 focus:outline-none resize-y leading-relaxed transition-colors"
          />
        </div>
        <div>
          <div className="mb-1.5 flex items-center gap-2">
            <SectionLabel>Payload</SectionLabel>
            <span className="h-1.5 w-1.5 rounded-full bg-purple-400/70" />
          </div>
          <textarea
            value={payload}
            onChange={e => setPayload(e.target.value)}
            rows={5}
            spellCheck={false}
            className="w-full rounded border border-border bg-[#0a0a0d] px-3 py-2 font-mono text-xs text-primary focus:border-purple-500/40 focus:outline-none resize-y leading-relaxed transition-colors"
          />
        </div>
      </div>

      {/* Secret */}
      <div>
        <SectionLabel>Secret</SectionLabel>
        <div className="mt-1.5 flex overflow-hidden rounded border border-border focus-within:border-teal/50 transition-colors">
          <input
            type={showSecret ? 'text' : 'password'}
            value={secret}
            onChange={e => setSecret(e.target.value)}
            placeholder="your-secret-key"
            className="flex-1 bg-bg px-3 py-2 font-mono text-sm text-primary placeholder:text-muted focus:outline-none"
          />
          <button
            onClick={() => setShowSecret(s => !s)}
            className="border-l border-border px-3 text-xs text-dim hover:text-primary transition-colors"
          >
            {showSecret ? '隠す' : '表示'}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 rounded border border-red-800/60 bg-red-950/40 px-3 py-2 text-xs text-red-400">
          <span>⚠</span> {error}
        </div>
      )}

      {/* Output */}
      <div className="rounded-lg border border-border overflow-hidden">
        <div className="flex items-center justify-between border-b border-border bg-surface px-4 py-2">
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs uppercase tracking-widest text-muted">Generated JWT</span>
            {token && (
              <span className="rounded bg-teal/10 px-2 py-0.5 font-mono text-xs text-teal border border-teal/20">
                {alg}
              </span>
            )}
          </div>
          <button
            onClick={handleCopy}
            disabled={!token}
            className={`flex items-center gap-1.5 rounded px-2.5 py-1 text-xs transition-colors ${
              copied ? 'text-teal' : 'text-dim hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed'
            }`}
          >
            {copied ? '✓ コピー済み' : '⎘ コピー'}
          </button>
        </div>
        {/* Color-coded token */}
        <div className="relative bg-[#0a0a0d] px-4 py-4 min-h-[5rem]">
          {token ? (
            <p className="font-mono text-xs leading-relaxed break-all">
              <span className="text-red-400">{parts[0]}</span>
              <span className="text-muted/50">.</span>
              <span className="text-purple-400">{parts[1]}</span>
              <span className="text-muted/50">.</span>
              <span className="text-teal">{parts[2]}</span>
            </p>
          ) : (
            <p className="font-mono text-xs text-muted italic">
              {error ? '' : '// Header・Payload・Secret を入力するとJWTが生成されます'}
            </p>
          )}
        </div>
        {/* Part labels */}
        <div className="flex gap-4 border-t border-border bg-surface px-4 py-2">
          {[
            { label: 'Header', color: 'bg-red-400' },
            { label: 'Payload', color: 'bg-purple-400' },
            { label: 'Signature', color: 'bg-teal' },
          ].map(({ label, color }) => (
            <span key={label} className="flex items-center gap-1.5 font-mono text-xs">
              <span className={`h-2 w-2 rounded-full ${color}`} />
              <span className="text-muted">{label}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
