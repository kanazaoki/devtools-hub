'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

const DEFAULT_HTML = `<h1>Hello, World!</h1>
<p>HTML / CSS / JS を編集してリアルタイムプレビュー。</p>
<button onclick="greet()">クリック！</button>`

const DEFAULT_CSS = `body {
  font-family: system-ui, sans-serif;
  padding: 24px;
  background: #f8fafc;
  color: #1e293b;
}

h1 { color: #0f766e; }

button {
  margin-top: 12px;
  padding: 8px 20px;
  background: #0f766e;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
}`

const DEFAULT_JS = `function greet() {
  alert('こんにちは！HTML Playground へようこそ。')
}`

function buildSrcdoc(html: string, css: string, js: string): string {
  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<style>${css}</style>
</head>
<body>
${html}
<script>${js}<\/script>
</body>
</html>`
}

type PaneId = 'html' | 'css' | 'js'

export function HtmlPlayground() {
  const [html, setHtml] = useState(DEFAULT_HTML)
  const [css, setCss] = useState(DEFAULT_CSS)
  const [js, setJs] = useState(DEFAULT_JS)
  const [visible, setVisible] = useState<Record<PaneId, boolean>>({ html: true, css: true, js: true })
  const [previewWidth, setPreviewWidth] = useState(100)
  const [srcdoc, setSrcdoc] = useState(() => buildSrcdoc(DEFAULT_HTML, DEFAULT_CSS, DEFAULT_JS))
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const refresh = useCallback(() => {
    setSrcdoc(buildSrcdoc(html, css, js))
  }, [html, css, js])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(refresh, 500)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [html, css, js, refresh])

  const clearAll = () => { setHtml(''); setCss(''); setJs('') }
  const togglePane = (pane: PaneId) => setVisible(v => ({ ...v, [pane]: !v[pane] }))

  const PANES: { id: PaneId; label: string; value: string; setter: (v: string) => void; color: string }[] = [
    { id: 'html', label: 'HTML', value: html, setter: setHtml, color: 'text-orange-400' },
    { id: 'css',  label: 'CSS',  value: css,  setter: setCss,  color: 'text-blue-400' },
    { id: 'js',   label: 'JS',   value: js,   setter: setJs,   color: 'text-yellow-400' },
  ]

  const visiblePanes = PANES.filter(p => visible[p.id])

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1">
          {PANES.map(p => (
            <button
              key={p.id}
              onClick={() => togglePane(p.id)}
              className={`rounded px-3 py-1.5 text-xs font-mono font-semibold border transition-colors ${
                visible[p.id]
                  ? `border-transparent bg-surface ${p.color}`
                  : 'border-border text-muted'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <button
          onClick={refresh}
          className="rounded border border-border px-3 py-1.5 text-xs text-dim hover:border-teal hover:text-teal transition-colors"
        >
          ↺ 更新
        </button>
        <button
          onClick={clearAll}
          className="rounded border border-border px-3 py-1.5 text-xs text-dim hover:border-red-400 hover:text-red-400 transition-colors"
        >
          クリア
        </button>
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-xs text-muted">プレビュー幅</span>
          <input
            type="range"
            min={30}
            max={100}
            value={previewWidth}
            onChange={e => setPreviewWidth(Number(e.target.value))}
            className="w-24 accent-teal"
          />
          <span className="text-xs text-dim font-mono">{previewWidth}%</span>
        </div>
      </div>

      {/* Editors + Preview */}
      <div className="flex gap-3" style={{ minHeight: '420px' }}>
        {/* Code panes */}
        {visiblePanes.length > 0 && (
          <div className={`flex flex-col gap-3 ${previewWidth < 100 ? 'w-[40%]' : 'flex-1'}`} style={{ minWidth: 0 }}>
            {visiblePanes.map(p => (
              <div key={p.id} className="flex-1 flex flex-col min-h-0">
                <div className={`mb-1 text-xs font-mono font-semibold uppercase tracking-widest ${p.color}`}>
                  {p.label}
                </div>
                <textarea
                  value={p.value}
                  onChange={e => p.setter(e.target.value)}
                  spellCheck={false}
                  className="flex-1 w-full rounded-md border border-border bg-bg px-3 py-2.5 font-mono text-xs text-primary focus:border-teal focus:outline-none resize-none"
                  style={{ minHeight: `${Math.floor(360 / visiblePanes.length)}px` }}
                />
              </div>
            ))}
          </div>
        )}

        {/* Preview */}
        <div
          className="flex-shrink-0 flex flex-col"
          style={{ width: visiblePanes.length > 0 ? `${previewWidth}%` : '100%', maxWidth: '100%' }}
        >
          <div className="mb-1 text-xs font-mono font-semibold uppercase tracking-widest text-muted">
            Preview
          </div>
          <iframe
            srcDoc={srcdoc}
            sandbox="allow-scripts"
            title="HTML Playground Preview"
            className="flex-1 w-full rounded-md border border-border bg-white"
            style={{ minHeight: '360px' }}
          />
        </div>
      </div>
    </div>
  )
}
