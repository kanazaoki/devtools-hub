'use client'

import { useState, useMemo } from 'react'

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
        // ** matches anything including slashes
        re += '.*'
        i++
        // skip trailing /
        if (pattern[i + 1] === '/') i++
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
        const inner = pattern.slice(i + 1, end)
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

export function GlobPatternTester() {
  const [pattern, setPattern] = useState(DEFAULT_PATTERN)
  const [paths, setPaths] = useState(DEFAULT_PATHS)

  const results = useMemo(() => {
    const lines = paths.split('\n').map(l => l.trim()).filter(Boolean)
    return lines.map(p => ({ path: p, matched: matchGlob(pattern, p) }))
  }, [pattern, paths])

  const matchCount = results.filter(r => r.matched).length

  return (
    <div className="flex flex-col gap-4">
      {/* Pattern input */}
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

      {/* Match count */}
      <div className="text-sm text-muted">
        <span className={matchCount > 0 ? 'text-teal font-semibold' : ''}>
          {matchCount} / {results.length} paths matched
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
            value={paths}
            onChange={e => setPaths(e.target.value)}
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
          {[
            ['*', 'スラッシュ以外の任意文字列'],
            ['**', 'スラッシュを含む任意文字列'],
            ['?', '任意の1文字'],
            ['{js,ts}', 'ブレース展開（OR）'],
            ['[abc]', '文字クラス'],
            ['[a-z]', '文字範囲'],
          ].map(([sym, desc]) => (
            <div key={sym} className="flex gap-2">
              <span className="text-teal w-20 flex-shrink-0">{sym}</span>
              <span className="text-muted">{desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
