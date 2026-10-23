// package-lock.json を2つ比べて、どのパッケージの版がどう動いたかを出す。
//
// JSON の差分としてそのまま比べると、版が1つ動くたびに resolved と integrity
// も変わるため、変更の大半がハッシュになって読めない（2026-10-22 の実際の
// 更新では、版が動いた7本に対して変わった欄は22個あった）。
// ここでは版・追加・削除だけを拾い、ハッシュの変化は件数だけ数える。

export type Bump = 'major' | 'minor' | 'patch' | 'prerelease' | 'downgrade' | 'other'

export interface LockEntry {
  path: string
  name: string
  version: string
  dev: boolean
  optional: boolean
  nested: boolean
}

export interface VersionChange {
  path: string
  name: string
  from: string
  to: string
  bump: Bump
  /** 0.x のマイナー更新。semver の上では破壊的変更にあたる */
  zeroMinor: boolean
  dev: boolean
  nested: boolean
}

export interface SpecChange {
  name: string
  field: 'dependencies' | 'devDependencies' | 'optionalDependencies' | 'peerDependencies' | 'overrides'
  from: string | null
  to: string | null
}

export interface LockDiff {
  changed: VersionChange[]
  added: LockEntry[]
  removed: LockEntry[]
  /** 版は同じで resolved / integrity だけが変わったもの */
  hashOnly: number
  specs: SpecChange[]
  before: { lockfileVersion: number; count: number }
  after: { lockfileVersion: number; count: number }
}

interface RawPkg {
  version?: string
  resolved?: string
  integrity?: string
  dev?: boolean
  optional?: boolean
  devOptional?: boolean
  link?: boolean
  dependencies?: Record<string, RawPkg | string>
}

interface ParsedLock {
  lockfileVersion: number
  entries: Map<string, LockEntry & { resolved?: string; integrity?: string }>
  root: Record<string, unknown>
}

const nameFromPath = (path: string) => {
  const i = path.lastIndexOf('node_modules/')
  return i < 0 ? path : path.slice(i + 'node_modules/'.length)
}

export function parseLock(text: string): ParsedLock {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error('JSONとして読めません。package-lock.json の中身をそのまま貼り付けてください。')
  }
  if (!data || typeof data !== 'object') throw new Error('package-lock.json ではないようです。')
  const d = data as { lockfileVersion?: number; packages?: Record<string, RawPkg>; dependencies?: Record<string, RawPkg> }
  const entries: ParsedLock['entries'] = new Map()
  let root: Record<string, unknown> = {}

  if (d.packages && typeof d.packages === 'object') {
    // lockfileVersion 2 / 3：node_modules のパスがそのままキーになっている
    for (const [path, p] of Object.entries(d.packages)) {
      if (path === '') {
        root = p as Record<string, unknown>
        continue
      }
      if (!path.includes('node_modules/') || p.link || !p.version) continue
      entries.set(path, {
        path,
        name: nameFromPath(path),
        version: p.version,
        dev: p.dev === true,
        optional: p.optional === true || p.devOptional === true,
        nested: path.split('node_modules/').length > 2,
        resolved: p.resolved,
        integrity: p.integrity,
      })
    }
  } else if (d.dependencies && typeof d.dependencies === 'object') {
    // lockfileVersion 1：入れ子の dependencies を node_modules のパスに直して並べる
    const walk = (deps: Record<string, RawPkg | string>, prefix: string) => {
      for (const [name, p] of Object.entries(deps)) {
        if (typeof p !== 'object' || !p.version) continue
        const path = `${prefix}node_modules/${name}`
        entries.set(path, {
          path,
          name,
          version: p.version,
          dev: p.dev === true,
          optional: p.optional === true,
          nested: prefix !== '',
          resolved: p.resolved,
          integrity: p.integrity,
        })
        if (p.dependencies) walk(p.dependencies, `${path}/`)
      }
    }
    walk(d.dependencies, '')
  } else {
    throw new Error('package-lock.json ではないようです（packages も dependencies もありません）。')
  }
  return { lockfileVersion: d.lockfileVersion ?? 1, entries, root }
}

const SEMVER = /^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/

export function classify(from: string, to: string): { bump: Bump; zeroMinor: boolean } {
  const a = SEMVER.exec(from)
  const b = SEMVER.exec(to)
  if (!a || !b) return { bump: 'other', zeroMinor: false }
  const [, aM, am, ap, apre] = a
  const [, bM, bm, bp, bpre] = b
  const na = [+aM, +am, +ap]
  const nb = [+bM, +bm, +bp]
  for (let i = 0; i < 3; i++) {
    if (nb[i] < na[i]) return { bump: 'downgrade', zeroMinor: false }
    if (nb[i] > na[i]) {
      const bump: Bump = i === 0 ? 'major' : i === 1 ? 'minor' : 'patch'
      return { bump, zeroMinor: bump === 'minor' && na[0] === 0 }
    }
  }
  if ((apre ?? '') !== (bpre ?? '')) return { bump: 'prerelease', zeroMinor: false }
  return { bump: 'other', zeroMinor: false }
}

const SPEC_FIELDS: SpecChange['field'][] = [
  'dependencies',
  'devDependencies',
  'optionalDependencies',
  'peerDependencies',
  'overrides',
]

function specDiff(a: Record<string, unknown>, b: Record<string, unknown>): SpecChange[] {
  const out: SpecChange[] = []
  for (const field of SPEC_FIELDS) {
    const fa = (a[field] ?? {}) as Record<string, unknown>
    const fb = (b[field] ?? {}) as Record<string, unknown>
    for (const name of new Set([...Object.keys(fa), ...Object.keys(fb)])) {
      const va = name in fa ? JSON.stringify(fa[name]).replace(/^"|"$/g, '') : null
      const vb = name in fb ? JSON.stringify(fb[name]).replace(/^"|"$/g, '') : null
      if (va !== vb) out.push({ name, field, from: va, to: vb })
    }
  }
  return out
}

const BUMP_ORDER: Record<Bump, number> = { major: 0, downgrade: 1, minor: 2, prerelease: 3, patch: 4, other: 5 }

export function diffLocks(beforeText: string, afterText: string): LockDiff {
  const a = parseLock(beforeText)
  const b = parseLock(afterText)
  const changed: VersionChange[] = []
  const added: LockEntry[] = []
  const removed: LockEntry[] = []
  let hashOnly = 0

  for (const [path, nb] of b.entries) {
    const na = a.entries.get(path)
    if (!na) {
      added.push(nb)
      continue
    }
    if (na.version !== nb.version) {
      const { bump, zeroMinor } = classify(na.version, nb.version)
      changed.push({ path, name: nb.name, from: na.version, to: nb.version, bump, zeroMinor, dev: nb.dev, nested: nb.nested })
    } else if (na.resolved !== nb.resolved || na.integrity !== nb.integrity) {
      hashOnly++
    }
  }
  for (const [path, na] of a.entries) if (!b.entries.has(path)) removed.push(na)

  const rank = (c: VersionChange) => BUMP_ORDER[c.zeroMinor ? 'major' : c.bump]
  changed.sort((x, y) => Number(x.dev) - Number(y.dev) || rank(x) - rank(y) || x.name.localeCompare(y.name))
  const byName = (x: LockEntry, y: LockEntry) => Number(x.dev) - Number(y.dev) || x.name.localeCompare(y.name)
  added.sort(byName)
  removed.sort(byName)

  return {
    changed,
    added,
    removed,
    hashOnly,
    specs: specDiff(a.root, b.root),
    before: { lockfileVersion: a.lockfileVersion, count: a.entries.size },
    after: { lockfileVersion: b.lockfileVersion, count: b.entries.size },
  }
}
