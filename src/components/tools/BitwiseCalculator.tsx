'use client'

import { useState, useCallback } from 'react'

type InputFormat = 'dec' | 'hex' | 'bin'
type Operator = 'AND' | 'OR' | 'XOR' | 'NOT' | 'LSHIFT' | 'RSHIFT'

const OPERATORS: { value: Operator; label: string; symbol: string; desc: string }[] = [
  { value: 'AND',    label: 'AND',   symbol: '&',  desc: '両方1のとき1' },
  { value: 'OR',     label: 'OR',    symbol: '|',  desc: 'どちらか1で1' },
  { value: 'XOR',    label: 'XOR',   symbol: '^',  desc: '異なるとき1' },
  { value: 'NOT',    label: 'NOT',   symbol: '~',  desc: 'ビット反転' },
  { value: 'LSHIFT', label: '<<',    symbol: '<<', desc: '左シフト' },
  { value: 'RSHIFT', label: '>>',    symbol: '>>', desc: '右シフト' },
]

const FORMAT_LABELS: Record<InputFormat, string> = { dec: 'DEC', hex: 'HEX', bin: 'BIN' }

function parseInput(value: string, format: InputFormat): number | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  let n: number
  if (format === 'dec') {
    if (!/^-?\d+$/.test(trimmed)) return null
    n = parseInt(trimmed, 10)
  } else if (format === 'hex') {
    const clean = trimmed.replace(/^0x/i, '')
    if (!/^[0-9a-fA-F]+$/.test(clean)) return null
    n = parseInt(clean, 16)
  } else {
    const clean = trimmed.replace(/^0b/i, '')
    if (!/^[01]+$/.test(clean)) return null
    n = parseInt(clean, 2)
  }
  return isNaN(n) ? null : (n >>> 0)
}

function compute(a: number | null, b: number | null, op: Operator): number | null {
  if (op === 'NOT') return a === null ? null : (~a) >>> 0
  if (a === null || b === null) return null
  switch (op) {
    case 'AND':    return (a & b) >>> 0
    case 'OR':     return (a | b) >>> 0
    case 'XOR':    return (a ^ b) >>> 0
    case 'LSHIFT': return (a << (b & 31)) >>> 0
    case 'RSHIFT': return (a >>> (b & 31)) >>> 0
  }
}

function toBin32(n: number): string {
  return (n >>> 0).toString(2).padStart(32, '0')
}

function BitRow({
  value, label, isResult,
}: { value: number | null; label: string; isResult?: boolean }) {
  const bits = value !== null ? toBin32(value) : null

  return (
    <div className="flex items-center gap-3">
      <span className={`w-16 shrink-0 text-right font-mono text-xs tabular-nums ${
        isResult ? 'font-bold text-teal' : 'text-muted'
      }`}>
        {label}
      </span>
      <div className="flex gap-1.5 overflow-x-auto pb-0.5">
        {bits ? (
          Array.from({ length: 8 }, (_, g) => (
            <div key={g} className="flex gap-px">
              {Array.from({ length: 4 }, (_, b) => {
                const idx = g * 4 + b
                const bit = bits[idx]
                const isOne = bit === '1'
                return (
                  <span
                    key={idx}
                    className={`flex h-7 w-5 items-center justify-center rounded font-mono text-xs font-bold transition-all ${
                      isOne
                        ? isResult
                          ? 'bg-teal/20 text-teal ring-1 ring-teal/40'
                          : 'bg-surface-hi text-bright ring-1 ring-border-hi'
                        : 'bg-surface text-border'
                    }`}
                  >
                    {bit}
                  </span>
                )
              })}
            </div>
          ))
        ) : (
          <span className="flex h-7 items-center pl-1 font-mono text-xs italic text-border">
            — 入力待ち —
          </span>
        )}
      </div>
    </div>
  )
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }, [text])
  return (
    <button
      onClick={handleCopy}
      className="rounded px-2 py-0.5 font-mono text-xs text-muted transition-colors hover:bg-teal/10 hover:text-teal"
    >
      {copied ? '✓' : 'copy'}
    </button>
  )
}

function FormatSelector({ value, onChange }: { value: InputFormat; onChange: (f: InputFormat) => void }) {
  return (
    <div className="flex rounded border border-border bg-bg text-xs font-mono">
      {(Object.keys(FORMAT_LABELS) as InputFormat[]).map(f => (
        <button
          key={f}
          onClick={() => onChange(f)}
          className={`px-2.5 py-1 transition-colors ${
            value === f ? 'bg-surface-hi text-bright' : 'text-muted hover:text-primary'
          }`}
        >
          {FORMAT_LABELS[f]}
        </button>
      ))}
    </div>
  )
}

export function BitwiseCalculator() {
  const [inputA, setInputA] = useState('170')
  const [inputB, setInputB] = useState('240')
  const [formatA, setFormatA] = useState<InputFormat>('dec')
  const [formatB, setFormatB] = useState<InputFormat>('dec')
  const [operator, setOperator] = useState<Operator>('AND')

  const isNotOp    = operator === 'NOT'
  const isShiftOp  = operator === 'LSHIFT' || operator === 'RSHIFT'

  const parsedA = parseInput(inputA, formatA)
  const parsedB = isNotOp ? 0 : parseInput(inputB, isShiftOp ? 'dec' : formatB)
  const result  = compute(parsedA, isNotOp ? null : parsedB, operator)

  const errorA = !!inputA.trim() && parsedA === null
  const errorB = !isNotOp && !!inputB.trim() && parsedB === null

  const opInfo = OPERATORS.find(o => o.value === operator)!

  const resultForms = result !== null ? {
    bin: '0b' + toBin32(result),
    oct: '0o' + result.toString(8),
    dec: result.toString(10),
    hex: '0x' + result.toString(16).toUpperCase().padStart(8, '0'),
  } : null

  return (
    <div className="space-y-6">

      {/* Operator selector */}
      <div>
        <p className="mb-2 font-mono text-xs uppercase tracking-widest text-muted">演算子</p>
        <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-6">
          {OPERATORS.map(op => (
            <button
              key={op.value}
              onClick={() => setOperator(op.value)}
              className={`flex flex-col items-center gap-0.5 rounded-lg border py-2.5 transition-all ${
                operator === op.value
                  ? 'border-teal bg-teal/10 text-teal'
                  : 'border-border text-dim hover:border-border-hi hover:text-primary'
              }`}
            >
              <span className="font-mono text-sm font-bold">{op.label}</span>
              <span className="text-[10px] opacity-60">{op.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Inputs */}
      <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] items-start">
        {/* Input A */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs font-semibold text-dim">入力 A</span>
            <FormatSelector value={formatA} onChange={setFormatA} />
          </div>
          <input
            type="text"
            value={inputA}
            onChange={e => setInputA(e.target.value)}
            placeholder={formatA === 'hex' ? 'FF' : formatA === 'bin' ? '10101010' : '255'}
            className={`w-full rounded-lg border bg-bg px-3 py-2.5 font-mono text-sm text-bright outline-none transition-colors focus:border-teal ${
              errorA ? 'border-red-500/60' : 'border-border'
            }`}
          />
          {errorA && <p className="text-xs text-red-400">無効な入力値</p>}
        </div>

        {/* Operator badge */}
        <div className="flex items-center justify-center pt-7">
          <div className="rounded-lg border border-teal/30 bg-teal/5 px-3 py-2">
            <span className="font-mono text-lg font-bold text-teal">{opInfo.symbol}</span>
          </div>
        </div>

        {/* Input B */}
        <div className={`space-y-1.5 transition-opacity ${isNotOp ? 'pointer-events-none opacity-25' : ''}`}>
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs font-semibold text-dim">
              {isShiftOp ? 'シフト量 (0–31)' : '入力 B'}
            </span>
            {!isShiftOp && <FormatSelector value={formatB} onChange={setFormatB} />}
          </div>
          <input
            type={isShiftOp ? 'number' : 'text'}
            min={isShiftOp ? 0 : undefined}
            max={isShiftOp ? 31 : undefined}
            value={inputB}
            onChange={e => setInputB(e.target.value)}
            disabled={isNotOp}
            placeholder={isShiftOp ? '0–31' : formatB === 'hex' ? 'FF' : formatB === 'bin' ? '11110000' : '255'}
            className={`w-full rounded-lg border bg-bg px-3 py-2.5 font-mono text-sm text-bright outline-none transition-colors focus:border-teal ${
              errorB ? 'border-red-500/60' : 'border-border'
            }`}
          />
          {errorB && <p className="text-xs text-red-400">無効な入力値</p>}
        </div>
      </div>

      {/* Bit Visualizer */}
      <div className="rounded-xl border border-border bg-bg p-5">
        <div className="mb-4 flex items-center justify-between">
          <p className="font-mono text-xs font-semibold uppercase tracking-widest text-muted">32-bit Visualizer</p>
          <div className="flex gap-3 font-mono text-[10px] text-muted">
            {[3,2,1,0].map(byteIdx => (
              <span key={byteIdx}>Byte {byteIdx}</span>
            ))}
          </div>
        </div>
        <div className="space-y-2.5">
          <BitRow value={parsedA !== null ? parsedA >>> 0 : null} label={`A`} />
          {!isNotOp && (
            <BitRow value={parsedB !== null ? (parsedB as number) >>> 0 : null} label="B" />
          )}
          <div className="my-1 flex items-center gap-3">
            <span className="w-16 text-right font-mono text-xs text-border">────</span>
            <div className="h-px flex-1 bg-border" />
          </div>
          <BitRow value={result} label="Result" isResult />
        </div>
      </div>

      {/* Result outputs */}
      {resultForms ? (
        <div>
          <p className="mb-3 font-mono text-xs uppercase tracking-widest text-muted">出力</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {[
              { label: '2進数 BIN', value: resultForms.bin, accent: false },
              { label: '8進数 OCT', value: resultForms.oct, accent: false },
              { label: '10進数 DEC', value: resultForms.dec, accent: true },
              { label: '16進数 HEX', value: resultForms.hex, accent: false },
            ].map(({ label, value, accent }) => (
              <div
                key={label}
                className={`flex items-center justify-between gap-3 rounded-lg border px-4 py-3 ${
                  accent ? 'border-teal/20 bg-teal/5' : 'border-border bg-surface'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <p className="mb-0.5 font-mono text-[10px] uppercase tracking-widest text-muted">{label}</p>
                  <p className={`truncate font-mono text-sm font-semibold ${accent ? 'text-teal' : 'text-bright'}`}>
                    {value}
                  </p>
                </div>
                <CopyButton text={value} />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-surface py-8 text-center">
          <p className="font-mono text-sm text-muted">入力値を入力すると結果が表示されます</p>
        </div>
      )}
    </div>
  )
}
