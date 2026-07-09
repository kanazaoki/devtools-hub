'use client'

import { useState, useCallback } from 'react'

// --- HTML → Markdown 変換ロジック ---

function convertTable(table: Element): string {
  const rows = Array.from(table.querySelectorAll('tr'))
  if (rows.length === 0) return ''

  const firstRowCells = Array.from(rows[0].querySelectorAll('th, td'))
  const headers = firstRowCells.map((cell) => cell.textContent?.trim() ?? '')
  const separator = headers.map(() => '---')

  const bodyRows = rows.slice(1).map((row) =>
    Array.from(row.querySelectorAll('td, th')).map((cell) => cell.textContent?.trim() ?? '')
  )

  const colCount = Math.max(headers.length, ...bodyRows.map((r) => r.length))
  const pad = (cells: string[]) => {
    while (cells.length < colCount) cells.push('')
    return cells
  }

  const fmt = (cells: string[]) => `| ${pad(cells).join(' | ')} |`

  return '\n\n' + [fmt(headers), fmt(separator), ...bodyRows.map(fmt)].join('\n') + '\n\n'
}

function nodeToMd(node: Node, listDepth = 0, listCounter = { n: 1 }): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent ?? ''
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return ''

  const el = node as Element
  const tag = el.tagName.toLowerCase()

  const childMd = (depth = listDepth): string =>
    Array.from(el.childNodes)
      .map((c) => nodeToMd(c, depth, listCounter))
      .join('')

  switch (tag) {
    case 'h1': return `\n\n# ${childMd().trim()}\n\n`
    case 'h2': return `\n\n## ${childMd().trim()}\n\n`
    case 'h3': return `\n\n### ${childMd().trim()}\n\n`
    case 'h4': return `\n\n#### ${childMd().trim()}\n\n`
    case 'h5': return `\n\n##### ${childMd().trim()}\n\n`
    case 'h6': return `\n\n###### ${childMd().trim()}\n\n`

    case 'strong':
    case 'b': return `**${childMd()}**`

    case 'em':
    case 'i': return `*${childMd()}*`

    case 'a': {
      const href = el.getAttribute('href') ?? ''
      const text = childMd()
      return href ? `[${text}](${href})` : text
    }

    case 'code': {
      if (el.parentElement?.tagName.toLowerCase() === 'pre') {
        return el.textContent ?? ''
      }
      return `\`${el.textContent ?? ''}\``
    }

    case 'pre': {
      const codeEl = el.querySelector('code')
      const lang = codeEl?.className.replace('language-', '') ?? ''
      const code = (codeEl ? codeEl.textContent : el.textContent) ?? ''
      return `\n\n\`\`\`${lang}\n${code.replace(/\n$/, '')}\n\`\`\`\n\n`
    }

    case 'blockquote': {
      const inner = childMd().trim()
      const quoted = inner.split('\n').map((l) => `> ${l}`).join('\n')
      return `\n\n${quoted}\n\n`
    }

    case 'ul': {
      const indent = '  '.repeat(listDepth)
      const items = Array.from(el.children).map((li) => {
        const text = nodeToMd(li, listDepth + 1, { n: 1 }).trim()
        return `${indent}- ${text}`
      })
      return `\n\n${items.join('\n')}\n\n`
    }

    case 'ol': {
      const indent = '  '.repeat(listDepth)
      let i = 1
      const items = Array.from(el.children).map((li) => {
        const text = nodeToMd(li, listDepth + 1, { n: 1 }).trim()
        return `${indent}${i++}. ${text}`
      })
      return `\n\n${items.join('\n')}\n\n`
    }

    case 'li': return childMd()

    case 'table': return convertTable(el)

    case 'br': return '\n'
    case 'hr': return '\n\n---\n\n'

    case 'p': return `\n\n${childMd().trim()}\n\n`

    case 'script':
    case 'style':
    case 'head':
    case 'meta':
    case 'link': return ''

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
  return result.replace(/\n{3,}/g, '\n\n').trim()
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
    <div className="flex flex-col gap-4">
      {/* ツールバー */}
      <div className="flex items-center justify-between gap-3">
        <p className="font-mono text-xs text-muted">HTML を貼り付けると Markdown に変換されます</p>
        <div className="flex gap-2">
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
      </div>

      {/* 2ペイン */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* 左: HTML 入力 */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted">HTML Input</span>
            {html && (
              <button
                onClick={() => setHtml('')}
                className="font-mono text-[10px] text-muted hover:text-dim transition-colors"
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
            className="h-80 w-full resize-y rounded-lg border border-border bg-surface p-4 font-mono text-sm text-primary placeholder:text-muted/50 focus:border-teal focus:outline-none"
          />
        </div>

        {/* 右: Markdown 出力 */}
        <div className="flex flex-col gap-2">
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted">Markdown Output</span>
          <div className="relative h-80 rounded-lg border border-border bg-surface">
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
