import type { Metadata } from 'next'
import Link from 'next/link'
import { tools } from '@/data/tools'
import { AdSense } from '@/components/AdSense'
import { BoothCTA } from '@/components/BoothCTA'
import { ToolCard } from '@/components/ToolCard'
import { JsonStudio } from '@/components/tools/JsonStudio'
import { ToolJsonLd } from '@/components/ToolJsonLd'
import { DesktopOnlyFeatures } from '@/components/DesktopOnlyFeatures'
import { SeoArticle } from '@/components/SeoArticle'
import { getMetaDescription } from '@/data/seo-content'

const tool = tools.find((t) => t.slug === 'json-studio')!

export const metadata: Metadata = {
  title: `${tool.name} — ${tool.tagline}`,
  description: getMetaDescription('json-studio', tool.description),
  alternates: {
    canonical: 'https://devtools-hub.vercel.app/tools/json-studio',
  },
  openGraph: {
    title: `${tool.name} | devtools-hub`,
    description: getMetaDescription('json-studio', tool.description),
    images: [{ url: '/tools/json-studio/opengraph-image', width: 1200, height: 630 }],
  },
}

export default function JsonStudioPage() {
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
          <a
            href={tool.boothUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 inline-flex items-center gap-2 rounded-md bg-teal px-4 py-2 text-sm font-semibold text-bg transition-opacity hover:opacity-80"
          >
            BOOTHで見る（有料版）
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          </a>
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

      <AdSense slot="1010101010" format="horizontal" className="mb-8" />

      <section className="mb-8 overflow-hidden rounded-lg border border-border bg-surface" aria-label="JSON Studio ツール">
        <div className="border-b border-border px-5 py-3">
          <p className="font-mono text-xs uppercase tracking-widest text-muted">JSON Studio</p>
        </div>
        <div className="p-5 sm:p-6">
          <JsonStudio />
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

      <SeoArticle slug="json-studio" />

      <AdSense slot="1010101011" format="rectangle" className="mb-12" />

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
