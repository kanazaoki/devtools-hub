import { seoContent } from '@/data/seo-content'
import { RelatedGuides } from './RelatedGuides'

interface SeoArticleProps {
  slug: string
}

export function SeoArticle({ slug }: SeoArticleProps) {
  const content = seoContent[slug]

  // The how-to guide link is rendered for every tool (RelatedGuides returns
  // null when no guide references this slug), independent of SEO content —
  // so wiring it here surfaces it on all tool pages automatically.
  const faqSchema = content && {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: content.sections.map((s) => ({
      '@type': 'Question',
      name: s.title,
      acceptedAnswer: { '@type': 'Answer', text: s.body },
    })),
  }

  return (
    <>
      <RelatedGuides toolSlug={slug} />
      {content && (
        <>
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
          />
          <article className="mb-12">
        <hr className="mb-8 border-border" />
        <h2 className="mb-3 text-lg font-bold text-bright">{content.heading}</h2>
        <p className="mb-6 text-sm leading-relaxed text-primary">{content.intro}</p>
        <div className="space-y-6">
          {content.sections.map((section) => (
            <div key={section.title}>
              <h3 className="mb-2 text-sm font-semibold text-bright">{section.title}</h3>
              <p className="text-sm leading-relaxed text-primary">{section.body}</p>
            </div>
          ))}
        </div>
          </article>
        </>
      )}
    </>
  )
}
