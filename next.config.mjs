/** @type {import('next').NextConfig} */

// Baseline security headers applied to every route.
// NOTE: a Content-Security-Policy is intentionally omitted for now — a strict
// CSP easily breaks Google AdSense / Vercel Analytics / Next's inline runtime
// scripts, and AdSense review is in progress. Add a tested Report-Only CSP
// before enforcing one.
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
]

const nextConfig = {
  // 画像最適化API（/_next/image）は使っていない（next/image の利用は0件）。
  // Next.js 14 系にはこのAPIに関する未修正の脆弱性が残っている
  // （AVIF処理のRCE・DoS・ディスクキャッシュの肥大化。修正は15.5.24以降）。
  // 使わない入口は閉じておく。
  images: { unoptimized: true },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ]
  },
  async redirects() {
    return [
      // url-parser-builder was merged into url-builder (duplicate tool).
      {
        source: '/tools/url-parser-builder',
        destination: '/tools/url-builder',
        permanent: true,
      },
    ]
  },
}

export default nextConfig;
