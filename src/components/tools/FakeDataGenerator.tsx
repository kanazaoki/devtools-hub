'use client'

import { useState, useCallback } from 'react'

// ── Data pools ──────────────────────────────────────────────────
const FIRST_NAMES = ['Alice','Bob','Carol','David','Emma','Frank','Grace','Hank','Iris','Jack','Karen','Liam','Mia','Noah','Olivia','Paul','Quinn','Ruby','Sam','Tina','Uma','Victor','Wendy','Xander','Yara','Zach']
const LAST_NAMES  = ['Smith','Johnson','Williams','Brown','Jones','Garcia','Miller','Davis','Wilson','Taylor','Anderson','Thomas','Jackson','White','Harris','Martin','Thompson','Young','Allen','King','Scott','Green','Baker','Adams','Nelson']
const JA_LAST  = ['佐藤','鈴木','高橋','田中','伊藤','渡辺','山本','中村','小林','加藤','吉田','山田','佐々木','山口','松本','井上','木村','林','斎藤','清水','長谷川','勅使河原']
const JA_FIRST = ['大翔','蓮','陽翔','湊','結菜','陽葵','凛','美咲','健太','さくら','翔太','愛子','健一','由美','千尋','和也','奈々','拓海','ひなた','真由美']
const JA_LAST_ROMA: Record<string, string> = { 佐藤:'sato',鈴木:'suzuki',高橋:'takahashi',田中:'tanaka',伊藤:'ito',渡辺:'watanabe',山本:'yamamoto',中村:'nakamura',小林:'kobayashi',加藤:'kato',吉田:'yoshida',山田:'yamada',佐々木:'sasaki',山口:'yamaguchi',松本:'matsumoto',井上:'inoue',木村:'kimura',林:'hayashi',斎藤:'saito',清水:'shimizu',長谷川:'hasegawa',勅使河原:'teshigawara' }
const JA_PREF  = ['東京都','大阪府','北海道','神奈川県','愛知県','福岡県','宮城県','京都府','広島県','沖縄県']
const JA_CITY  = ['中央区','港区','北区','青葉区','中区','南区','西区','東区','緑区']
const JA_TOWN  = ['本町','栄町','緑町','旭町','幸町','新町','桜木町','若葉']
const JA_BLDG  = ['グリーンハイツ','メゾン栄','サンシャイン本町','第二コーポ旭']
const EN_STREET = ['Main St','Oak Ave','Maple Dr','Cedar Ln','Pine St','Elm St']
const EN_CITY   = ['Springfield','Riverside','Fairview','Franklin','Greenville']
// ⚠ 以前は test.org・demo.net・sample.io・mock.dev も使っていたが、どれも実在しうるドメイン。
// テストデータで誤ってメールを送っても誰にも届かないよう、予約済みの example.* だけを使う（RFC 2606）
const DOMAINS     = ['example.com','example.net','example.org']
const LOREM_WORDS = 'lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua enim ad minim veniam quis nostrud exercitation ullamco laboris'.split(' ')

// 表示崩れ・入力チェック漏れを見つけるための極端な値
const EXTREME_TEXT = ['', ' 前後に空白 ', 'あ'.repeat(60), 'Wolfeschlegelsteinhausenbergerdorff-Montgomery-Featherstonehaugh', '𠮷野家 👨‍👩‍👧 ﾃｽﾄ', `O'Brien "Jr." <b>&amp;</b>`, '改行を\n含む']
const EXTREME_NUMBER = [0, -1, 2147483647, 0.1 + 0.2, 1e21]
const EXTREME_DATE = ['1970-01-01', '2000-02-29', '2038-01-19', '9999-12-31']

function rnd(n: number) { return Math.floor(Math.random() * n) }
function pick<T>(arr: T[]): T { return arr[rnd(arr.length)] }

function genUUID(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  const h = () => Math.floor(Math.random() * 0x10000).toString(16).padStart(4,'0')
  return `${h()}${h()}-${h()}-4${h().slice(1)}-${(Math.floor(Math.random()*4)+8).toString(16)}${h().slice(1)}-${h()}${h()}${h()}`
}
function genDate(): string {
  const start = new Date(2000, 0, 1).getTime()
  const end   = new Date(2030, 11, 31).getTime()
  const d = new Date(start + Math.random() * (end - start))
  return d.toISOString().split('T')[0]
}
// 英語：555-0100〜0199 は架空の番号として予約されている。日本語：実在の番号に当たらないよう 000 で始める
function genPhone(locale: Locale): string {
  if (locale === 'ja') return `000-${String(rnd(10000)).padStart(4, '0')}-${String(rnd(10000)).padStart(4, '0')}`
  return `${rnd(800) + 200}-555-01${String(rnd(100)).padStart(2, '0')}`
}
function genAddress(locale: Locale): string {
  if (locale === 'ja') {
    const base = `〒${rnd(900) + 100}-${String(rnd(10000)).padStart(4, '0')} ${pick(JA_PREF)}${pick(JA_CITY)}${pick(JA_TOWN)}${rnd(5) + 1}-${rnd(20) + 1}-${rnd(30) + 1}`
    return Math.random() < 0.4 ? `${base} ${pick(JA_BLDG)} ${rnd(9) + 1}0${rnd(9) + 1}号室` : base
  }
  return `${rnd(9000) + 100} ${pick(EN_STREET)}, ${pick(EN_CITY)}`
}
function genLorem(): string {
  const len = rnd(10) + 5
  return Array.from({ length: len }, () => pick(LOREM_WORDS)).join(' ') + '.'
}

// ── Types ─────────────────────────────────────────────────────────
type FieldKey = 'name' | 'email' | 'phone' | 'address' | 'date' | 'uuid' | 'number' | 'lorem'
type Format = 'json' | 'csv' | 'tsv'
type Locale = 'ja' | 'en'
type Value = string | number

const FIELDS: { key: FieldKey; label: string }[] = [
  { key: 'name',    label: '名前' },
  { key: 'email',   label: 'メール' },
  { key: 'phone',   label: '電話番号' },
  { key: 'address', label: '住所' },
  { key: 'date',    label: '日付' },
  { key: 'uuid',    label: 'UUID' },
  { key: 'number',  label: '数値' },
  { key: 'lorem',   label: 'Lorem文' },
]

function generateRow(fields: FieldKey[], locale: Locale, extremeRate: number): Record<string, Value> {
  const ja = locale === 'ja'
  const last = ja ? pick(JA_LAST) : pick(LAST_NAMES)
  const first = ja ? pick(JA_FIRST) : pick(FIRST_NAMES)
  const row: Record<string, Value> = {}
  for (const f of fields) {
    // 極端な値を混ぜる（UUID とメールは形が崩れると別の検査になるので対象外）
    if (extremeRate > 0 && f !== 'uuid' && f !== 'email' && Math.random() < extremeRate) {
      row[f] = f === 'number' ? pick(EXTREME_NUMBER) : f === 'date' ? pick(EXTREME_DATE) : pick(EXTREME_TEXT)
      continue
    }
    if (f === 'name')    row[f] = ja ? `${last} ${first}` : `${first} ${last}`
    if (f === 'email')   row[f] = `${ja ? JA_LAST_ROMA[last] : first.toLowerCase()}.${ja ? 'user' : last.toLowerCase()}${rnd(99)}@${pick(DOMAINS)}`
    if (f === 'phone')   row[f] = genPhone(locale)
    if (f === 'address') row[f] = genAddress(locale)
    if (f === 'date')    row[f] = genDate()
    if (f === 'uuid')    row[f] = genUUID()
    // ⚠ 以前は数値も文字列（"123"）で出していた。JSON では数値の型で出す
    if (f === 'number')  row[f] = rnd(1000000)
    if (f === 'lorem')   row[f] = genLorem()
  }
  return row
}

function formatOutput(rows: Record<string, Value>[], fields: FieldKey[], fmt: Format): string {
  if (rows.length === 0) return ''
  if (fmt === 'json') return JSON.stringify(rows, null, 2)
  const sep = fmt === 'csv' ? ',' : '\t'
  // TSV はタブと改行を値に入れられないので空白に置き換える
  const escape = (v: Value) => {
    const s = String(v)
    return fmt === 'csv' ? `"${s.replace(/"/g, '""')}"` : s.replace(/[\t\r\n]/g, ' ')
  }
  const header = fields.join(sep)
  const body   = rows.map(r => fields.map(f => escape(r[f] ?? '')).join(sep)).join('\n')
  return `${header}\n${body}`
}

export function FakeDataGenerator() {
  const [selected, setSelected] = useState<Set<FieldKey>>(new Set(['name','email','uuid']))
  const [count, setCount]       = useState(10)
  const [format, setFormat]     = useState<Format>('json')
  const [locale, setLocale]     = useState<Locale>('ja')
  const [extreme, setExtreme]   = useState(false)
  const [output, setOutput]     = useState('')
  const [error, setError]       = useState('')
  const [copied, setCopied]     = useState(false)

  const toggle = (key: FieldKey) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  const generate = useCallback(() => {
    const fields = FIELDS.map(f => f.key).filter(k => selected.has(k))
    if (fields.length === 0) { setError('フィールドを1つ以上選択してください'); setOutput(''); return }
    setError('')
    const rows = Array.from({ length: count }, () => generateRow(fields, locale, extreme ? 0.15 : 0))
    setOutput(formatOutput(rows, fields, format))
  }, [selected, count, format, locale, extreme])

  const copy = async () => {
    if (!output) return
    await navigator.clipboard.writeText(output)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const download = () => {
    if (!output) return
    const ext = format === 'json' ? 'json' : format === 'csv' ? 'csv' : 'tsv'
    const mime = format === 'json' ? 'application/json' : 'text/plain'
    const blob = new Blob([output], { type: mime })
    const url  = URL.createObjectURL(blob)
    const a    = Object.assign(document.createElement('a'), { href: url, download: `fake-data.${ext}` })
    a.click(); URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      {/* Field selection */}
      <div>
        <p className="mb-3 text-sm font-medium text-primary">生成するフィールド</p>
        <div className="flex flex-wrap gap-2">
          {FIELDS.map(({ key, label }) => (
            <label key={key} className={`flex cursor-pointer items-center gap-2 rounded border px-3 py-1.5 text-sm transition-all ${selected.has(key) ? 'border-teal bg-teal/10 text-teal' : 'border-border text-dim hover:border-teal/60'}`}>
              <input
                type="checkbox"
                checked={selected.has(key)}
                onChange={() => toggle(key)}
                className="accent-teal"
              />
              <span className="font-medium">{label}</span>
            </label>
          ))}
        </div>
        {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
      </div>

      {/* Count + Format */}
      <div className="flex flex-wrap gap-6">
        <div className="flex-1 min-w-[160px]">
          <label className="mb-1.5 block text-sm font-medium text-primary">件数: {count}</label>
          <input
            type="range" min={1} max={1000} value={count}
            onChange={e => setCount(Number(e.target.value))}
            className="w-full accent-teal"
          />
          <div className="mt-0.5 flex justify-between text-xs text-muted"><span>1</span><span>1000</span></div>
        </div>
        <div>
          <p className="mb-1.5 text-sm font-medium text-primary">言語</p>
          <div className="flex gap-2">
            {([['ja', '日本語'], ['en', 'English']] as [Locale, string][]).map(([l, label]) => (
              <button key={l} onClick={() => setLocale(l)}
                className={`rounded px-3 py-1.5 text-sm transition-colors ${locale === l ? 'bg-teal text-bg font-bold' : 'border border-border text-dim hover:border-teal'}`}
              >{label}</button>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-1.5 text-sm font-medium text-primary">フォーマット</p>
          <div className="flex gap-2">
            {(['json','csv','tsv'] as Format[]).map(f => (
              <button key={f} onClick={() => setFormat(f)}
                className={`rounded px-3 py-1.5 text-sm font-mono transition-colors ${format === f ? 'bg-teal text-bg font-bold' : 'border border-border text-dim hover:border-teal'}`}
              >{f.toUpperCase()}</button>
            ))}
          </div>
        </div>
      </div>

      <label className="flex items-start gap-2 text-sm text-primary">
        <input type="checkbox" checked={extreme} onChange={e => setExtreme(e.target.checked)} className="mt-1 accent-teal" />
        <span>
          極端な値を混ぜる（約15%）
          <span className="block text-xs text-muted">
            空文字・前後の空白・60文字の名前・絵文字・𠮷・半角カナ・引用符と HTML タグ・改行入りの文字列、0・-1・2147483647・0.30000000000000004、1970-01-01・2000-02-29・2038-01-19 など。表示崩れや入力チェックの漏れを探す用途に。
          </span>
        </span>
      </label>
      <p className="-mt-3 text-xs text-muted">
        メールは予約済みの example.com / example.net / example.org だけを使い、電話番号は英語なら架空用の 555-01XX、日本語なら 000 で始まる番号にしています（誤って送っても実在の相手に届かないように）。
      </p>

      {/* Generate button */}
      <button onClick={generate}
        className="w-fit rounded bg-teal px-6 py-2 text-sm font-bold text-bg transition-all hover:opacity-85 active:scale-95"
      >生成する</button>

      {/* Output */}
      {output && (
        <div className="rounded-lg border border-border bg-surface p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs text-muted font-mono uppercase tracking-widest">Output</p>
            <div className="flex gap-2">
              <button onClick={copy} className={`rounded px-3 py-1 text-xs font-medium transition-all ${copied ? 'bg-teal/20 text-teal border border-teal/40' : 'border border-border text-dim hover:border-teal hover:text-teal'}`}>
                {copied ? '✓ コピー済み' : 'コピー'}
              </button>
              <button onClick={download} className="rounded border border-border px-3 py-1 text-xs text-dim hover:border-teal hover:text-teal transition-all">
                ダウンロード
              </button>
            </div>
          </div>
          <textarea
            readOnly value={output}
            className="h-64 w-full resize-y rounded border border-border/50 bg-bg p-3 font-mono text-xs text-primary focus:outline-none"
          />
        </div>
      )}
    </div>
  )
}
