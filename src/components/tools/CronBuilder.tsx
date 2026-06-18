'use client'

import { useState, useCallback, useEffect } from 'react'

// ── Types ─────────────────────────────────────────────────────────────────────

type FieldKey = 'minute' | 'hour' | 'day' | 'month' | 'weekday'
type CronFields = Record<FieldKey, string>

// ── Validation ────────────────────────────────────────────────────────────────

function isValidFieldValue(val: string, min: number, max: number): boolean {
  if (val === '*') return true
  if (/^\*\/\d+$/.test(val)) {
    const step = parseInt(val.slice(2), 10)
    return step >= 1 && step <= max
  }
  if (/^\d+$/.test(val)) {
    const n = parseInt(val, 10)
    return n >= min && n <= max
  }
  if (/^\d+-\d+$/.test(val)) {
    const [a, b] = val.split('-').map(Number)
    return a >= min && b <= max && a < b
  }
  if (/^(\d+,)+\d+$/.test(val)) {
    return val.split(',').every((n) => {
      const num = parseInt(n, 10)
      return num >= min && num <= max
    })
  }
  return false
}

function parseCronExpression(expr: string): CronFields | null {
  const parts = expr.trim().split(/\s+/)
  if (parts.length !== 5) return null
  const [minute, hour, day, month, weekday] = parts
  if (!isValidFieldValue(minute, 0, 59)) return null
  if (!isValidFieldValue(hour, 0, 23)) return null
  if (!isValidFieldValue(day, 1, 31)) return null
  if (!isValidFieldValue(month, 1, 12)) return null
  if (!isValidFieldValue(weekday, 0, 6)) return null
  return { minute, hour, day, month, weekday }
}

function fieldsToExpr(f: CronFields): string {
  return `${f.minute} ${f.hour} ${f.day} ${f.month} ${f.weekday}`
}

// ── Description ───────────────────────────────────────────────────────────────

const WDAY_JA = ['日曜日', '月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日']
const MON_JA  = ['', '1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']

function describeExpression(f: CronFields): string {
  const { minute, hour, day, month, weekday } = f
  const any  = (v: string) => v === '*'
  const step = (v: string) => /^\*\/\d+$/.test(v)
  const num  = (v: string) => /^\d+$/.test(v) ? parseInt(v, 10) : 0

  if (any(minute) && any(hour) && any(day) && any(month) && any(weekday))
    return '毎分 実行'

  if (step(minute) && any(hour) && any(day) && any(month) && any(weekday))
    return `${minute.slice(2)} 分ごとに実行`

  if (any(minute) && step(hour) && any(day) && any(month) && any(weekday))
    return `${hour.slice(2)} 時間ごとに実行`

  if (!any(minute) && !step(minute) && any(hour) && any(day) && any(month) && any(weekday))
    return `毎時 ${minute} 分 に実行`

  let schedule = ''
  if (!any(weekday) && /^\d+$/.test(weekday)) {
    schedule = `毎週${WDAY_JA[num(weekday)] ?? `曜日${weekday}`}`
  } else if (!any(month) && !any(day)) {
    schedule = `毎年 ${MON_JA[num(month)]} ${day}日`
  } else if (!any(day)) {
    schedule = `毎月 ${day}日`
  } else if (!any(month)) {
    schedule = `毎年 ${MON_JA[num(month)]}`
  } else {
    schedule = '毎日'
  }

  const timeStr =
    any(hour) && any(minute)   ? '毎時間'
    : any(hour)                ? `毎時 ${minute} 分`
    : any(minute)              ? `${hour}:00`
    : `${String(num(hour)).padStart(2, '0')}:${String(num(minute)).padStart(2, '0')}`

  return `${schedule} ${timeStr} に実行`
}

// ── Next executions ───────────────────────────────────────────────────────────

function matchField(val: string, n: number): boolean {
  if (val === '*') return true
  if (/^\*\/\d+$/.test(val)) return n % parseInt(val.slice(2), 10) === 0
  if (/^\d+$/.test(val)) return parseInt(val, 10) === n
  if (/^\d+-\d+$/.test(val)) {
    const [a, b] = val.split('-').map(Number)
    return n >= a && n <= b
  }
  if (/^(\d+,)+\d+$/.test(val)) return val.split(',').map(Number).includes(n)
  return false
}

function getNextExecutions(f: CronFields, count = 3): Date[] {
  const results: Date[] = []
  const d = new Date()
  d.setSeconds(0, 0)
  d.setMinutes(d.getMinutes() + 1)
  for (let i = 0; i < 525_600 && results.length < count; i++) {
    if (
      matchField(f.month,   d.getMonth() + 1) &&
      matchField(f.day,     d.getDate())       &&
      matchField(f.weekday, d.getDay())        &&
      matchField(f.hour,    d.getHours())      &&
      matchField(f.minute,  d.getMinutes())
    ) {
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
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted">次回実行時刻</p>
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
