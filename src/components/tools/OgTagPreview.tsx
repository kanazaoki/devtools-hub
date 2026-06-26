'use client'

import { useState, useCallback } from 'react'
import type { OgData } from '@/app/api/og-fetch/route'

type Tab = 'twitter' | 'facebook' | 'slack'

interface State {
  status: 'idle' | 'loading' | 'success' | 'error'
  data: OgData | null
  error: string | null
}

function decodeHtml(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
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
      className={`shrink-0 rounded border px-2 py-0.5 font-mono text-xs transition-all ${
        copied
          ? 'border-teal/40 bg-teal/10 text-teal'
          : 'border-border text-dim hover:border-teal hover:text-teal'
      }`}
    >
      {copied ? '✓ copied' : 'copy'}
    </button>
  )
}

function TwitterPreview({ data }: { data: OgData }) {
  const title = decodeHtml(data.twitterTitle ?? data.title ?? '(タイトルなし)')
  const desc = decodeHtml(data.twitterDescription ?? data.description ?? '')
  const image = data.twitterImage ?? data.image
  const domain = (() => { try { return new URL(data.url ?? '').hostname } catch { return '' } })()

  return (
    <div>
      <p className="mb-2 font-mono text-xs text-muted uppercase tracking-widest">Twitter / X Card</p>
      <div className="overflow-hidden rounded-2xl border border-[#2f3336] bg-[#16181c]">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt={data.imageAlt ? decodeHtml(data.imageAlt) : title} className="h-52 w-full object-cover" />
        ) : (
          <div className="flex h-52 items-center justify-center bg-[#1e2227] text-xs text-[#71767b]">og:image なし</div>
        )}
        <div className="px-4 py-3">
          {domain && <p className="mb-1 font-mono text-xs text-[#71767b]">{domain}</p>}
          <p className="text-sm font-semibold text-[#e7e9ea] line-clamp-2">{title}</p>
          {desc && <p className="mt-1 text-xs text-[#71767b] line-clamp-2">{desc}</p>}
        </div>
      </div>
    </div>
  )
}

function FacebookPreview({ data }: { data: OgData }) {
  const title = decodeHtml(data.title ?? '(タイトルなし)')
  const desc = decodeHtml(data.description ?? '')
  const image = data.image
  const domain = (() => { try { return new URL(data.url ?? '').hostname.toUpperCase() } catch { return '' } })()

  return (
    <div>
      <p className="mb-2 font-mono text-xs text-muted uppercase tracking-widest">Facebook Link Preview</p>
      <div className="overflow-hidden rounded-none border border-[#ccd0d5]">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt={data.imageAlt ? decodeHtml(data.imageAlt) : title} className="h-60 w-full object-cover" />
        ) : (
          <div className="flex h-60 items-center justify-center bg-[#e4e6ea] text-xs text-[#606770]">og:image なし</div>
        )}
        <div className="bg-[#f0f2f5] px-3 py-2">
          {domain && <p className="font-mono text-[10px] uppercase text-[#606770]">{domain}</p>}
          <p className="text-sm font-semibold text-[#1c1e21] line-clamp-2">{title}</p>
          {desc && <p className="text-xs text-[#606770] line-clamp-2">{desc}</p>}
        </div>
      </div>
    </div>
  )
}

function SlackPreview({ data }: { data: OgData }) {
  const title = decodeHtml(data.twitterTitle ?? data.title ?? '(タイトルなし)')
  const desc = decodeHtml(data.twitterDescription ?? data.description ?? '')
  const image = data.twitterImage ?? data.image
  const siteName = decodeHtml(data.siteName ?? (() => { try { return new URL(data.url ?? '').hostname } catch { return '' } })())

  return (
    <div>
      <p className="mb-2 font-mono text-xs text-muted uppercase tracking-widest">Slack Unfurl</p>
      <div className="rounded border border-[#565856] bg-[#1a1d21] p-0 overflow-hidden">
        <div className="flex">
          <div className="w-1 shrink-0 bg-[#9f86c0]" />
          <div className="flex-1 p-3">
            {siteName && <p className="mb-0.5 text-xs font-semibold text-[#9f86c0]">{siteName}</p>}
            <p className="text-sm font-semibold text-[#1d9bd1] hover:underline line-clamp-2 cursor-pointer">{title}</p>
            {desc && <p className="mt-1 text-xs text-[#ababad] line-clamp-3">{desc}</p>}
            {image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={image} alt={data.imageAlt ? decodeHtml(data.imageAlt) : title} className="mt-2 max-h-40 max-w-sm rounded object-cover" />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 px-4 py-2">
      <div className="h-3 w-32 animate-pulse rounded bg-surface" />
      <div className="h-3 flex-1 animate-pulse rounded bg-surface" />
    </div>
  )
}

function LoadingState() {
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl bg-surface/50 p-4">
        <div className="mb-3 h-2 w-24 animate-pulse rounded bg-surface" />
        <div className="h-48 w-full animate-pulse rounded-xl bg-surface" />
        <div className="mt-3 space-y-2">
          <div className="h-3 w-3/4 animate-pulse rounded bg-surface" />
          <div className="h-3 w-1/2 animate-pulse rounded bg-surface" />
        </div>
      </div>
      <div className="rounded-lg border border-border bg-bg">
        <div className="border-b border-border px-4 py-2">
          <div className="h-3 w-32 animate-pulse rounded bg-surface" />
        </div>
        {[...Array(5)].map((_, i) => <SkeletonRow key={i} />)}
      </div>
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

  const sortedMeta = state.data?.allMeta ? [...state.data.allMeta].sort((a, b) => {
    const score = (p: string) => p.startsWith('og:') ? 0 : p.startsWith('twitter:') ? 1 : 2
    return score(a.property) - score(b.property)
  }) : []

  return (
    <div className="flex flex-col gap-5">
      {/* URL input bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-xs text-muted select-none">URL</span>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="https://example.com"
            className="w-full rounded border border-border bg-bg py-2 pl-10 pr-3 font-mono text-sm text-primary placeholder-muted/50 outline-none transition-colors focus:border-teal"
          />
        </div>
        <button
          onClick={fetch_}
          disabled={state.status === 'loading'}
          className="rounded border border-teal bg-teal px-5 py-2 text-sm font-semibold text-bg transition-all hover:bg-teal/90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {state.status === 'loading' ? '取得中…' : '取得'}
        </button>
      </div>

      {/* Error */}
      {state.status === 'error' && (
        <div className="flex items-start gap-2 rounded border border-red-500/20 bg-red-500/8 px-4 py-3 text-sm text-red-400">
          <span className="mt-0.5 shrink-0">✕</span>
          {state.error}
        </div>
      )}

      {/* Loading */}
      {state.status === 'loading' && <LoadingState />}

      {/* Results */}
      {state.status === 'success' && state.data && (
        <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
          {/* Left: preview tabs */}
          <div className="flex flex-col gap-3">
            <div className="flex gap-0 border-b border-border">
              {TABS.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={`px-4 py-2 font-mono text-xs uppercase tracking-wider transition-colors ${
                    tab === key
                      ? 'border-b-2 border-teal text-teal'
                      : 'text-muted hover:text-primary'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="min-h-[280px]">
              {tab === 'twitter' && <TwitterPreview data={state.data} />}
              {tab === 'facebook' && <FacebookPreview data={state.data} />}
              {tab === 'slack' && <SlackPreview data={state.data} />}
            </div>
          </div>

          {/* Right: meta tags table */}
          <div className="rounded-lg border border-border bg-bg">
            <p className="border-b border-border px-4 py-2 font-mono text-xs text-muted">
              meta タグ <span className="text-teal">{state.data.allMeta.length}</span> 件
            </p>
            <div className="max-h-[420px] overflow-y-auto divide-y divide-border">
              {sortedMeta.map((m, i) => (
                <div key={i} className="flex items-start gap-2 px-3 py-2 hover:bg-surface/30 transition-colors">
                  <span className={`mt-0.5 w-36 shrink-0 break-all font-mono text-[10px] leading-relaxed ${
                    m.property.startsWith('og:') ? 'text-teal/90' :
                    m.property.startsWith('twitter:') ? 'text-sky-400/80' :
                    'text-dim'
                  }`}>{m.property}</span>
                  <span className="flex-1 break-all font-mono text-[10px] leading-relaxed text-primary">{decodeHtml(m.content)}</span>
                  <CopyButton value={m.content} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Idle state */}
      {state.status === 'idle' && (
        <div className="rounded-lg border border-dashed border-border bg-bg/50">
          <div className="grid gap-0 divide-y divide-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            {[
              { platform: 'Twitter / X', color: '#1d9bf0', desc: 'summary_large_image カード' },
              { platform: 'Facebook', color: '#1877f2', desc: 'og:image + タイトル + 説明' },
              { platform: 'Slack', color: '#9f86c0', desc: 'アンフール + サムネイル' },
            ].map(({ platform, color, desc }) => (
              <div key={platform} className="flex flex-col items-center justify-center gap-2 px-4 py-8 text-center">
                <div className="h-10 w-10 rounded-lg" style={{ backgroundColor: `${color}20`, border: `1px solid ${color}30` }}>
                  <div className="m-2 h-6 w-6 rounded" style={{ backgroundColor: `${color}40` }} />
                </div>
                <p className="text-xs font-medium text-primary">{platform}</p>
                <p className="text-xs text-muted">{desc}</p>
              </div>
            ))}
          </div>
          <div className="border-t border-border px-4 py-3 text-center">
            <p className="text-xs text-muted">URLを入力して「取得」を押すと3プラットフォームのプレビューが表示されます</p>
          </div>
        </div>
      )}
    </div>
  )
}
