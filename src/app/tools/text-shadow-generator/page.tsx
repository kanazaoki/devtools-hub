import type { Metadata } from 'next'
import Link from 'next/link'
import { tools } from '@/data/tools'
import { AdSense } from '@/components/AdSense'
import { BoothCTA } from '@/components/BoothCTA'
import { ToolCard } from '@/components/ToolCard'
import { CssTextShadowGenerator } from '@/components/tools/CssTextShadowGenerator'
import { ToolJsonLd } from '@/components/ToolJsonLd'

const tool = tools.find((t) => t.slug === 'text-shadow-generator')!

export const metadata: Metadata = {
  title: `${tool.name} — ${tool.tagline}`,
  description: tool.description,
  openGraph: {
    title: `${tool.name} | devtools-hub`,
    description: tool.description,
    images: [{ url: '/opengraph-image', width: 1200, height: 630 }],
  },
}

export default function TextShadowGeneratorPage() {
  const relatedTools = tools
    .filter((t) => t.slug !== tool.slug && t.tags.some((tag) => tool.tags.includes(tag)))
    .slice(0, 3)

  return (
    <main className="py-10">
      <ToolJsonLd tool={tool} />
      <nav className="mb-8 flex items-center gap-2 text-xs text-muted">
        <Link href="/" className="transition-colors hover:text-primary">ツール一覧</Link>
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
            <span key={tag} className="rounded border border-border px-2.5 py-0.5 text-xs text-dim">{tag}</span>
          ))}
        </div>
      </header>

      <p className="mb-8 max-w-2xl text-sm leading-relaxed text-primary">{tool.description}</p>

      <AdSense slot="1010101086" format="horizontal" className="mb-8" />

      <section className="mb-8 overflow-hidden rounded-lg border border-border bg-surface" aria-label="CSS Text Shadow Generator ツール">
        <div className="border-b border-border px-5 py-3">
          <p className="font-mono text-xs uppercase tracking-widest text-muted">CSS Text Shadow Generator</p>
        </div>
        <div className="p-5 sm:p-6">
          <CssTextShadowGenerator />
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

      <div className="mb-8">
        <BoothCTA boothUrl={tool.boothUrl} toolName={tool.name} desktopFeatures={tool.desktopFeatures} />
      </div>

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
