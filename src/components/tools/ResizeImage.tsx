'use client'

import { useState, useRef } from 'react'
import JSZip from 'jszip'

const SIZES = [16, 32, 48, 64, 128, 256, 512]

interface ResizeResult {
  size: number
  filename: string
  blob: Blob
}

interface FileEntry {
  id: string
  file: File
  results: ResizeResult[]
  status: 'idle' | 'processing' | 'done' | 'error'
}

async function resizeToSize(file: File, size: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const objUrl = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(objUrl)
      const canvas = document.createElement('canvas')
      canvas.width = size
      canvas.height = size
      const ctx = canvas.getContext('2d')
      if (!ctx) { reject(new Error('Canvas context unavailable')); return }
      ctx.drawImage(img, 0, 0, size, size)
      canvas.toBlob((blob) => {
        if (!blob) { reject(new Error('Resize failed')); return }
        resolve(blob)
      }, 'image/png')
    }
    img.onerror = () => {
      URL.revokeObjectURL(objUrl)
      reject(new Error('Image load failed'))
    }
    img.src = objUrl
  })
}

export function ResizeImage() {
  const [fileEntries, setFileEntries] = useState<FileEntry[]>([])
  const [selectedSizes, setSelectedSizes] = useState<Set<number>>(new Set(SIZES))
  const [processing, setProcessing] = useState(false)
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function addFiles(files: File[]) {
    const valid = files.filter(
      (f) => f.type.startsWith('image/') || /\.(png|jpe?g|gif|bmp|webp|ico)$/i.test(f.name)
    )
    if (!valid.length) return
    const items: FileEntry[] = valid.map((f) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      file: f,
      results: [],
      status: 'idle',
    }))
    setFileEntries((prev) => [...prev, ...items])
  }

  async function handleResize() {
    const pending = fileEntries.filter((e) => e.status === 'idle')
    if (!pending.length || selectedSizes.size === 0) return
    setProcessing(true)

    for (const entry of pending) {
      setFileEntries((prev) =>
        prev.map((e) => (e.id === entry.id ? { ...e, status: 'processing' } : e))
      )
      try {
        const sortedSizes = Array.from(selectedSizes).sort((a, b) => a - b)
        const results: ResizeResult[] = []
        for (const size of sortedSizes) {
          const blob = await resizeToSize(entry.file, size)
          const baseName = entry.file.name.replace(/\.[^.]+$/, '')
          results.push({ size, filename: `${baseName}_${size}x${size}.png`, blob })
        }
        setFileEntries((prev) =>
          prev.map((e) => (e.id === entry.id ? { ...e, results, status: 'done' } : e))
        )
      } catch {
        setFileEntries((prev) =>
          prev.map((e) => (e.id === entry.id ? { ...e, status: 'error' } : e))
        )
      }
    }

    setProcessing(false)
  }

  async function handleDownloadZip() {
    const done = fileEntries.filter((e) => e.status === 'done')
    if (!done.length) return
    const zip = new JSZip()
    done.forEach((entry) => {
      entry.results.forEach((r) => {
        zip.file(r.filename, r.blob)
      })
    })
    const blob = await zip.generateAsync({ type: 'blob' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'icons.zip'
    a.click()
    URL.revokeObjectURL(url)
  }

  function toggleSize(size: number) {
    setSelectedSizes((prev) => {
      const next = new Set(prev)
      if (next.has(size)) next.delete(size)
      else next.add(size)
      return next
    })
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    addFiles(Array.from(e.dataTransfer.files))
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    addFiles(Array.from(e.target.files || []))
    e.target.value = ''
  }

  const pendingCount = fileEntries.filter((e) => e.status === 'idle').length
  const doneEntries = fileEntries.filter((e) => e.status === 'done')
  const totalOutputFiles = doneEntries.reduce((sum, e) => sum + e.results.length, 0)

  return (
    <div className="space-y-5">
      {/* Size checkboxes */}
      <div className="overflow-hidden rounded-xl border border-border bg-surface-hi">
        <div className="flex flex-wrap items-center gap-3 px-4 py-2.5">
          <span className="w-20 shrink-0 font-mono text-[10px] uppercase tracking-widest text-muted">
            出力サイズ
          </span>
          <div className="flex flex-wrap gap-1.5">
            {SIZES.map((size) => (
              <label
                key={size}
                className={`flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-[11px] transition-all duration-150 ${
                  selectedSizes.has(size)
                    ? 'border-teal/60 bg-teal/10 text-teal'
                    : 'border-border text-muted hover:border-border-hi hover:text-dim'
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedSizes.has(size)}
                  onChange={() => toggleSize(size)}
                  className="sr-only"
                />
                {selectedSizes.has(size) && <span className="text-[9px]">✓</span>}
                {size}px
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-14 text-center transition-all duration-150 ${
          dragging ? 'border-teal bg-teal/8 scale-[1.01]' : 'border-border hover:border-border-hi'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          onChange={handleFileInput}
        />
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`transition-colors ${dragging ? 'text-teal' : 'text-muted/40'}`}
          aria-hidden="true"
        >
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M3 9h18" />
          <path d="M9 21V9" />
        </svg>
        <p className="font-mono text-sm text-muted">
          {dragging ? 'ドロップして追加' : '画像をドラッグ＆ドロップ'}
        </p>
        <p className="font-mono text-xs text-muted/50">PNG / JPG / WebP · 複数ファイル対応</p>
      </div>

      {/* File list */}
      {fileEntries.length > 0 && (
        <div className="space-y-2">
          {fileEntries.map((entry) => {
            const borderColor =
              entry.status === 'done'
                ? 'rgba(0,200,150,0.5)'
                : entry.status === 'error'
                ? 'rgba(239,68,68,0.4)'
                : entry.status === 'processing'
                ? 'rgba(0,200,150,0.3)'
                : 'rgba(0,200,150,0.15)'
            return (
              <div
                key={entry.id}
                className="flex items-center justify-between overflow-hidden rounded-xl border border-border bg-surface-hi px-4 py-3"
                style={{ borderLeftColor: borderColor, borderLeftWidth: '3px' }}
              >
                <span className="font-mono text-xs text-primary truncate max-w-[60%]">
                  {entry.file.name}
                </span>
                <span
                  className={`font-mono text-[10px] shrink-0 ${
                    entry.status === 'done'
                      ? 'text-teal'
                      : entry.status === 'error'
                      ? 'text-red-400'
                      : entry.status === 'processing'
                      ? 'text-teal/60 animate-pulse'
                      : 'text-muted/50'
                  }`}
                >
                  {entry.status === 'done'
                    ? `✓ ${entry.results.length} サイズ生成済み`
                    : entry.status === 'error'
                    ? '変換エラー'
                    : entry.status === 'processing'
                    ? '処理中…'
                    : '待機中'}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {/* Action buttons */}
      {(pendingCount > 0 || totalOutputFiles > 0) && (
        <div className="flex flex-wrap gap-3">
          {pendingCount > 0 && (
            <button
              onClick={handleResize}
              disabled={processing || selectedSizes.size === 0}
              className="rounded-lg bg-teal px-5 py-2.5 font-mono text-sm font-semibold text-bg transition-opacity hover:opacity-80 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {processing
                ? '処理中…'
                : `リサイズ実行 (${pendingCount} ファイル × ${selectedSizes.size} サイズ)`}
            </button>
          )}
          {totalOutputFiles > 0 && (
            <button
              onClick={handleDownloadZip}
              className="rounded-lg border border-teal/40 px-5 py-2.5 font-mono text-sm text-teal transition-colors hover:bg-teal/10"
            >
              ZIP ダウンロード ({totalOutputFiles} ファイル)
            </button>
          )}
        </div>
      )}
    </div>
  )
}
