// JWT の署名をブラウザの WebCrypto で検証する。
//
// ⚠ ヘッダーの alg をそのまま信じて検証方法を決めると、「公開鍵を HS256 の共通鍵として
// 使わせる」アルゴリズム混同攻撃や、alg: none（署名なし）を受け入れる事故につながる。
// ここでは鍵の種類（共通鍵か公開鍵か）を先に決め、alg と鍵の種類が合わなければ失敗にする。

export type VerifyResult =
  | { ok: true; alg: string; note?: string }
  | { ok: false; alg: string; reason: string }

const HASH: Record<string, string> = { '256': 'SHA-256', '384': 'SHA-384', '512': 'SHA-512' }
const CURVE: Record<string, string> = { ES256: 'P-256', ES384: 'P-384', ES512: 'P-521' }

export function b64urlToBytes(s: string): Uint8Array<ArrayBuffer> {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(s.length / 4) * 4, '=')
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

/** Base64URL を UTF-8 として読む（atob だけだと日本語が文字化けする） */
export function b64urlToText(s: string): string {
  return new TextDecoder().decode(b64urlToBytes(s))
}

function pemToDer(pem: string): Uint8Array<ArrayBuffer> {
  const body = pem.replace(/-----(BEGIN|END) [^-]+-----/g, '').replace(/\s+/g, '')
  return b64urlToBytes(body.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''))
}

export const looksLikePublicKey = (key: string) => /-----BEGIN (PUBLIC KEY|RSA PUBLIC KEY|CERTIFICATE)-----/.test(key) || /"kty"\s*:\s*"(RSA|EC)"/.test(key)

export async function verifyJwt(token: string, key: string): Promise<VerifyResult> {
  const parts = token.trim().split('.')
  if (parts.length !== 3) return { ok: false, alg: '?', reason: 'JWT は3つのパートが必要です' }
  let header: { alg?: string; kid?: string }
  try {
    header = JSON.parse(b64urlToText(parts[0]))
  } catch {
    return { ok: false, alg: '?', reason: 'ヘッダーを読めません' }
  }
  const alg = String(header.alg ?? '')
  if (!alg || alg.toLowerCase() === 'none')
    return { ok: false, alg: alg || '(なし)', reason: 'alg が none（署名なし）です。このトークンは誰でも作れるので、受け入れてはいけません' }

  const data = new TextEncoder().encode(`${parts[0]}.${parts[1]}`)
  const sig = b64urlToBytes(parts[2])
  const family = alg.slice(0, 2)
  const hash = HASH[alg.slice(2)]
  if (!hash || !['HS', 'RS', 'PS', 'ES'].includes(family)) return { ok: false, alg, reason: `${alg} には対応していません` }

  const isPublic = looksLikePublicKey(key)
  try {
    if (family === 'HS') {
      if (isPublic)
        return {
          ok: false,
          alg,
          reason: 'HS 系なのに公開鍵が入っています。公開鍵を共通鍵として検証させるのは「アルゴリズム混同」攻撃の形です。サーバーは alg を固定して検証してください',
        }
      const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(key), { name: 'HMAC', hash }, false, ['verify'])
      const ok = await crypto.subtle.verify('HMAC', k, sig, data)
      return ok ? { ok, alg } : { ok, alg, reason: '署名が一致しません（秘密鍵が違うか、トークンが改ざんされています）' }
    }

    if (!isPublic) return { ok: false, alg, reason: `${alg} の検証には公開鍵（PEM か JWK）が必要です` }
    const algo =
      family === 'RS'
        ? { name: 'RSASSA-PKCS1-v1_5', hash }
        : family === 'PS'
          ? { name: 'RSA-PSS', hash }
          : { name: 'ECDSA', namedCurve: CURVE[alg] }
    let k: CryptoKey
    const trimmed = key.trim()
    if (trimmed.startsWith('{')) {
      const jwk = JSON.parse(trimmed)
      const one = Array.isArray(jwk.keys) ? jwk.keys.find((x: { kid?: string }) => !header.kid || x.kid === header.kid) ?? jwk.keys[0] : jwk
      if (!one) return { ok: false, alg, reason: 'JWK の中に鍵が見つかりません' }
      k = await crypto.subtle.importKey('jwk', one, algo, false, ['verify'])
    } else {
      if (/BEGIN (RSA PUBLIC KEY|CERTIFICATE)/.test(trimmed))
        return { ok: false, alg, reason: '「BEGIN PUBLIC KEY」形式（SPKI）の公開鍵か JWK を入れてください' }
      k = await crypto.subtle.importKey('spki', pemToDer(trimmed), algo, false, ['verify'])
    }
    const params =
      family === 'RS'
        ? { name: 'RSASSA-PKCS1-v1_5' }
        : family === 'PS'
          ? { name: 'RSA-PSS', saltLength: Number(alg.slice(2)) / 8 }
          : { name: 'ECDSA', hash }
    const ok = await crypto.subtle.verify(params, k, sig, data)
    return ok ? { ok, alg } : { ok, alg, reason: '署名が一致しません（鍵が違うか、トークンが改ざんされています）' }
  } catch (e) {
    return { ok: false, alg, reason: `鍵を読み込めませんでした：${(e as Error).message}` }
  }
}
