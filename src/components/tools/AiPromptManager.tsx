'use client'

import { useState, useEffect, useId } from 'react'

interface Tag {
  id: string
  ja: string
  en: string
}

interface Category {
  id: string
  name: string
  tags: Tag[]
}

const STORAGE_KEY = 'ai-prompt-manager-categories'

const DEFAULT_CATEGORIES: Category[] = [
  {
    id: 'premise',
    name: '前提',
    tags: [
      { id: 'p1', ja: '高品質', en: 'masterpiece, best quality' },
      { id: 'p2', ja: '8K', en: '8k uhd' },
      { id: 'p3', ja: 'アニメ風', en: 'anime style' },
      { id: 'p4', ja: 'フォトリアル', en: 'photorealistic' },
      { id: 'p5', ja: 'イラスト', en: 'illustration' },
    ],
  },
  {
    id: 'face',
    name: '顔',
    tags: [
      { id: 'f1', ja: '笑顔', en: 'smile' },
      { id: 'f2', ja: '真顔', en: 'expressionless' },
      { id: 'f3', ja: '泣き顔', en: 'crying' },
      { id: 'f4', ja: '目を閉じる', en: 'closed eyes' },
      { id: 'f5', ja: '青い目', en: 'blue eyes' },
      { id: 'f6', ja: '金髪', en: 'blonde hair' },
      { id: 'f7', ja: '黒髪', en: 'black hair' },
    ],
  },
  {
    id: 'outfit',
    name: '服',
    tags: [
      { id: 'o1', ja: '制服', en: 'school uniform' },
      { id: 'o2', ja: 'ワンピース', en: 'dress' },
      { id: 'o3', ja: 'スーツ', en: 'suit' },
      { id: 'o4', ja: '着物', en: 'kimono' },
      { id: 'o5', ja: 'スポーツウェア', en: 'sportswear' },
    ],
  },
  {
    id: 'background',
    name: '背景',
    tags: [
      { id: 'b1', ja: '白背景', en: 'white background' },
      { id: 'b2', ja: '屋外', en: 'outdoors' },
      { id: 'b3', ja: '夕焼け', en: 'sunset' },
      { id: 'b4', ja: '街並み', en: 'cityscape' },
      { id: 'b5', ja: '森', en: 'forest' },
      { id: 'b6', ja: '教室', en: 'classroom' },
    ],
  },
]

function loadCategories(): Category[] {
  if (typeof window === 'undefined') return DEFAULT_CATEGORIES
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Category[]) : DEFAULT_CATEGORIES
  } catch {
    return DEFAULT_CATEGORIES
  }
}

function saveCategories(cats: Category[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cats))
  } catch {}
}

export function AiPromptManager() {
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [copied, setCopied] = useState(false)
  const [addingTo, setAddingTo] = useState<string | null>(null)
  const [newJa, setNewJa] = useState('')
  const [newEn, setNewEn] = useState('')
  const formId = useId()

  useEffect(() => {
    setCategories(loadCategories())
  }, [])

  function toggleTag(tagId: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(tagId)) {
        next.delete(tagId)
      } else {
        next.add(tagId)
      }
      return next
    })
  }

  const prompt = categories
    .flatMap((c) => c.tags)
    .filter((t) => selected.has(t.id))
    .map((t) => t.en)
    .join(', ')

  async function handleCopy() {
    if (!prompt) return
    try {
      await navigator.clipboard.writeText(prompt)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {}
  }

  function handleAddTag(catId: string) {
    if (!newJa.trim() || !newEn.trim()) return
    const newTag: Tag = {
      id: `custom-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      ja: newJa.trim(),
      en: newEn.trim(),
    }
    const next = categories.map((c) =>
      c.id === catId ? { ...c, tags: [...c.tags, newTag] } : c
    )
    setCategories(next)
    saveCategories(next)
    setNewJa('')
    setNewEn('')
    setAddingTo(null)
  }

  function handleCancelAdd() {
    setAddingTo(null)
    setNewJa('')
    setNewEn('')
  }

  // Per-category accent colors for left border
  const catAccents = [
    'rgb(0,200,150)',      // teal — 前提
    'rgb(99,102,241)',     // indigo — 顔
    'rgb(245,158,11)',     // amber — 服
    'rgb(244,63,94)',      // rose — 背景
  ]

  return (
    <div className="space-y-5">
      {/* Categories */}
      <div className="space-y-3">
        {categories.map((cat, catIdx) => (
          <div
            key={cat.id}
            className="rounded-xl border border-border bg-surface-hi overflow-hidden"
            style={{ borderLeftColor: catAccents[catIdx % catAccents.length], borderLeftWidth: '3px' }}
          >
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/50">
              <span
                className="font-mono text-[11px] font-semibold tracking-wider"
                style={{ color: catAccents[catIdx % catAccents.length] }}
              >
                {cat.name}
              </span>
              <button
                onClick={() => setAddingTo(addingTo === cat.id ? null : cat.id)}
                className="font-mono text-[10px] text-muted transition-colors hover:text-teal"
              >
                {addingTo === cat.id ? '× キャンセル' : '+ タグ追加'}
              </button>
            </div>

            <div className="flex flex-wrap gap-2 px-4 py-3">
              {cat.tags.map((tag) => (
                <label
                  key={tag.id}
                  className={`flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-[11px] transition-all duration-150 ${
                    selected.has(tag.id)
                      ? 'border-teal/60 bg-teal/10 text-teal shadow-sm'
                      : 'border-border text-muted hover:border-border-hi hover:text-dim'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selected.has(tag.id)}
                    onChange={() => toggleTag(tag.id)}
                    className="sr-only"
                  />
                  {selected.has(tag.id) && (
                    <span className="text-teal text-[9px]">✓</span>
                  )}
                  <span>{tag.ja}</span>
                </label>
              ))}
            </div>

            {/* Inline add form */}
            {addingTo === cat.id && (
              <div className="flex flex-wrap items-end gap-2 border-t border-border px-4 py-3 bg-surface">
                <div className="flex flex-col gap-1">
                  <label className="font-mono text-[9px] uppercase tracking-wider text-muted">
                    日本語名
                  </label>
                  <input
                    type="text"
                    value={newJa}
                    onChange={(e) => setNewJa(e.target.value)}
                    placeholder="例: ツインテール"
                    className="rounded border border-border bg-surface-hi px-2.5 py-1.5 font-mono text-xs text-primary placeholder:text-muted outline-none focus:border-teal/50 w-36 transition-colors"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-mono text-[9px] uppercase tracking-wider text-muted">
                    英語タグ
                  </label>
                  <input
                    type="text"
                    value={newEn}
                    onChange={(e) => setNewEn(e.target.value)}
                    placeholder="例: twintails"
                    className="rounded border border-border bg-surface-hi px-2.5 py-1.5 font-mono text-xs text-primary placeholder:text-muted outline-none focus:border-teal/50 w-36 transition-colors"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAddTag(cat.id)}
                    disabled={!newJa.trim() || !newEn.trim()}
                    className="rounded bg-teal px-3 py-1.5 font-mono text-[10px] font-semibold text-bg transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    追加
                  </button>
                  <button
                    onClick={handleCancelAdd}
                    className="rounded border border-border px-3 py-1.5 font-mono text-[10px] text-muted transition-colors hover:text-dim"
                  >
                    キャンセル
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Output */}
      <div className="overflow-hidden rounded-xl border border-border"
        style={prompt ? { borderColor: 'rgba(0,200,150,0.3)' } : undefined}
      >
        <div className="flex items-center justify-between border-b border-border bg-surface-hi px-4 py-2.5">
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted">
            生成プロンプト
            {selected.size > 0 && (
              <span className="ml-2 text-teal/70">{selected.size} タグ</span>
            )}
          </span>
          <button
            onClick={handleCopy}
            disabled={!prompt}
            className={`rounded px-3 py-1 font-mono text-[10px] uppercase tracking-wider transition-all duration-150 ${
              copied
                ? 'bg-teal text-bg'
                : prompt
                ? 'border border-teal/40 text-teal hover:bg-teal/10'
                : 'border border-border text-muted cursor-not-allowed opacity-30'
            }`}
          >
            {copied ? '✓ Copied' : 'コピー'}
          </button>
        </div>
        {prompt ? (
          <div className="bg-surface-hi px-4 py-4 font-mono text-xs text-primary leading-loose">
            {prompt}
          </div>
        ) : (
          <div className="bg-surface-hi px-4 py-4 text-xs italic text-muted/60">
            タグをチェックするとここにプロンプトが表示されます。
          </div>
        )}
      </div>
    </div>
  )
}
