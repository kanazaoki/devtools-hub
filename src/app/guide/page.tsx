import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: '使い方ガイド',
  description:
    'devtools-hub の使い方ガイド。キーワード検索・カテゴリフィルタ・お気に入り機能・New バッジ・デスクトップ版について説明します。',
  alternates: {
    canonical: 'https://devtools-hub.vercel.app/guide',
  },
}

const sections = [
  {
    id: 'search',
    index: '01',
    label: 'キーワード検索',
    accent: '#00C896',
    kbd: ['⌘K', 'Ctrl+K'],
    body: 'ツール名・機能・タグを入力してリアルタイムに絞り込めます。キーボードショートカットで検索バーに即フォーカス。Esc キーで検索をクリアしてフォーカスを外せます。',
  },
  {
    id: 'category',
    index: '02',
    label: 'カテゴリフィルタ',
    accent: '#6366f1',
    kbd: null,
    body: '検索バー下のカテゴリボタンをクリックすると対象カテゴリのツールだけを表示します。もう一度クリックするか「全て」を押すと解除。/category ページではカテゴリ別URLでブックマークもできます。',
  },
  {
    id: 'favorites',
    index: '03',
    label: 'お気に入り',
    accent: '#f59e0b',
    kbd: ['★'],
    body: 'ツールカードの ★ ボタンでお気に入りに追加。ブラウザのローカルストレージに保存されるため、次回アクセスしても維持されます。「★ お気に入り」フィルターボタンで一覧表示できます。',
  },
  {
    id: 'new-badge',
    index: '04',
    label: 'New バッジ',
    accent: '#00C896',
    kbd: ['NEW'],
    body: 'リリースから30日以内のツールには NEW バッジが表示されます。一度そのツールを開くとバッジは消えます。新着順ソートと組み合わせると最近追加されたツールをすばやく確認できます。',
  },
  {
    id: 'desktop',
    index: '05',
    label: 'デスクトップ版（BOOTH）',
    accent: '#ec4899',
    kbd: null,
    body: '主要ツールは Windows デスクトップアプリ版を BOOTH で販売しています。ファイル保存ダイアログ・ドラッグ＆ドロップなどのネイティブ機能に対応。インターネット接続不要でオフライン環境でも動作します。',
    link: { href: 'https://knkk.booth.pm/', label: 'BOOTH ショップを見る →' },
  },
]

export default function GuidePage() {
  return (
    <main className="py-12 max-w-2xl">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-teal mb-4">Guide</p>
      <h1 className="font-mono text-2xl font-bold text-bright mb-2">使い方ガイド</h1>
      <p className="text-sm text-dim leading-relaxed mb-10">
        devtools-hub の主要機能の使い方をまとめています。
      </p>

      <div className="space-y-0 divide-y divide-border">
        {sections.map((s) => (
          <section key={s.id} className="group relative py-7 pl-6">
            {/* 左アクセントバー */}
            <span
              aria-hidden="true"
              className="absolute left-0 top-7 h-5 w-[3px] rounded-sm opacity-60 transition-opacity duration-200 group-hover:opacity-100"
              style={{ backgroundColor: s.accent }}
            />

            <div className="flex items-start justify-between gap-4 mb-2">
              <div className="flex items-baseline gap-3">
                <span className="font-mono text-[10px] text-muted select-none">{s.index}</span>
                <h2 className="font-mono text-sm font-semibold text-bright">{s.label}</h2>
              </div>
              {s.kbd && (
                <div className="flex gap-1 shrink-0">
                  {s.kbd.map((k) => (
                    <kbd
                      key={k}
                      className="rounded border border-teal/30 bg-teal/10 px-1.5 py-px font-mono text-[10px] text-teal"
                    >
                      {k}
                    </kbd>
                  ))}
                </div>
              )}
            </div>

            <p className="text-sm leading-relaxed text-dim">{s.body}</p>

            {s.link && (
              <a
                href={s.link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-1 font-mono text-xs text-teal hover:underline tracking-widest uppercase"
              >
                {s.link.label}
              </a>
            )}
          </section>
        ))}
      </div>

      <div className="mt-10 pt-6 border-t border-border flex gap-5 flex-wrap">
        <Link
          href="/"
          className="text-xs text-muted hover:text-primary transition-colors font-mono uppercase tracking-widest"
        >
          ← ツール一覧
        </Link>
        <Link
          href="/category"
          className="text-xs text-muted hover:text-primary transition-colors font-mono uppercase tracking-widest"
        >
          カテゴリ一覧
        </Link>
      </div>
    </main>
  )
}
