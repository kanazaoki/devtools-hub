import type { Metadata } from 'next'
import Script from 'next/script'
import { Analytics } from '@vercel/analytics/next'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { BackToTop } from '@/components/BackToTop'
import { ADSENSE_CLIENT } from '@/components/AdSense'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'devtools-hub — 開発者・クリエイター向け無料 Web ツール集',
    template: '%s | devtools-hub',
  },
  description:
    '個人開発者が作った開発・デザイン向けツールを無料公開。カラーコード変換、グラデーションエディタ、画像変換、テキストレイアウト確認など。デスクトップ版は BOOTH で配布中。',
  metadataBase: new URL('https://devtools-hub.vercel.app'),
  openGraph: {
    type: 'website',
    locale: 'ja_JP',
    siteName: 'devtools-hub',
    images: [{ url: '/opengraph-image', width: 1200, height: 630 }],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body className="min-h-screen bg-bg text-primary antialiased">
        <Header />
        <div className="mx-auto max-w-6xl px-4">{children}</div>
        <Footer />
        <BackToTop />

        {ADSENSE_CLIENT && (
          <Script
            async
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`}
            crossOrigin="anonymous"
            strategy="lazyOnload"
          />
        )}
        <Analytics />
      </body>
    </html>
  )
}
