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
    title: `${article.title} | devtools-hub`,
    description: article.description,
    alternates: {
      canonical: `https://devtools-hub.vercel.app/articles/${slug}`,
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
      url: 'https://devtools-hub.vercel.app',
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
        <Link href="/articles" className="hover:text-primary transition-colors">Articles</Link>
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
          {article.sections.map((section) => (
            <div key={section.heading} className="pt-8 first:pt-0 first:border-0">
              <h2 className="text-base font-semibold text-bright mb-3">{section.heading}</h2>
              <p className="text-sm leading-relaxed text-primary">{section.body}</p>
            </div>
          ))}
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

      {/* Footer nav */}
      <div className="mt-12 pt-6 border-t border-border flex gap-5 flex-wrap">
        <Link
          href="/articles"
          className="text-xs text-muted hover:text-primary transition-colors font-mono uppercase tracking-widest"
        >
          ← 記事一覧
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
