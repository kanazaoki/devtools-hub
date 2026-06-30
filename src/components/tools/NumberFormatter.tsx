'use client'

import { useState } from 'react'

const LOCALES = [
  { key: 'ja-JP', label: 'ja-JP（日本語）' },
  { key: 'en-US', label: 'en-US（英語）' },
  { key: 'de-DE', label: 'de-DE（ドイツ語）' },
  { key: 'zh-CN', label: 'zh-CN（中国語）' },
  { key: 'fr-FR', label: 'fr-FR（フランス語）' },
  { key: 'ko-KR', label: 'ko-KR（韓国語）' },
]

function siUnit(n: number): string {
  const abs = Math.abs(n)
  if (abs >= 1e12) return (n / 1e12).toPrecision(3).replace(/\.?0+$/, '') + 'T'
  if (abs >= 1e9) return (n / 1e9).toPrecision(3).replace(/\.?0+$/, '') + 'G'
  if (abs >= 1e6) return (n / 1e6).toPrecision(3).replace(/\.?0+$/, '') + 'M'
  if (abs >= 1e3) return (n / 1e3).toPrecision(3).replace(/\.?0+$/, '') + 'K'
  return String(n)
}

interface FormatRow {
  label: string
  value: string
}

function buildRows(n: number, locale: string): FormatRow[] {
  const fmt = (opts: Intl.NumberFormatOptions) => {
    try { return new Intl.NumberFormat(locale, opts).format(n) } catch { return 'N/A' }
  }
  return [
    { label: 'カンマ区切り', value: fmt({ useGrouping: true }) },
    { label: '通貨 JPY', value: fmt({ style: 'currency', currency: 'JPY' }) },
    { label: '通貨 USD', value: fmt({ style: 'currency', currency: 'USD' }) },
    { label: '通貨 EUR', value: fmt({ style: 'currency', currency: 'EUR' }) },
    { label: 'パーセント', value: fmt({ style: 'percent', maximumFractionDigits: 4 }) },
    { label: 'SI 単位', value: siUnit(n) },
    { label: '指数表記', value: fmt({ notation: 'scientific' }) },
    { label: 'コンパクト', value: fmt({ notation: 'compact' }) },
    { label: '整数（切り捨て）', value: fmt({ maximumFractionDigits: 0 }) },
    { label: '小数2桁固定', value: fmt({ minimumFractionDigits: 2, maximumFractionDigits: 2 }) },
  ]
}

export function NumberFormatter() {
  const [input, setInput] = useState('1234567.89')
  const [locale, setLocale] = useState('ja-JP')
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)

  const num = Number(input)
  const isValid = input.trim() !== '' && !isNaN(num)

  const rows: FormatRow[] = isValid ? buildRows(num, locale) : []

  const copyRow = (index: number, value: string) => {
    navigator.clipboard.writeText(value).then(() => {
      setCopiedIndex(index)
      setTimeout(() => setCopiedIndex(null), 1200)
    })
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Controls */}
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex-1 min-w-[200px]">
          <label className="mb-1.5 block font-mono text-[10px] font-semibold uppercase tracking-widest text-muted">数値入力</label>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="例: 1234567.89"
            className="w-full rounded border border-border bg-[#070d1a] px-3 py-2.5 font-mono text-lg text-bright outline-none transition-colors focus:border-teal placeholder:text-border"
          />
          {input.trim() !== '' && !isValid && (
            <p className="mt-1.5 text-xs text-red-400">数値として解釈できません</p>
          )}
        </div>
        <div className="min-w-[180px]">
          <label className="mb-1.5 block font-mono text-[10px] font-semibold uppercase tracking-widest text-muted">ロケール</label>
          <select
            value={locale}
            onChange={(e) => setLocale(e.target.value)}
            className="w-full rounded border border-border bg-[#070d1a] px-3 py-2.5 font-mono text-sm text-bright outline-none transition-colors focus:border-teal cursor-pointer"
          >
            {LOCALES.map(({ key, label }) => (
              <option key={key} value={key} className="bg-[#070d1a]">{label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Results */}
      {input.trim() === '' ? (
        <div className="rounded border border-border bg-[#070d1a] px-4 py-8 text-center">
          <p className="font-mono text-xs text-border">数値を入力するとフォーマット一覧が表示されます</p>
        </div>
      ) : !isValid ? (
        <div className="rounded border border-red-400/30 bg-red-400/5 px-4 py-4">
          <p className="text-sm text-red-400">有効な数値を入力してください（例: 1234567.89, -42, 0.000001）</p>
        </div>
      ) : (
        <div className="rounded border border-border overflow-hidden">
          <div className="border-b border-border px-4 py-2.5">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-widest text-muted">
              フォーマット一覧 — クリックでコピー
            </p>
          </div>
          <div className="divide-y divide-border/50">
            {rows.map((row, i) => (
              <button
                key={row.label}
                onClick={() => copyRow(i, row.value)}
                className={`w-full flex items-center justify-between px-4 py-3 text-left transition-colors hover:bg-teal/5 ${
                  copiedIndex === i ? 'bg-teal/10' : ''
                }`}
              >
                <span className="font-mono text-[11px] text-muted w-36 shrink-0">{row.label}</span>
                <span className="flex-1 font-mono text-sm font-semibold text-bright tabular-nums text-right pr-3">
                  {row.value}
                </span>
                <span className={`shrink-0 font-mono text-[10px] w-12 text-right transition-colors ${
                  copiedIndex === i ? 'text-teal' : 'text-border'
                }`}>
                  {copiedIndex === i ? '✓ コピー' : 'クリック'}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
