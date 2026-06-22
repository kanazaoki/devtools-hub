import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'プライバシーポリシー',
  description: 'devtools-hub のプライバシーポリシーです。Cookie、広告、アクセス解析に関する情報をご確認ください。',
}

export default function PrivacyPolicyPage() {
  return (
    <main className="py-12 max-w-2xl">
      <h1 className="font-mono text-2xl font-bold text-bright mb-8">プライバシーポリシー</h1>

      <div className="space-y-8 text-sm leading-relaxed text-primary">
        <section>
          <h2 className="text-base font-semibold text-bright mb-3">基本方針</h2>
          <p>
            devtools-hub（以下「当サイト」）は、ユーザーのプライバシーを尊重し、個人情報の保護に努めます。
            当サイトは開発者・クリエイター向けの無料 Web ツールを提供しており、ツールの利用に個人情報の入力は不要です。
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-bright mb-3">Cookie の使用について</h2>
          <p>
            当サイトでは、サービス改善および広告配信のために Cookie を使用することがあります。
            Cookie はブラウザの設定から無効にすることができます。
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-bright mb-3">広告について（Google AdSense）</h2>
          <p>
            当サイトは Google AdSense を利用して広告を掲載しています。
            Google はユーザーのブラウザに Cookie を使用し、興味・関心に基づく広告を表示することがあります。
            Google が Cookie を使用する方法の詳細は、
            <a
              href="https://policies.google.com/technologies/ads"
              target="_blank"
              rel="noopener noreferrer"
              className="text-teal hover:underline ml-1"
            >
              Google の広告ポリシー
            </a>
            をご確認ください。
          </p>
          <p className="mt-2">
            広告のカスタマイズを無効にするには
            <a
              href="https://www.google.com/settings/ads"
              target="_blank"
              rel="noopener noreferrer"
              className="text-teal hover:underline ml-1"
            >
              広告設定ページ
            </a>
            をご利用ください。
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-bright mb-3">アクセス解析について</h2>
          <p>
            当サイトは Vercel Analytics を使用してアクセス状況を計測しています。
            収集されるデータは匿名化されており、個人を特定する情報は含まれません。
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-bright mb-3">ツールの入力データについて</h2>
          <p>
            当サイトのツール（JSON フォーマッター、画像変換、テキスト処理など）に入力したデータはすべてブラウザ上で処理されます。
            入力データがサーバーに送信されることはなく、当サイト運営者が閲覧・収集することはありません。
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-bright mb-3">外部リンクについて</h2>
          <p>
            当サイトには BOOTH など外部サービスへのリンクが含まれています。
            リンク先のプライバシーポリシーについては各サービスをご確認ください。
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-bright mb-3">ポリシーの変更</h2>
          <p>
            本ポリシーは必要に応じて変更することがあります。変更後のポリシーはこのページに掲載します。
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-bright mb-3">お問い合わせ</h2>
          <p>
            プライバシーに関するご質問は
            <a href="/contact" className="text-teal hover:underline ml-1">お問い合わせページ</a>
            からご連絡ください。
          </p>
        </section>

        <p className="text-xs text-muted pt-4 border-t border-border">
          制定日：2026年6月23日
        </p>
      </div>
    </main>
  )
}
