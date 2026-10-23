'use client'

import { useMemo, useRef, useState } from 'react'
import { diffLocks, type Bump, type LockDiff, type VersionChange } from '@/lib/lockfileDiff'

const MAX_BYTES = 20 * 1024 * 1024

const BUMP_META: Record<Bump, { label: string; color: string; border: string }> = {
  major: { label: 'メジャー', color: 'text-red-300', border: 'border-red-400/30 bg-red-400/10' },
  downgrade: { label: '下がった', color: 'text-amber-300', border: 'border-amber-400/30 bg-amber-400/10' },
  minor: { label: 'マイナー', color: 'text-blue-300', border: 'border-blue-400/30 bg-blue-400/10' },
  prerelease: { label: 'プレリリース', color: 'text-purple-300', border: 'border-purple-400/30 bg-purple-400/10' },
  patch: { label: 'パッチ', color: 'text-teal', border: 'border-teal/30 bg-teal/10' },
  other: { label: 'その他', color: 'text-dim', border: 'border-border bg-surface' },
}

type Scope = 'all' | 'prod' | 'dev'

function Pane({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [note, setNote] = useState<string | null>(null)

  const load = async (file: File) => {
    if (file.size > MAX_BYTES) {
      setNote('20MB を超えるファイルは読み込めません。')
      return
    }
    setNote(`${file.name}（${file.size.toLocaleString()} バイト）`)
    onChange(await file.text())
  }

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted">{label}</p>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="rounded border border-border px-2 py-0.5 font-mono text-[11px] text-dim transition-colors hover:border-teal/50 hover:text-teal"
        >
          ファイルを選ぶ
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) void load(f)
            e.target.value = ''
          }}
        />
      </div>
      <textarea
        value={value}
        onChange={(e) => {
          setNote(null)
          onChange(e.target.value)
        }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          const f = e.dataTransfer.files[0]
          if (f) {
            e.preventDefault()
            void load(f)
          }
        }}
        spellCheck={false}
        placeholder="package-lock.json の中身を貼り付け、またはファイルをドロップ"
        className="h-40 w-full resize-y rounded border border-border bg-[#070d1a] px-3 py-2 font-mono text-[11px] text-primary placeholder:text-border focus:border-teal/50 focus:outline-none"
      />
      {note && <p className="font-mono text-[10px] text-muted">{note}</p>}
    </div>
  )
}

function ChangeRow({ c }: { c: VersionChange }) {
  const meta = BUMP_META[c.zeroMinor ? 'major' : c.bump]
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-border/50 px-3 py-2 last:border-b-0">
      <span className={`shrink-0 rounded border px-1.5 py-0.5 font-mono text-[10px] ${meta.border} ${meta.color}`}>
        {meta.label}
        {c.zeroMinor ? '（0.x）' : ''}
      </span>
      <span className="min-w-0 break-all font-mono text-xs text-bright">{c.name}</span>
      <span className="font-mono text-xs tabular-nums text-dim">
        {c.from} <span className="text-border">→</span> <span className={meta.color}>{c.to}</span>
      </span>
      {c.dev && <span className="font-mono text-[10px] text-muted">開発</span>}
      {c.nested && <span className="w-full break-all font-mono text-[10px] text-border">{c.path}</span>}
    </li>
  )
}

export function LockfileDiff() {
  const [before, setBefore] = useState('')
  const [after, setAfter] = useState('')
  const [scope, setScope] = useState<Scope>('all')

  const state = useMemo<{ diff: LockDiff | null; error: string | null }>(() => {
    if (!before.trim() || !after.trim()) return { diff: null, error: null }
    try {
      return { diff: diffLocks(before, after), error: null }
    } catch (e) {
      return { diff: null, error: (e as Error).message }
    }
  }, [before, after])

  const { diff, error } = state
  const inScope = <T extends { dev: boolean }>(xs: T[]) =>
    scope === 'all' ? xs : xs.filter((x) => (scope === 'dev' ? x.dev : !x.dev))

  const changed = diff ? inScope(diff.changed) : []
  const added = diff ? inScope(diff.added) : []
  const removed = diff ? inScope(diff.removed) : []
  const count = (b: Bump) => changed.filter((c) => (c.zeroMinor ? 'major' : c.bump) === b).length

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-4 md:grid-cols-2">
        <Pane label="変更前" value={before} onChange={setBefore} />
        <Pane label="変更後" value={after} onChange={setAfter} />
      </div>

      <div className="rounded-lg border border-border bg-[#070d1a] px-4 py-3">
        <p className="font-mono text-[11px] leading-relaxed text-dim">
          直前のコミットのロックファイルは{' '}
          <code className="text-teal">git show HEAD:package-lock.json &gt; before.json</code>{' '}
          で取り出せます。更新の前にコミットしておくと、この比較がそのまま使えます。
          ファイルはブラウザ内だけで読み、どこにも送信しません。
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-400/30 bg-red-400/5 px-4 py-3">
          <p className="font-mono text-xs text-red-300">{error}</p>
        </div>
      )}

      {!diff ? (
        !error && (
          <div className="rounded-lg border border-border/50 bg-[#070d1a] px-4 py-10 text-center">
            <p className="font-mono text-xs text-border">
              変更前と変更後の package-lock.json を入れると、版が動いたパッケージが表示されます
            </p>
          </div>
        )
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            {(
              [
                ['all', 'すべて'],
                ['prod', '本番の依存'],
                ['dev', '開発の依存'],
              ] as [Scope, string][]
            ).map(([s, label]) => (
              <button
                key={s}
                type="button"
                onClick={() => setScope(s)}
                className={`rounded border px-2.5 py-1 font-mono text-[11px] transition-colors ${
                  scope === s ? 'border-teal/50 bg-teal/10 text-teal' : 'border-border text-dim hover:border-teal/30'
                }`}
              >
                {label}
              </button>
            ))}
            <span className="ml-auto font-mono text-[10px] text-muted">
              v{diff.before.lockfileVersion} {diff.before.count.toLocaleString()} 件 → v{diff.after.lockfileVersion}{' '}
              {diff.after.count.toLocaleString()} 件
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {(
              [
                ['版が変わった', changed.length, 'text-bright'],
                ['うちメジャー', count('major'), count('major') ? 'text-red-300' : 'text-border'],
                ['追加', added.length, added.length ? 'text-teal' : 'text-border'],
                ['削除', removed.length, removed.length ? 'text-amber-300' : 'text-border'],
              ] as [string, number, string][]
            ).map(([label, n, color]) => (
              <div key={label} className="rounded-lg border border-border bg-[#070d1a] px-4 py-3 text-center">
                <p className={`font-mono text-2xl font-bold tabular-nums leading-none ${color}`}>{n}</p>
                <p className="mt-1.5 font-mono text-[10px] text-muted">{label}</p>
              </div>
            ))}
          </div>

          {changed.length > 0 && (
            <p className="font-mono text-[11px] text-dim">
              {(['major', 'downgrade', 'minor', 'prerelease', 'patch', 'other'] as Bump[])
                .filter((b) => count(b) > 0)
                .map((b) => `${BUMP_META[b].label} ${count(b)}`)
                .join(' ／ ')}
            </p>
          )}

          {diff.specs.length > 0 && (
            <section>
              <h3 className="mb-2 font-mono text-[10px] uppercase tracking-widest text-muted">
                package.json の指定が変わったもの
              </h3>
              <ul className="rounded-lg border border-border bg-[#070d1a]">
                {diff.specs.map((s) => (
                  <li
                    key={`${s.field}:${s.name}`}
                    className="flex flex-wrap items-center gap-x-3 border-b border-border/50 px-3 py-2 last:border-b-0"
                  >
                    <span className="font-mono text-xs text-bright">{s.name}</span>
                    <span className="font-mono text-xs text-dim">
                      {s.from ?? '（なし）'} <span className="text-border">→</span>{' '}
                      <span className="text-teal">{s.to ?? '（削除）'}</span>
                    </span>
                    <span className="font-mono text-[10px] text-muted">{s.field}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section>
            <h3 className="mb-2 font-mono text-[10px] uppercase tracking-widest text-muted">版が変わったもの</h3>
            {changed.length ? (
              <ul className="rounded-lg border border-border bg-[#070d1a]">
                {changed.map((c) => (
                  <ChangeRow key={c.path} c={c} />
                ))}
              </ul>
            ) : (
              <p className="font-mono text-xs text-border">ありません</p>
            )}
          </section>

          {(added.length > 0 || removed.length > 0) && (
            <div className="grid gap-4 md:grid-cols-2">
              {(
                [
                  ['追加されたもの', added, 'text-teal'],
                  ['削除されたもの', removed, 'text-amber-300'],
                ] as [string, typeof added, string][]
              ).map(([title, xs, color]) => (
                <section key={title}>
                  <h3 className="mb-2 font-mono text-[10px] uppercase tracking-widest text-muted">
                    {title}（{xs.length}）
                  </h3>
                  {xs.length ? (
                    <ul className="max-h-72 overflow-y-auto rounded-lg border border-border bg-[#070d1a]">
                      {xs.map((x) => (
                        <li key={x.path} className="border-b border-border/50 px-3 py-1.5 last:border-b-0">
                          <span className={`break-all font-mono text-xs ${color}`}>{x.name}</span>{' '}
                          <span className="font-mono text-[11px] text-dim">{x.version}</span>
                          {x.dev && <span className="ml-2 font-mono text-[10px] text-muted">開発</span>}
                          {x.nested && <p className="break-all font-mono text-[10px] text-border">{x.path}</p>}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="font-mono text-xs text-border">ありません</p>
                  )}
                </section>
              ))}
            </div>
          )}

          {diff.hashOnly > 0 && (
            <p className="font-mono text-[11px] text-muted">
              版は同じで、取得元（resolved）かハッシュ（integrity）だけが変わったものが {diff.hashOnly} 件あります。
            </p>
          )}
        </>
      )}
    </div>
  )
}
