'use client'

import { useState, useMemo, useCallback } from 'react'

type ArrayStrategy = 'overwrite' | 'concat'

function deepMerge(target: any, source: any, strategy: ArrayStrategy): any {
  if (source === null || source === undefined) return source
  if (typeof source !== 'object' || typeof target !== 'object' || target === null) return source
  if (Array.isArray(source)) {
    return strategy === 'concat' && Array.isArray(target) ? [...target, ...source] : source
  }
  if (Array.isArray(target)) return source
  const result = { ...target }
  for (const key of Object.keys(source)) result[key] = deepMerge(target[key], source[key], strategy)
  return result
}

const INITIAL_SLOTS = [
  `{\n  "name": "Alice",\n  "role": "admin",\n  "settings": {\n    "theme": "dark",\n    "lang": "en"\n  },\n  "tags": ["user"]\n}`,
  `{\n  "email": "alice@example.com",\n  "settings": {\n    "lang": "ja",\n    "notify": true\n  },\n  "tags": ["admin"]\n}`,
]

const SLOT_COLORS = [
  'border-blue-500/40 text-blue-400 bg-blue-500/5',
  'border-purple-500/40 text-purple-400 bg-purple-500/5',
  'border-yellow-500/40 text-yellow-400 bg-yellow-500/5',
  'border-orange-500/40 text-orange-400 bg-orange-500/5',
  'border-teal/40 text-teal bg-teal/5',
]

export function JsonMerger() {
  const [slots, setSlots] = useState<string[]>(INITIAL_SLOTS)
  const [strategy, setStrategy] = useState<ArrayStrategy>('overwrite')
  const [copied, setCopied] = useState(false)

  const parsed = useMemo(() => slots.map(s => {
    if (!s.trim()) return { value: null, error: null, empty: true }
    try { return { value: JSON.parse(s), error: null, empty: false } }
    catch (e) { return { value: null, error: String(e).replace('SyntaxError: ', ''), empty: false } }
  }), [slots])

  const result = useMemo(() => {
    const valid = parsed.filter(p => !p.empty && !p.error).map(p => p.value)
    if (valid.length === 0) return undefined
    return valid.reduce((acc: any, cur: any, i: number) => i === 0 ? cur : deepMerge(acc, cur, strategy), undefined)
  }, [parsed, strategy])

  const resultStr = useMemo(() => result === undefined ? null : JSON.stringify(result, null, 2), [result])

  const addSlot    = useCallback(() => setSlots(p => p.length < 5 ? [...p, ''] : p), [])
  const removeSlot = useCallback((i: number) => setSlots(p => p.length > 2 ? p.filter((_, idx) => idx !== i) : p), [])
  const updateSlot = useCallback((i: number, v: string) => setSlots(p => p.map((s, idx) => idx === i ? v : s)), [])

  const handleCopy = useCallback(() => {
    if (!resultStr) return
    navigator.clipboard.writeText(resultStr).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500) })
  }, [resultStr])

  const handleDownload = useCallback(() => {
    if (!resultStr) return
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(new Blob([resultStr], { type: 'application/json' })),
      download: 'merged.json',
    })
    a.click()
    URL.revokeObjectURL(a.href)
  }, [resultStr])

  const validCount = parsed.filter(p => !p.empty && !p.error).length

  return (
    <div className="space-y-5">

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-muted">配列戦略</span>
          <div className="flex rounded-lg border border-border bg-bg p-0.5">
            {([
              { v: 'overwrite', l: '上書き', h: '後が優先' },
              { v: 'concat',    l: '連結',   h: '末尾追記' },
            ] as const).map(opt => (
              <button
                key={opt.v}
                onClick={() => setStrategy(opt.v)}
                className={`flex flex-col items-center rounded px-3 py-1.5 transition-colors ${
                  strategy === opt.v ? 'bg-surface text-bright' : 'text-muted hover:text-primary'
                }`}
              >
                <span className="font-mono text-xs font-semibold leading-none">{opt.l}</span>
                <span className="font-mono text-[10px] text-muted">{opt.h}</span>
              </button>
            ))}
          </div>
        </div>
        <button
          onClick={addSlot}
          disabled={slots.length >= 5}
          className="ml-auto rounded-lg border border-border px-3 py-1.5 font-mono text-xs text-muted transition-colors hover:border-border-hi hover:text-primary disabled:cursor-not-allowed disabled:opacity-30"
        >
          + スロットを追加 ({slots.length}/5)
        </button>
      </div>

      {/* Slots */}
      <div className="grid gap-3 sm:grid-cols-2">
        {slots.map((slot, i) => {
          const p = parsed[i]
          const hasError = !p.empty && !!p.error
          const isValid = !p.empty && !p.error
          const color = SLOT_COLORS[i] ?? SLOT_COLORS[0]
          return (
            <div key={i} className={`overflow-hidden rounded-xl border transition-colors ${hasError ? 'border-red-500/30' : isValid ? color : 'border-border'}`}>
              <div className={`flex items-center justify-between border-b px-3 py-2 ${hasError ? 'border-red-500/20 bg-red-500/5' : isValid ? `border-inherit ${color}` : 'border-border bg-surface'}`}>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold">Slot {i + 1}</span>
                  {isValid && <span className="text-[10px] opacity-60">✓ valid</span>}
                  {hasError && <span className="text-[10px] text-red-400">✗ error</span>}
                  {p.empty && <span className="text-[10px] text-muted">empty</span>}
                </div>
                {slots.length > 2 && (
                  <button
                    onClick={() => removeSlot(i)}
                    className="font-mono text-[10px] text-muted opacity-60 transition-opacity hover:opacity-100 hover:text-red-400"
                  >
                    削除
                  </button>
                )}
              </div>
              <textarea
                value={slot}
                onChange={e => updateSlot(i, e.target.value)}
                rows={7}
                spellCheck={false}
                className="w-full bg-bg px-3 py-2 font-mono text-xs text-primary outline-none resize-y focus:ring-1 focus:ring-teal/20"
                placeholder={'{\n  "key": "value"\n}'}
              />
              {hasError && (
                <div className="border-t border-red-500/20 bg-red-500/5 px-3 py-1.5">
                  <p className="font-mono text-[11px] text-red-400 truncate">{p.error}</p>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Merge arrow */}
      {validCount > 1 && (
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent to-border" />
          <div className="flex items-center gap-1.5 rounded-full border border-teal/20 bg-teal/5 px-3 py-1">
            <span className="font-mono text-xs font-semibold text-teal">Deep Merge</span>
            <span className="font-mono text-xs text-teal">↓</span>
          </div>
          <div className="h-px flex-1 bg-gradient-to-l from-transparent to-border" />
        </div>
      )}

      {/* Result */}
      <div className="overflow-hidden rounded-xl border border-border">
        <div className="flex items-center justify-between border-b border-border bg-surface px-4 py-2.5">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-semibold text-muted">Merge Result</span>
            {validCount > 0 && (
              <span className="rounded-full bg-teal/10 px-2 py-0.5 font-mono text-[11px] text-teal">
                {validCount} スロット
              </span>
            )}
          </div>
          {resultStr && (
            <div className="flex gap-1.5">
              <button
                onClick={handleCopy}
                className="rounded-lg border border-border px-2.5 py-1 font-mono text-xs text-muted transition-colors hover:border-teal/40 hover:text-teal"
              >
                {copied ? '✓ copied' : 'コピー'}
              </button>
              <button
                onClick={handleDownload}
                className="rounded-lg border border-border px-2.5 py-1 font-mono text-xs text-muted transition-colors hover:border-teal/40 hover:text-teal"
              >
                .json
              </button>
            </div>
          )}
        </div>
        {resultStr ? (
          <pre className="max-h-72 overflow-y-auto bg-bg p-4 font-mono text-xs leading-relaxed text-primary">{resultStr}</pre>
        ) : (
          <div className="py-10 text-center bg-bg">
            <p className="font-mono text-sm text-muted">2つ以上の有効なJSONを入力するとマージ結果が表示されます</p>
          </div>
        )}
      </div>
    </div>
  )
}
