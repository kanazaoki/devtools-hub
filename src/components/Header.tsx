import Link from 'next/link'

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-bg/90 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link
          href="/"
          className="flex items-center gap-1.5 font-mono text-sm font-semibold shrink-0 group"
        >
          <span className="text-teal">&gt;_</span>
          <span className="tracking-widest text-primary uppercase group-hover:text-teal transition-colors">devtools-hub</span>
        </Link>
        <nav className="flex items-center gap-3 sm:gap-5 min-w-0">
          <Link
            href="/"
            className="text-xs sm:text-sm text-dim hover:text-primary transition-colors whitespace-nowrap"
          >
            ツール一覧
          </Link>
          <Link
            href="/category"
            className="text-xs sm:text-sm text-dim hover:text-primary transition-colors whitespace-nowrap"
          >
            カテゴリ
          </Link>
          <Link
            href="/articles"
            className="text-xs sm:text-sm text-dim hover:text-primary transition-colors whitespace-nowrap"
          >
            記事
          </Link>
          <Link
            href="/guide"
            className="hidden sm:inline text-xs sm:text-sm text-dim hover:text-primary transition-colors whitespace-nowrap"
          >
            使い方
          </Link>
          <a
            href="https://knkk.booth.pm/"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex items-center gap-1 rounded border border-teal/30 px-2.5 py-1 text-xs text-teal hover:bg-teal/10 transition-colors whitespace-nowrap"
          >
            BOOTH
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          </a>
        </nav>
      </div>
    </header>
  )
}
