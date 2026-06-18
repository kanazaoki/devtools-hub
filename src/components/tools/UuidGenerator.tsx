'use client'

import { useState, useCallback, useRef } from 'react'

type UuidVersion = 'v4' | 'v1' | 'v7'

// ── UUID generators (pure crypto, no external libs) ──────────────────────────

function hex(n: number, len: number): string {
  return n.toString(16).padStart(len, '0')
}

function uuidV4(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  const b = crypto.getRandomValues(new Uint8Array(16))
  b[6] = (b[6] & 0x0f) | 0x40
  b[8] = (b[8] & 0x3f) | 0x80
  const h = Array.from(b).map((x) => x.toString(16).padStart(2, '0')).join('')
  return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`
}

function uuidV1(): string {
  // 100-ns intervals since 1582-10-15T00:00:00Z
  const OFFSET = 122192928000000000n
  const now = BigInt(Date.now()) * 10000n + OFFSET
  const timeLow = now & 0xFFFF_FFFFn
  const timeMid = (now >> 32n) & 0xFFFFn
  const timeHi = ((now >> 48n) & 0x0FFFn) | 0x1000n
  const clockSeq = (BigInt(Math.floor(Math.random() * 0x3FFF)) & 0x3FFFn) | 0x8000n
  const node = crypto.getRandomValues(new Uint8Array(6))
  node[0] |= 0x01 // multicast bit → no real MAC
  const nodeHex = Array.from(node).map((b) => b.toString(16).padStart(2, '0')).join('')
  return `${hex(Number(timeLow), 8)}-${hex(Number(timeMid), 4)}-${hex(Number(timeHi), 4)}-${hex(Number(clockSeq), 4)}-${nodeHex}`
}

function uuidV7(): string {
  const ms = BigInt(Date.now())
  const rand = crypto.getRandomValues(new Uint8Array(10))
  // 48-bit unix_ts_ms | 4-bit ver=7 | 12-bit rand_a | 2-bit var=10 | 62-bit rand_b
  const tsHigh = (ms >> 16n) & 0xFFFF_FFFFn
  const tsLow = ms & 0xFFFFn
  const randA = ((BigInt(rand[0]) << 4n) | (BigInt(rand[1]) >> 4n)) & 0xFFFn
  const verRandA = 0x7000n | randA
  const varBits =
    ((BigInt(rand[1]) & 0x3n) << 60n) |
    (BigInt(rand[2]) << 52n) |
    (BigInt(rand[3]) << 44n) |
    (BigInt(rand[4]) << 36n) |
    (BigInt(rand[5]) << 28n) |
    (BigInt(rand[6]) << 20n) |
    (BigInt(rand[7]) << 12n) |
    (BigInt(rand[8]) << 4n) |
    (BigInt(rand[9]) >> 4n)
  const varField = 0x8000_0000_0000_0000n | (varBits & 0x3FFF_FFFF_FFFF_FFFFn)
  return (
    `${hex(Number(tsHigh), 8)}-` +
    `${hex(Number(tsLow), 4)}-` +
    `${hex(Number(verRandA), 4)}-` +
    `${hex(Number(varField >> 48n), 4)}-` +
    `${hex(Number(varField & 0xFFFF_FFFFFFFFn), 12)}`
  )
}

function generateUuid(version: UuidVersion): string {
  if (version === 'v1') return uuidV1()
  if (version === 'v7') return uuidV7()
  return uuidV4()
}

// ── CopyButton ────────────────────────────────────────────────────────────────

function CopyButton({ text, label = 'Copy', size = 'sm' }: { text: string; label?: string; size?: 'sm' | 'xs' }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }, [text])
  const base = size === 'xs'
    ? 'rounded border px-2 py-0.5 font-mono text-[10px]'
    : 'rounded border px-2.5 py-1 font-mono text-[10px]'
  return (
    <button
      onClick={handleCopy}
      className={`${base} transition-all duration-150 ${
        copied
          ? 'border-teal/60 bg-teal/10 text-teal'
          : 'border-border text-muted hover:border-border-hi hover:text-dim'
      }`}
    >
      {copied ? 'Copied!' : label}
    </button>
  )
}

// ── Version tab data ──────────────────────────────────────────────────────────

const VERSION_META: Record<UuidVersion, { label: string; desc: string }> = {
  v4: { label: 'v4', desc: 'Random' },
  v1: { label: 'v1', desc: 'Timestamp' },
  v7: { label: 'v7', desc: 'Ordered' },
}

// ── Main component ────────────────────────────────────────────────────────────

export function UuidGenerator() {
  const [version, setVersion] = useState<UuidVersion>('v4')
  const [single, setSingle] = useState<string>('')
  const [flashKey, setFlashKey] = useState(0)
  const [bulkCount, setBulkCount] = useState(10)
  const [bulkList, setBulkList] = useState<string[]>([])
  const [history, setHistory] = useState<string[]>([])
  const displayRef = useRef<HTMLDivElement>(null)

  const addToHistory = useCallback((uuids: string[]) => {
    setHistory((prev) => [...uuids, ...prev].slice(0, 10))
  }, [])

  const handleGenerate = () => {
    const uuid = generateUuid(version)
    setSingle(uuid)
    setFlashKey((k) => k + 1)
    addToHistory([uuid])
  }

  const handleBulk = () => {
    const count = Math.max(1, Math.min(100, bulkCount))
    const list = Array.from({ length: count }, () => generateUuid(version))
    setBulkList(list)
    addToHistory(list)
  }

  const handleClearHistory = () => setHistory([])
  const clampBulkCount = (v: number) => Math.max(1, Math.min(100, v))

  return (
    <div className="space-y-5">

      {/* ── Version tabs ── */}
      <div>
        <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-muted">バージョン</p>
        <div className="flex gap-0 rounded-md border border-border overflow-hidden">
          {(Object.keys(VERSION_META) as UuidVersion[]).map((v) => {
            const { label, desc } = VERSION_META[v]
            const active = version === v
            return (
              <button
                key={v}
                onClick={() => setVersion(v)}
                className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 font-mono transition-all duration-100 border-r border-border last:border-r-0 ${
                  active
                    ? 'bg-teal/8 text-teal'
                    : 'bg-surface text-muted hover:bg-surface-hi hover:text-dim'
                }`}
              >
                <span className={`text-sm font-bold tracking-tight ${active ? 'text-teal' : ''}`}>{label}</span>
                <span className={`text-[9px] uppercase tracking-widest ${active ? 'text-teal/70' : 'text-muted/60'}`}>{desc}</span>
                {active && <span className="mt-1 h-0.5 w-4 rounded-full bg-teal" />}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── UUID hero display ── */}
      <div>
        <div
          key={flashKey}
          ref={displayRef}
          className={`rounded-md border ${single ? 'border-teal/25 bg-bg' : 'border-border bg-bg'} px-4 py-4 ${single ? 'uuid-flash' : ''}`}
        >
          {single ? (
            <code className="block font-mono text-sm leading-relaxed tracking-wide text-bright break-all select-all">
              {single}
            </code>
          ) : (
            <p className="font-mono text-[11px] uppercase tracking-widest text-muted/30">
              — バージョンを選択して Generate —
            </p>
          )}
        </div>
        <div className="mt-2 flex items-center gap-2">
          <button
            onClick={handleGenerate}
            className="rounded-md border border-teal/40 bg-teal/10 px-5 py-2 font-mono text-xs font-semibold text-teal transition-all hover:bg-teal/16 active:scale-[0.98]"
          >
            Generate
          </button>
          {single && <CopyButton text={single} />}
        </div>
      </div>

      {/* ── Bulk generate ── */}
      <div className="space-y-2">
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted">一括生成</p>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="number"
            min={1}
            max={100}
            value={bulkCount}
            onChange={(e) => setBulkCount(clampBulkCount(Number(e.target.value)))}
            className="w-20 rounded border border-border bg-bg px-2.5 py-1.5 font-mono text-xs text-primary outline-none focus:border-border-hi transition-colors"
          />
          <span className="font-mono text-[11px] text-muted">件</span>
          <button
            onClick={handleBulk}
            className="rounded border border-border px-3 py-1.5 font-mono text-xs text-muted transition-all hover:border-border-hi hover:text-dim active:scale-[0.98]"
          >
            一括生成
          </button>
          {bulkList.length > 0 && (
            <CopyButton text={bulkList.join('\n')} label="全コピー" />
          )}
        </div>

        {bulkList.length > 0 && (
          <div className="overflow-hidden rounded-md border border-border bg-bg">
            <div className="max-h-44 overflow-y-auto">
              {bulkList.map((uuid, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-2 px-3 py-1.5 ${i % 2 === 0 ? 'bg-transparent' : 'bg-white/[0.015]'}`}
                >
                  <span className="w-5 shrink-0 font-mono text-[9px] text-muted/35 text-right tabular-nums">{i + 1}</span>
                  <code className="flex-1 font-mono text-[11px] text-dim">{uuid}</code>
                  <CopyButton text={uuid} size="xs" />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── History ── */}
      {history.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-3">
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted">履歴</p>
            <span className="font-mono text-[9px] text-muted/40">{history.length}/10</span>
            <button
              onClick={handleClearHistory}
              className="ml-auto rounded border border-border px-2 py-0.5 font-mono text-[10px] text-muted/50 transition-colors hover:border-border-hi hover:text-dim"
            >
              Clear
            </button>
          </div>
          <div className="rounded-md border border-border overflow-hidden">
            {history.map((uuid, i) => (
              <div
                key={uuid + i}
                className="flex items-center gap-2.5 px-3 py-2 border-b border-border last:border-b-0"
                style={{ opacity: 1 - i * 0.07 }}
              >
                <span className="font-mono text-[9px] text-muted/40 tabular-nums">#{i + 1}</span>
                <code className="flex-1 min-w-0 font-mono text-[11px] text-dim truncate">{uuid}</code>
                <CopyButton text={uuid} size="xs" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
