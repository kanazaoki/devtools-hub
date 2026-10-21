'use client'

import { useState, useMemo, useCallback } from 'react'
import type { ReactNode } from 'react'

// ── Width detection ───────────────────────────────────────────────────────────

// 絵文字は全角幅で表示されるが、コードポイントの範囲で列挙すると漏れる。
// Emoji_Presentation（既定で絵文字として表示される文字）で判定する。
const EMOJI_PRESENTATION = /\p{Emoji_Presentation}/u

// 幅を持たない文字。ゼロ幅接合子・異体字セレクタ・結合用の記号など。
// これらを半角に数えると、見た目の幅と合わなくなる。
const ZERO_WIDTH = /[​-‍⁠﻿︀-️]|\p{Mn}/u

function isZeroWidth(char: string): boolean {
  return ZERO_WIDTH.test(char)
}

function isFullWidth(char: string): boolean {
  if (isZeroWidth(char)) return false
  if (EMOJI_PRESENTATION.test(char)) return true
  const code = char.codePointAt(0) ?? 0
  return (
    (code >= 0x1100 && code <= 0x115F) ||  // Hangul Jamo
    (code >= 0x2E80 && code <= 0x303F) ||  // CJK Radicals, Kangxi, CJK Symbols
    (code >= 0x3040 && code <= 0xA4CF) ||  // Hiragana, Katakana, Bopomofo, CJK Unified, Yi
    (code >= 0xAC00 && code <= 0xD7AF) ||  // Hangul Syllables
    (code >= 0xF900 && code <= 0xFAFF) ||  // CJK Compatibility Ideographs
    (code >= 0xFE10 && code <= 0xFE6F) ||  // Vertical Forms, CJK Compat Forms, Small Forms
    (code >= 0xFF01 && code <= 0xFF60) ||  // Fullwidth Latin/Punctuation
    (code >= 0xFFE0 && code <= 0xFFE6) ||  // Fullwidth Signs
    (code >= 0x1B000 && code <= 0x1B0FF) || // Kana Supplement
    (code >= 0x20000 && code <= 0x3134F)   // CJK Extension B–G
  )
}

// ── Grapheme counting ─────────────────────────────────────────────────────────
// 「見た目の1文字」は書記素クラスタ単位。絵文字の連結や結合用の濁点があると
// コードポイント数とは一致しないため、Intl.Segmenter で数える。
// 未対応の環境ではコードポイント数に落とす。

let segmenter: Intl.Segmenter | null | undefined

function countGraphemes(text: string, codePoints: number): number {
  if (text === '') return 0
  if (segmenter === undefined) {
    try {
      segmenter = typeof Intl.Segmenter === 'function' ? new Intl.Segmenter('ja', { granularity: 'grapheme' }) : null
    } catch {
      segmenter = null
    }
  }
  if (!segmenter) return codePoints
  let n = 0
  for (const _ of segmenter.segment(text)) n++
  return n
}

// ── Stats computation ─────────────────────────────────────────────────────────

interface Stats {
  totalChars: number
  graphemeCount: number
  codeUnitCount: number
  charsNoSpace: number
  fullWidthChars: number
  halfWidthChars: number
  zeroWidthChars: number
  wordCount: number
  lineCount: number
  paragraphCount: number
  byteCount: number
  readingTime: number
  manuscriptPages: string
}

function computeStats(text: string): Stats {
  const chars = [...text]
  const totalChars = chars.length
  const charsNoSpace = chars.filter(c => !/\s/.test(c)).length
  const fullWidthChars = chars.filter(c => isFullWidth(c)).length
  const zeroWidthChars = chars.filter(c => isZeroWidth(c)).length
  const halfWidthChars = totalChars - fullWidthChars - zeroWidthChars

  const wordCount =
    text.trim() === '' ? 0 : text.trim().split(/\s+/).filter(w => w.length > 0).length
  const lineCount = text === '' ? 0 : text.split('\n').length
  const paragraphCount =
    text.trim() === ''
      ? 0
      : text.trim().split(/\n\n+/).filter(p => p.trim().length > 0).length

  const byteCount = new TextEncoder().encode(text).length
  const readingTime = charsNoSpace === 0 ? 0 : Math.ceil(charsNoSpace / 400)
  const manuscriptPages = (charsNoSpace / 400).toFixed(1)

  return {
    totalChars,
    graphemeCount: countGraphemes(text, totalChars),
    codeUnitCount: text.length,
    charsNoSpace,
    fullWidthChars,
    halfWidthChars,
    zeroWidthChars,
    wordCount,
    lineCount,
    paragraphCount,
    byteCount,
    readingTime,
    manuscriptPages,
  }
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatRow({
  label,
  value,
  unit,
  testid,
  accent,
}: {
  label: string
  value: number | string
  unit: string
  testid: string
  accent?: boolean
}) {
  return (
    <div className="flex items-baseline justify-between border-b border-border px-4 py-2.5 last:border-b-0">
      <span className="font-mono text-[10px] text-muted">{label}</span>
      <span
        className={`font-mono font-bold tabular-nums ${accent ? 'text-xl text-bright' : 'text-base text-primary'}`}
        data-testid={testid}
      >
        {value}
        <span className="ml-1 text-[10px] font-normal text-dim">{unit}</span>
      </span>
    </div>
  )
}

function StatGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="border-b border-border last:border-b-0">
      <div className="bg-surface/60 px-4 py-1.5">
        <span className="font-mono text-[9px] uppercase tracking-widest text-muted/70">{label}</span>
      </div>
      {children}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function CharacterCounter() {
  const [text, setText] = useState('')
  const stats = useMemo(() => computeStats(text), [text])

  const handleClear = useCallback(() => setText(''), [])

  return (
    <div className="overflow-hidden rounded border border-border">
      <div className="flex min-h-[400px] flex-col sm:flex-row">

        {/* Left: editor zone */}
        <div className="flex flex-1 flex-col border-b border-border sm:border-b-0 sm:border-r">
          <div className="border-b border-border bg-surface/40 px-4 py-2">
            <span className="font-mono text-[9px] uppercase tracking-widest text-muted">入力</span>
          </div>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="ここにテキストを入力またはペーストしてください…"
            className="flex-1 resize-none bg-transparent px-4 py-3 font-sans text-sm leading-relaxed text-primary placeholder:text-muted/40 focus:outline-none"
            aria-label="テキスト入力"
            data-testid="text-input"
          />
          <div className="flex items-center justify-between border-t border-border px-4 py-2">
            <span className="font-mono text-[10px] text-muted/50">
              {stats.totalChars > 0 ? `${stats.totalChars} 字` : ''}
            </span>
            <button
              onClick={handleClear}
              className="font-mono text-[10px] text-muted transition-colors hover:text-red-400"
              data-testid="clear-button"
              aria-label="テキストをクリア"
            >
              クリア
            </button>
          </div>
        </div>

        {/* Right: stats panel */}
        <div className="w-full flex-shrink-0 sm:w-52">
          <StatGroup label="文字数">
            <StatRow label="総計" value={stats.totalChars} unit="字" testid="total-chars" accent />
            <StatRow label="スペース除外" value={stats.charsNoSpace} unit="字" testid="chars-no-space" />
            <StatRow label="全角" value={stats.fullWidthChars} unit="字" testid="full-width" />
            <StatRow label="半角" value={stats.halfWidthChars} unit="字" testid="half-width" />
            <StatRow label="ゼロ幅" value={stats.zeroWidthChars} unit="字" testid="zero-width" />
          </StatGroup>

          <StatGroup label="数え方">
            <StatRow label="書記素" value={stats.graphemeCount} unit="字" testid="grapheme-count" />
            <StatRow label="コードポイント" value={stats.totalChars} unit="個" testid="code-point-count" />
            <StatRow label="コードユニット" value={stats.codeUnitCount} unit="個" testid="code-unit-count" />
          </StatGroup>

          <StatGroup label="構造">
            <StatRow label="単語" value={stats.wordCount} unit="語" testid="word-count" />
            <StatRow label="行" value={stats.lineCount} unit="行" testid="line-count" />
            <StatRow label="段落" value={stats.paragraphCount} unit="段落" testid="paragraph-count" />
          </StatGroup>

          <StatGroup label="参考">
            <StatRow label="バイト（UTF-8）" value={stats.byteCount} unit="B" testid="byte-count" />
            <StatRow label="読了時間" value={stats.readingTime} unit="分" testid="reading-time" />
            <StatRow label="原稿用紙" value={stats.manuscriptPages} unit="枚" testid="manuscript-pages" />
          </StatGroup>
        </div>

      </div>
    </div>
  )
}
