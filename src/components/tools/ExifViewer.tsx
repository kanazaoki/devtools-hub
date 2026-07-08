'use client'

import { useState, useCallback, useRef } from 'react'

// ── EXIF tag IDs we care about ────────────────────────────────────
const TAGS: Record<number, string> = {
  0x010F: 'Make',           0x0110: 'Model',
  0x0132: 'DateTime',       0x9003: 'DateTimeOriginal',
  0x8827: 'ISOSpeedRatings',0x829A: 'ExposureTime',
  0x829D: 'FNumber',        0x920A: 'FocalLength',
  0xA002: 'PixelXDimension',0xA003: 'PixelYDimension',
  0x0100: 'ImageWidth',     0x0101: 'ImageLength',
  0x8825: 'GPSInfoIFDPointer',
}
const GPS_TAGS: Record<number, string> = {
  0x0001: 'GPSLatitudeRef', 0x0002: 'GPSLatitude',
  0x0003: 'GPSLongitudeRef',0x0004: 'GPSLongitude',
  0x0006: 'GPSAltitude',    0x000C: 'GPSSpeedRef',
}

interface ExifResult {
  [key: string]: string | number
}

function readRational(view: DataView, offset: number, le: boolean): number {
  const num = view.getUint32(offset, le)
  const den = view.getUint32(offset + 4, le)
  return den === 0 ? 0 : num / den
}

function readString(view: DataView, offset: number, len: number): string {
  let s = ''
  for (let i = 0; i < len; i++) {
    const c = view.getUint8(offset + i)
    if (c === 0) break
    s += String.fromCharCode(c)
  }
  return s.trim()
}

function readIFD(view: DataView, ifdOffset: number, le: boolean, base: number): ExifResult {
  const result: ExifResult = {}
  try {
    const count = view.getUint16(ifdOffset, le)
    for (let i = 0; i < count; i++) {
      const entryOffset = ifdOffset + 2 + i * 12
      const tag    = view.getUint16(entryOffset, le)
      const type   = view.getUint16(entryOffset + 2, le)
      const num    = view.getUint32(entryOffset + 4, le)
      const valOff = entryOffset + 8

      const name = TAGS[tag]
      if (!name) continue

      if (type === 2) {
        // ASCII
        const dataOffset = num > 4 ? base + view.getUint32(valOff, le) : valOff
        result[name] = readString(view, dataOffset, num)
      } else if (type === 3) {
        // SHORT
        result[name] = view.getUint16(valOff, le)
      } else if (type === 4) {
        // LONG
        result[name] = view.getUint32(valOff, le)
      } else if (type === 5) {
        // RATIONAL
        const dataOffset = base + view.getUint32(valOff, le)
        if (name === 'ExposureTime') {
          const num2 = view.getUint32(dataOffset, le)
          const den  = view.getUint32(dataOffset + 4, le)
          result[name] = den === 0 ? '0' : `${num2}/${den}`
        } else {
          result[name] = readRational(view, dataOffset, le)
        }
      }
    }
  } catch {}
  return result
}

function readGPSIFD(view: DataView, gpsOffset: number, le: boolean, base: number): Partial<{ lat: number; lng: number }> {
  const gps: ExifResult = {}
  try {
    const count = view.getUint16(gpsOffset, le)
    for (let i = 0; i < count; i++) {
      const entry = gpsOffset + 2 + i * 12
      const tag   = view.getUint16(entry, le)
      const type  = view.getUint16(entry + 2, le)
      const num   = view.getUint32(entry + 4, le)
      const vOff  = entry + 8
      const name  = GPS_TAGS[tag]
      if (!name) continue
      if (type === 2) {
        const off = num > 4 ? base + view.getUint32(vOff, le) : vOff
        gps[name] = readString(view, off, num)
      } else if (type === 5) {
        const off = base + view.getUint32(vOff, le)
        const deg = readRational(view, off, le)
        const min = readRational(view, off + 8, le)
        const sec = readRational(view, off + 16, le)
        gps[name] = deg + min / 60 + sec / 3600
      }
    }
  } catch {}
  const lat = typeof gps['GPSLatitude'] === 'number' ? gps['GPSLatitude'] as number : null
  const lng = typeof gps['GPSLongitude'] === 'number' ? gps['GPSLongitude'] as number : null
  const latRef = gps['GPSLatitudeRef'] as string
  const lngRef = gps['GPSLongitudeRef'] as string
  if (lat === null || lng === null) return {}
  return {
    lat: latRef === 'S' ? -lat : lat,
    lng: lngRef === 'W' ? -lng : lng,
  }
}

function parseExif(buffer: ArrayBuffer): { data: ExifResult; gps: { lat?: number; lng?: number } } | null {
  const view = new DataView(buffer)
  if (view.getUint16(0) !== 0xFFD8) return null // not JPEG

  let offset = 2
  while (offset < view.byteLength - 4) {
    if (view.getUint8(offset) !== 0xFF) break
    const marker = view.getUint16(offset)
    const segLen = view.getUint16(offset + 2)
    if (marker === 0xFFE1) {
      // APP1 — check Exif header
      const exifHeader = readString(view, offset + 4, 4)
      if (exifHeader !== 'Exif') { offset += 2 + segLen; continue }
      const tiffBase = offset + 10
      const le = view.getUint16(tiffBase) === 0x4949 // II = little-endian
      if (view.getUint32(tiffBase + 4, le) !== 8) { offset += 2 + segLen; continue }
      const ifd0Offset = tiffBase + view.getUint32(tiffBase + 4, le)

      // First, read IFD0 to get sub-IFD offset
      const ifd0Count = view.getUint16(ifd0Offset, le)
      let exifIFDOffset = 0
      let gpsIFDOffset = 0
      for (let i = 0; i < ifd0Count; i++) {
        const e = ifd0Offset + 2 + i * 12
        const tag = view.getUint16(e, le)
        if (tag === 0x8769) exifIFDOffset = tiffBase + view.getUint32(e + 8, le) // ExifIFD
        if (tag === 0x8825) gpsIFDOffset  = tiffBase + view.getUint32(e + 8, le) // GPS IFD
      }

      const ifd0Data = readIFD(view, ifd0Offset, le, tiffBase)
      const exifData = exifIFDOffset ? readIFD(view, exifIFDOffset, le, tiffBase) : {}
      const merged: ExifResult = { ...ifd0Data, ...exifData }

      const gps = gpsIFDOffset ? readGPSIFD(view, gpsIFDOffset, le, tiffBase) : {}
      return { data: merged, gps }
    }
    offset += 2 + segLen
  }
  return null
}

function fmt(val: string | number, key: string): string {
  if (key === 'FNumber') return `f/${Number(val).toFixed(1)}`
  if (key === 'FocalLength') return `${Number(val).toFixed(0)} mm`
  if (key === 'ISOSpeedRatings') return `ISO ${val}`
  if (key === 'PixelXDimension' || key === 'ImageWidth') return `${val} px`
  if (key === 'PixelYDimension' || key === 'ImageLength') return `${val} px`
  return String(val)
}

const DISPLAY_KEYS: { key: string; label: string }[] = [
  { key: 'DateTimeOriginal', label: '撮影日時' },
  { key: 'DateTime',         label: '更新日時' },
  { key: 'Make',             label: 'カメラメーカー' },
  { key: 'Model',            label: 'カメラ機種' },
  { key: 'ISOSpeedRatings',  label: 'ISO感度' },
  { key: 'ExposureTime',     label: 'シャッタースピード' },
  { key: 'FNumber',          label: '絞り値 (F値)' },
  { key: 'FocalLength',      label: '焦点距離' },
  { key: 'PixelXDimension',  label: '幅' },
  { key: 'PixelYDimension',  label: '高さ' },
  { key: 'ImageWidth',       label: '幅' },
  { key: 'ImageLength',      label: '高さ' },
]

export function ExifViewer() {
  const [preview, setPreview]     = useState<string | null>(null)
  const [exif, setExif]           = useState<ExifResult | null>(null)
  const [gps, setGps]             = useState<{ lat?: number; lng?: number } | null>(null)
  const [noExif, setNoExif]       = useState(false)
  const [dragging, setDragging]   = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const processFile = useCallback((file: File) => {
    if (!file.type.includes('jpeg') && !file.type.includes('jpg') && !file.type.includes('tiff')) {
      setNoExif(true); setExif(null); setGps(null)
      const reader = new FileReader()
      reader.onload = e => setPreview(e.target?.result as string)
      reader.readAsDataURL(file)
      return
    }
    const reader = new FileReader()
    reader.onload = e => {
      const buf = e.target?.result as ArrayBuffer
      setPreview(URL.createObjectURL(file))
      const result = parseExif(buf)
      if (!result || Object.keys(result.data).length === 0) {
        setNoExif(true); setExif(null); setGps(null)
      } else {
        setNoExif(false); setExif(result.data); setGps(result.gps)
      }
    }
    reader.readAsArrayBuffer(file)
  }, [])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }, [processFile])

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
  }

  const displayed = DISPLAY_KEYS.filter(({ key }) => exif && exif[key] !== undefined)
    .filter((item, idx, arr) => arr.findIndex(a => a.label === item.label) === idx)

  return (
    <div className="space-y-6">
      {/* Drop zone */}
      <div
        onDrop={onDrop}
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onClick={() => inputRef.current?.click()}
        className={`flex min-h-36 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed transition-colors ${dragging ? 'border-teal bg-teal/5' : 'border-border hover:border-teal/60'}`}
      >
        <p className="text-2xl">🖼️</p>
        <p className="text-sm text-dim">JPEGをドロップ、またはクリックして選択</p>
        <input ref={inputRef} type="file" accept="image/jpeg,image/jpg,image/tiff" className="hidden" onChange={onFileChange} />
      </div>

      {/* Preview */}
      {preview && (
        <div className="flex gap-6 flex-wrap">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="preview" className="h-32 w-auto rounded border border-border object-contain" />

          {noExif ? (
            <div className="flex items-center">
              <p className="rounded-lg border border-yellow-600/30 bg-yellow-600/10 px-4 py-3 text-sm text-yellow-400">
                EXIFデータが見つかりませんでした
              </p>
            </div>
          ) : exif ? (
            <div className="flex-1 min-w-0 rounded-lg border border-border/50 bg-surface p-3">
              <table className="w-full text-sm">
                <tbody>
                  {displayed.map(({ key, label }) => (
                    <tr key={key} className="border-b border-border/30 last:border-0">
                      <td className="py-2 pr-4 text-xs text-muted whitespace-nowrap w-32">{label}</td>
                      <td className="py-2 font-mono text-xs text-primary">{fmt(exif[key], key)}</td>
                    </tr>
                  ))}
                  {gps?.lat !== undefined && gps.lng !== undefined && (
                    <tr className="border-b border-border/30 last:border-0">
                      <td className="py-2 pr-4 text-xs text-muted whitespace-nowrap w-32">GPS座標</td>
                      <td className="py-2 font-mono text-xs text-primary">
                        {gps.lat.toFixed(6)}, {gps.lng.toFixed(6)}{' '}
                        <a
                          href={`https://www.google.com/maps?q=${gps.lat},${gps.lng}`}
                          target="_blank" rel="noopener noreferrer"
                          className="ml-2 text-teal hover:underline"
                        >↗ Mapsで見る</a>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}
