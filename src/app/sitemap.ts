import { MetadataRoute } from 'next'
import { tools } from '@/data/tools'

const BASE = 'https://devtools-hub.vercel.app'

export default function sitemap(): MetadataRoute.Sitemap {
  const toolUrls: MetadataRoute.Sitemap = tools.map((tool) => ({
    url: `${BASE}/tools/${tool.slug}`,
    lastModified: tool.releasedAt ? new Date(tool.releasedAt) : new Date('2026-06-01'),
    changeFrequency: 'monthly',
    priority: 0.8,
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
    ...toolUrls,
  ]
}
