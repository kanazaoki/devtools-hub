import { lookup } from 'node:dns/promises'
import net from 'node:net'

// SSRF guard shared by the /api/*-fetch routes.
// The string-only hostname check is not enough: a public domain name can have
// a DNS record pointing at a private/internal IP. So we also resolve the
// hostname and reject if ANY resolved address is private.
//
// ⚠ assertPublicHost is an early check for a friendly error message only.
// It cannot stop DNS rebinding on its own: the actual connection resolves the
// name again. The binding check happens in safeFetch, which validates the IP
// it is about to connect to. Always fetch through safeFetch, never fetch().

// IPv6 を8つの16ビット値に展開する。
// ⚠ 文字列の見た目で判定してはいけない。URL の解析は `::ffff:127.0.0.1` を
// `::ffff:7f00:1` に書き換えるので、ドット表記を前提にした判定は実際の入力では
// 一度も一致しない（2026-10-22 にこれで内部の 127.0.0.1 まで届くことを確認した）。
// そこで URL に正規化させてから数値に展開し、数値で判定する。
function ipv6Groups(ip: string): number[] | null {
  let host: string
  try {
    host = new URL(`http://[${ip.replace(/%.*$/, '')}]/`).hostname.slice(1, -1)
  } catch {
    return null
  }
  const parts = host.split('::')
  if (parts.length > 2) return null
  const head = parts[0] ? parts[0].split(':') : []
  const tail = parts.length === 2 && parts[1] ? parts[1].split(':') : []
  const fill = parts.length === 2 ? 8 - head.length - tail.length : 0
  if (fill < 0) return null
  const groups = [...head, ...Array(fill).fill('0'), ...tail].map((g) => parseInt(g, 16))
  if (groups.length !== 8 || groups.some((n) => !Number.isInteger(n) || n < 0 || n > 0xffff)) return null
  return groups
}

const v4From = (hi: number, lo: number) => `${hi >> 8}.${hi & 255}.${lo >> 8}.${lo & 255}`

export function ipIsPrivate(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const [a, b, c] = ip.split('.').map(Number)
    if (a === 0) return true
    if (a === 10) return true
    if (a === 127) return true
    if (a === 169 && b === 254) return true // link-local + cloud metadata
    if (a === 172 && b >= 16 && b <= 31) return true
    if (a === 192 && b === 168) return true
    if (a === 192 && b === 0 && c === 0) return true // IETF protocol assignments
    if (a === 100 && b >= 64 && b <= 127) return true // CGNAT
    if (a === 198 && (b === 18 || b === 19)) return true // benchmarking
    if (a >= 224) return true // multicast / reserved / broadcast
    return false
  }
  if (net.isIPv6(ip)) {
    const g = ipv6Groups(ip)
    if (!g) return true
    if (g.every((x) => x === 0)) return true // ::
    if (g.slice(0, 7).every((x) => x === 0) && g[7] === 1) return true // ::1
    // IPv4 を中に埋め込んだ形は、埋め込まれた IPv4 で判定する
    if (g.slice(0, 5).every((x) => x === 0) && g[5] === 0xffff) return ipIsPrivate(v4From(g[6], g[7])) // ::ffff:0:0/96 mapped
    if (g.slice(0, 6).every((x) => x === 0)) return ipIsPrivate(v4From(g[6], g[7])) // ::/96 compatible（旧式）
    if (g[0] === 0x64 && g[1] === 0xff9b) return ipIsPrivate(v4From(g[6], g[7])) // NAT64
    if (g[0] === 0x2002) return ipIsPrivate(v4From(g[1], g[2])) // 6to4
    if (g[0] === 0x2001 && g[1] === 0) return true // Teredo
    const f = g[0]
    if ((f & 0xfe00) === 0xfc00) return true // fc00::/7 unique local
    if ((f & 0xffc0) === 0xfe80) return true // fe80::/10 link-local
    if ((f & 0xffc0) === 0xfec0) return true // fec0::/10 site-local（旧式）
    if ((f & 0xff00) === 0xff00) return true // multicast
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
