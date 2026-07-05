'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'

const CITIES = [
  { label: '東京 (JST)',         tz: 'Asia/Tokyo' },
  { label: 'ソウル (KST)',        tz: 'Asia/Seoul' },
  { label: '上海 (CST)',          tz: 'Asia/Shanghai' },
  { label: 'シンガポール (SGT)',   tz: 'Asia/Singapore' },
  { label: 'バンコク (ICT)',       tz: 'Asia/Bangkok' },
  { label: 'ホーチミン (ICT)',     tz: 'Asia/Ho_Chi_Minh' },
  { label: 'ジャカルタ (WIB)',     tz: 'Asia/Jakarta' },
  { label: 'ムンバイ (IST)',       tz: 'Asia/Kolkata' },
  { label: 'カラチ (PKT)',        tz: 'Asia/Karachi' },
  { label: 'ドバイ (GST)',        tz: 'Asia/Dubai' },
  { label: 'テヘラン (IRST)',      tz: 'Asia/Tehran' },
  { label: 'モスクワ (MSK)',       tz: 'Europe/Moscow' },
  { label: 'イスタンブール (TRT)', tz: 'Europe/Istanbul' },
  { label: 'カイロ (EET)',        tz: 'Africa/Cairo' },
  { label: 'ナイロビ (EAT)',       tz: 'Africa/Nairobi' },
  { label: 'ヨハネスブルグ (SAST)',tz: 'Africa/Johannesburg' },
  { label: 'ラゴス (WAT)',        tz: 'Africa/Lagos' },
  { label: 'ベルリン (CET)',       tz: 'Europe/Berlin' },
  { label: 'パリ (CET)',          tz: 'Europe/Paris' },
  { label: 'マドリード (CET)',     tz: 'Europe/Madrid' },
  { label: 'アムステルダム (CET)', tz: 'Europe/Amsterdam' },
  { label: 'ロンドン (GMT)',       tz: 'Europe/London' },
  { label: 'サンパウロ (BRT)',     tz: 'America/Sao_Paulo' },
  { label: 'ニューヨーク (EST)',   tz: 'America/New_York' },
  { label: 'シカゴ (CST)',        tz: 'America/Chicago' },
  { label: 'ロサンゼルス (PST)',   tz: 'America/Los_Angeles' },
  { label: 'ホノルル (HST)',       tz: 'Pacific/Honolulu' },
  { label: 'アンカレジ (AKST)',    tz: 'America/Anchorage' },
  { label: 'シドニー (AEDT)',      tz: 'Australia/Sydney' },
  { label: 'オークランド (NZDT)', tz: 'Pacific/Auckland' },
  { label: 'UTC',                 tz: 'UTC' },
]

function toLocalISO(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function getUTCOffset(tz: string, date: Date): string {
  try {
    const parts = new Intl.DateTimeFormat('en', {
      timeZone: tz, timeZoneName: 'shortOffset',
    }).formatToParts(date)
    return parts.find(p => p.type === 'timeZoneName')?.value ?? ''
  } catch {
    return ''
  }
}

function formatInTZ(tz: string, date: Date): string {
  try {
    return new Intl.DateTimeFormat('ja-JP', {
      timeZone: tz,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false,
    }).format(date)
  } catch {
    return '—'
  }
}

function getHourInTZ(tz: string, date: Date): number {
  try {
    const h = new Intl.DateTimeFormat('en', { timeZone: tz, hour: 'numeric', hour12: false }).format(date)
    return parseInt(h) % 24
  } catch {
    return 0
  }
}

const SLOT_COLORS = ['#00C896', '#60a5fa', '#f59e0b', '#e879f9', '#f87171']

export function TimezoneConverter() {
  const [slots, setSlots] = useState(['Asia/Tokyo', 'America/New_York', 'Europe/London'])
  const [baseDate, setBaseDate] = useState(() => toLocalISO(new Date()))
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const parsedBase = useMemo(() => new Date(baseDate), [baseDate])
  const isValid = !isNaN(parsedBase.getTime())

  const addSlot = () => {
    if (slots.length >= 5) return
    const unused = CITIES.find(c => !slots.includes(c.tz))
    if (unused) setSlots(s => [...s, unused.tz])
  }
  const removeSlot = (i: number) => setSlots(s => s.filter((_, idx) => idx !== i))
  const updateSlot = (i: number, tz: string) => setSlots(s => s.map((v, idx) => idx === i ? tz : v))
  const setNowBase = () => setBaseDate(toLocalISO(new Date()))

  // Timeline: 24 hours, highlight business hours (9-18) per slot
  const timelineHours = Array.from({ length: 24 }, (_, i) => i)

  const overlapHours = useCallback(() => {
    if (!isValid || slots.length < 2) return new Set<number>()
    const sets = slots.map(tz => {
      const s = new Set<number>()
      for (let h = 0; h < 24; h++) {
        const d = new Date(parsedBase)
        d.setHours(d.getHours() + h - getHourInTZ(tz, parsedBase))
        const tzHour = getHourInTZ(tz, d)
        if (tzHour >= 9 && tzHour < 18) s.add(h)
      }
      return s
    })
    return sets.reduce((a, b) => new Set([...a].filter(x => b.has(x))))
  }, [slots, parsedBase, isValid])

  const overlap = overlapHours()

  return (
    <div className="space-y-5">
      {/* Base date + controls */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="datetime-local"
          value={baseDate}
          onChange={e => setBaseDate(e.target.value)}
          className="rounded border border-border bg-surface px-3 py-2 font-mono text-sm text-primary focus:border-teal focus:outline-none"
        />
        <button onClick={setNowBase}
          className="rounded border border-border bg-surface px-3 py-2 font-mono text-xs text-muted hover:border-teal hover:text-teal transition-colors">
          今すぐ
        </button>
        {slots.length < 5 && (
          <button onClick={addSlot}
            className="rounded border border-border bg-surface px-3 py-2 font-mono text-xs text-muted hover:border-teal hover:text-teal transition-colors">
            + タイムゾーン追加
          </button>
        )}
      </div>

      {/* Slots */}
      <div className="space-y-2">
        {slots.map((tz, i) => {
          const converted = isValid ? formatInTZ(tz, parsedBase) : '—'
          const currentTime = formatInTZ(tz, now)
          const offset = getUTCOffset(tz, now)
          const city = CITIES.find(c => c.tz === tz)
          const color = SLOT_COLORS[i % SLOT_COLORS.length]

          return (
            <div key={i} className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-surface p-4"
              style={{ borderLeftWidth: '3px', borderLeftColor: color }}>
              <select value={tz} onChange={e => updateSlot(i, e.target.value)}
                className="rounded border border-border bg-bg px-2 py-1.5 font-mono text-xs text-primary focus:border-teal focus:outline-none">
                {CITIES.map(c => (
                  <option key={c.tz} value={c.tz}>{c.label}</option>
                ))}
              </select>
              <div className="flex-1 space-y-0.5">
                <p className="font-mono text-sm font-semibold text-bright">{converted}</p>
                <p className="font-mono text-xs text-muted">現在: {currentTime} <span className="ml-2 text-dim">{offset}</span></p>
              </div>
              {slots.length > 2 && (
                <button onClick={() => removeSlot(i)}
                  className="text-muted hover:text-dim transition-colors font-mono text-xs">✕</button>
              )}
            </div>
          )
        })}
      </div>

      {/* Business hours timeline */}
      <div className="rounded-lg border border-border bg-surface p-4">
        <p className="mb-3 font-mono text-[10px] uppercase tracking-widest text-muted">ビジネスアワー（9–18時）タイムライン</p>
        <div className="space-y-2">
          {slots.map((tz, si) => {
            const color = SLOT_COLORS[si % SLOT_COLORS.length]
            const city = CITIES.find(c => c.tz === tz)
            return (
              <div key={si} className="flex items-center gap-2">
                <span className="w-28 shrink-0 font-mono text-[10px] truncate" style={{ color }}>
                  {city?.label.split(' ')[0] ?? tz}
                </span>
                <div className="flex flex-1 gap-px">
                  {timelineHours.map(h => {
                    const d = isValid ? new Date(parsedBase) : now
                    d.setHours(d.getHours() + h - (isValid ? getHourInTZ(tz, parsedBase) : getHourInTZ(tz, now)))
                    const tzH = getHourInTZ(tz, d)
                    const isBiz = tzH >= 9 && tzH < 18
                    const isOver = overlap.has(h)
                    return (
                      <div key={h} title={`${h}:00 → ${tz}: ${tzH}:00`}
                        className="flex-1 h-5 rounded-sm transition-all"
                        style={{
                          backgroundColor: isOver ? 'rgba(0,200,150,0.6)' : isBiz ? color + '33' : 'rgba(255,255,255,0.04)',
                          border: isOver ? '1px solid rgba(0,200,150,0.5)' : 'none',
                        }}
                      />
                    )
                  })}
                </div>
              </div>
            )
          })}
          {/* Hour labels */}
          <div className="flex items-center gap-2">
            <span className="w-28 shrink-0" />
            <div className="flex flex-1 gap-px">
              {timelineHours.map(h => (
                <div key={h} className="flex-1 text-center font-mono text-[8px] text-muted">
                  {h % 6 === 0 ? h : ''}
                </div>
              ))}
            </div>
          </div>
        </div>
        {overlap.size > 0 && (
          <p className="mt-2 font-mono text-xs text-teal">
            ✓ 重複ビジネスアワー: {[...overlap].sort((a,b)=>a-b).map(h=>`${h}:00`).join(', ')}
          </p>
        )}
      </div>
    </div>
  )
}
