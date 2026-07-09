import type { Metadata } from 'next'
import Link from 'next/link'
import { tools } from '@/data/tools'
import { AdSense } from '@/components/AdSense'
import { ToolCard } from '@/components/ToolCard'
import { ExifViewer } from '@/components/tools/ExifViewer'
import { ToolJsonLd } from '@/components/ToolJsonLd'
import { ToolBreadcrumb } from '@/components/ToolBreadcrumb'
import { SeoArticle } from '@/components/SeoArticle'
import { getMetaDescription } from '@/data/seo-content'

const tool = tools.find((t) => t.slug === 'exif-viewer')!

export const metadata: Metadata = {
  title: `${tool.name} — ${tool.tagline}`,
  description: getMetaDescription('exif-viewer', tool.description),
  alternates: { canonical: 'https://devtools-hub.vercel.app/tools/exif-viewer' },
  openGraph: {
    title: `${tool.name} | devtools-hub`,
    description: getMetaDescription('exif-viewer', tool.description),
    images: [{ url: '/tools/exif-viewer/opengraph-image', width: 1200, height: 630 }],
  },
}

export default function ExifViewerPage() {
  const relatedTools = tools
    .filter((t) => t.slug !== tool.slug && t.tags.some((tag) => tool.tags.includes(tag)))
    .slice(0, 3)

  return (
    <main className="py-10">
      <ToolJsonLd tool={tool} />

      <ToolBreadcrumb tool={tool} />

      <header className="mb-4">
        <h1 className="text-2xl font-bold text-bright">{tool.name}</h1>
        <p className="mt-1 text-sm text-teal">{tool.tagline}</p>
      </header>

      <p className="mb-8 text-sm text-muted leading-relaxed">{tool.description}</p>

      <AdSense slot="1651467900" format="horizontal" className="mb-8" />

      <section className="mb-10">
        <ExifViewer />
      </section>

      <section className="mb-10">
        <h2 className="mb-3 text-sm font-semibold text-primary uppercase tracking-widest">Features</h2>
        <ul className="space-y-1.5">
          {tool.features.map((f) => (
            <li key={f} className="flex gap-2 text-sm text-muted">
              <span className="text-teal shrink-0">✓</span>
              <span>{f}</span>
            </li>
          ))}
        </ul>
      </section>

      <hr className="mb-10 border-border" />

      <SeoArticle slug="exif-viewer" />

      <AdSense slot="6712222897" format="rectangle" className="mb-12" />

      {relatedTools.length > 0 && (
        <section>
          <h2 className="mb-4 text-sm font-semibold text-primary uppercase tracking-widest">Related Tools</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {relatedTools.map((t) => <ToolCard key={t.slug} tool={t} />)}
          </div>
        </section>
      )}
    </main>
  )
}
