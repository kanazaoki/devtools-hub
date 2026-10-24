'use client'

import { useState, useCallback } from 'react'

// --- HTML → Markdown 変換ロジック ---

// ⚠ 以前の変換は、img を消す・HTML の字下げや改行をそのまま残す（4文字以上の字下げはコードブロックになる）・
// 本文の * や _ を逃がさず強調に変える・番号付きリストの下の入れ子が入れ子にならない（字下げが足りない）・
// バッククォートを含むコードでコードブロックが壊れる、といった問題があった

// 変換で作った印（リストの記号・見出し・引用・続きの行の字下げ）の前に置く目印。
// 最後の「行頭の記号を逃がす」「行頭の空白を落とす」をこの目印のある行には効かせず、仕上げに取り除く
const S = '\u0001'

// 本文に出る Markdown の記号を逃がす
function escapeMd(text: string): string {
  return text.replace(/([\\`*_[\]<>|])/g, '\\$1')
}

// 行頭に来ると見出し・リスト・引用になる記号を逃がす
function escapeLineStarts(md: string): string {
  return md.replace(/^(\s*)(#{1,6}\s|[-+]\s|\d+[.)]\s|>)/gm, (_m, sp: string, mark: string) => {
    if (/^\d/.test(mark)) return sp + mark.replace(/([.)])/, '\\$1')
    return sp + '\\' + mark
  })
}

// 中に含まれる最長のバッククォート列より長いフェンスを使う
function fenceFor(code: string, min: number): string {
  const longest = Math.max(0, ...(code.match(/`+/g) ?? []).map((s) => s.length))
  return '`'.repeat(Math.max(min, longest + 1))
}

function cellMd(cell: Element): string {
  // | は本文の時点で \| に逃がしてある（escapeMd）ので、ここでは重ねない
  return inlineChildren(cell).replace(/\n+/g, ' ').trim()
}

function convertTable(table: Element): string {
  const rows = Array.from(table.querySelectorAll('tr'))
  if (rows.length === 0) return ''
  const headers = Array.from(rows[0].querySelectorAll('th, td')).map(cellMd)
  const bodyRows = rows.slice(1).map((row) => Array.from(row.querySelectorAll('td, th')).map(cellMd))
  const colCount = Math.max(headers.length, ...bodyRows.map((r) => r.length))
  const pad = (cells: string[]) => {
    while (cells.length < colCount) cells.push('')
    return cells
  }
  const fmt = (cells: string[]) => `| ${pad(cells).join(' | ')} |`
  return '\n\n' + [fmt(headers), fmt(headers.map(() => '---')), ...bodyRows.map(fmt)].join('\n') + '\n\n'
}

function inlineChildren(el: Element): string {
  return Array.from(el.childNodes).map((c) => nodeToMd(c, 0)).join('')
}

// 複数行の内容を、リストの印の幅だけ字下げした続きの行にする
function indentRest(text: string, width: number): string {
  const pad = S + ' '.repeat(width)
  return text.split('\n').map((l, i) => (i === 0 || l === '' ? l : pad + l)).join('\n')
}

function nodeToMd(node: Node, listDepth = 0): string {
  if (node.nodeType === Node.TEXT_NODE) {
    // HTML では連続する空白と改行は1つの空白として描かれる
    return escapeMd((node.textContent ?? '').replace(/\s+/g, ' '))
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return ''
  const el = node as Element
  const tag = el.tagName.toLowerCase()
  const childMd = () => Array.from(el.childNodes).map((c) => nodeToMd(c, listDepth)).join('')
  const wrap = (mark: string) => {
    const inner = childMd()
    const t = inner.trim()
    if (!t) return inner
    // 前後の空白は記号の外に出す（** 文字 ** は強調にならない）
    const lead = inner.match(/^\s*/)![0]
    const trail = inner.match(/\s*$/)![0]
    return `${lead}${mark}${t}${mark}${trail}`
  }

  switch (tag) {
    case 'h1': case 'h2': case 'h3': case 'h4': case 'h5': case 'h6':
      return `\n\n${S}${'#'.repeat(Number(tag[1]))} ${childMd().replace(/\s+/g, ' ').trim()}\n\n`
    case 'strong': case 'b': return wrap('**')
    case 'em': case 'i': return wrap('*')
    case 'del': case 's': case 'strike': return wrap('~~')
    case 'a': {
      const href = el.getAttribute('href') ?? ''
      const text = childMd().trim()
      if (!href) return text
      const title = el.getAttribute('title')
      const dest = /[\s()<>]/.test(href) ? `<${href.replace(/[<>]/g, encodeURIComponent)}>` : href
      return `[${text || href}](${dest}${title ? ` "${title.replace(/"/g, '\\"')}"` : ''})`
    }
    case 'img': {
      const src = el.getAttribute('src') ?? ''
      if (!src) return ''
      const alt = escapeMd(el.getAttribute('alt') ?? '')
      const title = el.getAttribute('title')
      const dest = /[\s()<>]/.test(src) ? `<${src}>` : src
      return `![${alt}](${dest}${title ? ` "${title.replace(/"/g, '\\"')}"` : ''})`
    }
    case 'code': {
      const code = el.textContent ?? ''
      const f = fenceFor(code, 1)
      const pad = /^`|`$/.test(code) ? ' ' : ''
      return `${f}${pad}${code}${pad}${f}`
    }
    case 'pre': {
      const codeEl = el.querySelector('code')
      const cls = `${codeEl?.className ?? ''} ${el.className}`
      const lang = /(?:^|\s)(?:language|lang)-([\w+#.-]+)/.exec(cls)?.[1] ?? ''
      const code = ((codeEl ? codeEl.textContent : el.textContent) ?? '').replace(/\n$/, '')
      const f = fenceFor(code, 3)
      return `\n\n${f}${lang}\n${code}\n${f}\n\n`
    }
    case 'blockquote': {
      const inner = childMd().replace(/\n{3,}/g, '\n\n').trim()
      return `\n\n${inner.split('\n').map((l) => (l ? `${S}> ${l}` : `${S}>`)).join('\n')}\n\n`
    }
    case 'ul': case 'ol': {
      const start = Number(el.getAttribute('start') ?? '1') || 1
      const items = Array.from(el.children).filter((c) => c.tagName.toLowerCase() === 'li').map((li, idx) => {
        const marker = tag === 'ol' ? `${start + idx}. ` : '- '
        const shown = S + marker
        const body = Array.from(li.childNodes).map((c) => nodeToMd(c, listDepth + 1)).join('')
          .replace(/\n{3,}/g, '\n\n').trim()
          // 入れ子のリストの前の空行と、行末に残った空白は詰める（空行があると「間の空いたリスト」になる）
          .replace(/[ \t]+\n/g, '\n')
          .replace(/\n{2,}(?=\u0001(?:- |\d+\. ))/g, '\n')
        return shown + indentRest(body, marker.length)
      })
      return `\n\n${items.join('\n')}\n\n`
    }
    case 'li': return childMd()
    case 'table': return convertTable(el)
    case 'br': return '  \n'
    case 'hr': return '\n\n---\n\n'
    case 'p': case 'div': case 'section': case 'article': case 'header': case 'footer': case 'main': case 'figure':
      return `\n\n${childMd().trim()}\n\n`
    case 'script': case 'style': case 'head': case 'meta': case 'link': case 'noscript': case 'template': return ''
    default: return childMd()
  }
}

function htmlToMarkdown(html: string): string {
  if (!html.trim()) return ''
  const doc = new DOMParser().parseFromString(html, 'text/html')
  let result = ''
  for (const node of Array.from(doc.body.childNodes)) {
    result += nodeToMd(node)
  }
  // 段落の中身の行頭の空白を落とし、行頭に来た記号を逃がす（コードブロックの中は触らない）
  const parts = result.replace(/\n{3,}/g, '\n\n').trim().split(/(\n`{3,}[^\n]*\n[\s\S]*?\n`{3,}\n)/)
  return parts
    .map((p, i) => (i % 2 ? p : escapeLineStarts(p.replace(/^[ \t]+/gm, ''))))
    .join('')
    .split(S).join('')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

// --- UI コンポーネント ---

export function HtmlToMarkdown() {
  const [html, setHtml] = useState('')
  const [copied, setCopied] = useState(false)

  const markdown = htmlToMarkdown(html)

  const handleCopy = useCallback(async () => {
    if (!markdown) return
    await navigator.clipboard.writeText(markdown)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [markdown])

  const handleDownload = useCallback(() => {
    if (!markdown) return
    const blob = new Blob([markdown], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'converted.md'
    a.click()
    URL.revokeObjectURL(url)
  }, [markdown])

  return (
    <div className="flex flex-col gap-3">
      {/* アクションバー */}
      <div className="flex items-center justify-end gap-2">
        <button
          onClick={handleCopy}
          disabled={!markdown}
          className="inline-flex items-center gap-1.5 rounded border border-border px-3 py-1.5 font-mono text-xs text-muted transition-colors hover:border-teal hover:text-teal disabled:opacity-40"
        >
          {copied ? '✓ コピー済み' : 'コピー'}
        </button>
        <button
          onClick={handleDownload}
          disabled={!markdown}
          className="inline-flex items-center gap-1.5 rounded border border-border px-3 py-1.5 font-mono text-xs text-muted transition-colors hover:border-teal hover:text-teal disabled:opacity-40"
        >
          .md ダウンロード
        </button>
      </div>

      {/* エディターペイン */}
      <div className="overflow-hidden rounded-lg border border-border lg:grid lg:grid-cols-2">
        {/* 左: HTML 入力 */}
        <div className="flex flex-col border-b border-border lg:border-b-0 lg:border-r">
          <div className="flex items-center justify-between border-b border-border bg-surface px-4 py-2">
            <div className="flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full bg-orange-400/60" />
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted">HTML</span>
            </div>
            {html && (
              <button
                onClick={() => setHtml('')}
                className="font-mono text-[10px] text-muted transition-colors hover:text-dim"
              >
                クリア
              </button>
            )}
          </div>
          <textarea
            value={html}
            onChange={(e) => setHtml(e.target.value)}
            placeholder={'<h1>タイトル</h1>\n<p>本文テキスト。<strong>太字</strong>や<em>斜体</em>も変換されます。</p>\n<ul>\n  <li>リスト項目1</li>\n  <li>リスト項目2</li>\n</ul>'}
            spellCheck={false}
            className="h-80 w-full resize-y bg-bg p-4 font-mono text-sm text-primary placeholder:text-muted/50 focus:outline-none"
          />
        </div>

        {/* 右: Markdown 出力 */}
        <div className="flex flex-col">
          <div className="flex items-center justify-between border-b border-border bg-surface px-4 py-2">
            <div className="flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full bg-teal/60" />
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted">Markdown</span>
            </div>
            {markdown && (
              <span className="font-mono text-[10px] tabular-nums text-muted">
                {markdown.split('\n').length}L · {markdown.length}C
              </span>
            )}
          </div>
          <div className="relative h-80 bg-bg">
            {markdown ? (
              <pre className="h-full overflow-auto p-4 font-mono text-sm text-primary whitespace-pre-wrap break-words">
                {markdown}
              </pre>
            ) : (
              <div className="flex h-full items-center justify-center">
                <p className="font-mono text-xs text-muted">変換結果がここに表示されます</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
