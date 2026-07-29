import { NextRequest, NextResponse } from 'next/server'
import { normalizeUrl, assertPublicHost } from '@/lib/urlGuard'
import { rateLimit, clientIp } from '@/lib/rateLimit'

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
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)

    const res = await fetch(norm.url, {
      signal: controller.signal,
      redirect: 'error',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; OGTagPreview/1.0)',
        Accept: 'text/html,application/xhtml+xml',
      },
    })
    clearTimeout(timeout)

    if (!res.ok) {
      return NextResponse.json(
        { error: `フェッチに失敗しました（HTTP ${res.status}）` },
        { status: 502 }
      )
    }

    const declared = Number(res.headers.get('content-length') ?? 0)
    if (declared > MAX_BYTES) {
      return NextResponse.json({ error: 'ページサイズが大きすぎます' }, { status: 413 })
    }

    // Stream with a hard cap so a missing/spoofed content-length can't buffer
    // an unbounded response into memory.
    const reader = res.body?.getReader()
    if (!reader) {
      return NextResponse.json({ error: 'OG タグの取得に失敗しました' }, { status: 502 })
    }
    const chunks: Uint8Array[] = []
    let total = 0
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      total += value.byteLength
      if (total > MAX_BYTES) {
        await reader.cancel()
        return NextResponse.json({ error: 'ページサイズが大きすぎます' }, { status: 413 })
      }
      chunks.push(value)
    }

    const html = new TextDecoder('utf-8').decode(Buffer.concat(chunks))
    const data = extractMeta(html, norm.url)

    return NextResponse.json({ data })
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') {
      return NextResponse.json({ error: 'タイムアウト（10秒）しました' }, { status: 504 })
    }
    return NextResponse.json({ error: 'OG タグの取得に失敗しました' }, { status: 502 })
  }
}
