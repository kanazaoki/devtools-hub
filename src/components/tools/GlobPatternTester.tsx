'use client'

import { useState, useMemo } from 'react'
import { checkIgnore, parseGitignore } from '@/lib/gitignore'

const DEFAULT_PATTERN = 'src/**/*.{ts,tsx}'
const DEFAULT_PATHS = `src/index.ts
src/app/page.tsx
src/components/Header.tsx
src/components/Footer.tsx
src/utils/helper.js
src/utils/format.ts
tests/setup.ts
README.md
package.json
dist/bundle.js`

function escapeRegex(s: string) {
  return s.replace(/[.+^${}()|[\]\\]/g, '\\$&')
}

function globToRegex(pattern: string): RegExp {
  let i = 0
  let re = '^'
  const len = pattern.length

  while (i < len) {
    const ch = pattern[i]

    if (ch === '\\' && i + 1 < len) {
      re += escapeRegex(pattern[++i])
    } else if (ch === '*') {
      if (pattern[i + 1] === '*') {
        i++
        if (pattern[i + 1] === '/') {
          // **/ は「0個以上のディレクトリ」。⚠ 以前は .* にしていたので a/**/b が a/xb にも当たっていた
          re += '(?:.*/)?'
          i++
        } else {
          re += '.*'
        }
      } else {
        // * matches anything except slash
        re += '[^/]*'
      }
    } else if (ch === '?') {
      re += '[^/]'
    } else if (ch === '{') {
      // brace expansion {a,b,c}
      const end = pattern.indexOf('}', i)
      if (end === -1) {
        re += escapeRegex(ch)
      } else {
        const inner = pattern.slice(i + 1, end)
        re += '(?:' + inner.split(',').map(s => escapeRegex(s.trim())).join('|') + ')'
        i = end
      }
    } else if (ch === '[') {
      // character class [abc] or [a-z]
      const end = pattern.indexOf(']', i)
      if (end === -1) {
        re += escapeRegex(ch)
      } else {
        // [!abc] は否定。正規表現では [^abc]
        const inner = pattern.slice(i + 1, end).replace(/^!/, '^').replace(/\\/g, '\\\\')
        re += '[' + inner + ']'
        i = end
      }
    } else {
      re += escapeRegex(ch)
    }
    i++
  }

  re += '$'
  try {
    return new RegExp(re)
  } catch {
    return /(?!)/  // never matches on invalid pattern
  }
}

function matchGlob(pattern: string, path: string): boolean {
  if (!pattern) return false
  try {
    const rx = globToRegex(pattern)
    return rx.test(path)
  } catch {
    return false
  }
}

const DEFAULT_GITIGNORE = `*.log
!important.log
logs/
!logs/keep.txt
data/*
!data/keep.csv
.env
.env.*
!.env.example`

const DEFAULT_GITIGNORE_PATHS = `app.log
src/server/debug.log
important.log
logs/keep.txt
data/keep.csv
data/raw.csv
.env.local
.env.example
config/.env.production
README.md`

type Mode = 'glob' | 'gitignore'

export function GlobPatternTester() {
  const [mode, setMode] = useState<Mode>('glob')
  const [pattern, setPattern] = useState(DEFAULT_PATTERN)
  const [paths, setPaths] = useState(DEFAULT_PATHS)
  const [ignoreText, setIgnoreText] = useState(DEFAULT_GITIGNORE)
  const [ignorePaths, setIgnorePaths] = useState(DEFAULT_GITIGNORE_PATHS)

  const currentPaths = mode === 'glob' ? paths : ignorePaths
  const setCurrentPaths = mode === 'glob' ? setPaths : setIgnorePaths

  const results = useMemo(() => {
    const lines = currentPaths.split('\n').map(l => l.trim()).filter(Boolean)
    if (mode === 'glob') return lines.map(p => ({ path: p, matched: matchGlob(pattern, p), note: '' }))
    const rules = parseGitignore(ignoreText)
    return lines.map(p => {
      const v = checkIgnore(rules, p)
      const note = v.rule
        ? `${v.rule.line}行目 ${v.rule.source}${v.viaParent ? ` ／ 親の ${v.viaParent} が除外されているため ! で戻せない` : ''}`
        : ''
      return { path: p, matched: v.ignored, note }
    })
  }, [mode, pattern, currentPaths, ignoreText])

  const matchCount = results.filter(r => r.matched).length

  return (
    <div className="flex flex-col gap-4">
      <div className="flex self-start rounded-md border border-border p-0.5">
        {([['glob', 'glob（ビルドツール・シェル）'], ['gitignore', '.gitignore（Git の規則）']] as [Mode, string][]).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setMode(key)}
            className={`rounded px-3 py-1 font-mono text-xs transition-colors ${mode === key ? 'bg-teal/15 text-teal' : 'text-muted hover:text-primary'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {mode === 'glob' ? (
        <div className="flex flex-col gap-1">
          <label className="text-xs font-mono font-semibold uppercase tracking-widest text-muted">
            Glob Pattern
          </label>
          <input
            type="text"
            value={pattern}
            onChange={e => setPattern(e.target.value)}
            placeholder="例: **/*.ts, src/**/*.{js,jsx}"
            className="w-full rounded-md border border-border bg-bg px-3 py-2 font-mono text-sm text-primary focus:border-teal focus:outline-none"
            spellCheck={false}
          />
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          <label className="text-xs font-mono font-semibold uppercase tracking-widest text-muted">
            .gitignore
          </label>
          <textarea
            value={ignoreText}
            onChange={e => setIgnoreText(e.target.value)}
            rows={8}
            spellCheck={false}
            className="w-full resize-y rounded-md border border-border bg-bg px-3 py-2 font-mono text-xs text-primary focus:border-teal focus:outline-none"
          />
          <p className="text-[11px] leading-relaxed text-muted">
            git check-ignore と同じ規則で判定します。スラッシュを含まないパターン（*.log）はどの階層にも当たり、
            除外したディレクトリの中のファイルは ! で戻せません。ディレクトリを調べるときはパスの末尾に / を付けてください。
          </p>
        </div>
      )}

      {/* Match count */}
      <div className="text-sm text-muted">
        <span className={matchCount > 0 ? 'text-teal font-semibold' : ''}>
          {mode === 'glob' ? `${matchCount} / ${results.length} paths matched` : `${matchCount} / ${results.length} 件が除外される`}
        </span>
      </div>

      {/* Side-by-side: paths input + results */}
      <div className="flex gap-3" style={{ minHeight: '320px' }}>
        {/* File paths input */}
        <div className="flex flex-col gap-1 flex-1" style={{ minWidth: 0 }}>
          <label className="text-xs font-mono font-semibold uppercase tracking-widest text-muted">
            File Paths
          </label>
          <textarea
            value={currentPaths}
            onChange={e => setCurrentPaths(e.target.value)}
            placeholder="テスト用ファイルパスを1行1パスで入力"
            className="flex-1 w-full rounded-md border border-border bg-bg px-3 py-2.5 font-mono text-xs text-primary focus:border-teal focus:outline-none resize-none"
            style={{ minHeight: '280px' }}
            spellCheck={false}
          />
        </div>

        {/* Match results */}
        <div className="flex flex-col gap-1 flex-1" style={{ minWidth: 0 }}>
          <label className="text-xs font-mono font-semibold uppercase tracking-widest text-muted">
            Results
          </label>
          <div
            className="flex-1 rounded-md border border-border bg-bg px-3 py-2.5 font-mono text-xs overflow-auto"
            style={{ minHeight: '280px' }}
          >
            {results.length === 0 ? (
              <span className="text-dim">パスを入力してください</span>
            ) : (
              results.map((r, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-2 py-0.5 ${r.matched ? 'text-teal' : 'text-dim'}`}
                >
                  <span className="w-3 flex-shrink-0">{r.matched ? '✓' : ' '}</span>
                  <span className={r.matched ? '' : 'opacity-50'}>{r.path}</span>
                  {r.note && <span className="ml-auto pl-2 text-[10px] text-muted">{r.note}</span>}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Syntax reference */}
      <div className="rounded-md border border-border bg-surface p-3">
        <div className="text-xs font-mono font-semibold uppercase tracking-widest text-muted mb-2">Pattern Syntax</div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs font-mono">
          {(mode === 'glob'
            ? [
                ['*', 'スラッシュ以外の任意文字列'],
                ['**/', '0個以上のディレクトリ'],
                ['?', '任意の1文字'],
                ['{js,ts}', 'ブレース展開（OR）'],
                ['[abc]', '文字クラス'],
                ['[!a-z]', '文字クラスの否定'],
              ]
            : [
                ['*.log', 'スラッシュなし＝どの階層の名前にも当たる'],
                ['/build', '先頭の / ＝ .gitignore と同じ階層だけ'],
                ['temp/', '末尾の / ＝ ディレクトリだけ'],
                ['a/**/b', '0個以上のディレクトリ'],
                ['!keep.txt', '除外の打ち消し（親が除外なら効かない）'],
                ['{a,b}', '使えない（文字どおりに扱われる）'],
              ]
          ).map(([sym, desc]) => (
            <div key={sym} className="flex gap-2">
              <span className="text-teal w-24 flex-shrink-0">{sym}</span>
              <span className="text-muted">{desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
