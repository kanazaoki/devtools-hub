import Link from 'next/link'

export function Footer() {
  return (
    <footer className="border-t border-border mt-24">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="font-mono text-xs font-semibold tracking-widest text-primary uppercase">
              devtools-hub
            </p>
            <p className="mt-2 text-sm text-dim max-w-xs">
              開発者・クリエイター向け無料 Web ツール集。<br />デスクトップ版は BOOTH で販売中。
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted mb-1">
              Links
            </p>
            <Link href="/" className="text-sm text-dim hover:text-primary transition-colors">
              ツール一覧
            </Link>
            <a
              href="https://knkk.booth.pm/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-dim hover:text-teal transition-colors"
            >
              BOOTH ショップ →
            </a>
            <Link href="/about" className="text-sm text-dim hover:text-primary transition-colors">
              このサイトについて
            </Link>
            <Link href="/contact" className="text-sm text-dim hover:text-primary transition-colors">
              お問い合わせ
            </Link>
            <Link href="/privacy-policy" className="text-sm text-dim hover:text-primary transition-colors">
              プライバシーポリシー
            </Link>
            <Link href="/terms" className="text-sm text-dim hover:text-primary transition-colors">
              利用規約
            </Link>
          </div>
        </div>
        <p className="mt-8 text-xs text-muted">
          © {new Date().getFullYear()} devtools-hub. All tools are free to use.
        </p>
      </div>
    </footer>
  )
}
