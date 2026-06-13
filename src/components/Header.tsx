import Link from 'next/link'

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-bg/90 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link
          href="/"
          className="font-mono text-sm font-semibold tracking-widest text-primary uppercase hover:text-teal transition-colors"
        >
          devtools-hub
        </Link>
        <nav className="flex items-center gap-6">
          <Link
            href="/"
            className="text-sm text-dim hover:text-primary transition-colors"
          >
            ツール一覧
          </Link>
          <a
            href="https://knkk.booth.pm/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-dim hover:text-teal transition-colors"
          >
            BOOTH ショップ
          </a>
        </nav>
      </div>
    </header>
  )
}
