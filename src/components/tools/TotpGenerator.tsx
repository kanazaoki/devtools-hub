'use client'

import { useState, useEffect, useCallback } from 'react'

// Base32 デコード (RFC 4648)
const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

function base32Decode(input: string): Uint8Array | null {
  const str = input.toUpperCase().replace(/=+$/, '').replace(/\s/g, '')
  if (str.length === 0) return new Uint8Array(0)

  for (const ch of str) {
    if (!BASE32_CHARS.includes(ch)) return null
  }

  const bits = str.split('').map((c) => BASE32_CHARS.indexOf(c).toString(2).padStart(5, '0')).join('')
  const bytes = []
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2))
  }
  return new Uint8Array(bytes)
}

// HMAC-SHA1 (WebCrypto API)
async function hmacSha1(key: Uint8Array, data: Uint8Array): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key.buffer.slice(key.byteOffset, key.byteOffset + key.byteLength) as ArrayBuffer,
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  )
  const sig = await crypto.subtle.sign(
    'HMAC',
    cryptoKey,
    data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer
  )
  return new Uint8Array(sig)
}

// TOTP 生成 (RFC 6238)
async function generateTotp(secretKey: Uint8Array, time: number): Promise<string> {
  const step = 30
  const counter = Math.floor(time / step)

  // counter を 8バイト big-endian に変換
  const counterBytes = new Uint8Array(8)
  let tmp = counter
  for (let i = 7; i >= 0; i--) {
    counterBytes[i] = tmp & 0xff
    tmp = Math.floor(tmp / 256)
  }

  const hmac = await hmacSha1(secretKey, counterBytes)

  // Dynamic truncation
  const offset = hmac[hmac.length - 1] & 0x0f
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff)

  return String(code % 1_000_000).padStart(6, '0')
}

// --- UI コンポーネント ---

interface CodeDisplay {
  label: string
  code: string
  offset: number
}

export function TotpGenerator() {
  const [secret, setSecret] = useState('')
  const [codes, setCodes] = useState<CodeDisplay[]>([])
  const [remaining, setRemaining] = useState(0)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState<string | null>(null)

  const updateCodes = useCallback(async (secretStr: string) => {
    if (!secretStr.trim()) {
      setCodes([])
      setError('')
      return
    }

    const key = base32Decode(secretStr.trim())
    if (!key) {
      setError('無効な Base32 文字列です（使用可能: A-Z, 2-7）')
      setCodes([])
      return
    }
    if (key.length === 0) {
      setError('シークレットキーを入力してください')
      setCodes([])
      return
    }

    setError('')
    try {
      const now = Math.floor(Date.now() / 1000)
      const [prev, curr, next] = await Promise.all([
        generateTotp(key, now - 30),
        generateTotp(key, now),
        generateTotp(key, now + 30),
      ])
      setCodes([
        { label: '前のコード（-30秒）', code: prev, offset: -30 },
        { label: '現在のコード', code: curr, offset: 0 },
        { label: '次のコード（+30秒）', code: next, offset: 30 },
      ])
    } catch {
      setError('コード生成中にエラーが発生しました')
      setCodes([])
    }
  }, [])

  // 毎秒 tick
  useEffect(() => {
    const tick = () => {
      const now = Math.floor(Date.now() / 1000)
      const rem = 30 - (now % 30)
      setRemaining(rem)

      // 30秒ごとにコード更新
      if (rem === 30 || rem === 1) {
        updateCodes(secret)
      }
    }

    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [secret, updateCodes])

  // シークレット変更時に即座に更新
  useEffect(() => {
    updateCodes(secret)
  }, [secret, updateCodes])

  const handleCopy = async (code: string) => {
    await navigator.clipboard.writeText(code)
    setCopied(code)
    setTimeout(() => setCopied(null), 2000)
  }

  const progress = ((30 - remaining) / 30) * 100

  return (
    <div className="flex flex-col gap-6">
      {/* シークレットキー入力 */}
      <div className="flex flex-col gap-2">
        <label className="font-mono text-xs text-muted" htmlFor="totp-secret">
          Base32 シークレットキー
        </label>
        <input
          id="totp-secret"
          type="text"
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
          placeholder="例: JBSWY3DPEHPK3PXP"
          spellCheck={false}
          autoComplete="off"
          className="w-full rounded-lg border border-border bg-surface px-4 py-2.5 font-mono text-sm text-primary placeholder:text-muted/50 focus:border-teal focus:outline-none"
        />
        {error && (
          <p className="font-mono text-xs text-red-400">{error}</p>
        )}
        <p className="font-mono text-[10px] text-muted">
          Google Authenticator などのアプリでシークレットキーを表示し、コピーして貼り付けてください
        </p>
      </div>

      {/* カウントダウン */}
      {codes.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between font-mono text-xs text-muted">
            <span>次の更新まで</span>
            <span className={remaining <= 5 ? 'text-red-400' : 'text-teal'}>{remaining}秒</span>
          </div>
          <div className="h-2 w-full rounded-full bg-border">
            <div
              className={`h-full rounded-full transition-all duration-1000 ${remaining <= 5 ? 'bg-red-400' : 'bg-teal'}`}
              style={{ width: `${100 - progress}%` }}
            />
          </div>
        </div>
      )}

      {/* コード表示 */}
      {codes.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-3">
          {codes.map(({ label, code, offset }) => (
            <button
              key={offset}
              onClick={() => handleCopy(code)}
              className={`group flex flex-col items-center gap-2 rounded-lg border p-4 transition-colors ${
                offset === 0
                  ? 'border-teal/50 bg-teal/5 shadow-[0_0_20px_rgba(0,200,150,0.07)] hover:border-teal/70 hover:bg-teal/10'
                  : 'border-border bg-surface hover:border-border-hi'
              }`}
              aria-label={`${label} ${code} をコピー`}
            >
              <span className="font-mono text-[10px] text-muted">{label}</span>
              <span
                className={`font-mono text-3xl font-bold tracking-[0.25em] tabular-nums ${
                  offset === 0 ? 'text-teal' : 'text-dim'
                }`}
              >
                {code}
              </span>
              <span className="font-mono text-[10px] text-muted opacity-0 transition-opacity group-hover:opacity-100">
                {copied === code ? '✓ コピー済み' : 'クリックでコピー'}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* 空状態 */}
      {codes.length === 0 && !error && (
        <div className="rounded-lg border border-border bg-surface py-10 text-center">
          <p className="font-mono text-sm text-muted">シークレットキーを入力するとコードが生成されます</p>
        </div>
      )}

      {/* 注意書き */}
      <p className="border-l-2 border-border pl-3 font-mono text-[10px] leading-relaxed text-muted">
        すべての処理はブラウザ内で完結します。シークレットキーはサーバーに送信されません。
        本番環境の 2FA シークレットの取り扱いには十分ご注意ください。
      </p>
    </div>
  )
}
