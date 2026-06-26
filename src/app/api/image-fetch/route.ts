import { NextRequest, NextResponse } from 'next/server'

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

    const buffer = await res.arrayBuffer()
    const base64 = Buffer.from(buffer).toString('base64')
    return NextResponse.json({ dataUrl: `data:${contentType};base64,${base64}` })
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
