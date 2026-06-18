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

function formatBin(n: number): string {
  return n.toString(2).replace(/(.{4})/g, '$1 ').trim()
}

function toBase(n: number, base: Base): string {
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
  const [currentN, setCurrentN] = useState<number | null>(null)

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
    const n = parseInt(stripped, BASE_CONFIG[source].radix)
    if (isNaN(n)) { setError('変換に失敗しました'); return }

    for (const b of ['bin', 'oct', 'dec', 'hex'] as Base[]) {
      next[b] = b === source ? raw : toBase(n, b)
    }
    setValues(next)
    setCurrentN(n)
  }, [])

  const toggleBit = (bitPos: number) => {
    const cur = currentN ?? 0
    const toggled = cur ^ (1 << bitPos)
    convert('dec', String(toggled))
  }

  // Bit view
  const bitWidth = currentN !== null && currentN > 0
    ? Math.max(8, Math.ceil(Math.floor(Math.log2(currentN) + 1) / 4) * 4)
    : 8
  const padded = (currentN ?? 0).toString(2).padStart(bitWidth, '0')

  const bitLen   = currentN !== null ? (currentN === 0 ? 1 : Math.floor(Math.log2(currentN)) + 1) : null
  const byteLen  = bitLen !== null ? Math.ceil(bitLen / 8) : null
  const signed32 = currentN !== null ? (currentN | 0) : null

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
            { key: 'Signed (32-bit)', val: String(signed32), warn: (signed32 ?? 0) < 0 },
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
