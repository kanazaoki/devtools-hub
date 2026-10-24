'use client'

import { useState, useCallback, useEffect } from 'react'

// ── Types ─────────────────────────────────────────────────────────────────────

type FieldKey = 'minute' | 'hour' | 'day' | 'month' | 'weekday'
type CronFields = Record<FieldKey, string>

// ── Validation ────────────────────────────────────────────────────────────────

// 1つのフィールドを、当てはまる値の集合にする。
// 対応：* ／ 数値 ／ a-b ／ */n ／ a-b/n ／ a/n ／ それらのカンマ区切り ／ JAN〜DEC・SUN〜SAT
// ⚠ 以前は */n を「n で割り切れる値」として扱っていたため、1 から始まる日・月で
// */2 が 2,4,6…、*/3 が 3,6,9,12 になっていた（正しくは 1,3,5… と 1,4,7,10）
const NAMES: Record<string, number> = {
  JAN: 1, FEB: 2, MAR: 3, APR: 4, MAY: 5, JUN: 6, JUL: 7, AUG: 8, SEP: 9, OCT: 10, NOV: 11, DEC: 12,
  SUN: 0, MON: 1, TUE: 2, WED: 3, THU: 4, FRI: 5, SAT: 6,
}

function parseField(val: string, min: number, max: number): Set<number> | null {
  const out = new Set<number>()
  const num = (s: string) => {
    const n = /^\d+$/.test(s) ? parseInt(s, 10) : NAMES[s.toUpperCase()]
    return n === undefined || n < min || n > max ? null : n
  }
  for (const part of val.split(',')) {
    const m = /^(\*|[A-Za-z0-9]+(?:-[A-Za-z0-9]+)?)(?:\/(\d+))?$/.exec(part)
    if (!m) return null
    const step = m[2] ? parseInt(m[2], 10) : 1
    if (step < 1) return null
    let lo = min
    let hi = max
    if (m[1] !== '*') {
      const [a, b] = m[1].split('-')
      const na = num(a)
      if (na === null) return null
      lo = na
      // 「a/n」は a から最大値まで n おき、「a」だけなら a のみ
      hi = b !== undefined ? (num(b) ?? -1) : m[2] ? max : na
      if (hi < lo) return null
    }
    for (let n = lo; n <= hi; n += step) out.add(n)
  }
  return out
}

interface ParsedCron {
  minute: Set<number>
  hour: Set<number>
  day: Set<number>
  month: Set<number>
  weekday: Set<number>
  /** 日と曜日の両方を指定しているか（このときはどちらかに当てはまれば実行＝OR） */
  dayOr: boolean
}

function parseFields(f: CronFields): ParsedCron | null {
  const minute = parseField(f.minute, 0, 59)
  const hour = parseField(f.hour, 0, 23)
  const day = parseField(f.day, 1, 31)
  const month = parseField(f.month, 1, 12)
  // 曜日は 0〜7 を受け付け、7 は 0（日曜）として扱う
  const wd = parseField(f.weekday, 0, 7)
  if (!minute || !hour || !day || !month || !wd) return null
  const weekday = new Set([...wd].map((n) => n % 7))
  const dayOr = !f.day.startsWith('*') && !f.weekday.startsWith('*')
  return { minute, hour, day, month, weekday, dayOr }
}

function parseCronExpression(expr: string): CronFields | null {
  const parts = expr.trim().split(/\s+/)
  if (parts.length !== 5) return null
  const [minute, hour, day, month, weekday] = parts
  const f = { minute, hour, day, month, weekday }
  return parseFields(f) ? f : null
}

function fieldsToExpr(f: CronFields): string {
  return `${f.minute} ${f.hour} ${f.day} ${f.month} ${f.weekday}`
}

// ── Description ───────────────────────────────────────────────────────────────


// 各フィールドを集合として読み、日本語の説明を作る。
// ⚠ 以前は形を数通りだけ見分けていたため、0 9 * * 1-5 が「毎日」、0 0 1 */3 * が「毎年 1日」になっていた
function describeExpression(f: CronFields): string {
  const p = parseFields(f)
  if (!p) return ''
  const sorted = (s: Set<number>) => [...s].sort((a, b) => a - b)
  // 連続する値は「1〜5」にまとめる
  const list = (s: Set<number>, fmt: (n: number) => string = String) => {
    const v = sorted(s)
    const out: string[] = []
    for (let i = 0; i < v.length; i++) {
      let j = i
      while (j + 1 < v.length && v[j + 1] === v[j] + 1) j++
      out.push(j - i >= 2 ? `${fmt(v[i])}〜${fmt(v[j])}` : v.slice(i, j + 1).map(fmt).join('・'))
      i = j
    }
    return out.join('・')
  }
  const stepOf = (val: string) => /^\*\/(\d+)$/.exec(val)?.[1]
  const wd = (n: number) => '日月火水木金土'[n]
  const pad = (n: number) => String(n).padStart(2, '0')

  const monthText = f.month === '*' ? '' : stepOf(f.month) ? `${list(p.month, (n) => `${n}月`)}` : `${list(p.month)}月`
  const dayText = f.day === '*' ? '' : stepOf(f.day) ? `${stepOf(f.day)}日ごと（1日から。月が変わると1日に戻る）` : `${list(p.day)}日`
  const wdText = f.weekday === '*' ? '' : `${list(p.weekday, wd)}曜日`
  let when: string
  if (p.dayOr) when = `${dayText} と ${wdText}（どちらかに当てはまる日）`
  else when = dayText || wdText || (monthText ? '' : '毎日')
  const datePart = [monthText ? `${monthText}の` : '', when].join('')

  const mStep = stepOf(f.minute)
  const hStep = stepOf(f.hour)
  const oneMin = p.minute.size === 1 ? sorted(p.minute)[0] : null
  const oneHour = p.hour.size === 1 ? sorted(p.hour)[0] : null
  let time: string
  if (oneMin !== null && oneHour !== null) time = `${pad(oneHour)}:${pad(oneMin)}`
  else if (f.minute === '*' && f.hour === '*') time = '毎分'
  else if (mStep && f.hour === '*') time = `${mStep}分ごと`
  else if (oneMin !== null && f.hour === '*') time = `毎時 ${oneMin}分`
  else if (oneMin !== null && hStep) time = `${hStep}時間ごと（${list(p.hour)}時）の ${oneMin}分`
  else if (oneMin !== null) time = `${list(p.hour)}時 の ${oneMin}分`
  else time = `${f.hour === '*' ? '毎時' : `${list(p.hour)}時`} の ${mStep ? `${mStep}分ごと` : `${list(p.minute)}分`}`

  return `${datePart} ${time} に実行`.trim()
}

// ── Next executions ───────────────────────────────────────────────────────────

// ⚠ 日と曜日を両方指定すると、標準の cron は「どちらかに当てはまる日」に実行する（OR）。
// 以前は両方に当てはまる日だけを数えていたため、0 0 13 * 5 が「13日の金曜日」だけになっていた
export function getNextExecutions(f: CronFields, count = 5, from = new Date()): Date[] {
  const p = parseFields(f)
  if (!p) return []
  const results: Date[] = []
  const d = new Date(from)
  d.setSeconds(0, 0)
  d.setMinutes(d.getMinutes() + 1)
  for (let i = 0; i < 2 * 525_600 && results.length < count; i++) {
    const dayOk = p.dayOr
      ? p.day.has(d.getDate()) || p.weekday.has(d.getDay())
      : p.day.has(d.getDate()) && p.weekday.has(d.getDay())
    if (p.month.has(d.getMonth() + 1) && dayOk && p.hour.has(d.getHours()) && p.minute.has(d.getMinutes())) {
      results.push(new Date(d))
    }
    d.setMinutes(d.getMinutes() + 1)
  }
  return results
}

function formatDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  const wday = ['日', '月', '火', '水', '木', '金', '土'][d.getDay()]
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())}（${wday}）${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// ── Field configs ─────────────────────────────────────────────────────────────

type FieldConfig = {
  key: FieldKey
  label: string
  min: number
  max: number
  labelFn?: (n: number) => string
}

const FIELD_CONFIGS: FieldConfig[] = [
  { key: 'minute',  label: '分',  min: 0,  max: 59 },
  { key: 'hour',    label: '時',  min: 0,  max: 23 },
  { key: 'day',     label: '日',  min: 1,  max: 31 },
  { key: 'month',   label: '月',  min: 1,  max: 12, labelFn: (n) => `${n}月` },
  { key: 'weekday', label: '曜日', min: 0, max: 6,  labelFn: (n) => ['日', '月', '火', '水', '木', '金', '土'][n] ?? String(n) },
]

// ── Presets ───────────────────────────────────────────────────────────────────

const PRESETS: { label: string; expr: string }[] = [
  { label: '毎分',  expr: '* * * * *'   },
  { label: '毎時',  expr: '0 * * * *'   },
  { label: '毎日',  expr: '0 9 * * *'   },
  { label: '毎週',  expr: '0 9 * * 1'   },
  { label: '毎月',  expr: '0 9 1 * *'   },
]

// ── FieldSelect ───────────────────────────────────────────────────────────────

function FieldSelect({
  config, value, onChange, isLast,
}: {
  config: FieldConfig
  value: string
  onChange: (v: string) => void
  isLast?: boolean
}) {
  const isSimple = value === '*' || /^\d+$/.test(value)
  const displayValue = isSimple ? value : '*'
  const isAny = value === '*'

  const options = ['*', ...Array.from(
    { length: config.max - config.min + 1 },
    (_, i) => String(i + config.min)
  )]

  return (
    <div className={`flex flex-1 flex-col gap-2 px-3 py-3 ${isLast ? '' : 'border-r border-border'}`}>
      <span className="font-mono text-[9px] uppercase tracking-widest text-muted">{config.label}</span>
      <select
        value={displayValue}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded border border-border bg-bg px-1.5 py-1 font-mono text-[10px] text-primary outline-none focus:border-border-hi transition-colors"
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt === '*'
              ? '* すべて'
              : config.labelFn
                ? config.labelFn(parseInt(opt, 10))
                : opt}
          </option>
        ))}
      </select>
      <span className={`font-mono text-base font-bold tabular-nums leading-none ${isAny ? 'text-muted/40' : 'text-teal'}`}>
        {value}
      </span>
    </div>
  )
}

// ── CopyButton ────────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }, [text])
  return (
    <button
      onClick={handleCopy}
      className={`rounded border px-3 py-1.5 font-mono text-[10px] transition-all duration-150 ${
        copied
          ? 'border-teal/60 bg-teal/10 text-teal'
          : 'border-border text-muted hover:border-border-hi hover:text-dim'
      }`}
    >
      {copied ? 'Copied!' : 'Copy'}
    </button>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

const DEFAULT_FIELDS: CronFields = { minute: '*', hour: '*', day: '*', month: '*', weekday: '*' }

export function CronBuilder() {
  const [fields, setFields]       = useState<CronFields>(DEFAULT_FIELDS)
  const [cronInput, setCronInput] = useState('* * * * *')
  const [parseError, setParseError] = useState('')
  const [nextRuns, setNextRuns]   = useState<Date[]>([])

  // Recompute next runs whenever fields change
  useEffect(() => {
    setNextRuns(getNextExecutions(fields))
  }, [fields])

  // Field changed via select → update expression
  const handleFieldChange = useCallback((key: FieldKey, value: string) => {
    setFields((prev) => {
      const next = { ...prev, [key]: value }
      setCronInput(fieldsToExpr(next))
      setParseError('')
      return next
    })
  }, [])

  // Expression typed directly → parse and update fields
  const handleCronInput = useCallback((value: string) => {
    setCronInput(value)
    const parsed = parseCronExpression(value)
    if (parsed) {
      setFields(parsed)
      setParseError('')
    } else if (value.trim()) {
      setParseError('無効なcron式です。例: 0 9 * * 1')
    } else {
      setParseError('')
    }
  }, [])

  // Preset clicked
  const handlePreset = useCallback((expr: string) => {
    const parsed = parseCronExpression(expr)!
    setFields(parsed)
    setCronInput(expr)
    setParseError('')
  }, [])

  const description = describeExpression(fields)

  return (
    <div className="space-y-5">

      {/* ── Presets ── */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1 font-mono text-[9px] uppercase tracking-widest text-muted">Quick:</span>
        {PRESETS.map(({ label, expr }) => (
          <button
            key={label}
            onClick={() => handlePreset(expr)}
            className={`rounded border px-2.5 py-1 font-mono text-[10px] transition-all ${
              cronInput === expr
                ? 'border-teal/40 bg-teal/10 text-teal'
                : 'border-border text-muted hover:border-border-hi hover:text-dim'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Visual builder ── */}
      <div className="overflow-hidden rounded-md border border-border bg-bg">
        <div className="flex divide-x divide-border">
          {FIELD_CONFIGS.map((config, idx) => (
            <FieldSelect
              key={config.key}
              config={config}
              value={fields[config.key]}
              onChange={(v) => handleFieldChange(config.key, v)}
              isLast={idx === FIELD_CONFIGS.length - 1}
            />
          ))}
        </div>
      </div>

      {/* ── Expression ── */}
      <div className="space-y-1.5">
        <div className="flex items-stretch gap-2">
          <input
            type="text"
            value={cronInput}
            onChange={(e) => handleCronInput(e.target.value)}
            spellCheck={false}
            className={`flex-1 rounded-md border-l-2 bg-bg px-4 py-3 font-mono text-base tracking-widest text-bright outline-none transition-colors ${
              parseError
                ? 'border border-red-400/40 border-l-red-400'
                : 'border border-border border-l-teal/40 focus:border-border-hi focus:border-l-teal/70'
            }`}
            placeholder="* * * * *"
          />
          <CopyButton text={cronInput} />
        </div>
        {parseError && (
          <p className="font-mono text-[11px] text-red-400">{parseError}</p>
        )}
      </div>

      {/* ── Description ── */}
      {!parseError && (
        <div className="border-l-2 border-l-teal/40 pl-4 py-0.5">
          <p className="font-mono text-[9px] uppercase tracking-widest text-muted/60 mb-1">意味</p>
          <p className="font-mono text-sm font-medium text-bright">{description}</p>
        </div>
      )}

      {/* ── Next executions ── */}
      {!parseError && nextRuns.length > 0 && (
        <div className="space-y-1.5">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted">
            次回実行時刻
            <span className="ml-2 normal-case tracking-normal text-muted/70">
              （このブラウザの時刻帯 {Intl.DateTimeFormat().resolvedOptions().timeZone} で計算。サーバーが UTC なら実際の時刻はずれます）
            </span>
          </p>
          <div className="overflow-hidden rounded-md border border-border bg-bg divide-y divide-border/50">
            {nextRuns.map((d, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-2.5">
                <div className="flex items-center gap-3">
                  <span className="shrink-0 font-mono text-[9px] text-muted/30 tabular-nums w-3">{i + 1}</span>
                  <span className="font-mono text-sm tabular-nums text-teal/80">
                    {String(d.getHours()).padStart(2, '0')}:{String(d.getMinutes()).padStart(2, '0')}
                  </span>
                </div>
                <span className="font-mono text-[10px] tabular-nums text-muted">
                  {d.getFullYear()}/{String(d.getMonth()+1).padStart(2,'0')}/{String(d.getDate()).padStart(2,'0')}
                  （{['日','月','火','水','木','金','土'][d.getDay()]}）
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
