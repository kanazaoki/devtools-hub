'use client'
import { useState, useEffect } from 'react'

const FONT_LIST = [
  // Sans-serif
  { name: 'Arial', category: 'sans-serif' },
  { name: 'Helvetica Neue', category: 'sans-serif' },
  { name: 'Verdana', category: 'sans-serif' },
  { name: 'Tahoma', category: 'sans-serif' },
  { name: 'Trebuchet MS', category: 'sans-serif' },
  { name: 'Segoe UI', category: 'sans-serif' },
  { name: 'Roboto', category: 'sans-serif' },
  { name: 'Ubuntu', category: 'sans-serif' },
  { name: 'Cantarell', category: 'sans-serif' },
  { name: 'Noto Sans', category: 'sans-serif' },
  // Serif
  { name: 'Georgia', category: 'serif' },
  { name: 'Times New Roman', category: 'serif' },
  { name: 'Palatino', category: 'serif' },
  { name: 'Garamond', category: 'serif' },
  { name: 'Book Antiqua', category: 'serif' },
  { name: 'Baskerville', category: 'serif' },
  // Monospace
  { name: 'Courier New', category: 'monospace' },
  { name: 'Consolas', category: 'monospace' },
  { name: 'Menlo', category: 'monospace' },
  { name: 'Monaco', category: 'monospace' },
  { name: 'Lucida Console', category: 'monospace' },
  { name: 'Cascadia Code', category: 'monospace' },
  { name: 'JetBrains Mono', category: 'monospace' },
  { name: 'Fira Code', category: 'monospace' },
  // Japanese
  { name: 'Hiragino Kaku Gothic ProN', category: 'japanese' },
  { name: 'Hiragino Mincho ProN', category: 'japanese' },
  { name: 'Yu Gothic', category: 'japanese' },
  { name: 'Yu Mincho', category: 'japanese' },
  { name: 'Meiryo', category: 'japanese' },
  { name: 'BIZ UDPGothic', category: 'japanese' },
  { name: 'Noto Sans JP', category: 'japanese' },
  { name: 'Noto Serif JP', category: 'japanese' },
]

type Category = 'all' | 'sans-serif' | 'serif' | 'monospace' | 'japanese'
type AvailFilter = 'all' | 'available' | 'unavailable'

function checkFontAvailable(font: string): boolean {
  try {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) return false
    const size = 24
    ctx.font = `${size}px monospace`
    const base = ctx.measureText('ABCabc123').width
    ctx.font = `${size}px "${font}", monospace`
    const test = ctx.measureText('ABCabc123').width
    return base !== test
  } catch {
    return false
  }
}

export function FontInspector() {
  const [previewText, setPreviewText] = useState('The quick brown fox. 日本語テキスト 0123')
  const [fontSize, setFontSize] = useState(18)
  const [category, setCategory] = useState<Category>('all')
  const [availFilter, setAvailFilter] = useState<AvailFilter>('all')
  const [available, setAvailable] = useState<Record<string, boolean>>({})
  const [checkedAll, setCheckedAll] = useState(false)
  const [stack, setStack] = useState<string[]>([])
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const result: Record<string, boolean> = {}
    FONT_LIST.forEach(({ name }) => { result[name] = checkFontAvailable(name) })
    setAvailable(result)
    setCheckedAll(true)
  }, [])

  const CATEGORIES: { value: Category; label: string }[] = [
    { value: 'all', label: '全て' },
    { value: 'sans-serif', label: 'サンセリフ' },
    { value: 'serif', label: 'セリフ' },
    { value: 'monospace', label: '等幅' },
    { value: 'japanese', label: '日本語' },
  ]

  const displayed = FONT_LIST.filter((f) => {
    if (category !== 'all' && f.category !== category) return false
    if (availFilter === 'available') return available[f.name]
    if (availFilter === 'unavailable') return !available[f.name]
    return true
  })

  const toggleStack = (font: string) =>
    setStack((s) => (s.includes(font) ? s.filter((f) => f !== font) : [...s, font]))

  const stackCss = stack.map((f) => (f.includes(' ') ? `"${f}"` : f)).join(', ')
  const cssDecl = `font-family: ${stackCss}, sans-serif;`

  const copy = async () => {
    await navigator.clipboard.writeText(cssDecl)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const availCount = Object.values(available).filter(Boolean).length

  return (
    <div className="space-y-5">
      {/* Controls */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-muted">プレビューテキスト</label>
          <input
            value={previewText}
            onChange={(e) => setPreviewText(e.target.value)}
            className="w-full rounded border border-border bg-bg px-3 py-2 text-sm text-bright focus:border-teal focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted">
            フォントサイズ: {fontSize}px
          </label>
          <input
            type="range"
            min={12}
            max={48}
            value={fontSize}
            onChange={(e) => setFontSize(Number(e.target.value))}
            className="w-full accent-teal mt-2"
          />
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div className="flex flex-wrap gap-1">
          {CATEGORIES.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setCategory(value)}
              className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
                category === value ? 'bg-teal text-bg' : 'bg-surface text-muted hover:text-bright'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          {(['all', 'available', 'unavailable'] as AvailFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setAvailFilter(f)}
              className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
                availFilter === f ? 'bg-surface-hi text-bright' : 'text-muted hover:text-bright'
              }`}
            >
              {f === 'all' ? '全て' : f === 'available' ? `✓ 利用可 ${checkedAll ? `(${availCount})` : ''}` : '✕ 未インストール'}
            </button>
          ))}
        </div>
      </div>

      {/* Stack builder info */}
      {stack.length > 0 && (
        <div className="flex items-center gap-3 rounded border border-teal/30 bg-teal/5 px-3 py-2">
          <span className="text-xs text-muted">{stack.length}本のフォントをスタックに追加中</span>
          <button onClick={() => setStack([])} className="text-xs text-muted hover:text-bright">
            クリア
          </button>
          <button onClick={copy} className="ml-auto text-xs font-medium text-teal hover:underline">
            {copied ? 'コピー済み ✓' : 'CSS コピー'}
          </button>
        </div>
      )}

      {/* Font list */}
      <div className="max-h-[480px] space-y-2 overflow-y-auto pr-1">
        {displayed.map(({ name, category: cat }) => {
          const avail = available[name]
          const inStack = stack.includes(name)
          return (
            <div
              key={name}
              className={`rounded border p-3 transition-colors ${
                inStack
                  ? 'border-teal bg-teal/5'
                  : 'border-border bg-surface hover:border-border-hi'
              }`}
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`shrink-0 text-xs ${checkedAll ? (avail ? 'text-teal' : 'text-muted') : 'text-muted'}`}>
                    {checkedAll ? (avail ? '✓' : '✕') : '…'}
                  </span>
                  <span className="font-mono text-xs text-dim truncate">{name}</span>
                  <span className="shrink-0 rounded bg-surface-hi px-1.5 py-0.5 text-[10px] text-muted">
                    {cat}
                  </span>
                </div>
                <button
                  onClick={() => toggleStack(name)}
                  className={`shrink-0 rounded px-2 py-0.5 text-xs transition-colors ${
                    inStack
                      ? 'bg-teal/20 text-teal'
                      : 'text-muted hover:text-bright'
                  }`}
                >
                  {inStack ? '− 外す' : '＋ スタック'}
                </button>
              </div>
              <p
                style={{ fontFamily: `"${name}", sans-serif`, fontSize: `${fontSize}px`, lineHeight: 1.5 }}
                className={`text-bright break-words ${!avail ? 'opacity-40' : ''}`}
              >
                {previewText || '(プレビューテキストを入力)'}
              </p>
            </div>
          )
        })}
      </div>

      {/* CSS output */}
      {stack.length > 0 && (
        <div className="rounded border border-border bg-bg p-4">
          <p className="mb-2 text-xs text-muted">font-family スタック（優先度順）</p>
          <div className="mb-3 flex flex-wrap gap-1">
            {stack.map((f, i) => (
              <span key={f} className="flex items-center gap-1 rounded bg-surface px-2 py-0.5 font-mono text-xs text-bright">
                <span className="text-muted">{i + 1}.</span> {f}
                <button onClick={() => toggleStack(f)} className="ml-1 text-muted hover:text-red-400">✕</button>
              </span>
            ))}
          </div>
          <code className="block break-all font-mono text-sm text-teal">{cssDecl}</code>
        </div>
      )}
    </div>
  )
}
