import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { tools } from '@/data/tools'
import { CATEGORIES, getCategoryBySlug } from '@/data/categories'
import { ToolCard } from '@/components/ToolCard'

interface Props {
  params: { slug: string }
}

export function generateStaticParams() {
  return CATEGORIES.map((c) => ({ slug: c.slug }))
}

export function generateMetadata({ params }: Props): Metadata {
  const cat = getCategoryBySlug(params.slug)
  if (!cat) return {}
  return {
    title: `${cat.label} ツール一覧`,
    description: `devtools-hub の ${cat.label} カテゴリのツール一覧。${cat.description}`,
    alternates: {
      canonical: `https://devtools-hub.vercel.app/category/${cat.slug}`,
    },
  }
}

export default function CategoryPage({ params }: Props) {
  const cat = getCategoryBySlug(params.slug)
  if (!cat) notFound()

  const categoryTools = tools.filter((t) => t.tags.includes(cat.tag))

  return (
    <main className="py-12">
      {/* パンくず */}
      <nav className="mb-6 flex items-center gap-1.5 font-mono text-[11px] text-muted">
        <Link href="/category" className="hover:text-primary transition-colors">
          カテゴリ
        </Link>
        <span aria-hidden="true" className="opacity-40">/</span>
        <span className="text-primary">{cat.label}</span>
      </nav>

      {/* ヘッダーパネル */}
      <div
        className="relative overflow-hidden mb-10 rounded-lg border border-border bg-surface px-6 py-6 pl-8"
      >
        {/* 左アクセントバー */}
        <span
          aria-hidden="true"
          className="absolute left-0 top-0 h-full w-[4px] rounded-l-lg"
          style={{ backgroundColor: cat.accent, opacity: 0.7 }}
        />

        <p
          className="font-mono text-[10px] uppercase tracking-[0.2em] mb-2"
          style={{ color: cat.accent }}
        >
          Category
        </p>
        <h1 className="font-mono text-xl font-bold text-bright mb-1">{cat.label}</h1>
        <p className="text-sm text-dim leading-relaxed mb-3">{cat.description}</p>
        <p className="font-mono text-xs text-muted">
          <span className="font-semibold text-primary">{categoryTools.length}</span>
          <span className="ml-1 opacity-60">ツール</span>
        </p>
      </div>

      {categoryTools.length === 0 ? (
        <p className="py-16 text-center font-mono text-sm text-muted">
          このカテゴリにはまだツールがありません
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {categoryTools.map((tool) => (
            <ToolCard key={tool.slug} tool={tool} />
          ))}
        </div>
      )}

      <div className="mt-10 pt-6 border-t border-border flex gap-5 flex-wrap">
        <Link
          href="/category"
          className="text-xs text-muted hover:text-primary transition-colors font-mono uppercase tracking-widest"
        >
          ← カテゴリ一覧
        </Link>
        <Link
          href="/"
          className="text-xs text-muted hover:text-primary transition-colors font-mono uppercase tracking-widest"
        >
          全ツール一覧
        </Link>
      </div>
    </main>
  )
}
