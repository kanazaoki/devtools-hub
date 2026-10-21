'use client'

import { useCallback, useRef, useState } from 'react'

const MAX_BYTES = 5 * 1024 * 1024

type Kind = 'crlf' | 'lf' | 'cr'

const KIND_META: Record<Kind, { label: string; note: string; color: string; border: string; dot: string }> = {
  crlf: {
    label: 'CRLF',
    note: 'U+000D U+000A ／ Windows の既定',
    color: 'text-blue-400',
    border: 'border-blue-400/20',
    dot: 'bg-blue-400',
  },
  lf: {
    label: 'LF',
    note: 'U+000A ／ macOS・Linux の既定',
    color: 'text-teal',
    border: 'border-teal/20',
    dot: 'bg-teal',
  },
  cr: {
    label: 'CR',
    note: 'U+000D 単独 ／ 旧 Mac。いまはほぼ事故',
    color: 'text-amber-400',
    border: 'border-amber-400/20',
    dot: 'bg-amber-400',
  },
}

interface Result {
  name: string
  size: number
  bom: string | null
  counts: Record<Kind, number>
  lines: Record<Kind, number[]>
  totalLines: number
  endsWithNewline: boolean
}

function detectBom(buf: Uint8Array): string | null {
  if (buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) return 'UTF-8 BOM (EF BB BF)'
  if (buf.length >= 4 && buf[0] === 0xff && buf[1] === 0xfe && buf[2] === 0x00 && buf[3] === 0x00)
    return 'UTF-32LE BOM (FF FE 00 00)'
  if (buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xfe) return 'UTF-16LE BOM (FF FE)'
  if (buf.length >= 2 && buf[0] === 0xfe && buf[1] === 0xff) return 'UTF-16BE BOM (FE FF)'
  return null
}

function scan(name: string, buf: Uint8Array): Result {
  const counts: Record<Kind, number> = { crlf: 0, lf: 0, cr: 0 }
  const lines: Record<Kind, number[]> = { crlf: [], lf: [], cr: [] }
  let line = 1

  for (let i = 0; i < buf.length; i++) {
    const b = buf[i]
    if (b === 0x0d) {
      if (buf[i + 1] === 0x0a) {
        counts.crlf++
        if (lines.crlf.length < 50) lines.crlf.push(line)
        i++
      } else {
        counts.cr++
        if (lines.cr.length < 50) lines.cr.push(line)
      }
      line++
    } else if (b === 0x0a) {
      counts.lf++
      if (lines.lf.length < 50) lines.lf.push(line)
      line++
    }
  }

  const last = buf.length > 0 ? buf[buf.length - 1] : -1
  const endsWithNewline = last === 0x0a || last === 0x0d
  const breaks = counts.crlf + counts.lf + counts.cr
  const totalLines = buf.length === 0 ? 0 : endsWithNewline ? breaks : breaks + 1

  return { name, size: buf.length, bom: detectBom(buf), counts, lines, totalLines, endsWithNewline }
}

export function LineEndingInspector() {
  const [result, setResult] = useState<Result | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const read = useCallback(async (file: File) => {
    setError(null)
    if (file.size > MAX_BYTES) {
      setResult(null)
      setError(`ファイルが大きすぎます（${(file.size / 1024 / 1024).toFixed(1)}MB）。5MB までにしてください。`)
      return
    }
    try {
      const buf = new Uint8Array(await file.arrayBuffer())
      setResult(scan(file.name, buf))
    } catch {
      setResult(null)
      setError('ファイルを読み込めませんでした。')
    }
  }, [])

  const kinds = (Object.keys(KIND_META) as Kind[]).filter((k) => (result?.counts[k] ?? 0) > 0)
  const mixed = kinds.length > 1
  /* 件数が同じときに片方だけ出すと、単独CRのような必ず直すべきものを落とす。
     いちばん多い形式を「本来の形」とみなし、それ以外は全部その行番号まで出す。 */
  const majority = mixed
    ? kinds.reduce((a, b) => ((result as Result).counts[a] >= (result as Result).counts[b] ? a : b))
    : null
  const strays = majority ? kinds.filter((k) => k !== majority) : []

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
        <p className="font-mono text-xs text-dim">テキストファイルをドロップ、またはクリックして選択</p>
        <p className="mt-2 font-mono text-[10px] text-border">5MB まで ／ ファイルはブラウザ内だけで読み、どこにも送信しません</p>
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) void read(f)
            e.target.value = ''
          }}
        />
      </div>

      <div className="rounded-lg border border-amber-400/20 bg-amber-400/5 px-4 py-3">
        <p className="font-mono text-[11px] leading-relaxed text-amber-200/90">
          ⚠ 改行コードは「貼り付け」では調べられません。ブラウザのテキスト入力欄は、貼り付けられた CRLF
          を必ず LF に置き換えてしまうため、CR が消えた状態しか見られないからです。このツールがファイルを直接読むのはそのためです。
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-400/30 bg-red-400/5 px-4 py-3">
          <p className="font-mono text-xs text-red-300">{error}</p>
        </div>
      )}

      {!result ? (
        <div className="rounded-lg border border-border/50 bg-[#070d1a] px-4 py-10 text-center">
          <p className="font-mono text-xs text-border">ファイルを読み込むと、改行コードの内訳が表示されます</p>
        </div>
      ) : (
        <>
          <div className="rounded-lg border border-border bg-[#070d1a] px-4 py-3">
            <p className="font-mono text-xs text-bright">{result.name}</p>
            <p className="mt-1 font-mono text-[10px] text-muted">
              {result.size.toLocaleString()} バイト ／ {result.totalLines.toLocaleString()} 行
              {result.bom ? ` ／ ${result.bom}` : ' ／ BOM なし'}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {(Object.keys(KIND_META) as Kind[]).map((k) => {
              const meta = KIND_META[k]
              const n = result.counts[k]
              return (
                <div key={k} className={`rounded-lg border bg-[#070d1a] px-4 py-4 text-center ${meta.border}`}>
                  <p className={`font-mono text-3xl font-bold tabular-nums leading-none ${n > 0 ? meta.color : 'text-border'}`}>
                    {n.toLocaleString()}
                  </p>
                  <p className="mt-1.5 font-mono text-[10px] uppercase tracking-widest text-muted">{meta.label}</p>
                  <p className="mt-1 font-mono text-[9px] leading-snug text-border">{meta.note}</p>
                </div>
              )
            })}
          </div>

          <div
            className={`rounded-lg border px-4 py-3 ${
              mixed ? 'border-amber-400/30 bg-amber-400/5' : 'border-teal/20 bg-teal/5'
            }`}
          >
            {mixed ? (
              <>
                <p className="font-mono text-xs font-semibold text-amber-300">
                  改行コードが混在しています（{kinds.map((k) => KIND_META[k].label).join(' と ')}）
                </p>
                {majority && (
                  <p className="mt-1.5 font-mono text-[11px] text-amber-200/80">
                    いちばん多いのは {KIND_META[majority].label}（{result.counts[majority].toLocaleString()} 箇所）。
                    残りは次のとおりです。
                  </p>
                )}
                {strays.map((k) => (
                  <p key={k} className="mt-1 font-mono text-[11px] leading-relaxed text-amber-200/80">
                    <span className={KIND_META[k].color}>{KIND_META[k].label}</span>{' '}
                    {result.counts[k].toLocaleString()} 箇所 — 行 {result.lines[k].slice(0, 20).join(', ')}
                    {result.counts[k] > result.lines[k].slice(0, 20).length ? ' …' : ''}
                  </p>
                ))}
              </>
            ) : kinds.length === 1 ? (
              <p className="font-mono text-xs text-teal">
                {KIND_META[kinds[0]].label} で統一されています
              </p>
            ) : (
              <p className="font-mono text-xs text-dim">改行が1つもありません（1行だけのファイルです）</p>
            )}
          </div>

          {!result.endsWithNewline && result.size > 0 && (
            <div className="rounded-lg border border-border bg-[#070d1a] px-4 py-3">
              <p className="font-mono text-[11px] leading-relaxed text-dim">
                最終行に改行がありません。Git の差分で最後の行が &quot;\ No newline at end of
                file&quot; と表示されるのはこの状態です。
              </p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
