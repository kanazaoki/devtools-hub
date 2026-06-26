'use client'

import { useState, useCallback } from 'react'

interface GridItem {
  id: number
  colStart: number
  rowStart: number
  colSpan: number
  rowSpan: number
  label: string
}

interface GridConfig {
  columns: number
  rows: number
  columnGap: number
  rowGap: number
  items: GridItem[]
}

const PRESETS: Record<string, GridConfig> = {
  '12カラム': {
    columns: 12,
    rows: 3,
    columnGap: 16,
    rowGap: 16,
    items: [
      { id: 1, colStart: 1, rowStart: 1, colSpan: 12, rowSpan: 1, label: 'header' },
      { id: 2, colStart: 1, rowStart: 2, colSpan: 3, rowSpan: 1, label: 'sidebar' },
      { id: 3, colStart: 4, rowStart: 2, colSpan: 9, rowSpan: 1, label: 'main' },
      { id: 4, colStart: 1, rowStart: 3, colSpan: 12, rowSpan: 1, label: 'footer' },
    ],
  },
  'Holy Grail': {
    columns: 12,
    rows: 3,
    columnGap: 16,
    rowGap: 16,
    items: [
      { id: 1, colStart: 1, rowStart: 1, colSpan: 12, rowSpan: 1, label: 'header' },
      { id: 2, colStart: 1, rowStart: 2, colSpan: 2, rowSpan: 1, label: 'nav' },
      { id: 3, colStart: 3, rowStart: 2, colSpan: 8, rowSpan: 1, label: 'main' },
      { id: 4, colStart: 11, rowStart: 2, colSpan: 2, rowSpan: 1, label: 'aside' },
      { id: 5, colStart: 1, rowStart: 3, colSpan: 12, rowSpan: 1, label: 'footer' },
    ],
  },
  'カード3列': {
    columns: 3,
    rows: 2,
    columnGap: 16,
    rowGap: 16,
    items: [
      { id: 1, colStart: 1, rowStart: 1, colSpan: 1, rowSpan: 1, label: 'card-1' },
      { id: 2, colStart: 2, rowStart: 1, colSpan: 1, rowSpan: 1, label: 'card-2' },
      { id: 3, colStart: 3, rowStart: 1, colSpan: 1, rowSpan: 1, label: 'card-3' },
      { id: 4, colStart: 1, rowStart: 2, colSpan: 1, rowSpan: 1, label: 'card-4' },
      { id: 5, colStart: 2, rowStart: 2, colSpan: 1, rowSpan: 1, label: 'card-5' },
      { id: 6, colStart: 3, rowStart: 2, colSpan: 1, rowSpan: 1, label: 'card-6' },
    ],
  },
}

const ITEM_COLORS = [
  'bg-teal/20 border-teal/50 text-teal',
  'bg-blue-500/20 border-blue-500/50 text-blue-400',
  'bg-purple-500/20 border-purple-500/50 text-purple-400',
  'bg-orange-500/20 border-orange-500/50 text-orange-400',
  'bg-pink-500/20 border-pink-500/50 text-pink-400',
  'bg-yellow-500/20 border-yellow-500/50 text-yellow-400',
  'bg-green-500/20 border-green-500/50 text-green-400',
  'bg-red-500/20 border-red-500/50 text-red-400',
]

function generateCSS(config: GridConfig): string {
  const { columns, rows, columnGap, rowGap, items } = config
  const colTemplate = `repeat(${columns}, 1fr)`
  const rowTemplate = `repeat(${rows}, minmax(60px, auto))`

  let css = `.grid-container {\n  display: grid;\n  grid-template-columns: ${colTemplate};\n  grid-template-rows: ${rowTemplate};\n  column-gap: ${columnGap}px;\n  row-gap: ${rowGap}px;\n}`

  items.forEach((item) => {
    const colVal = item.colSpan === 1 ? `${item.colStart}` : `${item.colStart} / span ${item.colSpan}`
    const rowVal = item.rowSpan === 1 ? `${item.rowStart}` : `${item.rowStart} / span ${item.rowSpan}`
    css += `\n\n.${item.label} {\n  grid-column: ${colVal};\n  grid-row: ${rowVal};\n}`
  })

  return css
}

function generateHTML(items: GridItem[]): string {
  const itemsHtml = items.map((item) => `  <div class="${item.label}">${item.label}</div>`).join('\n')
  return `<div class="grid-container">\n${itemsHtml}\n</div>`
}

function isCellOccupied(col: number, row: number, items: GridItem[], excludeId?: number): number | null {
  for (const item of items) {
    if (item.id === excludeId) continue
    if (
      col >= item.colStart &&
      col < item.colStart + item.colSpan &&
      row >= item.rowStart &&
      row < item.rowStart + item.rowSpan
    ) {
      return item.id
    }
  }
  return null
}

export function CssGridGenerator() {
  const [config, setConfig] = useState<GridConfig>({
    columns: 4,
    rows: 3,
    columnGap: 12,
    rowGap: 12,
    items: [
      { id: 1, colStart: 1, rowStart: 1, colSpan: 4, rowSpan: 1, label: 'header' },
      { id: 2, colStart: 1, rowStart: 2, colSpan: 1, rowSpan: 1, label: 'sidebar' },
      { id: 3, colStart: 2, rowStart: 2, colSpan: 3, rowSpan: 1, label: 'main' },
      { id: 4, colStart: 1, rowStart: 3, colSpan: 4, rowSpan: 1, label: 'footer' },
    ],
  })
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [nextId, setNextId] = useState(5)
  const [copiedCSS, setCopiedCSS] = useState(false)
  const [copiedHTML, setCopiedHTML] = useState(false)
  const [editingLabel, setEditingLabel] = useState<number | null>(null)
  const [labelInput, setLabelInput] = useState('')

  const selectedItem = config.items.find((i) => i.id === selectedId) ?? null

  const applyPreset = (name: string) => {
    setConfig(PRESETS[name])
    setSelectedId(null)
    setNextId(PRESETS[name].items.length + 1)
  }

  const updateConfig = useCallback((key: keyof Omit<GridConfig, 'items'>, value: number) => {
    setConfig((prev) => {
      const newConfig = { ...prev, [key]: value }
      // Clamp existing items to new grid bounds
      const newItems = prev.items
        .map((item) => ({
          ...item,
          colStart: Math.min(item.colStart, newConfig.columns),
          rowStart: Math.min(item.rowStart, newConfig.rows),
          colSpan: Math.min(item.colSpan, newConfig.columns - Math.min(item.colStart, newConfig.columns) + 1),
          rowSpan: Math.min(item.rowSpan, newConfig.rows - Math.min(item.rowStart, newConfig.rows) + 1),
        }))
        .filter((item) => item.colStart <= newConfig.columns && item.rowStart <= newConfig.rows)
      return { ...newConfig, items: newItems }
    })
  }, [])

  const handleCellClick = (col: number, row: number) => {
    const occupiedId = isCellOccupied(col, row, config.items)
    if (occupiedId !== null) {
      setSelectedId(occupiedId === selectedId ? null : occupiedId)
    } else {
      // Add new item
      const label = `item-${nextId}`
      const newItem: GridItem = { id: nextId, colStart: col, rowStart: row, colSpan: 1, rowSpan: 1, label }
      setConfig((prev) => ({ ...prev, items: [...prev.items, newItem] }))
      setSelectedId(nextId)
      setNextId((n) => n + 1)
    }
  }

  const updateSelectedItem = (key: keyof Omit<GridItem, 'id' | 'label'>, value: number) => {
    if (!selectedItem) return
    setConfig((prev) => ({
      ...prev,
      items: prev.items.map((item) => {
        if (item.id !== selectedId) return item
        const updated = { ...item, [key]: value }
        // Clamp to grid
        updated.colSpan = Math.min(updated.colSpan, prev.columns - updated.colStart + 1)
        updated.rowSpan = Math.min(updated.rowSpan, prev.rows - updated.rowStart + 1)
        return updated
      }),
    }))
  }

  const deleteSelectedItem = () => {
    setConfig((prev) => ({ ...prev, items: prev.items.filter((i) => i.id !== selectedId) }))
    setSelectedId(null)
  }

  const copyCSS = async () => {
    await navigator.clipboard.writeText(generateCSS(config))
    setCopiedCSS(true)
    setTimeout(() => setCopiedCSS(false), 1500)
  }

  const copyHTML = async () => {
    await navigator.clipboard.writeText(generateHTML(config.items))
    setCopiedHTML(true)
    setTimeout(() => setCopiedHTML(false), 1500)
  }

  const getItemColor = (id: number) => ITEM_COLORS[(id - 1) % ITEM_COLORS.length]

  const startEditLabel = (item: GridItem) => {
    setEditingLabel(item.id)
    setLabelInput(item.label)
  }

  const commitLabel = () => {
    if (editingLabel === null) return
    const clean = labelInput.trim().replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-_]/g, '') || `item-${editingLabel}`
    setConfig((prev) => ({
      ...prev,
      items: prev.items.map((i) => (i.id === editingLabel ? { ...i, label: clean } : i)),
    }))
    setEditingLabel(null)
  }

  return (
    <div className="space-y-6">
      {/* Presets */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted">プリセット:</span>
        {Object.keys(PRESETS).map((name) => (
          <button
            key={name}
            onClick={() => applyPreset(name)}
            className="rounded border border-border px-3 py-1 text-xs text-dim hover:border-teal hover:text-teal transition-colors"
          >
            {name}
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Left: Grid settings + Preview */}
        <div className="space-y-4">
          {/* Settings */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { key: 'columns' as const, label: '列数', min: 1, max: 12 },
              { key: 'rows' as const, label: '行数', min: 1, max: 12 },
              { key: 'columnGap' as const, label: 'column-gap (px)', min: 0, max: 48 },
              { key: 'rowGap' as const, label: 'row-gap (px)', min: 0, max: 48 },
            ].map(({ key, label, min, max }) => (
              <div key={key}>
                <label className="mb-1 block text-xs text-muted">{label}</label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={min}
                    max={max}
                    value={config[key]}
                    onChange={(e) => updateConfig(key, Number(e.target.value))}
                    className="w-full accent-teal"
                  />
                  <span className="w-6 text-right text-xs font-mono text-bright">{config[key]}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Visual Grid Preview */}
          <div
            className="overflow-auto rounded border border-border bg-bg p-3"
            style={{ minHeight: '200px' }}
          >
            <div
              className="relative"
              style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${config.columns}, minmax(40px, 1fr))`,
                gridTemplateRows: `repeat(${config.rows}, 56px)`,
                columnGap: `${config.columnGap}px`,
                rowGap: `${config.rowGap}px`,
              }}
            >
              {/* Ghost cells (clickable empty zones) */}
              {Array.from({ length: config.rows }, (_, r) =>
                Array.from({ length: config.columns }, (_, c) => {
                  const col = c + 1
                  const row = r + 1
                  const occupiedId = isCellOccupied(col, row, config.items)
                  if (occupiedId !== null) return null
                  return (
                    <div
                      key={`ghost-${col}-${row}`}
                      onClick={() => handleCellClick(col, row)}
                      style={{ gridColumn: col, gridRow: row }}
                      className="cursor-pointer rounded border border-dashed border-border hover:border-teal/50 hover:bg-teal/5 transition-colors"
                      title={`列${col} 行${row} — クリックして追加`}
                    />
                  )
                })
              )}

              {/* Actual grid items */}
              {config.items.map((item) => (
                <div
                  key={item.id}
                  onClick={() => setSelectedId(item.id === selectedId ? null : item.id)}
                  style={{
                    gridColumn: `${item.colStart} / span ${item.colSpan}`,
                    gridRow: `${item.rowStart} / span ${item.rowSpan}`,
                  }}
                  className={`cursor-pointer rounded border-2 flex items-center justify-center text-xs font-mono transition-all ${getItemColor(item.id)} ${item.id === selectedId ? 'ring-2 ring-teal ring-offset-1 ring-offset-bg' : ''}`}
                >
                  {editingLabel === item.id ? (
                    <input
                      autoFocus
                      value={labelInput}
                      onChange={(e) => setLabelInput(e.target.value)}
                      onBlur={commitLabel}
                      onKeyDown={(e) => { if (e.key === 'Enter') commitLabel() }}
                      onClick={(e) => e.stopPropagation()}
                      className="w-full bg-transparent text-center outline-none"
                    />
                  ) : (
                    <span
                      onDoubleClick={(e) => { e.stopPropagation(); startEditLabel(item) }}
                      className="truncate px-1"
                      title="ダブルクリックで名前を編集"
                    >
                      {item.label}
                    </span>
                  )}
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted">空白セルをクリックして追加 / アイテムをクリックして選択 / ダブルクリックで名前編集</p>
          </div>
        </div>

        {/* Right: Item editor + Code */}
        <div className="space-y-4">
          {/* Selected item editor */}
          <div className="rounded border border-border bg-surface p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted">選択アイテム</p>
            {selectedItem ? (
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs text-muted">ラベル</label>
                  <input
                    value={selectedItem.label}
                    onChange={(e) => {
                      const clean = e.target.value.replace(/[^a-zA-Z0-9-_]/g, '')
                      setConfig((prev) => ({
                        ...prev,
                        items: prev.items.map((i) => i.id === selectedId ? { ...i, label: clean } : i),
                      }))
                    }}
                    className="w-full rounded border border-border bg-bg px-2 py-1 font-mono text-xs text-bright outline-none focus:border-teal"
                  />
                </div>
                {[
                  { key: 'colStart' as const, label: '開始列', min: 1, max: config.columns },
                  { key: 'rowStart' as const, label: '開始行', min: 1, max: config.rows },
                  { key: 'colSpan' as const, label: '列スパン', min: 1, max: config.columns - selectedItem.colStart + 1 },
                  { key: 'rowSpan' as const, label: '行スパン', min: 1, max: config.rows - selectedItem.rowStart + 1 },
                ].map(({ key, label, min, max }) => (
                  <div key={key}>
                    <label className="mb-1 block text-xs text-muted">{label}</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min={min}
                        max={max}
                        value={selectedItem[key]}
                        onChange={(e) => updateSelectedItem(key, Number(e.target.value))}
                        className="w-full accent-teal"
                      />
                      <span className="w-5 text-right text-xs font-mono text-bright">{selectedItem[key]}</span>
                    </div>
                  </div>
                ))}
                <button
                  onClick={deleteSelectedItem}
                  className="w-full rounded border border-red-500/40 px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  削除
                </button>
              </div>
            ) : (
              <p className="text-xs text-muted">アイテムを選択してください</p>
            )}
          </div>

          {/* Copy buttons */}
          <div className="flex gap-2">
            <button
              onClick={copyCSS}
              className="flex-1 rounded border border-border px-3 py-2 text-xs text-dim hover:border-teal hover:text-teal transition-colors"
            >
              {copiedCSS ? '✓ コピー済み' : 'CSSをコピー'}
            </button>
            <button
              onClick={copyHTML}
              className="flex-1 rounded border border-border px-3 py-2 text-xs text-dim hover:border-teal hover:text-teal transition-colors"
            >
              {copiedHTML ? '✓ コピー済み' : 'HTMLをコピー'}
            </button>
          </div>

          {/* CSS output */}
          <div>
            <p className="mb-1 text-xs text-muted">生成CSS</p>
            <pre className="overflow-x-auto rounded border border-border bg-bg p-3 text-xs text-primary leading-relaxed whitespace-pre-wrap break-all">
              {generateCSS(config)}
            </pre>
          </div>
        </div>
      </div>
    </div>
  )
}
