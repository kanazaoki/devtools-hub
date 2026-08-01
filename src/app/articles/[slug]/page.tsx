import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { articles } from '@/data/articles'
import { tools } from '@/data/tools'
import { ToolCard } from '@/components/ToolCard'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  return articles.map((a) => ({ slug: a.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const article = articles.find((a) => a.slug === slug)
  if (!article) return {}

  return {
    title: article.title,
    description: article.description,
    alternates: {
      canonical: `https://devtools-hub.dev/articles/${slug}`,
    },
    openGraph: {
      title: article.title,
      description: article.description,
      type: 'article',
      publishedTime: article.publishedAt,
    },
  }
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params
  const article = articles.find((a) => a.slug === slug)
  if (!article) notFound()

  const relatedToolData = article.relatedTools
    ? tools.filter((t) => article.relatedTools!.includes(t.slug))
    : []

  // Related guides: other articles ranked by shared tags (weighted) and shared
  // tools, so clusters (JSON / CSS / color / HTTP …) link to each other.
  const relatedArticles = articles
    .filter((a) => a.slug !== article.slug)
    .map((a) => {
      const tagOverlap = a.tags.filter((t) => article.tags.includes(t)).length
      const toolOverlap = (a.relatedTools ?? []).filter((t) =>
        (article.relatedTools ?? []).includes(t)
      ).length
      return { article: a, score: tagOverlap * 2 + toolOverlap }
    })
    .filter((x) => x.score > 0)
    .sort((x, y) => y.score - x.score)
    .slice(0, 3)
    .map((x) => x.article)

  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.description,
    datePublished: article.publishedAt,
    author: { '@type': 'Person', name: 'KOMA' },
    publisher: {
      '@type': 'Organization',
      name: 'devtools-hub',
      url: 'https://devtools-hub.dev',
    },
  }

  return (
    <main className="py-10 max-w-2xl">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />

      {/* Breadcrumb */}
      <nav className="mb-8 flex items-center gap-2 font-mono text-xs text-muted">
        <Link href="/" className="hover:text-primary transition-colors">Home</Link>
        <span>/</span>
        <Link href="/articles" className="hover:text-primary transition-colors">ガイド</Link>
        <span>/</span>
        <span className="text-primary truncate">{article.title}</span>
      </nav>

      {/* Header */}
      <header className="mb-10">
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <time
            dateTime={article.publishedAt}
            className="font-mono text-[11px] text-muted"
          >
            {new Date(article.publishedAt).toLocaleDateString('ja-JP', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </time>
          <div className="flex gap-1.5 flex-wrap">
            {article.tags.map((tag) => (
              <span
                key={tag}
                className="rounded border border-teal/30 bg-teal/10 px-1.5 py-px font-mono text-[10px] text-teal"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
        <h1 className="font-mono text-2xl font-bold text-bright leading-snug mb-4">
          {article.title}
        </h1>
        <p className="text-sm leading-relaxed text-dim">{article.description}</p>
      </header>

      {/* Article body */}
      <article className="space-y-0">
        {/* Intro */}
        <p className="text-sm leading-relaxed text-primary mb-8">{article.intro}</p>

        {/* Sections */}
        <div className="space-y-8 divide-y divide-border">
          {article.sections.map((section) => {
            const stepTool = section.tool ? tools.find((t) => t.slug === section.tool) : null
            return (
              <div key={section.heading} className="pt-8 first:pt-0 first:border-0">
                <h2 className="text-base font-semibold text-bright mb-3">{section.heading}</h2>
                <p className="text-sm leading-relaxed text-primary">{section.body}</p>
                {stepTool && (
                  <Link
                    href={`/tools/${stepTool.slug}`}
                    className="group mt-4 flex items-center gap-3 rounded-lg border border-border bg-surface p-3 pl-4 transition-all duration-150 hover:border-teal/50 hover:bg-teal/5"
                    style={{ borderLeftColor: 'rgb(0,200,150)', borderLeftWidth: '3px' }}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-[10px] uppercase tracking-widest text-teal">この手順で使うツール</p>
                      <p className="mt-0.5 font-mono text-sm font-semibold text-bright">{stepTool.name}</p>
                      <p className="truncate text-xs text-dim">{stepTool.tagline}</p>
                    </div>
                    <span aria-hidden="true" className="shrink-0 text-teal transition-transform group-hover:translate-x-0.5">→</span>
                  </Link>
                )}
              </div>
            )
          })}
        </div>

        {/* Conclusion */}
        {article.conclusion && (
          <div className="mt-10 pt-8 border-t border-border">
            <h2 className="text-base font-semibold text-bright mb-3">まとめ</h2>
            <p className="text-sm leading-relaxed text-primary">{article.conclusion}</p>
          </div>
        )}
      </article>

      {/* Related tools */}
      {relatedToolData.length > 0 && (
        <section className="mt-10 pt-8 border-t border-border">
          <h2 className="mb-4 font-mono text-xs font-semibold uppercase tracking-widest text-muted">このツールで試す</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {relatedToolData.map((t) => <ToolCard key={t.slug} tool={t} />)}
          </div>
        </section>
      )}

      {/* Related guides */}
      {relatedArticles.length > 0 && (
        <section className="mt-10 pt-8 border-t border-border">
          <h2 className="mb-4 font-mono text-xs font-semibold uppercase tracking-widest text-muted">関連ガイド</h2>
          <div className="flex flex-col gap-3">
            {relatedArticles.map((g) => (
              <Link
                key={g.slug}
                href={`/articles/${g.slug}`}
                className="group flex items-start gap-3 rounded-lg border border-border bg-surface p-4 transition-all duration-150 hover:border-teal/50 hover:bg-teal/5"
              >
                <span aria-hidden="true" className="mt-0.5 shrink-0">📖</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-bright transition-colors group-hover:text-teal">{g.title}</p>
                  <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-dim">{g.description}</p>
                </div>
                <span aria-hidden="true" className="shrink-0 text-teal transition-transform group-hover:translate-x-0.5">→</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Footer nav */}
      <div className="mt-12 pt-6 border-t border-border flex gap-5 flex-wrap">
        <Link
          href="/articles"
          className="text-xs text-muted hover:text-primary transition-colors font-mono uppercase tracking-widest"
        >
          ← ガイド一覧
        </Link>
        <Link
          href="/"
          className="text-xs text-muted hover:text-primary transition-colors font-mono uppercase tracking-widest"
        >
          ツール一覧
        </Link>
      </div>
    </main>
  )
}
