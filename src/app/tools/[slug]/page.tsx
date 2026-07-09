import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { tools, getToolBySlug } from '@/data/tools'
import { AdSense } from '@/components/AdSense'
import { BoothCTA } from '@/components/BoothCTA'
import { ToolCard } from '@/components/ToolCard'
import { ToolJsonLd } from '@/components/ToolJsonLd'
import { ToolBreadcrumb } from '@/components/ToolBreadcrumb'
import { SeoArticle } from '@/components/SeoArticle'

type Props = {
  params: { slug: string }
}

export function generateStaticParams() {
  return tools.map((tool) => ({ slug: tool.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const tool = getToolBySlug(params.slug)
  if (!tool) return { title: 'ツールが見つかりません' }

  return {
    title: `${tool.name} — ${tool.tagline}`,
    description: tool.description.substring(0, 150),
    alternates: {
      canonical: `https://devtools-hub.vercel.app/tools/${params.slug}`,
    },
    openGraph: {
      title: `${tool.name} | devtools-hub`,
      description: tool.description.substring(0, 150),
      images: [{ url: `/tools/${params.slug}/opengraph-image`, width: 1200, height: 630 }],
    },
  }
}

export default function ToolPage({ params }: Props) {
  const tool = getToolBySlug(params.slug)
  if (!tool) notFound()

  const relatedTools = tools
    .filter(
      (t) =>
        t.slug !== tool.slug &&
        t.tags.some((tag) => tool.tags.includes(tag))
    )
    .slice(0, 4)

  return (
    <main className="py-10">
      <ToolJsonLd tool={tool} />
      <ToolBreadcrumb tool={tool} />

      {/* ツールヘッダー */}
      <header className="mb-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-mono text-2xl font-bold text-bright">{tool.name}</h1>
            <p className="mt-1 text-base text-dim">{tool.tagline}</p>
          </div>
          <a
            href={tool.boothUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 inline-flex items-center gap-2 rounded-md bg-teal px-4 py-2 text-sm font-semibold text-bg transition-opacity hover:opacity-80"
          >
            BOOTHで見る（有料版）
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          </a>
        </div>

        {/* タグ */}
        <div className="mt-3 flex flex-wrap gap-2">
          {tool.tags.map((tag) => (
            <span
              key={tag}
              className="rounded border border-border px-2.5 py-0.5 text-xs text-dim"
            >
              {tag}
            </span>
          ))}
        </div>
      </header>

      {/* 説明文 */}
      <p className="mb-8 max-w-2xl text-sm leading-relaxed text-primary">
        {tool.description}
      </p>

      {/* AdSense — 説明文直後 */}
      <AdSense slot="1651467900" format="horizontal" className="mb-8" />

      {/* デモエリア */}
      <section
        className="mb-8 overflow-hidden rounded-lg border border-border bg-surface"
        aria-label="ツールデモエリア"
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <p className="font-mono text-xs uppercase tracking-widest text-muted">
            Web Demo
          </p>
          <span className="rounded bg-border px-2 py-0.5 font-mono text-[10px] text-dim">
            Coming Soon
          </span>
        </div>
        <div className="flex items-center gap-5 px-6 py-8">
          <div className="shrink-0 rounded-lg border border-border bg-surface-hi p-3">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-dim"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-primary">Web 版を準備中</p>
            <p className="mt-0.5 text-xs text-dim">
              このツールの Web 版は近日公開予定です。
            </p>
            <a
              href={tool.boothUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-block text-xs text-teal hover:underline"
            >
              今すぐ使うなら BOOTH のデスクトップ版 →
            </a>
          </div>
        </div>
      </section>

      {/* 機能リスト */}
      <section className="mb-8">
        <h2 className="mb-4 font-mono text-xs font-semibold uppercase tracking-widest text-muted">
          Features
        </h2>
        <ul className="grid gap-2 sm:grid-cols-2">
          {tool.features.map((feature) => (
            <li key={feature} className="flex items-start gap-3 text-sm text-primary">
              <span className="mt-0.5 shrink-0 text-teal" aria-hidden="true">
                ✓
              </span>
              {feature}
            </li>
          ))}
        </ul>
      </section>

      {/* 区切り線 */}
      <hr className="mb-8 border-border" />

      {/* BOOTH CTA */}
      <div className="mb-8">
        <BoothCTA boothUrl={tool.boothUrl} toolName={tool.name} desktopFeatures={tool.desktopFeatures} />
      </div>

      <SeoArticle slug={params.slug} />

      {/* AdSense — CTA直後 */}
      <AdSense slot="6712222897" format="rectangle" className="mb-12" />

      {/* 関連ツール */}
      {relatedTools.length > 0 && (
        <section className="mt-4">
          <div className="mb-5 flex items-center gap-3">
            <h2 className="font-mono text-[11px] font-semibold uppercase tracking-widest text-muted">
              Related Tools
            </h2>
            <div className="h-px flex-1 bg-border" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {relatedTools.map((t) => (
              <ToolCard key={t.slug} tool={t} />
            ))}
          </div>
        </section>
      )}
    </main>
  )
}
