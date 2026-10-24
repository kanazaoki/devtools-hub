'use client'

import { useState, useCallback } from 'react'

// ─── Kana → Romaji table ──────────────────────────────────────────────────────

const KANA_MAP: Record<string, string> = {
  // あ行
  'あ':'a','い':'i','う':'u','え':'e','お':'o',
  'ア':'a','イ':'i','ウ':'u','エ':'e','オ':'o',
  // か行
  'か':'ka','き':'ki','く':'ku','け':'ke','こ':'ko',
  'カ':'ka','キ':'ki','ク':'ku','ケ':'ke','コ':'ko',
  // さ行
  'さ':'sa','し':'shi','す':'su','せ':'se','そ':'so',
  'サ':'sa','シ':'shi','ス':'su','セ':'se','ソ':'so',
  // た行
  'た':'ta','ち':'chi','つ':'tsu','て':'te','と':'to',
  'タ':'ta','チ':'chi','ツ':'tsu','テ':'te','ト':'to',
  // な行
  'な':'na','に':'ni','ぬ':'nu','ね':'ne','の':'no',
  'ナ':'na','ニ':'ni','ヌ':'nu','ネ':'ne','ノ':'no',
  // は行
  'は':'ha','ひ':'hi','ふ':'fu','へ':'he','ほ':'ho',
  'ハ':'ha','ヒ':'hi','フ':'fu','ヘ':'he','ホ':'ho',
  // ま行
  'ま':'ma','み':'mi','む':'mu','め':'me','も':'mo',
  'マ':'ma','ミ':'mi','ム':'mu','メ':'me','モ':'mo',
  // や行
  'や':'ya','ゆ':'yu','よ':'yo',
  'ヤ':'ya','ユ':'yu','ヨ':'yo',
  // ら行
  'ら':'ra','り':'ri','る':'ru','れ':'re','ろ':'ro',
  'ラ':'ra','リ':'ri','ル':'ru','レ':'re','ロ':'ro',
  // わ行
  'わ':'wa','ゐ':'wi','ゑ':'we','を':'wo','ん':'n',
  'ワ':'wa','ヲ':'wo','ン':'n',
  // 濁音
  'が':'ga','ぎ':'gi','ぐ':'gu','げ':'ge','ご':'go',
  'ガ':'ga','ギ':'gi','グ':'gu','ゲ':'ge','ゴ':'go',
  'ざ':'za','じ':'ji','ず':'zu','ぜ':'ze','ぞ':'zo',
  'ザ':'za','ジ':'ji','ズ':'zu','ゼ':'ze','ゾ':'zo',
  'だ':'da','ぢ':'di','づ':'du','で':'de','ど':'do',
  'ダ':'da','ヂ':'di','ヅ':'du','デ':'de','ド':'do',
  'ば':'ba','び':'bi','ぶ':'bu','べ':'be','ぼ':'bo',
  'バ':'ba','ビ':'bi','ブ':'bu','ベ':'be','ボ':'bo',
  // 半濁音
  'ぱ':'pa','ぴ':'pi','ぷ':'pu','ぺ':'pe','ぽ':'po',
  'パ':'pa','ピ':'pi','プ':'pu','ペ':'pe','ポ':'po',
  // 拗音
  'きゃ':'kya','きゅ':'kyu','きょ':'kyo',
  'しゃ':'sha','しゅ':'shu','しょ':'sho',
  'ちゃ':'cha','ちゅ':'chu','ちょ':'cho',
  'にゃ':'nya','にゅ':'nyu','にょ':'nyo',
  'ひゃ':'hya','ひゅ':'hyu','ひょ':'hyo',
  'みゃ':'mya','みゅ':'myu','みょ':'myo',
  'りゃ':'rya','りゅ':'ryu','りょ':'ryo',
  'ぎゃ':'gya','ぎゅ':'gyu','ぎょ':'gyo',
  'じゃ':'ja','じゅ':'ju','じょ':'jo',
  'びゃ':'bya','びゅ':'byu','びょ':'byo',
  'ぴゃ':'pya','ぴゅ':'pyu','ぴょ':'pyo',
  'キャ':'kya','キュ':'kyu','キョ':'kyo',
  'シャ':'sha','シュ':'shu','ショ':'sho',
  'チャ':'cha','チュ':'chu','チョ':'cho',
  'ニャ':'nya','ニュ':'nyu','ニョ':'nyo',
  'ヒャ':'hya','ヒュ':'hyu','ヒョ':'hyo',
  'ミャ':'mya','ミュ':'myu','ミョ':'myo',
  'リャ':'rya','リュ':'ryu','リョ':'ryo',
  'ギャ':'gya','ギュ':'gyu','ギョ':'gyo',
  'ジャ':'ja','ジュ':'ju','ジョ':'jo',
  'ビャ':'bya','ビュ':'byu','ビョ':'byo',
  'ピャ':'pya','ピュ':'pyu','ピョ':'pyo',
  // 長音・小文字等
  'ー':'-','っ':'','ッ':'',
  'ぁ':'a','ぃ':'i','ぅ':'u','ぇ':'e','ぉ':'o',
  'ァ':'a','ィ':'i','ゥ':'u','ェ':'e','ォ':'o',
  'ゃ':'ya','ゅ':'yu','ょ':'yo',
  'ャ':'ya','ュ':'yu','ョ':'yo',
}

// 外来語の表記（ティ・ファ など）とヴ
const EXTRA_MAP: Record<string, string> = {
  'ヴァ':'va','ヴィ':'vi','ヴ':'vu','ヴェ':'ve','ヴォ':'vo',
  'ティ':'ti','ディ':'di','トゥ':'tu','ドゥ':'du','デュ':'dyu',
  'ファ':'fa','フィ':'fi','フェ':'fe','フォ':'fo','フュ':'fyu',
  'ウィ':'wi','ウェ':'we','ウォ':'wo',
  'チェ':'che','シェ':'she','ジェ':'je','イェ':'ye',
  'ゔ':'vu',
}

// ⚠ 以前は「っ」を消していたので がっこう → gakou、「ー」を区切りにしていたので コーヒー → ko-hi になっていた。
// 促音は次の子音を重ね（ch の前は t）、長音は書かない（ヘボン式でのスラッグの慣用）
function kanaToRomaji(text: string): string {
  let result = ''
  let i = 0
  let pendingSokuon = false
  const push = (r: string) => {
    if (pendingSokuon && r) {
      result += r.startsWith('ch') ? 't' : /^[bcdfghjklmpqrstvwxyz]/.test(r) ? r[0] : ''
      pendingSokuon = false
    }
    result += r
  }
  while (i < text.length) {
    const ch = text[i]
    if (ch === 'っ' || ch === 'ッ') { pendingSokuon = true; i++; continue }
    if (ch === 'ー') { i++; continue }
    const two = text.slice(i, i + 2)
    const r2 = EXTRA_MAP[two] ?? KANA_MAP[two]
    if (r2 !== undefined) { push(r2); i += 2; continue }
    const r1 = EXTRA_MAP[ch] ?? KANA_MAP[ch]
    if (r1 !== undefined) {
      push(r1)
    } else {
      pendingSokuon = false
      result += ch
    }
    i++
  }
  return result
}

// 読みが分からず取り除かれる文字（漢字など）
function droppedChars(input: string): string[] {
  const s = kanaToRomaji(input).normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[ßæÆøØ]/g, '')
  return [...new Set([...s].filter((c) => /[^\x00-\x7F]/.test(c) && /\p{L}/u.test(c) && !/[Ａ-Ｚａ-ｚ０-９]/.test(c)))]
}

// ─── Slug logic ───────────────────────────────────────────────────────────────

type CaseMode = 'lower' | 'upper' | 'keep'

function toSlug(input: string, sep: string, caseMode: CaseMode): string {
  // 1. かな→ローマ字
  let s = kanaToRomaji(input)
  // 2. 全角英数→半角
  s = s.replace(/[Ａ-Ｚａ-ｚ０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xFEE0))
  // 2b. アクセント記号を外す（⚠ 以前は café → caf のように文字ごと消えていた）
  s = s.normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/ß/g, 'ss').replace(/[æÆ]/g, 'ae').replace(/[øØ]/g, 'o')
  // 3. 特殊文字・空白をセパレーターに
  s = s.replace(/[^a-zA-Z0-9぀-ヿ一-鿿]+/g, sep)
  // 4. 漢字など残った非ASCII → 除去
  s = s.replace(/[^\x00-\x7F]+/g, sep)
  // 5. ケース変換
  if (caseMode === 'lower') s = s.toLowerCase()
  else if (caseMode === 'upper') s = s.toUpperCase()
  // 6. セパレーター正規化
  const escapedSep = sep.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')
  s = s.replace(new RegExp(`${escapedSep}+`, 'g'), sep)
  // 7. 先頭・末尾セパレーター除去
  s = s.replace(new RegExp(`^${escapedSep}|${escapedSep}$`, 'g'), '')
  return s
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SlugGenerator() {
  const [input, setInput] = useState('')
  const [sep, setSep] = useState('-')
  const [caseMode, setCaseMode] = useState<CaseMode>('lower')
  const [copied, setCopied] = useState(false)

  const slug = toSlug(input, sep, caseMode)
  const dropped = droppedChars(input)

  const copy = useCallback(() => {
    if (!slug) return
    navigator.clipboard.writeText(slug).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }, [slug])

  return (
    <div className="space-y-5">
      {/* Input */}
      <div>
        <label className="mb-1.5 block text-xs font-medium text-muted uppercase tracking-widest">
          入力テキスト
        </label>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Hello World！ こんにちは世界"
          rows={3}
          className="w-full rounded-md border border-border bg-bg px-3 py-2.5 font-mono text-sm text-primary placeholder:text-muted focus:border-teal focus:outline-none resize-none"
        />
      </div>

      {/* Options */}
      <div className="flex flex-wrap gap-6">
        {/* Separator */}
        <fieldset>
          <legend className="mb-2 text-xs font-medium text-muted uppercase tracking-widest">
            区切り文字
          </legend>
          <div className="flex gap-2">
            {(['-', '_'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSep(s)}
                className={`rounded border px-4 py-1.5 font-mono text-sm transition-colors ${
                  sep === s
                    ? 'border-teal bg-teal/10 text-teal'
                    : 'border-border text-dim hover:border-teal/50'
                }`}
              >
                {s === '-' ? 'ハイフン (-)' : 'アンダースコア (_)'}
              </button>
            ))}
          </div>
        </fieldset>

        {/* Case */}
        <fieldset>
          <legend className="mb-2 text-xs font-medium text-muted uppercase tracking-widest">
            大文字小文字
          </legend>
          <div className="flex gap-2">
            {([['lower', '小文字'], ['upper', '大文字'], ['keep', 'そのまま']] as const).map(([mode, label]) => (
              <button
                key={mode}
                onClick={() => setCaseMode(mode)}
                className={`rounded border px-3 py-1.5 text-sm transition-colors ${
                  caseMode === mode
                    ? 'border-teal bg-teal/10 text-teal'
                    : 'border-border text-dim hover:border-teal/50'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </fieldset>
      </div>

      {/* Output */}
      <div>
        <label className="mb-1.5 block text-xs font-medium text-muted uppercase tracking-widest">
          スラグ
        </label>
        <div className="flex gap-2">
          <div className="flex-1 rounded-md border border-border bg-bg px-3 py-2.5 font-mono text-sm text-primary min-h-[40px] break-all">
            {slug || <span className="text-muted">テキストを入力するとスラグが生成されます</span>}
          </div>
          <button
            onClick={copy}
            disabled={!slug}
            className="shrink-0 rounded-md border border-border bg-surface px-4 py-2 text-sm text-dim transition-colors hover:border-teal hover:text-teal disabled:opacity-40"
          >
            {copied ? '✓ コピー済み' : 'コピー'}
          </button>
        </div>
        {dropped.length > 0 && (
          <p className="mt-2 text-xs text-amber-300">
            ⚠ 読みが分からない文字（{dropped.join('')}）は取り除きました。漢字は読み方を決められないため、ひらがな・カタカナか英語で入力してください。
          </p>
        )}
      </div>

      {/* Examples */}
      <div className="rounded-md border border-border bg-surface p-4">
        <p className="mb-2 text-xs font-medium text-muted uppercase tracking-widest">変換例</p>
        <ul className="space-y-1 font-mono text-xs text-dim">
          {[
            ['がっこうのコーヒー', 'gakkou-no-kohi'],
            ['Hello World!', 'hello-world'],
            ['My Awesome Post 2026', 'my-awesome-post-2026'],
            ['Café Crème', 'cafe-creme'],
          ].map(([from, to]) => (
            <li key={from} className="flex items-center gap-2">
              <span className="text-muted">{from}</span>
              <span className="text-border">→</span>
              <span className="text-teal">{toSlug(from, sep, caseMode) || to}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
