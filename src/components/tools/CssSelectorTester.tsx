'use client'
import { useState, useRef, useEffect, useCallback } from 'react'

const SAMPLE_HTML = `<div class="container">
  <h1 id="title">Hello World</h1>
  <p class="intro">This is an intro paragraph.</p>
  <ul class="list">
    <li class="item active">Item 1</li>
    <li class="item">Item 2</li>
    <li class="item">Item 3</li>
  </ul>
  <div class="card">
    <p>Card content</p>
    <a href="#" class="btn">Click me</a>
  </div>
</div>`

const SAMPLES = [
  { label: '.item', selector: '.item' },
  { label: '.item.active', selector: '.item.active' },
  { label: 'li:nth-child(2)', selector: 'li:nth-child(2)' },
  { label: 'p', selector: 'p' },
  { label: '#title', selector: '#title' },
  { label: 'a[href]', selector: 'a[href]' },
  { label: '.container > *', selector: '.container > *' },
  { label: 'li:not(.active)', selector: 'li:not(.active)' },
]

function highlightMatches(html: string, selector: string): { result: string; count: number; error: string } {
  if (!selector.trim()) return { result: html, count: 0, error: '' }
  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(`<body>${html}</body>`, 'text/html')
    const matches = doc.body.querySelectorAll(selector)
    if (matches.length === 0) return { result: html, count: 0, error: '' }
    matches.forEach((el) => {
      el.setAttribute('data-css-match', 'true')
    })
    return { result: doc.body.innerHTML, count: matches.length, error: '' }
  } catch (e) {
    return { result: html, count: 0, error: (e as Error).message }
  }
}

export function CssSelectorTester() {
  const [html, setHtml] = useState(SAMPLE_HTML)
  const [selector, setSelector] = useState('.item')
  const [result, setResult] = useState<{ result: string; count: number; error: string }>({ result: SAMPLE_HTML, count: 0, error: '' })
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const run = useCallback(() => {
    const r = highlightMatches(html, selector)
    setResult(r)
  }, [html, selector])

  useEffect(() => {
    const t = setTimeout(run, 300)
    return () => clearTimeout(t)
  }, [run])

  useEffect(() => {
    if (!iframeRef.current) return
    const doc = iframeRef.current.contentDocument
    if (!doc) return
    doc.open()
    doc.write(`<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; }
  body { margin: 16px; font-family: system-ui, sans-serif; font-size: 14px; color: #e2e8f0; background: #0f172a; }
  h1 { font-size: 1.25rem; margin: 0 0 8px; }
  p { margin: 0 0 8px; }
  ul { margin: 0 0 8px; padding-left: 20px; }
  li { margin-bottom: 4px; }
  .card { border: 1px solid #334155; border-radius: 6px; padding: 12px; margin-top: 8px; }
  a.btn { display: inline-block; background: #0f766e; color: #fff; padding: 4px 10px; border-radius: 4px; text-decoration: none; font-size: 12px; }
  [data-css-match] {
    outline: 2px solid #2dd4bf;
    outline-offset: 2px;
    background: rgba(45,212,191,0.12);
    border-radius: 3px;
  }
</style>
</head>
<body>${result.result}</body>
</html>`)
    doc.close()
  }, [result.result])

  return (
    <div className="space-y-4">
      {/* Selector input */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-0 flex-1">
          <label className="mb-1.5 block font-mono text-xs text-muted">CSSセレクター</label>
          <input
            value={selector}
            onChange={(e) => setSelector(e.target.value)}
            className="w-full rounded border border-border bg-canvas px-3 py-2 font-mono text-sm text-primary focus:border-teal focus:outline-none"
            placeholder=".class, #id, div > p, ..."
            spellCheck={false}
          />
        </div>
        <div className="shrink-0">
          {result.error ? (
            <span className="rounded bg-red-400/10 px-2.5 py-1 text-xs text-red-400">{result.error}</span>
          ) : (
            <span className={`rounded px-2.5 py-1 font-mono text-xs ${result.count > 0 ? 'bg-teal/10 text-teal' : 'bg-surface text-muted'}`}>
              {result.count} 件マッチ
            </span>
          )}
        </div>
      </div>

      {/* Quick selectors */}
      <div className="flex flex-wrap gap-1.5">
        {SAMPLES.map((s) => (
          <button
            key={s.selector}
            onClick={() => setSelector(s.selector)}
            className={`rounded border px-2.5 py-1 font-mono text-xs transition-colors ${
              selector === s.selector
                ? 'border-teal bg-teal/10 text-teal'
                : 'border-border text-dim hover:text-primary'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* HTML editor */}
        <div>
          <label className="mb-1.5 block font-mono text-xs text-muted">HTML</label>
          <textarea
            value={html}
            onChange={(e) => setHtml(e.target.value)}
            rows={14}
            className="w-full rounded border border-border bg-canvas px-3 py-2 font-mono text-xs text-primary focus:border-teal focus:outline-none"
            spellCheck={false}
          />
        </div>

        {/* Preview */}
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <p className="font-mono text-xs text-muted">プレビュー（マッチをハイライト）</p>
          </div>
          <iframe
            ref={iframeRef}
            title="CSS Selector Preview"
            sandbox="allow-same-origin"
            className="h-[238px] w-full rounded border border-border"
            style={{ background: '#0f172a' }}
          />
        </div>
      </div>

      {/* Matched elements */}
      {result.count > 0 && !result.error && (
        <div className="rounded border border-border bg-surface p-3">
          <p className="mb-2 font-mono text-xs text-muted">
            <span className="text-teal font-bold">{result.count}</span> 件の要素がセレクター
            <code className="mx-1 rounded bg-canvas px-1 font-mono text-xs text-primary">{selector}</code>
            にマッチしました
          </p>
          <p className="text-xs text-muted">プレビュー内でシアン枠が付いた要素がマッチした要素です。</p>
        </div>
      )}

      <button
        onClick={() => { setHtml(SAMPLE_HTML); setSelector('.item') }}
        className="rounded border border-border px-3 py-1.5 text-xs text-dim hover:text-primary transition-colors"
      >
        リセット
      </button>
    </div>
  )
}
