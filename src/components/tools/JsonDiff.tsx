'use client'

import { useState, useMemo } from 'react'

type DiffType = 'added' | 'removed' | 'changed'

interface DiffLine {
  type: DiffType
  key: string
  before?: unknown
  after?: unknown
  path: string
}

function diffObjects(before: unknown, after: unknown, path = ''): DiffLine[] {
  const lines: DiffLine[] = []

  if (typeof before !== 'object' || before === null || typeof after !== 'object' || after === null) {
    if (before !== after) {
      lines.push({ type: 'changed', key: path, before, after, path })
    }
    return lines
  }

  const beforeObj = before as Record<string, unknown>
  const afterObj = after as Record<string, unknown>
  const allKeys = new Set([...Object.keys(beforeObj), ...Object.keys(afterObj)])

  for (const key of allKeys) {
    const fullPath = path ? `${path}.${key}` : key
    const hasInBefore = key in beforeObj
    const hasInAfter = key in afterObj

    if (!hasInBefore) {
      lines.push({ type: 'added', key, after: afterObj[key], path: fullPath })
    } else if (!hasInAfter) {
      lines.push({ type: 'removed', key, before: beforeObj[key], path: fullPath })
    } else {
      const bVal = beforeObj[key]
      const aVal = afterObj[key]
      if (typeof bVal === 'object' && bVal !== null && typeof aVal === 'object' && aVal !== null && !Array.isArray(bVal) && !Array.isArray(aVal)) {
        lines.push(...diffObjects(bVal, aVal, fullPath))
      } else if (JSON.stringify(bVal) !== JSON.stringify(aVal)) {
        lines.push({ type: 'changed', key, before: bVal, after: aVal, path: fullPath })
      }
    }
  }

  return lines
}

const SAMPLE_BEFORE = JSON.stringify({ name: 'Alice', age: 30, role: 'admin', active: true }, null, 2)
const SAMPLE_AFTER = JSON.stringify({ name: 'Alice', age: 31, role: 'user', email: 'alice@example.com' }, null, 2)

const TYPE_CONFIG = {
  added: {
    label: '+',
    rowClass: 'bg-green-950/50 hover:bg-green-950/80',
    barClass: 'bg-green-500',
    badgeClass: 'bg-green-900/80 text-green-400 border border-green-800/60',
    textClass: 'text-green-300',
  },
  removed: {
    label: '−',
    rowClass: 'bg-red-950/50 hover:bg-red-950/80',
    barClass: 'bg-red-500',
    badgeClass: 'bg-red-900/80 text-red-400 border border-red-800/60',
    textClass: 'text-red-300',
  },
  changed: {
    label: '~',
    rowClass: 'bg-yellow-950/30 hover:bg-yellow-950/60',
    barClass: 'bg-yellow-500',
    badgeClass: 'bg-yellow-900/50 text-yellow-400 border border-yellow-800/40',
    textClass: 'text-yellow-200',
  },
} as const

export function JsonDiff() {
  const [before, setBefore] = useState('')
  const [after, setAfter] = useState('')

  const result = useMemo(() => {
    const empty = { lines: [], error: null, counts: { added: 0, removed: 0, changed: 0 } }
    if (!before.trim() && !after.trim()) return empty

    let beforeParsed: unknown
    let afterParsed: unknown
    try {
      beforeParsed = before.trim() ? JSON.parse(before) : {}
    } catch {
      return { ...empty, error: 'Before の JSON が無効です' }
    }
    try {
      afterParsed = after.trim() ? JSON.parse(after) : {}
    } catch {
      return { ...empty, error: 'After の JSON が無効です' }
    }

    const lines = diffObjects(beforeParsed, afterParsed)
    const counts = {
      added: lines.filter(l => l.type === 'added').length,
      removed: lines.filter(l => l.type === 'removed').length,
      changed: lines.filter(l => l.type === 'changed').length,
    }
    return { lines, error: null, counts }
  }, [before, after])

  const loadSample = () => {
    setBefore(SAMPLE_BEFORE)
    setAfter(SAMPLE_AFTER)
  }

  const totalChanges = result.counts.added + result.counts.removed + result.counts.changed

  return (
    <div className="space-y-4">
      {/* Sample button */}
      <div className="flex justify-end">
        <button
          onClick={loadSample}
          className="flex items-center gap-1.5 rounded px-2.5 py-1 text-xs text-dim hover:text-teal hover:bg-teal/10 transition-colors"
        >
          <span className="opacity-60">⊞</span> サンプルを挿入
        </button>
      </div>

      {/* Input panes */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <div className="mb-1.5 flex items-center gap-2">
            <span className="font-mono text-xs uppercase tracking-widest text-muted">Before</span>
            <span className="h-1.5 w-1.5 rounded-full bg-red-500/70" />
          </div>
          <textarea
            value={before}
            onChange={e => setBefore(e.target.value)}
            placeholder={'{\n  "key": "value"\n}'}
            rows={10}
            spellCheck={false}
            className="w-full rounded border border-border bg-[#0a0a0d] px-3 py-2.5 font-mono text-xs text-primary placeholder:text-muted focus:border-red-500/40 focus:outline-none resize-y transition-colors leading-relaxed"
          />
        </div>
        <div>
          <div className="mb-1.5 flex items-center gap-2">
            <span className="font-mono text-xs uppercase tracking-widest text-muted">After</span>
            <span className="h-1.5 w-1.5 rounded-full bg-green-500/70" />
          </div>
          <textarea
            value={after}
            onChange={e => setAfter(e.target.value)}
            placeholder={'{\n  "key": "value"\n}'}
            rows={10}
            spellCheck={false}
            className="w-full rounded border border-border bg-[#0a0a0d] px-3 py-2.5 font-mono text-xs text-primary placeholder:text-muted focus:border-green-500/40 focus:outline-none resize-y transition-colors leading-relaxed"
          />
        </div>
      </div>

      {/* Error */}
      {result.error && (
        <div className="flex items-center gap-2 rounded border border-red-800/60 bg-red-950/40 px-3 py-2 text-sm text-red-400">
          <span>⚠</span> {result.error}
        </div>
      )}

      {/* Summary bar */}
      {!result.error && (before.trim() || after.trim()) && (
        <div className="flex items-center gap-4 rounded border border-border bg-surface px-4 py-2.5">
          {totalChanges === 0 ? (
            <span className="flex items-center gap-2 text-sm text-teal">
              <span>✓</span> 差分なし — 2つのJSONは同一です
            </span>
          ) : (
            <>
              <span className="text-xs text-muted">変更点</span>
              {result.counts.added > 0 && (
                <span className="flex items-center gap-1.5 font-mono text-xs">
                  <span className="h-2 w-2 rounded-full bg-green-500" />
                  <span className="text-green-400">+{result.counts.added} 追加</span>
                </span>
              )}
              {result.counts.removed > 0 && (
                <span className="flex items-center gap-1.5 font-mono text-xs">
                  <span className="h-2 w-2 rounded-full bg-red-500" />
                  <span className="text-red-400">−{result.counts.removed} 削除</span>
                </span>
              )}
              {result.counts.changed > 0 && (
                <span className="flex items-center gap-1.5 font-mono text-xs">
                  <span className="h-2 w-2 rounded-full bg-yellow-500" />
                  <span className="text-yellow-400">~{result.counts.changed} 変更</span>
                </span>
              )}
              <span className="ml-auto font-mono text-xs text-muted">合計 {totalChanges} 件</span>
            </>
          )}
        </div>
      )}

      {/* Diff result */}
      {!result.error && result.lines.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-border">
          <div className="border-b border-border bg-surface px-4 py-2">
            <span className="font-mono text-xs uppercase tracking-widest text-muted">Diff</span>
          </div>
          <div className="divide-y divide-border/60">
            {result.lines.map((line, i) => {
              const cfg = TYPE_CONFIG[line.type]
              return (
                <div key={i} className={`flex items-start gap-0 transition-colors ${cfg.rowClass}`}>
                  {/* Colored left bar */}
                  <div className={`w-0.5 shrink-0 self-stretch ${cfg.barClass}`} />
                  {/* Sign badge */}
                  <div className="flex w-8 shrink-0 items-center justify-center py-2.5">
                    <span className={`rounded px-1 font-mono text-xs font-bold ${cfg.badgeClass}`}>
                      {cfg.label}
                    </span>
                  </div>
                  {/* Content */}
                  <div className="flex-1 overflow-hidden px-2 py-2.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <code className="font-mono text-xs text-dim">{line.path}</code>
                      {line.type === 'changed' && (
                        <div className="flex items-center gap-2 font-mono text-xs">
                          <span className="rounded bg-red-900/40 px-1.5 py-0.5 text-red-300 line-through">
                            {JSON.stringify(line.before)}
                          </span>
                          <span className="text-muted">→</span>
                          <span className="rounded bg-green-900/40 px-1.5 py-0.5 text-green-300">
                            {JSON.stringify(line.after)}
                          </span>
                        </div>
                      )}
                      {line.type === 'added' && (
                        <span className={`font-mono text-xs ${cfg.textClass}`}>
                          {JSON.stringify(line.after)}
                        </span>
                      )}
                      {line.type === 'removed' && (
                        <span className={`font-mono text-xs ${cfg.textClass}`}>
                          {JSON.stringify(line.before)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
