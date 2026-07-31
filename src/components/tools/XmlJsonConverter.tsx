'use client'

import { useState, useMemo, useCallback } from 'react'

// ─────────────────────────────────────────────────────────────
// Conventions (compatible with the fast-xml-parser style):
//   - element attributes  → keys prefixed with "@_"
//   - text of a mixed node → key "#text"
//   - repeated sibling elements with the same tag → array
// ─────────────────────────────────────────────────────────────
const ATTR_PREFIX = '@_'
const TEXT_KEY = '#text'

interface ConvertOptions {
  coerceValues: boolean
  xmlDecl: boolean
}

// ── Entity handling ──────────────────────────────────────────
function decodeEntities(str: string): string {
  return str
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h: string) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d: string) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&amp;/g, '&') // must run last
}

function escapeXml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function escapeAttr(str: string): string {
  return escapeXml(str).replace(/"/g, '&quot;')
}

// Turn "30" → 30, "true" → true, "null" → null (only when lossless).
function coerce(str: string): string | number | boolean | null {
  if (str === 'true') return true
  if (str === 'false') return false
  if (str === 'null') return null
  const trimmed = str.trim()
  if (trimmed !== '' && /^-?\d/.test(trimmed)) {
    const n = Number(trimmed)
    if (!Number.isNaN(n) && String(n) === trimmed) return n
  }
  return str
}

// ── XML → nodes (recursive descent parser) ───────────────────
type XmlNode =
  | { type: 'element'; name: string; attrs: Record<string, string>; children: XmlNode[] }
  | { type: 'text'; value: string }

function parseXmlToNodes(input: string): XmlNode[] {
  const s = input
  const len = s.length
  let i = 0

  const skipWs = () => {
    while (i < len && /\s/.test(s[i])) i++
  }

  const parseName = (): string => {
    skipWs()
    const start = i
    while (i < len && !/[\s/>=]/.test(s[i])) i++
    if (i === start) throw new Error('タグ名または属性名が読み取れません。')
    return s.slice(start, i)
  }

  const parseElement = (): XmlNode => {
    i++ // consume '<'
    const name = parseName()
    const attrs: Record<string, string> = {}

    // attributes
    for (;;) {
      skipWs()
      if (i >= len) throw new Error(`<${name}> が閉じられていません。`)
      if (s[i] === '/' && s[i + 1] === '>') {
        i += 2
        return { type: 'element', name, attrs, children: [] }
      }
      if (s[i] === '>') {
        i++
        break
      }
      const attrName = parseName()
      skipWs()
      if (s[i] === '=') {
        i++
        skipWs()
        const quote = s[i]
        if (quote !== '"' && quote !== "'") {
          throw new Error(`属性 ${attrName} の値が引用符で囲まれていません。`)
        }
        i++
        const vEnd = s.indexOf(quote, i)
        if (vEnd === -1) throw new Error(`属性 ${attrName} の値が閉じられていません。`)
        attrs[attrName] = decodeEntities(s.slice(i, vEnd))
        i = vEnd + 1
      } else {
        attrs[attrName] = '' // valueless attribute
      }
    }

    const children = parseNodes()

    if (!s.startsWith('</', i)) throw new Error(`<${name}> の閉じタグがありません。`)
    i += 2
    const closeName = parseName()
    skipWs()
    if (s[i] !== '>') throw new Error(`閉じタグ </${closeName}> が正しく閉じられていません。`)
    i++
    if (closeName !== name) {
      throw new Error(`開始タグ <${name}> と閉じタグ </${closeName}> が一致しません。`)
    }
    return { type: 'element', name, attrs, children }
  }

  function parseNodes(): XmlNode[] {
    const nodes: XmlNode[] = []
    while (i < len) {
      if (s[i] === '<') {
        if (s.startsWith('<!--', i)) {
          const end = s.indexOf('-->', i + 4)
          if (end === -1) throw new Error('コメントが閉じられていません。')
          i = end + 3
          continue
        }
        if (s.startsWith('<![CDATA[', i)) {
          const end = s.indexOf(']]>', i + 9)
          if (end === -1) throw new Error('CDATA セクションが閉じられていません。')
          nodes.push({ type: 'text', value: s.slice(i + 9, end) })
          i = end + 3
          continue
        }
        if (s.startsWith('<?', i)) {
          const end = s.indexOf('?>', i + 2)
          if (end === -1) throw new Error('XML宣言（<? ?>）が閉じられていません。')
          i = end + 2
          continue
        }
        if (s.startsWith('<!', i)) {
          const end = s.indexOf('>', i + 2)
          if (end === -1) throw new Error('DOCTYPE 宣言が閉じられていません。')
          i = end + 1
          continue
        }
        if (s[i + 1] === '/') return nodes // closing tag → hand back to caller
        nodes.push(parseElement())
      } else {
        const next = s.indexOf('<', i)
        const textEnd = next === -1 ? len : next
        const raw = s.slice(i, textEnd)
        i = textEnd
        const decoded = decodeEntities(raw)
        if (decoded.trim() !== '') nodes.push({ type: 'text', value: decoded })
      }
    }
    return nodes
  }

  const result = parseNodes()
  skipWs()
  if (i < len && s.startsWith('</', i)) {
    throw new Error('対応する開始タグのない閉じタグがあります。')
  }
  return result
}

// ── nodes → JS object ────────────────────────────────────────
type JsonValue = string | number | boolean | null | JsonObject | JsonValue[]
interface JsonObject {
  [key: string]: JsonValue
}

function addToObj(o: JsonObject, key: string, val: JsonValue) {
  if (key in o) {
    const existing = o[key]
    if (Array.isArray(existing)) existing.push(val)
    else o[key] = [existing, val]
  } else {
    o[key] = val
  }
}

function elementToValue(el: Extract<XmlNode, { type: 'element' }>, opts: ConvertOptions): JsonValue {
  const attrEntries = Object.entries(el.attrs)
  const childElements = el.children.filter(
    (c): c is Extract<XmlNode, { type: 'element' }> => c.type === 'element'
  )
  const childText = el.children
    .filter((c): c is Extract<XmlNode, { type: 'text' }> => c.type === 'text')
    .map((t) => t.value)
    .join('')
    .trim()

  const applyText = (t: string): JsonValue => (opts.coerceValues ? coerce(t) : t)

  // Leaf element (no child elements)
  if (childElements.length === 0) {
    if (attrEntries.length === 0) return applyText(childText)
    const o: JsonObject = {}
    for (const [k, v] of attrEntries) o[ATTR_PREFIX + k] = opts.coerceValues ? coerce(v) : v
    if (childText !== '') o[TEXT_KEY] = applyText(childText)
    return o
  }

  // Container element
  const o: JsonObject = {}
  for (const [k, v] of attrEntries) o[ATTR_PREFIX + k] = opts.coerceValues ? coerce(v) : v
  if (childText !== '') o[TEXT_KEY] = applyText(childText)
  for (const child of childElements) addToObj(o, child.name, elementToValue(child, opts))
  return o
}

function nodesToJson(nodes: XmlNode[], opts: ConvertOptions): JsonObject {
  const elements = nodes.filter(
    (n): n is Extract<XmlNode, { type: 'element' }> => n.type === 'element'
  )
  if (elements.length === 0) throw new Error('XMLの要素が見つかりません。<tag> を含む XML を入力してください。')
  const obj: JsonObject = {}
  for (const el of elements) addToObj(obj, el.name, elementToValue(el, opts))
  return obj
}

// ── JS value → XML ───────────────────────────────────────────
function buildElement(name: string, value: JsonValue, depth: number, unit: string): string {
  const pad = unit.repeat(depth)

  if (Array.isArray(value)) {
    return value.map((v) => buildElement(name, v, depth, unit)).join('\n')
  }
  if (value === null || value === undefined) {
    return `${pad}<${name}/>`
  }
  if (typeof value !== 'object') {
    return `${pad}<${name}>${escapeXml(String(value))}</${name}>`
  }

  // object → split into attributes / text / child elements
  const attrs: string[] = []
  let text = ''
  const childKeys: string[] = []
  for (const k of Object.keys(value)) {
    if (k.startsWith(ATTR_PREFIX)) {
      attrs.push(`${k.slice(ATTR_PREFIX.length)}="${escapeAttr(String((value as JsonObject)[k]))}"`)
    } else if (k === TEXT_KEY) {
      text = String((value as JsonObject)[k])
    } else {
      childKeys.push(k)
    }
  }
  const attrStr = attrs.length ? ' ' + attrs.join(' ') : ''

  if (childKeys.length === 0) {
    if (text === '') return `${pad}<${name}${attrStr}/>`
    return `${pad}<${name}${attrStr}>${escapeXml(text)}</${name}>`
  }

  let inner = ''
  if (text !== '') inner += `\n${unit.repeat(depth + 1)}${escapeXml(text)}`
  for (const ck of childKeys) {
    inner += '\n' + buildElement(ck, (value as JsonObject)[ck], depth + 1, unit)
  }
  return `${pad}<${name}${attrStr}>${inner}\n${pad}</${name}>`
}

function jsonToXml(parsed: JsonValue, unit: string): string {
  if (Array.isArray(parsed)) {
    return buildElement('root', { item: parsed }, 0, unit)
  }
  if (parsed === null || typeof parsed !== 'object') {
    return buildElement('root', parsed, 0, unit)
  }
  const keys = Object.keys(parsed)
  const elementKeys = keys.filter((k) => !k.startsWith(ATTR_PREFIX) && k !== TEXT_KEY)
  const hasAttrOrText = keys.some((k) => k.startsWith(ATTR_PREFIX) || k === TEXT_KEY)
  if (elementKeys.length === 1 && !hasAttrOrText) {
    return buildElement(elementKeys[0], parsed[elementKeys[0]], 0, unit)
  }
  // multiple roots (or attrs at top) → wrap so the output stays well-formed
  return buildElement('root', parsed, 0, unit)
}

// ── top-level converter ──────────────────────────────────────
type Mode = 'xml2json' | 'json2xml'

function convert(input: string, mode: Mode, opts: ConvertOptions): { output: string; error: string | null } {
  if (!input.trim()) return { output: '', error: null }
  try {
    if (mode === 'xml2json') {
      const nodes = parseXmlToNodes(input)
      const obj = nodesToJson(nodes, opts)
      return { output: JSON.stringify(obj, null, 2), error: null }
    }
    let parsed: JsonValue
    try {
      parsed = JSON.parse(input)
    } catch {
      return { output: '', error: '無効な JSON です。構文を確認してください。' }
    }
    const body = jsonToXml(parsed, '  ')
    const decl = opts.xmlDecl ? '<?xml version="1.0" encoding="UTF-8"?>\n' : ''
    return { output: decl + body, error: null }
  } catch (e) {
    return { output: '', error: e instanceof Error ? e.message : '変換に失敗しました。' }
  }
}

const XML_SAMPLE = `<note id="1">
  <to>Alice</to>
  <from>Bob</from>
  <heading>Reminder</heading>
  <body>Don't forget the meeting</body>
</note>`

const JSON_SAMPLE = `{
  "note": {
    "@_id": "1",
    "to": "Alice",
    "from": "Bob",
    "heading": "Reminder",
    "body": "Don't forget the meeting"
  }
}`

export function XmlJsonConverter() {
  const [mode, setMode] = useState<Mode>('xml2json')
  const [input, setInput] = useState('')
  const [coerceValues, setCoerceValues] = useState(false)
  const [xmlDecl, setXmlDecl] = useState(true)
  const [copied, setCopied] = useState(false)

  const { output, error } = useMemo(
    () => convert(input, mode, { coerceValues, xmlDecl }),
    [input, mode, coerceValues, xmlDecl]
  )

  const fromLabel = mode === 'xml2json' ? 'XML' : 'JSON'
  const toLabel = mode === 'xml2json' ? 'JSON' : 'XML'

  const handleSwap = useCallback(() => {
    // Swap direction, and if the current output is valid, feed it back as input.
    setMode((m) => (m === 'xml2json' ? 'json2xml' : 'xml2json'))
    if (output && !error) setInput(output)
  }, [output, error])

  const handleClear = useCallback(() => setInput(''), [])

  const handleCopy = useCallback(() => {
    if (!output || error) return
    navigator.clipboard.writeText(output).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }, [output, error])

  const handleDownload = useCallback(() => {
    if (!output || error) return
    const ext = mode === 'xml2json' ? 'json' : 'xml'
    const mime = mode === 'xml2json' ? 'application/json' : 'application/xml'
    const blob = new Blob([output], { type: `${mime};charset=utf-8` })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `converted.${ext}`
    a.click()
    URL.revokeObjectURL(url)
  }, [output, error, mode])

  return (
    <div className="space-y-3">
      {/* Direction toggle */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex overflow-hidden rounded border border-border" role="group" aria-label="変換方向">
          {(
            [
              ['xml2json', 'XML → JSON'],
              ['json2xml', 'JSON → XML'],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setMode(value)}
              data-testid={`mode-${value}`}
              className={`px-3.5 py-1.5 font-mono text-[11px] font-bold tracking-wide transition-colors duration-100 ${
                mode === value
                  ? 'bg-teal/15 text-teal'
                  : 'bg-surface text-muted hover:text-dim'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={handleSwap}
          data-testid="swap-button"
          className="inline-flex items-center gap-1.5 rounded border border-border bg-surface px-2.5 py-1.5 font-mono text-[10px] text-muted transition-colors hover:border-border-hi hover:text-dim"
          title="方向を入れ替え、結果を入力に転送"
        >
          <span aria-hidden="true">⇄</span> Swap
        </button>

        <button
          type="button"
          onClick={() => setInput(mode === 'xml2json' ? XML_SAMPLE : JSON_SAMPLE)}
          className="rounded border border-border bg-surface px-2.5 py-1.5 font-mono text-[10px] text-muted transition-colors hover:border-border-hi hover:text-dim"
        >
          サンプル
        </button>
      </div>

      {/* Options (direction-specific) */}
      <div className="flex flex-wrap items-center gap-2">
        {mode === 'xml2json' ? (
          <button
            type="button"
            onClick={() => setCoerceValues((v) => !v)}
            data-testid="coerce-toggle"
            className={`rounded border px-3 py-1.5 font-mono text-[10px] transition-all duration-150 ${
              coerceValues
                ? 'border-teal/50 bg-teal/10 text-teal'
                : 'border-border bg-surface text-muted hover:border-border-hi hover:text-dim'
            }`}
          >
            {coerceValues ? '✓ ' : ''}数値・真偽値を型変換
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setXmlDecl((v) => !v)}
            data-testid="decl-toggle"
            className={`rounded border px-3 py-1.5 font-mono text-[10px] transition-all duration-150 ${
              xmlDecl
                ? 'border-teal/50 bg-teal/10 text-teal'
                : 'border-border bg-surface text-muted hover:border-border-hi hover:text-dim'
            }`}
          >
            {xmlDecl ? '✓ ' : ''}XML宣言を付ける
          </button>
        )}
        <span className="font-mono text-[10px] text-muted/40 select-none">
          {mode === 'xml2json'
            ? '属性は @_ 、テキストは #text で表現'
            : '@_キー→属性、#text→テキスト、配列→繰り返し要素'}
        </span>
      </div>

      {/* Split editor — stacks on mobile, side-by-side on sm+ */}
      <div className="grid grid-cols-1 overflow-hidden rounded border border-border sm:grid-cols-2">
        {/* Input column */}
        <div className="flex flex-col border-b border-border sm:border-b-0 sm:border-r">
          <div className="flex items-center justify-between border-b border-border bg-surface px-4 py-2.5">
            <div className="flex items-center gap-2.5">
              <span className="h-2 w-2 rounded-full bg-amber-500/70 shrink-0" />
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted">{fromLabel}</span>
            </div>
            <div className="flex items-center gap-2">
              {input.length > 0 && (
                <span className="font-mono text-[9px] tabular-nums text-muted/40">{input.length} chars</span>
              )}
              <button
                onClick={handleClear}
                data-testid="clear-button"
                className="rounded px-2 py-0.5 font-mono text-[9px] text-muted/40 transition-colors hover:text-muted"
              >
                Clear
              </button>
            </div>
          </div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={mode === 'xml2json' ? XML_SAMPLE : JSON_SAMPLE}
            data-testid="input-area"
            rows={16}
            spellCheck={false}
            className="flex-1 resize-none bg-bg p-4 font-mono text-xs leading-relaxed text-primary placeholder:text-muted/20 focus:outline-none"
          />
          {error && (
            <div className="border-t border-red-500/20 bg-red-500/5 px-4 py-2" data-testid="error-bar">
              <p className="font-mono text-[10px] leading-relaxed text-red-400">{error}</p>
            </div>
          )}
        </div>

        {/* Output column */}
        <div className="flex flex-col">
          <div className="flex items-center justify-between border-b border-border bg-surface px-4 py-2.5">
            <div className="flex items-center gap-2.5">
              <span className="inline-flex h-4 w-9 items-center justify-center rounded-sm bg-teal/20 font-mono text-[8px] font-bold text-teal shrink-0">
                {toLabel}
              </span>
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted">変換結果</span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleDownload}
                disabled={!output || !!error}
                data-testid="download-button"
                className="rounded bg-surface-hi px-2.5 py-1 font-mono text-[9px] font-medium text-muted transition-all duration-150 hover:bg-teal/10 hover:text-teal disabled:cursor-not-allowed disabled:opacity-30"
              >
                .{mode === 'xml2json' ? 'json' : 'xml'}
              </button>
              <button
                onClick={handleCopy}
                disabled={!output || !!error}
                data-testid="copy-button"
                className={`rounded px-2.5 py-1 font-mono text-[9px] font-medium transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-30 ${
                  copied ? 'bg-teal/20 text-teal' : 'bg-surface-hi text-muted hover:bg-teal/10 hover:text-teal'
                }`}
              >
                {copied ? '✓ Copied!' : 'Copy'}
              </button>
            </div>
          </div>
          <textarea
            value={output}
            readOnly
            placeholder="変換結果がここに表示されます"
            data-testid="output-area"
            rows={16}
            className="flex-1 resize-none bg-bg/70 p-4 font-mono text-xs leading-relaxed text-teal/80 placeholder:text-muted/20 focus:outline-none"
          />
        </div>
      </div>

      <p className="font-mono text-[10px] leading-relaxed text-muted/50">
        XMLの属性は <code className="text-muted/70">@_名前</code>、要素のテキストは{' '}
        <code className="text-muted/70">#text</code> というキーに対応します。同名の兄弟要素は自動で配列になります。処理はすべてブラウザ内で完結し、データは送信されません。
      </p>
    </div>
  )
}
