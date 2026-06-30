'use client'

import { useState } from 'react'

type Section = 'basic' | 'ogp' | 'twitter'

interface BasicMeta {
  title: string
  description: string
  keywords: string
  author: string
}

interface OgpMeta {
  ogTitle: string
  ogDescription: string
  ogImage: string
  ogUrl: string
  ogType: string
}

interface TwitterMeta {
  twitterCard: string
  twitterTitle: string
  twitterDescription: string
  twitterImage: string
}

const DEFAULT_BASIC: BasicMeta = { title: '', description: '', keywords: '', author: '' }
const DEFAULT_OGP: OgpMeta = { ogTitle: '', ogDescription: '', ogImage: '', ogUrl: '', ogType: 'website' }
const DEFAULT_TWITTER: TwitterMeta = {
  twitterCard: 'summary_large_image',
  twitterTitle: '',
  twitterDescription: '',
  twitterImage: '',
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function buildHtml(basic: BasicMeta, ogp: OgpMeta, twitter: TwitterMeta): string {
  const lines: string[] = []
  if (basic.title) lines.push(`<title>${esc(basic.title)}</title>`)
  if (basic.description) lines.push(`<meta name="description" content="${esc(basic.description)}" />`)
  if (basic.keywords) lines.push(`<meta name="keywords" content="${esc(basic.keywords)}" />`)
  if (basic.author) lines.push(`<meta name="author" content="${esc(basic.author)}" />`)

  const ogFields: [string, string][] = [
    ['og:title', ogp.ogTitle],
    ['og:description', ogp.ogDescription],
    ['og:image', ogp.ogImage],
    ['og:url', ogp.ogUrl],
    ['og:type', ogp.ogType],
  ]
  for (const [prop, val] of ogFields) {
    if (val) lines.push(`<meta property="${prop}" content="${esc(val)}" />`)
  }

  const twFields: [string, string][] = [
    ['twitter:card', twitter.twitterCard],
    ['twitter:title', twitter.twitterTitle],
    ['twitter:description', twitter.twitterDescription],
    ['twitter:image', twitter.twitterImage],
  ]
  for (const [name, val] of twFields) {
    if (val) lines.push(`<meta name="${name}" content="${esc(val)}" />`)
  }

  return lines.join('\n')
}

function CharBar({ value, max }: { value: string; max: number }) {
  const len = value.length
  const pct = Math.min((len / max) * 100, 100)
  const over = len > max
  return (
    <div className="flex items-center gap-2">
      <div className="h-1 flex-1 overflow-hidden rounded-full bg-border">
        <div
          className={`h-full rounded-full transition-all duration-150 ${
            over ? 'bg-red-500' : pct > 80 ? 'bg-amber-500' : 'bg-teal'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={`w-14 text-right font-mono text-[10px] tabular-nums ${over ? 'text-red-400' : 'text-muted'}`}>
        {len}/{max}
      </span>
    </div>
  )
}

const inputClass =
  'w-full rounded border border-border bg-[#070d1a] px-3 py-2 text-sm text-bright outline-none transition-colors focus:border-teal placeholder:text-border'
const labelClass = 'mb-1.5 block font-mono text-[10px] font-semibold uppercase tracking-widest text-muted'

const SECTIONS: { key: Section; label: string }[] = [
  { key: 'basic', label: '基本' },
  { key: 'ogp', label: 'OGP' },
  { key: 'twitter', label: 'Twitter' },
]

export function MetaTagGenerator() {
  const [section, setSection] = useState<Section>('basic')
  const [basic, setBasic] = useState<BasicMeta>(DEFAULT_BASIC)
  const [ogp, setOgp] = useState<OgpMeta>(DEFAULT_OGP)
  const [twitter, setTwitter] = useState<TwitterMeta>(DEFAULT_TWITTER)
  const [copied, setCopied] = useState(false)

  const html = buildHtml(basic, ogp, twitter)

  const handleCopy = () => {
    if (!html) return
    navigator.clipboard.writeText(html).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  const displayTitle = basic.title || ogp.ogTitle || ''
  const displayDesc = basic.description || ogp.ogDescription || ''
  const displayOgTitle = ogp.ogTitle || basic.title || ''
  const displayOgDesc = ogp.ogDescription || basic.description || ''
  const displayUrl = ogp.ogUrl || 'https://example.com'

  return (
    <div className="flex flex-col gap-6 xl:flex-row">
      {/* Left: Form */}
      <div className="flex flex-col gap-5 xl:w-[45%]">
        {/* Section tabs */}
        <div className="flex border-b border-border">
          {SECTIONS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setSection(key)}
              className={`px-5 pb-3 pt-2 text-sm font-medium transition-colors ${
                section === key
                  ? 'border-b-2 border-teal text-teal'
                  : 'border-b-2 border-transparent text-muted hover:text-primary'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {section === 'basic' && (
          <div className="flex flex-col gap-5">
            <div>
              <label className={labelClass}>title</label>
              <input
                type="text"
                value={basic.title}
                onChange={(e) => setBasic({ ...basic, title: e.target.value })}
                placeholder="ページのタイトル（推奨60字以内）"
                className={inputClass}
              />
              <div className="mt-1.5">
                <CharBar value={basic.title} max={60} />
              </div>
            </div>
            <div>
              <label className={labelClass}>description</label>
              <textarea
                value={basic.description}
                onChange={(e) => setBasic({ ...basic, description: e.target.value })}
                placeholder="ページの説明（推奨160字以内）"
                rows={3}
                className={inputClass + ' resize-none'}
              />
              <div className="mt-1.5">
                <CharBar value={basic.description} max={160} />
              </div>
            </div>
            <div>
              <label className={labelClass}>keywords</label>
              <input
                type="text"
                value={basic.keywords}
                onChange={(e) => setBasic({ ...basic, keywords: e.target.value })}
                placeholder="キーワード1, キーワード2"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>author</label>
              <input
                type="text"
                value={basic.author}
                onChange={(e) => setBasic({ ...basic, author: e.target.value })}
                placeholder="著者名"
                className={inputClass}
              />
            </div>
          </div>
        )}

        {section === 'ogp' && (
          <div className="flex flex-col gap-5">
            <div>
              <label className={labelClass}>og:title</label>
              <input
                type="text"
                value={ogp.ogTitle}
                onChange={(e) => setOgp({ ...ogp, ogTitle: e.target.value })}
                placeholder="省略時は title を使用"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>og:description</label>
              <textarea
                value={ogp.ogDescription}
                onChange={(e) => setOgp({ ...ogp, ogDescription: e.target.value })}
                placeholder="OG説明文"
                rows={3}
                className={inputClass + ' resize-none'}
              />
            </div>
            <div>
              <label className={labelClass}>og:image</label>
              <input
                type="text"
                value={ogp.ogImage}
                onChange={(e) => setOgp({ ...ogp, ogImage: e.target.value })}
                placeholder="https://example.com/og.png"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>og:url</label>
              <input
                type="text"
                value={ogp.ogUrl}
                onChange={(e) => setOgp({ ...ogp, ogUrl: e.target.value })}
                placeholder="https://example.com/page"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>og:type</label>
              <select
                value={ogp.ogType}
                onChange={(e) => setOgp({ ...ogp, ogType: e.target.value })}
                className={inputClass + ' cursor-pointer'}
              >
                {['website', 'article', 'book', 'profile', 'video.movie', 'music.song'].map((t) => (
                  <option key={t} value={t} className="bg-[#070d1a]">{t}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {section === 'twitter' && (
          <div className="flex flex-col gap-5">
            <div>
              <label className={labelClass}>twitter:card</label>
              <select
                value={twitter.twitterCard}
                onChange={(e) => setTwitter({ ...twitter, twitterCard: e.target.value })}
                className={inputClass + ' cursor-pointer'}
              >
                {['summary', 'summary_large_image', 'app', 'player'].map((t) => (
                  <option key={t} value={t} className="bg-[#070d1a]">{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>twitter:title</label>
              <input
                type="text"
                value={twitter.twitterTitle}
                onChange={(e) => setTwitter({ ...twitter, twitterTitle: e.target.value })}
                placeholder="Twitterカードタイトル"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>twitter:description</label>
              <textarea
                value={twitter.twitterDescription}
                onChange={(e) => setTwitter({ ...twitter, twitterDescription: e.target.value })}
                placeholder="Twitterカード説明文"
                rows={3}
                className={inputClass + ' resize-none'}
              />
            </div>
            <div>
              <label className={labelClass}>twitter:image</label>
              <input
                type="text"
                value={twitter.twitterImage}
                onChange={(e) => setTwitter({ ...twitter, twitterImage: e.target.value })}
                placeholder="https://example.com/twitter.png"
                className={inputClass}
              />
            </div>
          </div>
        )}
      </div>

      {/* Right: Previews + Output */}
      <div className="flex flex-1 flex-col gap-5">
        {/* Google Search Preview */}
        <div className="rounded border border-border bg-[#070d1a] p-4">
          <p className="mb-3 font-mono text-[10px] font-semibold uppercase tracking-widest text-muted">
            Google 検索プレビュー
          </p>
          <div className="rounded bg-[#0c1525] p-4 space-y-1">
            <p className="text-sm font-medium text-[#93c5fd] line-clamp-1 leading-snug">
              {displayTitle || <span className="text-border italic">タイトルを入力してください</span>}
            </p>
            <p className="font-mono text-xs text-[#34d399]">
              {displayUrl.replace(/^https?:\/\//, '').split('/')[0]}
            </p>
            <p className="text-xs leading-relaxed text-[#94a3b8] line-clamp-2">
              {displayDesc || <span className="text-border italic">説明文を入力してください</span>}
            </p>
          </div>
        </div>

        {/* SNS Card Preview */}
        <div className="rounded border border-border bg-[#070d1a] p-4">
          <p className="mb-3 font-mono text-[10px] font-semibold uppercase tracking-widest text-muted">
            SNS カードプレビュー
          </p>
          <div className="overflow-hidden rounded border border-border">
            {ogp.ogImage ? (
              <div className="relative h-40 w-full overflow-hidden bg-[#0c1525]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={ogp.ogImage}
                  alt="OGP preview"
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    ;(e.currentTarget as HTMLImageElement).style.display = 'none'
                  }}
                />
              </div>
            ) : (
              <div className="flex h-40 flex-col items-center justify-center gap-2 bg-[#0c1525]">
                {/* Blueprint wireframe */}
                <div className="relative h-20 w-36 rounded border border-dashed border-border/60">
                  <div className="absolute inset-2 flex items-center justify-center">
                    <div className="space-y-1.5 w-full px-2">
                      <div className="h-1.5 rounded-sm bg-border/50 w-3/4" />
                      <div className="h-1.5 rounded-sm bg-border/30 w-full" />
                      <div className="h-1.5 rounded-sm bg-border/30 w-2/3" />
                    </div>
                  </div>
                </div>
                <p className="text-[10px] text-border">og:image URL を入力すると表示</p>
              </div>
            )}
            <div className="bg-[#0e1a2e] px-4 py-3">
              <p className="text-xs font-semibold text-bright line-clamp-1">
                {displayOgTitle || <span className="text-border italic">og:title</span>}
              </p>
              <p className="mt-0.5 text-xs text-muted line-clamp-2 leading-relaxed">
                {displayOgDesc || <span className="text-border italic">og:description</span>}
              </p>
              <p className="mt-1 font-mono text-[10px] text-dim">
                {displayUrl.replace(/^https?:\/\//, '').split('/')[0]}
              </p>
            </div>
          </div>
        </div>

        {/* HTML Output */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-widest text-muted">HTML 出力</p>
            <button
              onClick={handleCopy}
              disabled={!html}
              className={`rounded border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-40 ${
                copied
                  ? 'border-teal/50 text-teal'
                  : 'border-border text-dim hover:border-teal/50 hover:text-teal'
              }`}
            >
              {copied ? '✓ コピー済み' : '全てコピー'}
            </button>
          </div>
          <div className="rounded border border-border bg-[#070d1a] p-4">
            {html ? (
              <pre className="overflow-x-auto font-mono text-xs leading-relaxed text-bright">{html}</pre>
            ) : (
              <p className="font-mono text-xs text-border">フォームに入力すると meta タグが生成されます</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
