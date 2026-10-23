// 画像ファイルに入っているメタデータの「塊」を一覧にし、画素を作り直さずに取り除く。
//
// canvas で描き直して保存しても位置情報は消えるが、JPEG は再圧縮で画質が落ち、
// 形式も変わることがある。ここではファイルの構造（JPEG のセグメント、PNG の
// チャンク）を読み、メタデータの塊だけを抜いて残りをそのまま書き戻す。
//
// ⚠ EXIF だけを見ても足りない。位置情報は XMP（JPEG の APP1 の別の塊、PNG の
// iTXt）にも入る。EXIF だけを読む道具は、XMP に位置情報が残っていても
// 「データなし」と出す（2026-10-23 に自サイトの EXIF Viewer で確認した）。
//
// ⚠ EXIF を丸ごと消すと Orientation（向き）も消え、縦に撮った写真が横倒しで
// 表示される。sharp の既定の再保存でも同じことが起きる（同日に確認）。
// そこで向きが 1 以外なら、向きだけを持つ最小の EXIF を入れ直す。

export type BlockKind =
  | 'exif'
  | 'xmp'
  | 'xmp-ext'
  | 'iptc'
  | 'icc'
  | 'mpf'
  | 'jfif'
  | 'adobe'
  | 'comment'
  | 'app-other'
  | 'trailer'
  | 'png-text'
  | 'png-time'

export interface MetaBlock {
  kind: BlockKind
  label: string
  bytes: number
  /** 位置情報らしきものを含むか */
  gps: boolean
  /** 取り除く対象か（色や画像の解釈に要るものは残す） */
  removable: boolean
  detail?: string
}

export interface ExifSummary {
  make?: string
  model?: string
  dateTime?: string
  orientation?: number
  serial?: string
  software?: string
  gps?: { lat: number; lng: number } | null
  hasGpsIfd: boolean
}

export interface Inspection {
  format: 'jpeg' | 'png'
  blocks: MetaBlock[]
  exif: ExifSummary | null
}

const ascii = (u8: Uint8Array, start: number, len: number) => {
  let s = ''
  for (let i = start; i < start + len && i < u8.length; i++) s += String.fromCharCode(u8[i])
  return s
}

// ---------------------------------------------------------------- EXIF (TIFF)

/** TIFF 本体（"MM\0*" か "II*\0" から始まる）を読んで、要点だけ取り出す */
export function readTiff(u8: Uint8Array, base: number): ExifSummary {
  const view = new DataView(u8.buffer, u8.byteOffset, u8.byteLength)
  const out: ExifSummary = { hasGpsIfd: false, gps: null }
  if (base + 8 > u8.length) return out
  const le = view.getUint16(base) === 0x4949
  const u16 = (o: number) => view.getUint16(o, le)
  const u32 = (o: number) => view.getUint32(o, le)
  const ok = (o: number, n: number) => o >= 0 && o + n <= u8.length

  const str = (count: number, valueOff: number) => {
    const at = count <= 4 ? valueOff : base + u32(valueOff)
    if (!ok(at, count)) return undefined
    return ascii(u8, at, count).replace(/\0+$/, '').trim() || undefined
  }
  const rationals = (count: number, valueOff: number) => {
    const at = base + u32(valueOff)
    const r: number[] = []
    for (let i = 0; i < count; i++) {
      if (!ok(at + i * 8, 8)) return null
      const d = u32(at + i * 8 + 4)
      r.push(d ? u32(at + i * 8) / d : 0)
    }
    return r
  }

  const ifd = (off: number, visit: (tag: number, type: number, count: number, valueOff: number) => void) => {
    if (!ok(off, 2)) return
    const n = u16(off)
    for (let i = 0; i < n; i++) {
      const e = off + 2 + i * 12
      if (!ok(e, 12)) return
      visit(u16(e), u16(e + 2), u32(e + 4), e + 8)
    }
  }

  let exifIfd = 0
  let gpsIfd = 0
  ifd(base + u32(base + 4), (tag, type, count, v) => {
    if (tag === 0x010f) out.make = str(count, v)
    else if (tag === 0x0110) out.model = str(count, v)
    else if (tag === 0x0131) out.software = str(count, v)
    else if (tag === 0x0132) out.dateTime = str(count, v)
    else if (tag === 0x0112 && type === 3) out.orientation = u16(v)
    else if (tag === 0x8769) exifIfd = base + u32(v)
    else if (tag === 0x8825) gpsIfd = base + u32(v)
  })
  if (exifIfd)
    ifd(exifIfd, (tag, _t, count, v) => {
      if (tag === 0x9003) out.dateTime = str(count, v) ?? out.dateTime
      else if (tag === 0xa431) out.serial = str(count, v)
    })
  if (gpsIfd) {
    out.hasGpsIfd = true
    const g: Record<number, unknown> = {}
    ifd(gpsIfd, (tag, type, count, v) => {
      if ((tag === 1 || tag === 3) && type === 2) g[tag] = str(count, v)
      if ((tag === 2 || tag === 4) && type === 5 && count === 3) g[tag] = rationals(3, v)
    })
    const dms = (x: unknown) => (Array.isArray(x) ? x[0] + x[1] / 60 + x[2] / 3600 : null)
    const lat = dms(g[2])
    const lng = dms(g[4])
    if (lat !== null && lng !== null)
      out.gps = { lat: g[1] === 'S' ? -lat : lat, lng: g[3] === 'W' ? -lng : lng }
  }
  return out
}

/** 向きだけを持つ最小の EXIF（APP1 の中身）を作る */
function orientationOnlyExif(orientation: number): Uint8Array {
  const b = new Uint8Array(6 + 8 + 2 + 12 + 4)
  b.set([0x45, 0x78, 0x69, 0x66, 0, 0], 0) // "Exif\0\0"
  b.set([0x4d, 0x4d, 0x00, 0x2a, 0, 0, 0, 8], 6) // big endian, IFD0 at 8
  b.set([0, 1], 14) // 1 entry
  b.set([0x01, 0x12, 0x00, 0x03, 0, 0, 0, 1, (orientation >> 8) & 255, orientation & 255, 0, 0], 16)
  // next IFD = 0（残りの4バイトは0のまま）
  return b
}

// ---------------------------------------------------------------- JPEG

interface JpegSeg {
  marker: number
  start: number
  end: number
}

/** SOI から EOI までのセグメントと、EOI の後ろに付いたデータの位置を返す */
function scanJpeg(u8: Uint8Array): { segs: JpegSeg[]; eoiEnd: number } {
  if (u8[0] !== 0xff || u8[1] !== 0xd8) throw new Error('JPEG ではありません。')
  const segs: JpegSeg[] = []
  let o = 2
  while (o < u8.length) {
    if (u8[o] !== 0xff) throw new Error('JPEG の構造を読めませんでした。')
    let marker = u8[o + 1]
    while (marker === 0xff) marker = u8[++o + 1] // 詰め物の FF
    if (marker === 0xd9) {
      segs.push({ marker, start: o, end: o + 2 })
      return { segs, eoiEnd: o + 2 }
    }
    if ((marker >= 0xd0 && marker <= 0xd7) || marker === 0x01) {
      segs.push({ marker, start: o, end: o + 2 })
      o += 2
      continue
    }
    const len = (u8[o + 2] << 8) | u8[o + 3]
    let end = o + 2 + len
    if (marker === 0xda) {
      // 圧縮データは次のマーカー（FF00 と RSTn 以外）まで続く
      let p = end
      while (p < u8.length - 1) {
        if (u8[p] === 0xff && u8[p + 1] !== 0x00 && !(u8[p + 1] >= 0xd0 && u8[p + 1] <= 0xd7)) break
        p++
      }
      end = p
    }
    segs.push({ marker, start: o, end })
    o = end
  }
  throw new Error('JPEG の終わり（EOI）が見つかりませんでした。')
}

function classifyJpegSeg(u8: Uint8Array, s: JpegSeg): MetaBlock | null {
  const m = s.marker
  if (m < 0xe0 || (m > 0xef && m !== 0xfe)) return null
  const body = s.start + 4
  const bytes = s.end - s.start
  if (m === 0xfe) return { kind: 'comment', label: 'コメント（COM）', bytes, gps: false, removable: true, detail: ascii(u8, body, Math.min(60, bytes - 4)) }
  if (m === 0xe0) return { kind: 'jfif', label: 'JFIF（APP0）', bytes, gps: false, removable: false, detail: '画像の基本情報。残します' }
  if (m === 0xe1) {
    if (ascii(u8, body, 6) === 'Exif\0\0') {
      const ex = readTiff(u8, body + 6)
      return { kind: 'exif', label: 'EXIF（APP1）', bytes, gps: ex.hasGpsIfd, removable: true }
    }
    const head = ascii(u8, body, 40)
    if (head.startsWith('http://ns.adobe.com/xmp/extension/'))
      return { kind: 'xmp-ext', label: 'XMP 拡張（APP1）', bytes, gps: /GPS/i.test(ascii(u8, body, bytes - 4)), removable: true }
    if (head.startsWith('http://ns.adobe.com/xap/1.0/'))
      return { kind: 'xmp', label: 'XMP（APP1）', bytes, gps: /GPS(Latitude|Longitude)/i.test(ascii(u8, body, bytes - 4)), removable: true }
    return { kind: 'app-other', label: 'APP1（その他）', bytes, gps: false, removable: true }
  }
  if (m === 0xe2) {
    if (ascii(u8, body, 12) === 'ICC_PROFILE\0') return { kind: 'icc', label: 'ICC プロファイル（APP2）', bytes, gps: false, removable: false, detail: '色の解釈に使います。既定で残します' }
    if (ascii(u8, body, 4) === 'MPF\0') return { kind: 'mpf', label: 'MPF 複数画像（APP2）', bytes, gps: false, removable: true, detail: 'EOI の後ろに付いた別の画像の目次' }
    return { kind: 'app-other', label: 'APP2（その他）', bytes, gps: false, removable: true }
  }
  if (m === 0xed) return { kind: 'iptc', label: 'Photoshop / IPTC（APP13）', bytes, gps: false, removable: true }
  if (m === 0xee && ascii(u8, body, 5) === 'Adobe') return { kind: 'adobe', label: 'Adobe（APP14）', bytes, gps: false, removable: false, detail: '色の変換方法を表します。残します' }
  return { kind: 'app-other', label: `APP${m - 0xe0}`, bytes, gps: false, removable: true }
}

export function inspectJpeg(u8: Uint8Array): Inspection {
  const { segs, eoiEnd } = scanJpeg(u8)
  const blocks: MetaBlock[] = []
  let exif: ExifSummary | null = null
  for (const s of segs) {
    const b = classifyJpegSeg(u8, s)
    if (!b) continue
    if (b.kind === 'exif' && !exif) exif = readTiff(u8, s.start + 10)
    blocks.push(b)
  }
  if (eoiEnd < u8.length) {
    const tail = u8.subarray(eoiEnd)
    // 末尾に別の JPEG（MPF の2枚目・深度マップ等）や動画が付いていることがある
    let innerExif = false
    for (let i = 0; i < tail.length - 10; i++) if (tail[i] === 0x45 && ascii(tail, i, 6) === 'Exif\0\0') { innerExif = true; break }
    blocks.push({
      kind: 'trailer',
      label: '画像の後ろに付いたデータ',
      bytes: tail.length,
      gps: innerExif,
      removable: true,
      detail: innerExif ? '中に別の EXIF があります' : '2枚目の画像や動画など',
    })
  }
  return { format: 'jpeg', blocks, exif }
}

export interface StripOptions {
  keepIcc: boolean
  keepOrientation: boolean
}

export function stripJpeg(u8: Uint8Array, opt: StripOptions): { out: Uint8Array; orientation: number | null } {
  const { segs } = scanJpeg(u8)
  let orientation: number | null = null
  for (const s of segs) {
    if (classifyJpegSeg(u8, s)?.kind === 'exif') {
      orientation = readTiff(u8, s.start + 10).orientation ?? null
      break
    }
  }
  const parts: Uint8Array[] = [u8.subarray(0, 2)]
  let rest = segs
  // 向きの EXIF は JFIF（APP0）の直後、無ければ SOI の直後に入れる
  if (segs[0]?.marker === 0xe0) {
    parts.push(u8.subarray(segs[0].start, segs[0].end))
    rest = segs.slice(1)
  }
  if (opt.keepOrientation && orientation && orientation !== 1) {
    const body = orientationOnlyExif(orientation)
    parts.push(new Uint8Array([0xff, 0xe1, ((body.length + 2) >> 8) & 255, (body.length + 2) & 255]), body)
  }
  for (const s of rest) {
    const b = classifyJpegSeg(u8, s)
    const keep = !b || (!b.removable && !(b.kind === 'icc' && !opt.keepIcc))
    if (keep) parts.push(u8.subarray(s.start, s.end))
  }
  return { out: concat(parts), orientation }
}

function concat(parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0))
  let o = 0
  for (const p of parts) {
    out.set(p, o)
    o += p.length
  }
  return out
}

let CRC_TABLE: Uint32Array | null = null
function crc32(u8: Uint8Array): number {
  if (!CRC_TABLE) {
    CRC_TABLE = new Uint32Array(256)
    for (let n = 0; n < 256; n++) {
      let c = n
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
      CRC_TABLE[n] = c >>> 0
    }
  }
  let c = 0xffffffff
  for (let i = 0; i < u8.length; i++) c = CRC_TABLE[(c ^ u8[i]) & 255] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

// ---------------------------------------------------------------- PNG

const PNG_SIG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]

interface PngChunk {
  type: string
  start: number
  end: number
  dataStart: number
  len: number
}

function scanPng(u8: Uint8Array): PngChunk[] {
  if (!PNG_SIG.every((b, i) => u8[i] === b)) throw new Error('PNG ではありません。')
  const view = new DataView(u8.buffer, u8.byteOffset, u8.byteLength)
  const chunks: PngChunk[] = []
  let o = 8
  while (o + 12 <= u8.length) {
    const len = view.getUint32(o)
    const type = ascii(u8, o + 4, 4)
    chunks.push({ type, start: o, end: o + 12 + len, dataStart: o + 8, len })
    o += 12 + len
    if (type === 'IEND') break
  }
  return chunks
}

export function inspectPng(u8: Uint8Array): Inspection {
  const blocks: MetaBlock[] = []
  let exif: ExifSummary | null = null
  for (const c of scanPng(u8)) {
    const bytes = c.end - c.start
    if (c.type === 'eXIf') {
      exif = readTiff(u8, c.dataStart)
      blocks.push({ kind: 'exif', label: 'EXIF（eXIf チャンク）', bytes, gps: exif.hasGpsIfd, removable: true })
    } else if (c.type === 'tEXt' || c.type === 'zTXt' || c.type === 'iTXt') {
      const key = ascii(u8, c.dataStart, Math.min(79, c.len)).split('\0')[0]
      const isXmp = key === 'XML:com.adobe.xmp'
      // zTXt は必ず、iTXt は圧縮フラグが1なら中身が圧縮されていて、文字として読めない
      const compressed = c.type === 'zTXt' || (c.type === 'iTXt' && u8[c.dataStart + key.length + 1] === 1)
      blocks.push({
        kind: isXmp ? 'xmp' : 'png-text',
        label: isXmp ? `XMP（${c.type} チャンク）` : `テキスト（${c.type}）`,
        bytes,
        gps: !compressed && /GPS(Latitude|Longitude)/i.test(ascii(u8, c.dataStart, c.len)),
        removable: true,
        detail: compressed
          ? '圧縮されていて中身を読めません。位置情報が入っている可能性があります'
          : isXmp
            ? undefined
            : key,
      })
    } else if (c.type === 'tIME') {
      blocks.push({ kind: 'png-time', label: '更新日時（tIME）', bytes, gps: false, removable: true })
    } else if (c.type === 'iCCP') {
      blocks.push({ kind: 'icc', label: 'ICC プロファイル（iCCP）', bytes, gps: false, removable: false, detail: '色の解釈に使います。既定で残します' })
    }
  }
  return { format: 'png', blocks, exif }
}

export function stripPng(u8: Uint8Array, opt: StripOptions): { out: Uint8Array; orientation: number | null } {
  const chunks = scanPng(u8)
  const drop = new Set(['eXIf', 'tEXt', 'zTXt', 'iTXt', 'tIME'])
  if (!opt.keepIcc) drop.add('iCCP')
  let orientation: number | null = null
  for (const c of chunks) if (c.type === 'eXIf') orientation = readTiff(u8, c.dataStart).orientation ?? null
  const parts: Uint8Array[] = [u8.subarray(0, 8)]
  for (const c of chunks) {
    if (!drop.has(c.type)) parts.push(u8.subarray(c.start, c.end))
    // 向きの eXIf は IHDR の直後に入れる（画像データより前に置く決まり）
    if (c.type === 'IHDR' && opt.keepOrientation && orientation && orientation !== 1) {
      const tiff = orientationOnlyExif(orientation).subarray(6)
      const typeAndData = concat([new Uint8Array([0x65, 0x58, 0x49, 0x66]), tiff]) // "eXIf"
      const head = new Uint8Array(4)
      new DataView(head.buffer).setUint32(0, tiff.length)
      const crc = new Uint8Array(4)
      new DataView(crc.buffer).setUint32(0, crc32(typeAndData))
      parts.push(head, typeAndData, crc)
    }
  }
  return { out: concat(parts), orientation }
}

// ---------------------------------------------------------------- 入口

export function detectFormat(u8: Uint8Array): 'jpeg' | 'png' | null {
  if (u8[0] === 0xff && u8[1] === 0xd8) return 'jpeg'
  if (PNG_SIG.every((b, i) => u8[i] === b)) return 'png'
  return null
}

export function inspect(u8: Uint8Array): Inspection {
  const f = detectFormat(u8)
  if (f === 'jpeg') return inspectJpeg(u8)
  if (f === 'png') return inspectPng(u8)
  throw new Error('JPEG と PNG に対応しています。')
}

export function strip(u8: Uint8Array, opt: StripOptions) {
  return detectFormat(u8) === 'png' ? stripPng(u8, opt) : stripJpeg(u8, opt)
}
