import type { Metadata } from 'next'
import Link from 'next/link'
import { tools } from '@/data/tools'
import { AdSense } from '@/components/AdSense'
import { ToolCard } from '@/components/ToolCard'
import { JwtBuilder } from '@/components/tools/JwtBuilder'
import { ToolJsonLd } from '@/components/ToolJsonLd'
import { ToolBreadcrumb } from '@/components/ToolBreadcrumb'
import { SeoArticle } from '@/components/SeoArticle'
import { getMetaDescription } from '@/data/seo-content'

const tool = tools.find((t) => t.slug === 'jwt-builder')!

export const metadata: Metadata = {
  title: `${tool.name} — ${tool.tagline}`,
  description: getMetaDescription('jwt-builder', tool.description),
  alternates: { canonical: 'https://devtools-hub.vercel.app/tools/jwt-builder' },
  openGraph: {
    title: `${tool.name} | devtools-hub`,
    description: getMetaDescription('jwt-builder', tool.description),
    images: [{ url: '/tools/jwt-builder/opengraph-image', width: 1200, height: 630 }],
  },
}

export default function JwtBuilderPage() {
  const relatedTools = tools
    .filter((t) => t.slug !== tool.slug && t.tags.some((tag) => tool.tags.includes(tag)))
    .slice(0, 3)

  return (
    <main className="py-10">
      <ToolJsonLd tool={tool} />
      <ToolBreadcrumb tool={tool} />

      <header className="mb-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-mono text-2xl font-bold text-bright">{tool.name}</h1>
            <p className="mt-1 text-base text-dim">{tool.tagline}</p>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {tool.tags.map((tag) => (
            <span key={tag} className="rounded border border-border px-2.5 py-0.5 text-xs text-dim">{tag}</span>
          ))}
        </div>
      </header>

      <p className="mb-8 max-w-2xl text-sm leading-relaxed text-primary">{tool.description}</p>

      <AdSense slot="1651467900" format="horizontal" className="mb-8" />

      <section className="mb-8 overflow-hidden rounded-lg border border-border bg-surface" aria-label="JWT Builder ツール">
        <div className="border-b border-border px-5 py-3">
          <p className="font-mono text-xs uppercase tracking-widest text-muted">JWT Builder</p>
        </div>
        <div className="p-5 sm:p-6">
          <JwtBuilder />
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

      <hr className="mb-8 border-border" />
      <SeoArticle slug="jwt-builder" />
      <AdSense slot="6712222897" format="rectangle" className="mb-12" />

      {relatedTools.length > 0 && (
        <section>
          <h2 className="mb-4 font-mono text-xs font-semibold uppercase tracking-widest text-muted">Related Tools</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {relatedTools.map((t) => <ToolCard key={t.slug} tool={t} />)}
          </div>
        </section>
      )}
    </main>
  )
}
