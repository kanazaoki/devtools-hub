import { lookup } from 'node:dns/promises'
import net from 'node:net'

// SSRF guard shared by the /api/*-fetch routes.
// The string-only hostname check is not enough: a public domain name can have
// a DNS record pointing at a private/internal IP (DNS rebinding). So we also
// resolve the hostname and reject if ANY resolved address is private.

function ipIsPrivate(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split('.').map(Number)
    if (a === 0) return true
    if (a === 10) return true
    if (a === 127) return true
    if (a === 169 && b === 254) return true // link-local + cloud metadata
    if (a === 172 && b >= 16 && b <= 31) return true
    if (a === 192 && b === 168) return true
    if (a === 100 && b >= 64 && b <= 127) return true // CGNAT
    if (a >= 224) return true // multicast / reserved
    return false
  }
  if (net.isIPv6(ip)) {
    const lc = ip.toLowerCase()
    if (lc === '::' || lc === '::1') return true
    if (lc.startsWith('fe80') || lc.startsWith('fc') || lc.startsWith('fd')) return true
    // IPv4-mapped IPv6 (::ffff:a.b.c.d)
    const m = lc.match(/^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/)
    if (m) return ipIsPrivate(m[1])
    return false
  }
  return true // unknown format → treat as unsafe
}

export interface NormalizedUrl {
  url: string
}

// Add scheme if missing, validate shape and protocol.
export function normalizeUrl(input: unknown): NormalizedUrl | { error: string } {
  let url = typeof input === 'string' ? input.trim() : ''
  if (!url) return { error: 'URLを入力してください' }
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return { error: '有効なURLを入力してください' }
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { error: '有効なURLを入力してください' }
  }
  return { url: parsed.href }
}

// Returns null when the host is safe to fetch, or an error string when it must
// be blocked. Resolves DNS so domains that map to internal IPs are rejected.
export async function assertPublicHost(urlStr: string): Promise<string | null> {
  let hostname: string
  try {
    hostname = new URL(urlStr).hostname
  } catch {
    return '有効なURLを入力してください'
  }
  const hn = hostname.toLowerCase().replace(/^\[|\]$/g, '')

  if (!hn || hn === 'localhost' || hn.endsWith('.localhost')) {
    return '有効なURLを入力してください'
  }

  // Literal IP address → validate directly.
  if (net.isIP(hn)) {
    return ipIsPrivate(hn) ? '有効なURLを入力してください' : null
  }

  // Domain name → resolve and validate every returned address.
  let addrs: { address: string }[]
  try {
    addrs = await lookup(hn, { all: true })
  } catch {
    return '有効なURLを入力してください'
  }
  if (!addrs.length) return '有効なURLを入力してください'
  for (const a of addrs) {
    if (ipIsPrivate(a.address)) return '有効なURLを入力してください'
  }
  return null
}
