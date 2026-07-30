import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { CATEGORIES, getCategoryBySlug } from '@/data/categories'
import { tools } from '@/data/tools'
import { ToolCard } from '@/components/ToolCard'
import { AdSense } from '@/components/AdSense'

interface Props {
  params: { slug: string }
}

export function generateStaticParams() {
  return CATEGORIES.map((c) => ({ slug: c.slug }))
}

export function generateMetadata({ params }: Props): Metadata {
  const cat = getCategoryBySlug(params.slug)
  if (!cat) return {}
  const count = tools.filter((t) => t.tags.includes(cat.tag)).length
  return {
    title: `${cat.label}の無料Webツール${count}選`,
    description: cat.intro,
    alternates: {
      canonical: `https://devtools-hub.dev/category/${cat.slug}`,
    },
    openGraph: {
      title: `${cat.label}の無料Webツール${count}選 | devtools-hub`,
      description: cat.intro,
    },
  }
}

export default function CategoryPage({ params }: Props) {
  const cat = getCategoryBySlug(params.slug)
  if (!cat) notFound()

  const catTools = tools
    .filter((t) => t.tags.includes(cat.tag))
    .sort((a, b) => a.name.localeCompare(b.name, 'ja'))
  const others = CATEGORIES.filter((c) => c.slug !== cat.slug)

  return (
    <main className="py-12">
      <nav className="mb-6 flex items-center gap-2 font-mono text-xs text-muted">
        <Link href="/" className="transition-colors hover:text-dim">Home</Link>
        <span aria-hidden="true">/</span>
        <Link href="/category" className="transition-colors hover:text-dim">カテゴリ</Link>
        <span aria-hidden="true">/</span>
        <span className="text-dim">{cat.label}</span>
      </nav>

      <header className="mb-8">
        <p className="mb-3 font-mono text-xs uppercase tracking-[0.2em]" style={{ color: cat.accent }}>
          Category
        </p>
        <h1 className="font-mono text-2xl font-bold text-bright">{cat.label}の無料Webツール</h1>
        <p className="mt-2 text-sm text-dim">
          <span className="font-semibold text-primary">{catTools.length}</span> 個の{cat.label}関連ツールを無料公開中。
        </p>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-primary">{cat.intro}</p>
      </header>

      <AdSense slot="1651467900" format="horizontal" className="mb-8" />

      {catTools.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {catTools.map((t) => (
            <ToolCard key={t.slug} tool={t} />
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted">このカテゴリのツールは準備中です。</p>
      )}

      <section className="mt-14 border-t border-border pt-8">
        <h2 className="mb-4 font-mono text-xs font-semibold uppercase tracking-widest text-muted">
          他のカテゴリ
        </h2>
        <div className="flex flex-wrap gap-2">
          {others.map((c) => (
            <Link
              key={c.slug}
              href={`/category/${c.slug}`}
              className="rounded border border-border bg-surface px-3 py-1.5 font-mono text-[11px] text-muted transition-colors duration-150 hover:border-border-hi hover:text-dim"
            >
              {c.label}
            </Link>
          ))}
          <Link
            href="/"
            className="rounded border border-teal/40 bg-teal/5 px-3 py-1.5 font-mono text-[11px] text-teal transition-colors duration-150 hover:bg-teal/10"
          >
            すべてのツール →
          </Link>
        </div>
      </section>
    </main>
  )
}
