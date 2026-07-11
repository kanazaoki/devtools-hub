'use client'
import { useState } from 'react'

type DirectiveKey =
  | 'public' | 'private' | 'no-cache' | 'no-store' | 'must-revalidate'
  | 'proxy-revalidate' | 'immutable' | 'no-transform'

const DIRECTIVES: { key: DirectiveKey; label: string; desc: string; group: string }[] = [
  { key: 'public', label: 'public', desc: 'CDN・プロキシキャッシュを許可', group: 'スコープ' },
  { key: 'private', label: 'private', desc: '個人キャッシュのみ（CDN不可）', group: 'スコープ' },
  { key: 'no-cache', label: 'no-cache', desc: '再検証なしに使用不可（キャッシュ自体は保存）', group: '検証' },
  { key: 'no-store', label: 'no-store', desc: 'キャッシュ禁止（保存しない）', group: '検証' },
  { key: 'must-revalidate', label: 'must-revalidate', desc: '期限切れ後は必ず再検証', group: '検証' },
  { key: 'proxy-revalidate', label: 'proxy-revalidate', desc: '共有キャッシュに must-revalidate を適用', group: '検証' },
  { key: 'immutable', label: 'immutable', desc: '期限内は再検証不要（コンテンツ不変）', group: '最適化' },
  { key: 'no-transform', label: 'no-transform', desc: 'プロキシによる圧縮・変換を禁止', group: '最適化' },
]

const VARY_OPTIONS = ['Accept', 'Accept-Encoding', 'Accept-Language', 'Authorization', 'Origin', 'Cookie']

interface State {
  directives: Set<DirectiveKey>
  maxAge: string
  sMaxAge: string
  staleWhileRevalidate: string
  staleIfError: string
  etagEnabled: boolean
  etagType: 'strong' | 'weak'
  etagValue: string
  vary: string[]
}

const DEFAULT: State = {
  directives: new Set<DirectiveKey>(['public']),
  maxAge: '3600',
  sMaxAge: '',
  staleWhileRevalidate: '',
  staleIfError: '',
  etagEnabled: false,
  etagType: 'strong',
  etagValue: 'abc123',
  vary: ['Accept-Encoding'],
}

function buildCacheControl(s: State): string {
  const parts: string[] = []
  for (const d of s.directives) parts.push(d)
  if (s.maxAge) parts.push(`max-age=${s.maxAge}`)
  if (s.sMaxAge) parts.push(`s-maxage=${s.sMaxAge}`)
  if (s.staleWhileRevalidate) parts.push(`stale-while-revalidate=${s.staleWhileRevalidate}`)
  if (s.staleIfError) parts.push(`stale-if-error=${s.staleIfError}`)
  return parts.join(', ')
}

function buildHeaders(s: State): { name: string; value: string }[] {
  const h: { name: string; value: string }[] = []
  const cc = buildCacheControl(s)
  if (cc) h.push({ name: 'Cache-Control', value: cc })
  if (s.vary.length > 0) h.push({ name: 'Vary', value: s.vary.join(', ') })
  if (s.etagEnabled && s.etagValue) {
    const etag = s.etagType === 'weak' ? `W/"${s.etagValue}"` : `"${s.etagValue}"`
    h.push({ name: 'ETag', value: etag })
  }
  return h
}

function explain(s: State): string[] {
  const lines: string[] = []
  if (s.directives.has('no-store')) {
    lines.push('⚠ no-store: レスポンスはいかなるキャッシュにも保存されません。')
    return lines
  }
  if (s.directives.has('public')) lines.push('✓ CDN・プロキシが応答をキャッシュできます。')
  if (s.directives.has('private')) lines.push('✓ ブラウザのみキャッシュ可（CDN・プロキシは保存不可）。')
  if (s.maxAge) lines.push(`✓ ${s.maxAge} 秒間はキャッシュが新鮮とみなされます（${Math.floor(Number(s.maxAge) / 3600)}時間${Math.floor((Number(s.maxAge) % 3600) / 60)}分）。`)
  if (s.sMaxAge) lines.push(`✓ CDN向けのキャッシュ時間は ${s.sMaxAge} 秒です。`)
  if (s.staleWhileRevalidate) lines.push(`✓ 期限切れ後 ${s.staleWhileRevalidate} 秒間はバックグラウンドで再検証しながら古いキャッシュを返します。`)
  if (s.staleIfError) lines.push(`✓ オリジン障害時は ${s.staleIfError} 秒間古いキャッシュをフォールバックとして返します。`)
  if (s.directives.has('no-cache')) lines.push('✓ キャッシュは保存しますが、毎回オリジンに再検証します。')
  if (s.directives.has('must-revalidate')) lines.push('✓ 期限切れ後はオリジンへの再検証が必須です。')
  if (s.directives.has('immutable')) lines.push('✓ キャッシュ期限内は再検証リクエストを送らない（不変コンテンツ向け）。')
  if (s.etagEnabled) lines.push(`✓ ETag: ${s.etagType === 'weak' ? '弱い（W/"..."）' : '強い（"..."）'}検証子が付与されます。`)
  if (s.vary.length > 0) lines.push(`✓ Vary: ${s.vary.join(', ')} に基づいてキャッシュが分割されます。`)
  return lines
}

export function HttpCacheBuilder() {
  const [s, setS] = useState<State>(DEFAULT)
  const [copied, setCopied] = useState('')

  const toggleDir = (k: DirectiveKey) => {
    setS((prev) => {
      const next = new Set(prev.directives)
      if (next.has(k)) next.delete(k); else next.add(k)
      // public/private exclusive
      if (k === 'public') next.delete('private')
      if (k === 'private') next.delete('public')
      return { ...prev, directives: next }
    })
  }

  const toggleVary = (v: string) => {
    setS((prev) => ({
      ...prev,
      vary: prev.vary.includes(v) ? prev.vary.filter((x) => x !== v) : [...prev.vary, v],
    }))
  }

  const headers = buildHeaders(s)
  const explanations = explain(s)

  const copyHeader = (name: string, value: string) => {
    navigator.clipboard.writeText(`${name}: ${value}`)
    setCopied(name)
    setTimeout(() => setCopied(''), 1500)
  }

  const copyAll = () => {
    navigator.clipboard.writeText(headers.map((h) => `${h.name}: ${h.value}`).join('\n'))
    setCopied('all')
    setTimeout(() => setCopied(''), 1500)
  }

  const groups = [...new Set(DIRECTIVES.map((d) => d.group))]

  return (
    <div className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        {/* Left: controls */}
        <div className="space-y-4">
          {/* Directives */}
          {groups.map((group) => (
            <div key={group}>
              <p className="mb-1.5 font-mono text-xs text-muted">{group}</p>
              <div className="flex flex-wrap gap-2">
                {DIRECTIVES.filter((d) => d.group === group).map((d) => (
                  <button
                    key={d.key}
                    title={d.desc}
                    onClick={() => toggleDir(d.key)}
                    className={`rounded border px-2.5 py-1 font-mono text-xs transition-colors ${
                      s.directives.has(d.key)
                        ? 'border-teal bg-teal/10 text-teal'
                        : 'border-border text-dim hover:text-primary'
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
          ))}

          {/* max-age, s-maxage */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block font-mono text-xs text-muted">max-age (秒)</label>
              <input
                type="number"
                value={s.maxAge}
                onChange={(e) => setS((p) => ({ ...p, maxAge: e.target.value }))}
                className="w-full rounded border border-border bg-canvas px-2 py-1.5 font-mono text-sm text-primary focus:border-teal focus:outline-none"
                placeholder="3600"
              />
            </div>
            <div>
              <label className="mb-1 block font-mono text-xs text-muted">s-maxage (秒)</label>
              <input
                type="number"
                value={s.sMaxAge}
                onChange={(e) => setS((p) => ({ ...p, sMaxAge: e.target.value }))}
                className="w-full rounded border border-border bg-canvas px-2 py-1.5 font-mono text-sm text-primary focus:border-teal focus:outline-none"
                placeholder="86400"
              />
            </div>
            <div>
              <label className="mb-1 block font-mono text-xs text-muted">stale-while-revalidate</label>
              <input
                type="number"
                value={s.staleWhileRevalidate}
                onChange={(e) => setS((p) => ({ ...p, staleWhileRevalidate: e.target.value }))}
                className="w-full rounded border border-border bg-canvas px-2 py-1.5 font-mono text-sm text-primary focus:border-teal focus:outline-none"
                placeholder="60"
              />
            </div>
            <div>
              <label className="mb-1 block font-mono text-xs text-muted">stale-if-error</label>
              <input
                type="number"
                value={s.staleIfError}
                onChange={(e) => setS((p) => ({ ...p, staleIfError: e.target.value }))}
                className="w-full rounded border border-border bg-canvas px-2 py-1.5 font-mono text-sm text-primary focus:border-teal focus:outline-none"
                placeholder="3600"
              />
            </div>
          </div>

          {/* ETag */}
          <div>
            <div className="mb-1.5 flex items-center gap-2">
              <input
                type="checkbox"
                id="etag-en"
                checked={s.etagEnabled}
                onChange={(e) => setS((p) => ({ ...p, etagEnabled: e.target.checked }))}
                className="accent-teal"
              />
              <label htmlFor="etag-en" className="font-mono text-xs text-muted">ETag を追加</label>
            </div>
            {s.etagEnabled && (
              <div className="flex gap-2">
                <select
                  value={s.etagType}
                  onChange={(e) => setS((p) => ({ ...p, etagType: e.target.value as 'strong' | 'weak' }))}
                  className="rounded border border-border bg-canvas px-2 py-1.5 font-mono text-xs text-primary focus:border-teal focus:outline-none"
                >
                  <option value="strong">Strong</option>
                  <option value="weak">Weak (W/)</option>
                </select>
                <input
                  value={s.etagValue}
                  onChange={(e) => setS((p) => ({ ...p, etagValue: e.target.value }))}
                  className="flex-1 rounded border border-border bg-canvas px-2 py-1.5 font-mono text-xs text-primary focus:border-teal focus:outline-none"
                  placeholder="abc123"
                />
              </div>
            )}
          </div>

          {/* Vary */}
          <div>
            <p className="mb-1.5 font-mono text-xs text-muted">Vary</p>
            <div className="flex flex-wrap gap-2">
              {VARY_OPTIONS.map((v) => (
                <button
                  key={v}
                  onClick={() => toggleVary(v)}
                  className={`rounded border px-2.5 py-1 font-mono text-xs transition-colors ${
                    s.vary.includes(v)
                      ? 'border-violet-400 bg-violet-400/10 text-violet-400'
                      : 'border-border text-dim hover:text-primary'
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right: output */}
        <div className="space-y-4">
          <div className="rounded border border-border bg-canvas p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="font-mono text-xs text-muted">生成されたヘッダー</p>
              {headers.length > 0 && (
                <button
                  onClick={copyAll}
                  className="rounded border border-border px-2 py-0.5 text-xs text-dim hover:text-primary transition-colors"
                >
                  {copied === 'all' ? 'コピー済み' : '全コピー'}
                </button>
              )}
            </div>
            {headers.length === 0 ? (
              <p className="text-xs text-muted">ディレクティブを選択してください</p>
            ) : (
              <div className="space-y-2">
                {headers.map((h) => (
                  <div key={h.name} className="group relative">
                    <p className="font-mono text-xs text-muted">{h.name}:</p>
                    <p className="break-all font-mono text-sm text-primary">{h.value}</p>
                    <button
                      onClick={() => copyHeader(h.name, h.value)}
                      className="absolute right-0 top-0 rounded border border-border bg-surface px-2 py-0.5 text-xs text-dim opacity-0 transition-opacity group-hover:opacity-100 hover:text-primary"
                    >
                      {copied === h.name ? '済' : 'コピー'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded border border-border bg-surface p-4">
            <p className="mb-2 font-mono text-xs text-muted">解説</p>
            {explanations.length === 0 ? (
              <p className="text-xs text-muted">設定を選択すると解説が表示されます</p>
            ) : (
              <ul className="space-y-1.5">
                {explanations.map((line, i) => (
                  <li key={i} className="text-xs leading-relaxed text-primary">{line}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
