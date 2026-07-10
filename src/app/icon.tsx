import { ImageResponse } from 'next/og'

export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          background: '#0d1117',
          borderRadius: 6,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'monospace',
          fontSize: 13,
          fontWeight: 700,
          color: '#2dd4bf',
          letterSpacing: '-0.5px',
        }}
      >
        {'>_'}
      </div>
    ),
    { ...size }
  )
}
