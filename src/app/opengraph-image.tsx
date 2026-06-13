import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function Image() {
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
        {/* 左 teal バー — サイトシグネチャ */}
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
            right: -120,
            bottom: -120,
            width: 400,
            height: 400,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(0,200,150,0.12) 0%, transparent 70%)',
          }}
        />

        {/* 左上グリッドドット装飾 */}
        <div
          style={{
            position: 'absolute',
            top: 40,
            right: 60,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            opacity: 0.15,
          }}
        >
          {[0, 1, 2, 3].map((row) => (
            <div key={row} style={{ display: 'flex', gap: 12 }}>
              {[0, 1, 2, 3, 4].map((col) => (
                <div
                  key={col}
                  style={{
                    width: 3,
                    height: 3,
                    borderRadius: '50%',
                    background: '#00C896',
                  }}
                />
              ))}
            </div>
          ))}
        </div>

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
              gap: 10,
              marginBottom: 32,
            }}
          >
            <div
              style={{
                width: 20,
                height: 20,
                borderRadius: 4,
                background: '#00C896',
              }}
            />
            <div
              style={{
                color: '#00C896',
                fontSize: 14,
                letterSpacing: '0.3em',
                textTransform: 'uppercase',
              }}
            >
              devtools-hub.dev
            </div>
          </div>

          {/* メインタイトル */}
          <div
            style={{
              color: '#f0f0f8',
              fontSize: 80,
              fontWeight: 700,
              letterSpacing: '-0.03em',
              lineHeight: 1,
              marginBottom: 20,
            }}
          >
            devtools-hub
          </div>

          {/* サブタイトル */}
          <div
            style={{
              color: '#6b6b80',
              fontSize: 24,
              marginBottom: 48,
              lineHeight: 1.4,
            }}
          >
            開発者・クリエイター向け 無料ツール集
          </div>

          {/* タグピル群 */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {[
              { label: 'カラー変換', color: '#a855f7' },
              { label: 'WebP変換', color: '#10b981' },
              { label: 'グラデーション', color: '#ec4899' },
              { label: '画像リサイズ', color: '#84cc16' },
              { label: 'テキスト UI', color: '#f59e0b' },
            ].map(({ label, color }) => (
              <div
                key={label}
                style={{
                  background: `${color}18`,
                  border: `1px solid ${color}35`,
                  color: color,
                  borderRadius: 6,
                  padding: '6px 14px',
                  fontSize: 13,
                  letterSpacing: '0.02em',
                }}
              >
                {label}
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    size
  )
}
