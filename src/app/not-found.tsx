import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'ページが見つかりません',
}

const QUICK_LINKS = [
  { href: '/tools/json-studio', label: 'JSON Studio' },
  { href: '/tools/base64-studio', label: 'base64-studio' },
  { href: '/tools/color-format-converter', label: 'Color Converter' },
  { href: '/tools/regex-studio', label: 'Regex Studio' },
  { href: '/tools/uuid-generator', label: 'UUID Generator' },
  { href: '/tools/css-grid-generator', label: 'CSS Grid Generator' },
]

export default function NotFound() {
  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center py-24 text-center">
      <p className="font-mono text-7xl font-bold text-border select-none">404</p>
      <h1 className="mt-4 text-xl font-semibold text-primary">
        ページが見つかりません
      </h1>
      <p className="mt-2 text-sm text-dim max-w-sm">
        お探しのページは存在しないか、移動した可能性があります。
      </p>

      <Link
        href="/"
        className="mt-8 inline-flex items-center gap-2 rounded-lg bg-teal px-5 py-2.5 font-mono text-sm font-semibold text-bg transition-opacity hover:opacity-80"
      >
        ツール一覧へ
      </Link>

      <div className="mt-12 w-full max-w-md">
        <p className="mb-3 font-mono text-[11px] uppercase tracking-widest text-muted">よく使われるツール</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {QUICK_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded border border-border bg-surface px-3 py-2 font-mono text-xs text-dim transition-colors hover:border-teal/40 hover:text-teal"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </main>
  )
}
