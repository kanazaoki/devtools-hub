// セマンティックバージョニング 2.0.0 と npm の範囲指定（node-semver と同じ規則）。
// node-semver 7 と照合して確かめてある

export interface SemVer {
  major: number
  minor: number
  patch: number
  prerelease: (string | number)[]
  build: string[]
}

const NUM = '0|[1-9]\\d*'
const PRE_ID = `(?:${NUM}|\\d*[a-zA-Z-][0-9a-zA-Z-]*)`
const FULL = new RegExp(
  `^v?(${NUM})\\.(${NUM})\\.(${NUM})(?:-(${PRE_ID}(?:\\.${PRE_ID})*))?(?:\\+([0-9a-zA-Z-]+(?:\\.[0-9a-zA-Z-]+)*))?$`,
)

export function parse(raw: string): SemVer | null {
  const m = FULL.exec(raw.trim().replace(/^=/, ''))
  if (!m) return null
  return {
    major: Number(m[1]),
    minor: Number(m[2]),
    patch: Number(m[3]),
    prerelease: m[4] ? m[4].split('.').map((id) => (/^\d+$/.test(id) ? Number(id) : id)) : [],
    build: m[5] ? m[5].split('.') : [],
  }
}

export function format(v: SemVer): string {
  return `${v.major}.${v.minor}.${v.patch}${v.prerelease.length ? '-' + v.prerelease.join('.') : ''}`
}

// プレリリースは「.」で区切った識別子ごとに比べる。数字どうしは数値で、数字は英字より小さい。
// ⚠ 以前は文字列のまま比べていたので alpha.10 が alpha.2 より前になっていた
function comparePre(a: (string | number)[], b: (string | number)[]): number {
  if (!a.length && b.length) return 1
  if (a.length && !b.length) return -1
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const x = a[i]
    const y = b[i]
    if (x === undefined) return -1
    if (y === undefined) return 1
    if (x === y) continue
    const xn = typeof x === 'number'
    const yn = typeof y === 'number'
    if (xn && yn) return (x as number) < (y as number) ? -1 : 1
    if (xn) return -1
    if (yn) return 1
    return x < y ? -1 : 1
  }
  return 0
}

export function compare(a: SemVer, b: SemVer): number {
  if (a.major !== b.major) return a.major < b.major ? -1 : 1
  if (a.minor !== b.minor) return a.minor < b.minor ? -1 : 1
  if (a.patch !== b.patch) return a.patch < b.patch ? -1 : 1
  return comparePre(a.prerelease, b.prerelease)
}

// npm の semver.inc と同じ：プレリリースの版を上げると、まずそのプレリリースが外れる（1.2.3-beta → patch → 1.2.3）
export function inc(v: SemVer, type: 'major' | 'minor' | 'patch'): string {
  const pre = v.prerelease.length > 0
  if (type === 'major') {
    if (pre && v.minor === 0 && v.patch === 0) return `${v.major}.0.0`
    return `${v.major + 1}.0.0`
  }
  if (type === 'minor') {
    if (pre && v.patch === 0) return `${v.major}.${v.minor}.0`
    return `${v.major}.${v.minor + 1}.0`
  }
  if (pre) return `${v.major}.${v.minor}.${v.patch}`
  return `${v.major}.${v.minor}.${v.patch + 1}`
}

// ---- 範囲 ----

type Op = '<' | '<=' | '>' | '>=' | '='
interface Comparator { op: Op; v: SemVer }

const X = '[xX*]'
// 1 / 1.2 / 1.x / 1.2.* / * など、欠けた部分のある版
const PARTIAL = new RegExp(`^v?(${NUM}|${X})(?:\\.(${NUM}|${X})(?:\\.(${NUM}|${X})(?:-(${PRE_ID}(?:\\.${PRE_ID})*))?(?:\\+[0-9a-zA-Z.-]+)?)?)?$`)

interface Partial { M: number | null; m: number | null; p: number | null; pre: (string | number)[] }

function parsePartial(s: string): Partial | null {
  const r = PARTIAL.exec(s)
  if (!r) return null
  const n = (x: string | undefined) => (x === undefined || /^[xX*]$/.test(x) ? null : Number(x))
  const M = n(r[1])
  const m = M === null ? null : n(r[2])
  const p = m === null ? null : n(r[3])
  const pre = r[4] && p !== null ? r[4].split('.').map((id) => (/^\d+$/.test(id) ? Number(id) : id)) : []
  return { M, m, p, pre }
}

const ver = (M: number, m: number, p: number, pre: (string | number)[] = []): SemVer => ({ major: M, minor: m, patch: p, prerelease: pre, build: [] })
const ANY: Comparator[] = [{ op: '>=', v: ver(0, 0, 0) }]

// 1つの部品（^1.2.3・~1.2・>=1.0・1.x など）を比較子の並びにする
function expand(token: string): Comparator[] | null {
  const m = /^(\^|~>?|>=|<=|>|<|=)?\s*(.+)$/.exec(token)
  if (!m) return null
  const op = m[1] ?? ''
  const pv = parsePartial(m[2])
  if (!pv) return null
  const { M, m: mi, p, pre } = pv
  if (op === '^') {
    if (M === null) return ANY
    if (mi === null) return [{ op: '>=', v: ver(M, 0, 0) }, { op: '<', v: ver(M + 1, 0, 0, [0]) }]
    if (p === null) {
      return M > 0
        ? [{ op: '>=', v: ver(M, mi, 0) }, { op: '<', v: ver(M + 1, 0, 0, [0]) }]
        : [{ op: '>=', v: ver(0, mi, 0) }, { op: '<', v: ver(0, mi + 1, 0, [0]) }]
    }
    const lo: Comparator = { op: '>=', v: ver(M, mi, p, pre) }
    if (M > 0) return [lo, { op: '<', v: ver(M + 1, 0, 0, [0]) }]
    if (mi > 0) return [lo, { op: '<', v: ver(0, mi + 1, 0, [0]) }]
    return [lo, { op: '<', v: ver(0, 0, p + 1, [0]) }]
  }
  if (op === '~' || op === '~>') {
    if (M === null) return ANY
    if (mi === null) return [{ op: '>=', v: ver(M, 0, 0) }, { op: '<', v: ver(M + 1, 0, 0, [0]) }]
    return [{ op: '>=', v: ver(M, mi, p ?? 0, pre) }, { op: '<', v: ver(M, mi + 1, 0, [0]) }]
  }
  if (op === '' || op === '=') {
    if (M === null) return ANY
    if (mi === null) return [{ op: '>=', v: ver(M, 0, 0) }, { op: '<', v: ver(M + 1, 0, 0, [0]) }]
    if (p === null) return [{ op: '>=', v: ver(M, mi, 0) }, { op: '<', v: ver(M, mi + 1, 0, [0]) }]
    return [{ op: '=', v: ver(M, mi, p, pre) }]
  }
  // 比較演算子つき。欠けた部分は意味が通るように補う（>1.2 → >=1.3.0、<=1.2 → <1.3.0）
  if (M === null) return op === '<' || op === '>' ? [{ op: '<', v: ver(0, 0, 0, [0]) }] : ANY
  if (mi === null || p === null) {
    const lo = mi === null ? ver(M, 0, 0) : ver(M, mi, 0)
    const hi = mi === null ? ver(M + 1, 0, 0, [0]) : ver(M, mi + 1, 0, [0])
    if (op === '>') return [{ op: '>=', v: hi.prerelease.length ? ver(hi.major, hi.minor, hi.patch) : hi }]
    if (op === '>=') return [{ op: '>=', v: lo }]
    if (op === '<') return [{ op: '<', v: ver(lo.major, lo.minor, lo.patch, [0]) }]
    return [{ op: '<', v: hi }]
  }
  return [{ op: op as Op, v: ver(M, mi, p, pre) }]
}

function parseRangeSet(range: string): Comparator[][] | null {
  const sets: Comparator[][] = []
  for (const part of range.split('||')) {
    let s = part.trim()
    const comps: Comparator[] = []
    // ハイフンの範囲：1.2.3 - 2.3.4
    const hy = /^(\S+)\s+-\s+(\S+)$/.exec(s)
    if (hy) {
      const lo = parsePartial(hy[1])
      const hi = parsePartial(hy[2])
      if (!lo || !hi) return null
      comps.push({ op: '>=', v: ver(lo.M ?? 0, lo.m ?? 0, lo.p ?? 0, lo.pre) })
      if (hi.M !== null) {
        if (hi.m === null) comps.push({ op: '<', v: ver(hi.M + 1, 0, 0, [0]) })
        else if (hi.p === null) comps.push({ op: '<', v: ver(hi.M, hi.m + 1, 0, [0]) })
        else comps.push({ op: '<=', v: ver(hi.M, hi.m, hi.p, hi.pre) })
      }
      sets.push(comps)
      continue
    }
    // 演算子と版のあいだの空白を詰めてから、空白で分ける（空白区切りは「かつ」）
    s = s.replace(/(\^|~>?|>=|<=|>|<|=)\s+/g, '$1')
    if (s === '') { sets.push(ANY); continue }
    for (const tok of s.split(/\s+/)) {
      const c = expand(tok)
      if (!c) return null
      comps.push(...c)
    }
    sets.push(comps)
  }
  return sets
}

function test(c: Comparator, v: SemVer): boolean {
  const r = compare(v, c.v)
  switch (c.op) {
    case '<': return r < 0
    case '<=': return r <= 0
    case '>': return r > 0
    case '>=': return r >= 0
    case '=': return r === 0
  }
}

export interface RangeResult {
  valid: boolean
  satisfies: boolean
  /** 比較子として読んだ結果（>=1.2.3 <2.0.0-0 など） */
  normalized: string
  /** プレリリースだったために外れた */
  excludedPrerelease: boolean
}

// プレリリースの版は、同じ major.minor.patch のプレリリースが範囲に書かれているときだけ当たる（npm の規則）
export function satisfies(range: string, v: SemVer): RangeResult {
  const sets = parseRangeSet(range)
  if (!sets) return { valid: false, satisfies: false, normalized: '', excludedPrerelease: false }
  const normalized = sets.map((cs) => cs.map((c) => `${c.op === '=' ? '' : c.op}${format(c.v)}`).join(' ')).join(' || ')
  let excludedPrerelease = false
  for (const cs of sets) {
    if (!cs.every((c) => test(c, v))) continue
    if (v.prerelease.length) {
      const allowed = cs.some(
        (c) => c.v.prerelease.length && !(c.v.prerelease.length === 1 && c.v.prerelease[0] === 0) &&
          c.v.major === v.major && c.v.minor === v.minor && c.v.patch === v.patch,
      )
      if (!allowed) { excludedPrerelease = true; continue }
    }
    return { valid: true, satisfies: true, normalized, excludedPrerelease: false }
  }
  return { valid: true, satisfies: false, normalized, excludedPrerelease }
}
