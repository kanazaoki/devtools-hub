import { NextRequest, NextResponse } from 'next/server'
import { normalizeUrl, assertPublicHost } from '@/lib/urlGuard'
import { rateLimit, clientIp } from '@/lib/rateLimit'
import { safeFetch } from '@/lib/safeFetch'

const MAX_BYTES = 5 * 1024 * 1024 // 5 MB

export async function POST(req: NextRequest) {
  const rl = rateLimit(`image-fetch:${clientIp(req)}`)
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
        'User-Agent': 'Mozilla/5.0 (compatible; ImageColorExtractor/1.0)',
        Accept: 'image/*',
      },
      timeoutMs: 10000,
      maxBytes: MAX_BYTES,
    })

    if (res.status < 200 || res.status >= 300) {
      return NextResponse.json(
        { error: `画像の取得に失敗しました（HTTP ${res.status}）` },
        { status: 502 }
      )
    }

    const contentType = String(res.headers['content-type'] ?? '')
    if (!contentType.startsWith('image/')) {
      return NextResponse.json({ error: '指定されたURLは画像ではありません' }, { status: 400 })
    }

    const base64 = res.body.toString('base64')
    return NextResponse.json({ dataUrl: `data:${contentType};base64,${base64}` })
  } catch (err: unknown) {
    const name = err instanceof Error ? err.name : ''
    if (name === 'TimeoutError') {
      return NextResponse.json({ error: 'タイムアウト（10秒）しました' }, { status: 504 })
    }
    if (name === 'TooLargeError') {
      return NextResponse.json({ error: '画像サイズが大きすぎます（上限 5 MB）' }, { status: 413 })
    }
    if (name === 'BlockedHostError') {
      return NextResponse.json({ error: '有効なURLを入力してください' }, { status: 400 })
    }
    return NextResponse.json({ error: '画像の取得に失敗しました' }, { status: 502 })
  }
}
