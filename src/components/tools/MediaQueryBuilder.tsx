'use client'

import { useState, useEffect } from 'react'

// ─── Types ───────────────────────────────────────────────────────────────────

type MediaType = 'screen' | 'print' | 'all'
type Orientation = '' | 'landscape' | 'portrait'
type ColorScheme = '' | 'dark' | 'light'
type ReducedMotion = '' | 'reduce' | 'no-preference'
type HoverCapability = '' | 'hover' | 'none'
type Unit = 'px' | 'rem' | 'em'

interface Condition {
  type: 'min-width' | 'max-width' | 'min-height' | 'max-height' | 'orientation' | 'prefers-color-scheme' | 'prefers-reduced-motion' | 'hover'
  value: string
  unit?: Unit
}

interface QueryGroup {
  id: number
  mediaType: MediaType
  conditions: Condition[]
}

// ─── Tailwind presets ─────────────────────────────────────────────────────────

const TAILWIND_PRESETS = [
  { label: 'sm', px: 640 },
  { label: 'md', px: 768 },
  { label: 'lg', px: 1024 },
  { label: 'xl', px: 1280 },
  { label: '2xl', px: 1536 },
]

// ─── Build query string ───────────────────────────────────────────────────────

function buildConditionStr(c: Condition): string {
  if (['min-width', 'max-width', 'min-height', 'max-height'].includes(c.type)) {
    if (!c.value) return ''
    return `(${c.type}: ${c.value}${c.unit ?? 'px'})`
  }
  if (c.type === 'orientation') return c.value ? `(orientation: ${c.value})` : ''
  if (c.type === 'prefers-color-scheme') return c.value ? `(prefers-color-scheme: ${c.value})` : ''
  if (c.type === 'prefers-reduced-motion') return c.value ? `(prefers-reduced-motion: ${c.value})` : ''
  if (c.type === 'hover') return c.value ? `(hover: ${c.value})` : ''
  return ''
}

function buildGroupStr(group: QueryGroup): string {
  const parts = group.conditions.map(buildConditionStr).filter(Boolean)
  const mediaStr = group.mediaType !== 'all' ? group.mediaType : ''
  if (parts.length === 0) return mediaStr || 'all'
  if (mediaStr) return `${mediaStr} and ${parts.join(' and ')}`
  return parts.join(' and ')
}

function buildFullQuery(groups: QueryGroup[]): string {
  const parts = groups.map(buildGroupStr).filter(Boolean)
  if (parts.length === 0) return ''
  const mediaStr = parts.join(',\n  ')
  return `@media ${mediaStr} {\n  /* ここにスタイルを記述 */\n}`
}

// ─── Condition row ────────────────────────────────────────────────────────────

const CONDITION_TYPES: Condition['type'][] = [
  'min-width', 'max-width', 'min-height', 'max-height',
  'orientation', 'prefers-color-scheme', 'prefers-reduced-motion', 'hover',
]

function ConditionRow({
  cond,
  onChange,
  onRemove,
}: {
  cond: Condition
  onChange: (c: Condition) => void
  onRemove: () => void
}) {
  const isDimension = ['min-width', 'max-width', 'min-height', 'max-height'].includes(cond.type)

  return (
    <div className="flex flex-wrap items-center gap-2 rounded border border-border bg-base px-3 py-2">
      <select
        value={cond.type}
        onChange={(e) => onChange({ ...cond, type: e.target.value as Condition['type'], value: '' })}
        className="rounded border border-border bg-surface px-2 py-1 text-xs text-primary focus:border-teal focus:outline-none"
      >
        {CONDITION_TYPES.map((t) => (
          <option key={t} value={t}>{t}</option>
        ))}
      </select>

      {isDimension && (
        <>
          <input
            type="number"
            value={cond.value}
            onChange={(e) => onChange({ ...cond, value: e.target.value })}
            placeholder="768"
            min={0}
            className="w-20 rounded border border-border bg-surface px-2 py-1 text-xs text-primary focus:border-teal focus:outline-none"
          />
          <select
            value={cond.unit ?? 'px'}
            onChange={(e) => onChange({ ...cond, unit: e.target.value as Unit })}
            className="rounded border border-border bg-surface px-2 py-1 text-xs text-primary focus:border-teal focus:outline-none"
          >
            {(['px', 'rem', 'em'] as Unit[]).map((u) => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
        </>
      )}

      {cond.type === 'orientation' && (
        <select
          value={cond.value}
          onChange={(e) => onChange({ ...cond, value: e.target.value })}
          className="rounded border border-border bg-surface px-2 py-1 text-xs text-primary focus:border-teal focus:outline-none"
        >
          <option value="">選択...</option>
          <option value="landscape">landscape</option>
          <option value="portrait">portrait</option>
        </select>
      )}

      {cond.type === 'prefers-color-scheme' && (
        <select
          value={cond.value}
          onChange={(e) => onChange({ ...cond, value: e.target.value })}
          className="rounded border border-border bg-surface px-2 py-1 text-xs text-primary focus:border-teal focus:outline-none"
        >
          <option value="">選択...</option>
          <option value="dark">dark</option>
          <option value="light">light</option>
        </select>
      )}

      {cond.type === 'prefers-reduced-motion' && (
        <select
          value={cond.value}
          onChange={(e) => onChange({ ...cond, value: e.target.value })}
          className="rounded border border-border bg-surface px-2 py-1 text-xs text-primary focus:border-teal focus:outline-none"
        >
          <option value="">選択...</option>
          <option value="reduce">reduce</option>
          <option value="no-preference">no-preference</option>
        </select>
      )}

      {cond.type === 'hover' && (
        <select
          value={cond.value}
          onChange={(e) => onChange({ ...cond, value: e.target.value })}
          className="rounded border border-border bg-surface px-2 py-1 text-xs text-primary focus:border-teal focus:outline-none"
        >
          <option value="">選択...</option>
          <option value="hover">hover</option>
          <option value="none">none</option>
        </select>
      )}

      <button
        onClick={onRemove}
        className="ml-auto text-xs text-muted transition-colors hover:text-red-400"
      >
        削除
      </button>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

let nextId = 2

export function MediaQueryBuilder() {
  const [groups, setGroups] = useState<QueryGroup[]>([
    {
      id: 1,
      mediaType: 'screen',
      conditions: [{ type: 'min-width', value: '768', unit: 'px' }],
    },
  ])
  const [copied, setCopied] = useState(false)
  const [windowWidth, setWindowWidth] = useState(0)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    setWindowWidth(window.innerWidth)
    const handler = () => setWindowWidth(window.innerWidth)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  const output = buildFullQuery(groups)

  function addGroup() {
    setGroups((prev) => [
      ...prev,
      { id: nextId++, mediaType: 'screen', conditions: [] },
    ])
  }

  function removeGroup(id: number) {
    setGroups((prev) => prev.filter((g) => g.id !== id))
  }

  function updateGroup(id: number, patch: Partial<QueryGroup>) {
    setGroups((prev) => prev.map((g) => (g.id === id ? { ...g, ...patch } : g)))
  }

  function addCondition(groupId: number) {
    setGroups((prev) =>
      prev.map((g) =>
        g.id === groupId
          ? { ...g, conditions: [...g.conditions, { type: 'min-width', value: '', unit: 'px' }] }
          : g,
      ),
    )
  }

  function updateCondition(groupId: number, index: number, cond: Condition) {
    setGroups((prev) =>
      prev.map((g) =>
        g.id === groupId
          ? { ...g, conditions: g.conditions.map((c, i) => (i === index ? cond : c)) }
          : g,
      ),
    )
  }

  function removeCondition(groupId: number, index: number) {
    setGroups((prev) =>
      prev.map((g) =>
        g.id === groupId
          ? { ...g, conditions: g.conditions.filter((_, i) => i !== index) }
          : g,
      ),
    )
  }

  function applyTailwindPreset(px: number) {
    setGroups((prev) =>
      prev.map((g, i) =>
        i === 0
          ? {
              ...g,
              mediaType: 'screen',
              conditions: [{ type: 'min-width', value: String(px), unit: 'px' }],
            }
          : g,
      ),
    )
  }

  function handleCopy() {
    navigator.clipboard.writeText(output).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  // Check if current window matches the first group's query
  const firstGroupQuery = buildGroupStr(groups[0])
  const isMatch = mounted && firstGroupQuery
    ? (() => {
        try {
          return window.matchMedia(firstGroupQuery).matches
        } catch {
          return false
        }
      })()
    : false

  return (
    <div className="space-y-6">
      {/* Tailwind presets */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted">Tailwind CSS ブレークポイント</p>
        <div className="flex flex-wrap gap-2">
          {TAILWIND_PRESETS.map(({ label, px }) => (
            <button
              key={label}
              onClick={() => applyTailwindPreset(px)}
              className="flex items-center gap-1.5 rounded border border-border bg-surface px-3 py-1.5 text-xs transition-colors hover:border-teal hover:bg-teal/10"
            >
              <span className="font-mono font-bold text-bright">{label}</span>
              <span className="text-muted">{px}px</span>
            </button>
          ))}
        </div>
      </div>

      {/* Query groups */}
      <div className="space-y-4">
        {groups.map((group, gi) => (
          <div key={group.id} className="rounded-lg border border-border bg-surface p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                {groups.length > 1 && (
                  <span className="text-xs font-medium text-muted">クエリ {gi + 1}</span>
                )}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted">メディアタイプ:</span>
                  <select
                    value={group.mediaType}
                    onChange={(e) => updateGroup(group.id, { mediaType: e.target.value as MediaType })}
                    className="rounded border border-border bg-base px-2 py-1 text-xs text-primary focus:border-teal focus:outline-none"
                  >
                    <option value="screen">screen</option>
                    <option value="print">print</option>
                    <option value="all">all</option>
                  </select>
                </div>
              </div>
              {groups.length > 1 && (
                <button
                  onClick={() => removeGroup(group.id)}
                  className="text-xs text-muted transition-colors hover:text-red-400"
                >
                  削除
                </button>
              )}
            </div>

            <div className="space-y-2">
              {group.conditions.map((cond, ci) => (
                <ConditionRow
                  key={ci}
                  cond={cond}
                  onChange={(c) => updateCondition(group.id, ci, c)}
                  onRemove={() => removeCondition(group.id, ci)}
                />
              ))}
            </div>

            <button
              onClick={() => addCondition(group.id)}
              className="mt-2.5 text-xs text-muted transition-colors hover:text-teal"
            >
              + 条件を追加 (and)
            </button>
          </div>
        ))}
      </div>

      {/* Add OR group */}
      <button
        onClick={addGroup}
        className="text-xs text-muted transition-colors hover:text-teal"
      >
        + クエリグループを追加 (,/or)
      </button>

      {/* Preview match */}
      {mounted && (
        <div className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-sm ${
          isMatch
            ? 'border-teal/40 bg-teal/10 text-teal'
            : 'border-border bg-base text-muted'
        }`}>
          <span className="text-base">{isMatch ? '✓' : '✗'}</span>
          <span>
            現在のウィンドウ幅 <strong>{windowWidth}px</strong> はこのクエリに
            <strong>{isMatch ? ' マッチしています' : ' マッチしていません'}</strong>
          </span>
        </div>
      )}

      {/* Output */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted">生成された CSS</p>
          <button
            onClick={handleCopy}
            disabled={!output}
            className="text-xs text-muted transition-colors hover:text-teal disabled:opacity-40"
          >
            {copied ? '✓ コピー済み' : 'コピー'}
          </button>
        </div>
        <pre className="overflow-x-auto rounded border border-border bg-base p-4 text-xs leading-relaxed text-primary">
          {output || <span className="text-muted">条件を追加するとクエリが生成されます</span>}
        </pre>
      </div>
    </div>
  )
}
