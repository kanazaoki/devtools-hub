import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'About',
  description: 'devtools-hub は個人開発者が作った、開発者・クリエイター向けの無料 Web ツール集です。',
  alternates: {
    canonical: 'https://devtools-hub.vercel.app/about',
  },
}

export default function AboutPage() {
  return (
    <main className="py-12 max-w-2xl">
      <h1 className="font-mono text-2xl font-bold text-bright mb-8">About devtools-hub</h1>

      <div className="space-y-8 text-sm leading-relaxed text-primary">
        <section>
          <h2 className="text-base font-semibold text-bright mb-3">このサイトについて</h2>
          <p>
            devtools-hub は、個人開発者が日々の開発・デザイン作業で「こういうツールがあったら便利なのに」と感じた
            ものを自作して公開しているツール集です。
          </p>
          <p className="mt-2">
            JSON フォーマッター、カラーパレット生成、画像変換、テキスト処理など 40 以上のツールをブラウザで無料で使えます。
            インストール不要で、入力データはすべてブラウザ上で処理されるためサーバーには送信されません。
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-bright mb-3">デスクトップ版について</h2>
          <p>
            一部のツールはデスクトップアプリ版を BOOTH で販売しています。
            デスクトップ版ではファイルの直接読み込み・保存、ドラッグ＆ドロップ対応など、
            Web 版にはない機能が使えます。
          </p>
          <a
            href="https://knkk.booth.pm/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block mt-3 text-teal hover:underline"
          >
            BOOTH ショップを見る →
          </a>
        </section>

        <section>
          <h2 className="text-base font-semibold text-bright mb-3">運営者</h2>
          <p>個人開発者（KOMA）が運営しています。</p>
          <p className="mt-2">
            ご意見・バグ報告などは
            <Link href="/contact" className="text-teal hover:underline ml-1">お問い合わせページ</Link>
            からどうぞ。
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-bright mb-3">技術スタック</h2>
          <ul className="space-y-1 text-dim">
            <li>Next.js 15 (App Router)</li>
            <li>TypeScript</li>
            <li>Tailwind CSS</li>
            <li>Vercel（ホスティング）</li>
          </ul>
        </section>
      </div>
    </main>
  )
}
