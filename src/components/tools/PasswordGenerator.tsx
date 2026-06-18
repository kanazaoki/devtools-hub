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

// ── CharToggle — button-style toggle chip ─────────────────────────────────────

const CHAR_META: { key: CharKey; abbr: string; sub: string }[] = [
  { key: 'upper',   abbr: 'A–Z', sub: '大文字' },
  { key: 'lower',   abbr: 'a–z', sub: '小文字' },
  { key: 'digits',  abbr: '0–9', sub: '数字'   },
  { key: 'symbols', abbr: '!@#', sub: '記号'   },
]

function CharToggle({
  checked, onChange, abbr, sub,
}: {
  checked: boolean; onChange: (v: boolean) => void; abbr: string; sub: string
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`flex flex-col items-center gap-0.5 rounded-md border py-2.5 transition-all duration-100 ${
        checked
          ? 'border-teal/35 bg-teal/8 text-teal'
          : 'border-border bg-surface text-muted hover:border-border-hi hover:text-dim'
      }`}
    >
      <span className={`font-mono text-sm font-bold tracking-tight ${checked ? 'text-teal' : 'text-dim'}`}>{abbr}</span>
      <span className={`font-mono text-[9px] uppercase tracking-widest ${checked ? 'text-teal/60' : 'text-muted/50'}`}>{sub}</span>
      {checked && <span className="mt-0.5 h-0.5 w-4 rounded-full bg-teal" />}
    </button>
  )
}

// ── Strength segments ─────────────────────────────────────────────────────────

const STRENGTH_SEGMENTS: Record<Strength, number> = {
  'Weak': 1, 'Fair': 2, 'Strong': 3, 'Very Strong': 4,
}
const STRENGTH_SEG_COLOR: Record<Strength, string> = {
  'Weak':        'bg-red-400',
  'Fair':        'bg-yellow-400',
  'Strong':      'bg-teal/80',
  'Very Strong': 'bg-teal',
}
const STRENGTH_LABEL_COLOR: Record<Strength, string> = {
  'Weak':        'text-red-400',
  'Fair':        'text-yellow-400',
  'Strong':      'text-teal/80',
  'Very Strong': 'text-teal',
}

// ── Main component ────────────────────────────────────────────────────────────

export function PasswordGenerator() {
  const [options, setOptions] = useState<Record<CharKey, boolean>>({
    upper: true, lower: true, digits: true, symbols: false,
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

  // Slider track fill percentage
  const fillPct = Math.round(((length - 4) / (64 - 4)) * 100)
  const sliderStyle = {
    background: `linear-gradient(to right, var(--teal) 0%, var(--teal) ${fillPct}%, var(--border) ${fillPct}%, var(--border) 100%)`,
  }

  return (
    <div className="space-y-5">

      {/* ── Config block: char type + length ── */}
      <div className="space-y-4">

        {/* Char toggles */}
        <div>
          <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-muted">文字種</p>
          <div className="grid grid-cols-4 gap-2">
            {CHAR_META.map(({ key, abbr, sub }) => (
              <CharToggle
                key={key}
                checked={options[key]}
                onChange={(v) => setOption(key, v)}
                abbr={abbr}
                sub={sub}
              />
            ))}
          </div>
          {!canGenerate && (
            <p className="mt-1.5 font-mono text-[11px] text-red-400">文字種を1つ以上選択してください</p>
          )}
        </div>

        {/* Length slider */}
        <div>
          <div className="mb-2 flex items-baseline justify-between">
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted">長さ</p>
            <div className="flex items-baseline gap-1">
              <span className="font-mono text-xl font-bold tabular-nums text-teal">{length}</span>
              <span className="font-mono text-[9px] text-muted/60">文字</span>
            </div>
          </div>
          <input
            type="range"
            min={4}
            max={64}
            value={length}
            onChange={(e) => setLength(Number(e.target.value))}
            style={sliderStyle}
            className="h-1 w-full cursor-pointer appearance-none rounded-full [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-teal [&::-webkit-slider-thumb]:shadow-[0_0_0_2px_rgba(0,200,150,0.25)]"
          />
          <div className="mt-1 flex justify-between font-mono text-[9px] text-muted/40">
            <span>4</span><span>16</span><span>32</span><span>48</span><span>64</span>
          </div>
        </div>
      </div>

      {/* ── Separator ── */}
      <div className="border-t border-border" />

      {/* ── Password output ── */}
      <div className="space-y-2.5">
        <div
          className={`rounded-md border px-4 py-4 transition-colors duration-200 ${
            password ? 'border-teal/25 bg-bg' : 'border-border bg-bg'
          }`}
        >
          {password ? (
            <code className="block break-all font-mono text-sm leading-relaxed tracking-wide text-bright select-all">
              {password}
            </code>
          ) : (
            <p className="font-mono text-[11px] uppercase tracking-widest text-muted/25">
              — Generate をクリック —
            </p>
          )}
        </div>

        {/* Strength: 4-segment bar */}
        {password && (
          <div className="flex items-center gap-3">
            <div className="flex flex-1 gap-1">
              {[1, 2, 3, 4].map((seg) => (
                <div
                  key={seg}
                  className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                    seg <= STRENGTH_SEGMENTS[strength]
                      ? STRENGTH_SEG_COLOR[strength]
                      : 'bg-border'
                  }`}
                />
              ))}
            </div>
            <span className={`shrink-0 font-mono text-[10px] tabular-nums ${STRENGTH_LABEL_COLOR[strength]}`}>
              {strength}
            </span>
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
