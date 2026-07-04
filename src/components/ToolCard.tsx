import Link from 'next/link'
import type { Tool } from '@/data/tools'

// カテゴリ別タグピル（文字色・背景色）
const TAG_PILL: Record<string, string> = {
  'カラー':           'bg-purple-500/10 text-purple-300 border-purple-500/20',
  'デザイン':         'bg-pink-500/10 text-pink-300 border-pink-500/20',
  'CSS':              'bg-blue-500/10 text-blue-300 border-blue-500/20',
  'テキスト':         'bg-yellow-500/10 text-yellow-300 border-yellow-500/20',
  'ゲーム開発':       'bg-green-500/10 text-green-300 border-green-500/20',
  'UI':               'bg-cyan-500/10 text-cyan-300 border-cyan-500/20',
  '効率化':           'bg-teal/10 text-teal border-teal/20',
  '開発者向け':       'bg-indigo-500/10 text-indigo-300 border-indigo-500/20',
  'AI':               'bg-violet-500/10 text-violet-300 border-violet-500/20',
  '画像生成':         'bg-violet-500/10 text-violet-300 border-violet-500/20',
  'クリエイター向け': 'bg-orange-500/10 text-orange-300 border-orange-500/20',
  '画像':             'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
  '変換':             'bg-sky-500/10 text-sky-300 border-sky-500/20',
  '最適化':           'bg-sky-500/10 text-sky-300 border-sky-500/20',
  'マーケティング':   'bg-rose-500/10 text-rose-300 border-rose-500/20',
  'リサイズ':         'bg-lime-500/10 text-lime-300 border-lime-500/20',
  'アイコン':         'bg-amber-500/10 text-amber-300 border-amber-500/20',
}

// プライマリタグ → 左アクセントバーの色
const ACCENT_HEX: Record<string, string> = {
  'カラー':           '#a855f7',
  'デザイン':         '#ec4899',
  'CSS':              '#3b82f6',
  'テキスト':         '#eab308',
  'ゲーム開発':       '#22c55e',
  'UI':               '#06b6d4',
  '効率化':           '#00C896',
  '開発者向け':       '#6366f1',
  'AI':               '#8b5cf6',
  '画像生成':         '#8b5cf6',
  'クリエイター向け': '#f97316',
  '画像':             '#10b981',
  '変換':             '#0ea5e9',
  '最適化':           '#0ea5e9',
  'マーケティング':   '#f43f5e',
  'リサイズ':         '#84cc16',
  'アイコン':         '#f59e0b',
}

const DEFAULT_PILL   = 'bg-surface-hi text-dim border-border'
const DEFAULT_ACCENT = '#36363F'

interface ToolCardProps {
  tool: Tool
  isNew?: boolean
  isFavorited?: boolean
  onToggleFavorite?: () => void
}

export function ToolCard({ tool, isNew = false, isFavorited = false, onToggleFavorite }: ToolCardProps) {
  const accentColor = ACCENT_HEX[tool.tags[0]] ?? DEFAULT_ACCENT

  return (
    <div
      className="group relative overflow-hidden rounded-lg border border-border bg-surface transition-all duration-200 hover:-translate-y-0.5 hover:border-border-hi hover:bg-surface-hi hover:shadow-[0_4px_20px_rgba(0,0,0,0.4)]"
    >
      {/* ストレッチリンク — カード全体をクリック可能に */}
      <Link
        href={`/tools/${tool.slug}`}
        className="absolute inset-0 z-10"
        aria-label={tool.name}
      />

      {/* 左アクセントバー — カテゴリカラー */}
      <span
        aria-hidden="true"
        className="absolute left-0 top-0 h-full w-[3px] rounded-l-lg opacity-50 transition-opacity duration-200 group-hover:opacity-100"
        style={{ backgroundColor: accentColor }}
      />

      {/* New バッジ */}
      {isNew && (
        <span className="absolute right-3 top-3 z-20 rounded border border-teal/30 bg-teal/15 px-1.5 py-px font-mono text-[9px] font-bold tracking-wider text-teal">
          NEW
        </span>
      )}

      <div className="relative flex h-full flex-col gap-3 p-5 pl-6">
        {/* ツール名・タグライン */}
        <div>
          <h2 className="font-mono text-sm font-semibold text-bright transition-colors duration-150 group-hover:text-teal">
            {tool.name}
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-teal/60 transition-colors duration-150 group-hover:text-teal/35">
            {tool.tagline}
          </p>
        </div>

        {/* タグピル */}
        <div className="flex flex-wrap gap-1.5">
          {tool.tags.map((tag) => (
            <span
              key={tag}
              className={`inline-block rounded border px-2 py-0.5 text-[11px] font-medium ${
                TAG_PILL[tag] ?? DEFAULT_PILL
              }`}
            >
              {tag}
            </span>
          ))}
        </div>

        {/* フッター行 */}
        <div className="mt-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            {onToggleFavorite && (
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleFavorite() }}
                className={`relative z-20 transition-colors duration-150 ${isFavorited ? 'text-amber-400 hover:text-amber-300' : 'text-muted hover:text-dim'}`}
                aria-label={isFavorited ? 'お気に入りから削除' : 'お気に入りに追加'}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill={isFavorited ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                </svg>
              </button>
            )}
            <p className="text-xs text-muted transition-colors duration-150 group-hover:text-dim">
              使ってみる →
            </p>
          </div>
          <a
            href={tool.boothUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="relative z-20 flex items-center gap-0.5 font-mono text-[10px] text-muted/40 transition-all duration-150 hover:text-teal hover:gap-1"
          >
            BOOTH
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="9"
              height="9"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          </a>
        </div>
      </div>
    </div>
  )
}
