'use client'

import { useState, useMemo, useEffect } from 'react'
import { holidayName } from '@/lib/jpHolidays'

type Mode = 'diff' | 'add' | 'bizdays' | 'bizadd'

// 日付は「暦の上の日」として扱う。'YYYY-MM-DD' を UTC の 0 時に置き、曜日も UTC で読む。
// ⚠ 以前は new Date('YYYY-MM-DD')（UTC として読まれる）と getDay()（ブラウザの時刻帯で読む）を
// 混ぜていたため、UTC より西の時刻帯では曜日が1日ずれ、営業日の数が変わっていた。
// 「今日」も toISOString（UTC）で作っていたので、日本では朝9時までは前日になっていた。
const DAY = 86400000
const parse = (s: string) => {
  const [y, m, d] = s.split('-').map(Number)
  return Date.UTC(y, m - 1, d)
}
const fmt = (t: number) => new Date(t).toISOString().slice(0, 10)

function today(): string {
  const n = new Date()
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`
}

function dateDiff(a: string, b: string) {
  const ta = parse(a)
  const tb = parse(b)
  const [early, late] = ta <= tb ? [a, b] : [b, a]
  const days = Math.abs(tb - ta) / DAY
  const [y1, m1, d1] = early.split('-').map(Number)
  const [y2, m2, d2] = late.split('-').map(Number)
  // 経過した「満」の月数・年数（12/31→1/1 は0か月）
  const months = (y2 - y1) * 12 + (m2 - m1) - (d2 < d1 ? 1 : 0)
  return { days, weeks: Math.floor(days / 7), months, years: Math.floor(months / 12), earlier: early, later: late }
}

const isWeekend = (t: number) => {
  const w = new Date(t).getUTCDay()
  return w === 0 || w === 6
}

function isBusinessDay(t: number, skipHolidays: boolean) {
  return !isWeekend(t) && !(skipHolidays && holidayName(fmt(t)))
}

function countBizDays(a: string, b: string, skipHolidays: boolean) {
  const ta = Math.min(parse(a), parse(b))
  const tb = Math.max(parse(a), parse(b))
  let biz = 0
  const holidays: string[] = []
  for (let t = ta; t <= tb; t += DAY) {
    if (isBusinessDay(t, skipHolidays)) biz++
    else if (!isWeekend(t)) holidays.push(`${fmt(t)} ${holidayName(fmt(t))}`)
  }
  return { biz, total: (tb - ta) / DAY + 1, start: fmt(ta), end: fmt(tb), holidays }
}

/** 基準日から n 営業日後（負なら前）。基準日そのものは数えない */
function addBizDays(base: string, n: number, skipHolidays: boolean) {
  let t = parse(base)
  const step = n >= 0 ? DAY : -DAY
  let left = Math.abs(n)
  const holidays: string[] = []
  while (left > 0) {
    t += step
    if (isBusinessDay(t, skipHolidays)) left--
    else if (!isWeekend(t)) holidays.push(`${fmt(t)} ${holidayName(fmt(t))}`)
  }
  return { base, n, resultDate: fmt(t), holidays }
}

function formatDate(s: string): string {
  return new Date(parse(s)).toLocaleDateString('ja-JP', {
    timeZone: 'UTC',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  })
}

export function DateCalculator() {
  const [mode, setMode] = useState<Mode>('diff')
  const [diffStart, setDiffStart] = useState('')
  const [diffEnd, setDiffEnd] = useState('')
  const [addBase, setAddBase] = useState('')
  const [addDaysVal, setAddDaysVal] = useState('30')
  const [bizStart, setBizStart] = useState('')
  const [bizEnd, setBizEnd] = useState('')
  const [bizBase, setBizBase] = useState('')
  const [bizN, setBizN] = useState('10')
  const [skipHolidays, setSkipHolidays] = useState(true)
  const [copied, setCopied] = useState(false)

  // 初期値は「今日」から作る（サーバーで描いた日付と食い違わないよう、ブラウザで決める）
  useEffect(() => {
    const t = parse(today())
    setDiffStart(fmt(t - 30 * DAY))
    setDiffEnd(fmt(t))
    setAddBase(fmt(t))
    setBizStart(fmt(t - 14 * DAY))
    setBizEnd(fmt(t))
    setBizBase(fmt(t))
  }, [])

  const result = useMemo(() => {
    if (mode === 'diff') return diffStart && diffEnd ? dateDiff(diffStart, diffEnd) : null
    if (mode === 'add') {
      const n = parseInt(addDaysVal, 10)
      return addBase && !isNaN(n) ? { base: addBase, n, resultDate: fmt(parse(addBase) + n * DAY) } : null
    }
    if (mode === 'bizdays') return bizStart && bizEnd ? countBizDays(bizStart, bizEnd, skipHolidays) : null
    const n = parseInt(bizN, 10)
    return bizBase && !isNaN(n) && Math.abs(n) <= 2000 ? addBizDays(bizBase, n, skipHolidays) : null
  }, [mode, diffStart, diffEnd, addBase, addDaysVal, bizStart, bizEnd, bizBase, bizN, skipHolidays])

  const resultText = useMemo(() => {
    if (!result) return ''
    if (mode === 'diff') {
      const r = result as ReturnType<typeof dateDiff>
      return `${formatDate(r.earlier)} ～ ${formatDate(r.later)}\n${r.days} 日 / ${r.weeks} 週 / 満${r.months} ヶ月 / 満${r.years} 年`
    }
    if (mode === 'add') {
      const r = result as { base: string; n: number; resultDate: string }
      return `${formatDate(r.base)} の ${r.n >= 0 ? r.n + ' 日後' : Math.abs(r.n) + ' 日前'} = ${formatDate(r.resultDate)}`
    }
    if (mode === 'bizdays') {
      const r = result as ReturnType<typeof countBizDays>
      return `${formatDate(r.start)} ～ ${formatDate(r.end)}\n営業日: ${r.biz} 日（全 ${r.total} 日・土日${skipHolidays ? 'と祝日' : ''}を除く）`
    }
    const r = result as ReturnType<typeof addBizDays>
    return `${formatDate(r.base)} の ${Math.abs(r.n)} 営業日${r.n >= 0 ? '後' : '前'} = ${formatDate(r.resultDate)}（土日${skipHolidays ? 'と祝日' : ''}を除く）`
  }, [mode, result, skipHolidays])

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
    { key: 'bizadd', label: 'N営業日後' },
  ]
  const holidays = result && 'holidays' in result ? (result.holidays as string[]) : []

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
      <div className="flex flex-col gap-5 lg:w-80 shrink-0">
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
              <NumberField label="加算日数（負の値で過去）" value={addDaysVal} onChange={setAddDaysVal} />
            </>
          )}
          {mode === 'bizdays' && (
            <>
              <DateField label="開始日" value={bizStart} onChange={setBizStart} />
              <DateField label="終了日" value={bizEnd} onChange={setBizEnd} />
            </>
          )}
          {mode === 'bizadd' && (
            <>
              <DateField label="基準日（この日は数えない）" value={bizBase} onChange={setBizBase} />
              <NumberField label="営業日数（負の値で過去）" value={bizN} onChange={setBizN} />
            </>
          )}
          {(mode === 'bizdays' || mode === 'bizadd') && (
            <label className="flex items-start gap-2 font-mono text-[11px] text-primary">
              <input type="checkbox" checked={skipHolidays} onChange={(e) => setSkipHolidays(e.target.checked)} className="mt-0.5 accent-teal" />
              <span>
                日本の祝日も除く
                <span className="block text-[10px] text-muted">振替休日・国民の休日を含む（2019〜2099年。年末年始などの会社独自の休みは含みません）</span>
              </span>
            </label>
          )}
        </div>
      </div>

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
                    {([['日', r.days], ['週', r.weeks], ['ヶ月（満）', r.months], ['年（満）', r.years]] as [string, number][]).map(([unit, val]) => (
                      <div key={unit} className="flex flex-col items-center rounded-xl border border-border bg-[#080810] py-4 px-2 gap-1">
                        <span className="font-mono text-3xl font-bold text-bright tabular-nums leading-none">{val.toLocaleString()}</span>
                        <span className="font-mono text-[10px] text-muted mt-1">{unit}</span>
                      </div>
                    ))}
                  </div>
                </>
              )
            })()}

            {(mode === 'add' || mode === 'bizadd') && (() => {
              const r = result as { base: string; n: number; resultDate: string }
              const unit = mode === 'add' ? '日' : '営業日'
              return (
                <div className="rounded-xl border border-teal/20 bg-teal/5 p-6 flex flex-col gap-2">
                  <p className="font-mono text-xs text-muted">
                    {formatDate(r.base)} の {Math.abs(r.n)} {unit}{r.n >= 0 ? '後' : '前'}
                  </p>
                  <p className="font-mono text-xl font-bold text-bright leading-snug">{formatDate(r.resultDate)}</p>
                </div>
              )
            })()}

            {mode === 'bizdays' && (() => {
              const r = result as ReturnType<typeof countBizDays>
              return (
                <>
                  <p className="font-mono text-xs text-muted leading-relaxed">
                    {formatDate(r.start)}<br />
                    <span className="text-muted/40">→</span> {formatDate(r.end)}
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col items-center rounded-xl border border-teal/20 bg-teal/5 py-5 px-3 gap-1">
                      <span className="font-mono text-4xl font-bold text-teal tabular-nums leading-none">{r.biz}</span>
                      <span className="font-mono text-[10px] text-muted mt-2 text-center leading-relaxed">営業日<br />（土日{skipHolidays ? '・祝日' : ''}除く）</span>
                    </div>
                    <div className="flex flex-col items-center rounded-xl border border-border bg-[#080810] py-5 px-3 gap-1">
                      <span className="font-mono text-4xl font-bold text-bright tabular-nums leading-none">{r.total}</span>
                      <span className="font-mono text-[10px] text-muted mt-2">総日数（両端を含む）</span>
                    </div>
                  </div>
                </>
              )
            })()}

            {holidays.length > 0 && (
              <p className="font-mono text-[11px] leading-relaxed text-dim">
                除いた祝日（{holidays.length}）：{holidays.slice(0, 12).join('、')}{holidays.length > 12 ? ' …' : ''}
              </p>
            )}

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

function NumberField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="font-mono text-[10px] font-semibold uppercase tracking-widest text-muted">{label}</label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-border bg-[#0a0a10] px-3 py-2.5 font-mono text-sm text-bright outline-none transition-all focus:border-teal"
      />
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
