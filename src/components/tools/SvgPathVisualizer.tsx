'use client'
import { useState, useRef, useEffect, useCallback } from 'react'

type CmdType = 'M' | 'L' | 'C' | 'Q' | 'A' | 'Z' | 'H' | 'V' | 'S' | 'T'

interface PathCmd {
  raw: string
  type: CmdType
  abs: CmdType
  params: number[]
  color: string
  index: number
}

const CMD_COLORS: Record<string, string> = {
  M: '#38bdf8', L: '#34d399', C: '#f472b6', Q: '#a78bfa',
  A: '#fb923c', Z: '#94a3b8', H: '#34d399', V: '#34d399',
  S: '#f472b6', T: '#a78bfa',
}
const CMD_LABELS: Record<string, string> = {
  M: 'moveto', L: 'lineto', C: 'cubic bezier', Q: 'quadratic bezier',
  A: 'arc', Z: 'closepath', H: 'horizontal line', V: 'vertical line',
  S: 'smooth cubic', T: 'smooth quadratic',
}

function parsePath(d: string): PathCmd[] {
  if (!d.trim()) return []
  const cmds: PathCmd[] = []
  const re = /([MmLlCcQqAaZzHhVvSsTt])([^MmLlCcQqAaZzHhVvSsTt]*)/g
  let match: RegExpExecArray | null
  let idx = 0
  while ((match = re.exec(d)) !== null) {
    const type = match[1] as CmdType
    const abs = type.toUpperCase() as CmdType
    const raw = match[0].trim()
    const paramStr = match[2].trim()
    const params = paramStr ? paramStr.split(/[\s,]+/).filter(Boolean).map(Number) : []
    cmds.push({ raw, type, abs, params, color: CMD_COLORS[abs] || '#94a3b8', index: idx++ })
  }
  return cmds
}

function buildPreviewPath(cmds: PathCmd[], upTo: number): string {
  return cmds
    .slice(0, upTo + 1)
    .map((c) => c.raw)
    .join(' ')
}

const SAMPLE = 'M 10 80 C 40 10, 65 10, 95 80 S 150 150, 180 80'

export function SvgPathVisualizer() {
  const [input, setInput] = useState(SAMPLE)
  const [activeIdx, setActiveIdx] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [cmds, setCmds] = useState<PathCmd[]>([])
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    try {
      const parsed = parsePath(input)
      setCmds(parsed)
      setError('')
    } catch {
      setError('パースエラー')
    }
  }, [input])

  const previewPath = activeIdx !== null ? buildPreviewPath(cmds, activeIdx) : input

  const viewBox = '0 0 200 160'

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1.5 block font-mono text-xs text-muted">SVG path d 属性</label>
        <textarea
          value={input}
          onChange={(e) => { setInput(e.target.value); setActiveIdx(null) }}
          rows={3}
          className="w-full rounded border border-border bg-canvas px-3 py-2 font-mono text-sm text-primary focus:border-teal focus:outline-none"
          placeholder="M 10 10 L 90 90 C ..."
          spellCheck={false}
        />
        {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* SVG Preview */}
        <div className="rounded border border-border bg-canvas p-3">
          <p className="mb-2 font-mono text-xs text-muted">プレビュー</p>
          <svg ref={svgRef} viewBox={viewBox} className="h-48 w-full" style={{ background: 'var(--color-surface)' }}>
            {/* grid */}
            <defs>
              <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="var(--color-border)" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="200" height="160" fill="url(#grid)" />
            {/* full path dim */}
            {cmds.length > 0 && (
              <path d={input} fill="none" stroke="var(--color-border)" strokeWidth="1.5" />
            )}
            {/* active step path */}
            {cmds.length > 0 && previewPath && (
              <path
                d={previewPath}
                fill="none"
                stroke={activeIdx !== null ? (cmds[activeIdx]?.color ?? '#38bdf8') : '#38bdf8'}
                strokeWidth="2"
                strokeLinecap="round"
              />
            )}
          </svg>
        </div>

        {/* Command list */}
        <div className="rounded border border-border bg-canvas p-3">
          <p className="mb-2 font-mono text-xs text-muted">コマンド一覧 — クリックでステップ確認</p>
          <div className="max-h-48 overflow-y-auto space-y-1">
            {cmds.length === 0 && (
              <p className="text-xs text-muted">パスを入力してください</p>
            )}
            {cmds.map((cmd) => (
              <button
                key={cmd.index}
                onClick={() => setActiveIdx(activeIdx === cmd.index ? null : cmd.index)}
                className={`flex w-full items-start gap-2 rounded px-2 py-1.5 text-left transition-colors ${
                  activeIdx === cmd.index ? 'bg-surface ring-1 ring-inset' : 'hover:bg-surface/60'
                }`}
              >
                <span
                  className="mt-0.5 shrink-0 rounded px-1 font-mono text-xs font-bold"
                  style={{ background: cmd.color + '33', color: cmd.color }}
                >
                  {cmd.abs}
                </span>
                <span className="flex-1 font-mono text-xs text-primary break-all">{cmd.raw}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Detail panel */}
      {activeIdx !== null && cmds[activeIdx] && (
        <div className="rounded border border-border bg-surface p-4">
          <div className="mb-2 flex items-center gap-2">
            <span
              className="rounded px-2 py-0.5 font-mono text-sm font-bold"
              style={{ background: cmds[activeIdx].color + '33', color: cmds[activeIdx].color }}
            >
              {cmds[activeIdx].type}
            </span>
            <span className="text-sm text-muted">{CMD_LABELS[cmds[activeIdx].abs] ?? ''}</span>
            <span className="ml-auto text-xs text-muted">{cmds[activeIdx].type !== cmds[activeIdx].abs ? '(相対座標)' : '(絶対座標)'}</span>
          </div>
          {cmds[activeIdx].params.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {cmds[activeIdx].params.map((p, i) => (
                <span key={i} className="rounded border border-border bg-canvas px-2 py-0.5 font-mono text-xs text-primary">
                  {p}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted">パラメータなし</p>
          )}
          <p className="mt-2 font-mono text-xs text-dim break-all">{cmds[activeIdx].raw}</p>
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={() => { setInput(SAMPLE); setActiveIdx(null) }}
          className="rounded border border-border px-3 py-1.5 text-xs text-dim hover:text-primary transition-colors"
        >
          サンプル
        </button>
        <button
          onClick={() => { setInput(''); setActiveIdx(null) }}
          className="rounded border border-border px-3 py-1.5 text-xs text-dim hover:text-primary transition-colors"
        >
          クリア
        </button>
        {input && (
          <button
            onClick={() => navigator.clipboard.writeText(input)}
            className="rounded border border-border px-3 py-1.5 text-xs text-dim hover:text-primary transition-colors"
          >
            パスをコピー
          </button>
        )}
      </div>
    </div>
  )
}
