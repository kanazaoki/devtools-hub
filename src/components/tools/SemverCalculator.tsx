'use client'

import { useState, useMemo } from 'react'
import { compare, inc, parse, satisfies, type RangeResult, type SemVer } from '@/lib/semver'

// ⚠ 以前の自前実装は、プレリリースを文字列のまま比べて alpha.10 < alpha.2 としていた。
// また ^1.2.0 が 1.3.0-beta に当たる、1.2.3-beta の patch が 1.2.4 になる、
// 「>=1.2.0 <2.0.0」「||」「1.x」「1.2.3 - 2.0.0」が読めない、といった点が npm と違っていた。
// いまは src/lib/semver.ts（node-semver と照合済み）で計算する

interface SemverParts {
  v: SemVer | null
  major: number
  minor: number
  patch: number
  prerelease: string
  build: string
  valid: boolean
}

function parseSemver(raw: string): SemverParts {
  const v = parse(raw)
  if (!v) return { v: null, major: 0, minor: 0, patch: 0, prerelease: '', build: '', valid: false }
  return { v, major: v.major, minor: v.minor, patch: v.patch, prerelease: v.prerelease.join('.'), build: v.build.join('.'), valid: true }
}

function bump(p: SemverParts, type: 'major' | 'minor' | 'patch'): string {
  return p.v ? inc(p.v, type) : ''
}

function compareSemver(a: SemverParts, b: SemverParts): number {
  return a.v && b.v ? compare(a.v, b.v) : 0
}

function satisfiesRange(range: string, p: SemverParts): RangeResult | null {
  if (!p.v) return null
  const r = satisfies(range, p.v)
  return r.valid ? r : null
}

export function SemverCalculator() {
  const [versionA, setVersionA] = useState('1.2.3')
  const [versionB, setVersionB] = useState('1.3.0')
  const [rangeInput, setRangeInput] = useState('^1.2.0')
  const [rangeVersion, setRangeVersion] = useState('1.2.5')

  const a = useMemo(() => parseSemver(versionA), [versionA])
  const b = useMemo(() => parseSemver(versionB), [versionB])
  const cmp = useMemo(() => (a.valid && b.valid ? compareSemver(a, b) : null), [a, b])
  const rv = useMemo(() => parseSemver(rangeVersion), [rangeVersion])
  const rangeResult = useMemo(() => satisfiesRange(rangeInput, rv), [rangeInput, rv])

  const bumpColors: Record<string, string> = {
    patch: 'text-teal border-teal/20 bg-teal/5',
    minor: 'text-yellow-400 border-yellow-500/20 bg-yellow-500/5',
    major: 'text-red-400 border-red-500/20 bg-red-500/5',
  }

  const BumpResult = ({ label, result }: { label: string; result: string }) => (
    <div className={`flex items-center gap-3 rounded border px-3 py-2 ${bumpColors[label] ?? 'border-border bg-surface'}`}>
      <span className={`w-12 shrink-0 text-center font-mono text-xs font-semibold`}>{label}</span>
      <span className="font-mono text-xs text-muted">→</span>
      <span className="font-mono text-sm font-bold">{result || '—'}</span>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Version Parser */}
      <section>
        <h3 className="mb-3 font-mono text-xs uppercase tracking-widest text-muted">バージョン解析 & バンプ</h3>
        <div className="flex items-center gap-2">
          <input
            value={versionA}
            onChange={e => setVersionA(e.target.value)}
            placeholder="1.2.3"
            className="w-40 rounded border border-border bg-bg px-3 py-2 font-mono text-sm text-primary placeholder:text-muted focus:border-teal/50 focus:outline-none"
          />
          {a.valid ? (
            <span className="text-xs text-teal">✓ valid</span>
          ) : versionA ? (
            <span className="text-xs text-red-400">⚠ invalid semver</span>
          ) : null}
        </div>

        {a.valid && (
          <div className="mt-3 space-y-3">
            {/* Parts breakdown */}
            <div className="flex flex-wrap gap-2">
              {[
                { label: 'major', value: String(a.major), color: 'text-red-400' },
                { label: 'minor', value: String(a.minor), color: 'text-yellow-400' },
                { label: 'patch', value: String(a.patch), color: 'text-teal' },
                ...(a.prerelease ? [{ label: 'pre', value: a.prerelease, color: 'text-purple-400' }] : []),
                ...(a.build ? [{ label: 'build', value: a.build, color: 'text-blue-400' }] : []),
              ].map(({ label, value, color }) => (
                <div key={label} className="flex flex-col items-center rounded border border-border bg-surface px-3 py-2 min-w-[4rem]">
                  <span className="font-mono text-xs text-muted">{label}</span>
                  <span className={`font-mono text-lg font-bold ${color}`}>{value}</span>
                </div>
              ))}
            </div>

            {/* Bump results */}
            <div className="space-y-1.5">
              <BumpResult label="patch" result={bump(a, 'patch')} />
              <BumpResult label="minor" result={bump(a, 'minor')} />
              <BumpResult label="major" result={bump(a, 'major')} />
            </div>
          </div>
        )}
      </section>

      <hr className="border-border" />

      {/* Compare */}
      <section>
        <h3 className="mb-3 font-mono text-xs uppercase tracking-widest text-muted">バージョン比較</h3>
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={versionA}
            onChange={e => setVersionA(e.target.value)}
            placeholder="1.2.3"
            className="w-32 rounded border border-border bg-bg px-3 py-2 font-mono text-sm text-primary focus:border-teal/50 focus:outline-none"
          />
          <div className={`flex h-9 w-9 items-center justify-center rounded border font-mono text-base font-bold transition-colors ${
            cmp === null
              ? 'border-border text-muted'
              : cmp > 0
              ? 'border-teal/40 bg-teal/10 text-teal'
              : cmp < 0
              ? 'border-red-500/40 bg-red-950/30 text-red-400'
              : 'border-yellow-500/40 bg-yellow-500/10 text-yellow-400'
          }`}>
            {cmp === null ? 'vs' : cmp > 0 ? '>' : cmp < 0 ? '<' : '='}
          </div>
          <input
            value={versionB}
            onChange={e => setVersionB(e.target.value)}
            placeholder="1.3.0"
            className="w-32 rounded border border-border bg-bg px-3 py-2 font-mono text-sm text-primary focus:border-teal/50 focus:outline-none"
          />
        </div>
        {cmp !== null && (
          <p className="mt-2 text-sm text-dim">
            <span className="font-mono text-primary">{versionA}</span>
            {' は '}
            <span className="font-mono text-primary">{versionB}</span>
            {' より '}
            <span className={`font-semibold ${cmp > 0 ? 'text-teal' : cmp < 0 ? 'text-red-400' : 'text-yellow-400'}`}>
              {cmp > 0 ? '新しい' : cmp < 0 ? '古い' : '同じバージョン'}
            </span>
            {cmp !== 0 && 'です'}
          </p>
        )}
      </section>

      <hr className="border-border" />

      {/* Range check */}
      <section>
        <h3 className="mb-3 font-mono text-xs uppercase tracking-widest text-muted">バージョン範囲チェック</h3>
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={rangeVersion}
            onChange={e => setRangeVersion(e.target.value)}
            placeholder="1.2.5"
            className="w-32 rounded border border-border bg-bg px-3 py-2 font-mono text-sm text-primary focus:border-teal/50 focus:outline-none"
          />
          <span className="text-sm text-muted">が</span>
          <input
            value={rangeInput}
            onChange={e => setRangeInput(e.target.value)}
            placeholder="^1.2.0"
            className="w-56rounded border border-border bg-bg px-3 py-2 font-mono text-sm text-primary focus:border-teal/50 focus:outline-none"
          />
          <span className="text-sm text-muted">の範囲内か</span>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {['^1.2.0', '~1.2.0', '>=1.2.0 <2.0.0', '1.x', '1.2.3 - 2.0.0', '^1.0.0 || ^2.0.0', '*'].map(preset => (
            <button key={preset} onClick={() => setRangeInput(preset)}
              className={`rounded border px-2 py-0.5 font-mono text-xs transition-colors ${
                rangeInput === preset
                  ? 'border-teal/50 bg-teal/10 text-teal'
                  : 'border-border text-muted hover:border-teal/40 hover:text-teal'
              }`}>
              {preset}
            </button>
          ))}
        </div>
        {rangeResult !== null && (
          <>
            <div className={`mt-3 flex items-center gap-2 rounded border px-4 py-3 ${
              rangeResult.satisfies
                ? 'border-teal/40 bg-teal/10 text-teal'
                : 'border-red-800/50 bg-red-950/30 text-red-400'
            }`}>
              <span className="text-lg">{rangeResult.satisfies ? '✓' : '✗'}</span>
              <span className="font-mono text-sm">
                {rangeVersion} は <strong>{rangeInput || '*'}</strong> の範囲に
                {rangeResult.satisfies ? '含まれます' : '含まれません'}
              </span>
            </div>
            <p className="mt-2 font-mono text-xs text-muted">
              読み替え：<span className="text-primary">{rangeResult.normalized}</span>
            </p>
            {rangeResult.excludedPrerelease && (
              <p className="mt-1 text-xs text-amber-300">
                数値の上では範囲内ですが、プレリリース版です。npm の範囲指定は、同じ major.minor.patch のプレリリースが範囲に書かれているときだけプレリリース版に当てはまります（例：^1.2.3-beta.0 なら 1.2.3-beta.2 は含まれる）。
              </p>
            )}
          </>
        )}
        {rangeResult === null && rangeVersion && (
          <p className="mt-2 text-xs text-red-400">⚠ 無効なバージョンまたは範囲指定です</p>
        )}
      </section>
    </div>
  )
}
