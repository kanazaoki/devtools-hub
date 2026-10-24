'use client'

import { useMemo, useState } from 'react'

type Op =
  | 'sort-asc'
  | 'sort-desc'
  | 'sort-length'
  | 'sort-numeric'
  | 'shuffle'
  | 'reverse'
  | 'dedupe'
  | 'unique-only'
  | 'duplicates-only'
  | 'remove-empty'
  | 'trim'
  | 'number'
  | 'affix'
  | 'remove-affix'
  | 'join-sql'
  | 'join-json'
  | 'join-csv'

const OPS: { group: string; items: { id: Op; label: string }[] }[] = [
  {
    group: '並べ替え',
    items: [
      { id: 'sort-asc', label: '昇順ソート' },
      { id: 'sort-desc', label: '降順ソート' },
      { id: 'sort-numeric', label: '数値順ソート' },
      { id: 'sort-length', label: '文字数順ソート' },
      { id: 'reverse', label: '上下反転' },
      { id: 'shuffle', label: 'シャッフル' },
    ],
  },
  {
    group: '重複',
    items: [
      { id: 'dedupe', label: '重複行を1つにまとめる' },
      { id: 'unique-only', label: '1回だけ出る行を残す' },
      { id: 'duplicates-only', label: '重複した行だけ残す' },
    ],
  },
  {
    group: '整形',
    items: [
      { id: 'remove-empty', label: '空行を削除' },
      { id: 'trim', label: '前後の空白を削除' },
      { id: 'number', label: '連番を振る' },
      { id: 'affix', label: '接頭辞・接尾辞を付ける' },
      { id: 'remove-affix', label: '接頭辞・接尾辞を外す' },
    ],
  },
  {
    group: '1行にまとめる（空行は除く）',
    items: [
      { id: 'join-sql', label: 'SQL の IN 句' },
      { id: 'join-json', label: 'JSON の配列' },
      { id: 'join-csv', label: 'カンマ区切り（CSV の1行）' },
    ],
  },
]

// 数値順ソート用：行頭の数値を取り出す（数値でなければ末尾に送る）
function leadingNumber(s: string) {
  const m = s.trim().match(/-?\d+(\.\d+)?/)
  return m ? Number(m[0]) : Number.POSITIVE_INFINITY
}

function mulberry32(a: number) {
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function LineTools() {
  const [input, setInput] = useState('')
  const [op, setOp] = useState<Op>('dedupe')
  const [caseInsensitive, setCaseInsensitive] = useState(false)
  const [ignoreSpace, setIgnoreSpace] = useState(false)
  const [prefix, setPrefix] = useState('')
  const [suffix, setSuffix] = useState('')
  const [seed, setSeed] = useState(1)
  const [copied, setCopied] = useState(false)

  const lines = useMemo(() => (input === '' ? [] : input.split(/\r?\n/)), [input])

  // 比較用のキー（大文字小文字・空白を無視する設定を反映）
  const keyOf = (s: string) => {
    let k = s
    if (ignoreSpace) k = k.trim()
    if (caseInsensitive) k = k.toLowerCase()
    return k
  }

  const output = useMemo(() => {
    if (lines.length === 0) return ''
    let out = [...lines]

    switch (op) {
      case 'sort-asc':
        out.sort((a, b) => keyOf(a).localeCompare(keyOf(b), 'ja'))
        break
      case 'sort-desc':
        out.sort((a, b) => keyOf(b).localeCompare(keyOf(a), 'ja'))
        break
      case 'sort-numeric':
        out.sort((a, b) => leadingNumber(a) - leadingNumber(b))
        break
      case 'sort-length':
        out.sort((a, b) => a.length - b.length)
        break
      case 'reverse':
        out.reverse()
        break
      case 'shuffle': {
        const rnd = mulberry32(seed)
        for (let i = out.length - 1; i > 0; i--) {
          const j = Math.floor(rnd() * (i + 1))
          ;[out[i], out[j]] = [out[j], out[i]]
        }
        break
      }
      case 'dedupe': {
        const seen = new Set<string>()
        out = out.filter((l) => {
          const k = keyOf(l)
          if (seen.has(k)) return false
          seen.add(k)
          return true
        })
        break
      }
      case 'unique-only':
      case 'duplicates-only': {
        const count = new Map<string, number>()
        for (const l of out) count.set(keyOf(l), (count.get(keyOf(l)) ?? 0) + 1)
        if (op === 'unique-only') {
          out = out.filter((l) => count.get(keyOf(l)) === 1)
        } else {
          const seen = new Set<string>()
          out = out.filter((l) => {
            const k = keyOf(l)
            if ((count.get(k) ?? 0) < 2 || seen.has(k)) return false
            seen.add(k)
            return true
          })
        }
        break
      }
      case 'remove-empty':
        out = out.filter((l) => l.trim() !== '')
        break
      case 'trim':
        out = out.map((l) => l.trim())
        break
      case 'number': {
        const w = String(out.length).length
        out = out.map((l, i) => `${String(i + 1).padStart(w, ' ')}. ${l}`)
        break
      }
      case 'affix':
        out = out.map((l) => `${prefix}${l}${suffix}`)
        break
      // ⚠ 接頭辞・接尾辞の付与で IN 句を作ると、最後の行にもカンマが残り、値の中の ' もそのままで SQL が壊れる。
      // まとめる処理を別に用意し、区切りは間にだけ入れ、引用符は規則どおりに逃がす
      case 'join-sql':
      case 'join-json':
      case 'join-csv': {
        const vals = out.map((l) => (ignoreSpace ? l.trim() : l)).filter((l) => l.trim() !== '')
        const allNumeric = vals.length > 0 && vals.every((v) => /^-?\d+(\.\d+)?$/.test(v.trim()))
        if (op === 'join-sql') {
          out = [`(${vals.map((v) => (allNumeric ? v.trim() : `'${v.replace(/'/g, "''")}'`)).join(', ')})`]
        } else if (op === 'join-json') {
          out = [JSON.stringify(allNumeric ? vals.map((v) => Number(v)) : vals)]
        } else {
          out = [vals.map((v) => (/[",\r\n]|^\s|\s$/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)).join(',')]
        }
        break
      }
      case 'remove-affix':
        out = out.map((l) => {
          let s = l
          if (prefix && s.startsWith(prefix)) s = s.slice(prefix.length)
          if (suffix && s.endsWith(suffix)) s = s.slice(0, s.length - suffix.length)
          return s
        })
        break
    }
    return out.join('\n')
  }, [lines, op, caseInsensitive, ignoreSpace, prefix, suffix, seed])

  const outLines = output === '' ? 0 : output.split('\n').length
  const removed = op.startsWith('join-') ? 0 : lines.length - outLines
  const needsAffix = op === 'affix' || op === 'remove-affix'
  const usesKey = ['sort-asc', 'sort-desc', 'dedupe', 'unique-only', 'duplicates-only'].includes(op)

  async function copy() {
    if (!output) return
    try {
      await navigator.clipboard.writeText(output)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* クリップボードが使えない環境では何もしない */
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* 操作の選択 */}
      <div className="flex flex-col gap-3">
        {OPS.map((g) => (
          <div key={g.group}>
            <p className="mb-1.5 font-mono text-[10px] uppercase tracking-widest text-muted">
              {g.group}
            </p>
            <div className="flex flex-wrap gap-2">
              {g.items.map((it) => (
                <button
                  key={it.id}
                  onClick={() => setOp(it.id)}
                  className={`rounded border px-2.5 py-1 text-xs transition-colors ${
                    op === it.id
                      ? 'border-teal bg-teal/10 text-teal'
                      : 'border-border bg-surface text-dim hover:border-teal/40'
                  }`}
                >
                  {it.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* オプション */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded border border-border bg-bg px-3 py-2">
        {usesKey && (
          <>
            <label className="flex items-center gap-1.5 text-xs text-dim">
              <input
                type="checkbox"
                checked={caseInsensitive}
                onChange={(e) => setCaseInsensitive(e.target.checked)}
                className="accent-teal"
              />
              大文字小文字を区別しない
            </label>
            <label className="flex items-center gap-1.5 text-xs text-dim">
              <input
                type="checkbox"
                checked={ignoreSpace}
                onChange={(e) => setIgnoreSpace(e.target.checked)}
                className="accent-teal"
              />
              前後の空白を無視
            </label>
          </>
        )}
        {op === 'shuffle' && (
          <label className="flex items-center gap-1.5 text-xs text-dim">
            シード
            <input
              type="number"
              value={seed}
              onChange={(e) => setSeed(Number(e.target.value) || 0)}
              className="w-20 rounded border border-border bg-surface px-2 py-1 text-xs text-primary"
            />
          </label>
        )}
        {needsAffix && (
          <>
            <label className="flex items-center gap-1.5 text-xs text-dim">
              接頭辞
              <input
                value={prefix}
                onChange={(e) => setPrefix(e.target.value)}
                placeholder="例: - "
                className="w-28 rounded border border-border bg-surface px-2 py-1 font-mono text-xs text-primary"
              />
            </label>
            <label className="flex items-center gap-1.5 text-xs text-dim">
              接尾辞
              <input
                value={suffix}
                onChange={(e) => setSuffix(e.target.value)}
                placeholder="例: ,"
                className="w-28 rounded border border-border bg-surface px-2 py-1 font-mono text-xs text-primary"
              />
            </label>
          </>
        )}
        {!usesKey && op !== 'shuffle' && !needsAffix && (
          <span className="text-xs text-muted">この操作に設定項目はありません</span>
        )}
      </div>

      {/* 入出力 */}
      <div className="grid grid-cols-1 overflow-hidden rounded-lg border border-border sm:grid-cols-2">
        <div className="flex flex-col border-b border-border sm:border-b-0 sm:border-r">
          <div className="flex items-center justify-between border-b border-border bg-surface px-3 py-2">
            <span className="font-mono text-[11px] uppercase tracking-widest text-muted">入力</span>
            <span className="font-mono text-[11px] text-dim">{lines.length} 行</span>
          </div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            spellCheck={false}
            placeholder={'1行ずつ貼り付けてください\napple\nbanana\napple'}
            className="h-72 w-full resize-none bg-bg p-3 font-mono text-sm text-primary outline-none"
          />
        </div>
        <div className="flex flex-col">
          <div className="flex items-center justify-between border-b border-border bg-surface px-3 py-2">
            <span className="font-mono text-[11px] uppercase tracking-widest text-muted">出力</span>
            <div className="flex items-center gap-3">
              <span className="font-mono text-[11px] text-dim">
                {outLines} 行
                {removed > 0 && <span className="text-teal"> （−{removed}）</span>}
              </span>
              <button
                onClick={copy}
                disabled={!output}
                className="rounded border border-border px-2 py-0.5 font-mono text-[11px] text-dim transition-colors hover:border-teal/50 hover:text-teal disabled:opacity-40"
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>
          <textarea
            value={output}
            readOnly
            spellCheck={false}
            className="h-72 w-full resize-none bg-bg p-3 font-mono text-sm text-primary outline-none"
          />
        </div>
      </div>
    </div>
  )
}
