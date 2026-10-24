// .gitignore の判定を Git と同じ規則で行う（git check-ignore -v 相当）。
// 規則の出典は gitignore(5)。glob の一般的な規則とは次の点が違う：
// - スラッシュを含まないパターンは、どの階層の名前にも当たる（*.log は logs/a.log にも当たる）
// - 先頭か途中にスラッシュがあると、.gitignore の場所からの相対パスとして当たる
// - 末尾のスラッシュはディレクトリだけに当たる
// - ! で打ち消せるが、親ディレクトリが除外されていると中のファイルは戻せない

export interface IgnoreRule {
  line: number
  source: string
  negate: boolean
  dirOnly: boolean
  anchored: boolean
  regex: RegExp
}

export interface IgnoreVerdict {
  ignored: boolean
  /** 判定を決めた行（無ければ null）。親ディレクトリで決まった場合はその行 */
  rule: IgnoreRule | null
  /** 親ディレクトリが除外されていたために、! で戻せなかった */
  viaParent: string | null
}

function classToRegex(body: string): string {
  let neg = false
  if (body.startsWith('!') || body.startsWith('^')) { neg = true; body = body.slice(1) }
  const escaped = body.replace(/\\/g, '\\\\')
  return `[${neg ? '^' : ''}${escaped}]`
}

// パターン本体（! と末尾 / を外したもの）を正規表現にする
function patternToRegex(p: string, anchored: boolean): RegExp {
  let re = ''
  let i = 0
  // 先頭の **/ は「どの階層でも」
  if (p.startsWith('**/')) { re += '(?:.*/)?'; i = 3 }
  while (i < p.length) {
    const ch = p[i]
    if (ch === '\\' && i + 1 < p.length) {
      re += p[i + 1].replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')
      i += 2
      continue
    }
    if (ch === '*') {
      if (p[i + 1] === '*') {
        const prevSlash = i === 0 || p[i - 1] === '/'
        const next = p[i + 2]
        if (prevSlash && next === '/') { re += '(?:.*/)?'; i += 3; continue } // /**/ ＝ 0 個以上のディレクトリ
        if (prevSlash && next === undefined) { re += '.*'; i += 2; continue } // 末尾の /** ＝ 中身すべて
        re += '[^/]*' // それ以外の ** は * と同じ
        i += 2
        continue
      }
      re += '[^/]*'
      i++
      continue
    }
    if (ch === '?') { re += '[^/]'; i++; continue }
    if (ch === '[') {
      const end = p.indexOf(']', i + 2)
      if (end !== -1) { re += classToRegex(p.slice(i + 1, end)); i = end + 1; continue }
    }
    re += ch.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')
    i++
  }
  // 当たったのがディレクトリなら、その中身も除外される（中身の判定は呼び出し側で親から順に見る）
  return new RegExp(anchored ? `^${re}$` : `(?:^|/)${re}$`)
}

export function parseGitignore(text: string): IgnoreRule[] {
  const rules: IgnoreRule[] = []
  text.split(/\r?\n/).forEach((raw, idx) => {
    // 末尾の空白は、\ で逃がしていなければ取り除く
    let s = raw.replace(/(?<!\\)\s+$/, '')
    if (s === '' || s.startsWith('#')) return
    let negate = false
    if (s.startsWith('!')) { negate = true; s = s.slice(1) }
    else if (s.startsWith('\\!') || s.startsWith('\\#')) s = s.slice(1)
    let dirOnly = false
    if (s.endsWith('/') && !s.endsWith('\\/')) { dirOnly = true; s = s.slice(0, -1) }
    if (s === '') return
    // 先頭か途中にスラッシュがあれば、.gitignore の場所からの相対パス
    const anchored = s.includes('/')
    if (s.startsWith('/')) s = s.slice(1)
    rules.push({ line: idx + 1, source: raw.trim(), negate, dirOnly, anchored, regex: patternToRegex(s, anchored) })
  })
  return rules
}

function lastMatch(rules: IgnoreRule[], path: string, isDir: boolean): IgnoreRule | null {
  for (let i = rules.length - 1; i >= 0; i--) {
    const r = rules[i]
    if (r.dirOnly && !isDir) continue
    // 末尾が /** のパターンは、git はディレクトリ abc/ 自体にも当てる（中身がすべて除外されるため）
    if (r.regex.test(path) || (isDir && /\/\*\*\/?$/.test(r.source) &&r.regex.test(path + '/'))) return r
  }
  return null
}

/** path はリポジトリのルートからの相対パス。末尾が / ならディレクトリとして扱う */
export function checkIgnore(rules: IgnoreRule[], rawPath: string): IgnoreVerdict {
  const isDir = rawPath.endsWith('/')
  const path = rawPath.replace(/^\.?\//, '').replace(/\/+$/, '')
  const parts = path.split('/')
  // 親ディレクトリから順に見る。除外されたディレクトリの中には Git が入らないので、中のファイルは ! で戻せない
  for (let k = 1; k < parts.length; k++) {
    const dir = parts.slice(0, k).join('/')
    const r = lastMatch(rules, dir, true)
    if (r && !r.negate) return { ignored: true, rule: r, viaParent: dir + '/' }
  }
  const r = lastMatch(rules, path, isDir)
  return { ignored: !!r && !r.negate, rule: r, viaParent: null }
}
