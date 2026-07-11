'use client'
import { useState, useCallback } from 'react'

interface SizeNode {
  key: string
  path: string
  type: string
  bytes: number
  percent: number
  children: SizeNode[]
  collapsed: boolean
}

function jsonBytes(val: unknown): number {
  return new TextEncoder().encode(JSON.stringify(val)).length
}

function buildTree(val: unknown, key: string, path: string, total: number): SizeNode {
  const type = Array.isArray(val) ? 'array' : typeof val
  const bytes = jsonBytes(val)
  const children: SizeNode[] = []

  if (val !== null && typeof val === 'object') {
    const entries = Array.isArray(val)
      ? (val as unknown[]).map((v, i) => [String(i), v] as [string, unknown])
      : Object.entries(val as Record<string, unknown>)
    for (const [k, v] of entries) {
      children.push(buildTree(v, k, path ? `${path}.${k}` : k, total))
    }
    children.sort((a, b) => b.bytes - a.bytes)
  }

  return { key, path, type, bytes, percent: total > 0 ? (bytes / total) * 100 : 0, children, collapsed: true }
}

const TYPE_COLOR: Record<string, string> = {
  string: 'text-teal',
  number: 'text-blue-400',
  boolean: 'text-amber-400',
  object: 'text-violet-400',
  array: 'text-pink-400',
  null: 'text-muted',
}

function SizeBar({ percent }: { percent: number }) {
  return (
    <div className="h-1.5 w-16 shrink-0 rounded-full bg-border">
      <div className="h-full rounded-full bg-teal" style={{ width: `${Math.max(2, percent)}%` }} />
    </div>
  )
}

function TreeRow({
  node,
  depth,
  onToggle,
}: {
  node: SizeNode
  depth: number
  onToggle: (path: string) => void
}) {
  const hasChildren = node.children.length > 0
  return (
    <>
      <tr
        className="cursor-default hover:bg-surface/60 transition-colors"
        onClick={() => hasChildren && onToggle(node.path)}
      >
        <td className="py-1 pr-2">
          <div className="flex items-center gap-1" style={{ paddingLeft: `${depth * 16}px` }}>
            {hasChildren ? (
              <span className="text-muted text-xs w-3">{node.collapsed ? '▶' : '▼'}</span>
            ) : (
              <span className="w-3" />
            )}
            <span className="font-mono text-xs text-primary truncate max-w-[160px]" title={node.key}>
              {node.key}
            </span>
          </div>
        </td>
        <td className="py-1 pr-3 text-xs">
          <span className={TYPE_COLOR[node.type] ?? 'text-muted'}>{node.type}</span>
        </td>
        <td className="py-1 pr-3 text-right font-mono text-xs text-primary whitespace-nowrap">
          {node.bytes.toLocaleString()} B
        </td>
        <td className="py-1 pr-2 text-right font-mono text-xs text-muted whitespace-nowrap">
          {node.percent.toFixed(1)}%
        </td>
        <td className="py-1">
          <SizeBar percent={node.percent} />
        </td>
      </tr>
      {!node.collapsed && node.children.map((child) => (
        <TreeRow key={child.path} node={child} depth={depth + 1} onToggle={onToggle} />
      ))}
    </>
  )
}

const SAMPLE = JSON.stringify({
  user: { name: 'Alice', email: 'alice@example.com', bio: 'Developer from Tokyo who loves TypeScript and open-source.' },
  settings: { theme: 'dark', lang: 'ja', notifications: { email: true, push: false } },
  tags: ['developer', 'typescript', 'oss'],
  metadata: { createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-07-11T12:00:00Z' },
}, null, 2)

export function JsonSizeAnalyzer() {
  const [input, setInput] = useState(SAMPLE)
  const [root, setRoot] = useState<SizeNode | null>(null)
  const [error, setError] = useState('')
  const [nodes, setNodes] = useState<Map<string, SizeNode>>(new Map())

  const analyze = useCallback(() => {
    if (!input.trim()) { setError('JSONを入力してください'); return }
    try {
      const parsed = JSON.parse(input)
      const total = jsonBytes(parsed)
      const tree = buildTree(parsed, '(root)', '', total)
      setRoot(tree)
      setError('')
      // flatten map
      const map = new Map<string, SizeNode>()
      const flatten = (n: SizeNode) => { map.set(n.path, n); n.children.forEach(flatten) }
      flatten(tree)
      setNodes(map)
    } catch (e) {
      setError('JSONのパースに失敗しました: ' + (e as Error).message)
      setRoot(null)
    }
  }, [input])

  const toggle = useCallback((path: string) => {
    setNodes((prev) => {
      const next = new Map(prev)
      const n = next.get(path)
      if (n) next.set(path, { ...n, collapsed: !n.collapsed })
      return next
    })
    setRoot((prev) => {
      if (!prev) return prev
      const clone = (n: SizeNode): SizeNode => {
        const updated = nodes.get(n.path)
        return { ...(updated ?? n), collapsed: n.path === path ? !n.collapsed : n.collapsed, children: n.children.map(clone) }
      }
      return clone(prev)
    })
  }, [nodes])

  const totalBytes = root?.bytes ?? 0

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1.5 block font-mono text-xs text-muted">JSON 入力</label>
        <textarea
          value={input}
          onChange={(e) => { setInput(e.target.value); setRoot(null) }}
          rows={6}
          className="w-full rounded border border-border bg-canvas px-3 py-2 font-mono text-sm text-primary focus:border-teal focus:outline-none"
          placeholder='{"key": "value"}'
          spellCheck={false}
        />
        {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
      </div>

      <button
        onClick={analyze}
        className="rounded bg-teal/10 px-4 py-2 text-sm font-medium text-teal hover:bg-teal/20 transition-colors border border-teal/30"
      >
        解析
      </button>

      {root && (
        <>
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="rounded border border-border bg-surface px-4 py-2">
              <p className="text-xs text-muted">合計サイズ</p>
              <p className="font-mono font-bold text-primary">{totalBytes.toLocaleString()} B</p>
            </div>
            <div className="rounded border border-border bg-surface px-4 py-2">
              <p className="text-xs text-muted">トップレベルキー</p>
              <p className="font-mono font-bold text-primary">{root.children.length}</p>
            </div>
          </div>

          <div className="overflow-x-auto rounded border border-border">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-surface">
                  <th className="py-2 pl-3 pr-2 text-left font-mono text-xs text-muted">キー</th>
                  <th className="py-2 pr-3 text-left font-mono text-xs text-muted">型</th>
                  <th className="py-2 pr-3 text-right font-mono text-xs text-muted">サイズ</th>
                  <th className="py-2 pr-2 text-right font-mono text-xs text-muted">割合</th>
                  <th className="py-2 pr-2 font-mono text-xs text-muted" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <TreeRow node={root} depth={0} onToggle={toggle} />
              </tbody>
            </table>
          </div>

          <p className="text-xs text-muted">▶ をクリックして展開できます。各キーは子ノードを含む合計サイズ（UTF-8バイト）です。</p>
        </>
      )}
    </div>
  )
}
