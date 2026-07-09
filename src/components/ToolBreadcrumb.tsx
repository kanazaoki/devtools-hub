import Link from 'next/link'
import { CATEGORIES } from '@/data/categories'

interface Props {
  tool: { name: string; tags: string[] }
}

export function ToolBreadcrumb({ tool }: Props) {
  const matchedCats = CATEGORIES.filter((c) => tool.tags.includes(c.tag))

  return (
    <nav className="mb-8 flex flex-wrap items-center gap-2 text-xs text-muted">
      <Link href="/" className="transition-colors hover:text-primary shrink-0">
        ツール一覧
      </Link>

      {matchedCats.length > 0 ? (
        matchedCats.map((cat) => (
          <span key={cat.slug} className="flex items-center gap-2 shrink-0">
            <span className="text-border">/</span>
            <Link href={`/?cat=${cat.slug}`} className="transition-colors hover:text-primary">
              {cat.label}
            </Link>
          </span>
        ))
      ) : (
        // CATEGORIESに一致しないタグ（'開発ツール', 'Web開発' 等）はテキストのみ
        tool.tags[0] && (
          <span className="flex items-center gap-2 shrink-0">
            <span className="text-border">/</span>
            <span>{tool.tags[0]}</span>
          </span>
        )
      )}

      <span className="text-border shrink-0">/</span>
      <span className="font-mono text-dim">{tool.name}</span>
    </nav>
  )
}
