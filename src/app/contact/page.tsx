import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'お問い合わせ',
  description: 'devtools-hub へのお問い合わせはメールにてお受けしています。',
}

export default function ContactPage() {
  return (
    <main className="py-12 max-w-2xl">
      <h1 className="font-mono text-2xl font-bold text-bright mb-8">お問い合わせ</h1>

      <div className="space-y-6 text-sm leading-relaxed text-primary">
        <p>
          バグ報告、機能のご要望、その他ご質問は以下のメールアドレスまでお気軽にどうぞ。
        </p>

        <div className="rounded-lg border border-border bg-surface px-6 py-5">
          <p className="text-xs uppercase tracking-widest text-muted font-mono mb-2">Email</p>
          <a
            href="mailto:koma.games26@gmail.com"
            className="text-teal hover:underline font-mono"
          >
            koma.games26@gmail.com
          </a>
        </div>

        <div className="space-y-2 text-dim">
          <p>・返信までに数日かかる場合があります。</p>
          <p>・ツールの不具合は再現手順を添えていただくとスムーズです。</p>
          <p>・広告に関するお問い合わせは Google AdSense サポートへお願いします。</p>
        </div>
      </div>
    </main>
  )
}
