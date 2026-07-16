'use client'

import { useState, useMemo, useRef } from 'react'

// ── HTML escape ──
function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// ── Syntax highlighter ──
type Rule = [RegExp, string]

function applyRules(code: string, rules: Rule[]): string {
  const tokens: string[] = []
  let src = code
  while (src.length) {
    let bestMatch: RegExpExecArray | null = null
    let bestCls = ''
    let bestIdx = Infinity
    for (const [re, cls] of rules) {
      re.lastIndex = 0
      const m = re.exec(src)
      if (m && m.index < bestIdx) { bestMatch = m; bestCls = cls; bestIdx = m.index }
    }
    if (!bestMatch) { tokens.push(esc(src)); break }
    if (bestIdx > 0) tokens.push(esc(src.slice(0, bestIdx)))
    tokens.push(`<span class="hl-${bestCls}">${esc(bestMatch[0])}</span>`)
    src = src.slice(bestIdx + bestMatch[0].length)
  }
  return tokens.join('')
}

const JS_RULES: Rule[] = [
  [/\/\/[^\n]*/g, 'cmt'],
  [/\/\*[\s\S]*?\*\//g, 'cmt'],
  [/(["'`])(?:\\.|(?!\1)[^\\])*\1/g, 'str'],
  [/\b\d+\.?\d*\b/g, 'num'],
  [/\b(const|let|var|function|return|if|else|for|while|do|switch|case|break|continue|new|class|extends|import|export|default|from|async|await|try|catch|finally|throw|typeof|instanceof|in|of|null|undefined|true|false|this|super|static|get|set|void|delete|yield)\b/g, 'kw'],
]
const PY_RULES: Rule[] = [
  [/#[^\n]*/g, 'cmt'],
  [/("""[\s\S]*?"""|'''[\s\S]*?'''|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')/g, 'str'],
  [/\b\d+\.?\d*\b/g, 'num'],
  [/\b(def|class|import|from|return|if|elif|else|for|while|in|not|and|or|is|None|True|False|pass|break|continue|try|except|finally|raise|with|as|lambda|yield|global|nonlocal|async|await)\b/g, 'kw'],
]
const HTML_RULES: Rule[] = [
  [/<!--[\s\S]*?-->/g, 'cmt'],
  [/"[^"]*"|'[^']*'/g, 'str'],
  [/<\/?[\w-]+/g, 'tag'],
  [/\s[\w-]+(?==)/g, 'attr'],
]
const CSS_RULES: Rule[] = [
  [/\/\*[\s\S]*?\*\//g, 'cmt'],
  [/"[^"]*"|'[^']*'/g, 'str'],
  [/#[0-9a-fA-F]{3,8}\b/g, 'num'],
  [/[\w-]+(?=\s*:)/g, 'prop'],
]
const JSON_RULES: Rule[] = [
  [/"(?:\\.|[^"\\])*"\s*:/g, 'prop'],
  [/"(?:\\.|[^"\\])*"/g, 'str'],
  [/\b(true|false|null)\b/g, 'kw'],
  [/-?\b\d+\.?\d*([eE][+-]?\d+)?\b/g, 'num'],
]
const SH_RULES: Rule[] = [
  [/#[^\n]*/g, 'cmt'],
  [/"(?:\\.|[^"\\])*"|'[^']*'/g, 'str'],
  [/\b(echo|cd|ls|mkdir|rm|mv|cp|cat|grep|find|chmod|sudo|apt|npm|git|node|python|pip|export|source)\b/g, 'kw'],
]

function highlight(code: string, lang: string): string {
  const l = lang.toLowerCase()
  if (l === 'js' || l === 'javascript' || l === 'ts' || l === 'typescript') return applyRules(code, JS_RULES)
  if (l === 'py' || l === 'python') return applyRules(code, PY_RULES)
  if (l === 'html' || l === 'xml') return applyRules(code, HTML_RULES)
  if (l === 'css' || l === 'scss') return applyRules(code, CSS_RULES)
  if (l === 'json') return applyRules(code, JSON_RULES)
  if (l === 'sh' || l === 'bash' || l === 'shell' || l === 'zsh') return applyRules(code, SH_RULES)
  return esc(code)
}

// ── Markdown parser ──
function slugify(text: string): string {
  return 'h-' + text.toLowerCase().replace(/[^\w぀-鿿]+/g, '-').replace(/^-|-$/g, '')
}

function safeUrl(url: string): string {
  return /^javascript:/i.test(url.trim()) ? '#' : url
}

function processInline(text: string): string {
  return text
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.+?)__/g, '<strong>$1</strong>')
    .replace(/\*([^*\n]+)\*/g, '<em>$1</em>')
    .replace(/_([^_\n]+)_/g, '<em>$1</em>')
    .replace(/~~(.+?)~~/g, '<del>$1</del>')
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt, src) => `<img alt="${alt}" src="${safeUrl(src)}" style="max-width:100%">`)
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, href) => `<a href="${safeUrl(href)}" target="_blank" rel="noopener noreferrer">${label}</a>`)
}

function md2html(src: string): string {
  // protect fenced code blocks
  const codeBlocks: string[] = []
  src = src.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) => {
    const i = codeBlocks.length
    const trimmed = code.replace(/\n$/, '')
    const hl = highlight(trimmed, lang)
    const label = lang ? `<span class="md-lang">${esc(lang)}</span>` : ''
    codeBlocks.push(`<pre class="md-pre">${label}<code>${hl}</code></pre>`)
    return `\x00CB${i}\x00`
  })

  // protect inline code
  const inlines: string[] = []
  src = src.replace(/`([^`\n]+)`/g, (_, c) => {
    const i = inlines.length
    inlines.push(`<code class="md-code">${esc(c)}</code>`)
    return `\x01IC${i}\x01`
  })

  const lines = src.split('\n')
  const out: string[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    // heading
    const hm = line.match(/^(#{1,6})\s+(.+)$/)
    if (hm) {
      const lvl = hm[1].length
      const text = hm[2]
      const id = slugify(text)
      out.push(`<h${lvl} id="${id}">${processInline(text)}</h${lvl}>`)
      i++; continue
    }

    // blockquote
    if (line.startsWith('> ')) {
      const bq: string[] = []
      while (i < lines.length && lines[i].startsWith('> ')) { bq.push(lines[i].slice(2)); i++ }
      out.push(`<blockquote><p>${processInline(bq.join(' '))}</p></blockquote>`)
      continue
    }

    // HR
    if (/^[-*_]{3,}$/.test(line.trim())) { out.push('<hr>'); i++; continue }

    // table
    if (line.includes('|') && i + 1 < lines.length && /^\|?[-:| ]+\|?$/.test(lines[i + 1])) {
      const headers = line.split('|').map(c => c.trim()).filter(Boolean)
      i += 2
      const rows: string[][] = []
      while (i < lines.length && lines[i].includes('|')) {
        rows.push(lines[i].split('|').map(c => c.trim()).filter(Boolean))
        i++
      }
      const th = headers.map(h => `<th>${processInline(h)}</th>`).join('')
      const tb = rows.map(r => `<tr>${r.map(c => `<td>${processInline(c)}</td>`).join('')}</tr>`).join('')
      out.push(`<table class="md-table"><thead><tr>${th}</tr></thead><tbody>${tb}</tbody></table>`)
      continue
    }

    // unordered list
    if (/^[-*+] /.test(line)) {
      out.push('<ul class="md-ul">')
      while (i < lines.length && /^[-*+] /.test(lines[i])) {
        out.push(`<li>${processInline(lines[i].replace(/^[-*+] /, ''))}</li>`)
        i++
      }
      out.push('</ul>')
      continue
    }

    // ordered list
    if (/^\d+\. /.test(line)) {
      out.push('<ol class="md-ol">')
      while (i < lines.length && /^\d+\. /.test(lines[i])) {
        out.push(`<li>${processInline(lines[i].replace(/^\d+\. /, ''))}</li>`)
        i++
      }
      out.push('</ol>')
      continue
    }

    // code block placeholder
    if (line.includes('\x00CB')) { out.push(line); i++; continue }

    // empty line
    if (line.trim() === '') { i++; continue }

    // paragraph
    const pLines: string[] = []
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !/^#{1,6} /.test(lines[i]) &&
      !/^[-*+] /.test(lines[i]) &&
      !/^\d+\. /.test(lines[i]) &&
      !lines[i].startsWith('> ') &&
      !/^[-*_]{3,}$/.test(lines[i].trim()) &&
      !lines[i].includes('\x00CB')
    ) { pLines.push(lines[i]); i++ }
    if (pLines.length) out.push(`<p>${processInline(pLines.join('<br>'))}</p>`)
  }

  let result = out.join('\n')
  codeBlocks.forEach((b, idx) => { result = result.replaceAll(`\x00CB${idx}\x00`, b) })
  inlines.forEach((c, idx) => { result = result.replaceAll(`\x01IC${idx}\x01`, c) })
  return result
}

// ── TOC extraction ──
interface Heading { level: number; text: string; id: string }

function extractHeadings(html: string): Heading[] {
  const results: Heading[] = []
  const re = /<h([1-3]) id="([^"]+)">([^<]+)/g
  let m
  while ((m = re.exec(html)) !== null) {
    results.push({ level: parseInt(m[1]), text: m[3], id: m[2] })
  }
  return results
}

// ── CopyButton ──
function CopyButton({ text, label = 'Copy MD' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
      }}
      className={`inline-flex items-center gap-1.5 rounded border px-2.5 py-1 font-mono text-[10px] transition-all duration-150 ${
        copied
          ? 'border-teal/40 bg-teal/10 text-teal'
          : 'border-border text-muted hover:border-border-hi hover:text-dim'
      }`}
    >
      {copied ? (
        <>
          <svg width="9" height="9" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Copied!
        </>
      ) : label}
    </button>
  )
}

// ── Main component ──
export function MarkdownPreview() {
  const [input, setInput] = useState('')
  const [focused, setFocused] = useState(false)
  const previewRef = useRef<HTMLDivElement>(null)

  const { html, headings } = useMemo(() => {
    if (!input.trim()) return { html: '', headings: [] as Heading[] }
    const h = md2html(input)
    return { html: h, headings: extractHeadings(h) }
  }, [input])

  const charCount = input.length
  const lineCount = input ? input.split('\n').length : 0

  const scrollToHeading = (id: string) => {
    const el = previewRef.current?.querySelector(`#${CSS.escape(id)}`)
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="space-y-3">
      {/* Split pane */}
      <div className={`grid grid-cols-1 gap-0 overflow-hidden rounded-lg border transition-colors duration-200 md:grid-cols-2 ${
        focused ? 'border-border-hi' : 'border-border'
      }`}>
        {/* Editor pane */}
        <div className="flex flex-col border-b border-border md:border-b-0 md:border-r">
          <div className="flex items-center justify-between border-b border-border bg-surface-hi px-4 py-2">
            <div className="flex items-center gap-2.5">
              {/* file icon dots */}
              <span className="flex gap-1" aria-hidden="true">
                <span className="h-2 w-2 rounded-full bg-border-hi" />
                <span className="h-2 w-2 rounded-full bg-border-hi" />
                <span className="h-2 w-2 rounded-full bg-border-hi" />
              </span>
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted">Markdown</span>
            </div>
            <span className="font-mono text-[10px] tabular-nums text-muted/40">
              {charCount > 0 ? `${charCount.toLocaleString()} ch · ${lineCount} ln` : ''}
            </span>
          </div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder={'# 見出し\n\nここに Markdown を入力...'}
            spellCheck={false}
            className="md-editor min-h-[320px] flex-1 resize-y bg-bg p-4 font-mono text-xs leading-relaxed text-primary outline-none placeholder:text-muted/20"
          />
        </div>

        {/* Preview pane */}
        <div className="flex flex-col">
          <div className="flex items-center justify-between border-b border-border bg-surface-hi px-4 py-2">
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted">Preview</span>
            <span className={`flex items-center gap-1.5 font-mono text-[10px] transition-opacity duration-300 ${html ? 'opacity-100' : 'opacity-0'}`}>
              <span className="md-live-dot h-1.5 w-1.5 rounded-full bg-teal" aria-hidden="true" />
              <span className="text-teal/60">live</span>
            </span>
          </div>
          {html ? (
            <div
              ref={previewRef}
              className="md-preview min-h-[320px] flex-1 overflow-y-auto p-5"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          ) : (
            <div ref={previewRef} className="min-h-[320px] flex-1 overflow-y-auto p-5 flex flex-col items-center justify-center gap-3">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="text-border-hi">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <polyline points="14 2 14 8 20 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <line x1="16" y1="13" x2="8" y2="13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                <line x1="16" y1="17" x2="8" y2="17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                <polyline points="10 9 9 9 8 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <p className="font-mono text-[11px] text-muted/30">入力するとここに表示されます</p>
            </div>
          )}
        </div>
      </div>

      {/* Action bar */}
      {input && (
        <div className="flex items-center justify-end gap-2">
          <CopyButton text={input} />
          <button
            onClick={() => setInput('')}
            className="rounded border border-border px-2.5 py-1 font-mono text-[10px] text-muted transition-colors hover:border-border-hi hover:text-dim"
          >
            Clear
          </button>
        </div>
      )}

      {/* TOC */}
      {headings.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 px-1">
            <svg width="10" height="10" viewBox="0 0 12 12" fill="none" aria-hidden="true" className="text-muted/60">
              <rect x="1" y="1" width="4" height="1.5" rx="0.5" fill="currentColor"/>
              <rect x="1" y="4" width="10" height="1.5" rx="0.5" fill="currentColor"/>
              <rect x="1" y="7" width="8" height="1.5" rx="0.5" fill="currentColor"/>
              <rect x="1" y="10" width="6" height="1.5" rx="0.5" fill="currentColor"/>
            </svg>
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted">Contents</span>
            <span className="rounded bg-surface-hi px-1.5 py-px font-mono text-[9px] text-muted/50">
              {headings.length}
            </span>
          </div>
          <div className="overflow-hidden rounded-lg border border-border">
            {headings.map((h, i) => (
              <button
                key={`${h.id}-${i}`}
                onClick={() => scrollToHeading(h.id)}
                className={`md-toc-item group relative block w-full truncate border-b border-border py-2 text-left font-mono text-[11px] transition-all duration-150 last:border-b-0 hover:bg-surface-hi ${
                  h.level === 1
                    ? 'pl-4 text-dim font-semibold'
                    : h.level === 2
                    ? 'pl-9 text-muted'
                    : 'pl-14 text-muted/55'
                }`}
              >
                {/* level indicator line */}
                <span className={`absolute left-0 top-0 h-full w-0.5 opacity-0 transition-opacity duration-150 group-hover:opacity-100 ${
                  h.level === 1 ? 'bg-teal' : h.level === 2 ? 'bg-dim/40' : 'bg-muted/30'
                }`} aria-hidden="true" />
                {h.text}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
