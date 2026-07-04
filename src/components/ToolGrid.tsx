'use client'

import { useState, useEffect, useRef } from 'react'
import { tools } from '@/data/tools'
import { ToolCard } from './ToolCard'

const FILTER_CATEGORIES = ['開発者向け', 'CSS', 'デザイン', '画像', 'テキスト', 'カラー', 'ゲーム開発', 'AI'] as const
const NEW_WINDOW_DAYS = 30
type SortOrder = 'default' | 'newest' | 'name'

export function ToolGrid() {
  const [activeFilter, setActiveFilter] = useState<string | null>(null)
  const [visitedSlugs, setVisitedSlugs] = useState<Set<string>>(new Set())
  const [favorites, setFavorites] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [sortOrder, setSortOrder] = useState<SortOrder>('default')
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    try {
      const visited = localStorage.getItem('dth_visited')
      if (visited) setVisitedSlugs(new Set(JSON.parse(visited) as string[]))
      const favs = localStorage.getItem('dth_favorites')
      if (favs) setFavorites(new Set(JSON.parse(favs) as string[]))
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

  function toggleFavorite(slug: string) {
    setFavorites((prev) => {
      const next = new Set(prev)
      if (next.has(slug)) next.delete(slug)
      else next.add(slug)
      try { localStorage.setItem('dth_favorites', JSON.stringify([...next])) } catch {}
      return next
    })
  }

  function isNew(slug: string, releasedAt: string): boolean {
    if (visitedSlugs.has(slug)) return false
    const diffDays = (Date.now() - new Date(releasedAt).getTime()) / 86_400_000
    return diffDays <= NEW_WINDOW_DAYS
  }

  const q = searchQuery.trim().toLowerCase()
  let filteredTools = tools.filter((t) => {
    const matchesCategory = activeFilter ? t.tags.includes(activeFilter) : true
    const matchesFavorites = showFavoritesOnly ? favorites.has(t.slug) : true
    const matchesSearch = q
      ? t.name.toLowerCase().includes(q) ||
        t.tagline.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.tags.some((tag) => tag.toLowerCase().includes(q))
      : true
    return matchesCategory && matchesFavorites && matchesSearch
  })

  if (sortOrder === 'newest') {
    filteredTools = [...filteredTools].sort(
      (a, b) => new Date(b.releasedAt).getTime() - new Date(a.releasedAt).getTime()
    )
  } else if (sortOrder === 'name') {
    filteredTools = [...filteredTools].sort((a, b) => a.name.localeCompare(b.name, 'ja'))
  }

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

        {/* カテゴリフィルター + 並び順 */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex flex-wrap gap-2 flex-1" role="group" aria-label="カテゴリで絞り込む">
            <button
              onClick={() => { setActiveFilter(null); setShowFavoritesOnly(false) }}
              className={`rounded border px-3 py-1 font-mono text-[11px] transition-colors duration-150 ${
                activeFilter === null && !showFavoritesOnly
                  ? 'border-teal bg-teal/10 text-teal'
                  : 'border-border bg-surface text-muted hover:border-border-hi hover:text-dim'
              }`}
            >
              全て
              <span className="ml-1.5 opacity-50">{tools.length}</span>
            </button>

            <button
              onClick={() => { setShowFavoritesOnly(!showFavoritesOnly); setActiveFilter(null) }}
              className={`rounded border px-3 py-1 font-mono text-[11px] transition-colors duration-150 ${
                showFavoritesOnly
                  ? 'border-amber-400/60 bg-amber-400/10 text-amber-400'
                  : 'border-border bg-surface text-muted hover:border-border-hi hover:text-dim'
              }`}
            >
              ★ お気に入り
              {favorites.size > 0 && <span className="ml-1.5 opacity-50">{favorites.size}</span>}
            </button>

            {FILTER_CATEGORIES.map((cat) => {
              const count = tools.filter((t) => t.tags.includes(cat)).length
              if (count === 0) return null
              return (
                <button
                  key={cat}
                  onClick={() => { setActiveFilter(activeFilter === cat ? null : cat); setShowFavoritesOnly(false) }}
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

          {/* 並び順 */}
          <div className="flex items-center gap-1 shrink-0" role="group" aria-label="並び順">
            {(['default', 'newest', 'name'] as SortOrder[]).map((order) => {
              const label = order === 'default' ? 'デフォルト' : order === 'newest' ? '新着順' : '名前順'
              return (
                <button
                  key={order}
                  onClick={() => setSortOrder(order)}
                  className={`rounded border px-2.5 py-1 font-mono text-[10px] transition-colors duration-150 ${
                    sortOrder === order
                      ? 'border-teal bg-teal/10 text-teal'
                      : 'border-border bg-surface text-muted hover:border-border-hi hover:text-dim'
                  }`}
                >
                  {label}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* 件数表示（絞り込み中のみ） */}
      {(q || activeFilter || showFavoritesOnly) && (
        <p className="mb-3 font-mono text-xs text-muted">
          {filteredTools.length === 0 ? '0件' : `${filteredTools.length} 件`}
          {activeFilter && <span className="ml-1">/ {activeFilter}</span>}
          {showFavoritesOnly && <span className="ml-1">/ お気に入り</span>}
        </p>
      )}

      {/* ツールグリッド */}
      {filteredTools.length === 0 ? (
        <p className="py-16 text-center font-mono text-sm text-muted">
          {showFavoritesOnly
            ? 'お気に入りはまだありません。ツールカードの★をクリックして追加できます'
            : `「${searchQuery}」に一致するツールはありません`}
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredTools.map((tool) => (
            <ToolCard
              key={tool.slug}
              tool={tool}
              isNew={isNew(tool.slug, tool.releasedAt)}
              isFavorited={favorites.has(tool.slug)}
              onToggleFavorite={() => toggleFavorite(tool.slug)}
            />
          ))}
        </div>
      )}
    </>
  )
}
