'use client'

import { useState, useEffect, useId } from 'react'

interface Snippet {
  id: string
  title: string
  body: string
  tags: string[]
  createdAt: number
}

const STORAGE_KEY = 'text-deck-snippets'

function load(): Snippet[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Snippet[]) : []
  } catch {
    return []
  }
}

function save(snippets: Snippet[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snippets))
  } catch {}
}

function parseTags(raw: string): string[] {
  return raw
    .split(/[,\s]+/)
    .map((t) => t.trim())
    .filter(Boolean)
}

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {}
  }

  return (
    <button
      onClick={handleCopy}
      className={`rounded px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider transition-all duration-150 ${
        copied
          ? 'bg-teal text-bg'
          : 'border border-border text-muted hover:border-border-hi hover:text-dim'
      }`}
    >
      {copied ? '✓' : 'COPY'}
    </button>
  )
}

interface FormState {
  title: string
  body: string
  tags: string
}

export function TextDeck() {
  const [snippets, setSnippets] = useState<Snippet[]>([])
  const [search, setSearch] = useState('')
  const [activeTag, setActiveTag] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<FormState>({ title: '', body: '', tags: '' })
  const formId = useId()

  useEffect(() => {
    setSnippets(load())
  }, [])

  function handleAdd() {
    if (!form.title.trim() || !form.body.trim()) return
    const snippet: Snippet = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      title: form.title.trim(),
      body: form.body.trim(),
      tags: parseTags(form.tags),
      createdAt: Date.now(),
    }
    const next = [snippet, ...snippets]
    setSnippets(next)
    save(next)
    setForm({ title: '', body: '', tags: '' })
    setShowForm(false)
  }

  function handleDelete(id: string) {
    const next = snippets.filter((s) => s.id !== id)
    setSnippets(next)
    save(next)
  }

  // Collect all tags
  const allTags = Array.from(new Set(snippets.flatMap((s) => s.tags))).sort()

  // Filter snippets
  const filtered = snippets.filter((s) => {
    const q = search.toLowerCase()
    const matchSearch = !q || s.title.toLowerCase().includes(q) || s.body.toLowerCase().includes(q)
    const matchTag = !activeTag || s.tags.includes(activeTag)
    return matchSearch && matchTag
  })

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[180px]">
          <input
            type="search"
            placeholder="タイトル・本文を検索..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-border bg-surface-hi px-3 py-2 font-mono text-xs text-primary placeholder:text-muted outline-none transition-colors focus:border-teal/50"
          />
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className={`shrink-0 rounded-lg border px-4 py-2 font-mono text-[10px] uppercase tracking-wider transition-all duration-150 ${
            showForm
              ? 'border-border text-muted hover:text-dim'
              : 'border-teal/50 text-teal hover:bg-teal/10'
          }`}
        >
          {showForm ? '× キャンセル' : '+ 追加'}
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="rounded-xl border border-teal/20 bg-surface-hi p-5 space-y-4"
          style={{ borderLeftColor: 'rgb(0,200,150)', borderLeftWidth: '3px' }}
        >
          <p className="font-mono text-[10px] uppercase tracking-widest text-teal">新しいスニペット</p>
          <div>
            <label htmlFor={`${formId}-title`} className="block font-mono text-[10px] uppercase tracking-wider text-muted mb-1.5">
              タイトル
            </label>
            <input
              id={`${formId}-title`}
              type="text"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="スニペット名"
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 font-mono text-sm text-primary placeholder:text-muted outline-none focus:border-teal/50 transition-colors"
            />
          </div>
          <div>
            <label htmlFor={`${formId}-body`} className="block font-mono text-[10px] uppercase tracking-wider text-muted mb-1.5">
              本文
            </label>
            <textarea
              id={`${formId}-body`}
              value={form.body}
              onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
              placeholder="スニペット本文..."
              rows={4}
              className="w-full resize-y rounded-lg border border-border bg-surface px-3 py-2 font-mono text-sm text-primary placeholder:text-muted outline-none focus:border-teal/50 transition-colors"
            />
          </div>
          <div>
            <label htmlFor={`${formId}-tags`} className="block font-mono text-[10px] uppercase tracking-wider text-muted mb-1.5">
              タグ <span className="normal-case tracking-normal text-muted/60">（スペース or カンマ区切り）</span>
            </label>
            <input
              id={`${formId}-tags`}
              type="text"
              value={form.tags}
              onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
              placeholder="css js react"
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 font-mono text-sm text-primary placeholder:text-muted outline-none focus:border-teal/50 transition-colors"
            />
          </div>
          <button
            onClick={handleAdd}
            disabled={!form.title.trim() || !form.body.trim()}
            className="rounded-lg bg-teal px-5 py-2 font-mono text-xs font-semibold text-bg transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-30"
          >
            保存
          </button>
        </div>
      )}

      {/* Tag filter */}
      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setActiveTag(null)}
            className={`rounded-full border px-3 py-1 font-mono text-[10px] transition-all duration-150 ${
              activeTag === null
                ? 'border-teal/60 bg-teal/10 text-teal shadow-sm'
                : 'border-border text-muted hover:border-border-hi hover:text-dim'
            }`}
          >
            all
          </button>
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setActiveTag(activeTag === tag ? null : tag)}
              className={`rounded-full border px-3 py-1 font-mono text-[10px] transition-all duration-150 ${
                activeTag === tag
                  ? 'border-teal/60 bg-teal/10 text-teal shadow-sm'
                  : 'border-border text-muted hover:border-border-hi hover:text-dim'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      {/* Snippet list */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border px-6 py-10 text-center">
          <p className="text-xs italic text-muted">
            {snippets.length === 0
              ? '「+ 追加」でスニペットを登録できます。'
              : '条件に一致するスニペットがありません。'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((s) => (
            <div
              key={s.id}
              className="group rounded-xl border border-border bg-surface-hi transition-colors hover:border-border-hi"
              style={{ borderLeftColor: 'rgba(0,200,150,0.25)', borderLeftWidth: '3px' }}
            >
              <div className="flex items-start justify-between gap-3 px-4 pt-3.5 pb-2">
                <p className="font-mono text-sm font-semibold text-bright leading-snug">{s.title}</p>
                <div className="flex items-center gap-2 shrink-0 pt-0.5">
                  <CopyBtn text={s.body} />
                  <button
                    onClick={() => handleDelete(s.id)}
                    title="削除"
                    className="font-mono text-xs text-muted/40 transition-colors hover:text-primary opacity-0 group-hover:opacity-100"
                  >
                    ✕
                  </button>
                </div>
              </div>
              <pre className="whitespace-pre-wrap font-mono text-xs text-dim leading-relaxed line-clamp-4 px-4 pb-2">
                {s.body}
              </pre>
              {s.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 px-4 pb-3">
                  {s.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded border border-border px-2 py-0.5 font-mono text-[9px] text-muted/70"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <p className="font-mono text-[10px] text-muted/60 tabular-nums">
        {snippets.length > 0 && `${filtered.length} / ${snippets.length} 件`}
        {activeTag && <span className="text-teal/60"> ＃{activeTag}</span>}
        {search && <span> 「{search}」</span>}
      </p>
    </div>
  )
}
