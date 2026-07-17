import type { Metadata } from 'next'
import Link from 'next/link'
import { tools } from '@/data/tools'
import { ToolGrid } from '@/components/ToolGrid'
import { RecentlyViewed } from '@/components/RecentlyViewed'
import { AdSense } from '@/components/AdSense'
import { getCategoryBySlug } from '@/data/categories'

const CATEGORY_COUNT = 8
const desktopCount = tools.filter((t) => t.boothUrl).length

const FEATURED_SLUGS = ['webp-studio', 'resize-image', 'mockup-builder'] as const

export const metadata: Metadata = {
  title: 'devtools-hub — 開発者・クリエイター向け無料 Web ツール集',
  description:
    '個人開発者が作った開発・デザイン向けツールを無料公開。カラーコード変換、グラデーションエディタ、画像変換、テキストレイアウト確認など。デスクトップ版は BOOTH で販売中。',
  alternates: {
    canonical: 'https://devtools-hub.vercel.app',
  },
}

export default function Home({ searchParams }: { searchParams: { cat?: string; q?: string } }) {
  const initialCategory = searchParams.cat ? (getCategoryBySlug(searchParams.cat)?.tag ?? null) : null
  const initialQuery = searchParams.q ?? ''
  const featuredTools = FEATURED_SLUGS.map((slug) => tools.find((t) => t.slug === slug)!).filter(Boolean)

  return (
    <main className="py-12">
      {/* Hero — ドットグリッド背景 */}
      <section className="relative mb-10 overflow-hidden rounded-xl border border-border bg-surface px-8 py-14 text-center">
        {/* ドットグリッド */}
        <div className="dot-grid absolute inset-0 opacity-30 pointer-events-none" />
        {/* 下端グラデーションフェード */}
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-surface to-transparent pointer-events-none" />

        <div className="relative z-10">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-teal mb-4">
            Free Web Tools
          </p>
          <h1 className="text-3xl font-bold text-bright sm:text-4xl leading-tight">
            開発者・クリエイター向け<br />
            無料ツール集
          </h1>
          <p className="mt-4 mx-auto max-w-md text-sm leading-relaxed text-dim">
            デザイン・開発・画像処理に使えるツールをブラウザでそのまま使えます。<br />
            デスクトップ版はより多くの機能付きで BOOTH にて販売中。
          </p>

          {/* スタッツバー */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-xs text-muted">
            {[
              { value: tools.length, label: 'ツール' },
              { value: CATEGORY_COUNT, label: 'カテゴリ' },
              { value: `${desktopCount}本`, label: 'デスクトップ版' },
            ].map(({ value, label }, i) => (
              <span key={label} className="flex items-center gap-3">
                {i > 0 && <span className="text-border select-none" aria-hidden="true">·</span>}
                <span>
                  <span className="font-semibold text-primary">{value}</span>{' '}{label}
                </span>
              </span>
            ))}
            <span className="text-border select-none" aria-hidden="true">·</span>
            <span>完全無料</span>
            <span className="text-border select-none" aria-hidden="true">·</span>
            <span>ブラウザで即利用</span>
          </div>
        </div>
      </section>

      {/* AdSense — ヒーロー直下 */}
      <AdSense slot="1651467900" format="horizontal" className="mb-10" />

      {/* 主力ツール */}
      <section className="mb-10">
        <p className="mb-4 font-mono text-[11px] uppercase tracking-widest text-muted">Featured</p>
        <div className="grid gap-4 sm:grid-cols-3">
          {featuredTools.map((tool) => (
            <Link
              key={tool.slug}
              href={`/tools/${tool.slug}`}
              className="group flex flex-col rounded-lg border border-border bg-surface p-5 transition-colors hover:border-teal/50"
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="font-mono text-sm font-semibold text-bright group-hover:text-teal transition-colors">
                  {tool.name}
                </span>
                <span className="rounded bg-teal/10 px-2 py-0.5 font-mono text-[10px] text-teal">
                  Web 無料 + 有料版あり
                </span>
              </div>
              <p className="mb-4 text-xs leading-relaxed text-dim flex-1">{tool.tagline}</p>
              <div className="space-y-1">
                {tool.desktopFeatures.slice(0, 2).map((f) => (
                  <p key={f} className="flex items-start gap-1.5 text-xs text-muted">
                    <span className="mt-0.5 shrink-0 text-teal">+</span>
                    {f}
                  </p>
                ))}
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* 最近見たツール */}
      <RecentlyViewed />

      {/* ツールグリッド */}
      <section id="tools">
        <p className="mb-3 font-mono text-[11px] uppercase tracking-widest text-muted">
          All Tools
        </p>
        <ToolGrid initialCategory={initialCategory} initialQuery={initialQuery} />
      </section>

      {/* サービス紹介 */}
      <section className="mt-16 mb-6 grid gap-6 sm:grid-cols-3 text-sm">
        <div className="rounded-lg border border-border bg-surface p-6">
          <p className="font-mono text-xs uppercase tracking-widest text-teal mb-3">No Install</p>
          <h2 className="font-semibold text-bright mb-2">インストール不要</h2>
          <p className="text-dim leading-relaxed">
            すべてのツールはブラウザだけで動作します。
            アカウント登録なしで、開いてすぐに使えます。
          </p>
        </div>
        <div className="rounded-lg border border-border bg-surface p-6">
          <p className="font-mono text-xs uppercase tracking-widest text-teal mb-3">Privacy First</p>
          <h2 className="font-semibold text-bright mb-2">データはブラウザ内で完結</h2>
          <p className="text-dim leading-relaxed">
            入力したテキスト・画像・コードはサーバーに送信されません。
            すべての処理はあなたのブラウザ内で行われます。
          </p>
        </div>
        <div className="rounded-lg border border-border bg-surface p-6">
          <p className="font-mono text-xs uppercase tracking-widest text-teal mb-3">Desktop Apps</p>
          <h2 className="font-semibold text-bright mb-2">デスクトップ版も提供</h2>
          <p className="text-dim leading-relaxed">
            一部ツールはファイル保存・ドラッグ＆ドロップ対応のデスクトップアプリを
            <a href="https://knkk.booth.pm/" target="_blank" rel="noopener noreferrer" className="text-teal hover:underline ml-1">BOOTH</a>
            で配布しています。
          </p>
        </div>
      </section>

{/* AdSense — グリッド下 */}
      <AdSense slot="1651467900" format="horizontal" className="mt-12" />
    </main>
  )
}
