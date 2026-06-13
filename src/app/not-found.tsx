import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'ページが見つかりません',
}

export default function NotFound() {
  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center py-24 text-center">
      <p className="font-mono text-6xl font-bold text-border">404</p>
      <h1 className="mt-4 text-xl font-semibold text-primary">
        ページが見つかりません
      </h1>
      <p className="mt-2 text-sm text-dim">
        お探しのページは存在しないか、移動した可能性があります。
      </p>
      <Link
        href="/"
        className="mt-8 inline-flex items-center gap-2 rounded-md border border-border px-5 py-2.5 text-sm text-primary transition-colors hover:border-border-hi hover:text-bright"
      >
        ← ツール一覧に戻る
      </Link>
    </main>
  )
}
