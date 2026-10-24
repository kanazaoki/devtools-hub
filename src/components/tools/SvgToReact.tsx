'use client'

import { useState, useCallback } from 'react'

// ─── Attribute conversions ────────────────────────────────────────────────────

const ATTR_MAP: Record<string, string> = {
  'class': 'className',
  'for': 'htmlFor',
  'stroke-width': 'strokeWidth',
  'stroke-linecap': 'strokeLinecap',
  'stroke-linejoin': 'strokeLinejoin',
  'stroke-dasharray': 'strokeDasharray',
  'stroke-dashoffset': 'strokeDashoffset',
  'stroke-opacity': 'strokeOpacity',
  'fill-rule': 'fillRule',
  'fill-opacity': 'fillOpacity',
  'clip-rule': 'clipRule',
  'clip-path': 'clipPath',
  'text-anchor': 'textAnchor',
  'font-size': 'fontSize',
  'font-family': 'fontFamily',
  'font-weight': 'fontWeight',
  'letter-spacing': 'letterSpacing',
  'word-spacing': 'wordSpacing',
  'dominant-baseline': 'dominantBaseline',
  'alignment-baseline': 'alignmentBaseline',
  'stop-color': 'stopColor',
  'stop-opacity': 'stopOpacity',
  'color-interpolation': 'colorInterpolation',
  'color-rendering': 'colorRendering',
  'shape-rendering': 'shapeRendering',
  'text-rendering': 'textRendering',
  'image-rendering': 'imageRendering',
  'pointer-events': 'pointerEvents',
  'vector-effect': 'vectorEffect',
  'paint-order': 'paintOrder',
  'xlink:href': 'xlinkHref',
  'xml:space': 'xmlSpace',
  'xmlns:xlink': 'xmlnsXlink',
  'marker-start': 'markerStart',
  'marker-mid': 'markerMid',
  'marker-end': 'markerEnd',
  'flood-color': 'floodColor',
  'flood-opacity': 'floodOpacity',
  'lighting-color': 'lightingColor',
  'mask-type': 'maskType',
}

function toCamelCase(attr: string): string {
  if (ATTR_MAP[attr]) return ATTR_MAP[attr]
  // Generic: convert hyphenated to camelCase
  return attr.replace(/-([a-z])/g, (_, c) => c.toUpperCase())
}

// ─── SVG → React converter ───────────────────────────────────────────────────

function convertSvgToReact(
  svgCode: string,
  componentName: string,
  propsEnabled: { fill: boolean; stroke: boolean; size: boolean }
): { code: string; error: string | null; warnings?: string[] } {
  const trimmed = svgCode.trim()
  if (!trimmed) return { code: '', error: null }
  if (!trimmed.includes('<svg')) {
    return { code: '', error: '有効な SVG コードを入力してください（<svg> タグが必要です）' }
  }

  try {
    let result = trimmed

    // Remove XML declaration and doctype
    result = result.replace(/<\?xml[^?]*\?>/g, '').replace(/<!DOCTYPE[^>]*>/g, '').trim()

    // Convert attributes
    result = result.replace(/(\s)([\w:.-]+)=/g, (_, space, attr) => {
      const jsx = toCamelCase(attr)
      return `${space}${jsx}=`
    })

    // Replace style="..." with style={{...}}
    result = result.replace(/style="([^"]*)"/g, (_, styleStr) => {
      const pairs = styleStr.split(';').filter(Boolean).map((pair: string) => {
        const [key, val] = pair.split(':').map((s: string) => s.trim())
        if (!key || !val) return ''
        const camel = key.replace(/-([a-z])/g, (_: string, c: string) => c.toUpperCase())
        return `${camel}: '${val}'`
      }).filter(Boolean)
      return `style={{ ${pairs.join(', ')} }}`
    })

    // ⚠ 以前の出力は3つの理由で使えなかった：
    // ① 分割代入の中に「...props: 型」と書いていて、TypeScript の構文エラーになっていた
    // ② size を最初に見つかった width / height に当てていたので、<svg> に幅が無いと <rect> の幅が変わっていた
    // ③ 既定値（currentColor・24）を分割代入に書いておらず、props を渡さないと undefined になっていた
    const fills = new Set([...result.matchAll(/\bfill="([^"]*)"/g)].map((m) => m[1].toLowerCase()).filter((v) => v !== 'none'))
    const strokes = new Set([...result.matchAll(/\bstroke="([^"]*)"/g)].map((m) => m[1].toLowerCase()).filter((v) => v !== 'none'))
    const warnings: string[] = []
    if (propsEnabled.fill) {
      if (fills.size > 1) warnings.push(`fill が ${fills.size} 色あります（${[...fills].join(', ')}）。すべて同じ fill に置き換わるので、多色のアイコンは単色になります`)
      result = result.replace(/\bfill="(?!none)([^"]*)"/g, 'fill={fill}')
    }
    if (propsEnabled.stroke) {
      if (strokes.size > 1) warnings.push(`stroke が ${strokes.size} 色あります。すべて同じ stroke に置き換わります`)
      result = result.replace(/\bstroke="(?!none)([^"]*)"/g, 'stroke={stroke}')
    }
    if (propsEnabled.size) {
      // 大きさはルートの <svg> にだけ当てる（無ければ足す）
      result = result.replace(/<svg\b([^>]*)>/, (_, attrs: string) => {
        const a = attrs.replace(/\s(width|height)="[^"]*"/g, '')
        return `<svg${a} width={size} height={size}>`
      })
      if (!/viewBox=/.test(result)) warnings.push('viewBox がありません。大きさを変えると中身が拡大縮小されず、切れて表示されます')
    }

    // Self-close empty tags
    result = result.replace(/<([\w]+)([^>]*)><\/\1>/g, (_, tag, attrs) => `<${tag}${attrs} />`)

    const ownProps: string[] = []
    const defaults: string[] = []
    if (propsEnabled.fill) { ownProps.push('fill?: string'); defaults.push("fill = 'currentColor'") }
    if (propsEnabled.stroke) { ownProps.push('stroke?: string'); defaults.push("stroke = 'currentColor'") }
    if (propsEnabled.size) { ownProps.push('size?: number | string'); defaults.push('size = 24') }

    const code = `import type { SVGProps } from 'react'

type ${componentName}Props = Omit<SVGProps<SVGSVGElement>, ${ownProps.length ? ownProps.map((p) => `'${p.split('?')[0]}'`).join(' | ') : "never"}>${ownProps.length ? ` & {\n  ${ownProps.join('\n  ')}\n}` : ''}

export default function ${componentName}({ ${[...defaults, '...props'].join(', ')} }: ${componentName}Props) {
  return (
    ${result.replace('<svg', '<svg {...props}')}
  )
}
`
    return { code, error: null, warnings }
  } catch (e) {
    return { code: '', error: 'SVG の変換中にエラーが発生しました' }
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SvgToReact() {
  const [input, setInput] = useState('')
  const [componentName, setComponentName] = useState('MyIcon')
  const [fillProp, setFillProp] = useState(true)
  const [strokeProp, setStrokeProp] = useState(false)
  const [sizeProp, setSizeProp] = useState(true)
  const [copied, setCopied] = useState(false)

  const { code, error, warnings = [] } = convertSvgToReact(input, componentName || 'MyIcon', {
    fill: fillProp, stroke: strokeProp, size: sizeProp
  })

  const copy = useCallback(() => {
    if (!code) return
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }, [code])

  const DEMO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <circle cx="12" cy="12" r="10"/>
  <line x1="12" y1="8" x2="12" y2="12"/>
  <line x1="12" y1="16" x2="12.01" y2="16"/>
</svg>`

  return (
    <div className="space-y-5">
      {/* Options row */}
      <div className="flex flex-wrap gap-5">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted uppercase tracking-widest">
            コンポーネント名
          </label>
          <input
            value={componentName}
            onChange={(e) => setComponentName(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
            placeholder="MyIcon"
            className="rounded-md border border-border bg-bg px-3 py-2 font-mono text-sm text-primary focus:border-teal focus:outline-none w-40"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted uppercase tracking-widest">
            Props オプション
          </label>
          <div className="flex gap-3">
            {([
              [fillProp, setFillProp, 'fill prop'],
              [strokeProp, setStrokeProp, 'stroke prop'],
              [sizeProp, setSizeProp, 'size prop'],
            ] as const).map(([val, setter, label]) => (
              <label key={label} className="flex cursor-pointer items-center gap-1.5 text-sm text-dim">
                <input
                  type="checkbox"
                  checked={val}
                  onChange={(e) => (setter as (v: boolean) => void)(e.target.checked)}
                  className="accent-teal"
                />
                {label}
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Input / Output */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label className="text-xs font-medium text-muted uppercase tracking-widest">SVG 入力</label>
            <button
              onClick={() => setInput(DEMO_SVG)}
              className="text-xs text-teal hover:underline"
            >
              サンプルを挿入
            </button>
          </div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`<svg xmlns="..." viewBox="0 0 24 24">\n  ...\n</svg>`}
            rows={12}
            className="w-full rounded-md border border-border bg-bg px-3 py-2.5 font-mono text-sm text-primary placeholder:text-muted focus:border-teal focus:outline-none resize-none"
          />
        </div>
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label className="text-xs font-medium text-muted uppercase tracking-widest">React / TSX</label>
            <button
              onClick={copy}
              disabled={!code}
              className="text-xs text-teal hover:underline disabled:opacity-40"
            >
              {copied ? '✓ コピー済み' : 'コピー'}
            </button>
          </div>
          {error ? (
            <div className="rounded-md border border-red-500/30 bg-red-500/5 px-3 py-2.5 text-sm text-red-400">
              {error}
            </div>
          ) : (
            <textarea
              readOnly
              value={code}
              rows={12}
              className="w-full rounded-md border border-border bg-bg px-3 py-2.5 font-mono text-xs text-teal focus:outline-none resize-none"
              placeholder="SVG を入力すると React コンポーネントに変換されます"
            />
          )}
          {warnings.map((w) => (
            <p key={w} className="mt-1.5 text-xs text-amber-300">⚠ {w}</p>
          ))}
        </div>
      </div>
    </div>
  )
}
