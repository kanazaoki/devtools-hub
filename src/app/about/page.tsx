import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'About',
  description:
    'devtools-hub は個人開発者 KOMA が作る、開発者・クリエイター向けの無料 Web ツール集です。90本以上のツールを無料公開中。',
  alternates: {
    canonical: 'https://devtools-hub.vercel.app/about',
  },
}

export default function AboutPage() {
  return (
    <main className="py-12 max-w-2xl">
      <h1 className="font-mono text-2xl font-bold text-bright mb-8">About</h1>

      <div className="space-y-10 text-sm leading-relaxed text-primary">
        <section>
          <h2 className="text-base font-semibold text-bright mb-3">devtools-hub とは</h2>
          <p>
            devtools-hub は、開発者・クリエイターが日々の作業で使える Web ツールを無料で提供するサイトです。
            JSON フォーマッター、カラーコード変換、CSS ジェネレーター、画像変換、正規表現テスターなど
            90 本以上のツールを公開しています。
          </p>
          <p className="mt-3">
            すべてのツールはブラウザ上で完結し、入力データがサーバーに送信されることはありません。
            インターネット接続がなくても動作するツールも多数あります。
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-bright mb-3">開発者について</h2>
          <p>
            KOMA（こま）という名前で個人開発をしています。フロントエンド・ツール系のプロダクトを中心に作っています。
          </p>
          <p className="mt-3">
            「欲しいツールが見つからないなら自分で作る」という考えのもと、実際の開発現場で感じた不便を解消するツールを開発しています。
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-bright mb-3">デスクトップ版について</h2>
          <p>
            主要ツールのデスクトップ版（Windows 対応）を BOOTH で販売しています。
            Web 版との違いはファイル保存ダイアログなどのネイティブ機能が使える点です。
            インターネット接続が不要で、オフライン環境でも快適に使えます。
          </p>
          <div className="mt-3">
            <a
              href="https://knkk.booth.pm/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block text-teal hover:underline font-mono text-xs tracking-widest uppercase"
            >
              BOOTH ショップを見る →
            </a>
          </div>
        </section>

        <section>
          <h2 className="text-base font-semibold text-bright mb-3">お問い合わせ</h2>
          <p>
            バグ報告・機能要望・その他ご意見は
            <Link href="/contact" className="text-teal hover:underline mx-1">
              お問い合わせページ
            </Link>
            または
            <a
              href="mailto:koma.games26@gmail.com"
              className="text-teal hover:underline mx-1"
            >
              koma.games26@gmail.com
            </a>
            までご連絡ください。
          </p>
        </section>

        <div className="pt-4 border-t border-border flex gap-4 flex-wrap">
          <Link href="/" className="text-xs text-muted hover:text-primary transition-colors font-mono uppercase tracking-widest">
            ツール一覧
          </Link>
          <Link href="/privacy-policy" className="text-xs text-muted hover:text-primary transition-colors font-mono uppercase tracking-widest">
            プライバシーポリシー
          </Link>
          <Link href="/terms" className="text-xs text-muted hover:text-primary transition-colors font-mono uppercase tracking-widest">
            利用規約
          </Link>
        </div>
      </div>
    </main>
  )
}
