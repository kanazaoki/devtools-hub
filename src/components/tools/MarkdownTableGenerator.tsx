'use client'

import { useState } from 'react'

type Alignment = 'left' | 'center' | 'right'

const ALIGN_SYMBOLS: Record<Alignment, string> = { left: ':---', center: ':---:', right: '---:' }

let uid = 0
function nextId() { return String(++uid) }

type Row = { id: string; cells: string[] }

function buildMarkdown(headers: string[], alignments: Alignment[], rows: Row[]): string {
  const sep = alignments.map((a) => ALIGN_SYMBOLS[a])
  const hRow = `| ${headers.join(' | ')} |`
  const sRow = `| ${sep.join(' | ')} |`
  const dRows = rows.map((r) => `| ${r.cells.join(' | ')} |`)
  return [hRow, sRow, ...dRows].join('\n')
}

const INITIAL_HEADERS = ['Name', 'Type', 'Description']
const INITIAL_ALIGNMENTS: Alignment[] = ['left', 'center', 'left']
const INITIAL_ROWS: Row[] = [
  { id: nextId(), cells: ['id', 'string', 'Unique identifier'] },
  { id: nextId(), cells: ['name', 'string', 'Display name'] },
  { id: nextId(), cells: ['createdAt', 'Date', 'Creation timestamp'] },
]

const ALIGN_OPTIONS: { key: Alignment; label: string; title: string }[] = [
  { key: 'left', label: '⇤', title: '左揃え' },
  { key: 'center', label: '⇔', title: '中央揃え' },
  { key: 'right', label: '⇥', title: '右揃え' },
]

export function MarkdownTableGenerator() {
  const [headers, setHeaders] = useState<string[]>(INITIAL_HEADERS)
  const [alignments, setAlignments] = useState<Alignment[]>(INITIAL_ALIGNMENTS)
  const [rows, setRows] = useState<Row[]>(INITIAL_ROWS)
  const [csvInput, setCsvInput] = useState('')
  const [copied, setCopied] = useState(false)
  const [showCsv, setShowCsv] = useState(false)

  const colCount = headers.length

  const updateHeader = (ci: number, val: string) =>
    setHeaders((prev) => prev.map((h, i) => (i === ci ? val : h)))

  const updateAlignment = (ci: number, al: Alignment) =>
    setAlignments((prev) => prev.map((a, i) => (i === ci ? al : a)))

  const updateCell = (rowId: string, ci: number, val: string) =>
    setRows((prev) =>
      prev.map((r) => (r.id === rowId ? { ...r, cells: r.cells.map((c, i) => (i === ci ? val : c)) } : r))
    )

  const addColumn = () => {
    setHeaders((prev) => [...prev, `Col${prev.length + 1}`])
    setAlignments((prev) => [...prev, 'left'])
    setRows((prev) => prev.map((r) => ({ ...r, cells: [...r.cells, ''] })))
  }

  const removeColumn = (ci: number) => {
    if (colCount <= 1) return
    setHeaders((prev) => prev.filter((_, i) => i !== ci))
    setAlignments((prev) => prev.filter((_, i) => i !== ci))
    setRows((prev) => prev.map((r) => ({ ...r, cells: r.cells.filter((_, i) => i !== ci) })))
  }

  const addRow = () =>
    setRows((prev) => [...prev, { id: nextId(), cells: Array(colCount).fill('') }])

  const removeRow = (id: string) => {
    if (rows.length <= 1) return
    setRows((prev) => prev.filter((r) => r.id !== id))
  }

  const importCsv = () => {
    const lines = csvInput.trim().split('\n').filter(Boolean)
    if (lines.length === 0) return
    const parseLine = (line: string) => line.split(',').map((c) => c.trim().replace(/^"|"$/g, ''))
    const [head, ...rest] = lines
    const newHeaders = parseLine(head)
    const newRows: Row[] = rest.map((l) => {
      const cells = parseLine(l)
      while (cells.length < newHeaders.length) cells.push('')
      return { id: nextId(), cells: cells.slice(0, newHeaders.length) }
    })
    if (newRows.length === 0) newRows.push({ id: nextId(), cells: Array(newHeaders.length).fill('') })
    setHeaders(newHeaders)
    setAlignments(Array(newHeaders.length).fill('left') as Alignment[])
    setRows(newRows)
    setCsvInput('')
    setShowCsv(false)
  }

  const markdown = buildMarkdown(headers, alignments, rows)

  const handleCopy = () => {
    navigator.clipboard.writeText(markdown).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
        {/* ── Left: Table editor ── */}
        <div className="flex flex-col gap-3">
          {/* Editor table */}
          <div className="overflow-x-auto rounded-lg border border-border bg-[#070d1a]">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-border">
                  {headers.map((h, ci) => (
                    <th key={ci} className="border-r border-border p-0 last:border-r-0">
                      {/* Alignment pills */}
                      <div className="flex items-center gap-0.5 bg-teal/5 px-2 pt-1.5 pb-1">
                        {ALIGN_OPTIONS.map(({ key, label, title }) => (
                          <button
                            key={key}
                            onClick={() => updateAlignment(ci, key)}
                            title={title}
                            className={`rounded px-1.5 py-0.5 font-mono text-[11px] transition-all ${
                              alignments[ci] === key
                                ? 'bg-teal/20 text-teal'
                                : 'text-muted/50 hover:text-dim'
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                        <button
                          onClick={() => removeColumn(ci)}
                          disabled={colCount <= 1}
                          title="列を削除"
                          className="ml-auto rounded px-1 py-0.5 text-[10px] text-muted/40 transition-colors hover:text-red-400 disabled:pointer-events-none disabled:opacity-0"
                        >
                          ×
                        </button>
                      </div>
                      {/* Header input */}
                      <input
                        value={h}
                        onChange={(e) => updateHeader(ci, e.target.value)}
                        className="w-full min-w-[90px] border-t border-border/40 bg-transparent px-3 py-2 font-mono text-xs font-bold text-bright outline-none focus:bg-teal/[0.04] placeholder:text-border/50"
                        placeholder="Header"
                      />
                    </th>
                  ))}
                  <th className="w-8 border-l border-border/40 bg-teal/5" />
                </tr>
              </thead>
              <tbody>
                {rows.map((row, ri) => (
                  <tr
                    key={row.id}
                    className={`border-b border-border/30 last:border-b-0 transition-colors hover:bg-teal/[0.03] ${ri % 2 === 1 ? 'bg-white/[0.015]' : ''}`}
                  >
                    {row.cells.map((cell, ci) => (
                      <td key={ci} className="border-r border-border/30 p-0 last:border-r-0">
                        <input
                          value={cell}
                          onChange={(e) => updateCell(row.id, ci, e.target.value)}
                          className="w-full min-w-[90px] bg-transparent px-3 py-2 font-mono text-xs text-primary outline-none focus:bg-teal/[0.04] placeholder:text-border/40"
                          placeholder="—"
                        />
                      </td>
                    ))}
                    <td className="border-l border-border/30 px-1.5 text-center">
                      <button
                        onClick={() => removeRow(row.id)}
                        disabled={rows.length <= 1}
                        className="rounded px-1 py-0.5 text-[10px] text-muted/40 transition-colors hover:text-red-400 disabled:pointer-events-none disabled:opacity-0"
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Action row */}
          <div className="flex items-center gap-2">
            <button
              onClick={addColumn}
              className="rounded border border-dashed border-border/60 px-3 py-1.5 text-xs text-muted/70 transition-all hover:border-teal/40 hover:text-teal"
            >
              + 列を追加
            </button>
            <button
              onClick={addRow}
              className="rounded border border-dashed border-border/60 px-3 py-1.5 text-xs text-muted/70 transition-all hover:border-teal/40 hover:text-teal"
            >
              + 行を追加
            </button>
            <button
              onClick={() => setShowCsv((v) => !v)}
              className={`ml-auto rounded border px-3 py-1.5 text-xs transition-all ${
                showCsv ? 'border-teal/30 text-teal' : 'border-border/60 text-muted/70 hover:border-teal/30 hover:text-teal'
              }`}
            >
              CSV 取込
            </button>
          </div>

          {/* CSV import panel */}
          {showCsv && (
            <div className="rounded-lg border border-border/60 bg-[#070d1a] p-4">
              <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-muted">
                CSV インポート — 1行目をヘッダーとして取り込み
              </p>
              <textarea
                value={csvInput}
                onChange={(e) => setCsvInput(e.target.value)}
                placeholder={'Name,Type,Description\nid,string,Unique identifier\nname,string,Display name'}
                rows={5}
                className="w-full resize-none rounded border border-border/50 bg-[#060a12] px-3 py-2 font-mono text-xs leading-relaxed text-bright outline-none focus:border-teal/60 placeholder:text-border/40"
              />
              <button
                onClick={importCsv}
                disabled={!csvInput.trim()}
                className="mt-2 rounded bg-teal/10 px-4 py-1.5 text-xs font-medium text-teal transition-colors hover:bg-teal/20 disabled:pointer-events-none disabled:opacity-30"
              >
                変換して取り込む
              </button>
            </div>
          )}
        </div>

        {/* ── Right: Output + Preview ── */}
        <div className="flex flex-col gap-4">
          {/* Markdown output */}
          <div className="flex flex-col gap-0 overflow-hidden rounded-lg border border-border">
            <div className="flex items-center justify-between bg-[#070d1a] px-4 py-2.5">
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted">Markdown</span>
              <button
                onClick={handleCopy}
                className={`rounded border px-3 py-1 text-xs font-medium transition-all ${
                  copied
                    ? 'border-teal/50 bg-teal/10 text-teal'
                    : 'border-border text-dim hover:border-teal/40 hover:text-teal'
                }`}
              >
                {copied ? '✓ Copied' : 'Copy'}
              </button>
            </div>
            <pre className="overflow-x-auto bg-[#060a12] px-5 py-4 font-mono text-xs leading-relaxed text-bright/90">
              {markdown}
            </pre>
          </div>

          {/* Rendered preview */}
          <div className="overflow-hidden rounded-lg border border-border">
            <div className="bg-[#070d1a] px-4 py-2">
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted">Preview</span>
            </div>
            <div className="overflow-x-auto bg-[#060a12] p-4">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr>
                    {headers.map((h, ci) => (
                      <th
                        key={ci}
                        className="border border-border/60 bg-teal/5 px-3 py-2 font-mono font-bold text-bright"
                        style={{ textAlign: alignments[ci] }}
                      >
                        {h || '—'}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, ri) => (
                    <tr key={row.id} className={ri % 2 === 1 ? 'bg-white/[0.02]' : ''}>
                      {row.cells.map((cell, ci) => (
                        <td
                          key={ci}
                          className="border border-border/30 px-3 py-1.5 text-primary/80"
                          style={{ textAlign: alignments[ci] }}
                        >
                          {cell || <span className="text-border/40">—</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
