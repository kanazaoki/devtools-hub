import { MetadataRoute } from 'next'
import { tools } from '@/data/tools'
import { CATEGORIES } from '@/data/categories'
import { articles } from '@/data/articles'

const BASE = 'https://devtools-hub.dev'

export default function sitemap(): MetadataRoute.Sitemap {
  const toolUrls: MetadataRoute.Sitemap = tools.map((tool) => ({
    url: `${BASE}/tools/${tool.slug}`,
    lastModified: tool.releasedAt ? new Date(tool.releasedAt) : new Date('2026-06-01'),
    changeFrequency: 'monthly',
    priority: 0.8,
  }))

  const articleUrls: MetadataRoute.Sitemap = articles.map((a) => ({
    url: `${BASE}/articles/${a.slug}`,
    lastModified: new Date(a.publishedAt),
    changeFrequency: 'monthly',
    priority: 0.7,
  }))

  const categoryUrls: MetadataRoute.Sitemap = CATEGORIES.map((c) => ({
    url: `${BASE}/category/${c.slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.6,
  }))

  return [
    {
      url: BASE,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${BASE}/about`,
      lastModified: new Date('2026-06-01'),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${BASE}/privacy-policy`,
      lastModified: new Date('2026-06-01'),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${BASE}/contact`,
      lastModified: new Date('2026-06-01'),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${BASE}/category`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.6,
    },
    {
      url: `${BASE}/articles`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.6,
    },
    ...categoryUrls,
    ...articleUrls,
    ...toolUrls,
  ]
}
