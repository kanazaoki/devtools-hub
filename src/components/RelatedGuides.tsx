import Link from 'next/link'
import { articles } from '@/data/articles'

// Reverse lookup: guides (how-to articles) that reference this tool — either in
// their relatedTools or as a per-step tool. Renders nothing when there are none,
// so it's safe to drop onto any tool page.
export function RelatedGuides({ toolSlug }: { toolSlug: string }) {
  const guides = articles.filter(
    (a) => a.relatedTools?.includes(toolSlug) || a.sections.some((s) => s.tool === toolSlug)
  )
  if (guides.length === 0) return null

  return (
    <section className="mb-8">
      <h2 className="mb-4 font-mono text-xs font-semibold uppercase tracking-widest text-muted">
        この作業の手順ガイド
      </h2>
      <div className="flex flex-col gap-3">
        {guides.map((g) => (
          <Link
            key={g.slug}
            href={`/articles/${g.slug}`}
            className="group flex items-start gap-3 rounded-lg border border-border bg-surface p-4 pl-5 transition-all duration-150 hover:border-teal/50 hover:bg-teal/5"
            style={{ borderLeftColor: 'rgb(0,200,150)', borderLeftWidth: '3px' }}
          >
            <span aria-hidden="true" className="mt-0.5 shrink-0">📖</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-bright transition-colors group-hover:text-teal">
                {g.title}
              </p>
              <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-dim">{g.description}</p>
            </div>
            <span
              aria-hidden="true"
              className="shrink-0 text-teal transition-transform group-hover:translate-x-0.5"
            >
              →
            </span>
          </Link>
        ))}
      </div>
    </section>
  )
}
