'use client'

import { useState, useEffect } from 'react'
import { tools } from '@/data/tools'
import { ToolCard } from './ToolCard'

const FILTER_CATEGORIES = ['開発者向け', 'デザイン', '画像', 'テキスト', 'カラー', 'ゲーム開発', 'AI'] as const
const NEW_WINDOW_DAYS = 30

export function ToolGrid() {
  const [activeFilter, setActiveFilter] = useState<string | null>(null)
  const [visitedSlugs, setVisitedSlugs] = useState<Set<string>>(new Set())

  useEffect(() => {
    try {
      const raw = localStorage.getItem('dth_visited')
      if (raw) setVisitedSlugs(new Set(JSON.parse(raw) as string[]))
    } catch {
      // ignore
    }
  }, [])

  function isNew(slug: string, releasedAt: string): boolean {
    if (visitedSlugs.has(slug)) return false
    const diffDays = (Date.now() - new Date(releasedAt).getTime()) / 86_400_000
    return diffDays <= NEW_WINDOW_DAYS
  }

  const filteredTools = activeFilter
    ? tools.filter((t) => t.tags.includes(activeFilter))
    : tools

  return (
    <>
      {/* カテゴリフィルター */}
      <div className="mb-5 flex flex-wrap gap-2" role="group" aria-label="カテゴリで絞り込む">
        <button
          onClick={() => setActiveFilter(null)}
          className={`rounded border px-3 py-1 font-mono text-[11px] transition-colors duration-150 ${
            activeFilter === null
              ? 'border-teal bg-teal/10 text-teal'
              : 'border-border bg-surface text-muted hover:border-border-hi hover:text-dim'
          }`}
        >
          全て
          <span className="ml-1.5 opacity-50">{tools.length}</span>
        </button>
        {FILTER_CATEGORIES.map((cat) => {
          const count = tools.filter((t) => t.tags.includes(cat)).length
          if (count === 0) return null
          return (
            <button
              key={cat}
              onClick={() => setActiveFilter(activeFilter === cat ? null : cat)}
              className={`rounded border px-3 py-1 font-mono text-[11px] transition-colors duration-150 ${
                activeFilter === cat
                  ? 'border-teal bg-teal/10 text-teal'
                  : 'border-border bg-surface text-muted hover:border-border-hi hover:text-dim'
              }`}
            >
              {cat}
              <span className="ml-1.5 opacity-50">{count}</span>
            </button>
          )
        })}
      </div>

      {/* ツールグリッド */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filteredTools.map((tool) => (
          <ToolCard
            key={tool.slug}
            tool={tool}
            isNew={isNew(tool.slug, tool.releasedAt)}
          />
        ))}
      </div>
    </>
  )
}
