import type { Metadata } from 'next'
import { tools } from '@/data/tools'
import { ToolCard } from '@/components/ToolCard'
import { AdSense } from '@/components/AdSense'

export const metadata: Metadata = {
  title: 'devtools-hub — 開発者・クリエイター向け無料 Web ツール集',
  description:
    '個人開発者が作った開発・デザイン向けツールを無料公開。カラーコード変換、グラデーションエディタ、画像変換、テキストレイアウト確認など。デスクトップ版は BOOTH で配布中。',
}

export default function Home() {
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
            デザイン・開発・画像処理に使えるツールをブラウザでそのまま使えます。
            デスクトップ版はより多くの機能付きで BOOTH にて配布中。
          </p>

          {/* スタッツバー */}
          <div className="mt-6 flex items-center justify-center gap-4 text-xs text-muted">
            <span>
              <span className="font-semibold text-primary">{tools.length}</span> ツール
            </span>
            <span className="text-border select-none">·</span>
            <span>完全無料</span>
            <span className="text-border select-none">·</span>
            <span>インストール不要</span>
            <span className="text-border select-none">·</span>
            <span>ブラウザで即利用</span>
          </div>
        </div>
      </section>

      {/* AdSense — ヒーロー直下 */}
      <AdSense slot="1234567890" format="horizontal" className="mb-10" />

      {/* ツールグリッド */}
      <section>
        <p className="mb-3 font-mono text-[11px] uppercase tracking-widest text-muted">
          All Tools
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {tools.map((tool) => (
            <ToolCard key={tool.slug} tool={tool} />
          ))}
        </div>
      </section>

      {/* AdSense — グリッド下 */}
      <AdSense slot="0987654321" format="horizontal" className="mt-12" />
    </main>
  )
}
