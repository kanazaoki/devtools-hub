export const CATEGORIES = [
  {
    slug: 'developer',
    label: '開発者向け',
    description: 'API・正規表現・エンコード・ハッシュなど開発作業を効率化するツール',
    tag: '開発者向け',
    accent: '#6366f1',
  },
  {
    slug: 'css',
    label: 'CSS',
    description: 'CSS ジェネレーター・コンバーター・デバッグツール',
    tag: 'CSS',
    accent: '#3b82f6',
  },
  {
    slug: 'design',
    label: 'デザイン',
    description: 'UI デザイン・モックアップ・プロトタイピングツール',
    tag: 'デザイン',
    accent: '#ec4899',
  },
  {
    slug: 'image',
    label: '画像',
    description: '画像変換・最適化・リサイズ・編集ツール',
    tag: '画像',
    accent: '#10b981',
  },
  {
    slug: 'text',
    label: 'テキスト',
    description: 'テキスト変換・整形・解析・生成ツール',
    tag: 'テキスト',
    accent: '#eab308',
  },
  {
    slug: 'color',
    label: 'カラー',
    description: 'カラーコード変換・パレット・グラデーションツール',
    tag: 'カラー',
    accent: '#a855f7',
  },
  {
    slug: 'game',
    label: 'ゲーム開発',
    description: 'ゲーム開発に使えるユーティリティツール',
    tag: 'ゲーム開発',
    accent: '#22c55e',
  },
  {
    slug: 'ai',
    label: 'AI',
    description: 'AI・機械学習に関連したツール',
    tag: 'AI',
    accent: '#8b5cf6',
  },
] as const

export type CategorySlug = (typeof CATEGORIES)[number]['slug']

export function getCategoryBySlug(slug: string) {
  return CATEGORIES.find((c) => c.slug === slug) ?? null
}
