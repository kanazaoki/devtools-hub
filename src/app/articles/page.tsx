import type { Metadata } from 'next'
import Link from 'next/link'
import { articles } from '@/data/articles'

export const metadata: Metadata = {
  title: '記事一覧 | devtools-hub',
  description: 'JSON・CSS・HTTP・正規表現・JWT・画像最適化など、Web開発に役立つ実践的な技術記事を公開しています。',
  alternates: {
    canonical: 'https://devtools-hub.vercel.app/articles',
  },
}

export default function ArticlesPage() {
  const sorted = [...articles].sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  )

  return (
    <main className="py-12 max-w-2xl">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-teal mb-4">Articles</p>
      <h1 className="font-mono text-2xl font-bold text-bright mb-2">技術記事</h1>
      <p className="text-sm text-dim leading-relaxed mb-10">
        Web 開発で役立つ実践的な技術記事を公開しています。
      </p>

      <div className="space-y-0 divide-y divide-border">
        {sorted.map((article) => (
          <article key={article.slug} className="group py-7">
            <Link href={`/articles/${article.slug}`} className="block">
              <div className="flex items-center gap-3 mb-2">
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
              <h2 className="text-sm font-semibold text-bright group-hover:text-teal transition-colors mb-1.5 leading-snug">
                {article.title}
              </h2>
              <p className="text-xs text-dim leading-relaxed line-clamp-2">{article.description}</p>
            </Link>
          </article>
        ))}
      </div>
    </main>
  )
}
