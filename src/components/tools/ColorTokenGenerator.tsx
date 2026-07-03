'use client'

import { useState, useMemo } from 'react'

interface ColorEntry {
  id: string
  name: string
  hex: string
}

const INITIAL_COLORS: ColorEntry[] = [
  { id: '1', name: 'primary', hex: '#6366f1' },
  { id: '2', name: 'secondary', hex: '#8b5cf6' },
  { id: '3', name: 'accent', hex: '#06b6d4' },
  { id: '4', name: 'danger', hex: '#ef4444' },
]

const TABS = ['CSS Variables', 'Tailwind', 'Sass', 'Style Dictionary'] as const
type Tab = (typeof TABS)[number]

function safeName(name: string, index: number): string {
  return name.trim() || `color-${index + 1}`
}

function generateCss(colors: ColorEntry[]): string {
  const lines = [':root {']
  colors.forEach((c, i) => lines.push(`  --${safeName(c.name, i)}: ${c.hex};`))
  lines.push('}')
  return lines.join('\n')
}

function generateTailwind(colors: ColorEntry[]): string {
  const inner = colors.map((c, i) => `    ${safeName(c.name, i)}: '${c.hex}',`).join('\n')
  return `module.exports = {\n  theme: {\n    colors: {\n${inner}\n    },\n  },\n}`
}

function generateSass(colors: ColorEntry[]): string {
  return colors.map((c, i) => `$${safeName(c.name, i)}: ${c.hex};`).join('\n')
}

function generateStyleDictionary(colors: ColorEntry[]): string {
  const tokens: Record<string, Record<string, { value: string }>> = { color: {} }
  colors.forEach((c, i) => { tokens.color[safeName(c.name, i)] = { value: c.hex } })
  return JSON.stringify(tokens, null, 2)
}

function isValidHex(hex: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(hex)
}

export function ColorTokenGenerator() {
  const [colors, setColors] = useState<ColorEntry[]>(INITIAL_COLORS)
  const [activeTab, setActiveTab] = useState<Tab>('CSS Variables')
  const [copied, setCopied] = useState(false)

  const output = useMemo(() => {
    switch (activeTab) {
      case 'CSS Variables': return generateCss(colors)
      case 'Tailwind': return generateTailwind(colors)
      case 'Sass': return generateSass(colors)
      case 'Style Dictionary': return generateStyleDictionary(colors)
    }
  }, [colors, activeTab])

  const addColor = () => {
    if (colors.length >= 10) return
    setColors([...colors, { id: Date.now().toString(), name: '', hex: '#000000' }])
  }

  const removeColor = (id: string) => {
    if (colors.length <= 1) return
    setColors(colors.filter((c) => c.id !== id))
  }

  const updateColor = (id: string, field: 'name' | 'hex', value: string) => {
    setColors(colors.map((c) => (c.id === id ? { ...c, [field]: value } : c)))
  }

  const copy = async () => {
    await navigator.clipboard.writeText(output)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Color rows */}
      <div className="flex flex-col gap-3">
        <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--muted)]">カラー</span>
        <div className="flex flex-col gap-2">
          {colors.map((color, index) => (
            <div key={color.id} className="flex items-center gap-2.5">
              {/* Swatch */}
              <div
                className="h-7 w-7 shrink-0 rounded border border-[var(--border-hi)] transition-colors"
                style={{ backgroundColor: isValidHex(color.hex) ? color.hex : 'var(--surface-hi)' }}
              />
              {/* Color picker */}
              <input
                type="color"
                value={isValidHex(color.hex) ? color.hex : '#000000'}
                onChange={(e) => updateColor(color.id, 'hex', e.target.value)}
                className="h-7 w-8 shrink-0 cursor-pointer rounded border border-[var(--border)] bg-transparent p-px"
              />
              {/* HEX input */}
              <input
                type="text"
                value={color.hex}
                onChange={(e) => updateColor(color.id, 'hex', e.target.value)}
                placeholder="#000000"
                className={`w-24 rounded border px-2 py-1 font-mono text-xs outline-none transition-colors focus:border-[var(--teal)] bg-[var(--bg)] ${
                  isValidHex(color.hex)
                    ? 'border-[var(--border)] text-[var(--primary)]'
                    : 'border-red-500/50 text-red-400'
                }`}
              />
              {/* Name input */}
              <input
                type="text"
                value={color.name}
                onChange={(e) => updateColor(color.id, 'name', e.target.value)}
                placeholder={`color-${index + 1}`}
                className="min-w-0 flex-1 rounded border border-[var(--border)] bg-[var(--bg)] px-2 py-1 font-mono text-xs text-[var(--primary)] outline-none transition-colors focus:border-[var(--teal)]"
              />
              {/* Delete */}
              <button
                onClick={() => removeColor(color.id)}
                disabled={colors.length <= 1}
                aria-label="削除"
                className="shrink-0 rounded border border-[var(--border)] px-2 py-1 font-mono text-xs text-[var(--muted)] transition-colors hover:border-red-500/50 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-20"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        <button
          onClick={addColor}
          disabled={colors.length >= 10}
          className="self-start rounded border border-[var(--border)] px-3 py-1 font-mono text-xs text-[var(--dim)] transition-colors hover:border-[var(--teal)] hover:text-[var(--teal)] disabled:cursor-not-allowed disabled:opacity-30"
        >
          + カラーを追加 ({colors.length}/10)
        </button>
      </div>

      {/* Output */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex flex-wrap gap-1">
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`rounded px-3 py-1 font-mono text-xs transition-colors ${
                  activeTab === tab
                    ? 'bg-[var(--teal)] text-[var(--bg)] font-semibold'
                    : 'border border-[var(--border)] text-[var(--dim)] hover:border-[var(--teal)] hover:text-[var(--teal)]'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
          <button
            onClick={copy}
            className="rounded border border-[var(--border)] px-2.5 py-0.5 font-mono text-xs text-[var(--dim)] transition-colors hover:border-[var(--teal)] hover:text-[var(--teal)]"
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>

        <div className="relative overflow-hidden rounded border border-[var(--border)] bg-[var(--bg)]">
          <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[var(--teal)] opacity-30 rounded-l" />
          <pre className="overflow-x-auto p-4 pl-5 font-mono text-sm text-[var(--primary)] leading-relaxed">
            {output}
          </pre>
        </div>
      </div>
    </div>
  )
}
