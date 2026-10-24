// 文字コードの判定と、化けた文字列の復元。
// ブラウザの TextDecoder（WHATWG Encoding）だけで動かす。shift_jis は実際には Windows の CP932 として読まれる

export type EncodingId = 'utf-8' | 'shift_jis' | 'euc-jp' | 'iso-2022-jp' | 'utf-16le' | 'utf-16be'

export const ENCODING_LABEL: Record<EncodingId, string> = {
  'utf-8': 'UTF-8',
  shift_jis: 'Shift_JIS（CP932）',
  'euc-jp': 'EUC-JP',
  'iso-2022-jp': 'ISO-2022-JP（JIS）',
  'utf-16le': 'UTF-16 LE',
  'utf-16be': 'UTF-16 BE',
}

export interface Bom {
  encoding: 'utf-8' | 'utf-16le' | 'utf-16be'
  length: number
}

export function bomOf(bytes: Uint8Array): Bom | null {
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) return { encoding: 'utf-8', length: 3 }
  if (bytes[0] === 0xff && bytes[1] === 0xfe) return { encoding: 'utf-16le', length: 2 }
  if (bytes[0] === 0xfe && bytes[1] === 0xff) return { encoding: 'utf-16be', length: 2 }
  return null
}

export interface Candidate {
  encoding: EncodingId
  /** 読めなかったバイトの数（U+FFFD に置き換わった数） */
  errors: number
  /** 日本語の文章らしさ（0〜1）。化けた文字列は珍しい漢字や半角カナが増えて下がる */
  score: number
  text: string
}

export interface Detection {
  bom: Bom | null
  /** すべて 0x00〜0x7F で、ESC も無い（どの文字コードで読んでも同じ） */
  asciiOnly: boolean
  candidates: Candidate[]
  best: Candidate | null
}

function countReplacement(s: string): number {
  let n = 0
  for (let i = 0; i < s.length; i++) if (s.charCodeAt(i) === 0xfffd) n++
  return n
}

// 日本語の文章で普通に出る文字の割合。漢字は常用漢字表を持たずに、CJK 統合漢字の前半（U+4E00〜U+9FA0）を数える。
// ⚠ 化けた文字列（縺・繧 など）も漢字なので、この数字だけで決めず、ひらがな・カタカナの割合を重く見る
export function japaneseScore(s: string): number {
  let total = 0
  let good = 0
  for (const ch of s) {
    const cp = ch.codePointAt(0)!
    if (cp === 0x0a || cp === 0x0d || cp === 0x20 || cp === 0x09) continue
    total++
    if (cp < 0x80) good += 1
    else if (cp >= 0x3040 && cp <= 0x30ff) good += 1.5 // ひらがな・カタカナ
    else if (cp >= 0x3000 && cp <= 0x303f) good += 1 // 、。「」など
    else if (cp >= 0xff01 && cp <= 0xff5e) good += 0.8 // 全角英数・記号
    else if (cp >= 0x4e00 && cp <= 0x9fa0) good += 0.6
    else if (cp >= 0xff61 && cp <= 0xff9f) good -= 0.5 // 半角カナ（化けた文字列に多い）
    else if (cp === 0xfffd) good -= 2
  }
  if (total === 0) return 1
  return Math.max(0, Math.min(1, good / total))
}

const decoders = new Map<string, TextDecoder>()
function decode(bytes: Uint8Array, enc: string, fatal = false): string {
  const key = enc + (fatal ? '!' : '')
  let d = decoders.get(key)
  if (!d) {
    d = new TextDecoder(enc, { fatal, ignoreBOM: true })
    decoders.set(key, d)
  }
  return d.decode(bytes)
}

export function detectEncoding(bytes: Uint8Array): Detection {
  const bom = bomOf(bytes)
  const body = bom ? bytes.subarray(bom.length) : bytes
  let asciiOnly = true
  let hasEsc = false
  for (let i = 0; i < body.length; i++) {
    if (body[i] >= 0x80) { asciiOnly = false; break }
    if (body[i] === 0x1b) hasEsc = true
  }
  if (hasEsc) asciiOnly = false

  const ids: EncodingId[] = bom
    ? [bom.encoding]
    : hasEsc
      ? ['iso-2022-jp', 'utf-8']
      : ['utf-8', 'shift_jis', 'euc-jp']
  const candidates = ids.map((encoding): Candidate => {
    const text = decode(body, encoding)
    return { encoding, errors: countReplacement(text), score: japaneseScore(text), text }
  })
  // 並べ方：読めなかったバイトが少ない順 → 日本語らしい順。
  // UTF-8 は偶然に正しく読める確率がとても低いので、エラー0なら最優先
  candidates.sort((a, b) => {
    if (a.errors !== b.errors) return a.errors - b.errors
    if (a.encoding === 'utf-8' && a.errors === 0) return -1
    if (b.encoding === 'utf-8' && b.errors === 0) return 1
    return b.score - a.score
  })
  return { bom, asciiOnly, candidates, best: candidates[0] ?? null }
}

// ---- 化けた文字列を元に戻す ----

let sjisTable: Map<string, number[]> | null = null
function sjisReverse(): Map<string, number[]> {
  if (sjisTable) return sjisTable
  const m = new Map<string, number[]>()
  const d = new TextDecoder('shift_jis', { fatal: true })
  const put = (bytes: number[]) => {
    try {
      const s = d.decode(new Uint8Array(bytes))
      if ([...s].length === 1 && !m.has(s)) m.set(s, bytes)
    } catch { /* この並びは Shift_JIS に無い */ }
  }
  for (let b = 0; b < 0x80; b++) put([b])
  for (let b = 0xa1; b <= 0xdf; b++) put([b])
  for (let lead = 0x81; lead <= 0xfc; lead++) {
    if (lead > 0x9f && lead < 0xe0) continue
    for (let trail = 0x40; trail <= 0xfc; trail++) if (trail !== 0x7f) put([lead, trail])
  }
  sjisTable = m
  return m
}

let cp1252Table: Map<string, number> | null = null
function cp1252Reverse(): Map<string, number> {
  if (cp1252Table) return cp1252Table
  const m = new Map<string, number>()
  const d = new TextDecoder('windows-1252')
  for (let b = 0; b < 256; b++) {
    const s = d.decode(new Uint8Array([b]))
    if (!m.has(s)) m.set(s, b)
  }
  cp1252Table = m
  return m
}

// UTF-8 を Shift_JIS として読むと、Shift_JIS の並びにならないバイト（1バイト目に来た 0x80・0xA0、
// 2バイト目が無い1バイト目など）は U+FFFD に置き換わって捨てられる。捨てられたバイトは 0x80〜0xBF のどれでも
// UTF-8 として読めてしまうので、値は当てられない（当てずっぽうで埋めると「月」が「最」になる）。
// そこで、後ろのバイトの区切りがずれない種類（続きのバイト／3バイト文字の先頭など）だけを選び、
// その文字は「戻せない文字」として 〓 で示す
const LOST = -1
function fillLostBytes(parts: (number[] | null)[]): number[] {
  const chosen: number[][] = parts.map((p) => p ?? [LOST])
  const lost = parts.flatMap((p, i) => (p ? [] : [i]))
  if (lost.length > 200) return chosen.flat()
  const errorsOf = () => decodeUtf8Marked(chosen.flat()).bad
  for (const i of lost) {
    let best = chosen[i]
    let bestBad = Infinity
    // 1バイト目として正しくても2バイト目と組で未定義なら2バイトまとめて捨てられるので、2バイトの組も試す
    for (const opt of [[LOST], [LOST - 0xe3], [LOST - 0xc3], [LOST - 0xf1], [LOST, LOST - 0xe3], [LOST, LOST], [LOST - 0xe3, LOST], []]) {
      chosen[i] = opt
      const bad = errorsOf()
      if (bad < bestBad) { bestBad = bad; best = opt }
    }
    chosen[i] = best
  }
  return chosen.flat()
}

// 負の値は「捨てられたバイト」。LOST は続きのバイト、LOST - 0xe3 などは先頭バイトとして区切りだけ数える
function decodeUtf8Marked(bytes: number[]): { text: string; bad: number; unknown: number } {
  let text = ''
  let bad = 0
  let unknown = 0
  const fatal = new TextDecoder('utf-8', { fatal: true })
  const real = (b: number) => (b === LOST ? 0x80 : b < 0 ? LOST - b : b)
  let i = 0
  while (i < bytes.length) {
    const lead = real(bytes[i])
    const len = lead < 0x80 ? 1 : lead >= 0xf0 && lead <= 0xf4 ? 4 : lead >= 0xe0 ? 3 : lead >= 0xc2 && lead <= 0xdf ? 2 : 0
    if (len === 0 || i + len > bytes.length) { text += '�'; bad++; i++; continue }
    const seq = bytes.slice(i, i + len)
    const hasLost = seq.some((b) => b < 0)
    try {
      const s = fatal.decode(new Uint8Array(seq.map(real)))
      if (hasLost) { text += '〓'; unknown++ } else text += s
      i += len
    } catch {
      text += '�'
      bad++
      i++
    }
  }
  return { text, bad, unknown }
}

function toBytes(s: string, enc: 'shift_jis' | 'windows-1252'): number[] | null {
  const out: number[] = []
  if (enc === 'shift_jis') {
    const t = sjisReverse()
    const parts: (number[] | null)[] = []
    for (const ch of s) {
      if (ch === '�') { parts.push(null); continue }
      const b = t.get(ch)
      if (!b) return null
      parts.push(b)
    }
    return parts.includes(null) ? fillLostBytes(parts) : parts.flat() as number[]
  }
  const t = cp1252Reverse()
  for (const ch of s) {
    const b = t.get(ch)
    if (b === undefined) return null
    out.push(b)
  }
  return out
}

export interface Repair {
  /** 元の文字コード → 誤って読んだ文字コード */
  wrote: EncodingId
  readAs: 'shift_jis' | 'windows-1252'
  text: string
  score: number
  /** 元のバイトが捨てられていて戻せなかった文字（〓 で示す）と、読めなかった文字（U+FFFD）の数 */
  unresolved: number
}

const REPAIRS: { wrote: EncodingId; readAs: 'shift_jis' | 'windows-1252' }[] = [
  { wrote: 'utf-8', readAs: 'shift_jis' }, // 縺薙ｓ縺ｫ縺｡縺ｯ
  { wrote: 'utf-8', readAs: 'windows-1252' }, // ã“ã‚“ã«ã¡ã¯
  { wrote: 'shift_jis', readAs: 'windows-1252' }, // ‚±‚ñ‚É‚¿‚Í
]

export interface RepairResult {
  repairs: Repair[]
  /** 化けた文字列に含まれていた U+FFFD の数（読めなかったバイトが捨てられた跡） */
  lostBytes: number
}

export function repairMojibake(garbled: string): RepairResult {
  const lostBytes = countReplacement(garbled)
  const before = japaneseScore(garbled)
  const repairs: Repair[] = []
  for (const r of REPAIRS) {
    const bytes = toBytes(garbled, r.readAs)
    if (!bytes) continue
    let text: string
    let unresolved: number
    if (r.wrote === 'utf-8') {
      const d = decodeUtf8Marked(bytes)
      text = d.text
      unresolved = d.bad + d.unknown
    } else {
      text = decode(new Uint8Array(bytes), r.wrote)
      unresolved = countReplacement(text)
    }
    if (text === garbled) continue
    // 戻せなかった文字が半分を超えるなら、この読み違えではない
    if (unresolved > Math.max(1, [...text].length / 2)) continue
    const score = japaneseScore(text.replace(/〓/g, ''))
    // 戻した結果のほうが日本語らしいものだけ残す
    if (score > before) repairs.push({ ...r, text, score, unresolved })
  }
  repairs.sort((a, b) => a.unresolved - b.unresolved || b.score - a.score)
  return { repairs, lostBytes }
}

/** UTF-8 で保存し直す（Excel で開くなら BOM 付き） */
export function encodeUtf8(text: string, withBom: boolean): Uint8Array<ArrayBuffer> {
  const body = new TextEncoder().encode(text)
  if (!withBom) return body
  const out = new Uint8Array(body.length + 3)
  out.set([0xef, 0xbb, 0xbf])
  out.set(body, 3)
  return out
}
