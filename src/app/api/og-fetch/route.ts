import { NextRequest, NextResponse } from 'next/server'
import { normalizeUrl, assertPublicHost } from '@/lib/urlGuard'
import { rateLimit, clientIp } from '@/lib/rateLimit'
import { safeFetch } from '@/lib/safeFetch'

const MAX_BYTES = 1 * 1024 * 1024 // 1 MB

export interface OgData {
  title: string | null
  description: string | null
  image: string | null
  imageAlt: string | null
  type: string | null
  url: string | null
  siteName: string | null
  twitterCard: string | null
  twitterTitle: string | null
  twitterDescription: string | null
  twitterImage: string | null
  allMeta: { property: string; content: string }[]
}

function extractMeta(html: string, baseUrl: string): OgData {
  const allMeta: { property: string; content: string }[] = []

  const metaRegex = /<meta\s+([^>]+)>/gi
  let match
  while ((match = metaRegex.exec(html)) !== null) {
    const attrs = match[1]
    const propertyMatch = attrs.match(/(?:property|name)\s*=\s*["']([^"']+)["']/i)
    const contentMatch = attrs.match(/content\s*=\s*["']([^"']*)["']/i)
    if (propertyMatch && contentMatch) {
      allMeta.push({ property: propertyMatch[1], content: contentMatch[1] })
    }
  }

  const get = (key: string) => allMeta.find((m) => m.property === key)?.content ?? null

  const resolveUrl = (val: string | null): string | null => {
    if (!val) return null
    try {
      return new URL(val, baseUrl).href
    } catch {
      return val
    }
  }

  return {
    title: get('og:title'),
    description: get('og:description'),
    image: resolveUrl(get('og:image')),
    imageAlt: get('og:image:alt'),
    type: get('og:type'),
    url: get('og:url'),
    siteName: get('og:site_name'),
    twitterCard: get('twitter:card'),
    twitterTitle: get('twitter:title'),
    twitterDescription: get('twitter:description'),
    twitterImage: resolveUrl(get('twitter:image')),
    allMeta,
  }
}

export async function POST(req: NextRequest) {
  const rl = rateLimit(`og-fetch:${clientIp(req)}`)
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'リクエストが多すぎます。しばらくしてからお試しください' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
    )
  }

  let rawUrl: unknown
  try {
    rawUrl = (await req.json())?.url
  } catch {
    return NextResponse.json({ error: 'リクエストの形式が正しくありません' }, { status: 400 })
  }

  const norm = normalizeUrl(rawUrl)
  if ('error' in norm) {
    return NextResponse.json({ error: norm.error }, { status: 400 })
  }

  const blocked = await assertPublicHost(norm.url)
  if (blocked) {
    return NextResponse.json({ error: blocked }, { status: 400 })
  }

  try {
    // 接続の直前に接続先IPを確かめる取得関数（DNSリバインディング対策）
    const res = await safeFetch(norm.url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; OGTagPreview/1.0)',
        Accept: 'text/html,application/xhtml+xml',
      },
      timeoutMs: 10000,
      maxBytes: MAX_BYTES,
    })

    if (res.status < 200 || res.status >= 300) {
      return NextResponse.json(
        { error: `フェッチに失敗しました（HTTP ${res.status}）` },
        { status: 502 }
      )
    }

    const html = new TextDecoder('utf-8').decode(res.body)
    const data = extractMeta(html, norm.url)

    return NextResponse.json({ data })
  } catch (err: unknown) {
    const name = err instanceof Error ? err.name : ''
    if (name === 'TimeoutError') {
      return NextResponse.json({ error: 'タイムアウト（10秒）しました' }, { status: 504 })
    }
    if (name === 'TooLargeError') {
      return NextResponse.json({ error: 'ページサイズが大きすぎます' }, { status: 413 })
    }
    if (name === 'BlockedHostError') {
      return NextResponse.json({ error: '有効なURLを入力してください' }, { status: 400 })
    }
    return NextResponse.json({ error: 'OG タグの取得に失敗しました' }, { status: 502 })
  }
}
