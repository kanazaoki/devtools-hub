'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { tools, type Tool } from '@/data/tools'

const MAX_RECENT = 4

export function RecentlyViewed() {
  const [recentTools, setRecentTools] = useState<Tool[]>([])

  useEffect(() => {
    try {
      const raw = localStorage.getItem('dth_visited')
      if (!raw) return
      const visited: string[] = JSON.parse(raw)
      const recent = visited
        .slice(-MAX_RECENT)
        .reverse()
        .map((slug) => tools.find((t) => t.slug === slug))
        .filter((t): t is Tool => t !== undefined)
      setRecentTools(recent)
    } catch {
      // ignore
    }
  }, [])

  if (recentTools.length === 0) return null

  return (
    <section className="mb-10">
      <p className="mb-3 font-mono text-[11px] uppercase tracking-widest text-muted">Recently Viewed</p>
      <div className="flex flex-wrap gap-2">
        {recentTools.map((tool) => (
          <Link
            key={tool.slug}
            href={`/tools/${tool.slug}`}
            className="group flex items-center gap-2 rounded-lg border border-border bg-surface px-4 py-2.5 text-sm transition-colors hover:border-teal/50 hover:bg-surface-hi"
          >
            <span className="font-mono text-sm font-medium text-bright group-hover:text-teal transition-colors">
              {tool.name}
            </span>
            <span className="text-xs text-muted">{tool.tagline}</span>
          </Link>
        ))}
      </div>
    </section>
  )
}
