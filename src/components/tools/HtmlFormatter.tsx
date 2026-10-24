'use client'

import { useMemo, useState } from 'react'

// 内容をそのまま保持する要素（改行や空白に意味がある）
const RAW = new Set(['pre', 'textarea', 'script', 'style'])

// 終了タグを持たない要素
const VOID = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'param', 'source', 'track', 'wbr',
])

// 行内に並ぶ要素。改行を入れると空白として描画され見た目が変わるため、同じ行に保つ
const INLINE = new Set([
  'a', 'abbr', 'b', 'bdi', 'bdo', 'br', 'cite', 'code', 'data', 'del', 'dfn',
  'em', 'i', 'img', 'ins', 'kbd', 'mark', 'q', 'rp', 'rt', 'ruby', 's', 'samp',
  'small', 'span', 'strong', 'sub', 'sup', 'time', 'u', 'var', 'wbr',
])

type Token =
  | { kind: 'text'; value: string }
  | { kind: 'comment'; value: string }
  | { kind: 'decl'; value: string }
  | { kind: 'open'; name: string; value: string; selfClose: boolean }
  | { kind: 'close'; name: string; value: string }
  | { kind: 'raw'; name: string; value: string } // 開始タグ〜終了タグを丸ごと保持

function tokenize(src: string): Token[] {
  const out: Token[] = []
  let i = 0

  while (i < src.length) {
    if (src.startsWith('<!--', i)) {
      const end = src.indexOf('-->', i + 4)
      const stop = end === -1 ? src.length : end + 3
      out.push({ kind: 'comment', value: src.slice(i, stop) })
      i = stop
      continue
    }

    if (src.startsWith('<!', i)) {
      const end = src.indexOf('>', i)
      const stop = end === -1 ? src.length : end + 1
      out.push({ kind: 'decl', value: src.slice(i, stop) })
      i = stop
      continue
    }

    if (src[i] === '<' && /[a-zA-Z/]/.test(src[i + 1] ?? '')) {
      // 属性値の中の > を終端と誤認しないよう引用符を追う
      let j = i + 1
      let quote: string | null = null
      while (j < src.length) {
        const c = src[j]
        if (quote) {
          if (c === quote) quote = null
        } else if (c === '"' || c === "'") {
          quote = c
        } else if (c === '>') {
          break
        }
        j++
      }
      const tag = src.slice(i, Math.min(j + 1, src.length))
      i = j + 1

      const isClose = tag.startsWith('</')
      const name = (tag.match(/^<\/?\s*([a-zA-Z][\w:-]*)/)?.[1] ?? '').toLowerCase()

      if (isClose) {
        out.push({ kind: 'close', name, value: tag })
        continue
      }

      const selfClose = /\/\s*>$/.test(tag) || VOID.has(name)

      // pre や script は中身をそのまま保持する
      if (RAW.has(name) && !selfClose) {
        const closeRe = new RegExp(`</\\s*${name}\\s*>`, 'i')
        const rest = src.slice(i)
        const m = rest.match(closeRe)
        if (m && m.index !== undefined) {
          const inner = rest.slice(0, m.index)
          out.push({ kind: 'raw', name, value: tag + inner + m[0] })
          i += m.index + m[0].length
          continue
        }
      }

      out.push({ kind: 'open', name, value: tag, selfClose })
      continue
    }

    const next = src.indexOf('<', i)
    const stop = next === -1 ? src.length : next
    out.push({ kind: 'text', value: src.slice(i, stop) })
    i = stop
  }

  return out
}

function formatHtml(src: string, indentUnit: string, keepComments: boolean): string {
  const tokens = tokenize(src)
  const lines: string[] = []
  let depth = 0
  let buf = '' // 行内に並べる途中の内容

  const pad = () => indentUnit.repeat(Math.max(0, depth))
  const flush = () => {
    if (buf.trim() !== '') lines.push(pad() + buf.trim())
    buf = ''
  }

  for (const t of tokens) {
    switch (t.kind) {
      case 'text': {
        const collapsed = t.value.replace(/\s+/g, ' ')
        if (collapsed.trim() === '') {
          // 行内要素の間の空白は意味があるので残す。ブロックの境界なら捨てる
          if (buf !== '') buf += ' '
        } else {
          buf += collapsed
        }
        break
      }
      case 'comment':
        if (!keepComments) break
        flush()
        lines.push(pad() + t.value.trim())
        break
      case 'decl':
        flush()
        lines.push(pad() + t.value.trim())
        break
      case 'raw':
        flush()
        lines.push(pad() + t.value)
        break
      case 'open':
        if (INLINE.has(t.name)) {
          buf += t.value
        } else {
          flush()
          lines.push(pad() + t.value)
          if (!t.selfClose) depth++
        }
        break
      case 'close':
        if (INLINE.has(t.name)) {
          buf += t.value
        } else {
          flush()
          depth--
          lines.push(pad() + t.value)
        }
        break
    }
  }
  flush()
  return lines.join('\n')
}

function minifyHtml(src: string, keepComments: boolean): string {
  const tokens = tokenize(src)
  let out = ''
  for (const t of tokens) {
    switch (t.kind) {
      case 'text': {
        const collapsed = t.value.replace(/\s+/g, ' ')
        if (collapsed.trim() === '') {
          // 直前が行内要素なら空白の意味が残るので1つだけ入れる
          if (/<\/?(?:[a-z]+)[^>]*>$/i.test(out) && /<\/?(a|span|b|i|em|strong|code|small|sub|sup|u|s|mark|time|label)[\s/>]/i.test(out.slice(-40))) {
            if (!out.endsWith(' ')) out += ' '
          }
        } else {
          out += collapsed
        }
        break
      }
      case 'comment':
        if (keepComments) out += t.value
        break
      case 'raw': {
        // ⚠ 以前は pre・script・style・textarea の中身まで空白を詰めていた。pre の字下げが消え、
        // script では「// コメント」の後ろの行がコメントに飲み込まれて JavaScript が壊れていた。開始タグだけ詰める
        const openEnd = t.value.indexOf('>') + 1
        out += collapseTag(t.value.slice(0, openEnd)) + t.value.slice(openEnd)
        break
      }
      default:
        out += collapseTag(t.value)
    }
  }
  return out.trim()
}

// タグの中の連続した空白を1つにする。属性値（引用符の中）の空白はそのまま残す
function collapseTag(tag: string): string {
  let out = ''
  let quote: string | null = null
  for (let i = 0; i < tag.length; i++) {
    const c = tag[i]
    if (quote) {
      out += c
      if (c === quote) quote = null
    } else if (c === '"' || c === "'") {
      quote = c
      out += c
    } else if (/\s/.test(c)) {
      if (!out.endsWith(' ')) out += ' '
    } else {
      out += c
    }
  }
  return out.replace(/\s+(\/?>)$/, '$1')
}

export function HtmlFormatter() {
  const [input, setInput] = useState('')
  const [mode, setMode] = useState<'format' | 'minify'>('format')
  const [indent, setIndent] = useState<'2' | '4' | 'tab'>('2')
  const [keepComments, setKeepComments] = useState(true)
  const [copied, setCopied] = useState(false)

  const output = useMemo(() => {
    if (!input.trim()) return ''
    try {
      if (mode === 'minify') return minifyHtml(input, keepComments)
      const unit = indent === 'tab' ? '\t' : ' '.repeat(Number(indent))
      return formatHtml(input, unit, keepComments)
    } catch (e) {
      return `処理に失敗しました: ${e instanceof Error ? e.message : String(e)}`
    }
  }, [input, mode, indent, keepComments])

  const saved =
    input.length > 0 && mode === 'minify'
      ? Math.max(0, Math.round((1 - output.length / input.length) * 100))
      : 0

  async function copy() {
    if (!output) return
    try {
      await navigator.clipboard.writeText(output)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* クリップボードが使えない環境では何もしない */
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* 設定 */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex gap-2">
          {(['format', 'minify'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`rounded border px-3 py-1 text-xs transition-colors ${
                mode === m
                  ? 'border-teal bg-teal/10 text-teal'
                  : 'border-border bg-surface text-dim hover:border-teal/40'
              }`}
            >
              {m === 'format' ? '整形' : '圧縮（Minify）'}
            </button>
          ))}
        </div>

        {mode === 'format' && (
          <label className="flex items-center gap-1.5 text-xs text-dim">
            インデント
            <select
              value={indent}
              onChange={(e) => setIndent(e.target.value as '2' | '4' | 'tab')}
              className="rounded border border-border bg-surface px-2 py-1 text-xs text-primary"
            >
              <option value="2">スペース2</option>
              <option value="4">スペース4</option>
              <option value="tab">タブ</option>
            </select>
          </label>
        )}

        <label className="flex items-center gap-1.5 text-xs text-dim">
          <input
            type="checkbox"
            checked={keepComments}
            onChange={(e) => setKeepComments(e.target.checked)}
            className="accent-teal"
          />
          コメントを残す
        </label>
      </div>

      {/* 入出力 */}
      <div className="grid grid-cols-1 overflow-hidden rounded-lg border border-border sm:grid-cols-2">
        <div className="flex flex-col border-b border-border sm:border-b-0 sm:border-r">
          <div className="flex items-center justify-between border-b border-border bg-surface px-3 py-2">
            <span className="font-mono text-[11px] uppercase tracking-widest text-muted">入力</span>
            <span className="font-mono text-[11px] text-dim">
              {input.length.toLocaleString()} 文字
            </span>
          </div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            spellCheck={false}
            placeholder={'<div class="card"><h2>タイトル</h2><p>本文の<strong>一部</strong>を強調</p></div>'}
            className="h-80 w-full resize-none bg-bg p-3 font-mono text-sm text-primary outline-none"
          />
        </div>
        <div className="flex flex-col">
          <div className="flex items-center justify-between border-b border-border bg-surface px-3 py-2">
            <span className="font-mono text-[11px] uppercase tracking-widest text-muted">出力</span>
            <div className="flex items-center gap-3">
              <span className="font-mono text-[11px] text-dim">
                {output.length.toLocaleString()} 文字
                {saved > 0 && <span className="text-teal"> （−{saved}%）</span>}
              </span>
              <button
                onClick={copy}
                disabled={!output}
                className="rounded border border-border px-2 py-0.5 font-mono text-[11px] text-dim transition-colors hover:border-teal/50 hover:text-teal disabled:opacity-40"
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>
          <textarea
            value={output}
            readOnly
            spellCheck={false}
            className="h-80 w-full resize-none bg-bg p-3 font-mono text-sm text-primary outline-none"
          />
        </div>
      </div>

      <p className="text-xs leading-relaxed text-muted">
        span や a などの行内要素は、改行を入れると空白として描画され見た目が変わるため、同じ行に保ちます。pre / textarea / script / style の中身はそのまま保持します。
      </p>
    </div>
  )
}
