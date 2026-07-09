import Link from 'next/link'
import { CATEGORIES } from '@/data/categories'

interface Props {
  tool: { name: string; tags: string[] }
}

export function ToolBreadcrumb({ tool }: Props) {
  const primaryCat = CATEGORIES.find((c) => tool.tags.includes(c.tag)) ?? null
  return (
    <nav className="mb-8 flex items-center gap-2 text-xs text-muted">
      <Link href="/" className="transition-colors hover:text-primary">
        ツール一覧
      </Link>
      {primaryCat && (
        <>
          <span className="text-border">/</span>
          <Link href={`/?cat=${primaryCat.slug}`} className="transition-colors hover:text-primary">
            {primaryCat.label}
          </Link>
        </>
      )}
      <span className="text-border">/</span>
      <span className="font-mono text-dim">{tool.name}</span>
    </nav>
  )
}
