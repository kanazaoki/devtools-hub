'use client'

import { useEffect, useRef, useState } from 'react'
import { inspect, strip, type Inspection, type MetaBlock } from '@/lib/imageMeta'

const MAX_BYTES = 50 * 1024 * 1024

const ORIENTATION_LABEL: Record<number, string> = {
  1: 'そのまま',
  2: '左右反転',
  3: '180度回転',
  4: '上下反転',
  5: '左右反転＋270度',
  6: '90度回転（縦に撮った写真に多い）',
  7: '左右反転＋90度',
  8: '270度回転',
}

interface Loaded {
  name: string
  bytes: Uint8Array
  info: Inspection
  url: string
}

interface Cleaned {
  bytes: Uint8Array
  info: Inspection
  url: string
}

const fmtBytes = (n: number) => (n < 1024 ? `${n} B` : n < 1024 * 1024 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1024 / 1024).toFixed(2)} MB`)

function BlockList({ blocks, empty }: { blocks: MetaBlock[]; empty: string }) {
  if (!blocks.length) return <p className="font-mono text-xs text-border">{empty}</p>
  return (
    <ul className="rounded-lg border border-border bg-[#070d1a]">
      {blocks.map((b, i) => (
        <li key={i} className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-border/50 px-3 py-2 last:border-b-0">
          <span
            className={`shrink-0 rounded border px-1.5 py-0.5 font-mono text-[10px] ${
              b.removable ? 'border-amber-400/30 bg-amber-400/10 text-amber-300' : 'border-teal/30 bg-teal/10 text-teal'
            }`}
          >
            {b.removable ? '取り除く' : '残す'}
          </span>
          <span className="font-mono text-xs text-bright">{b.label}</span>
          <span className="font-mono text-[11px] tabular-nums text-dim">{fmtBytes(b.bytes)}</span>
          {b.gps && <span className="font-mono text-[11px] font-semibold text-red-300">位置情報あり</span>}
          {b.detail && <span className="w-full font-mono text-[10px] text-muted">{b.detail}</span>}
        </li>
      ))}
    </ul>
  )
}

export function ImageMetadataRemover() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [src, setSrc] = useState<Loaded | null>(null)
  const [clean, setClean] = useState<Cleaned | null>(null)
  const [keepOrientation, setKeepOrientation] = useState(true)
  const [keepIcc, setKeepIcc] = useState(true)

  useEffect(() => () => {
    if (src) URL.revokeObjectURL(src.url)
  }, [src])
  useEffect(() => () => {
    if (clean) URL.revokeObjectURL(clean.url)
  }, [clean])

  const read = async (file: File) => {
    setError(null)
    setClean(null)
    if (file.size > MAX_BYTES) {
      setSrc(null)
      setError('50MB を超えるファイルは読み込めません。')
      return
    }
    try {
      const bytes = new Uint8Array(await file.arrayBuffer())
      const info = inspect(bytes)
      setSrc({ name: file.name, bytes, info, url: URL.createObjectURL(file) })
    } catch (e) {
      setSrc(null)
      setError(`${(e as Error).message} HEIC・WebP には対応していません。`)
    }
  }

  // 元のファイルか設定が変わったら作り直す
  useEffect(() => {
    if (!src) return
    try {
      const { out } = strip(src.bytes, { keepIcc, keepOrientation })
      const type = src.info.format === 'png' ? 'image/png' : 'image/jpeg'
      setClean({ bytes: out, info: inspect(out), url: URL.createObjectURL(new Blob([out as Uint8Array<ArrayBuffer>], { type })) })
    } catch (e) {
      setClean(null)
      setError((e as Error).message)
    }
  }, [src, keepIcc, keepOrientation])

  const download = () => {
    if (!src || !clean) return
    const dot = src.name.lastIndexOf('.')
    const a = document.createElement('a')
    a.href = clean.url
    a.download = dot > 0 ? `${src.name.slice(0, dot)}-clean${src.name.slice(dot)}` : `${src.name}-clean`
    a.click()
  }

  const ex = src?.info.exif
  const gpsBefore = src?.info.blocks.filter((b) => b.gps).length ?? 0
  const gpsAfter = clean?.info.blocks.filter((b) => b.gps).length ?? 0
  // 向きだけを入れ直した EXIF は「残したもの」として扱う
  const ce = clean?.info.exif
  const orientationOnly = !!ce && !ce.hasGpsIfd && !ce.make && !ce.model && !ce.dateTime && !ce.serial && !ce.software
  const afterBlocks: MetaBlock[] = (clean?.info.blocks ?? []).map((b) =>
    b.kind === 'exif' && orientationOnly
      ? { ...b, label: 'EXIF（向きだけを入れ直したもの）', removable: false, detail: `向き ${ce?.orientation} だけを持ちます` }
      : b,
  )
  const unreadAfter = afterBlocks.filter((b) => b.removable).length
  const orientation = ex?.orientation

  return (
    <div className="flex flex-col gap-5">
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          const f = e.dataTransfer.files[0]
          if (f) void read(f)
        }}
        onClick={() => inputRef.current?.click()}
        className={`cursor-pointer rounded-lg border border-dashed px-4 py-10 text-center transition-colors ${
          dragging ? 'border-teal bg-teal/5' : 'border-border bg-[#070d1a] hover:border-teal/50'
        }`}
      >
        <p className="font-mono text-xs text-dim">JPEG / PNG をドロップ、またはクリックして選択</p>
        <p className="mt-2 font-mono text-[10px] text-border">
          50MB まで ／ 画像はブラウザ内だけで読み、どこにも送信しません
        </p>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) void read(f)
            e.target.value = ''
          }}
        />
      </div>

      {error && (
        <div className="rounded-lg border border-red-400/30 bg-red-400/5 px-4 py-3">
          <p className="font-mono text-xs text-red-300">{error}</p>
        </div>
      )}

      {!src ? (
        !error && (
          <div className="rounded-lg border border-border/50 bg-[#070d1a] px-4 py-10 text-center">
            <p className="font-mono text-xs text-border">
              画像を読み込むと、入っているメタデータの塊と、取り除いた後の状態が表示されます
            </p>
          </div>
        )
      ) : (
        <>
          <div
            className={`rounded-lg border px-4 py-3 ${
              gpsBefore ? 'border-red-400/30 bg-red-400/5' : 'border-border bg-[#070d1a]'
            }`}
          >
            <p className="font-mono text-xs text-bright">
              {src.name}　<span className="text-muted">{fmtBytes(src.bytes.length)}</span>
            </p>
            <p className={`mt-1 font-mono text-[11px] ${gpsBefore ? 'text-red-300' : 'text-dim'}`}>
              {gpsBefore
                ? `位置情報を含む塊が ${gpsBefore} 個あります`
                : '位置情報を含む塊は見つかりませんでした'}
            </p>
            {ex && (
              <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 font-mono text-[11px]">
                {ex.gps && (
                  <>
                    <dt className="text-muted">位置</dt>
                    <dd className="text-red-300">
                      {ex.gps.lat.toFixed(6)}, {ex.gps.lng.toFixed(6)}
                    </dd>
                  </>
                )}
                {ex.dateTime && (
                  <>
                    <dt className="text-muted">撮影日時</dt>
                    <dd className="text-primary">{ex.dateTime}</dd>
                  </>
                )}
                {(ex.make || ex.model) && (
                  <>
                    <dt className="text-muted">機種</dt>
                    <dd className="text-primary">{[ex.make, ex.model].filter(Boolean).join(' ')}</dd>
                  </>
                )}
                {ex.serial && (
                  <>
                    <dt className="text-muted">本体の製造番号</dt>
                    <dd className="text-primary">{ex.serial}</dd>
                  </>
                )}
                {ex.software && (
                  <>
                    <dt className="text-muted">ソフト</dt>
                    <dd className="text-primary">{ex.software}</dd>
                  </>
                )}
                {orientation && (
                  <>
                    <dt className="text-muted">向き</dt>
                    <dd className="text-primary">
                      {orientation}（{ORIENTATION_LABEL[orientation] ?? '不明'}）
                    </dd>
                  </>
                )}
              </dl>
            )}
          </div>

          <section>
            <h3 className="mb-2 font-mono text-[10px] uppercase tracking-widest text-muted">入っている塊</h3>
            <BlockList blocks={src.info.blocks} empty="メタデータの塊はありません" />
          </section>

          <div className="flex flex-col gap-2 rounded-lg border border-border bg-[#070d1a] px-4 py-3">
            <label className="flex items-start gap-2 font-mono text-[11px] text-primary">
              <input
                type="checkbox"
                checked={keepOrientation}
                onChange={(e) => setKeepOrientation(e.target.checked)}
                className="mt-0.5 accent-teal"
              />
              <span>
                向き（Orientation）だけは残す
                <span className="block text-[10px] text-muted">
                  外すと、縦に撮った写真が横倒しで表示されることがあります
                </span>
              </span>
            </label>
            <label className="flex items-start gap-2 font-mono text-[11px] text-primary">
              <input
                type="checkbox"
                checked={keepIcc}
                onChange={(e) => setKeepIcc(e.target.checked)}
                className="mt-0.5 accent-teal"
              />
              <span>
                色のプロファイル（ICC）を残す
                <span className="block text-[10px] text-muted">外すと、色の広い写真で色味が変わることがあります</span>
              </span>
            </label>
          </div>

          {clean && (
            <>
              <section>
                <h3 className="mb-2 font-mono text-[10px] uppercase tracking-widest text-muted">
                  取り除いた後（読み直した結果）
                </h3>
                <div
                  className={`mb-2 rounded-lg border px-4 py-3 ${
                    gpsAfter || unreadAfter ? 'border-red-400/30 bg-red-400/5' : 'border-teal/20 bg-teal/5'
                  }`}
                >
                  <p className={`font-mono text-xs ${gpsAfter || unreadAfter ? 'text-red-300' : 'text-teal'}`}>
                    {gpsAfter || unreadAfter
                      ? `まだ取り除く対象が ${unreadAfter} 個残っています`
                      : '位置情報を含む塊は 0 個です'}
                  </p>
                  <p className="mt-1 font-mono text-[10px] text-muted">
                    {fmtBytes(src.bytes.length)} → {fmtBytes(clean.bytes.length)}
                    ／ 画素は作り直していないので、画質は変わりません
                  </p>
                </div>
                <BlockList blocks={afterBlocks} empty="メタデータの塊はありません" />
              </section>

              <div className="grid grid-cols-2 gap-3">
                {(
                  [
                    ['元の画像', src.url],
                    ['取り除いた後', clean.url],
                  ] as const
                ).map(([label, url]) => (
                  <figure key={label} className="rounded-lg border border-border bg-[#070d1a] p-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt={label} className="mx-auto max-h-48 w-auto" />
                    <figcaption className="mt-1 text-center font-mono text-[10px] text-muted">{label}</figcaption>
                  </figure>
                ))}
              </div>
              <p className="font-mono text-[10px] text-muted">
                2枚が同じ向きで表示されていれば、向きは正しく残っています。
              </p>

              <button
                type="button"
                onClick={download}
                className="self-start rounded border border-teal/50 bg-teal/10 px-4 py-2 font-mono text-xs text-teal transition-colors hover:bg-teal/20"
              >
                取り除いた画像を保存
              </button>
            </>
          )}
        </>
      )}
    </div>
  )
}
