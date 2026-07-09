import { redirect, notFound } from 'next/navigation'
import { CATEGORIES, getCategoryBySlug } from '@/data/categories'

interface Props {
  params: { slug: string }
}

export function generateStaticParams() {
  return CATEGORIES.map((c) => ({ slug: c.slug }))
}

export default function CategoryPage({ params }: Props) {
  const cat = getCategoryBySlug(params.slug)
  if (!cat) notFound()
  redirect(`/?cat=${cat.slug}`)
}
