'use client'

import { useState, useCallback } from 'react'

type Tab = 'json2csv' | 'csv2json'

const SAMPLE_JSON = JSON.stringify([
  { id: 1, name: 'Alice', email: 'alice@example.com', age: 30 },
  { id: 2, name: 'Bob', email: 'bob@example.com', age: 25 },
  { id: 3, name: 'Charlie', email: 'charlie@example.com', age: 35 },
], null, 2)

const SAMPLE_CSV = `id,name,email,age
1,Alice,alice@example.com,30
2,Bob,bob@example.com,25
3,Charlie,charlie@example.com,35`

function jsonToCsv(jsonText: string): { result: string; error: string | null } {
  let data: unknown
  try { data = JSON.parse(jsonText) } catch (e) {
    return { result: '', error: `JSON パースエラー: ${(e as Error).message}` }
  }
  if (!Array.isArray(data)) {
    return { result: '', error: 'JSON は配列（[ ... ]）である必要があります' }
  }
  if (data.length === 0) return { result: '', error: 'JSON 配列が空です' }
  const rows = data as Record<string, unknown>[]
  const keys = Array.from(new Set(rows.flatMap((r) => (typeof r === 'object' && r !== null ? Object.keys(r) : []))))
  const escape = (v: unknown) => {
    const s = v === null || v === undefined ? '' : String(v)
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s
  }
  const lines = [keys.join(','), ...rows.map((r) => keys.map((k) => escape((r as Record<string, unknown>)[k])).join(','))]
  return { result: lines.join('\n'), error: null }
}

function csvToJson(csvText: string): { result: string; error: string | null } {
  const lines = csvText.trim().split('\n')
  if (lines.length < 2) return { result: '', error: 'CSV は2行以上（ヘッダー + データ）が必要です' }

  function parseLine(line: string): string[] {
    const fields: string[] = []
    let current = ''
    let inQuote = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (inQuote) {
        if (ch === '"') {
          if (line[i + 1] === '"') { current += '"'; i++ }
          else inQuote = false
        } else {
          current += ch
        }
      } else {
        if (ch === '"') { inQuote = true }
        else if (ch === ',') { fields.push(current); current = '' }
        else current += ch
      }
    }
    fields.push(current)
    return fields
  }

  const headers = parseLine(lines[0])
  const rows = lines.slice(1).filter((l) => l.trim()).map((line) => {
    const vals = parseLine(line)
    const obj: Record<string, string> = {}
    headers.forEach((h, i) => { obj[h.trim()] = vals[i] ?? '' })
    return obj
  })
  return { result: JSON.stringify(rows, null, 2), error: null }
}

function parsePreviewRows(csvText: string): { headers: string[]; rows: string[][] } {
  const lines = csvText.trim().split('\n').slice(0, 21)
  if (lines.length < 1) return { headers: [], rows: [] }
  const headers = lines[0].split(',').map((h) => h.trim())
  const rows = lines.slice(1).map((l) => l.split(',').map((v) => v.trim()))
  return { headers, rows }
}

function jsonToPreviewRows(jsonText: string): { headers: string[]; rows: string[][] } {
  try {
    const data = JSON.parse(jsonText) as Record<string, unknown>[]
    if (!Array.isArray(data) || data.length === 0) return { headers: [], rows: [] }
    const keys = Array.from(new Set(data.flatMap((r) => (typeof r === 'object' && r !== null ? Object.keys(r) : []))))
    const rows = data.slice(0, 20).map((r) =>
      keys.map((k) => { const v = (r as Record<string, unknown>)[k]; return v === null || v === undefined ? '' : String(v) })
    )
    return { headers: keys, rows }
  } catch { return { headers: [], rows: [] } }
}

export function JsonCsvConverter() {
  const [tab, setTab] = useState<Tab>('json2csv')
  const [jsonInput, setJsonInput] = useState(SAMPLE_JSON)
  const [csvInput, setCsvInput] = useState(SAMPLE_CSV)
  const [copied, setCopied] = useState(false)

  const { result, error } = useCallback(() => {
    if (tab === 'json2csv') return jsonInput.trim() ? jsonToCsv(jsonInput) : { result: '', error: null }
    return csvInput.trim() ? csvToJson(csvInput) : { result: '', error: null }
  }, [tab, jsonInput, csvInput])()

  const previewRows = useCallback(() => {
    if (tab === 'json2csv' && result) return parsePreviewRows(result)
    if (tab === 'csv2json' && csvInput.trim()) return parsePreviewRows(csvInput)
    return { headers: [], rows: [] }
  }, [tab, result, csvInput])()

  const handleCopy = async () => {
    if (!result) return
    await navigator.clipboard.writeText(result)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const inputValue = tab === 'json2csv' ? jsonInput : csvInput
  const setInputValue = tab === 'json2csv' ? setJsonInput : setCsvInput
  const inputLabel = tab === 'json2csv' ? 'JSON 入力' : 'CSV 入力'
  const outputLabel = tab === 'json2csv' ? 'CSV 出力' : 'JSON 出力'
  const inputPlaceholder = tab === 'json2csv' ? '[{"key": "value"}, ...]' : 'id,name\n1,Alice'

  return (
    <div className="flex flex-col gap-5">
      {/* Tab switcher */}
      <div className="flex items-center gap-3">
        <div className="flex rounded-lg border border-border p-0.5 bg-[#0a0a10]">
          {([['json2csv', 'JSON → CSV'], ['csv2json', 'CSV → JSON']] as [Tab, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => { setTab(key); setCopied(false) }}
              className={`rounded-md px-4 py-1.5 text-xs font-mono font-medium transition-all ${tab === key
                ? 'bg-teal/15 text-teal shadow-[0_0_8px_rgba(0,200,150,0.15)]'
                : 'text-muted hover:text-dim'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Editor area — IDE-style panes */}
      <div className="grid gap-3 lg:grid-cols-2">
        {/* Input pane */}
        <div className="flex flex-col overflow-hidden rounded-xl border border-border">
          <div className="flex items-center justify-between border-b border-border bg-[#0f0f18] px-3 py-2">
            <span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-muted">{inputLabel}</span>
            <span className="rounded bg-surface px-2 py-0.5 font-mono text-[9px] text-muted/60 uppercase tracking-wider">
              {tab === 'json2csv' ? '.json' : '.csv'}
            </span>
          </div>
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={inputPlaceholder}
            rows={14}
            spellCheck={false}
            className="w-full bg-[#060a12] px-4 py-3 font-mono text-xs text-bright outline-none resize-none placeholder:text-muted/30 leading-[1.6] transition-all focus:bg-[#07090f]"
          />
        </div>

        {/* Output pane */}
        <div className="flex flex-col overflow-hidden rounded-xl border border-border">
          <div className="flex items-center justify-between border-b border-border bg-[#0f0f18] px-3 py-2">
            <span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-muted">{outputLabel}</span>
            <button
              onClick={handleCopy}
              disabled={!result}
              className={`rounded px-2.5 py-0.5 font-mono text-[10px] transition-all disabled:opacity-30 ${copied
                ? 'bg-teal/15 text-teal'
                : 'text-muted hover:text-teal hover:bg-teal/10'}`}
            >
              {copied ? '✓ Copied' : 'コピー'}
            </button>
          </div>
          {error ? (
            <div className="flex-1 min-h-[14rem] bg-[#0e0608] p-4 border-l-2 border-red-500/50">
              <p className="font-mono text-xs text-red-400 leading-relaxed">{error}</p>
            </div>
          ) : (
            <textarea
              value={result}
              readOnly
              rows={14}
              spellCheck={false}
              placeholder="変換結果がここに表示されます"
              className="w-full bg-[#060a12] px-4 py-3 font-mono text-xs leading-[1.6] outline-none resize-none placeholder:text-muted/30 text-bright"
            />
          )}
        </div>
      </div>

      {/* Preview table */}
      {previewRows.headers.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-widest text-muted">プレビュー</p>
            <span className="font-mono text-[10px] text-muted/50">（最大20行）</span>
          </div>
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-[#0f0f18]">
                  {previewRows.headers.map((h, i) => (
                    <th key={i} className="border-b border-border px-4 py-2 font-mono text-[10px] font-semibold uppercase tracking-wider text-muted whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewRows.rows.map((row, ri) => (
                  <tr key={ri} className={`border-b border-border/30 last:border-0 transition-colors hover:bg-surface/40 ${ri % 2 === 1 ? 'bg-[#08080f]' : ''}`}>
                    {row.map((cell, ci) => (
                      <td key={ci} className="px-4 py-2 font-mono text-xs text-primary max-w-[200px] truncate">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
