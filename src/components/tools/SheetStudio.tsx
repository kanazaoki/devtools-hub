'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import JSZip from 'jszip'

type Mode = 'packer' | 'slicer'
type SliceMode = 'count' | 'size'

interface PackerImage {
  id: string
  name: string
  img: HTMLImageElement
  w: number
  h: number
  tx: number
  ty: number
  tw: number
  th: number
}

interface PlacedRect {
  id: string
  name: string
  x: number
  y: number
  w: number
  h: number
  srcX: number
  srcY: number
  imgEl: HTMLImageElement
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => { URL.revokeObjectURL(url); resolve(img) }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('load failed')) }
    img.src = url
  })
}

function getTrimBounds(img: HTMLImageElement) {
  const c = document.createElement('canvas')
  c.width = img.width; c.height = img.height
  const ctx = c.getContext('2d')!
  ctx.drawImage(img, 0, 0)
  const data = ctx.getImageData(0, 0, img.width, img.height).data
  let minX = img.width, minY = img.height, maxX = 0, maxY = 0
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      if (data[(y * img.width + x) * 4 + 3] > 0) {
        if (x < minX) minX = x; if (y < minY) minY = y
        if (x > maxX) maxX = x; if (y > maxY) maxY = y
      }
    }
  }
  if (minX > maxX) return { tx: 0, ty: 0, tw: img.width, th: img.height }
  return { tx: minX, ty: minY, tw: maxX - minX + 1, th: maxY - minY + 1 }
}

function packRects(images: PackerImage[], padding: number, trim: boolean, pow2: boolean) {
  const items = images.map(img => ({
    ...img,
    pw: (trim ? img.tw : img.w),
    ph: (trim ? img.th : img.h),
  })).sort((a, b) => b.ph - a.ph)

  const rects: PlacedRect[] = []
  let x = padding, y = padding, rowH = 0
  const maxW = Math.max(64, items.reduce((s, i) => Math.max(s, i.pw), 0) * Math.ceil(Math.sqrt(items.length)))

  for (const item of items) {
    if (rects.length > 0 && x + item.pw + padding > maxW) {
      x = padding; y += rowH + padding; rowH = 0
    }
    rects.push({
      id: item.id, name: item.name,
      x, y, w: item.pw, h: item.ph,
      srcX: trim ? item.tx : 0,
      srcY: trim ? item.ty : 0,
      imgEl: item.img,
    })
    rowH = Math.max(rowH, item.ph)
    x += item.pw + padding
  }

  let tw = 0, th = 0
  for (const r of rects) { tw = Math.max(tw, r.x + r.w + padding); th = Math.max(th, r.y + r.h + padding) }
  if (pow2) {
    const np = (n: number) => { let p = 1; while (p < n) p *= 2; return p }
    tw = np(tw); th = np(th)
  }
  return { rects, tw, th }
}

function renderSheet(canvas: HTMLCanvasElement, rects: PlacedRect[], tw: number, th: number) {
  canvas.width = tw; canvas.height = th
  const ctx = canvas.getContext('2d')!
  ctx.clearRect(0, 0, tw, th)
  for (const r of rects) {
    ctx.drawImage(r.imgEl, r.srcX, r.srcY, r.w, r.h, r.x, r.y, r.w, r.h)
  }
}

function buildJson(rects: PlacedRect[], tw: number, th: number) {
  const frames: Record<string, { frame: { x: number; y: number; w: number; h: number } }> = {}
  for (const r of rects) {
    frames[r.name] = { frame: { x: r.x, y: r.y, w: r.w, h: r.h } }
  }
  return JSON.stringify({ frames, meta: { size: { w: tw, h: th } } }, null, 2)
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

export function SheetStudio() {
  const [mode, setMode] = useState<Mode>('packer')

  // Packer state
  const [packerImages, setPackerImages] = useState<PackerImage[]>([])
  const [padding, setPadding] = useState(2)
  const [trim, setTrim] = useState(false)
  const [pow2, setPow2] = useState(false)
  const [packed, setPacked] = useState<{ rects: PlacedRect[]; tw: number; th: number } | null>(null)
  const [draggingPacker, setDraggingPacker] = useState(false)
  const packerCanvasRef = useRef<HTMLCanvasElement>(null)
  const packerInputRef = useRef<HTMLInputElement>(null)

  // Slicer state
  const [slicerImg, setSlicerImg] = useState<HTMLImageElement | null>(null)
  const [sliceMode, setSliceMode] = useState<SliceMode>('count')
  const [cols, setCols] = useState(4)
  const [rows, setRows] = useState(4)
  const [cellW, setCellW] = useState(64)
  const [cellH, setCellH] = useState(64)
  const [offsetX, setOffsetX] = useState(0)
  const [offsetY, setOffsetY] = useState(0)
  const [gapX, setGapX] = useState(0)
  const [gapY, setGapY] = useState(0)
  const [draggingSlicer, setDraggingSlicer] = useState(false)
  const slicerCanvasRef = useRef<HTMLCanvasElement>(null)
  const slicerInputRef = useRef<HTMLInputElement>(null)

  // Packer: add images
  const addPackerFiles = useCallback(async (files: File[]) => {
    const valid = files.filter(f => f.type.startsWith('image/'))
    const loaded = await Promise.all(valid.map(async (f) => {
      const img = await loadImage(f)
      const trim = getTrimBounds(img)
      return { id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, name: f.name, img, w: img.width, h: img.height, ...trim }
    }))
    setPackerImages(prev => [...prev, ...loaded])
    setPacked(null)
  }, [])

  const handlePackerDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDraggingPacker(false)
    addPackerFiles(Array.from(e.dataTransfer.files))
  }

  const handlePackerInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    addPackerFiles(Array.from(e.target.files || []))
    e.target.value = ''
  }

  // Packer: pack
  const handlePack = useCallback(() => {
    if (!packerImages.length) return
    const result = packRects(packerImages, padding, trim, pow2)
    setPacked(result)
    if (packerCanvasRef.current) renderSheet(packerCanvasRef.current, result.rects, result.tw, result.th)
  }, [packerImages, padding, trim, pow2])

  // Packer: download
  const handleDownloadPng = () => {
    if (!packed || !packerCanvasRef.current) return
    packerCanvasRef.current.toBlob(blob => { if (blob) downloadBlob(blob, 'spritesheet.png') })
  }

  const handleDownloadJson = () => {
    if (!packed) return
    const json = buildJson(packed.rects, packed.tw, packed.th)
    downloadBlob(new Blob([json], { type: 'application/json' }), 'spritesheet.json')
  }

  // Slicer: load image
  const loadSlicerFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) return
    const img = await loadImage(file)
    setSlicerImg(img)
  }, [])

  const handleSlicerDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDraggingSlicer(false)
    const file = e.dataTransfer.files[0]
    if (file) loadSlicerFile(file)
  }

  // Slicer: draw preview
  const drawSlicerPreview = useCallback(() => {
    const canvas = slicerCanvasRef.current
    if (!canvas || !slicerImg) return
    const maxW = 600
    const scale = Math.min(1, maxW / slicerImg.width)
    canvas.width = Math.round(slicerImg.width * scale)
    canvas.height = Math.round(slicerImg.height * scale)
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(slicerImg, 0, 0, canvas.width, canvas.height)

    const eff = sliceMode === 'count'
      ? { cols, rows, cw: Math.floor((slicerImg.width - offsetX - Math.max(0, cols - 1) * gapX) / cols), ch: Math.floor((slicerImg.height - offsetY - Math.max(0, rows - 1) * gapY) / rows) }
      : { cols: Math.floor((slicerImg.width - offsetX + gapX) / (cellW + gapX)), rows: Math.floor((slicerImg.height - offsetY + gapY) / (cellH + gapY)), cw: cellW, ch: cellH }

    ctx.strokeStyle = 'rgba(233,69,96,0.9)'
    ctx.lineWidth = 1
    for (let r = 0; r < eff.rows; r++) {
      for (let c = 0; c < eff.cols; c++) {
        const px = (offsetX + c * (eff.cw + gapX)) * scale
        const py = (offsetY + r * (eff.ch + gapY)) * scale
        ctx.strokeRect(px + 0.5, py + 0.5, eff.cw * scale, eff.ch * scale)
      }
    }
  }, [slicerImg, sliceMode, cols, rows, cellW, cellH, offsetX, offsetY, gapX, gapY])

  useEffect(() => { drawSlicerPreview() }, [drawSlicerPreview])

  // Slicer: export ZIP
  const handleSliceExport = async () => {
    if (!slicerImg) return
    const eff = sliceMode === 'count'
      ? { cols, rows, cw: Math.floor((slicerImg.width - offsetX - Math.max(0, cols - 1) * gapX) / cols), ch: Math.floor((slicerImg.height - offsetY - Math.max(0, rows - 1) * gapY) / rows) }
      : { cols: Math.floor((slicerImg.width - offsetX + gapX) / (cellW + gapX)), rows: Math.floor((slicerImg.height - offsetY + gapY) / (cellH + gapY)), cw: cellW, ch: cellH }

    const zip = new JSZip()
    let idx = 0
    for (let r = 0; r < eff.rows; r++) {
      for (let c = 0; c < eff.cols; c++) {
        const c2 = document.createElement('canvas')
        c2.width = eff.cw; c2.height = eff.ch
        const ctx = c2.getContext('2d')!
        const sx = offsetX + c * (eff.cw + gapX)
        const sy = offsetY + r * (eff.ch + gapY)
        ctx.drawImage(slicerImg, sx, sy, eff.cw, eff.ch, 0, 0, eff.cw, eff.ch)
        const blob = await new Promise<Blob>((res) => c2.toBlob(b => res(b!)))
        zip.file(`slice_${String(idx).padStart(3, '0')}.png`, blob)
        idx++
      }
    }
    const blob = await zip.generateAsync({ type: 'blob' })
    downloadBlob(blob, 'slices.zip')
  }

  const slicerEff = slicerImg
    ? sliceMode === 'count'
      ? { cols, rows, cw: Math.floor((slicerImg.width - offsetX - Math.max(0, cols - 1) * gapX) / cols), ch: Math.floor((slicerImg.height - offsetY - Math.max(0, rows - 1) * gapY) / rows) }
      : { cols: Math.floor((slicerImg.width - offsetX + gapX) / (cellW + gapX)), rows: Math.floor((slicerImg.height - offsetY + gapY) / (cellH + gapY)), cw: cellW, ch: cellH }
    : null

  return (
    <div className="space-y-4">
      {/* Tab switcher */}
      <div className="flex gap-1 rounded-lg border border-border bg-surface-hi p-1 w-fit">
        {(['packer', 'slicer'] as Mode[]).map(m => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`rounded-md px-4 py-1.5 font-mono text-xs font-semibold transition-all ${
              mode === m ? 'bg-teal text-bg' : 'text-muted hover:text-primary'
            }`}
          >
            {m === 'packer' ? '🧩 Packer' : '✂️ Slicer'}
          </button>
        ))}
      </div>

      {/* Packer */}
      {mode === 'packer' && (
        <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
          {/* Left: image list */}
          <div className="space-y-3">
            <div
              onDragOver={e => { e.preventDefault(); setDraggingPacker(true) }}
              onDragLeave={() => setDraggingPacker(false)}
              onDrop={handlePackerDrop}
              onClick={() => packerInputRef.current?.click()}
              className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-6 text-center transition-all ${
                draggingPacker ? 'border-teal bg-teal/8' : 'border-border hover:border-border-hi'
              }`}
            >
              <input ref={packerInputRef} type="file" accept="image/*" multiple className="sr-only" onChange={handlePackerInput} />
              <span className="font-mono text-xs text-muted">{draggingPacker ? 'ドロップ' : '画像をドロップ / クリック'}</span>
              <span className="font-mono text-[10px] text-muted/50">PNG / JPG · 複数可</span>
            </div>

            {packerImages.length > 0 && (
              <div className="space-y-1.5 max-h-64 overflow-y-auto">
                {packerImages.map(img => (
                  <div key={img.id} className="flex items-center gap-2 rounded-md border border-border bg-surface-hi px-2 py-1.5">
                    <canvas
                      width={24} height={24}
                      ref={el => {
                        if (!el) return
                        const ctx = el.getContext('2d')!
                        const scale = Math.min(24 / img.w, 24 / img.h)
                        el.width = 24; el.height = 24
                        ctx.drawImage(img.img, 0, 0, img.w * scale, img.h * scale)
                      }}
                      className="shrink-0 rounded"
                    />
                    <span className="font-mono text-[10px] text-dim truncate flex-1">{img.name}</span>
                    <button
                      onClick={() => { setPackerImages(prev => prev.filter(i => i.id !== img.id)); setPacked(null) }}
                      className="shrink-0 text-muted/50 hover:text-red-400 font-mono text-xs"
                    >×</button>
                  </div>
                ))}
              </div>
            )}

            {packerImages.length > 0 && (
              <button
                onClick={() => { setPackerImages([]); setPacked(null) }}
                className="w-full rounded-md border border-border py-1 font-mono text-[10px] text-muted hover:text-red-400 hover:border-red-400/40"
              >
                すべて削除
              </button>
            )}
          </div>

          {/* Right: canvas + controls */}
          <div className="space-y-3">
            <div className="overflow-auto rounded-lg border border-border bg-[#111827] p-3 min-h-32 flex items-center justify-center">
              {packed ? (
                <canvas ref={packerCanvasRef} className="max-w-full" style={{ imageRendering: 'pixelated' }} />
              ) : (
                <div ref={el => { if (el && packerCanvasRef.current) el.appendChild(packerCanvasRef.current) }}>
                  <canvas ref={packerCanvasRef} className="hidden" />
                  <p className="font-mono text-xs text-muted/40">パックするとここにプレビューが表示されます</p>
                </div>
              )}
            </div>

            {/* Options */}
            <div className="flex flex-wrap items-center gap-4 rounded-lg border border-border bg-surface-hi px-4 py-3">
              <label className="flex items-center gap-2 font-mono text-xs text-dim">
                余白
                <input type="range" min={0} max={32} value={padding} onChange={e => { setPadding(+e.target.value); setPacked(null) }} className="w-24 accent-teal" />
                <span className="w-6 text-right text-muted">{padding}</span>
              </label>
              {[
                { label: '透明トリム', val: trim, set: setTrim },
                { label: '2のべき乗', val: pow2, set: setPow2 },
              ].map(({ label, val, set }) => (
                <label key={label} className="flex cursor-pointer items-center gap-1.5 font-mono text-xs text-dim">
                  <input type="checkbox" checked={val} onChange={e => { set(e.target.checked); setPacked(null) }}
                    className="accent-teal" />
                  {label}
                </label>
              ))}
            </div>

            {/* Buttons */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handlePack}
                disabled={!packerImages.length}
                className="rounded-lg bg-teal px-5 py-2 font-mono text-sm font-semibold text-bg transition-opacity hover:opacity-80 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                パック ({packerImages.length} 枚)
              </button>
              {packed && (
                <>
                  <button onClick={handleDownloadPng} className="rounded-lg border border-teal/40 px-4 py-2 font-mono text-sm text-teal hover:bg-teal/10 transition-colors">
                    PNG 保存
                  </button>
                  <button onClick={handleDownloadJson} className="rounded-lg border border-border px-4 py-2 font-mono text-sm text-dim hover:text-primary hover:border-border-hi transition-colors">
                    JSON 保存
                  </button>
                  <span className="self-center font-mono text-xs text-muted">{packed.tw} × {packed.th} px</span>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Slicer */}
      {mode === 'slicer' && (
        <div className="grid gap-4 lg:grid-cols-[200px_1fr]">
          {/* Left: controls */}
          <div className="space-y-3">
            {/* Drop zone (when no image) */}
            {!slicerImg && (
              <div
                onDragOver={e => { e.preventDefault(); setDraggingSlicer(true) }}
                onDragLeave={() => setDraggingSlicer(false)}
                onDrop={handleSlicerDrop}
                onClick={() => slicerInputRef.current?.click()}
                className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-8 text-center transition-all ${
                  draggingSlicer ? 'border-teal bg-teal/8' : 'border-border hover:border-border-hi'
                }`}
              >
                <input ref={slicerInputRef} type="file" accept="image/*" className="sr-only"
                  onChange={e => { const f = e.target.files?.[0]; if (f) loadSlicerFile(f); e.target.value = '' }} />
                <span className="font-mono text-xs text-muted">{draggingSlicer ? 'ドロップ' : '画像をドロップ / クリック'}</span>
              </div>
            )}

            {slicerImg && (
              <>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] text-muted">{slicerImg.width} × {slicerImg.height}</span>
                  <button onClick={() => setSlicerImg(null)} className="font-mono text-[10px] text-muted/50 hover:text-red-400">削除</button>
                </div>

                {/* Mode */}
                <div className="flex gap-1 rounded-md border border-border p-1">
                  {(['count', 'size'] as SliceMode[]).map(m => (
                    <button key={m} onClick={() => setSliceMode(m)}
                      className={`flex-1 rounded py-1 font-mono text-[10px] transition-all ${sliceMode === m ? 'bg-teal/20 text-teal' : 'text-muted hover:text-primary'}`}>
                      {m === 'count' ? '分割数' : 'セルサイズ'}
                    </button>
                  ))}
                </div>

                {/* Parameters */}
                <div className="space-y-2">
                  {sliceMode === 'count' ? (
                    <>
                      {[{ label: 'ヨコ', val: cols, set: setCols }, { label: 'タテ', val: rows, set: setRows }].map(({ label, val, set }) => (
                        <label key={label} className="flex items-center justify-between font-mono text-xs text-dim">
                          {label}
                          <input type="number" min={1} max={64} value={val}
                            onChange={e => set(Math.max(1, +e.target.value))}
                            className="w-16 rounded border border-border bg-surface-hi px-2 py-1 text-right text-xs text-primary" />
                        </label>
                      ))}
                    </>
                  ) : (
                    <>
                      {[{ label: '幅 px', val: cellW, set: setCellW }, { label: '高さ px', val: cellH, set: setCellH }].map(({ label, val, set }) => (
                        <label key={label} className="flex items-center justify-between font-mono text-xs text-dim">
                          {label}
                          <input type="number" min={1} value={val}
                            onChange={e => set(Math.max(1, +e.target.value))}
                            className="w-16 rounded border border-border bg-surface-hi px-2 py-1 text-right text-xs text-primary" />
                        </label>
                      ))}
                    </>
                  )}
                  <div className="border-t border-border pt-2 space-y-2">
                    {[{ label: 'オフセット X', val: offsetX, set: setOffsetX }, { label: 'オフセット Y', val: offsetY, set: setOffsetY }, { label: 'ギャップ X', val: gapX, set: setGapX }, { label: 'ギャップ Y', val: gapY, set: setGapY }].map(({ label, val, set }) => (
                      <label key={label} className="flex items-center justify-between font-mono text-xs text-dim">
                        {label}
                        <input type="number" min={0} value={val}
                          onChange={e => set(Math.max(0, +e.target.value))}
                          className="w-16 rounded border border-border bg-surface-hi px-2 py-1 text-right text-xs text-primary" />
                      </label>
                    ))}
                  </div>
                </div>

                {slicerEff && (
                  <p className="font-mono text-[10px] text-muted">
                    {slicerEff.cols} × {slicerEff.rows} = {slicerEff.cols * slicerEff.rows} 枚
                    <br />{slicerEff.cw} × {slicerEff.ch} px / セル
                  </p>
                )}

                <button
                  onClick={handleSliceExport}
                  disabled={!slicerEff || slicerEff.cols <= 0 || slicerEff.rows <= 0}
                  className="w-full rounded-lg bg-teal px-4 py-2 font-mono text-sm font-semibold text-bg transition-opacity hover:opacity-80 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  ZIP でダウンロード
                </button>
              </>
            )}
          </div>

          {/* Right: canvas preview */}
          <div className="overflow-auto rounded-lg border border-border bg-[#111827] p-3 min-h-48 flex items-center justify-center">
            {slicerImg ? (
              <canvas ref={slicerCanvasRef} className="max-w-full" style={{ imageRendering: 'pixelated' }} />
            ) : (
              <p className="font-mono text-xs text-muted/40">画像をドロップするとプレビューが表示されます</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
