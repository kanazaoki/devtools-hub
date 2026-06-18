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
  const localTz = Intl.DateTimeFormat().resolvedOptions().timeZone
  const tzList = TIMEZONES.includes(localTz) ? TIMEZONES : [localTz, ...TIMEZONES]

  const [nowMs, setNowMs] = useState(Date.now)
  const [tsInput, setTsInput] = useState('')
  const [unit, setUnit] = useState<'s' | 'ms'>('s')
  const [tz, setTz] = useState(localTz)
  const [dtDate, setDtDate] = useState('')
  const [dtTime, setDtTime] = useState('')

  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const applyTs = useCallback((val: string, u: 's' | 'ms' = 's') => {
    setTsInput(val)
    setUnit(u)
  }, [])

  // Timestamp → Date
  const tsNum = Number(tsInput)
  const tsValid = tsInput !== '' && !isNaN(tsNum) && isFinite(tsNum)
  const tsMs = tsValid ? (unit === 's' ? tsNum * 1000 : tsNum) : null
  const tsError = tsInput !== '' && !tsValid ? '数値を入力してください' : ''

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
  const dtMs = dtDate ? new Date(`${dtDate}T${dtTime || '00:00:00'}`).getTime() : null
  const dtRows: ResultRow[] = dtMs && !isNaN(dtMs) ? [
    { key: 'Unix (s)',  val: String(Math.floor(dtMs / 1000)), highlight: true },
    { key: 'Unix (ms)', val: String(dtMs) },
    { key: 'ISO 8601',  val: new Date(dtMs).toISOString() },
    { key: 'Relative',  val: relativeTime(dtMs) },
  ] : []

  const nowS = Math.floor(nowMs / 1000)

  return (
    <div className="space-y-3">
      {/* Now bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface-hi px-4 py-3">
        <div>
          <p className="mb-1 font-mono text-[10px] uppercase tracking-widest text-muted">Now</p>
          <span className="font-mono text-sm text-teal">{nowS}</span>
          <span className="ml-3 font-mono text-[10px] text-muted">{new Date(nowMs).toLocaleString('ja-JP')}</span>
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
          {dtRows.length > 0 && <ResultTable rows={dtRows} />}
        </div>
      </div>
    </div>
  )
}
