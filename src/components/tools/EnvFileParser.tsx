'use client'

import { useState } from 'react'

// ─── Parser ──────────────────────────────────────────────────────────────────

interface ParsedEntry {
  key: string
  value: string
  line: number
  note?: string
}

interface Warning {
  lineNumber: number
  raw: string
}

interface ParseResult {
  entries: ParsedEntry[]
  warnings: Warning[]
}

// 値の読み方は dotenv（Node.js で最も使われる読み込み方）に合わせる。
// ⚠ 以前はクォートを外すだけで、「KEY=abc # メモ」のメモまで値に入れ、「export KEY=」のキーを
// 「export KEY」と読み、同じキーが2回あっても何も言わなかった
function readValue(raw: string): { value: string; note?: string } {
  const v = raw.trim()
  const q = v[0]
  if (q === '"' || q === "'" || q === '`') {
    const end = v.indexOf(q, 1)
    if (end > 0) {
      let inner = v.slice(1, end)
      // ダブルクォートの中だけ \n を改行として読む
      if (q === '"') inner = inner.replace(/\\n/g, '\n').replace(/\\r/g, '\r')
      return { value: inner, note: q === '"' ? 'ダブルクォート（\\n は改行になる）' : 'シングルクォート（書いたとおり）' }
    }
    return { value: v, note: '閉じるクォートが見つからないため、そのまま読みました' }
  }
  // クォート無しは # からがコメント（dotenv は直前に空白が無くても # で切る。abc#def は abc）
  const m = v.indexOf('#')
  if (m >= 0) return { value: v.slice(0, m).trim(), note: `「${v.slice(m).trim()}」はコメントとして外しました（# を値に含めるならクォートで囲む）` }
  return { value: v }
}

function parseEnv(text: string): ParseResult {
  const lines = text.split(/\r?\n/)
  const entries: ParsedEntry[] = []
  const warnings: Warning[] = []

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    const eqIdx = trimmed.indexOf('=')
    if (eqIdx === -1) {
      warnings.push({ lineNumber: i + 1, raw: trimmed })
      continue
    }

    const key = trimmed.slice(0, eqIdx).trim().replace(/^export\s+/, '')
    const { value, note } = readValue(trimmed.slice(eqIdx + 1))
    entries.push({ key, value, line: i + 1, note })
  }

  return { entries, warnings }
}

/** 同じキーが2回以上あるもの（dotenv では後の行が使われる） */
function duplicatesOf(entries: ParsedEntry[]) {
  const map = new Map<string, number[]>()
  for (const e of entries) map.set(e.key, [...(map.get(e.key) ?? []), e.line])
  return [...map].filter(([, l]) => l.length > 1)
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
  const [other, setOther] = useState('')

  const isElectron = typeof window !== 'undefined' && !!(window as any).electronAPI?.isElectron

  const { entries, warnings } = parseEnv(raw)
  const dups = duplicatesOf(entries)
  // もう1つの .env（本番用など）と比べる
  const cmp = (() => {
    if (!other.trim()) return null
    const a = new Map(entries.map((e) => [e.key, e.value]))
    const b = new Map(parseEnv(other).entries.map((e) => [e.key, e.value]))
    return {
      onlyA: [...a.keys()].filter((k) => !b.has(k)),
      onlyB: [...b.keys()].filter((k) => !a.has(k)),
      emptyA: [...a].filter(([k, v]) => v === '' && b.has(k)).map(([k]) => k),
      emptyB: [...b].filter(([k, v]) => v === '' && a.has(k)).map(([k]) => k),
    }
  })()

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
          <label className="block pt-2 font-mono text-[10px] uppercase tracking-widest text-muted">比べる .env（本番用など・任意）</label>
          <textarea
            value={other}
            onChange={(e) => setOther(e.target.value)}
            rows={6}
            spellCheck={false}
            placeholder="もう1つの .env を貼ると、片方にしか無いキーと空のキーを出します"
            className="w-full resize-y rounded-lg border border-border bg-surface-hi px-4 py-3 font-mono text-xs leading-relaxed text-primary outline-none transition-colors focus:border-teal/40 placeholder:text-muted/30"
          />
          {cmp && (
            <div className="space-y-1 rounded-lg border border-border bg-surface-hi/40 px-3 py-2 font-mono text-[11px]">
              {cmp.onlyA.length + cmp.onlyB.length + cmp.emptyA.length + cmp.emptyB.length === 0 ? (
                <p className="text-teal">キーはそろっていて、空の値もありません</p>
              ) : (
                <>
                  {cmp.onlyA.length > 0 && <p className="text-yellow-400/80">上にだけある：{cmp.onlyA.join(', ')}</p>}
                  {cmp.onlyB.length > 0 && <p className="text-yellow-400/80">下にだけある：{cmp.onlyB.join(', ')}</p>}
                  {cmp.emptyA.length > 0 && <p className="text-yellow-400/80">上で空：{cmp.emptyA.join(', ')}</p>}
                  {cmp.emptyB.length > 0 && <p className="text-yellow-400/80">下で空：{cmp.emptyB.join(', ')}</p>}
                </>
              )}
            </div>
          )}
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

          {dups.length > 0 && (
            <div className="rounded-lg border border-yellow-500/25 bg-yellow-500/5 px-4 py-3 space-y-1">
              <p className="font-mono text-[10px] uppercase tracking-widest text-yellow-400/70">同じキーが複数あります</p>
              {dups.map(([k, l]) => (
                <p key={k} className="font-mono text-[11px] text-yellow-400/70">
                  {k}：L{l.join('・L')}（dotenv では最後の L{l[l.length - 1]} の値が使われます）
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
                      {entry.note && <span className="block font-mono text-[10px] text-muted/60">{entry.note}</span>}
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
