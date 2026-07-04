'use client'

import { useState, useCallback } from 'react'

// ─── Conversion tables ────────────────────────────────────────────────────────

const SPACING_MAP: Record<number, string> = {
  0: '0', 1: 'px', 2: '0.5', 4: '1', 6: '1.5', 8: '2', 10: '2.5', 12: '3',
  14: '3.5', 16: '4', 20: '5', 24: '6', 28: '7', 32: '8', 36: '9', 40: '10',
  44: '11', 48: '12', 56: '14', 64: '16', 80: '20', 96: '24', 112: '28',
  128: '32', 144: '36', 160: '40', 176: '44', 192: '48', 208: '52', 224: '56',
  240: '60', 256: '64', 288: '72', 320: '80', 384: '96',
}

const FONT_SIZE_MAP: Record<number, string> = {
  12: 'xs', 14: 'sm', 16: 'base', 18: 'lg', 20: 'xl', 24: '2xl',
  30: '3xl', 36: '4xl', 48: '5xl', 60: '6xl', 72: '7xl', 96: '8xl', 128: '9xl',
}

const FONT_WEIGHT_MAP: Record<number, string> = {
  100: 'thin', 200: 'extralight', 300: 'light', 400: 'normal', 500: 'medium',
  600: 'semibold', 700: 'bold', 800: 'extrabold', 900: 'black',
}

const BORDER_RADIUS_MAP: Record<number, string> = {
  0: 'none', 2: 'sm', 4: '', 6: 'md', 8: 'lg', 12: 'xl', 16: '2xl',
  24: '3xl', 9999: 'full',
}

const LINE_HEIGHT_MAP: Record<number | string, string> = {
  1: 'none', 1.25: 'tight', 1.375: 'snug', 1.5: 'normal',
  1.625: 'relaxed', 2: 'loose',
}

const TAILWIND_COLORS: Record<string, string> = {
  '#ffffff': 'white', '#000000': 'black',
  '#f9fafb': 'gray-50', '#f3f4f6': 'gray-100', '#e5e7eb': 'gray-200',
  '#d1d5db': 'gray-300', '#9ca3af': 'gray-400', '#6b7280': 'gray-500',
  '#4b5563': 'gray-600', '#374151': 'gray-700', '#1f2937': 'gray-800',
  '#111827': 'gray-900', '#ef4444': 'red-500', '#f97316': 'orange-500',
  '#eab308': 'yellow-500', '#22c55e': 'green-500', '#14b8a6': 'teal-500',
  '#3b82f6': 'blue-500', '#6366f1': 'indigo-500', '#8b5cf6': 'violet-500',
  '#ec4899': 'pink-500', '#06b6d4': 'cyan-500',
}

function nearestSpacing(px: number): string {
  const keys = Object.keys(SPACING_MAP).map(Number)
  let closest = keys.reduce((a, b) => Math.abs(b - px) < Math.abs(a - px) ? b : a)
  return SPACING_MAP[closest]
}

function parseColor(val: string): string | null {
  const hex = val.trim().toLowerCase()
  if (TAILWIND_COLORS[hex]) return TAILWIND_COLORS[hex]
  return null
}

function parsePx(val: string): number | null {
  const m = val.trim().match(/^(-?[\d.]+)px$/)
  return m ? parseFloat(m[1]) : null
}

// ─── Core converter ──────────────────────────────────────────────────────────

type LineResult = { input: string; classes: string[]; unsupported: string[] }

function convertLine(line: string): LineResult {
  const trimmed = line.trim()
  if (!trimmed || !trimmed.includes(':')) return { input: line, classes: [], unsupported: [] }

  const colonIdx = trimmed.indexOf(':')
  const prop = trimmed.slice(0, colonIdx).trim().toLowerCase()
  const val = trimmed.slice(colonIdx + 1).replace(/;$/, '').trim()

  const classes: string[] = []
  const unsupported: string[] = []

  const add = (cls: string) => classes.push(cls)
  const noMatch = () => unsupported.push(`${prop}: ${val}`)

  const px = parsePx(val)
  const parts = val.split(/\s+/)

  switch (prop) {
    // Display
    case 'display': {
      const map: Record<string, string> = {
        flex: 'flex', grid: 'grid', block: 'block', 'inline-block': 'inline-block',
        inline: 'inline', 'inline-flex': 'inline-flex', 'inline-grid': 'inline-grid',
        none: 'hidden', 'table': 'table',
      }
      map[val] ? add(map[val]) : noMatch(); break
    }
    // Margin
    case 'margin': {
      if (parts.length === 1 && parsePx(parts[0]) !== null) {
        add(`m-${nearestSpacing(parsePx(parts[0])!)}`)
      } else if (parts.length === 2) {
        const v = parsePx(parts[0]), h = parsePx(parts[1])
        if (v !== null && h !== null) { add(`my-${nearestSpacing(v)}`); add(`mx-${nearestSpacing(h)}`) }
        else noMatch()
      } else if (parts.length === 4) {
        const [t, r, b, l] = parts.map(parsePx)
        if ([t, r, b, l].every(n => n !== null)) {
          add(`mt-${nearestSpacing(t!)}`); add(`mr-${nearestSpacing(r!)}`)
          add(`mb-${nearestSpacing(b!)}`); add(`ml-${nearestSpacing(l!)}`)
        } else noMatch()
      } else noMatch(); break
    }
    case 'margin-top': px !== null ? add(`mt-${nearestSpacing(px)}`) : noMatch(); break
    case 'margin-right': px !== null ? add(`mr-${nearestSpacing(px)}`) : noMatch(); break
    case 'margin-bottom': px !== null ? add(`mb-${nearestSpacing(px)}`) : noMatch(); break
    case 'margin-left': px !== null ? add(`ml-${nearestSpacing(px)}`) : noMatch(); break
    // Padding
    case 'padding': {
      if (parts.length === 1 && parsePx(parts[0]) !== null) {
        add(`p-${nearestSpacing(parsePx(parts[0])!)}`)
      } else if (parts.length === 2) {
        const v = parsePx(parts[0]), h = parsePx(parts[1])
        if (v !== null && h !== null) { add(`py-${nearestSpacing(v)}`); add(`px-${nearestSpacing(h)}`) }
        else noMatch()
      } else if (parts.length === 4) {
        const [t, r, b, l] = parts.map(parsePx)
        if ([t, r, b, l].every(n => n !== null)) {
          add(`pt-${nearestSpacing(t!)}`); add(`pr-${nearestSpacing(r!)}`)
          add(`pb-${nearestSpacing(b!)}`); add(`pl-${nearestSpacing(l!)}`)
        } else noMatch()
      } else noMatch(); break
    }
    case 'padding-top': px !== null ? add(`pt-${nearestSpacing(px)}`) : noMatch(); break
    case 'padding-right': px !== null ? add(`pr-${nearestSpacing(px)}`) : noMatch(); break
    case 'padding-bottom': px !== null ? add(`pb-${nearestSpacing(px)}`) : noMatch(); break
    case 'padding-left': px !== null ? add(`pl-${nearestSpacing(px)}`) : noMatch(); break
    // Width / Height
    case 'width': {
      if (val === '100%') add('w-full')
      else if (val === '100vw') add('w-screen')
      else if (val === 'auto') add('w-auto')
      else if (px !== null) add(`w-${nearestSpacing(px)}`)
      else noMatch(); break
    }
    case 'height': {
      if (val === '100%') add('h-full')
      else if (val === '100vh') add('h-screen')
      else if (val === 'auto') add('h-auto')
      else if (px !== null) add(`h-${nearestSpacing(px)}`)
      else noMatch(); break
    }
    case 'max-width': {
      const sm: Record<string, string> = { '640px': 'sm', '768px': 'md', '1024px': 'lg', '1280px': 'xl', '1536px': '2xl', '100%': 'full', 'none': 'none' }
      sm[val] ? add(`max-w-${sm[val]}`) : (px !== null ? add(`max-w-[${val}]`) : noMatch()); break
    }
    // Font
    case 'font-size': {
      if (px !== null && FONT_SIZE_MAP[px]) add(`text-${FONT_SIZE_MAP[px]}`)
      else noMatch(); break
    }
    case 'font-weight': {
      const n = parseInt(val)
      FONT_WEIGHT_MAP[n] ? add(`font-${FONT_WEIGHT_MAP[n]}`) : noMatch(); break
    }
    case 'font-style': val === 'italic' ? add('italic') : (val === 'normal' ? add('not-italic') : noMatch()); break
    case 'line-height': {
      const num = parseFloat(val)
      LINE_HEIGHT_MAP[num] ? add(`leading-${LINE_HEIGHT_MAP[num]}`) : (px !== null ? noMatch() : noMatch()); break
    }
    case 'text-align': {
      const m: Record<string, string> = { left: 'text-left', center: 'text-center', right: 'text-right', justify: 'text-justify' }
      m[val] ? add(m[val]) : noMatch(); break
    }
    case 'text-decoration': {
      const m: Record<string, string> = { underline: 'underline', 'line-through': 'line-through', none: 'no-underline' }
      m[val] ? add(m[val]) : noMatch(); break
    }
    case 'text-transform': {
      const m: Record<string, string> = { uppercase: 'uppercase', lowercase: 'lowercase', capitalize: 'capitalize', none: 'normal-case' }
      m[val] ? add(m[val]) : noMatch(); break
    }
    // Color
    case 'color': {
      const c = parseColor(val)
      c ? add(`text-${c}`) : (val === 'inherit' ? add('text-inherit') : noMatch()); break
    }
    case 'background-color': {
      const c = parseColor(val)
      c ? add(`bg-${c}`) : (val === 'transparent' ? add('bg-transparent') : noMatch()); break
    }
    // Border
    case 'border-radius': {
      if (parts.length === 1) {
        const n = parsePx(parts[0])
        if (n !== null) {
          const keys = Object.keys(BORDER_RADIUS_MAP).map(Number)
          const closest = keys.reduce((a, b) => Math.abs(b - n) < Math.abs(a - n) ? b : a)
          const suffix = BORDER_RADIUS_MAP[closest]
          add(`rounded${suffix ? '-' + suffix : ''}`)
        } else noMatch()
      } else noMatch(); break
    }
    case 'border-width': {
      if (px === null) { noMatch(); break }
      if (px === 0) add('border-0')
      else if (px === 1) add('border')
      else if (px === 2) add('border-2')
      else if (px === 4) add('border-4')
      else if (px === 8) add('border-8')
      else noMatch()
      break
    }
    case 'border-style': {
      const m: Record<string, string> = { solid: 'border-solid', dashed: 'border-dashed', dotted: 'border-dotted', none: 'border-none' }
      m[val] ? add(m[val]) : noMatch(); break
    }
    case 'border-color': { const c = parseColor(val); c ? add(`border-${c}`) : noMatch(); break }
    // Flex
    case 'flex-direction': {
      const m: Record<string, string> = { row: 'flex-row', 'row-reverse': 'flex-row-reverse', column: 'flex-col', 'column-reverse': 'flex-col-reverse' }
      m[val] ? add(m[val]) : noMatch(); break
    }
    case 'flex-wrap': {
      const m: Record<string, string> = { wrap: 'flex-wrap', 'nowrap': 'flex-nowrap', 'wrap-reverse': 'flex-wrap-reverse' }
      m[val] ? add(m[val]) : noMatch(); break
    }
    case 'justify-content': {
      const m: Record<string, string> = { 'flex-start': 'justify-start', 'flex-end': 'justify-end', center: 'justify-center', 'space-between': 'justify-between', 'space-around': 'justify-around', 'space-evenly': 'justify-evenly' }
      m[val] ? add(m[val]) : noMatch(); break
    }
    case 'align-items': {
      const m: Record<string, string> = { 'flex-start': 'items-start', 'flex-end': 'items-end', center: 'items-center', baseline: 'items-baseline', stretch: 'items-stretch' }
      m[val] ? add(m[val]) : noMatch(); break
    }
    case 'gap': px !== null ? add(`gap-${nearestSpacing(px)}`) : noMatch(); break
    case 'gap-x': case 'column-gap': px !== null ? add(`gap-x-${nearestSpacing(px)}`) : noMatch(); break
    case 'gap-y': case 'row-gap': px !== null ? add(`gap-y-${nearestSpacing(px)}`) : noMatch(); break
    case 'flex': {
      const m: Record<string, string> = { '1': 'flex-1', 'auto': 'flex-auto', none: 'flex-none', 'initial': 'flex-initial' }
      m[val] ? add(m[val]) : noMatch(); break
    }
    case 'flex-grow': val === '1' ? add('flex-grow') : (val === '0' ? add('flex-grow-0') : noMatch()); break
    case 'flex-shrink': val === '1' ? add('flex-shrink') : (val === '0' ? add('flex-shrink-0') : noMatch()); break
    // Position
    case 'position': {
      const m: Record<string, string> = { static: 'static', relative: 'relative', absolute: 'absolute', fixed: 'fixed', sticky: 'sticky' }
      m[val] ? add(m[val]) : noMatch(); break
    }
    case 'top': px !== null ? add(`top-${nearestSpacing(px)}`) : noMatch(); break
    case 'right': px !== null ? add(`right-${nearestSpacing(px)}`) : noMatch(); break
    case 'bottom': px !== null ? add(`bottom-${nearestSpacing(px)}`) : noMatch(); break
    case 'left': px !== null ? add(`left-${nearestSpacing(px)}`) : noMatch(); break
    // Overflow
    case 'overflow': {
      const m: Record<string, string> = { hidden: 'overflow-hidden', auto: 'overflow-auto', scroll: 'overflow-scroll', visible: 'overflow-visible' }
      m[val] ? add(m[val]) : noMatch(); break
    }
    case 'overflow-x': {
      const m: Record<string, string> = { hidden: 'overflow-x-hidden', auto: 'overflow-x-auto', scroll: 'overflow-x-scroll' }
      m[val] ? add(m[val]) : noMatch(); break
    }
    case 'overflow-y': {
      const m: Record<string, string> = { hidden: 'overflow-y-hidden', auto: 'overflow-y-auto', scroll: 'overflow-y-scroll' }
      m[val] ? add(m[val]) : noMatch(); break
    }
    // Opacity / Cursor / Z-index
    case 'opacity': {
      const n = Math.round(parseFloat(val) * 100)
      const opts = [0, 5, 10, 20, 25, 30, 40, 50, 60, 70, 75, 80, 90, 95, 100]
      const closest = opts.reduce((a, b) => Math.abs(b - n) < Math.abs(a - n) ? b : a)
      add(`opacity-${closest}`); break
    }
    case 'cursor': {
      const m: Record<string, string> = { pointer: 'cursor-pointer', default: 'cursor-default', 'not-allowed': 'cursor-not-allowed', wait: 'cursor-wait', text: 'cursor-text', move: 'cursor-move', 'grab': 'cursor-grab' }
      m[val] ? add(m[val]) : noMatch(); break
    }
    case 'z-index': {
      const m: Record<string, string> = { '0': 'z-0', '10': 'z-10', '20': 'z-20', '30': 'z-30', '40': 'z-40', '50': 'z-50', 'auto': 'z-auto' }
      m[val] ? add(m[val]) : noMatch(); break
    }
    // Box shadow
    case 'box-shadow': {
      if (val === 'none') add('shadow-none')
      else if (val.includes('0 1px 3px') || val.includes('0 1px 2px')) add('shadow-sm')
      else if (val.includes('0 4px 6px') || val.includes('0 2px 4px')) add('shadow')
      else if (val.includes('0 10px 15px') || val.includes('0 4px 6px')) add('shadow-md')
      else if (val.includes('0 20px 25px')) add('shadow-lg')
      else if (val.includes('0 25px 50px')) add('shadow-xl')
      else noMatch(); break
    }
    default: noMatch()
  }

  return { input: line, classes, unsupported }
}

function convertCSS(input: string): LineResult[] {
  return input.split('\n').map(convertLine).filter(r => r.input.trim())
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CssToTailwind() {
  const [input, setInput] = useState('')
  const [copied, setCopied] = useState(false)

  const results = convertCSS(input)
  const allClasses = results.flatMap(r => r.classes).join(' ')
  const unsupportedLines = results.filter(r => r.unsupported.length > 0)

  const copy = useCallback(() => {
    if (!allClasses) return
    navigator.clipboard.writeText(allClasses).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }, [allClasses])

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Input */}
        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted uppercase tracking-widest">
            CSS
          </label>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`margin: 16px;\npadding: 8px 16px;\nfont-size: 14px;\nfont-weight: 700;\ndisplay: flex;`}
            rows={12}
            className="w-full rounded-md border border-border bg-bg px-3 py-2.5 font-mono text-sm text-primary placeholder:text-muted focus:border-teal focus:outline-none resize-none"
          />
        </div>

        {/* Output */}
        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted uppercase tracking-widest">
            Tailwind Classes
          </label>
          <div className="h-full min-h-[12rem] rounded-md border border-border bg-bg p-3 font-mono text-sm">
            {results.length === 0 ? (
              <span className="text-muted">CSS を入力すると Tailwind クラスが生成されます</span>
            ) : (
              <div className="space-y-1">
                {results.map((r, i) => (
                  <div key={i} className="flex gap-2 text-xs">
                    <span className="shrink-0 text-muted w-40 truncate">{r.input.trim()}</span>
                    <span className="text-border">→</span>
                    {r.classes.length > 0
                      ? <span className="text-teal">{r.classes.join(' ')}</span>
                      : r.unsupported.length > 0
                      ? <span className="text-amber-500">対応なし</span>
                      : null
                    }
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Combined output + copy */}
      {allClasses && (
        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted uppercase tracking-widest">
            結合クラス
          </label>
          <div className="flex gap-2">
            <div className="flex-1 rounded-md border border-border bg-bg px-3 py-2.5 font-mono text-sm text-teal break-all">
              {allClasses}
            </div>
            <button
              onClick={copy}
              className="shrink-0 rounded-md border border-border bg-surface px-4 py-2 text-sm text-dim transition-colors hover:border-teal hover:text-teal"
            >
              {copied ? '✓ コピー済み' : 'コピー'}
            </button>
          </div>
        </div>
      )}

      {/* Unsupported */}
      {unsupportedLines.length > 0 && (
        <div className="rounded-md border border-amber-500/20 bg-amber-500/5 p-4">
          <p className="mb-2 text-xs font-medium text-amber-500 uppercase tracking-widest">対応なし</p>
          <ul className="space-y-0.5 font-mono text-xs text-amber-400">
            {unsupportedLines.flatMap(r => r.unsupported).map((u, i) => (
              <li key={i}>{u}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
