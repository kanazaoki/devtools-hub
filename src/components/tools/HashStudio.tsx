'use client'

import { useState, useCallback } from 'react'

type Algorithm = 'MD5' | 'SHA-1' | 'SHA-256' | 'SHA-512'

const ALGOS: Algorithm[] = ['MD5', 'SHA-1', 'SHA-256', 'SHA-512']

async function digestHex(algo: Algorithm, data: ArrayBuffer): Promise<string> {
  const subtle = crypto.subtle
  const webAlgo = algo === 'MD5' ? null : algo.replace('-', '-')
  if (!webAlgo || algo === 'MD5') {
    // MD5 is not supported by Web Crypto API — return placeholder
    return '(MD5はデスクトップ版で利用可)'
  }
  const hashBuffer = await subtle.digest(algo, data)
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

async function hashText(text: string): Promise<Record<Algorithm, string>> {
  const enc = new TextEncoder()
  const buf = enc.encode(text).buffer as ArrayBuffer
  const [sha1, sha256, sha512] = await Promise.all([
    digestHex('SHA-1', buf),
    digestHex('SHA-256', buf),
    digestHex('SHA-512', buf),
  ])
  return { 'MD5': '(MD5はデスクトップ版で利用可)', 'SHA-1': sha1, 'SHA-256': sha256, 'SHA-512': sha512 }
}

interface HashState {
  value: string
  copied: boolean
  verified: '' | 'match' | 'mismatch'
  verifyInput: string
}

const emptyHash = (): HashState => ({ value: '', copied: false, verified: '', verifyInput: '' })

export function HashStudio() {
  const [text, setText] = useState('')
  const [hashes, setHashes] = useState<Record<Algorithm, HashState>>({
    'MD5': emptyHash(), 'SHA-1': emptyHash(), 'SHA-256': emptyHash(), 'SHA-512': emptyHash(),
  })

  const compute = useCallback(async (value: string) => {
    if (!value) {
      setHashes({ 'MD5': emptyHash(), 'SHA-1': emptyHash(), 'SHA-256': emptyHash(), 'SHA-512': emptyHash() })
      return
    }
    const result = await hashText(value)
    setHashes(prev => {
      const next = { ...prev }
      for (const algo of ALGOS) {
        next[algo] = { ...prev[algo], value: result[algo], verified: '' }
      }
      return next
    })
  }, [])

  const handleText = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const v = e.target.value
    setText(v)
    compute(v)
  }

  const copy = (algo: Algorithm) => {
    navigator.clipboard.writeText(hashes[algo].value)
    setHashes(prev => ({ ...prev, [algo]: { ...prev[algo], copied: true } }))
    setTimeout(() => setHashes(prev => ({ ...prev, [algo]: { ...prev[algo], copied: false } })), 1500)
  }

  const verify = (algo: Algorithm, input: string) => {
    const h = hashes[algo]
    const status = !input || !h.value ? '' : input.trim().toLowerCase() === h.value.toLowerCase() ? 'match' : 'mismatch'
    setHashes(prev => ({ ...prev, [algo]: { ...prev[algo], verifyInput: input, verified: status } }))
  }

  const bytes = new TextEncoder().encode(text).length
  const charInfo = text ? `${text.length.toLocaleString()} chars · ${bytes.toLocaleString()} bytes` : ''

  return (
    <div className="space-y-4">
      {/* Input */}
      <div className="space-y-1.5">
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted">Input</p>
        <div className="relative">
          <textarea
            value={text}
            onChange={handleText}
            placeholder="テキストを入力してハッシュを生成..."
            spellCheck={false}
            rows={5}
            className="w-full resize-y rounded-lg border border-border bg-[#111827] p-4 font-mono text-xs leading-relaxed text-primary outline-none transition-colors focus:border-teal/40"
          />
          <span className="absolute bottom-3 right-4 font-mono text-[10px] text-muted/50 pointer-events-none">
            or drop a file
          </span>
        </div>
        {charInfo && <p className="font-mono text-[10px] text-muted">{charInfo}</p>}
      </div>

      {/* Hashes */}
      <div className="space-y-1.5">
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted">Hashes</p>
        <div className="divide-y divide-border rounded-lg border border-border bg-surface-hi">
          {ALGOS.map(algo => {
            const h = hashes[algo]
            const isMd5 = algo === 'MD5'
            return (
              <div key={algo} className="flex flex-wrap items-center gap-2 px-4 py-3">
                <span className="w-16 shrink-0 rounded border border-teal/40 px-2 py-0.5 text-center font-mono text-[10px] text-teal">
                  {algo}
                </span>
                <span className={`flex-1 break-all font-mono text-[11px] ${h.value ? 'text-primary' : 'text-muted/30'}`}>
                  {h.value || '—'}
                </span>
                {!isMd5 && (
                  <>
                    <input
                      type="text"
                      value={h.verifyInput}
                      onChange={e => verify(algo, e.target.value)}
                      placeholder="Verify…"
                      className={`w-40 rounded border px-2 py-1 font-mono text-[10px] outline-none transition-colors ${
                        h.verified === 'match'
                          ? 'border-teal/60 bg-teal/10 text-teal'
                          : h.verified === 'mismatch'
                          ? 'border-red-500/60 bg-red-500/10 text-red-400'
                          : 'border-border bg-transparent text-primary'
                      }`}
                    />
                    {h.verified === 'match' && <span className="font-mono text-[10px] text-teal">✓</span>}
                    {h.verified === 'mismatch' && <span className="font-mono text-[10px] text-red-400">✗</span>}
                    <button
                      disabled={!h.value || isMd5}
                      onClick={() => copy(algo)}
                      className="rounded border border-border px-2 py-0.5 font-mono text-[10px] text-muted transition-colors hover:border-border-hi hover:text-primary disabled:opacity-30"
                    >
                      {h.copied ? '✓' : 'Copy'}
                    </button>
                  </>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <p className="font-mono text-[10px] text-muted/40">
        ※ MD5 は Web Crypto API 非対応のためデスクトップ版のみ。SHA-1 / SHA-256 / SHA-512 はブラウザで計算します。
      </p>
    </div>
  )
}
