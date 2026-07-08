'use client'

import { useState, useCallback } from 'react'

// ── Data pools ──────────────────────────────────────────────────
const FIRST_NAMES = ['Alice','Bob','Carol','David','Emma','Frank','Grace','Hank','Iris','Jack','Karen','Liam','Mia','Noah','Olivia','Paul','Quinn','Ruby','Sam','Tina','Uma','Victor','Wendy','Xander','Yara','Zach']
const LAST_NAMES  = ['Smith','Johnson','Williams','Brown','Jones','Garcia','Miller','Davis','Wilson','Taylor','Anderson','Thomas','Jackson','White','Harris','Martin','Thompson','Young','Allen','King','Scott','Green','Baker','Adams','Nelson']
const DOMAINS     = ['example.com','test.org','demo.net','sample.io','mock.dev']
const LOREM_WORDS = 'lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua enim ad minim veniam quis nostrud exercitation ullamco laboris'.split(' ')

function rnd(n: number) { return Math.floor(Math.random() * n) }
function pick<T>(arr: T[]): T { return arr[rnd(arr.length)] }

function genUUID(): string {
  const h = () => Math.floor(Math.random() * 0x10000).toString(16).padStart(4,'0')
  return `${h()}${h()}-${h()}-4${h().slice(1)}-${(Math.floor(Math.random()*4)+8).toString(16)}${h().slice(1)}-${h()}${h()}${h()}`
}
function genDate(): string {
  const start = new Date(2000, 0, 1).getTime()
  const end   = new Date(2030, 11, 31).getTime()
  const d = new Date(start + Math.random() * (end - start))
  return d.toISOString().split('T')[0]
}
function genPhone(): string {
  const area = String(rnd(900) + 100)
  const mid  = String(rnd(900) + 100)
  const last = String(rnd(9000) + 1000)
  return `${area}-${mid}-${last}`
}
function genLorem(): string {
  const len = rnd(10) + 5
  return Array.from({ length: len }, () => pick(LOREM_WORDS)).join(' ') + '.'
}

// ── Types ─────────────────────────────────────────────────────────
type FieldKey = 'name' | 'email' | 'phone' | 'date' | 'uuid' | 'number' | 'lorem'
type Format = 'json' | 'csv' | 'tsv'

const FIELDS: { key: FieldKey; label: string }[] = [
  { key: 'name',   label: '名前' },
  { key: 'email',  label: 'メール' },
  { key: 'phone',  label: '電話番号' },
  { key: 'date',   label: '日付' },
  { key: 'uuid',   label: 'UUID' },
  { key: 'number', label: '数値' },
  { key: 'lorem',  label: 'Lorem文' },
]

function generateRow(fields: FieldKey[]): Record<string, string> {
  const first = pick(FIRST_NAMES)
  const last  = pick(LAST_NAMES)
  const row: Record<string, string> = {}
  for (const f of fields) {
    if (f === 'name')   row[f] = `${first} ${last}`
    if (f === 'email')  row[f] = `${first.toLowerCase()}.${last.toLowerCase()}${rnd(99)}@${pick(DOMAINS)}`
    if (f === 'phone')  row[f] = genPhone()
    if (f === 'date')   row[f] = genDate()
    if (f === 'uuid')   row[f] = genUUID()
    if (f === 'number') row[f] = String(rnd(1000000))
    if (f === 'lorem')  row[f] = genLorem()
  }
  return row
}

function formatOutput(rows: Record<string, string>[], fields: FieldKey[], fmt: Format): string {
  if (rows.length === 0) return ''
  if (fmt === 'json') return JSON.stringify(rows, null, 2)
  const sep = fmt === 'csv' ? ',' : '\t'
  const escape = (v: string) => fmt === 'csv' ? `"${v.replace(/"/g, '""')}"` : v
  const header = fields.join(sep)
  const body   = rows.map(r => fields.map(f => escape(r[f] ?? '')).join(sep)).join('\n')
  return `${header}\n${body}`
}

export function FakeDataGenerator() {
  const [selected, setSelected] = useState<Set<FieldKey>>(new Set(['name','email','uuid']))
  const [count, setCount]       = useState(10)
  const [format, setFormat]     = useState<Format>('json')
  const [output, setOutput]     = useState('')
  const [error, setError]       = useState('')
  const [copied, setCopied]     = useState(false)

  const toggle = (key: FieldKey) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  const generate = useCallback(() => {
    const fields = FIELDS.map(f => f.key).filter(k => selected.has(k))
    if (fields.length === 0) { setError('フィールドを1つ以上選択してください'); setOutput(''); return }
    setError('')
    const rows = Array.from({ length: count }, () => generateRow(fields))
    setOutput(formatOutput(rows, fields, format))
  }, [selected, count, format])

  const copy = async () => {
    if (!output) return
    await navigator.clipboard.writeText(output)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const download = () => {
    if (!output) return
    const ext = format === 'json' ? 'json' : format === 'csv' ? 'csv' : 'tsv'
    const mime = format === 'json' ? 'application/json' : 'text/plain'
    const blob = new Blob([output], { type: mime })
    const url  = URL.createObjectURL(blob)
    const a    = Object.assign(document.createElement('a'), { href: url, download: `fake-data.${ext}` })
    a.click(); URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      {/* Field selection */}
      <div>
        <p className="mb-3 text-sm font-medium text-primary">生成するフィールド</p>
        <div className="flex flex-wrap gap-2">
          {FIELDS.map(({ key, label }) => (
            <label key={key} className={`flex cursor-pointer items-center gap-2 rounded border px-3 py-1.5 text-sm transition-all ${selected.has(key) ? 'border-teal bg-teal/10 text-teal' : 'border-border text-dim hover:border-teal/60'}`}>
              <input
                type="checkbox"
                checked={selected.has(key)}
                onChange={() => toggle(key)}
                className="accent-teal"
              />
              <span className="font-medium">{label}</span>
            </label>
          ))}
        </div>
        {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
      </div>

      {/* Count + Format */}
      <div className="flex flex-wrap gap-6">
        <div className="flex-1 min-w-[160px]">
          <label className="mb-1.5 block text-sm font-medium text-primary">件数: {count}</label>
          <input
            type="range" min={1} max={100} value={count}
            onChange={e => setCount(Number(e.target.value))}
            className="w-full accent-teal"
          />
          <div className="mt-0.5 flex justify-between text-xs text-muted"><span>1</span><span>100</span></div>
        </div>
        <div>
          <p className="mb-1.5 text-sm font-medium text-primary">フォーマット</p>
          <div className="flex gap-2">
            {(['json','csv','tsv'] as Format[]).map(f => (
              <button key={f} onClick={() => setFormat(f)}
                className={`rounded px-3 py-1.5 text-sm font-mono transition-colors ${format === f ? 'bg-teal text-bg font-bold' : 'border border-border text-dim hover:border-teal'}`}
              >{f.toUpperCase()}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Generate button */}
      <button onClick={generate}
        className="w-fit rounded bg-teal px-6 py-2 text-sm font-bold text-bg transition-all hover:opacity-85 active:scale-95"
      >生成する</button>

      {/* Output */}
      {output && (
        <div className="rounded-lg border border-border bg-surface p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs text-muted font-mono uppercase tracking-widest">Output</p>
            <div className="flex gap-2">
              <button onClick={copy} className={`rounded px-3 py-1 text-xs font-medium transition-all ${copied ? 'bg-teal/20 text-teal border border-teal/40' : 'border border-border text-dim hover:border-teal hover:text-teal'}`}>
                {copied ? '✓ コピー済み' : 'コピー'}
              </button>
              <button onClick={download} className="rounded border border-border px-3 py-1 text-xs text-dim hover:border-teal hover:text-teal transition-all">
                ダウンロード
              </button>
            </div>
          </div>
          <textarea
            readOnly value={output}
            className="h-64 w-full resize-y rounded border border-border/50 bg-bg p-3 font-mono text-xs text-primary focus:outline-none"
          />
        </div>
      )}
    </div>
  )
}
