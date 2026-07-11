'use client'
import { useState } from 'react'

const DEFAULT_LAYERS = ['reset', 'base', 'components', 'utilities', 'overrides']

export function CssLayerVisualizer() {
  const [layers, setLayers] = useState(DEFAULT_LAYERS)
  const [newLayer, setNewLayer] = useState('')
  const [dragging, setDragging] = useState<number | null>(null)
  const [dragOver, setDragOver] = useState<number | null>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')

  const addLayer = () => {
    const name = newLayer.trim().replace(/[^a-zA-Z0-9_-]/g, '')
    if (!name) { setError('レイヤー名を入力してください'); return }
    if (layers.includes(name)) { setError(`"${name}" は既に存在します`); return }
    setLayers((l) => [...l, name])
    setNewLayer('')
    setError('')
  }

  const removeLayer = (i: number) => setLayers((l) => l.filter((_, idx) => idx !== i))

  const onDragStart = (i: number) => setDragging(i)
  const onDragOver = (e: React.DragEvent, i: number) => {
    e.preventDefault()
    setDragOver(i)
  }
  const onDrop = (e: React.DragEvent, i: number) => {
    e.preventDefault()
    if (dragging === null || dragging === i) { setDragging(null); setDragOver(null); return }
    const next = [...layers]
    const [item] = next.splice(dragging, 1)
    next.splice(i, 0, item)
    setLayers(next)
    setDragging(null)
    setDragOver(null)
  }
  const onDragEnd = () => { setDragging(null); setDragOver(null) }

  // CSS output: @layer declaration + each block
  const declaration = `@layer ${layers.join(', ')};`
  const blocks = layers.map((l) => `@layer ${l} {\n  /* ${l} のスタイル */\n}`).join('\n\n')
  const css = `${declaration}\n\n${blocks}`

  const copy = async () => {
    await navigator.clipboard.writeText(css)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const reset = () => setLayers(DEFAULT_LAYERS)

  // Reversed for display: lowest index = lowest priority (bottom), highest = top
  const displayLayers = [...layers].map((name, idx) => ({ name, idx })).reverse()

  return (
    <div className="space-y-6">
      {/* Add layer */}
      <div>
        <label className="mb-2 block text-xs font-medium text-muted">レイヤーを追加</label>
        <div className="flex gap-2">
          <input
            value={newLayer}
            onChange={(e) => { setNewLayer(e.target.value); setError('') }}
            onKeyDown={(e) => e.key === 'Enter' && addLayer()}
            placeholder="レイヤー名（英数字・-・_）"
            className="flex-1 rounded border border-border bg-bg px-3 py-2 font-mono text-sm text-bright placeholder:text-muted focus:border-teal focus:outline-none"
          />
          <button
            onClick={addLayer}
            className="rounded bg-teal/20 px-4 py-2 text-sm font-medium text-teal hover:bg-teal/30"
          >
            追加
          </button>
          <button
            onClick={reset}
            className="rounded border border-border px-3 py-2 text-xs text-muted hover:text-bright"
          >
            リセット
          </button>
        </div>
        {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
      </div>

      {/* Priority visualizer */}
      <div>
        <p className="mb-3 text-xs text-muted">
          優先度マップ（<span className="text-bright">上ほど高優先度</span> — ドラッグで並び替え）
        </p>
        <div className="space-y-1.5">
          {displayLayers.map(({ name, idx }, ri) => {
            const priority = layers.length - idx
            const pct = Math.round((priority / layers.length) * 100)
            const isTop = ri === 0
            return (
              <div
                key={name}
                draggable
                onDragStart={() => onDragStart(idx)}
                onDragOver={(e) => onDragOver(e, idx)}
                onDrop={(e) => onDrop(e, idx)}
                onDragEnd={onDragEnd}
                className={`flex cursor-grab items-center gap-3 rounded border px-3 py-2.5 transition-colors active:cursor-grabbing ${
                  dragging === idx
                    ? 'opacity-40'
                    : dragOver === idx
                    ? 'border-teal bg-teal/10'
                    : isTop
                    ? 'border-teal/40 bg-teal/5'
                    : 'border-border bg-surface hover:border-border-hi'
                }`}
              >
                <span className="shrink-0 select-none text-muted text-sm">⠿</span>
                <div className="flex-1 min-w-0">
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <span className="font-mono text-sm text-bright truncate">@layer {name}</span>
                    <span className="shrink-0 text-xs text-muted">優先度 {priority}/{layers.length}</span>
                  </div>
                  <div className="h-1 rounded-full bg-surface-hi overflow-hidden">
                    <div
                      className="h-full rounded-full bg-teal transition-all duration-300"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
                <button
                  onClick={() => removeLayer(idx)}
                  className="shrink-0 px-1 text-xs text-muted hover:text-red-400"
                >
                  ✕
                </button>
              </div>
            )
          })}
        </div>
        <p className="mt-2 text-xs text-muted">
          ※ CSSカスケードでは後に宣言されたレイヤーが勝ちます。上のレイヤーが最後に宣言されます。
        </p>
      </div>

      {/* CSS output */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="text-xs font-medium text-muted">生成された CSS</label>
          <button onClick={copy} className="text-xs font-medium text-teal hover:underline">
            {copied ? 'コピー済み ✓' : 'コピー'}
          </button>
        </div>
        <pre className="overflow-x-auto rounded border border-border bg-bg p-4 font-mono text-xs leading-relaxed text-bright">
          {css}
        </pre>
      </div>
    </div>
  )
}
