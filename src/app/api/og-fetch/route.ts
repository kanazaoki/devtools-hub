import { NextRequest, NextResponse } from 'next/server'

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

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)

    const res = await fetch(url, {
      signal: controller.signal,
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

    const html = await res.text()
    const data = extractMeta(html, url)

    return NextResponse.json({ data })
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') {
      return NextResponse.json({ error: 'タイムアウト（10秒）しました' }, { status: 504 })
    }
    return NextResponse.json(
      { error: `取得に失敗しました: ${err instanceof Error ? err.message : '不明なエラー'}` },
      { status: 502 }
    )
  }
}
