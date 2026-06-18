'use client'

import { useState, useCallback, useRef } from 'react'

type Op = { type: 'eq' | 'del' | 'add'; left?: number; right?: number }
type Mode = 'edit' | 'unified' | 'split'

function diffLines(a: string[], b: string[]): Op[] {
  const m = a.length, n = b.length
  if (m === 0 && n === 0) return []
  const dp: Int32Array[] = Array.from({ length: m + 1 }, () => new Int32Array(n + 1))
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1])
    }
  }
  const ops: Op[] = []
  let i = 0, j = 0
  while (i < m && j < n) {
    if (a[i] === b[j]) { ops.push({ type: 'eq', left: i, right: j }); i++; j++ }
    else if (dp[i + 1][j] >= dp[i][j + 1]) { ops.push({ type: 'del', left: i }); i++ }
    else { ops.push({ type: 'add', right: j }); j++ }
  }
  while (i < m) { ops.push({ type: 'del', left: i }); i++ }
  while (j < n) { ops.push({ type: 'add', right: j }); j++ }
  return ops
}

function charDiffHtml(a: string, b: string): { left: string; right: string } {
  const ops = diffLines(a.split(''), b.split(''))
  let left = '', right = ''
  for (const op of ops) {
    if (op.type === 'eq') { const c = esc(a[op.left!]); left += c; right += c }
    else if (op.type === 'del') left += `<mark class="char-del">${esc(a[op.left!])}</mark>`
    else right += `<mark class="char-add">${esc(b[op.right!])}</mark>`
  }
  return { left, right }
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

const CONTEXT = 3

function computeStats(ops: Op[]) {
  let adds = 0, dels = 0, eqs = 0
  for (const op of ops) {
    if (op.type === 'add') adds++
    else if (op.type === 'del') dels++
    else eqs++
  }
  return { adds, dels, eqs }
}

function ModeBtn({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 font-mono text-[10px] transition-colors ${
        active ? 'bg-teal text-bg font-bold' : 'text-muted hover:text-primary'
      }`}
    >
      {label}
    </button>
  )
}

export function DiffViewer() {
  const [leftText, setLeftText]   = useState('')
  const [rightText, setRightText] = useState('')
  const [mode, setMode] = useState<Mode>('edit')

  const la = leftText  === '' ? [] : leftText.split('\n')
  const ra = rightText === '' ? [] : rightText.split('\n')
  const ops = diffLines(la, ra)
  const { adds, dels, eqs } = computeStats(ops)

  const handleClear = () => { setLeftText(''); setRightText(''); setMode('edit') }

  // Unified rendering
  const unifiedLines = (() => {
    const visible = new Set<number>()
    for (let i = 0; i < ops.length; i++) {
      if (ops[i].type !== 'eq') {
        for (let j = Math.max(0, i - CONTEXT); j <= Math.min(ops.length - 1, i + CONTEXT); j++) visible.add(j)
      }
    }
    const lines: JSX.Element[] = []
    let leftN = 1, rightN = 1, lastVis = true
    for (let i = 0; i < ops.length; i++) {
      const op = ops[i]
      if (!visible.has(i)) {
        if (lastVis) lines.push(
          <div key={`hunk-${i}`} className="flex items-baseline border-l-2 border-border bg-surface-hi px-3 py-0.5 font-mono text-[10px] text-muted">
            <span className="w-8 shrink-0 text-right pr-2"></span>
            <span>@@ ...</span>
          </div>
        )
        lastVis = false
        if (op.type === 'eq') { leftN++; rightN++ }
        else if (op.type === 'del') leftN++
        else rightN++
        continue
      }
      lastVis = true
      if (op.type === 'eq') {
        lines.push(
          <div key={i} className="flex items-baseline border-l-2 border-transparent px-3 py-px font-mono text-[11px] leading-5">
            <span className="w-8 shrink-0 pr-2 text-right text-muted/50 select-none">{leftN}</span>
            <span className="w-4 shrink-0 text-muted select-none"> </span>
            <span className="text-primary whitespace-pre-wrap break-all">{la[op.left!]}</span>
          </div>
        )
        leftN++; rightN++
      } else if (op.type === 'del') {
        lines.push(
          <div key={i} className="flex items-baseline border-l-2 border-red-500/40 bg-red-500/10 px-3 py-px font-mono text-[11px] leading-5">
            <span className="w-8 shrink-0 pr-2 text-right text-muted/50 select-none">{leftN}</span>
            <span className="w-4 shrink-0 text-red-400 select-none font-bold">-</span>
            <span className="text-red-200 whitespace-pre-wrap break-all">{la[op.left!]}</span>
          </div>
        )
        leftN++
      } else {
        lines.push(
          <div key={i} className="flex items-baseline border-l-2 border-teal/40 bg-teal/10 px-3 py-px font-mono text-[11px] leading-5">
            <span className="w-8 shrink-0 pr-2 text-right text-muted/50 select-none">{rightN}</span>
            <span className="w-4 shrink-0 text-teal select-none font-bold">+</span>
            <span className="text-green-200 whitespace-pre-wrap break-all">{ra[op.right!]}</span>
          </div>
        )
        rightN++
      }
    }
    return lines
  })()

  // Split rendering
  const splitRows = (() => {
    const paired: Array<{ type: 'eq' | 'del' | 'add' | 'change'; left?: number; right?: number }> = []
    for (let i = 0; i < ops.length; i++) {
      if (ops[i].type === 'del' && i + 1 < ops.length && ops[i + 1].type === 'add') {
        paired.push({ type: 'change', left: ops[i].left, right: ops[i + 1].right })
        i++
      } else {
        paired.push(ops[i] as typeof paired[0])
      }
    }
    return paired.map((op, i) => {
      if (op.type === 'eq') {
        const content = la[op.left!] ?? ''
        return { key: i, leftCls: 'border-transparent', rightCls: 'border-transparent', leftHtml: esc(content), rightHtml: esc(content), isEq: true }
      }
      if (op.type === 'change') {
        const { left, right } = charDiffHtml(la[op.left!] ?? '', ra[op.right!] ?? '')
        return { key: i, leftCls: 'border-red-500/40 bg-red-500/10', rightCls: 'border-teal/40 bg-teal/10', leftHtml: left, rightHtml: right, isEq: false }
      }
      if (op.type === 'del') {
        return { key: i, leftCls: 'border-red-500/40 bg-red-500/10', rightCls: 'border-transparent opacity-30', leftHtml: esc(la[op.left!] ?? ''), rightHtml: '&nbsp;', isEq: false }
      }
      return { key: i, leftCls: 'border-transparent opacity-30', rightCls: 'border-teal/40 bg-teal/10', leftHtml: '&nbsp;', rightHtml: esc(ra[op.right!] ?? ''), isEq: false }
    })
  })()

  const isEmpty = leftText === '' && rightText === ''

  return (
    <div className="flex flex-col gap-3">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="font-mono text-[11px] flex gap-3">
          {isEmpty ? (
            <span className="text-muted">—</span>
          ) : (
            <>
              <span className="text-teal">+{adds}</span>
              <span className="text-red-400">-{dels}</span>
              <span className="text-muted">{eqs} unchanged</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex overflow-hidden rounded border border-border">
            <ModeBtn active={mode === 'edit'}    label="Edit"    onClick={() => setMode('edit')} />
            <ModeBtn active={mode === 'unified'} label="Unified" onClick={() => setMode('unified')} />
            <ModeBtn active={mode === 'split'}   label="Split"   onClick={() => setMode('split')} />
          </div>
          <button
            onClick={handleClear}
            className="rounded border border-border px-3 py-1 font-mono text-[10px] text-muted hover:border-red-500/50 hover:text-red-400 transition-colors"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Edit mode */}
      {mode === 'edit' && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {([['Before', leftText, setLeftText, 'text-red-400'], ['After', rightText, setRightText, 'text-teal']] as const).map(
            ([label, val, setter, color]) => (
              <div key={label} className="flex flex-col overflow-hidden rounded-lg border border-border">
                <div className="border-b border-border bg-surface-hi px-3 py-1.5">
                  <span className={`font-mono text-[10px] uppercase tracking-wider ${color}`}>{label}</span>
                </div>
                <textarea
                  value={val}
                  onChange={e => setter(e.target.value)}
                  placeholder={label === 'Before' ? '比較元のテキストを貼り付け...' : '比較先のテキストを貼り付け...'}
                  spellCheck={false}
                  className="h-48 resize-none bg-transparent p-3 font-mono text-[11px] leading-relaxed text-primary outline-none placeholder:text-muted/30"
                />
              </div>
            )
          )}
        </div>
      )}

      {/* Unified mode */}
      {mode === 'unified' && (
        <div className="overflow-hidden rounded-lg border border-border">
          {isEmpty || ops.length === 0 ? (
            <p className="p-8 text-center font-mono text-[10px] text-muted">テキストを入力してください</p>
          ) : (
            <div className="overflow-auto max-h-[480px]">
              {unifiedLines}
            </div>
          )}
        </div>
      )}

      {/* Split mode */}
      {mode === 'split' && (
        <div className="overflow-hidden rounded-lg border border-border">
          {isEmpty || ops.length === 0 ? (
            <p className="p-8 text-center font-mono text-[10px] text-muted">テキストを入力してください</p>
          ) : (
            <div className="grid grid-cols-2 max-h-[480px] overflow-auto">
              <div className="border-r border-border">
                <div className="sticky top-0 z-10 border-b border-border bg-surface-hi px-3 py-1.5">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-red-400">Before</span>
                </div>
                {splitRows.map(row => (
                  <div
                    key={`l-${row.key}`}
                    className={`border-l-2 px-3 py-px font-mono text-[11px] leading-5 ${row.leftCls}`}
                    dangerouslySetInnerHTML={{ __html: row.leftHtml }}
                  />
                ))}
              </div>
              <div>
                <div className="sticky top-0 z-10 border-b border-border bg-surface-hi px-3 py-1.5">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-teal">After</span>
                </div>
                {splitRows.map(row => (
                  <div
                    key={`r-${row.key}`}
                    className={`border-l-2 px-3 py-px font-mono text-[11px] leading-5 ${row.rightCls}`}
                    dangerouslySetInnerHTML={{ __html: row.rightHtml }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <style>{`
        mark.char-add { background: rgba(57,211,83,0.25); border-radius: 2px; color: inherit; }
        mark.char-del { background: rgba(248,81,73,0.25); border-radius: 2px; color: inherit; text-decoration: line-through; }
      `}</style>
    </div>
  )
}
