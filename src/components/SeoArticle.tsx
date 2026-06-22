import { seoContent } from '@/data/seo-content'

interface SeoArticleProps {
  slug: string
}

export function SeoArticle({ slug }: SeoArticleProps) {
  const content = seoContent[slug]
  if (!content) return null

  return (
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
  )
}
