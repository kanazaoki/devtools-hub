'use client'

import { useState, useCallback } from 'react'

type ContainerType = 'size' | 'inline-size'
type ConditionProp = 'min-width' | 'max-width' | 'min-height' | 'max-height'
type Unit = 'px' | 'em' | 'rem' | '%'

interface CssProperty {
  id: number
  property: string
  value: string
}

interface Condition {
  id: number
  prop: ConditionProp
  value: string
  unit: Unit
  properties: CssProperty[]
}

let nextId = 1
const uid = () => nextId++

const PROP_OPTIONS: ConditionProp[] = ['min-width', 'max-width', 'min-height', 'max-height']
const UNIT_OPTIONS: Unit[] = ['px', 'em', 'rem', '%']

function generateCss(
  containerName: string,
  containerType: ContainerType,
  conditions: Condition[]
): string {
  const name = containerName || 'card'
  const lines: string[] = []

  // コンテナ定義
  lines.push(`.${name}-wrapper {`)
  lines.push(`  container-type: ${containerType};`)
  lines.push(`  container-name: ${name};`)
  lines.push(`}`)

  // 各条件
  for (const cond of conditions) {
    if (!cond.value) continue
    const query = `(${cond.prop}: ${cond.value}${cond.unit})`
    lines.push(``)
    lines.push(`@container ${name} ${query} {`)
    lines.push(`  .${name} {`)
    for (const p of cond.properties) {
      if (p.property && p.value) {
        lines.push(`    ${p.property}: ${p.value};`)
      }
    }
    lines.push(`  }`)
    lines.push(`}`)
  }

  return lines.join('\n')
}

export function ContainerQueryBuilder() {
  const [containerName, setContainerName] = useState('card')
  const [containerType, setContainerType] = useState<ContainerType>('inline-size')
  const [conditions, setConditions] = useState<Condition[]>([
    {
      id: uid(),
      prop: 'min-width',
      value: '400',
      unit: 'px',
      properties: [{ id: uid(), property: 'font-size', value: '1.25rem' }],
    },
  ])
  const [copied, setCopied] = useState(false)

  const css = generateCss(containerName, containerType, conditions)

  // 条件の操作
  const addCondition = () => {
    setConditions((prev) => [
      ...prev,
      { id: uid(), prop: 'min-width', value: '', unit: 'px', properties: [{ id: uid(), property: '', value: '' }] },
    ])
  }

  const removeCondition = (id: number) => {
    setConditions((prev) => prev.filter((c) => c.id !== id))
  }

  const updateCondition = (id: number, patch: Partial<Omit<Condition, 'id' | 'properties'>>) => {
    setConditions((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)))
  }

  // プロパティの操作
  const addProperty = (condId: number) => {
    setConditions((prev) =>
      prev.map((c) =>
        c.id === condId
          ? { ...c, properties: [...c.properties, { id: uid(), property: '', value: '' }] }
          : c
      )
    )
  }

  const removeProperty = (condId: number, propId: number) => {
    setConditions((prev) =>
      prev.map((c) =>
        c.id === condId
          ? { ...c, properties: c.properties.filter((p) => p.id !== propId) }
          : c
      )
    )
  }

  const updateProperty = (condId: number, propId: number, patch: Partial<CssProperty>) => {
    setConditions((prev) =>
      prev.map((c) =>
        c.id === condId
          ? { ...c, properties: c.properties.map((p) => (p.id === propId ? { ...p, ...patch } : p)) }
          : c
      )
    )
  }

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(css)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [css])

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      {/* 左: 設定パネル */}
      <div className="flex flex-col gap-5 lg:w-1/2">
        {/* コンテナ設定 */}
        <div className="rounded-lg border border-border bg-surface p-4">
          <h3 className="mb-3 font-mono text-[10px] uppercase tracking-widest text-muted">Container 定義</h3>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <label className="font-mono text-xs text-muted">コンテナ名</label>
              <input
                type="text"
                value={containerName}
                onChange={(e) => setContainerName(e.target.value.replace(/\s/g, '-'))}
                placeholder="card"
                className="rounded border border-border bg-bg px-3 py-1.5 font-mono text-sm text-primary focus:border-teal focus:outline-none"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="font-mono text-xs text-muted">container-type</label>
              <div className="flex rounded border border-border overflow-hidden">
                {(['inline-size', 'size'] as ContainerType[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => setContainerType(t)}
                    className={`flex-1 px-3 py-1.5 font-mono text-xs transition-colors ${
                      containerType === t ? 'bg-teal/20 text-teal' : 'bg-surface text-muted hover:text-dim'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 条件一覧 */}
        <div className="flex flex-col gap-3">
          {conditions.map((cond, ci) => (
            <div key={cond.id} className="rounded-lg border border-border bg-surface p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex h-4 w-4 items-center justify-center rounded bg-border font-mono text-[9px] font-bold text-muted">
                    {ci + 1}
                  </span>
                  <span className="font-mono text-[10px] uppercase tracking-widest text-muted">
                    @container 条件
                  </span>
                </div>
                <button
                  onClick={() => removeCondition(cond.id)}
                  className="font-mono text-[10px] text-muted transition-colors hover:text-red-400"
                >
                  削除
                </button>
              </div>

              {/* 条件設定 */}
              <div className="mb-3 flex gap-2">
                <select
                  value={cond.prop}
                  onChange={(e) => updateCondition(cond.id, { prop: e.target.value as ConditionProp })}
                  className="flex-1 rounded border border-border bg-bg px-2 py-1.5 font-mono text-xs text-primary focus:border-teal focus:outline-none"
                >
                  {PROP_OPTIONS.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
                <input
                  type="number"
                  value={cond.value}
                  onChange={(e) => updateCondition(cond.id, { value: e.target.value })}
                  placeholder="400"
                  min="0"
                  className="w-20 rounded border border-border bg-bg px-2 py-1.5 font-mono text-xs text-primary focus:border-teal focus:outline-none"
                />
                <select
                  value={cond.unit}
                  onChange={(e) => updateCondition(cond.id, { unit: e.target.value as Unit })}
                  className="rounded border border-border bg-bg px-2 py-1.5 font-mono text-xs text-primary focus:border-teal focus:outline-none"
                >
                  {UNIT_OPTIONS.map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>

              {/* CSSプロパティ */}
              <div className="flex flex-col gap-2">
                {cond.properties.map((p) => (
                  <div key={p.id} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={p.property}
                      onChange={(e) => updateProperty(cond.id, p.id, { property: e.target.value })}
                      placeholder="font-size"
                      className="flex-1 rounded border border-border bg-bg px-2 py-1 font-mono text-xs text-primary focus:border-teal focus:outline-none"
                    />
                    <span className="text-muted">:</span>
                    <input
                      type="text"
                      value={p.value}
                      onChange={(e) => updateProperty(cond.id, p.id, { value: e.target.value })}
                      placeholder="1.5rem"
                      className="flex-1 rounded border border-border bg-bg px-2 py-1 font-mono text-xs text-primary focus:border-teal focus:outline-none"
                    />
                    <button
                      onClick={() => removeProperty(cond.id, p.id)}
                      className="shrink-0 font-mono text-[10px] text-muted hover:text-red-400 transition-colors"
                      aria-label="プロパティを削除"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => addProperty(cond.id)}
                  className="mt-1 self-start font-mono text-[10px] text-teal hover:opacity-70 transition-opacity"
                >
                  + プロパティを追加
                </button>
              </div>
            </div>
          ))}

          <button
            onClick={addCondition}
            className="flex items-center gap-2 rounded-lg border border-dashed border-border px-4 py-3 font-mono text-xs text-muted hover:border-teal hover:text-teal transition-colors"
          >
            + 条件を追加
          </button>
        </div>
      </div>

      {/* 右: CSS 出力 */}
      <div className="flex flex-col gap-3 lg:w-1/2">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted">CSS Output</span>
            <span className="rounded bg-border px-1.5 py-0.5 font-mono text-[9px] text-muted/70">.css</span>
          </div>
          <button
            onClick={handleCopy}
            className="rounded border border-border px-3 py-1 font-mono text-xs text-muted transition-colors hover:border-teal hover:text-teal"
          >
            {copied ? '✓ コピー済み' : 'コピー'}
          </button>
        </div>
        <pre className="min-h-64 rounded-lg border border-border bg-bg p-4 font-mono text-sm text-primary whitespace-pre overflow-auto">
          {css}
        </pre>
      </div>
    </div>
  )
}
