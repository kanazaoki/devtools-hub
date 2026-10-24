'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import {
  ENCODING_LABEL,
  type Detection,
  type EncodingId,
  detectEncoding,
  encodeUtf8,
  repairMojibake,
} from '@/lib/textEncoding'

const MAX_BYTES = 10 * 1024 * 1024
const PREVIEW_LINES = 8

type Mode = 'file' | 'repair'

const READ_LABEL: Record<string, string> = {
  shift_jis: 'Shift_JIS として読んだ',
  'windows-1252': '欧文（Windows-1252）として読んだ',
}

const SAMPLE_GARBLED = '隲区ｱよ嶌_2026蟷ｴ10譛�.csv'

function previewOf(text: string): string {
  return text.split(/\r\n|\r|\n/).slice(0, PREVIEW_LINES).join('\n')
}

export function TextEncodingChecker() {
  const [mode, setMode] = useState<Mode>('file')
  const [file, setFile] = useState<{ name: string; size: number; det: Detection } | null>(null)
  const [chosen, setChosen] = useState<EncodingId | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const [garbled, setGarbled] = useState(SAMPLE_GARBLED)
  const [copied, setCopied] = useState<number | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const read = useCallback(async (f: File) => {
    setError(null)
    if (f.size > MAX_BYTES) {
      setFile(null)
      setError(`ファイルが大きすぎます（${(f.size / 1024 / 1024).toFixed(1)}MB）。10MB までにしてください。`)
      return
    }
    try {
      const det = detectEncoding(new Uint8Array(await f.arrayBuffer()))
      setFile({ name: f.name, size: f.size, det })
      setChosen(det.best?.encoding ?? null)
    } catch {
      setFile(null)
      setError('ファイルを読み込めませんでした。')
    }
  }, [])

  const current = file?.det.candidates.find((c) => c.encoding === chosen) ?? null

  const download = (withBom: boolean) => {
    if (!file || !current) return
    const bytes = encodeUtf8(current.text, withBom)
    const url = URL.createObjectURL(new Blob([bytes], { type: 'text/plain' }))
    const a = document.createElement('a')
    const dot = file.name.lastIndexOf('.')
    const base = dot > 0 ? file.name.slice(0, dot) : file.name
    const ext = dot > 0 ? file.name.slice(dot) : '.txt'
    a.href = url
    a.download = `${base}_utf8${withBom ? 'bom' : ''}${ext}`
    a.click()
    URL.revokeObjectURL(url)
  }

  const repair = useMemo(() => (garbled.trim() ? repairMojibake(garbled) : null), [garbled])

  const copy = async (text: string, i: number) => {
    await navigator.clipboard.writeText(text)
    setCopied(i)
    setTimeout(() => setCopied(null), 1500)
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex rounded-lg border border-border bg-[#0a0a10] p-0.5 self-start">
        {([['file', 'ファイルの文字コードを調べる'], ['repair', '化けた文字列を戻す']] as [Mode, string][]).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setMode(key)}
            className={`rounded-md px-4 py-1.5 font-mono text-xs font-medium transition-all ${
              mode === key ? 'bg-teal/15 text-teal' : 'text-muted hover:text-dim'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {mode === 'file' ? (
        <>
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
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
            <p className="font-mono text-xs text-dim">CSV・テキストファイルをドロップ、またはクリックして選択</p>
            <p className="mt-2 font-mono text-[10px] text-border">10MB まで ／ ファイルはブラウザ内だけで読み、どこにも送信しません</p>
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

          {error && (
            <div className="rounded-lg border border-red-400/30 bg-red-400/5 px-4 py-3">
              <p className="font-mono text-xs text-red-300">{error}</p>
            </div>
          )}

          {!file ? (
            <div className="rounded-lg border border-border/50 bg-[#070d1a] px-4 py-8 text-center">
              <p className="font-mono text-xs text-border">
                ファイルを UTF-8・Shift_JIS・EUC-JP のそれぞれで読み、どれで読むと正しい日本語になるかを並べて表示します
              </p>
            </div>
          ) : (
            <>
              <div className="rounded-lg border border-border bg-[#070d1a] px-4 py-3 font-mono text-[11px] text-dim">
                <span className="text-bright">{file.name}</span>
                <span className="ml-3">{file.size.toLocaleString()} バイト</span>
                <span className="ml-3">
                  BOM：{file.det.bom ? `${ENCODING_LABEL[file.det.bom.encoding]} の BOM あり` : 'なし'}
                </span>
                {file.det.asciiOnly && (
                  <p className="mt-1.5 text-amber-300/90">
                    半角英数字と記号だけのファイルです。UTF-8 と Shift_JIS のどちらで読んでも同じ内容になります。
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-2">
                {file.det.candidates.map((c, i) => {
                  const active = c.encoding === chosen
                  return (
                    <button
                      key={c.encoding}
                      onClick={() => setChosen(c.encoding)}
                      className={`rounded-lg border px-4 py-3 text-left transition-colors ${
                        active ? 'border-teal/60 bg-teal/5' : 'border-border bg-[#070d1a] hover:border-teal/30'
                      }`}
                    >
                      <div className="flex flex-wrap items-center gap-3 font-mono text-[11px]">
                        <span className={`font-semibold ${active ? 'text-teal' : 'text-bright'}`}>{ENCODING_LABEL[c.encoding]}</span>
                        {i === 0 && c.errors === 0 && (
                          <span className="rounded bg-teal/15 px-1.5 py-0.5 text-[10px] text-teal">いちばん可能性が高い</span>
                        )}
                        <span className={c.errors === 0 ? 'text-teal/80' : 'text-red-300'}>
                          {c.errors === 0 ? '読めないバイト 0' : `読めないバイト ${c.errors.toLocaleString()}`}
                        </span>
                        <span className="text-muted">日本語らしさ {Math.round(c.score * 100)}%</span>
                      </div>
                      <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap break-all rounded bg-[#060a12] px-3 py-2 font-mono text-[11px] leading-relaxed text-primary">
                        {previewOf(c.text)}
                      </pre>
                    </button>
                  )
                })}
              </div>

              {current && (
                <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-[#070d1a] px-4 py-3">
                  <span className="font-mono text-[11px] text-dim">{ENCODING_LABEL[current.encoding]} で読んだ内容を UTF-8 で保存：</span>
                  <button
                    onClick={() => download(false)}
                    className="rounded border border-teal/40 px-3 py-1 font-mono text-[11px] text-teal hover:bg-teal/10"
                  >
                    UTF-8（BOM なし）
                  </button>
                  <button
                    onClick={() => download(true)}
                    className="rounded border border-teal/40 px-3 py-1 font-mono text-[11px] text-teal hover:bg-teal/10"
                  >
                    UTF-8（BOM 付き・Excel 用）
                  </button>
                  <p className="w-full font-mono text-[10px] leading-relaxed text-muted">
                    Excel は BOM の無い UTF-8 の CSV を Shift_JIS として開くため、ダブルクリックで開くなら BOM 付きを選びます。
                    プログラムや設定ファイル・JSON で使うなら BOM なしを選びます（先頭の BOM が読み込みエラーの原因になることがあります）。
                  </p>
                </div>
              )}
            </>
          )}
        </>
      ) : (
        <>
          <div>
            <label className="mb-1.5 block font-mono text-[10px] font-semibold uppercase tracking-widest text-muted">
              化けた文字列
            </label>
            <textarea
              value={garbled}
              onChange={(e) => setGarbled(e.target.value)}
              rows={4}
              spellCheck={false}
              placeholder="縺薙ｓ縺ｫ縺｡縺ｯ ／ ã“ã‚“ã«ã¡ã¯ ／ ‚±‚ñ‚É‚¿‚Í のような文字列を貼り付け"
              className="w-full resize-none rounded-lg border border-border bg-[#060a12] px-4 py-3 font-mono text-sm text-bright outline-none transition-colors placeholder:text-border focus:border-teal"
            />
          </div>

          {repair && repair.repairs.length === 0 && (
            <div className="rounded-lg border border-border/50 bg-[#070d1a] px-4 py-6 text-center">
              <p className="font-mono text-xs text-border">
                UTF-8・Shift_JIS・Windows-1252 の読み違え（3通り）のどれでも、戻すと日本語らしくなる結果はありませんでした
              </p>
            </div>
          )}

          {repair?.repairs.map((r, i) => (
            <div key={`${r.wrote}-${r.readAs}`} className="rounded-lg border border-border bg-[#070d1a] px-4 py-3">
              <div className="flex flex-wrap items-center gap-3 font-mono text-[11px]">
                <span className="text-bright">
                  {ENCODING_LABEL[r.wrote]} で書いた文字を {READ_LABEL[r.readAs]}
                </span>
                {r.unresolved > 0 ? (
                  <span className="text-amber-300">戻せない文字 {r.unresolved}（〓 で表示）</span>
                ) : (
                  <span className="text-teal/80">すべて戻せました</span>
                )}
                <button
                  onClick={() => copy(r.text, i)}
                  className="ml-auto rounded px-2.5 py-0.5 text-[10px] text-muted hover:bg-teal/10 hover:text-teal"
                >
                  {copied === i ? '✓ Copied' : 'コピー'}
                </button>
              </div>
              <pre className="mt-2 whitespace-pre-wrap break-all rounded bg-[#060a12] px-3 py-2 font-mono text-sm leading-relaxed text-primary">
                {r.text}
              </pre>
            </div>
          ))}

          {repair && repair.lostBytes > 0 && (
            <div className="rounded-lg border border-amber-400/20 bg-amber-400/5 px-4 py-3">
              <p className="font-mono text-[11px] leading-relaxed text-amber-200/90">
                ⚠ 貼り付けた文字列に「�」（U+FFFD）が {repair.lostBytes} 個あります。読み違えたときに読めなかったバイトが捨てられた跡で、
                その部分の元の文字は文字列からは戻せません。元のファイルが残っているなら、「ファイルの文字コードを調べる」で正しい文字コードで読み直すのが確実です。
              </p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
