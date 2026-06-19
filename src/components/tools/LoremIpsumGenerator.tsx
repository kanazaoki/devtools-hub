'use client'

import { useState, useCallback } from 'react'

// ── Word bank ─────────────────────────────────────────────────────────────────

const WORDS = [
  'lorem', 'ipsum', 'dolor', 'sit', 'amet', 'consectetur', 'adipiscing',
  'elit', 'sed', 'eiusmod', 'tempor', 'incididunt', 'ut', 'labore', 'et',
  'dolore', 'magna', 'aliqua', 'enim', 'ad', 'minim', 'veniam', 'quis',
  'nostrud', 'exercitation', 'ullamco', 'laboris', 'nisi', 'aliquip', 'ex',
  'ea', 'commodo', 'consequat', 'duis', 'aute', 'irure', 'in', 'reprehenderit',
  'voluptate', 'velit', 'esse', 'cillum', 'eu', 'fugiat', 'nulla', 'pariatur',
  'excepteur', 'sint', 'occaecat', 'cupidatat', 'non', 'proident', 'sunt',
  'culpa', 'qui', 'officia', 'deserunt', 'mollit', 'anim', 'id', 'est',
  'laborum', 'perspiciatis', 'unde', 'omnis', 'iste', 'natus', 'error',
  'voluptatem', 'accusantium', 'doloremque', 'laudantium', 'totam', 'rem',
  'aperiam', 'eaque', 'ipsa', 'quae', 'ab', 'illo', 'inventore', 'veritatis',
  'quasi', 'architecto', 'beatae', 'vitae', 'dicta', 'explicabo', 'nemo',
  'ipsam', 'quia', 'voluptas', 'aspernatur', 'aut', 'odit', 'fugit', 'magni',
  'dolores', 'eos', 'ratione', 'sequi', 'nesciunt', 'neque', 'porro',
  'quisquam', 'nihil', 'expedita', 'distinctio', 'nam', 'libero', 'tempore',
  'cum', 'soluta', 'nobis', 'eligendi', 'optio', 'cumque', 'impedit', 'quo',
  'minus', 'placeat', 'facere', 'possimus', 'repellendus', 'temporibus',
  'autem', 'quibusdam', 'officiis', 'debitis', 'rerum', 'necessitatibus',
  'saepe', 'eveniet', 'voluptates', 'repudiandae', 'recusandae', 'itaque',
  'earum', 'hic', 'tenetur', 'sapiente', 'delectus', 'reiciendis', 'maiores',
  'alias', 'perferendis', 'doloribus', 'asperiores', 'repellat',
]

const LOREM_START = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.'

// ── Generators ────────────────────────────────────────────────────────────────

function rnd(min: number, max: number) {
  return min + Math.floor(Math.random() * (max - min + 1))
}
function randomWord(): string {
  return WORDS[Math.floor(Math.random() * WORDS.length)]
}
function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
function randomSentence(): string {
  const count = rnd(6, 15)
  return Array.from({ length: count }, (_, i) =>
    i === 0 ? cap(randomWord()) : randomWord()
  ).join(' ') + '.'
}
function randomParagraph(): string {
  return Array.from({ length: rnd(3, 6) }, () => randomSentence()).join(' ')
}
function generateByParagraphs(n: number, withLorem: boolean): string {
  const paragraphs = Array.from({ length: n }, () => randomParagraph())
  if (withLorem) paragraphs[0] = LOREM_START + ' ' + paragraphs[0]
  return paragraphs.join('\n\n')
}
function generateByWords(n: number, withLorem: boolean): string {
  const words: string[] = []
  if (withLorem) {
    words.push(...LOREM_START.replace(/[,.']/g, '').toLowerCase().split(' '))
  }
  while (words.length < n) words.push(randomWord())
  const sliced = words.slice(0, n)
  if (sliced.length > 0) sliced[0] = cap(sliced[0])
  return sliced.join(' ')
}
function generateByChars(n: number, withLorem: boolean): string {
  let text = withLorem ? LOREM_START + ' ' : ''
  while (text.length < n) text += randomSentence() + ' '
  return text.slice(0, n)
}

function countWords(text: string): number {
  return text.trim() === '' ? 0 : text.trim().split(/\s+/).length
}
function countParagraphs(text: string): number {
  return text.trim() === '' ? 0 : text.trim().split(/\n\n+/).length
}

// ── Types ─────────────────────────────────────────────────────────────────────

type Mode = 'paragraphs' | 'words' | 'characters'

const MODES: { id: Mode; label: string; symbol: string; unit: string; max: number; def: string }[] = [
  { id: 'paragraphs', label: '段落数', symbol: '¶',  unit: '段落', max: 100,    def: '3'   },
  { id: 'words',      label: '単語数', symbol: 'W',  unit: '単語', max: 10000,  def: '100' },
  { id: 'characters', label: '文字数', symbol: '#',  unit: '文字', max: 100000, def: '500' },
]

// ── Component ─────────────────────────────────────────────────────────────────

export function LoremIpsumGenerator() {
  const [mode, setMode]             = useState<Mode>('paragraphs')
  const [countStr, setCountStr]     = useState('3')
  const [startWithLorem, setStart]  = useState(true)
  const [output, setOutput]         = useState('')
  const [copied, setCopied]         = useState(false)
  const [error, setError]           = useState('')

  const currentMode = MODES.find(m => m.id === mode)!
  const n = parseInt(countStr, 10)
  const isInvalid = !countStr.trim() || isNaN(n) || n < 1

  const handleModeChange = useCallback((m: Mode) => {
    setMode(m)
    setCountStr(MODES.find(x => x.id === m)!.def)
    setError('')
  }, [])

  const generate = useCallback(() => {
    const num = parseInt(countStr, 10)
    if (isNaN(num) || num < 1) { setError('1以上の数値を入力してください'); return }
    if (num > currentMode.max) { setError(`最大 ${currentMode.max.toLocaleString()} ${currentMode.unit}まで`); return }
    setError('')
    let result = ''
    if (mode === 'paragraphs')     result = generateByParagraphs(num, startWithLorem)
    else if (mode === 'words')     result = generateByWords(num, startWithLorem)
    else                           result = generateByChars(num, startWithLorem)
    setOutput(result)
    setCopied(false)
  }, [countStr, mode, startWithLorem, currentMode])

  const handleCopy = useCallback(async () => {
    if (!output) return
    try { await navigator.clipboard.writeText(output) } catch {
      const el = document.createElement('textarea')
      el.value = output
      document.body.appendChild(el); el.select(); document.execCommand('copy'); document.body.removeChild(el)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [output])

  const stats = output
    ? { chars: output.length, words: countWords(output), paras: countParagraphs(output) }
    : null

  return (
    <div className="space-y-6">

      {/* ── Controls strip ─────────────────────────────────────────── */}
      <div className="flex flex-wrap items-end gap-x-8 gap-y-5">

        {/* Mode selector */}
        <div>
          <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-muted">モード</p>
          <div className="flex" role="group" aria-label="生成モード">
            {MODES.map((m, i) => (
              <button
                key={m.id}
                type="button"
                onClick={() => handleModeChange(m.id)}
                aria-pressed={mode === m.id}
                className={[
                  'flex items-center gap-1.5 border-y border-r px-3.5 py-2 font-mono text-xs font-medium transition-colors',
                  i === 0 && 'rounded-l border-l',
                  i === MODES.length - 1 && 'rounded-r',
                  mode === m.id
                    ? 'border-teal bg-teal/10 text-teal'
                    : 'border-border text-muted hover:text-dim',
                ].filter(Boolean).join(' ')}
              >
                <span className="opacity-60">{m.symbol}</span>
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Count */}
        <div>
          <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-muted">
            {currentMode.unit}数
          </p>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="1"
              max={currentMode.max}
              value={countStr}
              onChange={e => { setCountStr(e.target.value); setError('') }}
              aria-label="生成数"
              className="w-24 rounded border border-border bg-bg px-3 py-2 font-mono text-sm text-bright outline-none transition-colors focus:border-teal/60"
            />
            <span className="font-mono text-xs text-muted">{currentMode.unit}</span>
          </div>
        </div>

        {/* Lorem start option */}
        <div>
          <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-muted">開始文</p>
          <label className="flex cursor-pointer items-center gap-2.5 py-2">
            <span
              role="checkbox"
              aria-checked={startWithLorem}
              aria-label="Lorem ipsum で始める"
              onClick={() => setStart(v => !v)}
              className={[
                'relative inline-flex h-4 w-4 shrink-0 cursor-pointer items-center justify-center rounded border transition-colors',
                startWithLorem ? 'border-teal bg-teal text-bg' : 'border-border',
              ].join(' ')}
            >
              <input
                type="checkbox"
                checked={startWithLorem}
                onChange={e => setStart(e.target.checked)}
                className="sr-only"
              />
              {startWithLorem && (
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                  <path d="M2 5l2.5 2.5L8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </span>
            <span className="font-mono text-xs text-dim">Lorem ipsum で始める</span>
          </label>
        </div>

        {/* Generate button */}
        <div>
          <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-transparent select-none">‌</p>
          <button
            type="button"
            onClick={generate}
            disabled={isInvalid}
            className="group flex items-center gap-2 rounded border border-teal bg-teal/10 px-5 py-2 font-mono text-sm font-semibold text-teal transition-all hover:bg-teal hover:text-bg disabled:cursor-not-allowed disabled:opacity-30"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true" className="transition-transform group-hover:rotate-90 group-disabled:rotate-0">
              <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.5" />
              <path d="M6 3.5v5M3.5 6h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            生成
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <p role="alert" className="font-mono text-xs text-red-400">
          ⚠ {error}
        </p>
      )}

      {/* Output panel */}
      {output && (
        <div className="overflow-hidden rounded-lg border border-border">

          {/* Output header — stats bar */}
          <div className="flex items-center justify-between border-b border-border bg-surface px-4 py-2.5">
            <div className="flex items-center gap-5">
              <StatChip label="¶" value={stats!.paras} />
              <StatChip label="W" value={stats!.words} />
              <StatChip label="#" value={stats!.chars} />
            </div>
            <button
              type="button"
              onClick={handleCopy}
              aria-label="生成テキストをコピー"
              className={[
                'flex items-center gap-1.5 rounded px-3 py-1 font-mono text-xs transition-all',
                copied
                  ? 'bg-teal/10 text-teal'
                  : 'text-muted hover:text-dim',
              ].join(' ')}
            >
              {copied ? (
                <>
                  <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden="true">
                    <path d="M2 5.5l2.5 2.5L9 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Copied
                </>
              ) : (
                <>
                  <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden="true">
                    <rect x="3.5" y="1.5" width="6" height="7.5" rx="1" stroke="currentColor" strokeWidth="1.2" />
                    <path d="M1.5 3.5h1.5M1.5 9.5h8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                    <rect x="1.5" y="3.5" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.2" />
                  </svg>
                  Copy
                </>
              )}
            </button>
          </div>

          {/* Textarea */}
          <textarea
            readOnly
            value={output}
            aria-label="生成結果"
            rows={10}
            className="w-full resize-y bg-bg px-5 py-4 font-mono text-[13px] leading-7 text-dim outline-none"
          />
        </div>
      )}

      {/* Empty state hint */}
      {!output && (
        <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-border">
          <p className="font-mono text-xs text-muted">
            モードと数量を選んで「生成」を押してください
          </p>
        </div>
      )}
    </div>
  )
}

function StatChip({ label, value }: { label: string; value: number }) {
  return (
    <span className="flex items-baseline gap-1.5">
      <span className="font-mono text-[10px] uppercase tracking-widest text-muted">{label}</span>
      <span className="font-mono text-xs tabular-nums text-dim">{value.toLocaleString()}</span>
    </span>
  )
}
