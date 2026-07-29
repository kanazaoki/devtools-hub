import { NextRequest, NextResponse } from 'next/server'
import { normalizeUrl, assertPublicHost } from '@/lib/urlGuard'
import { rateLimit, clientIp } from '@/lib/rateLimit'

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
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)

    const res = await fetch(norm.url, {
      signal: controller.signal,
      redirect: 'error',
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
      return NextResponse.json({ error: '指定されたURLは画像ではありません' }, { status: 400 })
    }

    const declared = Number(res.headers.get('content-length') ?? 0)
    if (declared > MAX_BYTES) {
      return NextResponse.json({ error: '画像サイズが大きすぎます（上限 5 MB）' }, { status: 413 })
    }

    // Stream with a hard cap so a missing/spoofed content-length can't
    // buffer an unbounded response into memory.
    const reader = res.body?.getReader()
    if (!reader) {
      return NextResponse.json({ error: '画像の取得に失敗しました' }, { status: 502 })
    }
    const chunks: Uint8Array[] = []
    let total = 0
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      total += value.byteLength
      if (total > MAX_BYTES) {
        await reader.cancel()
        return NextResponse.json({ error: '画像サイズが大きすぎます（上限 5 MB）' }, { status: 413 })
      }
      chunks.push(value)
    }

    const base64 = Buffer.concat(chunks).toString('base64')
    return NextResponse.json({ dataUrl: `data:${contentType};base64,${base64}` })
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') {
      return NextResponse.json({ error: 'タイムアウト（10秒）しました' }, { status: 504 })
    }
    return NextResponse.json({ error: '画像の取得に失敗しました' }, { status: 502 })
  }
}
