'use client'

import { useState } from 'react'

// ─── Parser ──────────────────────────────────────────────────────────────────

interface ParsedEntry {
  key: string
  value: string
}

interface Warning {
  lineNumber: number
  raw: string
}

interface ParseResult {
  entries: ParsedEntry[]
  warnings: Warning[]
}

function unquote(val: string): string {
  if (val.length >= 2) {
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      return val.slice(1, -1)
    }
  }
  return val
}

function parseEnv(text: string): ParseResult {
  const lines = text.split(/\r?\n/)
  const entries: ParsedEntry[] = []
  const warnings: Warning[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()

    if (!trimmed) continue
    if (trimmed.startsWith('#')) continue

    const eqIdx = trimmed.indexOf('=')
    if (eqIdx === -1) {
      warnings.push({ lineNumber: i + 1, raw: trimmed })
      continue
    }

    const key = trimmed.slice(0, eqIdx).trim()
    const rawVal = trimmed.slice(eqIdx + 1)
    const value = unquote(rawVal)

    entries.push({ key, value })
  }

  return { entries, warnings }
}

// ─── Sample ──────────────────────────────────────────────────────────────────

const SAMPLE = `# Database settings
DB_HOST=localhost
DB_PORT=5432
DB_NAME=myapp_production
DB_USER=admin
DB_PASSWORD="p@ssw0rd with spaces"

# API Keys
API_KEY=abc123xyz
SECRET_TOKEN='my secret token'
EMPTY_VAR=

# App
NODE_ENV=production
PORT=3000
`

// ─── Sub-components ──────────────────────────────────────────────────────────

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <button
      onClick={handleCopy}
      className={`rounded border px-3 py-1.5 font-mono text-xs transition-all ${
        copied
          ? 'border-teal/40 bg-teal/10 text-teal'
          : 'border-border text-dim hover:border-border-hi hover:text-primary'
      }`}
    >
      {copied ? '✓ Copied!' : label}
    </button>
  )
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className="flex items-center gap-2.5 group"
    >
      <span
        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border transition-all ${
          checked
            ? 'border-teal/50 bg-teal/20'
            : 'border-border bg-surface-hi'
        }`}
      >
        <span
          className={`h-3.5 w-3.5 rounded-full transition-all duration-200 ${
            checked
              ? 'translate-x-[18px] bg-teal'
              : 'translate-x-0.5 bg-muted'
          }`}
        />
      </span>
      <span className={`font-mono text-xs transition-colors ${checked ? 'text-teal' : 'text-dim group-hover:text-primary'}`}>
        {label}
      </span>
    </button>
  )
}

function MaskedValue({ value }: { value: string }) {
  if (value === '') return <span className="text-muted/30 italic text-xs">empty</span>
  return (
    <span className="inline-flex items-center gap-0.5 font-mono text-sm">
      {Array.from({ length: Math.min(value.length, 12) }).map((_, i) => (
        <span key={i} className="text-muted/40 text-[10px]">●</span>
      ))}
    </span>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function EnvFileParser() {
  const [raw, setRaw] = useState(SAMPLE)
  const [masked, setMasked] = useState(false)

  const isElectron = typeof window !== 'undefined' && !!(window as any).electronAPI?.isElectron

  const { entries, warnings } = parseEnv(raw)

  const jsonOutput = JSON.stringify(
    Object.fromEntries(entries.map((e) => [e.key, e.value])),
    null,
    2,
  )

  const envOutput = entries.map((e) => `${e.key}=${e.value}`).join('\n')

  const openFile = async () => {
    const content = await (window as any).electronAPI.openTextFile([
      { name: 'Env Files', extensions: ['env', 'txt', '*'] },
    ])
    if (content != null) setRaw(content)
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <Toggle checked={masked} onChange={() => setMasked((m) => !m)} label="値をマスク" />
          {isElectron && (
            <button
              onClick={openFile}
              className="rounded border border-border px-3 py-1.5 font-mono text-xs text-dim transition-all hover:border-border-hi hover:text-primary"
            >
              ファイルを開く…
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <CopyButton text={jsonOutput} label="JSON でコピー" />
          <CopyButton text={envOutput} label=".env でコピー" />
        </div>
      </div>

      {/* Main: input + results side-by-side on lg */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        {/* Input */}
        <div className="space-y-1.5 lg:w-72 lg:shrink-0">
          <div className="flex items-center justify-between">
            <label className="font-mono text-[10px] uppercase tracking-widest text-muted">.env テキスト</label>
            {entries.length > 0 && (
              <span className="font-mono text-[10px] text-muted/50">{entries.length} entries</span>
            )}
          </div>
          <textarea
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            rows={14}
            spellCheck={false}
            placeholder="KEY=value をペーストしてください"
            className="w-full resize-y rounded-lg border border-border bg-surface-hi px-4 py-3 font-mono text-xs leading-relaxed text-primary outline-none transition-colors focus:border-teal/40 placeholder:text-muted/30"
          />
        </div>

        {/* Results */}
        <div className="min-w-0 flex-1 space-y-3">
          {/* Warnings */}
          {warnings.length > 0 && (
            <div className="rounded-lg border border-yellow-500/25 bg-yellow-500/5 px-4 py-3 space-y-1">
              <p className="font-mono text-[10px] uppercase tracking-widest text-yellow-400/70">
                {warnings.length} 行をスキップ
              </p>
              {warnings.map((w) => (
                <p key={w.lineNumber} className="font-mono text-[11px] text-yellow-400/50">
                  <span className="text-yellow-400/30">L{w.lineNumber}</span>
                  {' '}
                  <span className="text-yellow-400/60">{w.raw}</span>
                </p>
              ))}
            </div>
          )}

          {/* Table */}
          {entries.length > 0 ? (
            <div className="overflow-hidden rounded-lg border border-border">
              {/* Header */}
              <div className="flex items-center border-b border-border bg-surface-hi px-4 py-2 gap-4">
                <span className="font-mono text-[10px] uppercase tracking-widest text-muted w-[40%]">Key</span>
                <span className="font-mono text-[10px] uppercase tracking-widest text-muted flex-1">Value</span>
              </div>
              {/* Rows */}
              <div className="divide-y divide-border/50">
                {entries.map((entry, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-4 px-4 py-2.5 transition-colors hover:bg-surface-hi/40"
                  >
                    <span className="font-mono text-sm text-teal break-all w-[40%] shrink-0 leading-relaxed">
                      {entry.key}
                    </span>
                    <span className="font-mono text-sm text-primary break-all min-w-0 flex-1 leading-relaxed">
                      {masked ? (
                        <MaskedValue value={entry.value} />
                      ) : entry.value === '' ? (
                        <span className="text-muted/30 italic text-xs">empty</span>
                      ) : (
                        entry.value
                      )}
                    </span>
                  </div>
                ))}
              </div>
              {/* Footer */}
              <div className="border-t border-border/50 bg-surface-hi/30 px-4 py-2 flex items-center justify-between">
                <span className="font-mono text-[10px] text-muted/50">{entries.length} entries parsed</span>
                {masked && (
                  <span className="font-mono text-[10px] text-teal/60">● masked</span>
                )}
              </div>
            </div>
          ) : raw.trim() ? (
            <div className="rounded-lg border border-border/50 bg-surface-hi/30 px-4 py-8 text-center">
              <p className="font-mono text-sm text-muted/50">解析可能なエントリが見つかりません</p>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-border/40 px-4 py-8 text-center">
              <p className="font-mono text-sm text-muted/40">.env テキストをペーストしてください</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
