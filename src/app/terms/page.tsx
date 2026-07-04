import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: '利用規約',
  description: 'devtools-hub の利用規約です。当サイトのツールをご利用になる前にお読みください。',
  alternates: {
    canonical: 'https://devtools-hub.vercel.app/terms',
  },
}

export default function TermsPage() {
  return (
    <main className="py-12 max-w-2xl">
      <h1 className="font-mono text-2xl font-bold text-bright mb-8">利用規約</h1>

      <div className="space-y-8 text-sm leading-relaxed text-primary">
        <section>
          <h2 className="text-base font-semibold text-bright mb-3">第1条（適用）</h2>
          <p>
            本規約は、devtools-hub（以下「当サイト」）が提供するすべての Web ツールおよびコンテンツの利用に適用されます。
            当サイトをご利用になった時点で、本規約に同意したものとみなします。
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-bright mb-3">第2条（サービスの内容）</h2>
          <p>
            当サイトは、開発者・クリエイター向けの Web ツールを無料で提供しています。
            提供するツールには、JSON フォーマッター、カラーパレット生成、CSS ジェネレーター、
            画像変換、テキスト処理、コード変換など多数が含まれます。
          </p>
          <p className="mt-2">
            当サイトのツールはすべてブラウザ上で動作します。
            ユーザーが入力したデータはサーバーに送信されず、すべてブラウザ内で処理されます。
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-bright mb-3">第3条（禁止事項）</h2>
          <p>当サイトの利用にあたり、以下の行為を禁止します。</p>
          <ul className="mt-2 space-y-1 text-dim list-disc list-inside">
            <li>当サイトのコンテンツや機能を無断で複製・転載・商用利用すること</li>
            <li>当サイトのサーバーやシステムに過度な負荷をかける行為</li>
            <li>法令または公序良俗に違反する用途での利用</li>
            <li>当サイトの運営を妨げる行為</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold text-bright mb-3">第4条（免責事項）</h2>
          <p>
            当サイトは、各ツールの処理結果の正確性・完全性・適切性について保証しません。
            ツールの利用によって生じた損害について、当サイト運営者は一切の責任を負いません。
          </p>
          <p className="mt-2">
            当サイトは予告なくサービスの内容変更・停止をすることがあります。
            これによってユーザーに生じた損害についても、当サイト運営者は責任を負いません。
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-bright mb-3">第5条（知的財産権）</h2>
          <p>
            当サイトに掲載されているコンテンツ（テキスト・デザイン・コードを含む）の著作権は
            当サイト運営者（KOMA）に帰属します。
            ただし、各ツールで生成・変換した出力結果についてはユーザーが自由に利用できます。
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-bright mb-3">第6条（広告について）</h2>
          <p>
            当サイトでは Google AdSense を利用した広告を掲載しています。
            広告に関する詳細は
            <Link href="/privacy-policy" className="text-teal hover:underline ml-1">プライバシーポリシー</Link>
            をご覧ください。
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-bright mb-3">第7条（準拠法・管轄裁判所）</h2>
          <p>
            本規約の解釈にあたっては日本法を準拠法とします。
            当サイトに関して紛争が生じた場合、当サイト運営者の所在地を管轄する裁判所を専属的合意管轄とします。
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-bright mb-3">第8条（規約の変更）</h2>
          <p>
            当サイト運営者は、必要に応じて本規約を変更することがあります。
            変更後の規約はこのページに掲載し、掲載時点から効力を発するものとします。
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-bright mb-3">お問い合わせ</h2>
          <p>
            本規約に関するご質問は
            <Link href="/contact" className="text-teal hover:underline ml-1">お問い合わせページ</Link>
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
