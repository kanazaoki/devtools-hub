'use client'

import { useState } from 'react'

const LOCALES = [
  { key: 'ja-JP', label: 'ja-JP', flag: '🇯🇵' },
  { key: 'en-US', label: 'en-US', flag: '🇺🇸' },
  { key: 'de-DE', label: 'de-DE', flag: '🇩🇪' },
  { key: 'zh-CN', label: 'zh-CN', flag: '🇨🇳' },
  { key: 'fr-FR', label: 'fr-FR', flag: '🇫🇷' },
  { key: 'ko-KR', label: 'ko-KR', flag: '🇰🇷' },
]

function siUnit(n: number): string {
  const abs = Math.abs(n)
  if (abs >= 1e12) return (n / 1e12).toPrecision(3).replace(/\.?0+$/, '') + 'T'
  if (abs >= 1e9)  return (n / 1e9).toPrecision(3).replace(/\.?0+$/, '') + 'G'
  if (abs >= 1e6)  return (n / 1e6).toPrecision(3).replace(/\.?0+$/, '') + 'M'
  if (abs >= 1e3)  return (n / 1e3).toPrecision(3).replace(/\.?0+$/, '') + 'K'
  return String(n)
}

interface FormatRow {
  label: string
  value: string
  accent: string
}

interface FormatGroup {
  title: string
  rows: FormatRow[]
}

function buildGroups(n: number, locale: string): FormatGroup[] {
  const fmt = (opts: Intl.NumberFormatOptions) => {
    try { return new Intl.NumberFormat(locale, opts).format(n) } catch { return 'N/A' }
  }
  return [
    {
      title: '通貨',
      rows: [
        { label: 'JPY', value: fmt({ style: 'currency', currency: 'JPY' }),            accent: 'text-amber-400' },
        { label: 'USD', value: fmt({ style: 'currency', currency: 'USD' }),            accent: 'text-amber-400' },
        { label: 'EUR', value: fmt({ style: 'currency', currency: 'EUR' }),            accent: 'text-amber-400' },
      ],
    },
    {
      title: '数値',
      rows: [
        { label: 'カンマ区切り', value: fmt({ useGrouping: true }),                    accent: 'text-teal' },
        { label: '整数',         value: fmt({ maximumFractionDigits: 0 }),             accent: 'text-teal' },
        { label: '小数2桁',     value: fmt({ minimumFractionDigits: 2, maximumFractionDigits: 2 }), accent: 'text-teal' },
        { label: 'パーセント',  value: fmt({ style: 'percent', maximumFractionDigits: 4 }),   accent: 'text-teal' },
      ],
    },
    {
      title: '単位・表記',
      rows: [
        { label: 'SI 単位',   value: siUnit(n),                                        accent: 'text-violet-400' },
        { label: 'コンパクト', value: fmt({ notation: 'compact' }),                    accent: 'text-violet-400' },
        { label: '指数表記',  value: fmt({ notation: 'scientific' }),                  accent: 'text-violet-400' },
      ],
    },
  ]
}

export function NumberFormatter() {
  const [input, setInput]   = useState('1234567.89')
  const [locale, setLocale] = useState('ja-JP')
  const [copiedIdx, setCopiedIdx] = useState<string | null>(null)

  const num    = Number(input)
  const isValid = input.trim() !== '' && !isNaN(num) && isFinite(num)
  const groups  = isValid ? buildGroups(num, locale) : []

  const copyRow = (key: string, value: string) => {
    navigator.clipboard.writeText(value).then(() => {
      setCopiedIdx(key); setTimeout(() => setCopiedIdx(null), 1200)
    })
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Input + Locale row */}
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex-1 min-w-[180px]">
          <label className="mb-1.5 block font-mono text-[10px] font-semibold uppercase tracking-widest text-muted">数値</label>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="例: 1234567.89"
            className="w-full rounded-lg border border-border bg-[#060a12] px-4 py-3 font-mono text-xl text-bright outline-none transition-colors focus:border-teal placeholder:text-border tabular-nums"
          />
          {input.trim() !== '' && !isValid && (
            <p className="mt-1.5 text-xs text-red-400">数値として解釈できません</p>
          )}
        </div>
        <div>
          <label className="mb-1.5 block font-mono text-[10px] font-semibold uppercase tracking-widest text-muted">ロケール</label>
          <div className="flex flex-wrap gap-1">
            {LOCALES.map(({ key, label, flag }) => (
              <button
                key={key}
                onClick={() => setLocale(key)}
                className={`rounded border px-2.5 py-1.5 font-mono text-xs transition-colors ${
                  locale === key
                    ? 'border-teal/50 bg-teal/10 text-teal'
                    : 'border-border text-dim hover:border-teal/30 hover:text-primary'
                }`}
              >
                {flag} {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Big display */}
      {isValid && (
        <div className="rounded-lg border border-border bg-[#070d1a] px-5 py-4 flex items-baseline gap-3">
          <span className="font-mono text-[10px] text-muted shrink-0">生の値</span>
          <span className="font-mono text-2xl font-bold text-bright tabular-nums break-all">{num.toString()}</span>
        </div>
      )}

      {/* Format groups */}
      {input.trim() === '' ? (
        <div className="rounded-lg border border-border/50 bg-[#070d1a] px-4 py-10 text-center">
          <p className="font-mono text-xs text-border">数値を入力するとフォーマット一覧が表示されます</p>
        </div>
      ) : !isValid ? (
        <div className="rounded-lg border border-red-400/30 bg-red-400/5 px-4 py-4">
          <p className="text-sm text-red-400">有効な数値を入力してください（例: 1234567.89, -42, 0.000001）</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {groups.map((group) => (
            <div key={group.title} className="rounded-lg border border-border overflow-hidden">
              <div className="border-b border-border bg-[#070d1a] px-4 py-2">
                <p className="font-mono text-[10px] font-semibold uppercase tracking-widest text-muted">{group.title}</p>
              </div>
              <div className="divide-y divide-border/40">
                {group.rows.map((row) => {
                  const key = `${group.title}-${row.label}`
                  const isCopied = copiedIdx === key
                  return (
                    <button
                      key={row.label}
                      onClick={() => copyRow(key, row.value)}
                      className={`w-full flex items-center px-4 py-3 text-left transition-colors hover:bg-white/[0.02] ${isCopied ? 'bg-teal/5' : ''}`}
                    >
                      <span className="font-mono text-[11px] text-muted w-28 shrink-0">{row.label}</span>
                      <span className={`flex-1 font-mono text-base font-semibold tabular-nums ${row.accent}`}>
                        {row.value}
                      </span>
                      <span className={`shrink-0 font-mono text-[10px] transition-colors ${isCopied ? 'text-teal' : 'text-border'}`}>
                        {isCopied ? '✓ コピー' : 'click'}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
