import type { Metadata } from 'next'
import Link from 'next/link'
import { tools } from '@/data/tools'
import { AdSense } from '@/components/AdSense'
import { BoothCTA } from '@/components/BoothCTA'
import { ToolCard } from '@/components/ToolCard'
import { BezierCurveEditor } from '@/components/tools/BezierCurveEditor'
import { ToolJsonLd } from '@/components/ToolJsonLd'
import { DesktopOnlyFeatures } from '@/components/DesktopOnlyFeatures'
import { SeoArticle } from '@/components/SeoArticle'
import { getMetaDescription } from '@/data/seo-content'

const tool = tools.find((t) => t.slug === 'bezier-curve-editor')!

export const metadata: Metadata = {
  title: `${tool.name} — ${tool.tagline}`,
  description: getMetaDescription('bezier-curve-editor', tool.description),
  openGraph: {
    title: `${tool.name} | devtools-hub`,
    description: getMetaDescription('bezier-curve-editor', tool.description),
    images: [{ url: '/opengraph-image', width: 1200, height: 630 }],
  },
}

export default function BezierCurveEditorPage() {
  const relatedTools = tools
    .filter((t) => t.slug !== tool.slug && t.tags.some((tag) => tool.tags.includes(tag)))
    .slice(0, 3)

  return (
    <main className="py-10">
      <ToolJsonLd tool={tool} />
      <nav className="mb-8 flex items-center gap-2 text-xs text-muted">
        <Link href="/" className="transition-colors hover:text-primary">
          ツール一覧
        </Link>
        <span className="text-border">/</span>
        <span className="font-mono text-dim">{tool.name}</span>
      </nav>

      <header className="mb-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-mono text-2xl font-bold text-bright">{tool.name}</h1>
            <p className="mt-1 text-base text-dim">{tool.tagline}</p>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {tool.tags.map((tag) => (
            <span key={tag} className="rounded border border-border px-2.5 py-0.5 text-xs text-dim">
              {tag}
            </span>
          ))}
        </div>
      </header>

      <p className="mb-8 max-w-2xl text-sm leading-relaxed text-primary">{tool.description}</p>

      <AdSense slot="1010101086" format="horizontal" className="mb-8" />

      <section className="mb-8 overflow-hidden rounded-lg border border-border bg-surface" aria-label="Bezier Curve Editor ツール">
        <div className="border-b border-border px-5 py-3">
          <p className="font-mono text-xs uppercase tracking-widest text-muted">Bezier Curve Editor</p>
        </div>
        <div className="p-5 sm:p-6">
          <BezierCurveEditor />
        </div>
      </section>

      <section className="mb-8">
        <h2 className="mb-4 font-mono text-xs font-semibold uppercase tracking-widest text-muted">Features</h2>
        <ul className="grid gap-2 sm:grid-cols-2">
          {tool.features.map((feature) => (
            <li key={feature} className="flex items-start gap-3 text-sm text-primary">
              <span className="mt-0.5 shrink-0 text-teal" aria-hidden="true">✓</span>
              {feature}
            </li>
          ))}
        </ul>
      </section>

      <DesktopOnlyFeatures tool={tool} />

      <hr className="mb-8 border-border" />

      <div className="mb-8">
        <BoothCTA boothUrl={tool.boothUrl} toolName={tool.name} desktopFeatures={tool.desktopFeatures} />
      </div>

      <SeoArticle slug="bezier-curve-editor" />

      <AdSense slot="1010101087" format="rectangle" className="mb-12" />

      {relatedTools.length > 0 && (
        <section>
          <h2 className="mb-4 font-mono text-xs font-semibold uppercase tracking-widest text-muted">Related Tools</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {relatedTools.map((t) => (
              <ToolCard key={t.slug} tool={t} />
            ))}
          </div>
        </section>
      )}
    </main>
  )
}
