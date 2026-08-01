import type { Metadata } from 'next'
import Script from 'next/script'
import { Analytics } from '@vercel/analytics/next'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { BackToTop } from '@/components/BackToTop'
import { PageProgress } from '@/components/PageProgress'
import { FeedbackKitWidget } from '@/components/FeedbackKitWidget'
import './globals.css'

// Read directly here (server component). Importing this from the 'use client'
// AdSense module turned it into a client-reference proxy → `client=[object Object]`
// in the loader script, which broke AdSense site verification. Public pub id
// (also in /ads.txt) is kept as a fallback so verification never breaks.
const ADSENSE_CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT || 'ca-pub-1932495595438110'

export const metadata: Metadata = {
  title: {
    default: 'devtools-hub — 開発者・クリエイター向け無料 Web ツール集',
    template: '%s | devtools-hub',
  },
  description:
    'Web開発の定番作業を「手順ガイド付き」でブラウザだけで完結できる無料ツール集。JSONの型生成・API・正規表現・CSS・カラー・画像最適化など125以上のツールと、各ステップで使うツールに直接たどれる手順ガイドを公開。登録不要・データは外部送信なし。',
  metadataBase: new URL('https://devtools-hub.dev'),
  other: {
    'google-adsense-account': ADSENSE_CLIENT,
  },
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
        <PageProgress />
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
        {process.env.NEXT_PUBLIC_FEEDBACK_KIT_PROJECT_ID && (
          <FeedbackKitWidget projectId={process.env.NEXT_PUBLIC_FEEDBACK_KIT_PROJECT_ID} />
        )}
        <Analytics />
      </body>
    </html>
  )
}
