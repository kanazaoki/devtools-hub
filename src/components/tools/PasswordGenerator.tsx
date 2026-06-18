'use client'

import { useState, useCallback, useId } from 'react'

// ── Character sets ────────────────────────────────────────────────────────────

const CHARSET = {
  upper:  'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  lower:  'abcdefghijklmnopqrstuvwxyz',
  digits: '0123456789',
  symbols: '!@#$%^&*()-_=+[]{}|;:,.<>?',
} as const

type CharKey = keyof typeof CHARSET

// ── Strength ──────────────────────────────────────────────────────────────────

type Strength = 'Weak' | 'Fair' | 'Strong' | 'Very Strong'

function calcStrength(password: string, activeCount: number): Strength {
  const len = password.length
  if (len === 0) return 'Weak'
  if (len >= 16 && activeCount >= 4) return 'Very Strong'
  if ((len >= 12 && activeCount >= 3) || (len >= 16 && activeCount >= 2)) return 'Strong'
  if (len >= 8 && activeCount >= 2) return 'Fair'
  return 'Weak'
}

const STRENGTH_COLOR: Record<Strength, string> = {
  'Weak':        'text-red-400',
  'Fair':        'text-yellow-400',
  'Strong':      'text-teal/80',
  'Very Strong': 'text-teal',
}

const STRENGTH_BAR_WIDTH: Record<Strength, string> = {
  'Weak':        'w-1/4',
  'Fair':        'w-2/4',
  'Strong':      'w-3/4',
  'Very Strong': 'w-full',
}

const STRENGTH_BAR_COLOR: Record<Strength, string> = {
  'Weak':        'bg-red-400',
  'Fair':        'bg-yellow-400',
  'Strong':      'bg-teal/80',
  'Very Strong': 'bg-teal',
}

// ── Password generator ────────────────────────────────────────────────────────

function generatePassword(
  options: Record<CharKey, boolean>,
  length: number,
): string {
  const pool = (Object.keys(CHARSET) as CharKey[])
    .filter((k) => options[k])
    .map((k) => CHARSET[k])
    .join('')
  if (!pool) return ''

  const arr = new Uint32Array(length)
  crypto.getRandomValues(arr)
  return Array.from(arr, (n) => pool[n % pool.length]).join('')
}

// ── CopyButton ────────────────────────────────────────────────────────────────

function CopyButton({ text, label = 'Copy', size = 'sm' }: { text: string; label?: string; size?: 'sm' | 'xs' }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = useCallback(async () => {
    if (!text) return
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }, [text])
  const base = size === 'xs'
    ? 'rounded border px-2 py-0.5 font-mono text-[10px]'
    : 'rounded border px-2.5 py-1 font-mono text-[10px]'
  return (
    <button
      onClick={handleCopy}
      disabled={!text}
      className={`${base} transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed ${
        copied
          ? 'border-teal/60 bg-teal/10 text-teal'
          : 'border-border text-muted hover:border-border-hi hover:text-dim'
      }`}
    >
      {copied ? 'Copied!' : label}
    </button>
  )
}

// ── Checkbox ──────────────────────────────────────────────────────────────────

function CharCheckbox({
  id, label, checked, onChange,
}: {
  id: string; label: string; checked: boolean; onChange: (v: boolean) => void
}) {
  return (
    <label
      htmlFor={id}
      className="flex cursor-pointer items-center gap-2 rounded border border-border px-3 py-2 transition-colors hover:border-border-hi"
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-3.5 w-3.5 accent-teal"
      />
      <span className="font-mono text-xs text-primary">{label}</span>
    </label>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function PasswordGenerator() {
  const uid = useId()

  const [options, setOptions] = useState<Record<CharKey, boolean>>({
    upper: true,
    lower: true,
    digits: true,
    symbols: false,
  })
  const [length, setLength] = useState(16)
  const [password, setPassword] = useState('')
  const [bulkCount, setBulkCount] = useState(5)
  const [bulkList, setBulkList] = useState<string[]>([])

  const activeCount = (Object.keys(options) as CharKey[]).filter((k) => options[k]).length
  const canGenerate = activeCount > 0
  const strength = calcStrength(password, activeCount)

  const handleGenerate = useCallback(() => {
    if (!canGenerate) return
    setPassword(generatePassword(options, length))
  }, [options, length, canGenerate])

  const handleBulk = useCallback(() => {
    if (!canGenerate) return
    const count = Math.max(1, Math.min(20, bulkCount))
    setBulkList(Array.from({ length: count }, () => generatePassword(options, length)))
  }, [options, length, bulkCount, canGenerate])

  const clampBulk = (v: number) => Math.max(1, Math.min(20, v))

  const setOption = (key: CharKey, val: boolean) =>
    setOptions((prev) => ({ ...prev, [key]: val }))

  return (
    <div className="space-y-6">

      {/* ── Character options ── */}
      <div className="space-y-2">
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted">文字種</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <CharCheckbox id={`${uid}-upper`}   label="大文字 A–Z"  checked={options.upper}   onChange={(v) => setOption('upper', v)} />
          <CharCheckbox id={`${uid}-lower`}   label="小文字 a–z"  checked={options.lower}   onChange={(v) => setOption('lower', v)} />
          <CharCheckbox id={`${uid}-digits`}  label="数字 0–9"    checked={options.digits}  onChange={(v) => setOption('digits', v)} />
          <CharCheckbox id={`${uid}-symbols`} label="記号 !@#…"   checked={options.symbols} onChange={(v) => setOption('symbols', v)} />
        </div>
        {!canGenerate && (
          <p className="font-mono text-[11px] text-red-400">文字種を1つ以上選択してください</p>
        )}
      </div>

      {/* ── Length ── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted">長さ</p>
          <span className="font-mono text-sm font-bold text-teal">{length}</span>
        </div>
        <input
          type="range"
          min={4}
          max={64}
          value={length}
          onChange={(e) => setLength(Number(e.target.value))}
          className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-border accent-teal"
        />
        <div className="flex justify-between font-mono text-[9px] text-muted/50">
          <span>4</span>
          <span>64</span>
        </div>
      </div>

      {/* ── Generated password ── */}
      <div className="space-y-2">
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted">パスワード</p>

        <div className={`rounded-md border px-4 py-3.5 ${password ? 'border-border-hi bg-bg' : 'border-border bg-bg'}`}>
          {password ? (
            <code className="block break-all font-mono text-sm leading-relaxed tracking-wide text-bright select-all">
              {password}
            </code>
          ) : (
            <p className="font-mono text-[11px] uppercase tracking-widest text-muted/30">
              — Generate をクリック —
            </p>
          )}
        </div>

        {/* Strength meter */}
        {password && (
          <div className="space-y-1">
            <div className="h-1 w-full rounded-full bg-border overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${STRENGTH_BAR_WIDTH[strength]} ${STRENGTH_BAR_COLOR[strength]}`}
              />
            </div>
            <p className={`font-mono text-[10px] ${STRENGTH_COLOR[strength]}`}>{strength}</p>
          </div>
        )}

        <div className="flex items-center gap-2">
          <button
            onClick={handleGenerate}
            disabled={!canGenerate}
            className="rounded-md border border-teal/40 bg-teal/10 px-5 py-2 font-mono text-xs font-semibold text-teal transition-all hover:bg-teal/16 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Generate
          </button>
          <CopyButton text={password} />
        </div>
      </div>

      {/* ── Bulk generate ── */}
      <div className="space-y-2">
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted">複数生成</p>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="number"
            min={1}
            max={20}
            value={bulkCount}
            onChange={(e) => setBulkCount(clampBulk(Number(e.target.value)))}
            className="w-20 rounded border border-border bg-bg px-2.5 py-1.5 font-mono text-xs text-primary outline-none focus:border-border-hi transition-colors"
          />
          <span className="font-mono text-[11px] text-muted">件</span>
          <button
            onClick={handleBulk}
            disabled={!canGenerate}
            className="rounded border border-border px-3 py-1.5 font-mono text-xs text-muted transition-all hover:border-border-hi hover:text-dim active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            複数生成
          </button>
          {bulkList.length > 0 && (
            <CopyButton text={bulkList.join('\n')} label="全コピー" />
          )}
        </div>

        {bulkList.length > 0 && (
          <div className="overflow-hidden rounded-md border border-border bg-bg">
            <div className="max-h-44 overflow-y-auto">
              {bulkList.map((pw, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-2 px-3 py-1.5 ${i % 2 === 0 ? 'bg-transparent' : 'bg-white/[0.015]'}`}
                >
                  <span className="w-5 shrink-0 font-mono text-[9px] text-muted/35 text-right tabular-nums">{i + 1}</span>
                  <code className="flex-1 font-mono text-[11px] text-dim">{pw}</code>
                  <CopyButton text={pw} size="xs" />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
