import { ImageResponse } from 'next/og'
import { getToolBySlug } from '@/data/tools'

export const runtime = 'edge'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

type Props = {
  params: { slug: string }
}

export default function Image({ params }: Props) {
  const tool = getToolBySlug(params.slug)
  const name = tool?.name ?? 'devtools-hub'
  const tagline = tool?.tagline ?? '開発者・クリエイター向け無料ツール集'

  return new ImageResponse(
    (
      <div
        style={{
          background: '#0a0a14',
          width: '100%',
          height: '100%',
          display: 'flex',
          fontFamily: 'monospace',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* 左 teal バー */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: 6,
            height: '100%',
            background: '#00C896',
          }}
        />

        {/* 右下コーナーグロー */}
        <div
          style={{
            position: 'absolute',
            right: -100,
            bottom: -100,
            width: 360,
            height: 360,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(0,200,150,0.10) 0%, transparent 70%)',
          }}
        />

        {/* メインコンテンツ */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            paddingLeft: 72,
            paddingRight: 60,
            paddingTop: 60,
            paddingBottom: 60,
            flex: 1,
          }}
        >
          {/* ブランドライン */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 36,
            }}
          >
            <div
              style={{
                width: 16,
                height: 16,
                borderRadius: 3,
                background: '#00C896',
              }}
            />
            <div
              style={{
                color: '#00C896',
                fontSize: 13,
                letterSpacing: '0.3em',
                textTransform: 'uppercase',
              }}
            >
              devtools-hub
            </div>
          </div>

          {/* ツール名 */}
          <div
            style={{
              color: '#f0f0f8',
              fontSize: 72,
              fontWeight: 700,
              letterSpacing: '-0.03em',
              lineHeight: 1.05,
              marginBottom: 20,
              maxWidth: 1000,
            }}
          >
            {name}
          </div>

          {/* タグライン */}
          <div
            style={{
              color: '#6b6b80',
              fontSize: 26,
              lineHeight: 1.4,
              maxWidth: 800,
              marginBottom: 44,
            }}
          >
            {tagline}
          </div>

          {/* フッター */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: '#00C89612',
              border: '1px solid #00C89630',
              borderRadius: 8,
              padding: '10px 20px',
              width: 'fit-content',
            }}
          >
            <div style={{ color: '#00C896', fontSize: 14 }}>
              無料で使う → devtools-hub.dev
            </div>
          </div>
        </div>
      </div>
    ),
    size
  )
}
