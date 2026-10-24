'use client'

import { useState, useMemo } from 'react'

type CharCategory = 'ascii-alpha' | 'ascii-digit' | 'ascii-punct' | 'whitespace' | 'cjk' | 'emoji' | 'other'

interface CharInfo {
  char: string
  codePoint: number
  utf8Bytes: number
  category: CharCategory
}

function getCategory(cp: number): CharCategory {
  if (cp === 0x20 || (cp >= 0x09 && cp <= 0x0d)) return 'whitespace'
  if (cp >= 0x41 && cp <= 0x5a) return 'ascii-alpha'
  if (cp >= 0x61 && cp <= 0x7a) return 'ascii-alpha'
  if (cp >= 0x30 && cp <= 0x39) return 'ascii-digit'
  if (cp >= 0x21 && cp <= 0x7e) return 'ascii-punct'
  // CJK Unified Ideographs, Hiragana, Katakana, Hangul etc.
  if ((cp >= 0x3000 && cp <= 0x9fff) || (cp >= 0xac00 && cp <= 0xd7ff) || (cp >= 0xf900 && cp <= 0xfaff)) return 'cjk'
  // Emoji ranges
  if (cp >= 0x1f000) return 'emoji'
  return 'other'
}

function utf8ByteCount(cp: number): number {
  if (cp <= 0x7f) return 1
  if (cp <= 0x7ff) return 2
  if (cp <= 0xffff) return 3
  return 4
}

// 画面に出ない・空白に見えるが別の文字。検索や一致判定が通らない原因になる
const INVISIBLE: Record<number, string> = {
  0x09: 'TAB',
  0x0a: 'LF',
  0x0d: 'CR',
  0x00a0: 'NBSP（ノーブレークスペース）',
  0x00ad: 'SHY（ソフトハイフン）',
  0x180e: 'モンゴル語母音区切り',
  0x200b: 'ZWSP（ゼロ幅スペース）',
  0x200c: 'ZWNJ（ゼロ幅非接合子）',
  0x200d: 'ZWJ（ゼロ幅接合子・絵文字の結合）',
  0x200e: 'LRM（左から右マーク）',
  0x200f: 'RLM（右から左マーク）',
  0x202a: 'LRE', 0x202b: 'RLE', 0x202c: 'PDF', 0x202d: 'LRO', 0x202e: 'RLO（文字の向きを反転）',
  0x2060: 'WJ（ワードジョイナー）',
  0x2066: 'LRI', 0x2067: 'RLI', 0x2068: 'FSI', 0x2069: 'PDI',
  0x3000: '全角スペース',
  0xfe0e: 'VS15（テキスト表示の指定）',
  0xfe0f: 'VS16（絵文字表示の指定）',
  0xfeff: 'BOM / ZWNBSP',
}

function invisibleName(cp: number): string | null {
  if (INVISIBLE[cp]) return INVISIBLE[cp]
  if (cp < 0x20 || (cp >= 0x7f && cp < 0xa0)) return '制御文字'
  if (cp >= 0x2000 && cp <= 0x200a) return '幅つきスペース（U+2000〜200A）'
  if (cp >= 0xe0000 && cp <= 0xe007f) return 'タグ文字'
  return null
}

// 見た目の1文字（書記素）の数。家族の絵文字や「か」＋結合濁点は、コードポイントでは複数でも1つと数える
function graphemeCount(str: string): number {
  if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
    let n = 0
    for (const _ of new Intl.Segmenter('ja', { granularity: 'grapheme' }).segment(str)) n++
    return n
  }
  return [...str].length
}

function analyzeString(str: string): CharInfo[] {
  const result: CharInfo[] = []
  for (const char of str) {
    const cp = char.codePointAt(0) ?? 0
    result.push({
      char,
      codePoint: cp,
      utf8Bytes: utf8ByteCount(cp),
      category: getCategory(cp),
    })
  }
  return result
}

const CATEGORY_META: Record<CharCategory, { label: string; color: string; bg: string; dot: string }> = {
  'ascii-alpha':  { label: 'ASCII英字',  color: 'text-teal',       bg: 'bg-teal/10 border-teal/30',         dot: 'bg-teal' },
  'ascii-digit':  { label: 'ASCII数字',  color: 'text-blue-400',   bg: 'bg-blue-400/10 border-blue-400/30', dot: 'bg-blue-400' },
  'ascii-punct':  { label: 'ASCII記号',  color: 'text-amber-400',  bg: 'bg-amber-400/10 border-amber-400/30', dot: 'bg-amber-400' },
  'whitespace':   { label: '空白',       color: 'text-border',     bg: 'bg-border/10 border-border/30',     dot: 'bg-border' },
  'cjk':          { label: 'CJK',        color: 'text-violet-400', bg: 'bg-violet-400/10 border-violet-400/30', dot: 'bg-violet-400' },
  'emoji':        { label: '絵文字',     color: 'text-pink-400',   bg: 'bg-pink-400/10 border-pink-400/30', dot: 'bg-pink-400' },
  'other':        { label: 'その他',     color: 'text-dim',        bg: 'bg-surface border-border',          dot: 'bg-dim' },
}

const SAMPLE = 'Hello, 世界！🌏 abc123'

export function StringInspector() {
  const [input, setInput] = useState(SAMPLE)

  const chars = useMemo(() => analyzeString(input), [input])

  const totalBytes = useMemo(() => chars.reduce((s, c) => s + c.utf8Bytes, 0), [chars])
  const uniqueChars = useMemo(() => new Set(chars.map((c) => c.char)).size, [chars])

  const catCounts = useMemo(() => {
    const counts: Partial<Record<CharCategory, number>> = {}
    for (const c of chars) counts[c.category] = (counts[c.category] ?? 0) + 1
    return counts
  }, [chars])

  const isEmpty = input.length === 0
  const graphemes = useMemo(() => graphemeCount(input), [input])
  const invisibles = useMemo(() => {
    const m = new Map<number, number>()
    for (const c of chars) {
      if (c.codePoint === 0x20 || c.codePoint === 0x0a || !invisibleName(c.codePoint)) continue
      m.set(c.codePoint, (m.get(c.codePoint) ?? 0) + 1)
    }
    return [...m.entries()]
  }, [chars])
  // 正規化で変わる＝見た目が同じでも別のコードポイント列になっている（結合濁点・全角英数・半角カナ・①など）
  const nfc = useMemo(() => input.normalize('NFC'), [input])
  const nfkc = useMemo(() => input.normalize('NFKC'), [input])

  return (
    <div className="flex flex-col gap-5">
      {/* Input */}
      <div>
        <label className="mb-1.5 block font-mono text-[10px] font-semibold uppercase tracking-widest text-muted">
          文字列入力
        </label>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="検査したい文字列を入力..."
          rows={3}
          spellCheck={false}
          className="w-full rounded-lg border border-border bg-[#060a12] px-4 py-3 font-mono text-sm text-bright outline-none transition-colors focus:border-teal resize-none placeholder:text-border"
        />
      </div>

      {isEmpty ? (
        <div className="rounded-lg border border-border/50 bg-[#070d1a] px-4 py-10 text-center">
          <p className="font-mono text-xs text-border">文字列を入力すると分析結果が表示されます</p>
        </div>
      ) : (
        <>
          {/* Stats */}
          {/* ⚠ 以前は「総文字数」1つだけで、中身はコードポイントの数だった。数え方は使う場所で違うので並べて出す */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: '見た目の文字数', note: '書記素', value: graphemes, color: 'text-teal', border: 'border-teal/20' },
              { label: 'コードポイント数', note: 'Python の len()', value: chars.length, color: 'text-violet-400', border: 'border-violet-400/20' },
              { label: 'UTF-16 の長さ', note: 'JavaScript の length', value: input.length, color: 'text-amber-400', border: 'border-amber-400/20' },
              { label: 'UTF-8 バイト数', note: 'MySQL の LENGTH()', value: totalBytes, color: 'text-blue-400', border: 'border-blue-400/20' },
            ].map(({ label, note, value, color, border }) => (
              <div key={label} className={`rounded-lg border bg-[#070d1a] px-4 py-4 text-center ${border}`}>
                <p className={`font-mono text-3xl font-bold tabular-nums leading-none ${color}`}>{value}</p>
                <p className="mt-1.5 font-mono text-[10px] uppercase tracking-widest text-muted">{label}</p>
                <p className="mt-0.5 font-mono text-[9px] text-muted/60">{note}</p>
              </div>
            ))}
          </div>
          <p className="-mt-2 font-mono text-[10px] text-muted/70">ユニーク文字数 {uniqueChars}（コードポイント単位）</p>

          {invisibles.length > 0 && (
            <div className="rounded-lg border border-amber-400/30 bg-amber-400/5 px-4 py-3">
              <p className="font-mono text-[11px] font-semibold text-amber-300">見えない・空白に見える文字が含まれています</p>
              <ul className="mt-1.5 flex flex-col gap-0.5">
                {invisibles.map(([cp, n]) => (
                  <li key={cp} className="font-mono text-[11px] text-amber-200/90">
                    U+{cp.toString(16).toUpperCase().padStart(4, '0')} {invisibleName(cp)} × {n}
                  </li>
                ))}
              </ul>
              <p className="mt-1.5 font-mono text-[10px] text-muted">
                下の文字グリッドでは赤い枠で示します。改行（LF）は数えていません。CR・CRLF は貼り付けると LF に変わるので、改行コードはファイルで調べてください。
              </p>
            </div>
          )}

          {(nfc !== input || nfkc !== input) && (
            <div className="rounded-lg border border-blue-400/30 bg-blue-400/5 px-4 py-3">
              <p className="font-mono text-[11px] font-semibold text-blue-300">正規化すると変わる文字があります（見た目が同じでも一致しない原因）</p>
              {nfc !== input && (
                <p className="mt-1.5 font-mono text-[11px] text-primary">
                  NFC（結合文字をまとめる）：<span className="text-bright">{nfc}</span>
                  <span className="ml-2 text-muted">{[...input].length} → {[...nfc].length} コードポイント</span>
                </p>
              )}
              {nfkc !== input && (
                <p className="mt-1 font-mono text-[11px] text-primary">
                  NFKC（全角英数→半角・半角カナ→全角・① → 1 など）：<span className="text-bright">{nfkc}</span>
                </p>
              )}
            </div>
          )}

          {/* Category breakdown */}
          <div className="rounded-lg border border-border bg-[#070d1a] overflow-hidden">
            <div className="border-b border-border px-4 py-2.5">
              <p className="font-mono text-[10px] font-semibold uppercase tracking-widest text-muted">文字種別内訳 — 凡例</p>
            </div>
            <div className="flex flex-wrap gap-2 p-4">
              {(Object.entries(CATEGORY_META) as [CharCategory, typeof CATEGORY_META[CharCategory]][]).map(([cat, meta]) => {
                const count = catCounts[cat] ?? 0
                if (count === 0) return null
                return (
                  <div key={cat} className={`flex items-center gap-1.5 rounded border px-2.5 py-1 ${meta.bg}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                    <span className={`font-mono text-[10px] font-medium ${meta.color}`}>{meta.label}</span>
                    <span className={`font-mono text-[10px] tabular-nums ${meta.color}`}>× {count}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Character grid */}
          <div className="rounded-lg border border-border overflow-hidden">
            <div className="border-b border-border bg-[#070d1a] px-4 py-2.5 flex items-center justify-between">
              <p className="font-mono text-[10px] font-semibold uppercase tracking-widest text-muted">文字グリッド</p>
              <div className="flex items-center gap-3">
                <span className="font-mono text-[10px] text-border">char / U+ / bytes</span>
                <span className="font-mono text-[10px] tabular-nums text-dim">{chars.length} 文字</span>
              </div>
            </div>
            <div className="max-h-80 overflow-y-auto p-3 bg-[#060a12]">
              <div className="flex flex-wrap gap-1">
                {chars.map((c, i) => {
                  const meta = CATEGORY_META[c.category]
                  const inv = c.codePoint === 0x20 ? null : invisibleName(c.codePoint)
                  const display =
                    c.codePoint === 0x20 ? '·' : c.codePoint === 0x0a ? '↵' : c.codePoint === 0x09 ? '⇥' : inv && c.codePoint !== 0x3000 ? '◌' : c.char
                  return (
                    <div
                      key={i}
                      title={`U+${c.codePoint.toString(16).toUpperCase().padStart(4, '0')} | UTF-8: ${c.utf8Bytes}B | ${inv ?? meta.label}`}
                      className={`flex flex-col items-center rounded border px-2 py-1.5 min-w-[48px] transition-opacity hover:opacity-80 cursor-default ${inv && c.codePoint !== 0x0a ? 'border-red-400/70 bg-red-400/10' : meta.bg}`}
                    >
                      <span className={`font-mono text-sm leading-none font-semibold ${meta.color}`}>{display}</span>
                      <span className="mt-1 font-mono text-[8px] text-muted/70 leading-none tracking-tight">
                        U+{c.codePoint.toString(16).toUpperCase().padStart(4, '0')}
                      </span>
                      <span className={`font-mono text-[8px] leading-none font-medium ${meta.color} opacity-60`}>{c.utf8Bytes}B</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
