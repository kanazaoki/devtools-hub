'use client'

import { useState, useCallback } from 'react'

interface FlexItem {
  id: number
  label: string
  flexGrow: number
  flexShrink: number
  flexBasis: 'auto' | number
  alignSelf: 'auto' | 'flex-start' | 'flex-end' | 'center' | 'stretch' | 'baseline'
  order: number
}

interface ContainerConfig {
  flexDirection: 'row' | 'row-reverse' | 'column' | 'column-reverse'
  flexWrap: 'nowrap' | 'wrap' | 'wrap-reverse'
  justifyContent: 'flex-start' | 'flex-end' | 'center' | 'space-between' | 'space-around' | 'space-evenly'
  alignItems: 'flex-start' | 'flex-end' | 'center' | 'stretch' | 'baseline'
  alignContent: 'flex-start' | 'flex-end' | 'center' | 'stretch' | 'space-between' | 'space-around'
  rowGap: number
  columnGap: number
}

const ITEM_COLORS: [string, string, string][] = [
  ['bg-teal-500/[0.12]', 'border-teal-500/40', 'text-teal-300'],
  ['bg-blue-500/[0.12]', 'border-blue-500/40', 'text-blue-300'],
  ['bg-violet-500/[0.12]', 'border-violet-500/40', 'text-violet-300'],
  ['bg-amber-500/[0.12]', 'border-amber-500/40', 'text-amber-300'],
  ['bg-rose-500/[0.12]', 'border-rose-500/40', 'text-rose-300'],
  ['bg-emerald-500/[0.12]', 'border-emerald-500/40', 'text-emerald-300'],
  ['bg-sky-500/[0.12]', 'border-sky-500/40', 'text-sky-300'],
  ['bg-orange-500/[0.12]', 'border-orange-500/40', 'text-orange-300'],
]

const DEFAULT_ITEM: Omit<FlexItem, 'id' | 'label'> = {
  flexGrow: 0,
  flexShrink: 1,
  flexBasis: 'auto',
  alignSelf: 'auto',
  order: 0,
}

function createItem(id: number): FlexItem {
  return { id, label: `item-${id}`, ...DEFAULT_ITEM }
}

function generateCSS(container: ContainerConfig, items: FlexItem[]): string {
  const lines: string[] = ['.container {', '  display: flex;']
  if (container.flexDirection !== 'row') lines.push(`  flex-direction: ${container.flexDirection};`)
  if (container.flexWrap !== 'nowrap') lines.push(`  flex-wrap: ${container.flexWrap};`)
  if (container.justifyContent !== 'flex-start') lines.push(`  justify-content: ${container.justifyContent};`)
  if (container.alignItems !== 'stretch') lines.push(`  align-items: ${container.alignItems};`)
  if (container.flexWrap !== 'nowrap' && container.alignContent !== 'stretch') {
    lines.push(`  align-content: ${container.alignContent};`)
  }
  if (container.rowGap > 0 || container.columnGap > 0) {
    if (container.rowGap === container.columnGap) {
      lines.push(`  gap: ${container.rowGap}px;`)
    } else {
      if (container.rowGap > 0) lines.push(`  row-gap: ${container.rowGap}px;`)
      if (container.columnGap > 0) lines.push(`  column-gap: ${container.columnGap}px;`)
    }
  }
  lines.push('}')

  for (const item of items) {
    const itemLines: string[] = []
    if (item.flexGrow !== 0) itemLines.push(`  flex-grow: ${item.flexGrow};`)
    if (item.flexShrink !== 1) itemLines.push(`  flex-shrink: ${item.flexShrink};`)
    if (item.flexBasis !== 'auto') itemLines.push(`  flex-basis: ${item.flexBasis}px;`)
    if (item.alignSelf !== 'auto') itemLines.push(`  align-self: ${item.alignSelf};`)
    if (item.order !== 0) itemLines.push(`  order: ${item.order};`)
    if (itemLines.length > 0) {
      lines.push('', `.${item.label} {`, ...itemLines, '}')
    }
  }
  return lines.join('\n')
}

function ColoredCSS({ css }: { css: string }) {
  const lines = css.split('\n')
  return (
    <code className="block">
      {lines.map((line, i) => {
        if (line.startsWith('.') && line.endsWith('{')) {
          return <div key={i} className="text-teal-300">{line}</div>
        }
        if (line === '}') {
          return <div key={i} className="text-primary/60">{line}</div>
        }
        if (line === '') {
          return <div key={i}>&nbsp;</div>
        }
        const m = line.match(/^(\s+)([\w-]+):\s*(.+);$/)
        if (m) {
          return (
            <div key={i}>
              <span>{m[1]}</span>
              <span className="text-sky-300">{m[2]}</span>
              <span className="text-primary/40">: </span>
              <span className="text-amber-200">{m[3]}</span>
              <span className="text-primary/40">;</span>
            </div>
          )
        }
        return <div key={i} className="text-primary">{line}</div>
      })}
    </code>
  )
}

type BtnGroupProps<T extends string> = {
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
  disabled?: boolean
}

function BtnGroup<T extends string>({ value, options, onChange, disabled }: BtnGroupProps<T>) {
  return (
    <div className="flex flex-wrap gap-1">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          disabled={disabled}
          className={`rounded px-2 py-0.5 font-mono text-[11px] transition-all ${
            value === opt.value
              ? 'bg-teal-500/15 border border-teal-400/50 text-teal-300 shadow-[0_0_0_1px_theme(colors.teal.500/0.15)]'
              : 'border border-border/60 text-dim hover:border-teal-500/30 hover:text-primary'
          } disabled:cursor-not-allowed disabled:opacity-30`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

function PropRow({ label, disabled, children }: { label: string; disabled?: boolean; children: React.ReactNode }) {
  return (
    <div className={disabled ? 'opacity-35 pointer-events-none select-none' : ''}>
      <div className="mb-1.5 flex items-baseline gap-2">
        <span className="font-mono text-[11px] text-sky-300/80">{label}</span>
        {disabled && <span className="text-[10px] text-muted">(nowrap 時は無効)</span>}
      </div>
      {children}
    </div>
  )
}

function SliderRow({
  label,
  value,
  min,
  max,
  onChange,
  unit = 'px',
}: {
  label: string
  value: number
  min: number
  max: number
  onChange: (v: number) => void
  unit?: string
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline gap-2">
        <span className="font-mono text-[11px] text-sky-300/80">{label}</span>
        <span className="ml-auto font-mono text-[11px] text-amber-200">
          {value === 0 && unit === '' ? '0' : `${value > 0 && min < 0 ? '+' : ''}${value}${unit}`}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1 w-full cursor-pointer accent-teal"
      />
    </div>
  )
}

export function CssFlexboxGenerator() {
  const [container, setContainer] = useState<ContainerConfig>({
    flexDirection: 'row',
    flexWrap: 'nowrap',
    justifyContent: 'flex-start',
    alignItems: 'stretch',
    alignContent: 'stretch',
    rowGap: 8,
    columnGap: 8,
  })

  const [items, setItems] = useState<FlexItem[]>([createItem(1), createItem(2), createItem(3)])
  const [nextId, setNextId] = useState(4)
  const [selectedId, setSelectedId] = useState<number | null>(1)
  const [copied, setCopied] = useState(false)

  const setContainerProp = useCallback(<K extends keyof ContainerConfig>(key: K, val: ContainerConfig[K]) => {
    setContainer((prev) => ({ ...prev, [key]: val }))
  }, [])

  const addItem = useCallback(() => {
    if (items.length >= 8) return
    const newItem = createItem(nextId)
    setItems((prev) => [...prev, newItem])
    setSelectedId(nextId)
    setNextId((n) => n + 1)
  }, [items.length, nextId])

  const removeItem = useCallback((id: number) => {
    if (items.length <= 1) return
    setItems((prev) => prev.filter((i) => i.id !== id))
    setSelectedId((prev) => (prev === id ? null : prev))
  }, [items.length])

  const updateItem = useCallback(<K extends keyof FlexItem>(id: number, key: K, val: FlexItem[K]) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, [key]: val } : i)))
  }, [])

  const selectedItem = items.find((i) => i.id === selectedId) ?? null

  const css = generateCSS(container, items)

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(css)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [css])

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: container.flexDirection,
    flexWrap: container.flexWrap,
    justifyContent: container.justifyContent,
    alignItems: container.alignItems,
    alignContent: container.flexWrap !== 'nowrap' ? container.alignContent : undefined,
    rowGap: `${container.rowGap}px`,
    columnGap: `${container.columnGap}px`,
    minHeight: '200px',
  }

  const activeProps = [
    container.flexDirection !== 'row' && container.flexDirection,
    container.flexWrap !== 'nowrap' && container.flexWrap,
    container.justifyContent !== 'flex-start' && container.justifyContent,
    container.alignItems !== 'stretch' && container.alignItems,
  ].filter(Boolean) as string[]

  return (
    <div className="flex flex-col gap-0 overflow-hidden rounded-lg border border-border">
      {/* Stats bar */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-border bg-[#0a0e17] px-4 py-2">
        <span className="font-mono text-[11px] text-muted">{items.length} items</span>
        {activeProps.length > 0
          ? activeProps.map((p) => (
              <span key={p} className="rounded bg-teal-500/10 px-1.5 py-0.5 font-mono text-[10px] text-teal-400">
                {p}
              </span>
            ))
          : <span className="font-mono text-[11px] text-border">display: flex (defaults)</span>}
        <span className="ml-auto font-mono text-[10px] text-border">
          gap: {container.rowGap}/{container.columnGap}px
        </span>
      </div>

      <div className="grid lg:grid-cols-[300px_1fr]">
        {/* Left: Container + Item controls */}
        <div className="flex flex-col gap-0 border-b border-border lg:border-b-0 lg:border-r">
          {/* Container section */}
          <div className="border-b border-border px-4 py-3">
            <p className="mb-3 font-mono text-[10px] font-semibold uppercase tracking-widest text-muted">Container</p>
            <div className="flex flex-col gap-3.5">
              <PropRow label="flex-direction">
                <BtnGroup
                  value={container.flexDirection}
                  options={[
                    { value: 'row', label: 'row' },
                    { value: 'row-reverse', label: 'row-reverse' },
                    { value: 'column', label: 'column' },
                    { value: 'column-reverse', label: 'column-reverse' },
                  ]}
                  onChange={(v) => setContainerProp('flexDirection', v)}
                />
              </PropRow>
              <PropRow label="flex-wrap">
                <BtnGroup
                  value={container.flexWrap}
                  options={[
                    { value: 'nowrap', label: 'nowrap' },
                    { value: 'wrap', label: 'wrap' },
                    { value: 'wrap-reverse', label: 'wrap-reverse' },
                  ]}
                  onChange={(v) => setContainerProp('flexWrap', v)}
                />
              </PropRow>
              <PropRow label="justify-content">
                <BtnGroup
                  value={container.justifyContent}
                  options={[
                    { value: 'flex-start', label: 'flex-start' },
                    { value: 'flex-end', label: 'flex-end' },
                    { value: 'center', label: 'center' },
                    { value: 'space-between', label: 'space-between' },
                    { value: 'space-around', label: 'space-around' },
                    { value: 'space-evenly', label: 'space-evenly' },
                  ]}
                  onChange={(v) => setContainerProp('justifyContent', v)}
                />
              </PropRow>
              <PropRow label="align-items">
                <BtnGroup
                  value={container.alignItems}
                  options={[
                    { value: 'flex-start', label: 'flex-start' },
                    { value: 'flex-end', label: 'flex-end' },
                    { value: 'center', label: 'center' },
                    { value: 'stretch', label: 'stretch' },
                    { value: 'baseline', label: 'baseline' },
                  ]}
                  onChange={(v) => setContainerProp('alignItems', v)}
                />
              </PropRow>
              <PropRow label="align-content" disabled={container.flexWrap === 'nowrap'}>
                <BtnGroup
                  value={container.alignContent}
                  disabled={container.flexWrap === 'nowrap'}
                  options={[
                    { value: 'flex-start', label: 'flex-start' },
                    { value: 'flex-end', label: 'flex-end' },
                    { value: 'center', label: 'center' },
                    { value: 'stretch', label: 'stretch' },
                    { value: 'space-between', label: 'space-between' },
                    { value: 'space-around', label: 'space-around' },
                  ]}
                  onChange={(v) => setContainerProp('alignContent', v)}
                />
              </PropRow>
              <SliderRow label="row-gap" value={container.rowGap} min={0} max={64} onChange={(v) => setContainerProp('rowGap', v)} />
              <SliderRow label="column-gap" value={container.columnGap} min={0} max={64} onChange={(v) => setContainerProp('columnGap', v)} />
            </div>
          </div>

          {/* Item controls */}
          <div className="flex-1 px-4 py-3">
            <p className="mb-3 font-mono text-[10px] font-semibold uppercase tracking-widest text-muted">
              {selectedItem ? <>Item: <span className="text-teal-300">{selectedItem.label}</span></> : 'Item (未選択)'}
            </p>
            {selectedItem ? (
              <div className="flex flex-col gap-3.5">
                <SliderRow label="flex-grow" value={selectedItem.flexGrow} min={0} max={5} unit="" onChange={(v) => updateItem(selectedItem.id, 'flexGrow', v)} />
                <SliderRow label="flex-shrink" value={selectedItem.flexShrink} min={0} max={5} unit="" onChange={(v) => updateItem(selectedItem.id, 'flexShrink', v)} />
                <div>
                  <div className="mb-1.5 flex items-baseline gap-2">
                    <span className="font-mono text-[11px] text-sky-300/80">flex-basis</span>
                    <span className="ml-auto font-mono text-[11px] text-amber-200">
                      {selectedItem.flexBasis === 'auto' ? 'auto' : `${selectedItem.flexBasis}px`}
                    </span>
                  </div>
                  <div className="mb-2 flex gap-1">
                    <button
                      onClick={() => updateItem(selectedItem.id, 'flexBasis', 'auto')}
                      className={`rounded px-2 py-0.5 font-mono text-[11px] transition-all ${selectedItem.flexBasis === 'auto' ? 'bg-teal-500/15 border border-teal-400/50 text-teal-300' : 'border border-border/60 text-dim hover:border-teal-500/30 hover:text-primary'}`}
                    >
                      auto
                    </button>
                    <button
                      onClick={() => updateItem(selectedItem.id, 'flexBasis', selectedItem.flexBasis === 'auto' ? 100 : (selectedItem.flexBasis as number))}
                      className={`rounded px-2 py-0.5 font-mono text-[11px] transition-all ${selectedItem.flexBasis !== 'auto' ? 'bg-teal-500/15 border border-teal-400/50 text-teal-300' : 'border border-border/60 text-dim hover:border-teal-500/30 hover:text-primary'}`}
                    >
                      px
                    </button>
                  </div>
                  {selectedItem.flexBasis !== 'auto' && (
                    <input
                      type="range"
                      min={0}
                      max={300}
                      value={selectedItem.flexBasis as number}
                      onChange={(e) => updateItem(selectedItem.id, 'flexBasis', Number(e.target.value))}
                      className="h-1 w-full cursor-pointer accent-teal"
                    />
                  )}
                </div>
                <PropRow label="align-self">
                  <BtnGroup
                    value={selectedItem.alignSelf}
                    options={[
                      { value: 'auto', label: 'auto' },
                      { value: 'flex-start', label: 'flex-start' },
                      { value: 'flex-end', label: 'flex-end' },
                      { value: 'center', label: 'center' },
                      { value: 'stretch', label: 'stretch' },
                      { value: 'baseline', label: 'baseline' },
                    ]}
                    onChange={(v) => updateItem(selectedItem.id, 'alignSelf', v)}
                  />
                </PropRow>
                <SliderRow label="order" value={selectedItem.order} min={-5} max={5} unit="" onChange={(v) => updateItem(selectedItem.id, 'order', v)} />
              </div>
            ) : (
              <p className="text-[12px] text-muted">プレビューのアイテムをクリックして選択</p>
            )}
          </div>
        </div>

        {/* Right: Preview + CSS */}
        <div className="flex flex-col">
          {/* Preview */}
          <div className="relative border-b border-border bg-[#060a12] p-4"
            style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
            <div className="mb-3 flex items-center justify-between">
              <span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-muted">Preview</span>
              <button
                onClick={addItem}
                disabled={items.length >= 8}
                className="rounded border border-teal-500/30 px-2.5 py-0.5 font-mono text-[11px] text-teal-400 transition-colors hover:bg-teal-500/10 disabled:cursor-not-allowed disabled:opacity-30"
              >
                + add item
              </button>
            </div>
            <div
              style={containerStyle}
              className="rounded-sm border border-dashed border-border/50 p-3"
            >
              {items.map((item, idx) => {
                const [bg, border, text] = ITEM_COLORS[idx % ITEM_COLORS.length]
                const isSelected = selectedId === item.id
                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedId(item.id)}
                    style={{
                      flexGrow: item.flexGrow,
                      flexShrink: item.flexShrink,
                      flexBasis: item.flexBasis === 'auto' ? 'auto' : `${item.flexBasis}px`,
                      alignSelf: item.alignSelf,
                      order: item.order,
                    }}
                    className={`group relative flex min-h-[52px] min-w-[52px] cursor-pointer select-none flex-col items-center justify-center gap-0.5 rounded border px-3 py-2 font-mono text-[11px] transition-all ${bg} ${border} ${text} ${isSelected ? 'ring-1 ring-white/25 brightness-110' : 'opacity-70 hover:opacity-100'}`}
                  >
                    <span className="font-semibold">{item.label}</span>
                    {(item.flexGrow > 0 || item.order !== 0) && (
                      <span className="text-[9px] opacity-60">
                        {item.flexGrow > 0 && `grow:${item.flexGrow}`}
                        {item.flexGrow > 0 && item.order !== 0 && ' '}
                        {item.order !== 0 && `ord:${item.order > 0 ? '+' : ''}${item.order}`}
                      </span>
                    )}
                    {items.length > 1 && (
                      <button
                        onClick={(e) => { e.stopPropagation(); removeItem(item.id) }}
                        className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full border border-border bg-[#0a0e17] text-[10px] text-muted opacity-0 transition-opacity group-hover:opacity-100 hover:border-red-500/50 hover:text-red-400"
                      >
                        ×
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
            <p className="mt-2 text-[10px] text-muted/60">click to select · max 8 items</p>
          </div>

          {/* CSS output */}
          <div className="flex flex-1 flex-col bg-[#0d1117]">
            <div className="flex items-center justify-between border-b border-border px-4 py-2">
              <span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-muted">Generated CSS</span>
              <button
                onClick={handleCopy}
                className={`rounded border px-3 py-1 font-mono text-[11px] transition-all ${copied ? 'border-teal-500/40 bg-teal-500/10 text-teal-300' : 'border-border/60 text-dim hover:border-teal-500/30 hover:text-teal-400'}`}
              >
                {copied ? '✓ copied' : 'copy'}
              </button>
            </div>
            <pre className="flex-1 overflow-x-auto p-4 font-mono text-[12px] leading-relaxed">
              <ColoredCSS css={css} />
            </pre>
          </div>
        </div>
      </div>
    </div>
  )
}
