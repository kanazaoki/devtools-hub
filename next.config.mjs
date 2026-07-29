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
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ]
  },
}

export default nextConfig;
