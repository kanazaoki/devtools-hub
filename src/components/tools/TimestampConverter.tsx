'use client'

import { useState, useEffect, useCallback } from 'react'

const TIMEZONES = [
  'Asia/Tokyo', 'Asia/Seoul', 'Asia/Shanghai', 'Asia/Singapore',
  'Asia/Kolkata', 'Europe/London', 'Europe/Paris', 'Europe/Berlin',
  'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'America/Sao_Paulo', 'Australia/Sydney', 'UTC',
]

const OFFSETS = [
  { label: '+1h',  sec: 3600 },
  { label: '+24h', sec: 86400 },
  { label: '+7d',  sec: 604800 },
  { label: '+30d', sec: 2592000 },
  { label: '+1y',  sec: 31536000 },
]

function fmtTz(ms: number, tz: string) {
  return new Date(ms).toLocaleString('ja-JP', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  })
}

// 「tz での日時」が指す瞬間。ずれを2回測って夏時間の境目にも合わせる
function zonedToUtc(y: number, mo: number, d: number, h: number, mi: number, s: number, tz: string): number {
  const off = (at: number) => {
    const p = Object.fromEntries(
      new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' })
        .formatToParts(new Date(at)).map((x) => [x.type, x.value]),
    )
    return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second) - Math.floor(at / 1000) * 1000
  }
  const guess = Date.UTC(y, mo - 1, d, h, mi, s)
  let t = guess - off(guess)
  t = guess - off(t)
  return t
}

function relativeTime(ms: number) {
  const diff = ms - Date.now()
  const abs = Math.abs(diff)
  const sec = Math.floor(abs / 1000)
  const min = Math.floor(sec / 60)
  const h   = Math.floor(min / 60)
  const d   = Math.floor(h / 24)
  const mo  = Math.floor(d / 30)
  const yr  = Math.floor(d / 365)
  if (abs < 5000) return 'just now'
  let str: string
  if (sec < 60)   str = `${sec}s`
  else if (min < 60) str = `${min}m ${sec % 60}s`
  else if (h < 24)   str = `${h}h ${min % 60}m`
  else if (d < 30)   str = `${d} day${d > 1 ? 's' : ''}`
  else if (mo < 12)  str = `${mo} month${mo > 1 ? 's' : ''}`
  else               str = `${yr} year${yr > 1 ? 's' : ''}`
  return diff > 0 ? `in ${str}` : `${str} ago`
}

function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500) }}
      className={`rounded border px-2 py-0.5 font-mono text-[10px] transition-colors ${
        copied ? 'border-teal text-teal' : 'border-border text-muted hover:border-border-hi hover:text-primary'
      }`}
    >
      {copied ? '✓' : label}
    </button>
  )
}

interface ResultRow { key: string; val: string; highlight?: boolean; teal?: boolean }

function ResultTable({ rows }: { rows: ResultRow[] }) {
  return (
    <div className="divide-y divide-border">
      {rows.map(({ key, val, highlight, teal }) => (
        <div key={key} className="grid grid-cols-[160px_1fr_auto] items-center gap-2 py-2">
          <span className="font-mono text-[10px] text-muted">{key}</span>
          <span className={`break-all font-mono text-[11px] ${highlight ? 'text-amber-300' : teal ? 'text-teal' : 'text-primary'}`}>{val}</span>
          <CopyButton text={val} />
        </div>
      ))}
    </div>
  )
}

export function TimestampConverter() {
  // Deterministic defaults for SSR + first client render so the markup matches
  // (avoids hydration errors). Real time/timezone are filled in on mount.
  const [nowMs, setNowMs] = useState(0)
  const [localTz, setLocalTz] = useState('UTC')
  const [tz, setTz] = useState('UTC')
  const [tsInput, setTsInput] = useState('')
  const [unit, setUnit] = useState<'s' | 'ms'>('s')
  const [dtDate, setDtDate] = useState('')
  const [dtTime, setDtTime] = useState('')

  useEffect(() => {
    const lz = Intl.DateTimeFormat().resolvedOptions().timeZone
    setLocalTz(lz)
    setTz(lz)
    setNowMs(Date.now())
    const id = setInterval(() => setNowMs(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const tzList = TIMEZONES.includes(localTz) ? TIMEZONES : [localTz, ...TIMEZONES]

  const applyTs = useCallback((val: string, u: 's' | 'ms' = 's') => {
    setTsInput(val)
    setUnit(u)
  }, [])

  // Timestamp → Date
  const tsNum = Number(tsInput)
  const tsValid = tsInput !== '' && !isNaN(tsNum) && isFinite(tsNum)
  const tsMs = tsValid ? (unit === 's' ? tsNum * 1000 : tsNum) : null
  const tsError = tsInput !== '' && !tsValid ? '数値を入力してください' : ''
  // 13桁（ミリ秒）を秒として読むと西暦5万年台になる。桁で取り違えに気づけるようにする
  const unitHint = tsValid
    ? unit === 's' && Math.abs(tsNum) >= 1e11
      ? '桁数がミリ秒のようです（13桁）。単位を ms にしてください。'
      : unit === 'ms' && Math.abs(tsNum) > 0 && Math.abs(tsNum) < 1e11
        ? '桁数が秒のようです（10桁）。単位を s にしてください。'
        : ''
    : ''

  const tsRows: ResultRow[] = tsMs !== null ? [
    { key: `Local (${localTz})`, val: fmtTz(tsMs, localTz), highlight: true },
    ...(tz !== localTz ? [{ key: tz, val: fmtTz(tsMs, tz), teal: true }] : []),
    { key: 'UTC', val: fmtTz(tsMs, 'UTC') },
    { key: 'ISO 8601', val: new Date(tsMs).toISOString() },
    { key: 'Relative', val: relativeTime(tsMs) },
    { key: 'Unix (s)', val: String(Math.floor(tsMs / 1000)) },
    { key: 'Unix (ms)', val: String(Math.floor(tsMs)) },
  ] : []

  // Date → Timestamp
  // ⚠ 以前はブラウザのタイムゾーンで読んでいた（画面に表示もしていなかった）。選んだタイムゾーンの時刻として読む
  const dtMs = (() => {
    const dm = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dtDate)
    if (!dm) return null
    const tm = /^(\d{2}):(\d{2})(?::(\d{2}))?/.exec(dtTime || '00:00:00')
    if (!tm) return null
    return zonedToUtc(+dm[1], +dm[2], +dm[3], +tm[1], +tm[2], +(tm[3] ?? 0), tz)
  })()
  const dtRows: ResultRow[] = dtMs && !isNaN(dtMs) ? [
    { key: 'Unix (s)',  val: String(Math.floor(dtMs / 1000)), highlight: true },
    { key: 'Unix (ms)', val: String(dtMs) },
    { key: 'ISO 8601',  val: new Date(dtMs).toISOString() },
    { key: 'Relative',  val: relativeTime(dtMs) },
  ] : []

  const nowS = Math.floor(nowMs / 1000)
  const ready = nowMs > 0

  return (
    <div className="space-y-3">
      {/* Now bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface-hi px-4 py-3">
        <div>
          <p className="mb-1 font-mono text-[10px] uppercase tracking-widest text-muted">Now</p>
          <span className="font-mono text-sm text-teal">{ready ? nowS : '—'}</span>
          <span className="ml-3 font-mono text-[10px] text-muted">{ready ? new Date(nowMs).toLocaleString('ja-JP') : ''}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <CopyButton text={String(nowS)} label="Copy s" />
          <CopyButton text={String(nowMs)} label="Copy ms" />
          <button
            onClick={() => applyTs(String(nowS), 's')}
            className="rounded border border-teal px-3 py-0.5 font-mono text-[10px] text-teal transition-colors hover:bg-teal/10"
          >
            ↓ Use
          </button>
        </div>
      </div>

      {/* Quick offsets */}
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-surface-hi px-4 py-2.5">
        <span className="font-mono text-[10px] text-muted">Now +</span>
        {OFFSETS.map(({ label, sec }) => (
          <button
            key={label}
            onClick={() => applyTs(String(nowS + sec), 's')}
            className="rounded border border-border px-2.5 py-0.5 font-mono text-[10px] text-muted transition-colors hover:border-amber-400/60 hover:text-amber-300"
          >
            {label}
          </button>
        ))}
      </div>

      {/* Timestamp → Date */}
      <div className="overflow-hidden rounded-lg border border-border">
        <div className="border-b border-border bg-surface-hi px-4 py-2">
          <p className="font-mono text-[10px] uppercase tracking-widest text-teal">Timestamp → Date</p>
        </div>
        <div className="space-y-3 p-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={tsInput}
              onChange={e => setTsInput(e.target.value)}
              placeholder="1717200000"
              spellCheck={false}
              className={`flex-1 rounded-lg border bg-[#111827] px-4 py-2 font-mono text-sm text-primary outline-none transition-colors focus:border-teal/40 ${
                tsError ? 'border-red-500/50' : 'border-border'
              }`}
            />
            <div className="flex overflow-hidden rounded-lg border border-border">
              {(['s', 'ms'] as const).map(u => (
                <button
                  key={u}
                  onClick={() => { setUnit(u) }}
                  className={`px-3 font-mono text-[11px] transition-all ${
                    unit === u ? 'bg-teal font-bold text-bg' : 'text-muted hover:text-primary'
                  }`}
                >
                  {u}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] text-muted">Timezone</span>
            <select
              value={tz}
              onChange={e => setTz(e.target.value)}
              className="rounded border border-border bg-[#111827] px-2 py-1 font-mono text-[11px] text-primary outline-none"
            >
              {tzList.map(t => (
                <option key={t} value={t}>{t}{t === localTz ? ' (local)' : ''}</option>
              ))}
            </select>
          </div>
          {tsError && <p className="font-mono text-[10px] text-red-400">{tsError}</p>}
          {unitHint && <p className="font-mono text-[10px] text-amber-300">⚠ {unitHint}</p>}
          {tsRows.length > 0 && <ResultTable rows={tsRows} />}
        </div>
      </div>

      {/* Date → Timestamp */}
      <div className="overflow-hidden rounded-lg border border-border">
        <div className="border-b border-border bg-surface-hi px-4 py-2">
          <p className="font-mono text-[10px] uppercase tracking-widest text-blue-400">Date → Timestamp</p>
        </div>
        <div className="space-y-3 p-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="mb-1 font-mono text-[10px] text-muted">Date</p>
              <input type="date" value={dtDate} onChange={e => setDtDate(e.target.value)}
                className="w-full rounded-lg border border-border bg-[#111827] px-3 py-2 font-mono text-xs text-primary outline-none focus:border-blue-400/40" />
            </div>
            <div>
              <p className="mb-1 font-mono text-[10px] text-muted">Time</p>
              <input type="time" step="1" value={dtTime} onChange={e => setDtTime(e.target.value)}
                className="w-full rounded-lg border border-border bg-[#111827] px-3 py-2 font-mono text-xs text-primary outline-none focus:border-blue-400/40" />
            </div>
          </div>
          <p className="font-mono text-[10px] text-muted">{tz} の時刻として読みます（タイムゾーンは上の選択で変えられます）</p>
          {dtRows.length > 0 && <ResultTable rows={dtRows} />}
        </div>
      </div>
    </div>
  )
}
