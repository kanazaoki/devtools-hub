import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'お問い合わせ',
  description: 'devtools-hub へのお問い合わせ。バグ報告・機能リクエスト・その他ご意見はメールまたはリクエストフォームからどうぞ。',
  alternates: {
    canonical: 'https://devtools-hub.vercel.app/contact',
  },
}

export default function ContactPage() {
  return (
    <main className="py-12 max-w-2xl">
      <h1 className="font-mono text-2xl font-bold text-bright mb-2">お問い合わせ</h1>
      <p className="text-sm text-muted mb-10">バグ報告・機能リクエスト・その他ご意見をお待ちしています。</p>

      <div className="space-y-6">
        <div className="rounded-lg border border-border bg-surface p-6">
          <p className="font-mono text-xs uppercase tracking-widest text-teal mb-3">Email</p>
          <h2 className="text-base font-semibold text-bright mb-2">メールで送る</h2>
          <p className="text-sm text-dim leading-relaxed mb-4">
            バグ報告・ご質問など、個別対応が必要なお問い合わせはメールでどうぞ。
            返信までに数日かかる場合があります。
          </p>
          <a
            href="mailto:koma.games26@gmail.com"
            className="inline-flex items-center gap-2 font-mono text-sm text-teal hover:underline"
          >
            koma.games26@gmail.com
          </a>
          <div className="mt-4 space-y-1.5 text-xs text-dim">
            <p>・ツールの不具合は再現手順を添えていただくとスムーズです。</p>
            <p>・広告に関するお問い合わせは Google AdSense サポートへお願いします。</p>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-surface p-6">
          <p className="font-mono text-xs uppercase tracking-widest text-teal mb-3">Request</p>
          <h2 className="text-base font-semibold text-bright mb-2">ツールをリクエストする</h2>
          <p className="text-sm text-dim leading-relaxed mb-4">
            「こんなツールがほしい」というアイデアは専用フォームから送れます。
          </p>
          <a
            href="https://docs.google.com/forms/d/e/1FAIpQLSc9Mo1Ci3bSE6mv59aFHCF3C4hgve0XwYs-kpE24XlxYzvhXw/viewform"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface-hi px-4 py-2 font-mono text-sm text-primary transition-colors hover:border-teal/40 hover:text-teal"
          >
            リクエストフォームを開く
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
              <polyline points="15 3 21 3 21 9"/>
              <line x1="10" y1="14" x2="21" y2="3"/>
            </svg>
          </a>
        </div>
      </div>

      <div className="mt-10 pt-6 border-t border-border flex gap-4 flex-wrap">
        <Link href="/" className="text-xs text-muted hover:text-primary transition-colors font-mono uppercase tracking-widest">
          ツール一覧
        </Link>
        <Link href="/about" className="text-xs text-muted hover:text-primary transition-colors font-mono uppercase tracking-widest">
          About
        </Link>
        <Link href="/privacy-policy" className="text-xs text-muted hover:text-primary transition-colors font-mono uppercase tracking-widest">
          プライバシーポリシー
        </Link>
      </div>
    </main>
  )
}
