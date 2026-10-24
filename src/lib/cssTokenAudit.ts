// CSS カスタムプロパティで組んだテーマを点検する。
//
// 1. ダークテーマ側の上書き漏れ：ダークを @media と [data-theme] の2か所に書くと、
//    片方にだけ変数を足して、もう片方を忘れることが起きる
// 2. 手動切替が効かない書き方：@media (prefers-color-scheme: dark) の中の :root に
//    :not([data-theme="light"]) が付いていないと、OS がダークの人が手動でライトを
//    選んでもダークのまま
// 3. 色の直書き：コンポーネント側で #fff などを直接書くと、テーマを切り替えても変わらない
// 4. 定義されていない変数の参照：var(--x) の --x がどこにも無く、予備の値も無い

export interface Rule {
  selector: string
  atRules: string[]
  decls: { prop: string; value: string }[]
}

export interface AuditResult {
  /** テーマとして上書きしている場所ごとの、上書きの漏れ */
  themeGaps: { scope: string; missing: string[] }[]
  themeScopes: { scope: string; count: number }[]
  unguardedMedia: boolean
  rawColors: { selector: string; prop: string; value: string }[]
  undefinedRefs: { name: string; selector: string }[]
  definedCount: number
}

const strip = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, '')

export function parseRules(css: string): Rule[] {
  const src = strip(css)
  const rules: Rule[] = []
  const walk = (text: string, atRules: string[]) => {
    let i = 0
    while (i < text.length) {
      const open = text.indexOf('{', i)
      if (open < 0) break
      const head = text.slice(i, open).trim()
      let depth = 1
      let j = open + 1
      while (j < text.length && depth > 0) {
        if (text[j] === '{') depth++
        else if (text[j] === '}') depth--
        j++
      }
      const body = text.slice(open + 1, j - 1)
      // 宣言の後ろに続けて書かれた入れ子（; の後に head が来る）を切り分ける
      const lastSemi = head.lastIndexOf(';')
      const selector = (lastSemi >= 0 ? head.slice(lastSemi + 1) : head).replace(/\s+/g, ' ').trim()
      if (selector.startsWith('@')) {
        walk(body, [...atRules, selector])
      } else {
        const decls: Rule['decls'] = []
        // 入れ子のブロックを除いた宣言だけを拾う
        const flat = body.replace(/\{[^{}]*\}/g, '')
        for (const part of flat.split(';')) {
          const k = part.indexOf(':')
          if (k < 0) continue
          const prop = part.slice(0, k).trim()
          const value = part.slice(k + 1).trim()
          if (prop && value && /^[-\w]+$/.test(prop)) decls.push({ prop, value })
        }
        rules.push({ selector, atRules, decls })
      }
      i = j
    }
  }
  walk(src, [])
  return rules
}

const COLOR = /#[0-9a-fA-F]{3,8}\b|\b(?:rgb|rgba|hsl|hsla|oklch|oklab|lab|lch)\(/

const isThemeScope = (r: Rule) =>
  /\[data-theme|\.dark\b|\.theme-|\[data-mode|\.light\b/.test(r.selector) ||
  r.atRules.some((a) => /prefers-color-scheme/.test(a))

const scopeLabel = (r: Rule) => [...r.atRules, r.selector].join(' ')

export function auditCss(css: string): AuditResult {
  const rules = parseRules(css)
  const defined = new Set<string>()
  for (const r of rules) for (const d of r.decls) if (d.prop.startsWith('--')) defined.add(d.prop)

  // テーマとして上書きしている場所をまとめる（同じ場所が複数ルールに分かれていても1つに）
  const scopes = new Map<string, Set<string>>()
  for (const r of rules) {
    if (!isThemeScope(r)) continue
    const vars = r.decls.filter((d) => d.prop.startsWith('--')).map((d) => d.prop)
    if (!vars.length) continue
    const key = scopeLabel(r)
    const set = scopes.get(key) ?? new Set<string>()
    vars.forEach((v) => set.add(v))
    scopes.set(key, set)
  }

  // ダーク側として扱う場所どうしを比べる（ライト側の [data-theme="light"] は別に比べる）
  const groups: Record<'dark' | 'light' | 'other', [string, Set<string>][]> = { dark: [], light: [], other: [] }
  for (const [k, v] of scopes) {
    if (/dark/.test(k)) groups.dark.push([k, v])
    else if (/light/.test(k)) groups.light.push([k, v])
    else groups.other.push([k, v])
  }
  const themeGaps: AuditResult['themeGaps'] = []
  for (const g of [groups.dark, groups.light]) {
    if (g.length < 2) continue
    const union = new Set<string>()
    g.forEach(([, v]) => v.forEach((x) => union.add(x)))
    for (const [k, v] of g) {
      const missing = [...union].filter((x) => !v.has(x))
      if (missing.length) themeGaps.push({ scope: k, missing })
    }
  }

  const usesDataTheme = rules.some((r) => /\[data-theme/.test(r.selector))
  const unguardedMedia =
    usesDataTheme &&
    rules.some(
      (r) =>
        r.atRules.some((a) => /prefers-color-scheme:\s*dark/.test(a)) &&
        /:root|html/.test(r.selector) &&
        !/:not\(\[data-theme/.test(r.selector),
    )

  const rawColors: AuditResult['rawColors'] = []
  const undefinedRefs: AuditResult['undefinedRefs'] = []
  const seenRef = new Set<string>()
  for (const r of rules) {
    for (const d of r.decls) {
      if (!d.prop.startsWith('--') && COLOR.test(d.value.replace(/var\([^)]*\)/g, ''))) {
        rawColors.push({ selector: r.selector, prop: d.prop, value: d.value })
      }
      for (const m of d.value.matchAll(/var\(\s*(--[\w-]+)\s*(,)?/g)) {
        if (!defined.has(m[1]) && !m[2] && !seenRef.has(m[1] + r.selector)) {
          seenRef.add(m[1] + r.selector)
          undefinedRefs.push({ name: m[1], selector: r.selector })
        }
      }
    }
  }

  return {
    themeGaps,
    themeScopes: [...scopes].map(([scope, v]) => ({ scope, count: v.size })),
    unguardedMedia,
    rawColors,
    undefinedRefs,
    definedCount: defined.size,
  }
}
