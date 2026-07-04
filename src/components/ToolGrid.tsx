'use client'

import { useState, useEffect, useRef } from 'react'
import { tools } from '@/data/tools'
import { ToolCard } from './ToolCard'

const FILTER_CATEGORIES = ['開発者向け', 'CSS', 'デザイン', '画像', 'テキスト', 'カラー', 'ゲーム開発', 'AI'] as const
const NEW_WINDOW_DAYS = 30

export function ToolGrid() {
  const [activeFilter, setActiveFilter] = useState<string | null>(null)
  const [visitedSlugs, setVisitedSlugs] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem('dth_visited')
      if (raw) setVisitedSlugs(new Set(JSON.parse(raw) as string[]))
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        searchRef.current?.focus()
        searchRef.current?.select()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  function isNew(slug: string, releasedAt: string): boolean {
    if (visitedSlugs.has(slug)) return false
    const diffDays = (Date.now() - new Date(releasedAt).getTime()) / 86_400_000
    return diffDays <= NEW_WINDOW_DAYS
  }

  const q = searchQuery.trim().toLowerCase()
  const filteredTools = tools.filter((t) => {
    const matchesCategory = activeFilter ? t.tags.includes(activeFilter) : true
    const matchesSearch = q
      ? t.name.toLowerCase().includes(q) ||
        t.tagline.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.tags.some((tag) => tag.toLowerCase().includes(q))
      : true
    return matchesCategory && matchesSearch
  })

  return (
    <>
      {/* 検索バー + フィルター（スティッキー） */}
      <div className="sticky top-14 z-40 -mx-4 px-4 pt-3 pb-3 bg-bg/95 backdrop-blur-sm border-b border-border/50 mb-4">
        <div className="relative mb-3">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none"
            width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            ref={searchRef}
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Escape') { setSearchQuery(''); searchRef.current?.blur() } }}
            placeholder="ツール名・機能で検索… (⌘K)"
            aria-label="ツールを検索"
            className="w-full rounded-lg border border-border bg-surface pl-9 pr-4 py-2 font-mono text-sm text-primary placeholder:text-muted focus:border-teal focus:outline-none transition-colors duration-150"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-dim transition-colors"
              aria-label="検索をクリア"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>

        {/* カテゴリフィルター */}
        <div className="flex flex-wrap gap-2" role="group" aria-label="カテゴリで絞り込む">
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
      </div>

      {/* 件数表示（絞り込み中のみ） */}
      {(q || activeFilter) && (
        <p className="mb-3 font-mono text-xs text-muted">
          {filteredTools.length === 0 ? '0件' : `${filteredTools.length} 件`}
          {activeFilter && <span className="ml-1">/ {activeFilter}</span>}
        </p>
      )}

      {/* ツールグリッド */}
      {filteredTools.length === 0 ? (
        <p className="py-16 text-center font-mono text-sm text-muted">
          「{searchQuery}」に一致するツールはありません
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredTools.map((tool) => (
            <ToolCard
              key={tool.slug}
              tool={tool}
              isNew={isNew(tool.slug, tool.releasedAt)}
            />
          ))}
        </div>
      )}
    </>
  )
}
