'use client'

import { useState, useCallback } from 'react'

type Mode = 'diff' | 'add' | 'bizdays'

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function today(): string {
  return toDateStr(new Date())
}

function dateDiff(a: string, b: string) {
  const da = new Date(a), db = new Date(b)
  const msPerDay = 86400000
  const diffMs = Math.abs(db.getTime() - da.getTime())
  const days = Math.round(diffMs / msPerDay)
  const weeks = Math.floor(days / 7)
  const months = Math.abs(
    (db.getFullYear() - da.getFullYear()) * 12 + db.getMonth() - da.getMonth()
  )
  const years = Math.abs(db.getFullYear() - da.getFullYear())
  const earlier = da <= db ? a : b
  const later = da <= db ? b : a
  return { days, weeks, months, years, earlier, later }
}

function addDays(base: string, n: number): string {
  const d = new Date(base)
  d.setDate(d.getDate() + n)
  return toDateStr(d)
}

function countBizDays(a: string, b: string): number {
  const da = new Date(a), db = new Date(b)
  const start = da <= db ? da : db
  const end = da <= db ? db : da
  let count = 0
  const cur = new Date(start)
  while (cur <= end) {
    const dow = cur.getDay()
    if (dow !== 0 && dow !== 6) count++
    cur.setDate(cur.getDate() + 1)
  }
  return count
}

function formatDate(s: string): string {
  const d = new Date(s)
  return d.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })
}

export function DateCalculator() {
  const [mode, setMode] = useState<Mode>('diff')

  // diff mode
  const [diffStart, setDiffStart] = useState(() => {
    const d = new Date(); d.setMonth(d.getMonth() - 1); return toDateStr(d)
  })
  const [diffEnd, setDiffEnd] = useState(today)

  // add mode
  const [addBase, setAddBase] = useState(today)
  const [addDaysVal, setAddDaysVal] = useState('30')

  // bizdays mode
  const [bizStart, setBizStart] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 14); return toDateStr(d)
  })
  const [bizEnd, setBizEnd] = useState(today)

  const [copied, setCopied] = useState(false)

  const result = useCallback(() => {
    if (mode === 'diff') {
      if (!diffStart || !diffEnd) return null
      return dateDiff(diffStart, diffEnd)
    }
    if (mode === 'add') {
      if (!addBase) return null
      const n = parseInt(addDaysVal, 10)
      if (isNaN(n)) return null
      const resultDate = addDays(addBase, n)
      return { base: addBase, n, resultDate }
    }
    if (mode === 'bizdays') {
      if (!bizStart || !bizEnd) return null
      const biz = countBizDays(bizStart, bizEnd)
      const { days } = dateDiff(bizStart, bizEnd)
      return { biz, total: days + 1, start: bizStart, end: bizEnd }
    }
    return null
  }, [mode, diffStart, diffEnd, addBase, addDaysVal, bizStart, bizEnd])()

  const resultText = useCallback(() => {
    if (!result) return ''
    if (mode === 'diff') {
      const r = result as ReturnType<typeof dateDiff>
      return `${formatDate(r.earlier)} ～ ${formatDate(r.later)}\n${r.days} 日 / ${r.weeks} 週 / ${r.months} ヶ月 / ${r.years} 年`
    }
    if (mode === 'add') {
      const r = result as { base: string; n: number; resultDate: string }
      return `${formatDate(r.base)} の ${r.n > 0 ? r.n + ' 日後' : Math.abs(r.n) + ' 日前'} = ${formatDate(r.resultDate)}`
    }
    if (mode === 'bizdays') {
      const r = result as { biz: number; total: number; start: string; end: string }
      return `${formatDate(r.start)} ～ ${formatDate(r.end)}\n営業日: ${r.biz} 日（全 ${r.total} 日）`
    }
    return ''
  }, [mode, result])()

  const handleCopy = async () => {
    if (!resultText) return
    await navigator.clipboard.writeText(resultText)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const MODES: { key: Mode; label: string }[] = [
    { key: 'diff', label: '差分計算' },
    { key: 'add', label: '日数加算' },
    { key: 'bizdays', label: '営業日カウント' },
  ]

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
      {/* Left: inputs */}
      <div className="flex flex-col gap-5 lg:w-80 shrink-0">
        {/* Mode tabs */}
        <div className="flex flex-col gap-1">
          {MODES.map(({ key, label }, i) => (
            <button
              key={key}
              onClick={() => { setMode(key); setCopied(false) }}
              className={`flex items-center gap-3 rounded-lg px-4 py-3 text-left transition-all ${mode === key
                ? 'bg-teal/10 border border-teal/30 text-teal'
                : 'border border-transparent text-muted hover:text-dim hover:bg-surface/50'}`}
            >
              <span className={`font-mono text-[10px] tabular-nums ${mode === key ? 'text-teal/50' : 'text-muted/40'}`}>
                0{i + 1}
              </span>
              <span className="text-sm font-medium">{label}</span>
              {mode === key && <span className="ml-auto font-mono text-[10px] text-teal/50">●</span>}
            </button>
          ))}
        </div>

        <div className="h-px bg-border/50" />

        {/* Date inputs */}
        <div className="flex flex-col gap-4">
          {mode === 'diff' && (
            <>
              <DateField label="開始日" value={diffStart} onChange={setDiffStart} />
              <DateField label="終了日" value={diffEnd} onChange={setDiffEnd} />
            </>
          )}
          {mode === 'add' && (
            <>
              <DateField label="基準日" value={addBase} onChange={setAddBase} />
              <div className="flex flex-col gap-1.5">
                <label className="font-mono text-[10px] font-semibold uppercase tracking-widest text-muted">
                  加算日数（負の値で過去）
                </label>
                <input
                  type="number"
                  value={addDaysVal}
                  onChange={(e) => setAddDaysVal(e.target.value)}
                  className="w-full rounded-lg border border-border bg-[#0a0a10] px-3 py-2.5 font-mono text-sm text-bright outline-none transition-all focus:border-teal"
                />
              </div>
            </>
          )}
          {mode === 'bizdays' && (
            <>
              <DateField label="開始日" value={bizStart} onChange={setBizStart} />
              <DateField label="終了日" value={bizEnd} onChange={setBizEnd} />
            </>
          )}
        </div>
      </div>

      {/* Right: result */}
      <div className="flex flex-1 flex-col gap-4 min-w-0">
        <p className="font-mono text-[10px] font-semibold uppercase tracking-widest text-muted">結果</p>

        {result ? (
          <div className="flex flex-col gap-4">
            {mode === 'diff' && (() => {
              const r = result as ReturnType<typeof dateDiff>
              return (
                <>
                  <p className="font-mono text-xs text-muted leading-relaxed">
                    {formatDate(r.earlier)}<br />
                    <span className="text-muted/40">→</span> {formatDate(r.later)}
                  </p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {([['日', r.days], ['週', r.weeks], ['ヶ月', r.months], ['年', r.years]] as [string, number][]).map(([unit, val]) => (
                      <div key={unit} className="flex flex-col items-center rounded-xl border border-border bg-[#080810] py-4 px-2 gap-1">
                        <span className="font-mono text-3xl font-bold text-bright tabular-nums leading-none">{val.toLocaleString()}</span>
                        <span className="font-mono text-[10px] text-muted mt-1">{unit}</span>
                      </div>
                    ))}
                  </div>
                </>
              )
            })()}

            {mode === 'add' && (() => {
              const r = result as { base: string; n: number; resultDate: string }
              const n = r.n
              return (
                <div className="rounded-xl border border-teal/20 bg-teal/5 p-6 flex flex-col gap-2">
                  <p className="font-mono text-xs text-muted">
                    {formatDate(r.base)} の {n >= 0 ? `${n} 日後` : `${Math.abs(n)} 日前`}
                  </p>
                  <p className="font-mono text-xl font-bold text-bright leading-snug">{formatDate(r.resultDate)}</p>
                </div>
              )
            })()}

            {mode === 'bizdays' && (() => {
              const r = result as { biz: number; total: number; start: string; end: string }
              return (
                <>
                  <p className="font-mono text-xs text-muted leading-relaxed">
                    {formatDate(r.start)}<br />
                    <span className="text-muted/40">→</span> {formatDate(r.end)}
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col items-center rounded-xl border border-teal/20 bg-teal/5 py-5 px-3 gap-1">
                      <span className="font-mono text-4xl font-bold text-teal tabular-nums leading-none">{r.biz}</span>
                      <span className="font-mono text-[10px] text-muted mt-2 text-center leading-relaxed">営業日<br />（土日除く）</span>
                    </div>
                    <div className="flex flex-col items-center rounded-xl border border-border bg-[#080810] py-5 px-3 gap-1">
                      <span className="font-mono text-4xl font-bold text-bright tabular-nums leading-none">{r.total}</span>
                      <span className="font-mono text-[10px] text-muted mt-2">総日数</span>
                    </div>
                  </div>
                </>
              )
            })()}

            <button
              onClick={handleCopy}
              className={`self-start rounded-lg border px-3 py-1.5 font-mono text-xs transition-all ${copied
                ? 'border-teal/40 bg-teal/10 text-teal'
                : 'border-border text-muted hover:border-border-hi hover:text-dim'}`}
            >
              {copied ? '✓ コピー済み' : '結果をコピー'}
            </button>
          </div>
        ) : (
          <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-border/50 py-16">
            <p className="font-mono text-xs text-muted/40">日付を選択すると結果が表示されます</p>
          </div>
        )}
      </div>
    </div>
  )
}

function DateField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="font-mono text-[10px] font-semibold uppercase tracking-widest text-muted">{label}</label>
      <div className="flex gap-2">
        <input
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 rounded-lg border border-border bg-[#0a0a10] px-3 py-2.5 font-mono text-sm text-bright outline-none transition-all focus:border-teal colorscheme-dark"
          style={{ colorScheme: 'dark' }}
        />
        <button
          onClick={() => onChange(today())}
          className="rounded-lg border border-border px-3 py-2.5 font-mono text-[11px] text-muted transition-all hover:border-teal/30 hover:text-teal whitespace-nowrap"
        >
          今日
        </button>
      </div>
    </div>
  )
}
