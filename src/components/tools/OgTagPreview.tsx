'use client'

import { useState, useCallback } from 'react'
import type { OgData } from '@/app/api/og-fetch/route'

type Tab = 'twitter' | 'facebook' | 'slack'

interface State {
  status: 'idle' | 'loading' | 'success' | 'error'
  data: OgData | null
  error: string | null
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }
  return (
    <button
      onClick={copy}
      className="shrink-0 rounded border border-border px-2 py-0.5 font-mono text-xs text-dim transition-colors hover:border-teal hover:text-teal"
    >
      {copied ? '✓' : 'copy'}
    </button>
  )
}

function TwitterPreview({ data }: { data: OgData }) {
  const title = data.twitterTitle ?? data.title ?? '(タイトルなし)'
  const desc = data.twitterDescription ?? data.description ?? ''
  const image = data.twitterImage ?? data.image
  const domain = (() => {
    try { return new URL(data.url ?? '').hostname } catch { return '' }
  })()

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface">
      {image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt={data.imageAlt ?? title} className="h-52 w-full object-cover" />
      )}
      {!image && (
        <div className="flex h-52 items-center justify-center bg-bg text-xs text-muted">画像なし</div>
      )}
      <div className="px-4 py-3">
        {domain && <p className="mb-1 text-xs text-muted">{domain}</p>}
        <p className="text-sm font-semibold text-bright line-clamp-2">{title}</p>
        {desc && <p className="mt-1 text-xs text-muted line-clamp-2">{desc}</p>}
      </div>
    </div>
  )
}

function FacebookPreview({ data }: { data: OgData }) {
  const title = data.title ?? '(タイトルなし)'
  const desc = data.description ?? ''
  const image = data.image
  const domain = (() => {
    try { return new URL(data.url ?? '').hostname.toUpperCase() } catch { return '' }
  })()

  return (
    <div className="overflow-hidden rounded border border-border bg-surface">
      {image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt={data.imageAlt ?? title} className="h-60 w-full object-cover" />
      )}
      {!image && (
        <div className="flex h-60 items-center justify-center bg-bg text-xs text-muted">画像なし</div>
      )}
      <div className="bg-[#f0f2f5] px-3 py-2">
        {domain && <p className="text-xs text-[#606770]">{domain}</p>}
        <p className="text-sm font-semibold text-[#1c1e21] line-clamp-2">{title}</p>
        {desc && <p className="text-xs text-[#606770] line-clamp-2">{desc}</p>}
      </div>
    </div>
  )
}

function SlackPreview({ data }: { data: OgData }) {
  const title = data.twitterTitle ?? data.title ?? '(タイトルなし)'
  const desc = data.twitterDescription ?? data.description ?? ''
  const image = data.twitterImage ?? data.image
  const siteName = data.siteName ?? (() => {
    try { return new URL(data.url ?? '').hostname } catch { return '' }
  })()

  return (
    <div className="rounded border-l-4 border-[#e8c8ff] bg-surface p-4">
      {siteName && <p className="mb-1 text-xs font-semibold text-[#a855f7]">{siteName}</p>}
      <p className="text-sm font-semibold text-[#1d9bd1] line-clamp-2">{title}</p>
      {desc && <p className="mt-1 text-xs text-muted line-clamp-3">{desc}</p>}
      {image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt={data.imageAlt ?? title} className="mt-3 max-h-40 rounded object-cover" />
      )}
    </div>
  )
}

export function OgTagPreview() {
  const [url, setUrl] = useState('')
  const [tab, setTab] = useState<Tab>('twitter')
  const [state, setState] = useState<State>({ status: 'idle', data: null, error: null })

  const fetch_ = useCallback(async () => {
    if (!url.trim()) {
      setState({ status: 'error', data: null, error: 'URLを入力してください' })
      return
    }
    setState({ status: 'loading', data: null, error: null })
    try {
      const res = await fetch('/api/og-fetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      })
      const json = await res.json()
      if (!res.ok || json.error) {
        setState({ status: 'error', data: null, error: json.error ?? '取得に失敗しました' })
        return
      }
      const data: OgData = json.data
      const hasOgp = data.allMeta.some((m) => m.property.startsWith('og:') || m.property.startsWith('twitter:'))
      if (!hasOgp) {
        setState({ status: 'error', data: null, error: 'OGP タグが見つかりませんでした' })
        return
      }
      setState({ status: 'success', data, error: null })
    } catch {
      setState({ status: 'error', data: null, error: '通信エラーが発生しました' })
    }
  }, [url])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') fetch_()
  }

  const TABS: { key: Tab; label: string }[] = [
    { key: 'twitter', label: 'Twitter / X' },
    { key: 'facebook', label: 'Facebook' },
    { key: 'slack', label: 'Slack' },
  ]

  return (
    <div className="flex flex-col gap-6">
      {/* URL input */}
      <div className="flex gap-2">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="https://example.com"
          className="flex-1 rounded border border-border bg-bg px-3 py-2 font-mono text-sm text-primary placeholder-muted outline-none focus:border-teal"
        />
        <button
          onClick={fetch_}
          disabled={state.status === 'loading'}
          className="rounded border border-teal bg-teal/10 px-4 py-2 text-sm font-medium text-teal transition-colors hover:bg-teal/20 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {state.status === 'loading' ? '取得中…' : '取得'}
        </button>
      </div>

      {/* Error */}
      {state.status === 'error' && (
        <div className="rounded border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {state.error}
        </div>
      )}

      {/* Results */}
      {state.status === 'success' && state.data && (
        <>
          {/* Platform tabs */}
          <div>
            <div className="mb-4 flex gap-1 border-b border-border">
              {TABS.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={`px-4 py-2 text-sm transition-colors ${
                    tab === key
                      ? 'border-b-2 border-teal font-medium text-teal'
                      : 'text-muted hover:text-primary'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="mx-auto max-w-lg">
              {tab === 'twitter' && <TwitterPreview data={state.data} />}
              {tab === 'facebook' && <FacebookPreview data={state.data} />}
              {tab === 'slack' && <SlackPreview data={state.data} />}
            </div>
          </div>

          {/* Meta tags table */}
          <div className="rounded-lg border border-border bg-bg">
            <p className="border-b border-border px-4 py-2 font-mono text-xs text-muted">
              取得した meta タグ（{state.data.allMeta.length} 件）
            </p>
            <div className="divide-y divide-border">
              {state.data.allMeta.length === 0 ? (
                <p className="px-4 py-4 text-sm text-muted">タグなし</p>
              ) : (
                state.data.allMeta.map((m, i) => (
                  <div key={i} className="flex items-start gap-3 px-4 py-2">
                    <span className="w-44 shrink-0 font-mono text-xs text-teal/80">{m.property}</span>
                    <span className="flex-1 break-all font-mono text-xs text-primary">{m.content}</span>
                    <CopyButton value={m.content} />
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}

      {/* Idle state */}
      {state.status === 'idle' && (
        <div className="rounded-lg border border-dashed border-border bg-bg px-4 py-12 text-center text-sm text-muted">
          URLを入力して「取得」を押すと OGP タグのプレビューが表示されます
        </div>
      )}
    </div>
  )
}
