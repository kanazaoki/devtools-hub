import http from 'node:http'
import https from 'node:https'
import dns from 'node:dns'
import net from 'node:net'
import { ipIsPrivate } from '@/lib/urlGuard'

// /api/*-fetch から外部 URL を取りに行くための取得関数。
//
// assertPublicHost で事前に DNS を引いて確かめても、fetch() は接続のときに
// もう一度 DNS を引く。1回目だけ公開 IP を返し、2回目に内部 IP を返すように
// 細工された名前（DNS リバインディング）だと、事前の確認をすり抜ける。
// ここでは接続に使う lookup そのものを差し替え、実際に接続する IP を
// 接続の直前に確かめる。確かめた IP 以外には接続しない。

export class BlockedHostError extends Error {
  constructor() {
    super('blocked host')
    this.name = 'BlockedHostError'
  }
}
export class TooLargeError extends Error {
  constructor() {
    super('response too large')
    this.name = 'TooLargeError'
  }
}
export class TimeoutError extends Error {
  constructor() {
    super('timeout')
    this.name = 'TimeoutError'
  }
}
export class RedirectError extends Error {
  constructor() {
    super('redirect not followed')
    this.name = 'RedirectError'
  }
}

type LookupCallback = (
  err: NodeJS.ErrnoException | null,
  address: string | dns.LookupAddress[],
  family?: number
) => void

// node:http が接続先を決めるときに呼ぶ lookup。
// 新しい Node は { all: true } で呼ぶ（複数アドレスを試すため）ので両方に対応する。
function guardedLookup(hostname: string, options: dns.LookupOptions, callback: LookupCallback) {
  dns.lookup(hostname, { ...options, all: true }, (err, addresses) => {
    if (err) return callback(err, '')
    const list = addresses as dns.LookupAddress[]
    if (!list.length || list.some((a) => ipIsPrivate(a.address))) {
      return callback(new BlockedHostError() as NodeJS.ErrnoException, '')
    }
    if (options && options.all) return callback(null, list)
    callback(null, list[0].address, list[0].family)
  })
}

export interface SafeResponse {
  status: number
  headers: http.IncomingHttpHeaders
  body: Buffer
}

export interface SafeFetchOptions {
  headers: Record<string, string>
  timeoutMs: number
  maxBytes: number
}

export function safeFetch(urlStr: string, opts: SafeFetchOptions): Promise<SafeResponse> {
  return new Promise((resolve, reject) => {
    let url: URL
    try {
      url = new URL(urlStr)
    } catch {
      return reject(new BlockedHostError())
    }
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return reject(new BlockedHostError())

    // IP を直接書いた URL では lookup が呼ばれないので、ここで確かめる。
    const literal = url.hostname.replace(/^\[|\]$/g, '')
    if (net.isIP(literal) && ipIsPrivate(literal)) return reject(new BlockedHostError())

    const mod = url.protocol === 'https:' ? https : http
    let settled = false
    const done = (fn: () => void) => {
      if (settled) return
      settled = true
      fn()
    }

    const req = mod.get(url, { headers: opts.headers, lookup: guardedLookup }, (res) => {
      const status = res.statusCode ?? 0
      if (status >= 300 && status < 400) {
        // リダイレクト先は確かめていないので追わない（fetch の redirect: 'error' と同じ扱い）
        res.resume()
        return done(() => reject(new RedirectError()))
      }

      const declared = Number(res.headers['content-length'] ?? 0)
      if (declared > opts.maxBytes) {
        res.destroy()
        return done(() => reject(new TooLargeError()))
      }

      // content-length が無い・偽っている場合に備え、読みながら上限で切る
      const chunks: Buffer[] = []
      let total = 0
      res.on('data', (chunk: Buffer) => {
        total += chunk.length
        if (total > opts.maxBytes) {
          res.destroy()
          done(() => reject(new TooLargeError()))
          return
        }
        chunks.push(chunk)
      })
      res.on('end', () => done(() => resolve({ status, headers: res.headers, body: Buffer.concat(chunks) })))
      res.on('error', (e) => done(() => reject(e)))
    })

    req.setTimeout(opts.timeoutMs, () => {
      req.destroy()
      done(() => reject(new TimeoutError()))
    })
    req.on('error', (e) => done(() => reject(e)))
  })
}
