import type { Metadata } from 'next'
import Link from 'next/link'
import { tools } from '@/data/tools'
import { CATEGORIES } from '@/data/categories'

export const metadata: Metadata = {
  title: 'カテゴリ一覧',
  description:
    'devtools-hub のツールカテゴリ一覧。開発者向け・CSS・デザイン・画像・テキスト・カラー・ゲーム開発・AI の8カテゴリに分類されたツールを探せます。',
  alternates: {
    canonical: 'https://devtools-hub.vercel.app/category',
  },
}

export default function CategoryListPage() {
  return (
    <main className="py-12">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-teal mb-4">Categories</p>
      <h1 className="font-mono text-2xl font-bold text-bright mb-2">カテゴリ一覧</h1>
      <p className="text-sm text-dim leading-relaxed mb-10">
        <span className="font-semibold text-primary">{CATEGORIES.length}</span> カテゴリ・計{' '}
        <span className="font-semibold text-primary">{tools.length}</span> ツールを公開中。
      </p>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {CATEGORIES.map((cat) => {
          const count = tools.filter((t) => t.tags.includes(cat.tag)).length
          return (
            <Link
              key={cat.slug}
              href={`/category/${cat.slug}`}
              className="group relative overflow-hidden flex flex-col gap-3 rounded-lg border border-border bg-surface p-5 pl-6 transition-all duration-200 hover:-translate-y-0.5 hover:border-border-hi hover:bg-surface-hi hover:shadow-[0_4px_20px_rgba(0,0,0,0.4)]"
            >
              {/* 左アクセントバー */}
              <span
                aria-hidden="true"
                className="absolute left-0 top-0 h-full w-[3px] rounded-l-lg opacity-40 transition-opacity duration-200 group-hover:opacity-90"
                style={{ backgroundColor: cat.accent }}
              />

              <div>
                <h2 className="font-mono text-sm font-semibold text-bright transition-colors duration-150 group-hover:text-teal">
                  {cat.label}
                </h2>
                <p className="mt-1.5 text-xs leading-relaxed text-dim">{cat.description}</p>
              </div>

              <div className="mt-auto flex items-center justify-between">
                <span className="font-mono text-[11px] text-muted">
                  <span className="font-semibold text-primary">{count}</span>
                  <span className="ml-1 opacity-60">ツール</span>
                </span>
                <span
                  className="font-mono text-xs opacity-30 transition-all duration-150 group-hover:opacity-80 group-hover:translate-x-0.5"
                  style={{ color: cat.accent }}
                >
                  →
                </span>
              </div>
            </Link>
          )
        })}
      </div>

      <div className="mt-10 pt-6 border-t border-border">
        <Link
          href="/"
          className="text-xs text-muted hover:text-primary transition-colors font-mono uppercase tracking-widest"
        >
          ← ツール一覧に戻る
        </Link>
      </div>
    </main>
  )
}
