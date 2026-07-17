import { NextRequest, NextResponse } from 'next/server'

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

function isPrivateUrl(urlStr: string): boolean {
  try {
    const { hostname } = new URL(urlStr)
    const hn = hostname.toLowerCase().replace(/^\[|\]$/g, '')
    if (hn === 'localhost' || hn === '0.0.0.0' || hn === '::1') return true
    const ipv4 = hn.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/)
    if (ipv4) {
      const [a, b] = [Number(ipv4[1]), Number(ipv4[2])]
      if (a === 10) return true
      if (a === 127) return true
      if (a === 169 && b === 254) return true
      if (a === 172 && b >= 16 && b <= 31) return true
      if (a === 192 && b === 168) return true
      if (a === 0) return true
      if (a === 100 && b >= 64 && b <= 127) return true
    }
    if (hn.startsWith('fe80') || hn.startsWith('fc') || hn.startsWith('fd')) return true
    return false
  } catch {
    return true
  }
}

export async function POST(req: NextRequest) {
  let url: string
  try {
    const body = await req.json()
    url = body.url?.trim()
  } catch {
    return NextResponse.json({ error: 'リクエストの形式が正しくありません' }, { status: 400 })
  }

  if (!url) {
    return NextResponse.json({ error: 'URLを入力してください' }, { status: 400 })
  }

  if (!/^https?:\/\//i.test(url)) {
    url = 'https://' + url
  }

  try {
    new URL(url)
  } catch {
    return NextResponse.json({ error: '有効なURLを入力してください' }, { status: 400 })
  }

  if (isPrivateUrl(url)) {
    return NextResponse.json({ error: '有効なURLを入力してください' }, { status: 400 })
  }

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)

    const res = await fetch(url, {
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

    const contentLength = Number(res.headers.get('content-length') ?? 0)
    if (contentLength > MAX_BYTES) {
      return NextResponse.json({ error: 'ページサイズが大きすぎます' }, { status: 413 })
    }

    const html = await res.text()
    if (html.length > MAX_BYTES) {
      return NextResponse.json({ error: 'ページサイズが大きすぎます' }, { status: 413 })
    }

    const data = extractMeta(html, url)

    return NextResponse.json({ data })
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') {
      return NextResponse.json({ error: 'タイムアウト（10秒）しました' }, { status: 504 })
    }
    return NextResponse.json({ error: 'OG タグの取得に失敗しました' }, { status: 502 })
  }
}
