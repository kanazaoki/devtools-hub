'use client'

import { useState, useCallback } from 'react'

type Base = 'bin' | 'oct' | 'dec' | 'hex'

const BASE_CONFIG: Record<Base, { label: string; sub: string; radix: number; color: string; placeholder: string }> = {
  bin: { label: 'BIN', sub: 'Base 2',  radix: 2,  color: 'text-teal',     placeholder: '1111 1111' },
  oct: { label: 'OCT', sub: 'Base 8',  radix: 8,  color: 'text-blue-400', placeholder: '377' },
  dec: { label: 'DEC', sub: 'Base 10', radix: 10, color: 'text-amber-300', placeholder: '255' },
  hex: { label: 'HEX', sub: 'Base 16', radix: 16, color: 'text-violet-400', placeholder: 'FF' },
}

const PATTERNS: Record<Base, RegExp> = {
  bin: /^[01\s]+$/,
  oct: /^(0o)?[0-7]+$/i,
  dec: /^-?\d+$/,
  hex: /^(0x)?[0-9a-f]+$/i,
}

function stripPrefix(val: string, base: Base): string {
  if (base === 'oct') return val.replace(/^0o/i, '').replace(/\s/g, '')
  if (base === 'hex') return val.replace(/^0x/i, '').replace(/\s/g, '')
  return val.replace(/\s/g, '').trim()
}

// ⚠ 以前は Number（parseInt）で計算していたため、2^53 を超える値は黙って下の桁が変わっていた
// （12345678901234567890 → HEX が …0800 になる。正しくは …0AD2）。BigInt で桁数の制限なく扱う
function parseBig(stripped: string, base: Base): bigint {
  if (base === 'dec') return BigInt(stripped)
  const prefix = base === 'bin' ? '0b' : base === 'oct' ? '0o' : '0x'
  return BigInt(prefix + stripped)
}

function formatBin(n: bigint): string {
  const sign = n < 0n ? '-' : ''
  const digits = (n < 0n ? -n : n).toString(2)
  // 右から4桁ずつ区切る
  return sign + digits.replace(/(?=(?:[01]{4})+$)/g, ' ').trim()
}

function toBase(n: bigint, base: Base): string {
  if (base === 'bin') return formatBin(n)
  if (base === 'oct') return n.toString(8)
  if (base === 'dec') return n.toString(10)
  return n.toString(16).toUpperCase()
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text.replace(/\s/g, '')); setCopied(true); setTimeout(() => setCopied(false), 1500) }}
      className={`shrink-0 rounded border px-2 py-0.5 font-mono text-[10px] transition-colors ${
        copied ? 'border-teal text-teal' : 'border-border text-muted hover:border-border-hi hover:text-primary'
      }`}
    >
      {copied ? '✓' : 'Copy'}
    </button>
  )
}

export function NumberBaseConverter() {
  const [values, setValues] = useState<Record<Base, string>>({ bin: '', oct: '', dec: '', hex: '' })
  const [error, setError] = useState('')
  const [currentN, setCurrentN] = useState<bigint | null>(null)

  const convert = useCallback((source: Base, raw: string) => {
    setError('')
    const next = { bin: '', oct: '', dec: '', hex: '' } as Record<Base, string>
    next[source] = raw

    if (!raw.trim()) {
      setValues(next)
      setCurrentN(null)
      return
    }

    if (!PATTERNS[source].test(raw.trim())) {
      setValues(next)
      setCurrentN(null)
      setError(`✕ ${BASE_CONFIG[source].label} として無効な入力です`)
      return
    }

    const stripped = stripPrefix(raw, source)
    let n: bigint
    try { n = parseBig(stripped, source) } catch { setError('変換に失敗しました'); return }

    for (const b of ['bin', 'oct', 'dec', 'hex'] as Base[]) {
      next[b] = b === source ? raw : toBase(n, b)
    }
    setValues(next)
    setCurrentN(n)
  }, [])

  const toggleBit = (bitPos: number) => {
    const cur = currentN ?? 0n
    // ⚠ 以前は 1 << bitPos で、31 ビット目以上を反転すると桁あふれしていた
    const mask = 1n << BigInt(bitPos)
    let toggled = cur ^ mask
    // 負の数は2の補数（表示しているビット幅）で反転し、符号付きとして読み直す
    if (cur < 0n) toggled = BigInt.asIntN(bitWidth, BigInt.asUintN(bitWidth, cur) ^ mask)
    convert('dec', toggled.toString())
  }

  // Bit view（負の数は2の補数で表示する）
  const absBits = currentN === null ? 1 : (currentN < 0n ? -currentN - 1n : currentN).toString(2).length
  const bitWidth = currentN !== null && currentN < 0n
    ? Math.max(8, Math.ceil((absBits + 1) / 8) * 8)
    : Math.max(8, Math.ceil(absBits / 4) * 4)
  const padded = currentN === null
    ? '0'.repeat(bitWidth)
    : BigInt.asUintN(bitWidth, currentN).toString(2).padStart(bitWidth, '0')

  const bitLen   = currentN !== null ? (currentN < 0n ? bitWidth : absBits) : null
  const byteLen  = bitLen !== null ? Math.ceil(bitLen / 8) : null
  const signed32 = currentN !== null ? BigInt.asIntN(32, currentN) : null
  const over32 = currentN !== null && (currentN >= 1n << 32n || currentN < -(1n << 31n))

  return (
    <div className="space-y-3">
      {/* Base rows */}
      {(['bin', 'oct', 'dec', 'hex'] as Base[]).map(base => {
        const { label, sub, color, placeholder } = BASE_CONFIG[base]
        return (
          <div key={base} className="flex overflow-hidden rounded-lg border border-border bg-surface transition-colors focus-within:border-border-hi">
            <div className="flex w-20 shrink-0 flex-col justify-center border-r border-border bg-surface-hi px-3 py-2.5">
              <span className={`font-mono text-xs font-semibold ${color}`}>{label}</span>
              <span className="font-mono text-[9px] text-muted">{sub}</span>
            </div>
            <input
              type="text"
              value={values[base]}
              onChange={e => convert(base, e.target.value)}
              placeholder={placeholder}
              spellCheck={false}
              className="flex-1 bg-transparent px-4 py-2.5 font-mono text-sm text-primary outline-none placeholder:text-muted/30"
            />
            {values[base] && <div className="flex items-center pr-3"><CopyButton text={values[base]} /></div>}
          </div>
        )
      })}

      {error && <p className="font-mono text-[10px] text-red-400">{error}</p>}

      {/* Info */}
      {currentN !== null && (
        <div className="grid grid-cols-3 gap-2">
          {[
            { key: 'Bit length',      val: String(bitLen) },
            { key: 'Byte length',     val: String(byteLen) },
            { key: over32 ? 'Signed (下位32-bit)' : 'Signed (32-bit)', val: String(signed32), warn: (signed32 ?? 0n) < 0n },
          ].map(({ key, val, warn }) => (
            <div key={key} className="rounded-lg border border-border bg-surface-hi px-3 py-2">
              <p className="font-mono text-[9px] uppercase tracking-wider text-muted">{key}</p>
              <p className={`mt-1 font-mono text-xs ${warn ? 'text-red-400' : 'text-primary'}`}>{val}</p>
            </div>
          ))}
        </div>
      )}

      {/* Bit view */}
      <div className="overflow-hidden rounded-lg border border-border">
        <div className="flex items-center justify-between border-b border-border bg-surface-hi px-4 py-2">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted">
            Bit View <span className="font-normal normal-case text-muted/50">— クリックで反転</span>
          </p>
          {currentN !== null && <span className="font-mono text-[10px] text-muted">{bitWidth} bits</span>}
        </div>
        <div className="bg-[#111827] p-4">
          {currentN === null ? (
            <p className="font-mono text-[10px] text-muted/30">数値を入力するとビットが表示されます</p>
          ) : (
            <>
              <div className="flex flex-wrap gap-1.5">
                {Array.from({ length: bitWidth / 4 }, (_, gi) => (
                  <div key={gi} className="flex gap-1">
                    {Array.from({ length: 4 }, (_, bi) => {
                      const j = gi * 4 + bi
                      const bitPos = bitWidth - 1 - j
                      const isOn = padded[j] === '1'
                      return (
                        <button
                          key={bi}
                          onClick={() => toggleBit(bitPos)}
                          title={`bit ${bitPos}`}
                          className={`h-7 w-5 rounded border font-mono text-[11px] font-bold transition-all hover:scale-110 ${
                            isOn
                              ? 'border-teal/40 bg-teal/15 text-teal'
                              : 'border-border bg-surface-hi text-muted hover:border-border-hi hover:text-primary'
                          }`}
                        >
                          {padded[j]}
                        </button>
                      )
                    })}
                  </div>
                ))}
              </div>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {Array.from({ length: bitWidth / 4 }, (_, gi) => (
                  <div key={gi} className="flex gap-1">
                    {Array.from({ length: 4 }, (_, bi) => {
                      const j = gi * 4 + bi
                      const bitPos = bitWidth - 1 - j
                      return (
                        <span key={bi} className="w-5 text-center font-mono text-[8px] text-muted/50">{bitPos}</span>
                      )
                    })}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
