'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import JSZip from 'jszip'

// 1枚の画像から、表示幅ごとの画像と srcset つきの <img> を作る。
// 表示サイズより大きな画像を配ると、幅が4倍なら画素は16倍になり、そのぶん転送が無駄になる。
// width / height を書いておくと、読み込み前から場所が確保されて CLS（レイアウトのずれ）も防げる。

const WIDTHS = [320, 480, 640, 768, 1024, 1280, 1600, 1920]
type Format = 'webp' | 'jpeg'

interface Output {
  width: number
  height: number
  blob: Blob
  url: string
}

const fmtKB = (n: number) => `${(n / 1024).toFixed(1)} KB`

function resize(img: HTMLImageElement, width: number, format: Format, quality: number): Promise<Output> {
  const height = Math.round((img.naturalHeight * width) / img.naturalWidth)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  if (format === 'jpeg') {
    // JPEG は透明を持てないので、透明な部分は白にする（黒になるのを防ぐ）
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, width, height)
  }
  ctx.drawImage(img, 0, 0, width, height)
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve({ width, height, blob, url: URL.createObjectURL(blob) }) : reject(new Error('変換に失敗しました'))),
      `image/${format}`,
      quality / 100,
    ),
  )
}

export function ResponsiveImageGenerator() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [img, setImg] = useState<HTMLImageElement | null>(null)
  const [widths, setWidths] = useState<Set<number>>(new Set([480, 768, 1280]))
  const [format, setFormat] = useState<Format>('webp')
  const [quality, setQuality] = useState(80)
  const [sizes, setSizes] = useState('(max-width: 768px) 100vw, 768px')
  const [aboveFold, setAboveFold] = useState(false)
  const [outputs, setOutputs] = useState<Output[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const load = (f: File) => {
    setError(null)
    setOutputs([])
    const url = URL.createObjectURL(f)
    const el = new Image()
    el.onload = () => {
      setFile(f)
      setImg(el)
    }
    el.onerror = () => setError('画像を読み込めませんでした（JPEG / PNG / WebP に対応）')
    el.src = url
  }

  const usable = useMemo(() => (img ? [...widths].filter((w) => w <= img.naturalWidth).sort((a, b) => a - b) : []), [img, widths])

  useEffect(() => {
    if (!img || !usable.length) {
      setOutputs([])
      return
    }
    let alive = true
    setBusy(true)
    Promise.all(usable.map((w) => resize(img, w, format, quality)))
      .then((list) => alive && setOutputs(list))
      .catch((e) => alive && setError((e as Error).message))
      .finally(() => alive && setBusy(false))
    return () => {
      alive = false
    }
  }, [img, usable, format, quality])

  useEffect(() => () => outputs.forEach((o) => URL.revokeObjectURL(o.url)), [outputs])

  const base = file ? file.name.replace(/\.[^.]+$/, '').replace(/[^\w-]+/g, '-') || 'image' : 'image'
  const name = (w: number) => `${base}-${w}.${format === 'jpeg' ? 'jpg' : 'webp'}`
  const largest = outputs[outputs.length - 1]
  const html = largest
    ? [
        '<img',
        `  src="${name(largest.width)}"`,
        `  srcset="${outputs.map((o) => `${name(o.width)} ${o.width}w`).join(',\n          ')}"`,
        `  sizes="${sizes}"`,
        `  width="${largest.width}" height="${largest.height}"`,
        aboveFold ? '  fetchpriority="high"' : '  loading="lazy" decoding="async"',
        '  alt=""',
        '>',
      ].join('\n')
    : ''

  const downloadZip = async () => {
    const zip = new JSZip()
    outputs.forEach((o) => zip.file(name(o.width), o.blob))
    zip.file('img.html', html + '\n')
    const blob = await zip.generateAsync({ type: 'blob' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${base}-responsive.zip`
    a.click()
  }

  return (
    <div className="flex flex-col gap-5">
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault()
          const f = e.dataTransfer.files[0]
          if (f) load(f)
        }}
        onClick={() => inputRef.current?.click()}
        className="cursor-pointer rounded-lg border border-dashed border-border bg-[#070d1a] px-4 py-8 text-center hover:border-teal/50"
      >
        <p className="font-mono text-xs text-dim">画像をドロップ、またはクリックして選択</p>
        <p className="mt-1 font-mono text-[10px] text-border">画像はブラウザ内だけで処理し、どこにも送信しません</p>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) load(f)
            e.target.value = ''
          }}
        />
      </div>

      {error && <p className="rounded border border-red-400/30 bg-red-400/5 px-3 py-2 font-mono text-xs text-red-300">{error}</p>}

      {img && file && (
        <>
          <p className="font-mono text-xs text-dim">
            元の画像：{file.name} ／ {img.naturalWidth}×{img.naturalHeight} ／ {fmtKB(file.size)}
          </p>

          <div className="flex flex-col gap-3 rounded-lg border border-border bg-[#070d1a] p-4">
            <div>
              <p className="mb-1.5 font-mono text-[10px] uppercase tracking-widest text-muted">作る幅（元の幅より大きいものは作りません）</p>
              <div className="flex flex-wrap gap-1.5">
                {WIDTHS.map((w) => {
                  const disabled = w > img.naturalWidth
                  const on = widths.has(w) && !disabled
                  return (
                    <button
                      key={w}
                      disabled={disabled}
                      onClick={() =>
                        setWidths((prev) => {
                          const next = new Set(prev)
                          if (next.has(w)) next.delete(w)
                          else next.add(w)
                          return next
                        })
                      }
                      className={`rounded border px-2 py-0.5 font-mono text-[11px] ${
                        on ? 'border-teal/50 bg-teal/10 text-teal' : 'border-border text-dim'
                      } disabled:cursor-not-allowed disabled:opacity-30`}
                    >
                      {w}
                    </button>
                  )
                })}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex rounded border border-border p-0.5">
                {(['webp', 'jpeg'] as Format[]).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFormat(f)}
                    className={`rounded px-2 py-0.5 font-mono text-[11px] ${format === f ? 'bg-teal/20 text-teal' : 'text-dim'}`}
                  >
                    {f === 'webp' ? 'WebP' : 'JPEG'}
                  </button>
                ))}
              </div>
              <label className="flex items-center gap-2 font-mono text-[11px] text-muted">
                品質 <span className="w-6 text-bright">{quality}</span>
                <input type="range" min={40} max={100} value={quality} onChange={(e) => setQuality(Number(e.target.value))} className="accent-teal" />
              </label>
              <label className="flex items-center gap-2 font-mono text-[11px] text-primary">
                <input type="checkbox" checked={aboveFold} onChange={(e) => setAboveFold(e.target.checked)} className="accent-teal" />
                ファーストビューの画像（LCP の候補）
              </label>
            </div>
            <label className="block font-mono text-[11px] text-muted">
              sizes（画面幅ごとに、この画像が何pxで表示されるか）
              <input
                value={sizes}
                onChange={(e) => setSizes(e.target.value)}
                className="mt-1 w-full rounded border border-border bg-transparent px-2 py-1 text-xs text-bright outline-none focus:border-teal"
              />
            </label>
          </div>

          {busy && <p className="font-mono text-xs text-muted">作成中…</p>}

          {outputs.length > 0 && (
            <>
              <ul className="rounded-lg border border-border bg-[#070d1a]">
                {outputs.map((o) => (
                  <li key={o.width} className="flex items-center gap-3 border-b border-border/50 px-3 py-2 font-mono text-xs last:border-b-0">
                    <span className="w-28 text-bright">{name(o.width)}</span>
                    <span className="text-dim">{o.width}×{o.height}</span>
                    <span className="text-teal">{fmtKB(o.blob.size)}</span>
                    <span className="text-muted">元の {Math.round((o.blob.size / file.size) * 100)}%</span>
                  </li>
                ))}
              </ul>
              <div>
                <p className="mb-1 font-mono text-[10px] uppercase tracking-widest text-muted">HTML</p>
                <pre className="overflow-x-auto rounded border border-border bg-bg p-3 text-xs leading-relaxed text-primary">{html}</pre>
                <p className="mt-1 font-mono text-[10px] text-muted">
                  width / height は縦横比を伝えるためのもので、CSS で width: 100%; height: auto; にしても場所が先に確保され、読み込み時のずれ（CLS）を防げます。
                  {aboveFold
                    ? ' ファーストビューの画像なので loading="lazy" は付けていません（付けると LCP が遅れます）。'
                    : ' ファーストビューの画像では、チェックを入れて loading="lazy" を外してください。'}
                </p>
              </div>
              <div className="flex gap-2">
                <button onClick={downloadZip} className="rounded border border-teal/50 bg-teal/10 px-3 py-1.5 font-mono text-xs text-teal hover:bg-teal/20">
                  画像と HTML を ZIP で保存
                </button>
                <button
                  onClick={async () => {
                    await navigator.clipboard.writeText(html)
                    setCopied(true)
                    setTimeout(() => setCopied(false), 1500)
                  }}
                  className="rounded border border-border px-3 py-1.5 font-mono text-xs text-dim hover:text-teal"
                >
                  {copied ? '✓ コピー済み' : 'HTML をコピー'}
                </button>
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
