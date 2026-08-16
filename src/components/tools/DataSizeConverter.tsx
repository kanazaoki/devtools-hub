'use client'

import { useMemo, useState } from 'react'

// 10進（SI）と2進（IEC）は別物。ストレージ表記は10進、OSの表示は2進が多い
const SI = [
  { unit: 'B', factor: 1 },
  { unit: 'KB', factor: 1e3 },
  { unit: 'MB', factor: 1e6 },
  { unit: 'GB', factor: 1e9 },
  { unit: 'TB', factor: 1e12 },
  { unit: 'PB', factor: 1e15 },
]

const IEC = [
  { unit: 'B', factor: 1 },
  { unit: 'KiB', factor: 1024 },
  { unit: 'MiB', factor: 1024 ** 2 },
  { unit: 'GiB', factor: 1024 ** 3 },
  { unit: 'TiB', factor: 1024 ** 4 },
  { unit: 'PiB', factor: 1024 ** 5 },
]

// 回線速度（bps）。1バイト = 8ビット
const LINES = [
  { label: 'モバイル 低速 (1 Mbps)', bps: 1e6 },
  { label: 'モバイル 標準 (10 Mbps)', bps: 1e7 },
  { label: '光 (100 Mbps)', bps: 1e8 },
  { label: '光 高速 (1 Gbps)', bps: 1e9 },
]

function fmt(n: number): string {
  if (!Number.isFinite(n)) return '—'
  if (n === 0) return '0'
  if (n >= 1e15 || (n < 1e-4 && n > 0)) return n.toExponential(4)
  // 大きい桁は整数寄り、小さい桁は小数を多めに見せる
  const digits = n >= 1000 ? 2 : n >= 1 ? 4 : 6
  return Number(n.toFixed(digits)).toLocaleString('ja-JP', { maximumFractionDigits: digits })
}

function fmtDuration(sec: number): string {
  if (!Number.isFinite(sec)) return '—'
  if (sec < 1) return `${(sec * 1000).toFixed(0)} ミリ秒`
  if (sec < 60) return `${sec.toFixed(1)} 秒`
  if (sec < 3600) return `${Math.floor(sec / 60)} 分 ${Math.round(sec % 60)} 秒`
  const h = Math.floor(sec / 3600)
  const m = Math.round((sec % 3600) / 60)
  return `${h} 時間 ${m} 分`
}

export function DataSizeConverter() {
  const [value, setValue] = useState('1')
  const [unit, setUnit] = useState('GB')
  const [copied, setCopied] = useState<string | null>(null)

  const allUnits = useMemo(() => [...SI, ...IEC.slice(1)], [])

  const bytes = useMemo(() => {
    const n = Number(value)
    if (!Number.isFinite(n) || n < 0) return null
    const found = allUnits.find((u) => u.unit === unit)
    return found ? n * found.factor : null
  }, [value, unit, allUnits])

  async function copy(text: string, key: string) {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(key)
      setTimeout(() => setCopied(null), 1200)
    } catch {
      /* クリップボードが使えない環境では何もしない */
    }
  }

  const invalid = value.trim() !== '' && bytes === null

  return (
    <div className="flex flex-col gap-5">
      {/* 入力 */}
      <div>
        <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-widest text-muted">
          サイズを入力
        </label>
        <div className="flex gap-2">
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            inputMode="decimal"
            placeholder="1"
            className={`min-w-0 flex-1 rounded border bg-bg px-3 py-2.5 font-mono text-lg text-primary outline-none ${
              invalid ? 'border-red-500/60' : 'border-border focus:border-teal/60'
            }`}
          />
          <select
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            className="rounded border border-border bg-surface px-3 py-2.5 font-mono text-sm text-primary outline-none"
          >
            <optgroup label="10進 (SI)">
              {SI.map((u) => (
                <option key={u.unit} value={u.unit}>
                  {u.unit}
                </option>
              ))}
            </optgroup>
            <optgroup label="2進 (IEC)">
              {IEC.slice(1).map((u) => (
                <option key={u.unit} value={u.unit}>
                  {u.unit}
                </option>
              ))}
            </optgroup>
          </select>
        </div>
        {invalid && (
          <p className="mt-1.5 text-xs text-red-400">0以上の数値を入力してください</p>
        )}
      </div>

      {bytes !== null && (
        <>
          {/* 換算表 */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <UnitTable
              title="10進 (SI) — 1000区切り"
              note="ストレージやSSDの表記、通信量の請求はこちら"
              units={SI}
              bytes={bytes}
              copied={copied}
              onCopy={copy}
            />
            <UnitTable
              title="2進 (IEC) — 1024区切り"
              note="OSのファイルサイズ表示、メモリはこちら"
              units={IEC}
              bytes={bytes}
              copied={copied}
              onCopy={copy}
            />
          </div>

          {/* ビット表記 */}
          <div className="rounded border border-border bg-bg px-4 py-3">
            <p className="mb-1 font-mono text-[10px] uppercase tracking-widest text-muted">
              ビット表記
            </p>
            <p className="font-mono text-sm text-primary">
              {fmt(bytes * 8)} bit
              <span className="ml-3 text-dim">
                （1 バイト = 8 ビット。回線速度の Mbps はビット単位です）
              </span>
            </p>
          </div>

          {/* 転送時間 */}
          <div className="overflow-hidden rounded border border-border">
            <div className="border-b border-border bg-surface px-4 py-2">
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted">
                ダウンロードにかかる時間の目安
              </p>
            </div>
            <ul>
              {LINES.map((l, i) => (
                <li
                  key={l.label}
                  className="flex items-center justify-between px-4 py-2.5"
                  style={{ borderTop: i ? '1px solid var(--color-border, #222)' : undefined }}
                >
                  <span className="text-sm text-dim">{l.label}</span>
                  <span className="font-mono text-sm text-primary">
                    {fmtDuration((bytes * 8) / l.bps)}
                  </span>
                </li>
              ))}
            </ul>
            <p className="border-t border-border px-4 py-2 text-xs text-muted">
              理論値です。実際はオーバーヘッドや輻輳により1〜2割ほど遅くなります。
            </p>
          </div>
        </>
      )}
    </div>
  )
}

function UnitTable({
  title,
  note,
  units,
  bytes,
  copied,
  onCopy,
}: {
  title: string
  note: string
  units: { unit: string; factor: number }[]
  bytes: number
  copied: string | null
  onCopy: (text: string, key: string) => void
}) {
  return (
    <div className="overflow-hidden rounded border border-border">
      <div className="border-b border-border bg-surface px-3 py-2">
        <p className="font-mono text-[11px] font-semibold text-primary">{title}</p>
        <p className="mt-0.5 text-[11px] text-muted">{note}</p>
      </div>
      <ul>
        {units.map((u, i) => {
          const v = bytes / u.factor
          const text = fmt(v)
          const key = `${title}-${u.unit}`
          return (
            <li
              key={u.unit}
              className="flex items-center justify-between px-3 py-2"
              style={{ borderTop: i ? '1px solid var(--color-border, #222)' : undefined }}
            >
              <span className="font-mono text-xs text-dim">{u.unit}</span>
              <button
                onClick={() => onCopy(text, key)}
                title="クリックでコピー"
                className="font-mono text-sm text-primary transition-colors hover:text-teal"
              >
                {copied === key ? 'Copied!' : text}
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
