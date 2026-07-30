export const CATEGORIES = [
  {
    slug: 'developer',
    label: '開発者向け',
    description: 'API・正規表現・エンコード・ハッシュなど開発作業を効率化するツール',
    intro:
      'API開発・正規表現・JSON/YAML変換・エンコード・ハッシュ・JWTなど、日々の開発作業を効率化する無料ツールをまとめています。すべてブラウザ内で動作し、インストール不要・登録不要で使えます。',
    tag: '開発者向け',
    accent: '#6366f1',
  },
  {
    slug: 'css',
    label: 'CSS',
    description: 'CSS ジェネレーター・コンバーター・デバッグツール',
    intro:
      'グラデーション・Flexbox・Grid・アニメーション・box-shadow・clip-path など、CSSをGUIやスライダーで組み立てて即コード生成できる無料ツール集です。プレビューを見ながら調整でき、コピーしてそのまま使えます。',
    tag: 'CSS',
    accent: '#3b82f6',
  },
  {
    slug: 'design',
    label: 'デザイン',
    description: 'UI デザイン・モックアップ・プロトタイピングツール',
    intro:
      'カラーパレット・タイポグラフィスケール・モックアップ・OGP・アイコンなど、UIデザインとプロトタイピングを助ける無料ツールをまとめています。デザインとコードの橋渡しをブラウザ内で完結できます。',
    tag: 'デザイン',
    accent: '#ec4899',
  },
  {
    slug: 'image',
    label: '画像',
    description: '画像変換・最適化・リサイズ・編集ツール',
    intro:
      'WebP/AVIF変換・リサイズ・EXIF確認・プレースホルダー生成・カラー抽出など、画像まわりの作業に使える無料ツール集です。画像はサーバーに送らずブラウザ内で処理するものが中心で、安心して使えます。',
    tag: '画像',
    accent: '#10b981',
  },
  {
    slug: 'text',
    label: 'テキスト',
    description: 'テキスト変換・整形・解析・生成ツール',
    intro:
      'ケース変換・文字数カウント・差分表示・Lorem Ipsum生成・Markdown・エンコードなど、テキストの変換・整形・解析・生成を助ける無料ツールをまとめています。コピペだけで即結果が得られます。',
    tag: 'テキスト',
    accent: '#eab308',
  },
  {
    slug: 'color',
    label: 'カラー',
    description: 'カラーコード変換・パレット・グラデーションツール',
    intro:
      'カラーコード変換・パレット生成・コントラスト比チェック・色覚シミュレーション・グラデーションなど、配色作業に使える無料ツール集です。HEX/RGB/HSLの相互変換からアクセシビリティ確認まで対応します。',
    tag: 'カラー',
    accent: '#a855f7',
  },
  {
    slug: 'game',
    label: 'ゲーム開発',
    description: 'ゲーム開発に使えるユーティリティツール',
    intro:
      'スプライトシートのパック/スライス・ノイズ生成・ピクセルアート・テキストレイアウト確認など、ゲーム開発に使える無料ユーティリティをまとめています。Unity・Godotなどの制作フローを補助します。',
    tag: 'ゲーム開発',
    accent: '#22c55e',
  },
  {
    slug: 'ai',
    label: 'AI',
    description: 'AI・機械学習に関連したツール',
    intro:
      'AIプロンプト管理など、AI・機械学習まわりの作業に使える無料ツールをまとめています。ブラウザ内で完結し、すぐに試せます。',
    tag: 'AI',
    accent: '#8b5cf6',
  },
] as const

export type CategorySlug = (typeof CATEGORIES)[number]['slug']

export function getCategoryBySlug(slug: string) {
  return CATEGORIES.find((c) => c.slug === slug) ?? null
}
