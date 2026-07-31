'use client'

import { useState, useCallback } from 'react'

type Algorithm = 'MD5' | 'SHA-1' | 'SHA-256' | 'SHA-512'

const ALGOS: Algorithm[] = ['MD5', 'SHA-1', 'SHA-256', 'SHA-512']

// MD5 is not part of the Web Crypto API, so it's implemented here (RFC 1321).
// Operates on raw bytes, so it matches the UTF-8 encoding used for the others.
function md5(bytes: Uint8Array): string {
  const rl = (x: number, c: number) => (x << c) | (x >>> (32 - c))
  const add = (a: number, b: number) => (a + b) & 0xffffffff
  const s = [
    7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
    5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
    4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
    6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21,
  ]
  const K = new Int32Array(64)
  for (let i = 0; i < 64; i++) K[i] = Math.floor(Math.abs(Math.sin(i + 1)) * 4294967296)

  const origLen = bytes.length
  const bitLen = origLen * 8
  let totalLen = origLen + 1
  while (totalLen % 64 !== 56) totalLen++
  totalLen += 8
  const msg = new Uint8Array(totalLen)
  msg.set(bytes)
  msg[origLen] = 0x80
  const lenLo = bitLen >>> 0
  const lenHi = Math.floor(bitLen / 4294967296) >>> 0
  msg[totalLen - 8] = lenLo & 0xff
  msg[totalLen - 7] = (lenLo >>> 8) & 0xff
  msg[totalLen - 6] = (lenLo >>> 16) & 0xff
  msg[totalLen - 5] = (lenLo >>> 24) & 0xff
  msg[totalLen - 4] = lenHi & 0xff
  msg[totalLen - 3] = (lenHi >>> 8) & 0xff
  msg[totalLen - 2] = (lenHi >>> 16) & 0xff
  msg[totalLen - 1] = (lenHi >>> 24) & 0xff

  let a0 = 0x67452301, b0 = 0xefcdab89, c0 = 0x98badcfe, d0 = 0x10325476
  const M = new Int32Array(16)
  for (let off = 0; off < totalLen; off += 64) {
    for (let i = 0; i < 16; i++) {
      M[i] = msg[off + i * 4] | (msg[off + i * 4 + 1] << 8) | (msg[off + i * 4 + 2] << 16) | (msg[off + i * 4 + 3] << 24)
    }
    let A = a0, B = b0, C = c0, D = d0
    for (let i = 0; i < 64; i++) {
      let F: number, g: number
      if (i < 16) { F = (B & C) | (~B & D); g = i }
      else if (i < 32) { F = (D & B) | (~D & C); g = (5 * i + 1) % 16 }
      else if (i < 48) { F = B ^ C ^ D; g = (3 * i + 5) % 16 }
      else { F = C ^ (B | ~D); g = (7 * i) % 16 }
      F = add(add(F, A), add(K[i], M[g]))
      A = D; D = C; C = B
      B = add(B, rl(F, s[i]))
    }
    a0 = add(a0, A); b0 = add(b0, B); c0 = add(c0, C); d0 = add(d0, D)
  }
  const toHexLE = (n: number) => {
    let h = ''
    for (let i = 0; i < 4; i++) h += ((n >>> (i * 8)) & 0xff).toString(16).padStart(2, '0')
    return h
  }
  return toHexLE(a0) + toHexLE(b0) + toHexLE(c0) + toHexLE(d0)
}

async function digestHex(algo: Algorithm, data: ArrayBuffer): Promise<string> {
  if (algo === 'MD5') return md5(new Uint8Array(data))
  const hashBuffer = await crypto.subtle.digest(algo, data)
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

async function hashText(text: string): Promise<Record<Algorithm, string>> {
  const enc = new TextEncoder()
  const buf = enc.encode(text).buffer as ArrayBuffer
  const [md5h, sha1, sha256, sha512] = await Promise.all([
    digestHex('MD5', buf),
    digestHex('SHA-1', buf),
    digestHex('SHA-256', buf),
    digestHex('SHA-512', buf),
  ])
  return { 'MD5': md5h, 'SHA-1': sha1, 'SHA-256': sha256, 'SHA-512': sha512 }
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
            return (
              <div key={algo} className="flex flex-wrap items-center gap-2 px-4 py-3">
                <span className="w-16 shrink-0 rounded border border-teal/40 px-2 py-0.5 text-center font-mono text-[10px] text-teal">
                  {algo}
                </span>
                <span className={`flex-1 break-all font-mono text-[11px] ${h.value ? 'text-primary' : 'text-muted/30'}`}>
                  {h.value || '—'}
                </span>
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
                  disabled={!h.value}
                  onClick={() => copy(algo)}
                  className="rounded border border-border px-2 py-0.5 font-mono text-[10px] text-muted transition-colors hover:border-border-hi hover:text-primary disabled:opacity-30"
                >
                  {h.copied ? '✓' : 'Copy'}
                </button>
              </div>
            )
          })}
        </div>
      </div>

      <p className="font-mono text-[10px] text-muted/40">
        ※ MD5 / SHA-1 / SHA-256 / SHA-512 をすべてブラウザ内で計算します。データは外部に送信されません。
      </p>
    </div>
  )
}
