'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

const PRESETS: Record<string, { label: string; code: string }> = {
  flowchart: {
    label: 'flowchart',
    code: `flowchart LR
  A[Start] --> B{Is it?}
  B -- Yes --> C[OK]
  B -- No --> D[End]
  C --> D`,
  },
  sequenceDiagram: {
    label: 'sequenceDiagram',
    code: `sequenceDiagram
  participant Alice
  participant Bob
  Alice->>Bob: Hello Bob!
  Bob-->>Alice: Hi Alice!
  Alice->>Bob: How are you?
  Bob-->>Alice: Great, thanks!`,
  },
  erDiagram: {
    label: 'erDiagram',
    code: `erDiagram
  USER {
    int id PK
    string name
    string email
  }
  ORDER {
    int id PK
    int userId FK
    date createdAt
  }
  USER ||--o{ ORDER : places`,
  },
  gantt: {
    label: 'gantt',
    code: `gantt
  title Project Schedule
  dateFormat YYYY-MM-DD
  section Design
    Wireframe :a1, 2024-01-01, 7d
    Prototype :a2, after a1, 5d
  section Development
    Frontend :b1, after a2, 14d
    Backend  :b2, after a2, 14d`,
  },
}

export function MermaidPreview() {
  const [code, setCode] = useState(PRESETS.flowchart.code)
  const [svg, setSvg] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const idRef = useRef(0)

  const render = useCallback(async (source: string) => {
    const id = ++idRef.current
    try {
      const mermaid = (await import('mermaid')).default
      mermaid.initialize({
        startOnLoad: false,
        theme: 'dark',
        themeVariables: {
          background: '#14141A',
          primaryColor: '#1E1E26',
          primaryTextColor: '#CCCCE0',
          primaryBorderColor: '#36363F',
          lineColor: '#767688',
          secondaryColor: '#1E1E26',
          tertiaryColor: '#24242C',
          edgeLabelBackground: '#1E1E26',
          nodeTextColor: '#CCCCE0',
          clusterBkg: '#14141A',
          titleColor: '#EDEDF8',
          actorBkg: '#1E1E26',
          actorBorder: '#36363F',
          actorTextColor: '#CCCCE0',
          actorLineColor: '#4E4E5C',
          signalColor: '#767688',
          signalTextColor: '#CCCCE0',
          activationBkgColor: '#24242C',
          activationBorderColor: '#00C896',
          labelBoxBkgColor: '#1E1E26',
          labelBoxBorderColor: '#36363F',
          labelTextColor: '#CCCCE0',
        },
        suppressErrorRendering: true,
      })
      const uid = `mermaid-${Date.now()}`
      const { svg: rendered } = await mermaid.render(uid, source)
      if (id === idRef.current) {
        setSvg(rendered)
        setError(null)
      }
    } catch (e) {
      if (id === idRef.current) {
        setError(e instanceof Error ? e.message.replace(/[\r\n]+/g, ' ').trim() : String(e))
        setSvg('')
      }
    }
  }, [])

  useEffect(() => {
    const t = setTimeout(() => render(code), 300)
    return () => clearTimeout(t)
  }, [code, render])

  const downloadSvg = () => {
    if (!svg) return
    const blob = new Blob([svg], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'diagram.svg'
    a.click()
    URL.revokeObjectURL(url)
  }

  const downloadPng = () => {
    if (!svg) return
    // blob: URL はCanvas を汚染して toDataURL を失敗させる。data: URI を使う。
    const encoded = btoa(unescape(encodeURIComponent(svg)))
    const img = new Image()
    img.onload = () => {
      const scale = 2
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth * scale
      canvas.height = img.naturalHeight * scale
      const ctx = canvas.getContext('2d')!
      ctx.fillStyle = '#14141A'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.scale(scale, scale)
      ctx.drawImage(img, 0, 0)
      const a = document.createElement('a')
      a.href = canvas.toDataURL('image/png')
      a.download = 'diagram.png'
      a.click()
    }
    img.src = `data:image/svg+xml;base64,${encoded}`
  }

  const copyCode = async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Preset buttons */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(PRESETS).map(([key, preset]) => (
          <button
            key={key}
            onClick={() => setCode(preset.code)}
            className="rounded border border-[var(--border)] px-3 py-1 font-mono text-xs text-[var(--dim)] transition-colors hover:border-[var(--teal)] hover:text-[var(--teal)]"
          >
            {preset.label}
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Left: Editor */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--muted)]">Mermaid Code</span>
            <button
              onClick={copyCode}
              className="rounded border border-[var(--border)] px-2.5 py-0.5 font-mono text-xs text-[var(--dim)] transition-colors hover:border-[var(--teal)] hover:text-[var(--teal)]"
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            spellCheck={false}
            rows={16}
            className="w-full resize-y rounded border border-[var(--border)] bg-[var(--bg)] p-3 font-mono text-sm text-[var(--primary)] outline-none transition-colors focus:border-[var(--teal)]"
          />
        </div>

        {/* Right: Preview */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--muted)]">Preview</span>
            <div className="flex gap-2">
              <button
                onClick={downloadSvg}
                disabled={!svg}
                className="rounded border border-[var(--border)] px-2.5 py-0.5 font-mono text-xs text-[var(--dim)] transition-colors hover:border-[var(--teal)] hover:text-[var(--teal)] disabled:cursor-not-allowed disabled:opacity-30"
              >
                SVG
              </button>
              <button
                onClick={downloadPng}
                disabled={!svg}
                className="rounded border border-[var(--border)] px-2.5 py-0.5 font-mono text-xs text-[var(--dim)] transition-colors hover:border-[var(--teal)] hover:text-[var(--teal)] disabled:cursor-not-allowed disabled:opacity-30"
              >
                PNG
              </button>
            </div>
          </div>
          <div className="min-h-64 flex-1 overflow-auto rounded border border-[var(--border)] bg-[var(--surface)] p-4">
            {error ? (
              <div className="rounded border border-red-500/30 bg-red-500/8 p-3">
                <p className="font-mono text-xs font-semibold text-red-400">Syntax error</p>
                <p className="mt-1.5 font-mono text-xs leading-relaxed text-red-400/70">{error}</p>
              </div>
            ) : svg ? (
              <div
                dangerouslySetInnerHTML={{ __html: svg }}
                className="flex items-center justify-center [&_svg]:max-w-full [&_svg]:h-auto"
              />
            ) : (
              <div className="flex h-full min-h-40 items-center justify-center">
                <span className="font-mono text-xs text-[var(--muted)]">rendering…</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
