'use client'

import { useState, useRef } from 'react'
import JSZip from 'jszip'

interface FileEntry {
  id: string
  file: File
  origUrl: string
  origSize: number
  webpBlob: Blob | null
  webpUrl: string | null
  webpSize: number
  status: 'converting' | 'done' | 'error'
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

async function convertToWebP(file: File, quality: number): Promise<{ blob: Blob; url: string }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const objUrl = URL.createObjectURL(file)
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        URL.revokeObjectURL(objUrl)
        reject(new Error('Canvas context unavailable'))
        return
      }
      ctx.drawImage(img, 0, 0)
      URL.revokeObjectURL(objUrl)
      canvas.toBlob(
        (blob) => {
          if (!blob) { reject(new Error('Conversion failed')); return }
          resolve({ blob, url: URL.createObjectURL(blob) })
        },
        'image/webp',
        quality / 100
      )
    }
    img.onerror = () => {
      URL.revokeObjectURL(objUrl)
      reject(new Error('Image load failed'))
    }
    img.src = objUrl
  })
}

export function WebpStudio() {
  const [entries, setEntries] = useState<FileEntry[]>([])
  const [quality, setQuality] = useState(80)
  const [dragging, setDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function processFiles(files: File[], currentQuality: number) {
    const valid = files.filter(
      (f) => f.type === 'image/png' || f.type === 'image/jpeg' || /\.(png|jpe?g)$/i.test(f.name)
    )
    if (!valid.length) return

    const newEntries: FileEntry[] = valid.map((f) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      file: f,
      origUrl: URL.createObjectURL(f),
      origSize: f.size,
      webpBlob: null,
      webpUrl: null,
      webpSize: 0,
      status: 'converting',
    }))

    setEntries((prev) => [...prev, ...newEntries])

    await Promise.allSettled(
      newEntries.map(async (entry) => {
        try {
          const { blob, url } = await convertToWebP(entry.file, currentQuality)
          setEntries((prev) =>
            prev.map((e) =>
              e.id === entry.id
                ? { ...e, webpBlob: blob, webpUrl: url, webpSize: blob.size, status: 'done' }
                : e
            )
          )
        } catch {
          setEntries((prev) =>
            prev.map((e) => (e.id === entry.id ? { ...e, status: 'error' } : e))
          )
        }
      })
    )
  }

  async function reconvertAll() {
    const toReconvert = entries.filter((e) => e.status === 'done' || e.status === 'error')
    if (!toReconvert.length) return

    setEntries((prev) =>
      prev.map((e) =>
        toReconvert.find((r) => r.id === e.id)
          ? { ...e, webpBlob: null, webpUrl: null, webpSize: 0, status: 'converting' }
          : e
      )
    )

    await Promise.allSettled(
      toReconvert.map(async (entry) => {
        try {
          const { blob, url } = await convertToWebP(entry.file, quality)
          setEntries((prev) =>
            prev.map((e) =>
              e.id === entry.id
                ? { ...e, webpBlob: blob, webpUrl: url, webpSize: blob.size, status: 'done' }
                : e
            )
          )
        } catch {
          setEntries((prev) =>
            prev.map((e) => (e.id === entry.id ? { ...e, status: 'error' } : e))
          )
        }
      })
    )
  }

  function handleDownload(entry: FileEntry) {
    if (!entry.webpUrl) return
    const a = document.createElement('a')
    a.href = entry.webpUrl
    a.download = entry.file.name.replace(/\.[^.]+$/, '.webp')
    a.click()
  }

  async function handleDownloadZip() {
    const done = entries.filter((e) => e.webpBlob)
    if (!done.length) return
    const zip = new JSZip()
    done.forEach((e) => {
      zip.file(e.file.name.replace(/\.[^.]+$/, '.webp'), e.webpBlob!)
    })
    const blob = await zip.generateAsync({ type: 'blob' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'webp-studio.zip'
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    processFiles(Array.from(e.dataTransfer.files), quality)
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    processFiles(Array.from(e.target.files || []), quality)
    e.target.value = ''
  }

  const doneEntries = entries.filter((e) => e.status === 'done')

  return (
    <div className="space-y-5">
      {/* Quality slider — TextLayoutChecker と同一パターン */}
      <div className="overflow-hidden rounded-xl border border-border bg-surface-hi">
        <div className="flex items-center gap-3 px-4 py-2.5">
          <label className="w-20 shrink-0 font-mono text-[10px] uppercase tracking-widest text-muted">
            Quality
          </label>
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={quality}
            onChange={(e) => setQuality(Number(e.target.value))}
            className="flex-1 accent-teal"
          />
          <span className="w-8 text-right font-mono text-xs tabular-nums text-bright">{quality}</span>
          {entries.length > 0 && (
            <button
              onClick={reconvertAll}
              className="ml-2 shrink-0 rounded border border-teal/40 px-3 py-1 font-mono text-[10px] text-teal transition-colors hover:bg-teal/10"
            >
              再変換
            </button>
          )}
        </div>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-14 text-center transition-all duration-150 ${
          dragging ? 'border-teal bg-teal/8 scale-[1.01]' : 'border-border hover:border-border-hi'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg"
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
          <circle cx="8.5" cy="8.5" r="1.5" />
          <polyline points="21 15 16 10 5 21" />
        </svg>
        <p className="font-mono text-sm text-muted">
          {dragging ? 'ドロップして変換' : 'PNG / JPG をドラッグ＆ドロップ'}
        </p>
        <p className="font-mono text-xs text-muted/50">クリックでファイル選択も可 · 複数ファイル対応</p>
      </div>

      {/* Results */}
      {entries.length > 0 && (
        <div className="space-y-3">
          {entries.map((entry) => {
            const reduction = entry.origSize > 0
              ? Math.round((1 - entry.webpSize / entry.origSize) * 100)
              : 0
            const borderColor =
              entry.status === 'done'
                ? 'rgba(0,200,150,0.5)'
                : entry.status === 'error'
                ? 'rgba(239,68,68,0.4)'
                : 'rgba(0,200,150,0.15)'
            return (
              <div
                key={entry.id}
                className="overflow-hidden rounded-xl border border-border bg-surface-hi"
                style={{ borderLeftColor: borderColor, borderLeftWidth: '3px' }}
              >
                <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-border/50">
                  <span className="font-mono text-xs text-primary truncate max-w-[45%]">
                    {entry.file.name}
                  </span>
                  <div className="flex items-center gap-3 shrink-0">
                    {entry.status === 'done' && (
                      <>
                        <span className="font-mono text-[10px] text-muted tabular-nums">
                          {formatBytes(entry.origSize)}
                          <span className="mx-1 text-muted/40">→</span>
                          {formatBytes(entry.webpSize)}
                          <span
                            className="ml-1.5"
                            style={{
                              color: reduction >= 50 ? 'rgb(0,200,150)' : reduction >= 20 ? 'rgb(0,200,150,0.7)' : 'rgb(0,200,150,0.5)',
                            }}
                          >
                            -{reduction}%
                          </span>
                        </span>
                        <button
                          onClick={() => handleDownload(entry)}
                          className="rounded border border-teal/40 px-2.5 py-0.5 font-mono text-[10px] text-teal hover:bg-teal/10 transition-colors"
                        >
                          ↓ DL
                        </button>
                      </>
                    )}
                    {entry.status === 'converting' && (
                      <span className="font-mono text-[10px] text-teal/60 animate-pulse">変換中…</span>
                    )}
                    {entry.status === 'error' && (
                      <span className="font-mono text-[10px] text-red-400">変換エラー</span>
                    )}
                  </div>
                </div>
                {entry.status === 'done' && entry.origUrl && entry.webpUrl && (
                  <div className="grid grid-cols-2 divide-x divide-border">
                    <div className="p-3 space-y-1.5">
                      <p className="font-mono text-[9px] uppercase tracking-widest text-muted">
                        Original
                      </p>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={entry.origUrl}
                        alt="original"
                        className="w-full object-contain max-h-36 rounded"
                      />
                    </div>
                    <div className="p-3 space-y-1.5">
                      <p className="font-mono text-[9px] uppercase tracking-widest text-muted">WebP</p>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={entry.webpUrl}
                        alt="webp"
                        className="w-full object-contain max-h-36 rounded"
                      />
                    </div>
                  </div>
                )}
              </div>
            )
          })}

          {doneEntries.length > 1 && (
            <button
              onClick={handleDownloadZip}
              className="w-full rounded-lg bg-teal px-4 py-2.5 font-mono text-sm font-semibold text-bg transition-opacity hover:opacity-80"
            >
              ZIP でまとめてダウンロード ({doneEntries.length} ファイル)
            </button>
          )}
        </div>
      )}
    </div>
  )
}
