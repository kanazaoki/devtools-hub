'use client'

import { useState, useEffect, useMemo } from 'react'

const CITIES = [
  { label: '東京',         tz: 'Asia/Tokyo' },
  { label: 'ソウル',        tz: 'Asia/Seoul' },
  { label: '上海',          tz: 'Asia/Shanghai' },
  { label: 'シンガポール',   tz: 'Asia/Singapore' },
  { label: 'バンコク',       tz: 'Asia/Bangkok' },
  { label: 'ホーチミン',     tz: 'Asia/Ho_Chi_Minh' },
  { label: 'ジャカルタ',     tz: 'Asia/Jakarta' },
  { label: 'ムンバイ',       tz: 'Asia/Kolkata' },
  { label: 'カラチ',        tz: 'Asia/Karachi' },
  { label: 'ドバイ',        tz: 'Asia/Dubai' },
  { label: 'テヘラン',      tz: 'Asia/Tehran' },
  { label: 'モスクワ',       tz: 'Europe/Moscow' },
  { label: 'イスタンブール', tz: 'Europe/Istanbul' },
  { label: 'カイロ',        tz: 'Africa/Cairo' },
  { label: 'ナイロビ',       tz: 'Africa/Nairobi' },
  { label: 'ヨハネスブルグ',tz: 'Africa/Johannesburg' },
  { label: 'ラゴス',        tz: 'Africa/Lagos' },
  { label: 'ベルリン',       tz: 'Europe/Berlin' },
  { label: 'パリ',          tz: 'Europe/Paris' },
  { label: 'マドリード',     tz: 'Europe/Madrid' },
  { label: 'アムステルダム', tz: 'Europe/Amsterdam' },
  { label: 'ロンドン',       tz: 'Europe/London' },
  { label: 'サンパウロ',     tz: 'America/Sao_Paulo' },
  { label: 'ニューヨーク',   tz: 'America/New_York' },
  { label: 'シカゴ',        tz: 'America/Chicago' },
  { label: 'ロサンゼルス',   tz: 'America/Los_Angeles' },
  { label: 'ホノルル',       tz: 'Pacific/Honolulu' },
  { label: 'アンカレジ',    tz: 'America/Anchorage' },
  { label: 'シドニー',      tz: 'Australia/Sydney' },
  { label: 'オークランド', tz: 'Pacific/Auckland' },
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

// そのタイムゾーンでの UTC からのずれ（分）
function offsetMinutes(tz: string, at: number): number {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' })
      .formatToParts(new Date(at)).map((x) => [x.type, x.value]),
  )
  const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second)
  return Math.round((asUtc - Math.floor(at / 1000) * 1000) / 60000)
}

// 「tz での y-m-d h:mi」が指す瞬間（UTC のミリ秒）。夏時間の境目もずれを2回測って合わせる
function zonedToUtc(y: number, mo: number, d: number, h: number, mi: number, tz: string): number {
  const guess = Date.UTC(y, mo - 1, d, h, mi)
  let t = guess - offsetMinutes(tz, guess) * 60000
  t = guess - offsetMinutes(tz, t) * 60000
  return t
}

function partsInTZ(tz: string, at: number): { y: number; mo: number; d: number } {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', { timeZone: tz, year: 'numeric', month: 'numeric', day: 'numeric' })
      .formatToParts(new Date(at)).map((x) => [x.type, x.value]),
  )
  return { y: +p.year, mo: +p.month, d: +p.day }
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
  // Deterministic defaults so SSR and the first client render match (no
  // hydration errors); the real base date / current time are set on mount.
  const [baseDate, setBaseDate] = useState('')
  const [now, setNow] = useState(() => new Date(0))
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setBaseDate(toLocalISO(new Date()))
    setNow(new Date())
    setReady(true)
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  // 入力した日時を、どのタイムゾーンの時刻として読むか（既定はブラウザのタイムゾーン）
  const [baseTz, setBaseTz] = useState('Asia/Tokyo')
  useEffect(() => {
    const local = Intl.DateTimeFormat().resolvedOptions().timeZone
    if (local) setBaseTz(local)
  }, [])
  const parsedBase = useMemo(() => {
    const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(baseDate)
    if (!m) return new Date(NaN)
    return new Date(zonedToUtc(+m[1], +m[2], +m[3], +m[4], +m[5], baseTz))
  }, [baseDate, baseTz])
  const isValid = !isNaN(parsedBase.getTime())

  const addSlot = () => {
    if (slots.length >= 5) return
    const unused = CITIES.find(c => !slots.includes(c.tz))
    if (unused) setSlots(s => [...s, unused.tz])
  }
  const removeSlot = (i: number) => setSlots(s => s.filter((_, idx) => idx !== i))
  const updateSlot = (i: number, tz: string) => setSlots(s => s.map((v, idx) => idx === i ? tz : v))
  const setNowBase = () => {
    // 「今すぐ」は基準のタイムゾーンでの現在時刻を入れる
    const n = Date.now()
    const p = partsInTZ(baseTz, n)
    const hh = getHourInTZ(baseTz, new Date(n))
    const mm = new Intl.DateTimeFormat('en-US', { timeZone: baseTz, minute: 'numeric' }).format(new Date(n))
    const pad = (x: number) => String(x).padStart(2, '0')
    setBaseDate(`${p.y}-${pad(p.mo)}-${pad(p.d)}T${pad(hh)}:${pad(+mm)}`)
  }

  // Timeline: 先頭のタイムゾーンの、基準日の 0〜23 時の各瞬間について、各都市の現地時刻を見る。
  // ⚠ 以前は各行を「その都市の h 時」で並べていたので、どの都市も同じ 9–18 時が塗られ、
  // 重なりは常に 9:00〜17:00 と表示されていた（東京とニューヨークでも）
  const timelineHours = Array.from({ length: 24 }, (_, i) => i)
  const refTz = slots[0]
  const instants = useMemo(() => {
    const at = isValid ? parsedBase.getTime() : now.getTime()
    const { y, mo, d } = partsInTZ(refTz, at)
    return timelineHours.map((h) => zonedToUtc(y, mo, d, h, 0, refTz))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refTz, parsedBase, isValid, ready])

  const localHour = (tz: string, h: number) => getHourInTZ(tz, new Date(instants[h]))
  const overlap = useMemo(() => {
    if (slots.length < 2) return new Set<number>()
    return new Set(timelineHours.filter((h) => slots.every((tz) => { const lh = localHour(tz, h); return lh >= 9 && lh < 18 })))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slots, instants])

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
        <select
          value={baseTz}
          onChange={e => setBaseTz(e.target.value)}
          aria-label="入力した日時のタイムゾーン"
          className="rounded border border-border bg-surface px-2 py-2 font-mono text-xs text-primary focus:border-teal focus:outline-none"
        >
          {!CITIES.some(c => c.tz === baseTz) && <option value={baseTz}>{baseTz}</option>}
          {CITIES.map(c => <option key={c.tz} value={c.tz}>{c.label} の時刻として</option>)}
        </select>
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
          const currentTime = ready ? formatInTZ(tz, now) : '—'
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
                    const tzH = localHour(tz, h)
                    const isBiz = tzH >= 9 && tzH < 18
                    const isOver = overlap.has(h)
                    return (
                      <div key={h} title={`${CITIES.find(c => c.tz === refTz)?.label ?? refTz} ${h}:00 = ${city?.label ?? tz} ${tzH}:00`}
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
        <p className="mt-2 font-mono text-[10px] text-muted">
          横軸は {CITIES.find(c => c.tz === refTz)?.label ?? refTz} の時刻（基準日の 0〜23 時）。各行はその瞬間の各都市の現地時刻で、9〜18 時を塗っています。
        </p>
        {slots.length >= 2 && (overlap.size > 0 ? (
          <p className="mt-1 font-mono text-xs text-teal">
            ✓ 全員の 9〜18 時が重なる時間（{CITIES.find(c => c.tz === refTz)?.label ?? refTz} 時刻）: {[...overlap].sort((a,b)=>a-b).map(h=>`${h}:00`).join(', ')}
          </p>
        ) : (
          <p className="mt-1 font-mono text-xs text-amber-300">全員の 9〜18 時が重なる時間はありません</p>
        ))}
      </div>
    </div>
  )
}
