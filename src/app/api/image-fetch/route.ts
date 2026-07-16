import { NextRequest, NextResponse } from 'next/server'

const MAX_BYTES = 5 * 1024 * 1024 // 5 MB

function isPrivateUrl(urlStr: string): boolean {
  try {
    const { hostname } = new URL(urlStr)
    const hn = hostname.toLowerCase().replace(/^\[|\]$/g, '') // strip IPv6 brackets
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
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ImageColorExtractor/1.0)',
        Accept: 'image/*',
      },
    })
    clearTimeout(timeout)

    if (!res.ok) {
      return NextResponse.json(
        { error: `画像の取得に失敗しました（HTTP ${res.status}）` },
        { status: 502 }
      )
    }

    const contentType = res.headers.get('content-type') ?? ''
    if (!contentType.startsWith('image/')) {
      return NextResponse.json(
        { error: '指定されたURLは画像ではありません' },
        { status: 400 }
      )
    }

    const contentLength = Number(res.headers.get('content-length') ?? 0)
    if (contentLength > MAX_BYTES) {
      return NextResponse.json({ error: '画像サイズが大きすぎます（上限 5 MB）' }, { status: 413 })
    }

    const buffer = await res.arrayBuffer()
    if (buffer.byteLength > MAX_BYTES) {
      return NextResponse.json({ error: '画像サイズが大きすぎます（上限 5 MB）' }, { status: 413 })
    }

    const base64 = Buffer.from(buffer).toString('base64')
    return NextResponse.json({ dataUrl: `data:${contentType};base64,${base64}` })
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') {
      return NextResponse.json({ error: 'タイムアウト（10秒）しました' }, { status: 504 })
    }
    return NextResponse.json({ error: '画像の取得に失敗しました' }, { status: 502 })
  }
}
