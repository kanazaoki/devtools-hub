'use client'

import { useState, useMemo, useCallback } from 'react'

interface Options {
  stripMeta: boolean
  minify: boolean
  round: boolean
  decimals: number
}

function byteLength(s: string): number {
  return new TextEncoder().encode(s).length
}

function optimizeSvg(svg: string, opts: Options): string {
  let s = svg
  if (opts.stripMeta) {
    s = s.replace(/<\?xml[\s\S]*?\?>/g, '') // XML 宣言
    s = s.replace(/<!DOCTYPE[\s\S]*?>/gi, '') // DOCTYPE
    s = s.replace(/<!--[\s\S]*?-->/g, '') // コメント
    s = s.replace(/<metadata[\s\S]*?<\/metadata>/gi, '') // <metadata>
    // Inkscape の namedview（子要素ごと）
    s = s.replace(/<sodipodi:namedview[\s\S]*?<\/sodipodi:namedview>/gi, '')
    s = s.replace(/<sodipodi:namedview[^>]*\/>/gi, '')
    // エディタ由来の要素（自己終了タグ）
    s = s.replace(/<(?:inkscape|sodipodi):[a-zA-Z-]+(?:\s[^>]*?)?\/>/gi, '')
    // エディタ由来の属性
    s = s.replace(/\s(?:inkscape|sodipodi):[\w-]+="[^"]*"/gi, '')
    // 使わない名前空間宣言
    s = s.replace(/\sxmlns:(?:inkscape|sodipodi|dc|cc|rdf)="[^"]*"/gi, '')
  }
  if (opts.round) {
    const d = Math.max(0, Math.min(6, opts.decimals))
    s = s.replace(/-?\d*\.\d+/g, (m) => String(parseFloat(parseFloat(m).toFixed(d))))
  }
  if (opts.minify) {
    s = s.replace(/>\s+</g, '><')
    s = s.replace(/\s{2,}/g, ' ')
    s = s.trim()
  }
  return s
}

export function SvgOptimizer() {
  const [input, setInput] = useState('')
  const [stripMeta, setStripMeta] = useState(true)
  const [minify, setMinify] = useState(true)
  const [round, setRound] = useState(true)
  const [decimals, setDecimals] = useState(2)
  const [copied, setCopied] = useState(false)

  const isSvg = input.trim() === '' || /<svg[\s>]/i.test(input)

  const output = useMemo(
    () => (isSvg ? optimizeSvg(input, { stripMeta, minify, round, decimals }) : ''),
    [input, isSvg, stripMeta, minify, round, decimals]
  )

  const inBytes = useMemo(() => byteLength(input), [input])
  const outBytes = useMemo(() => byteLength(output), [output])
  const reduction = inBytes > 0 ? Math.round((1 - outBytes / inBytes) * 100) : 0

  const previewSrc = useMemo(() => {
    if (!output || !isSvg) return ''
    try {
      return `data:image/svg+xml;utf8,${encodeURIComponent(output)}`
    } catch {
      return ''
    }
  }, [output, isSvg])

  const handleCopy = useCallback(() => {
    if (!output) return
    navigator.clipboard.writeText(output).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }, [output])

  const handleDownload = useCallback(() => {
    if (!output) return
    const blob = new Blob([output], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    Object.assign(document.createElement('a'), { href: url, download: 'optimized.svg' }).click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }, [output])

  const Toggle = ({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) => (
    <button
      type="button"
      onClick={onClick}
      className={`rounded border px-3 py-1.5 font-mono text-[10px] transition-all duration-150 ${
        on
          ? 'border-teal/50 bg-teal/10 text-teal'
          : 'border-border bg-surface text-muted hover:border-border-hi hover:text-dim'
      }`}
    >
      {on ? '✓ ' : ''}
      {label}
    </button>
  )

  return (
    <div className="space-y-3">
      {/* Options */}
      <div className="flex flex-wrap items-center gap-2">
        <Toggle on={stripMeta} onClick={() => setStripMeta((v) => !v)} label="メタデータ削除" />
        <Toggle on={minify} onClick={() => setMinify((v) => !v)} label="空白を最小化" />
        <Toggle on={round} onClick={() => setRound((v) => !v)} label="数値を丸める" />
        {round && (
          <label className="flex items-center gap-1.5 font-mono text-[10px] text-muted">
            小数
            <select
              value={decimals}
              onChange={(e) => setDecimals(Number(e.target.value))}
              className="rounded border border-border bg-surface px-1.5 py-1 text-dim outline-none focus:border-teal/50"
            >
              {[0, 1, 2, 3, 4].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            桁
          </label>
        )}
      </div>

      {/* Split editor */}
      <div className="overflow-hidden rounded border border-border">
        <div className="grid grid-cols-2 border-b border-border">
          <div className="flex items-center justify-between border-r border-border bg-surface px-4 py-2.5">
            <div className="flex items-center gap-2.5">
              <span className="h-2 w-2 rounded-full bg-amber-500/70 shrink-0" />
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted">SVG 入力</span>
            </div>
            {inBytes > 0 && (
              <span className="font-mono text-[9px] tabular-nums text-muted/40">{inBytes.toLocaleString()} B</span>
            )}
          </div>
          <div className="flex items-center justify-between bg-surface px-4 py-2.5">
            <div className="flex items-center gap-2.5">
              <span className="inline-flex h-4 w-8 items-center justify-center rounded-sm bg-teal/20 font-mono text-[8px] font-bold text-teal shrink-0">
                MIN
              </span>
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted">最適化後</span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleDownload}
                disabled={!output}
                className="rounded bg-surface-hi px-2.5 py-1 font-mono text-[9px] font-medium text-muted transition-all duration-150 hover:bg-teal/10 hover:text-teal disabled:cursor-not-allowed disabled:opacity-30"
              >
                .svg
              </button>
              <button
                onClick={handleCopy}
                disabled={!output}
                className={`rounded px-2.5 py-1 font-mono text-[9px] font-medium transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-30 ${
                  copied ? 'bg-teal/20 text-teal' : 'bg-surface-hi text-muted hover:bg-teal/10 hover:text-teal'
                }`}
              >
                {copied ? '✓ Copied!' : 'Copy'}
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2">
          <div className="flex flex-col border-r border-border">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={'<svg xmlns="http://www.w3.org/2000/svg" ...>\n  ...\n</svg>'}
              rows={16}
              spellCheck={false}
              className="flex-1 resize-none bg-bg p-4 font-mono text-xs leading-relaxed text-primary placeholder:text-muted/20 focus:outline-none"
            />
            {!isSvg && (
              <div className="border-t border-red-500/20 bg-red-500/5 px-4 py-2">
                <p className="font-mono text-[10px] text-red-400">&lt;svg&gt; を含む SVG コードを貼り付けてください。</p>
              </div>
            )}
          </div>
          <div className="relative flex flex-col">
            <span
              aria-hidden="true"
              className={`absolute inset-y-0 left-0 w-[2px] transition-colors duration-300 ${
                output ? 'bg-teal/40' : 'bg-border/0'
              }`}
            />
            <textarea
              value={output}
              readOnly
              placeholder="最適化された SVG がここに表示されます"
              rows={16}
              className="flex-1 resize-none bg-bg/70 p-4 pl-5 font-mono text-xs leading-relaxed text-teal/80 placeholder:text-muted/20 focus:outline-none"
            />
          </div>
        </div>

        {/* Size reduction bar */}
        {inBytes > 0 && output && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border bg-surface px-4 py-2.5 font-mono text-[11px]">
            <span className="text-muted">
              {inBytes.toLocaleString()} B → <span className="text-bright">{outBytes.toLocaleString()} B</span>
            </span>
            <span
              className={`font-semibold ${reduction > 0 ? 'text-teal' : 'text-muted'}`}
            >
              {reduction > 0 ? `−${reduction}%` : '削減なし'}
            </span>
          </div>
        )}
      </div>

      {/* Preview */}
      {previewSrc && (
        <div className="flex items-center gap-4 rounded border border-border bg-surface p-4">
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted shrink-0">Preview</span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewSrc}
            alt="最適化後の SVG プレビュー"
            className="max-h-24 max-w-[160px] rounded bg-white/5 p-1"
          />
          <p className="font-mono text-[10px] leading-relaxed text-muted/60">
            最適化後の見た目が崩れていないか確認できます。壊れる場合は「数値を丸める」の桁数を増やしてください。
          </p>
        </div>
      )}
    </div>
  )
}
