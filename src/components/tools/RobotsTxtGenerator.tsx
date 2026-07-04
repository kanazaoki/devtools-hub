'use client'

import { useState, useMemo, useCallback } from 'react'

type Rule = { type: 'allow' | 'disallow'; path: string }
type Agent = { id: number; userAgent: string; rules: Rule[]; crawlDelay: string }

let nextId = 2
const defaultAgent = (): Agent => ({
  id: nextId++,
  userAgent: '*',
  rules: [{ type: 'disallow', path: '' }],
  crawlDelay: '',
})

const initialAgents: Agent[] = [
  { id: 1, userAgent: '*', rules: [{ type: 'allow', path: '/' }], crawlDelay: '' },
]

export function RobotsTxtGenerator() {
  const [agents, setAgents] = useState<Agent[]>(initialAgents)
  const [sitemaps, setSitemaps] = useState<string[]>([''])
  const [copied, setCopied] = useState(false)

  const output = useMemo(() => {
    const lines: string[] = []
    for (const agent of agents) {
      lines.push(`User-agent: ${agent.userAgent || '*'}`)
      for (const rule of agent.rules) {
        lines.push(`${rule.type === 'allow' ? 'Allow' : 'Disallow'}: ${rule.path}`)
      }
      if (agent.crawlDelay.trim()) {
        lines.push(`Crawl-delay: ${agent.crawlDelay.trim()}`)
      }
      lines.push('')
    }
    const validSitemaps = sitemaps.filter(s => s.trim())
    for (const s of validSitemaps) {
      lines.push(`Sitemap: ${s.trim()}`)
    }
    return lines.join('\n').trim()
  }, [agents, sitemaps])

  const updateAgent = useCallback((id: number, patch: Partial<Omit<Agent, 'id' | 'rules'>>) => {
    setAgents(prev => prev.map(a => a.id === id ? { ...a, ...patch } : a))
  }, [])

  const addRule = useCallback((agentId: number) => {
    setAgents(prev => prev.map(a =>
      a.id === agentId ? { ...a, rules: [...a.rules, { type: 'disallow', path: '' }] } : a
    ))
  }, [])

  const updateRule = useCallback((agentId: number, idx: number, patch: Partial<Rule>) => {
    setAgents(prev => prev.map(a =>
      a.id === agentId
        ? { ...a, rules: a.rules.map((r, i) => i === idx ? { ...r, ...patch } : r) }
        : a
    ))
  }, [])

  const removeRule = useCallback((agentId: number, idx: number) => {
    setAgents(prev => prev.map(a =>
      a.id === agentId ? { ...a, rules: a.rules.filter((_, i) => i !== idx) } : a
    ))
  }, [])

  const removeAgent = useCallback((id: number) => {
    setAgents(prev => prev.filter(a => a.id !== id))
  }, [])

  const handleCopy = () => {
    navigator.clipboard.writeText(output)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownload = () => {
    const blob = new Blob([output], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'robots.txt'; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex gap-4" style={{ minHeight: '480px' }}>
      {/* Left: Editor */}
      <div className="flex flex-col gap-4 flex-1" style={{ minWidth: 0 }}>
        {agents.map((agent, agentIdx) => (
          <div key={agent.id} className="rounded-lg border border-border bg-surface p-4">
            {/* User-agent header */}
            <div className="flex items-center gap-2 mb-3">
              <label className="text-xs font-mono font-semibold uppercase tracking-widest text-muted w-24 flex-shrink-0">
                User-agent
              </label>
              <input
                type="text"
                value={agent.userAgent}
                onChange={e => updateAgent(agent.id, { userAgent: e.target.value })}
                placeholder="* または Googlebot など"
                className="flex-1 rounded border border-border bg-bg px-2 py-1 font-mono text-sm text-primary focus:border-teal focus:outline-none"
              />
              {agents.length > 1 && (
                <button
                  onClick={() => removeAgent(agent.id)}
                  className="text-dim hover:text-red-400 text-xs px-1 transition-colors"
                  title="削除"
                >✕</button>
              )}
            </div>

            {/* Rules */}
            <div className="flex flex-col gap-1.5 mb-3 ml-2">
              {agent.rules.map((rule, ruleIdx) => (
                <div key={ruleIdx} className="flex items-center gap-2">
                  <select
                    value={rule.type}
                    onChange={e => updateRule(agent.id, ruleIdx, { type: e.target.value as 'allow' | 'disallow' })}
                    className="rounded border border-border bg-bg px-2 py-1 font-mono text-xs text-primary focus:border-teal focus:outline-none"
                  >
                    <option value="allow">Allow</option>
                    <option value="disallow">Disallow</option>
                  </select>
                  <input
                    type="text"
                    value={rule.path}
                    onChange={e => updateRule(agent.id, ruleIdx, { path: e.target.value })}
                    placeholder="/ または /admin/"
                    className="flex-1 rounded border border-border bg-bg px-2 py-1 font-mono text-xs text-primary focus:border-teal focus:outline-none"
                  />
                  <button
                    onClick={() => removeRule(agent.id, ruleIdx)}
                    className="text-dim hover:text-red-400 text-xs transition-colors"
                    title="削除"
                  >✕</button>
                </div>
              ))}
              <button
                onClick={() => addRule(agent.id)}
                className="mt-1 self-start text-xs text-teal hover:text-teal/80 font-mono transition-colors"
              >
                + ルール追加
              </button>
            </div>

            {/* Crawl-delay */}
            <div className="flex items-center gap-2 ml-2">
              <label className="text-xs text-muted font-mono w-22 flex-shrink-0">Crawl-delay</label>
              <input
                type="number"
                value={agent.crawlDelay}
                onChange={e => updateAgent(agent.id, { crawlDelay: e.target.value })}
                placeholder="秒（省略可）"
                min={0}
                className="w-28 rounded border border-border bg-bg px-2 py-1 font-mono text-xs text-primary focus:border-teal focus:outline-none"
              />
            </div>
          </div>
        ))}

        <button
          onClick={() => setAgents(prev => [...prev, defaultAgent()])}
          className="self-start rounded border border-border px-3 py-1.5 text-xs text-muted hover:border-teal hover:text-teal font-mono transition-colors"
        >
          + User-agent 追加
        </button>

        {/* Sitemaps */}
        <div className="rounded-lg border border-border bg-surface p-4">
          <div className="text-xs font-mono font-semibold uppercase tracking-widest text-muted mb-3">Sitemap</div>
          <div className="flex flex-col gap-1.5">
            {sitemaps.map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="url"
                  value={s}
                  onChange={e => setSitemaps(prev => prev.map((v, j) => j === i ? e.target.value : v))}
                  placeholder="https://example.com/sitemap.xml"
                  className="flex-1 rounded border border-border bg-bg px-2 py-1 font-mono text-xs text-primary focus:border-teal focus:outline-none"
                />
                {sitemaps.length > 1 && (
                  <button
                    onClick={() => setSitemaps(prev => prev.filter((_, j) => j !== i))}
                    className="text-dim hover:text-red-400 text-xs transition-colors"
                  >✕</button>
                )}
              </div>
            ))}
            <button
              onClick={() => setSitemaps(prev => [...prev, ''])}
              className="mt-1 self-start text-xs text-teal hover:text-teal/80 font-mono transition-colors"
            >
              + Sitemap 追加
            </button>
          </div>
        </div>
      </div>

      {/* Right: Preview */}
      <div className="flex flex-col gap-2 w-80 flex-shrink-0">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono font-semibold uppercase tracking-widest text-muted">Preview</span>
          <div className="flex gap-2">
            <button
              onClick={handleCopy}
              className="rounded border border-border px-2.5 py-1 text-xs text-muted hover:border-teal hover:text-teal transition-colors"
            >
              {copied ? '✓ Copied' : 'Copy'}
            </button>
            <button
              onClick={handleDownload}
              className="rounded border border-border px-2.5 py-1 text-xs text-muted hover:border-teal hover:text-teal transition-colors"
            >
              Download
            </button>
          </div>
        </div>
        <pre className="flex-1 rounded-lg border border-border bg-bg p-3 font-mono text-xs text-primary overflow-auto whitespace-pre leading-relaxed" style={{ minHeight: '400px' }}>
          {output || <span className="text-dim">（出力なし）</span>}
        </pre>
      </div>
    </div>
  )
}
