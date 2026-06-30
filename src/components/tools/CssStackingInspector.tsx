'use client'

import { useState, useCallback, useEffect } from 'react'

// ── Types ──────────────────────────────────────────────────────────────────────

interface ParsedRule {
  selector: string
  props: Record<string, string>
  zIndex: string
  position: string
  createsContext: boolean
  contextReasons: string[]
  depth: number
  parentSelector: string | null
}

interface TreeNode extends ParsedRule {
  children: TreeNode[]
  hasConflict: boolean
}

// ── Sample CSS ─────────────────────────────────────────────────────────────────

const SAMPLE_CSS = `/* グローバルレイアウト */
.header {
  position: fixed;
  z-index: 100;
  top: 0;
  width: 100%;
}

.header .nav-dropdown {
  position: absolute;
  z-index: 200;
}

/* モーダル */
.modal-overlay {
  position: fixed;
  z-index: 100;
  opacity: 0.8;
}

.modal-overlay .modal {
  position: relative;
  z-index: 10;
}

.modal-overlay .modal .close-btn {
  position: absolute;
  z-index: 10;
}

/* ツールチップ */
.tooltip {
  position: fixed;
  z-index: 9999;
  transform: translateY(-4px);
}

/* アニメーション要素 */
.animated-card {
  transform: scale(1);
  will-change: transform;
}

/* フィルター効果 */
.blur-bg {
  filter: blur(4px);
  z-index: 5;
}

/* 通常フロー */
.content {
  position: relative;
}

.sidebar {
  position: sticky;
  top: 0;
  z-index: 10;
}`

// ── Parser ────────────────────────────────────────────────────────────────────

function extractProps(decl: string): Record<string, string> {
  const props: Record<string, string> = {}
  for (const line of decl.split(';')) {
    const idx = line.indexOf(':')
    if (idx < 0) continue
    const key = line.slice(0, idx).trim().toLowerCase()
    const val = line.slice(idx + 1).trim().toLowerCase()
    if (key) props[key] = val
  }
  return props
}

function detectReasons(props: Record<string, string>): string[] {
  const reasons: string[] = []
  const pos = props['position'] ?? ''
  const zIndex = props['z-index'] ?? ''
  const opacity = props['opacity'] ?? ''
  const transform = props['transform'] ?? ''
  const filter = props['filter'] ?? ''
  const willChange = props['will-change'] ?? ''
  const isolation = props['isolation'] ?? ''
  const mixBlend = props['mix-blend-mode'] ?? ''

  if (['relative', 'absolute', 'fixed', 'sticky'].includes(pos) && zIndex !== '' && zIndex !== 'auto') {
    reasons.push(`position: ${pos} + z-index: ${zIndex}`)
  }
  if (opacity !== '' && opacity !== '1') {
    const n = parseFloat(opacity)
    if (!isNaN(n) && n < 1) reasons.push(`opacity: ${opacity}`)
  }
  if (transform !== '' && transform !== 'none') reasons.push(`transform`)
  if (filter !== '' && filter !== 'none') reasons.push(`filter`)
  if (willChange && /transform|opacity|z-index/.test(willChange)) reasons.push(`will-change: ${willChange}`)
  if (isolation === 'isolate') reasons.push('isolation: isolate')
  if (mixBlend && mixBlend !== 'normal') reasons.push(`mix-blend-mode: ${mixBlend}`)

  return reasons
}

function parseCSS(css: string): ParsedRule[] {
  const cleaned = css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/@[^{]+\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g, '')
  const rules: ParsedRule[] = []
  const regex = /([^{}@]+)\{([^{}]*)\}/g
  let m: RegExpExecArray | null

  while ((m = regex.exec(cleaned)) !== null) {
    const selList = m[1].trim()
    const decl = m[2]
    for (const rawSel of selList.split(',')) {
      const selector = rawSel.trim().replace(/\s+/g, ' ')
      if (!selector || selector.includes(':root') === false && selector.startsWith(':')) continue
      const props = extractProps(decl)
      const reasons = detectReasons(props)
      const parts = selector.split(/\s+/)
      const depth = parts.length - 1
      const parentSelector = depth > 0 ? parts.slice(0, -1).join(' ') : null
      rules.push({
        selector,
        props,
        zIndex: props['z-index'] ?? 'auto',
        position: props['position'] ?? '',
        createsContext: reasons.length > 0,
        contextReasons: reasons,
        depth,
        parentSelector,
      })
    }
  }
  return rules
}

function buildTree(rules: ParsedRule[]): TreeNode[] {
  const map = new Map<string, TreeNode>()
  for (const r of rules) {
    if (!map.has(r.selector)) {
      map.set(r.selector, { ...r, children: [], hasConflict: false })
    }
  }

  const roots: TreeNode[] = []
  for (const r of rules) {
    const node = map.get(r.selector)!
    let parent: TreeNode | null = null
    const parts = r.selector.split(/\s+/)
    for (let d = parts.length - 1; d >= 1; d--) {
      const candidate = parts.slice(0, d).join(' ')
      if (map.has(candidate)) { parent = map.get(candidate)!; break }
    }
    if (parent && parent !== node) {
      if (!parent.children.find(c => c.selector === node.selector)) parent.children.push(node)
    } else {
      if (!roots.find(n => n.selector === node.selector)) roots.push(node)
    }
  }

  function detectConflicts(siblings: TreeNode[]) {
    const groups = new Map<string, TreeNode[]>()
    for (const n of siblings) {
      if (n.zIndex !== 'auto' && n.zIndex !== '') {
        const k = n.zIndex
        if (!groups.has(k)) groups.set(k, [])
        groups.get(k)!.push(n)
      }
      detectConflicts(n.children)
    }
    for (const [, group] of groups) {
      if (group.length > 1) group.forEach(n => { n.hasConflict = true })
    }
  }
  detectConflicts(roots)
  return roots
}

function treeToText(nodes: TreeNode[], indent = 0): string {
  return nodes.map(n => {
    const pad = '  '.repeat(indent) + (indent > 0 ? '└─ ' : '')
    const conflict = n.hasConflict ? ' ⚠ 競合' : ''
    const ctx = n.createsContext ? ` [SC: ${n.contextReasons.join(' / ')}]` : ''
    return [
      `${pad}${n.selector} | z-index: ${n.zIndex}${ctx}${conflict}`,
      ...n.children.length > 0 ? [treeToText(n.children, indent + 1)] : [],
    ].join('\n')
  }).join('\n')
}

// ── Sub-components ────────────────────────────────────────────────────────────

function NodeRow({ node, depth, isLast }: { node: TreeNode; depth: number; isLast: boolean }) {
  const accentClass = node.hasConflict
    ? 'border-l-2 border-amber-500/70'
    : node.createsContext
    ? 'border-l-2 border-teal-500/50'
    : 'border-l-2 border-transparent'

  return (
    <>
      <div
        className={`group flex min-h-[2.25rem] items-center gap-2 border-b border-border py-1.5 text-sm transition-colors hover:bg-white/[0.025] ${accentClass}`}
        style={{ paddingLeft: `${depth * 20 + 10}px` }}
      >
        {depth > 0 && (
          <span className="shrink-0 select-none font-mono text-xs text-border/60">
            {isLast ? '└─' : '├─'}
          </span>
        )}

        <span className={`font-mono text-xs shrink-0 ${
          node.hasConflict ? 'text-amber-200' : node.createsContext ? 'text-teal-200' : 'text-primary'
        }`}>
          {node.selector}
        </span>

        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          {node.zIndex !== 'auto' && node.zIndex !== '' && (
            <span className="rounded bg-sky-950/70 px-1.5 py-0.5 font-mono text-[11px] text-sky-300 ring-1 ring-sky-800/50">
              {node.zIndex}
            </span>
          )}
          {node.createsContext && (
            <span className="rounded bg-teal-950/70 px-1.5 py-0.5 font-mono text-[11px] text-teal-300 ring-1 ring-teal-800/50">
              SC
            </span>
          )}
          {node.hasConflict && (
            <span className="flex items-center gap-1 rounded bg-amber-950/70 px-1.5 py-0.5 text-[11px] text-amber-300 ring-1 ring-amber-800/50">
              ⚠ 競合
            </span>
          )}
        </div>
      </div>

      {node.createsContext && (
        <div
          className="border-b border-border bg-teal-950/10 py-1 text-[11px]"
          style={{ paddingLeft: `${depth * 20 + (depth > 0 ? 42 : 22)}px` }}
        >
          {node.contextReasons.map((r, i) => (
            <span key={r}>
              {i > 0 && <span className="mx-1.5 text-border/40">·</span>}
              <span className="text-teal-400/80">{r}</span>
            </span>
          ))}
        </div>
      )}

      {node.children.map((child, i) => (
        <NodeRow key={child.selector} node={child} depth={depth + 1} isLast={i === node.children.length - 1} />
      ))}
    </>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export function CssStackingInspector() {
  const [css, setCss] = useState(SAMPLE_CSS)
  const [tree, setTree] = useState<TreeNode[]>([])
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [analyzed, setAnalyzed] = useState(false)

  const analyze = useCallback((input: string) => {
    if (!input.trim()) {
      setError('CSSコードを入力してください')
      setTree([])
      setAnalyzed(false)
      return
    }
    setError('')
    const rules = parseCSS(input)
    setTree(buildTree(rules))
    setAnalyzed(true)
  }, [])

  useEffect(() => { analyze(SAMPLE_CSS) }, [analyze])

  const loadSample = () => {
    setCss(SAMPLE_CSS)
    analyze(SAMPLE_CSS)
  }

  const handleAnalyze = () => analyze(css)

  const copyResults = async () => {
    if (!analyzed) return
    const text = ['CSS Stacking Inspector — 解析結果', '', treeToText(tree)].join('\n')
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const totalElements = countAll(tree)

  const totalConflicts = (() => {
    let n = 0
    const count = (nodes: TreeNode[]) => nodes.forEach(node => { if (node.hasConflict) n++; count(node.children) })
    count(tree)
    return n
  })()

  const totalContexts = (() => {
    let n = 0
    const count = (nodes: TreeNode[]) => nodes.forEach(node => { if (node.createsContext) n++; count(node.children) })
    count(tree)
    return n
  })()

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={loadSample}
          className="rounded border border-border px-3 py-1.5 text-sm text-dim transition-colors hover:border-primary/60 hover:text-primary"
        >
          サンプルを読み込む
        </button>
        <button
          onClick={handleAnalyze}
          className="rounded bg-teal-700 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-teal-600 active:bg-teal-800"
        >
          解析する
        </button>
        {analyzed && tree.length > 0 && (
          <button
            onClick={copyResults}
            className={`rounded border px-3 py-1.5 text-sm transition-all ${
              copied
                ? 'border-teal-600 bg-teal-950/50 text-teal-300'
                : 'border-border text-dim hover:border-primary/60 hover:text-primary'
            }`}
          >
            {copied ? '✓ コピーしました' : '結果をコピー'}
          </button>
        )}
        <span className="ml-auto text-xs text-muted/60">Ctrl+Enter で解析</span>
      </div>

      {/* Input */}
      <div className="relative">
        <textarea
          value={css}
          onChange={e => setCss(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) handleAnalyze() }}
          placeholder="CSSコードをここに貼り付けてください..."
          className="h-52 w-full resize-y rounded border border-border bg-[#0d1117] p-3 font-mono text-xs text-[#c9d1d9] outline-none transition-colors focus:border-teal-700/60 focus:ring-1 focus:ring-teal-700/30"
          spellCheck={false}
        />
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 rounded border border-red-800/60 bg-red-950/30 px-4 py-3 text-sm text-red-400">
          <span aria-hidden="true">⚠</span>
          {error}
        </div>
      )}

      {/* Results */}
      {analyzed && tree.length > 0 && (
        <div className="space-y-3">
          {/* Stats bar */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="flex items-center gap-1.5 rounded-full bg-surface px-3 py-1 text-dim">
              <span className="h-1.5 w-1.5 rounded-full bg-primary/40"></span>
              検出要素 <span className="font-mono text-bright">{totalElements}</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-full bg-teal-950/60 px-3 py-1 text-teal-300 ring-1 ring-teal-800/40">
              <span className="h-1.5 w-1.5 rounded-full bg-teal-400"></span>
              SC <span className="font-mono">{totalContexts}</span>
            </div>
            {totalConflicts > 0 && (
              <div className="flex items-center gap-1.5 rounded-full bg-amber-950/60 px-3 py-1 text-amber-300 ring-1 ring-amber-800/40">
                <span>⚠</span>
                競合 <span className="font-mono">{totalConflicts}</span>
              </div>
            )}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-4 text-xs text-muted/70">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-0.5 rounded-full bg-teal-500/60"></span>
              <span className="rounded bg-teal-950/60 px-1 py-0.5 font-mono text-teal-300 text-[10px]">SC</span>
              スタッキングコンテキスト生成
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-0.5 rounded-full bg-amber-500/70"></span>
              <span className="rounded bg-amber-950/60 px-1 py-0.5 text-amber-300 text-[10px]">⚠ 競合</span>
              同一コンテキスト内 z-index 重複
            </span>
            <span className="flex items-center gap-1.5">
              <span className="rounded bg-sky-950/60 px-1 py-0.5 font-mono text-sky-300 text-[10px]">N</span>
              z-index 値
            </span>
          </div>

          {/* Tree table */}
          <div className="overflow-x-auto rounded-lg border border-border">
            <div className="min-w-[480px]">
              {/* Table header */}
              <div className="flex items-center justify-between border-b border-border bg-surface/80 px-3 py-2 text-[10px] font-mono uppercase tracking-widest text-muted">
                <span>セレクター</span>
                <span>z-index · SC · 競合</span>
              </div>
              {/* Tree rows */}
              <div className="divide-y-0">
                {tree.map((node, i) => (
                  <NodeRow key={node.selector} node={node} depth={0} isLast={i === tree.length - 1} />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function countAll(nodes: TreeNode[]): number {
  let n = nodes.length
  for (const node of nodes) n += countAll(node.children)
  return n
}
