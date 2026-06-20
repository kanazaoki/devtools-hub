'use client'

import { useState, useCallback, useMemo } from 'react'

type Mode = 'encode' | 'decode'

function encodeEntities(text: string, encodeNonAscii: boolean): string {
  // & must be replaced first to avoid double-encoding
  let result = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

  if (encodeNonAscii) {
    result = result.replace(/[^\x00-\x7F]/g, (ch) => `&#${ch.charCodeAt(0)};`)
  }

  return result
}

function decodeEntities(text: string): string {
  if (typeof document === 'undefined') return text
  const textarea = document.createElement('textarea')
  textarea.innerHTML = text
  return textarea.value
}

function countEntities(text: string): number {
  return (text.match(/&[#\w]+;/g) ?? []).length
}

export function HtmlEntityEncoder() {
  const [mode, setMode] = useState<Mode>('encode')
  const [input, setInput] = useState('')
  const [encodeNonAscii, setEncodeNonAscii] = useState(false)
  const [copied, setCopied] = useState(false)

  const output = useMemo(() => {
    if (!input) return ''
    return mode === 'encode'
      ? encodeEntities(input, encodeNonAscii)
      : decodeEntities(input)
  }, [mode, input, encodeNonAscii])

  const entityCount = useMemo(
    () => (mode === 'encode' ? countEntities(output) : 0),
    [mode, output]
  )

  const handleModeChange = useCallback((newMode: Mode) => {
    setMode(newMode)
    setInput('')
    setCopied(false)
  }, [])

  const handleCopy = useCallback(() => {
    if (!output) return
    navigator.clipboard.writeText(output).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }, [output])

  return (
    <div className="space-y-5">
      {/* Controls row: segmented mode selector + non-ASCII option */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Segmented control */}
        <div
          className="inline-flex rounded border border-border bg-bg/60 p-0.5"
          role="tablist"
        >
          {(['encode', 'decode'] as Mode[]).map((m) => (
            <button
              key={m}
              role="tab"
              aria-selected={mode === m}
              data-testid={`tab-${m}`}
              onClick={() => handleModeChange(m)}
              className={`rounded px-4 py-1.5 font-mono text-xs transition-all ${
                mode === m
                  ? 'bg-teal text-bg font-semibold shadow-sm'
                  : 'text-muted hover:text-primary'
              }`}
            >
              {m === 'encode' ? '↑ Encode' : '↓ Decode'}
            </button>
          ))}
        </div>

        {/* Non-ASCII pill (Encode only) */}
        {mode === 'encode' && (
          <label className="flex cursor-pointer items-center gap-1.5 rounded border border-border px-3 py-1.5 text-xs text-muted transition-colors hover:border-teal/40 hover:text-primary">
            <input
              type="checkbox"
              checked={encodeNonAscii}
              onChange={(e) => setEncodeNonAscii(e.target.checked)}
              data-testid="non-ascii-option"
              className="accent-teal"
            />
            <span className="font-mono">non-ASCII</span>
            <span className="text-muted/50 font-mono">© → &amp;#169;</span>
          </label>
        )}
      </div>

      {/* Input / Arrow / Output */}
      <div className="grid gap-3 sm:grid-cols-[1fr_1.5rem_1fr]">
        {/* Input panel */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted">
              Input
            </span>
            {input.length > 0 && (
              <span className="font-mono text-[9px] text-muted/50">
                {input.length} chars
              </span>
            )}
          </div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              mode === 'encode'
                ? '<div class="hello">Hello & World</div>'
                : '&lt;div&gt;Hello &amp; World&lt;/div&gt;'
            }
            data-testid="input-area"
            rows={10}
            className="w-full resize-y rounded border border-border bg-surface p-3 font-mono text-xs leading-relaxed text-primary placeholder:text-muted/30 focus:border-teal/60 focus:outline-none transition-colors"
          />
        </div>

        {/* Direction arrow — desktop only */}
        <div className="hidden sm:flex flex-col items-center justify-center pt-6">
          <span className="select-none font-mono text-sm text-muted/30">
            {mode === 'encode' ? '→' : '←'}
          </span>
        </div>

        {/* Output panel */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted">
                Output
              </span>
              {entityCount > 0 && (
                <span className="rounded bg-teal/10 px-1.5 py-0.5 font-mono text-[9px] text-teal/80">
                  {entityCount} entities
                </span>
              )}
            </div>
            <button
              onClick={handleCopy}
              disabled={!output}
              data-testid="copy-button"
              className={`rounded border px-3 py-0.5 font-mono text-[10px] transition-all disabled:cursor-not-allowed disabled:opacity-30 ${
                copied
                  ? 'border-teal/40 bg-teal/10 text-teal'
                  : 'border-border text-muted hover:border-teal hover:text-teal'
              }`}
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <textarea
            value={output}
            readOnly
            placeholder="変換結果がここに表示されます"
            data-testid="output-area"
            rows={10}
            className="w-full resize-y rounded border border-border bg-surface/40 p-3 font-mono text-xs leading-relaxed text-dim placeholder:text-muted/30 focus:outline-none"
          />
        </div>
      </div>
    </div>
  )
}
