'use client'

import { useState, useMemo } from 'react'

// 色のトークンを二段構えで作る：素材の色（gray-50 など見た目の名前）と、役割の色（bg・text など）。
// 役割はライトとダークで参照する素材を変えられるので、ダークモードは役割の参照先を差し替えるだけで済む。
// ⚠ 以前は名前と色の一覧を1段で出すだけで、役割もダークモードも作れなかった

interface BaseColor {
  id: string
  name: string
  hex: string
}

interface RoleColor {
  id: string
  name: string
  light: string // 素材の名前
  dark: string
}

const INITIAL_BASE: BaseColor[] = [
  { id: 'b1', name: 'gray-50', hex: '#f8fafc' },
  { id: 'b2', name: 'gray-300', hex: '#cbd5e1' },
  { id: 'b3', name: 'gray-600', hex: '#475569' },
  { id: 'b4', name: 'gray-900', hex: '#0f172a' },
  { id: 'b5', name: 'blue-400', hex: '#60a5fa' },
  { id: 'b6', name: 'blue-700', hex: '#1d4ed8' },
  { id: 'b7', name: 'red-400', hex: '#f87171' },
  { id: 'b8', name: 'red-700', hex: '#b91c1c' },
]

const INITIAL_ROLES: RoleColor[] = [
  { id: 'r1', name: 'bg', light: 'gray-50', dark: 'gray-900' },
  { id: 'r2', name: 'text', light: 'gray-900', dark: 'gray-50' },
  { id: 'r3', name: 'text-muted', light: 'gray-600', dark: 'gray-300' },
  { id: 'r4', name: 'accent', light: 'blue-700', dark: 'blue-400' },
  { id: 'r5', name: 'danger', light: 'red-700', dark: 'red-400' },
]

const TABS = ['CSS Variables', 'Tailwind v4', 'Tailwind v3', 'Sass', 'Style Dictionary'] as const
type Tab = (typeof TABS)[number]

function isValidHex(hex: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(hex)
}

function safe(name: string, fallback: string): string {
  return name.trim().replace(/\s+/g, '-') || fallback
}

function relLum(hex: string): number {
  const n = parseInt(hex.slice(1), 16)
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2]
}

function contrast(a: string, b: string): number {
  const [x, y] = [relLum(a), relLum(b)].sort((p, q) => q - p)
  return (x + 0.05) / (y + 0.05)
}

function baseLines(base: BaseColor[], prefix: string, indent: string): string[] {
  return base.map((c, i) => `${indent}--${prefix}${safe(c.name, `color-${i + 1}`)}: ${c.hex};`)
}

function generateCss(base: BaseColor[], roles: RoleColor[]): string {
  const lines = [':root {', '  /* 素材の色 */', ...baseLines(base, '', '  '), '', '  /* 役割の色（ライト） */']
  roles.forEach((r, i) => lines.push(`  --${safe(r.name, `role-${i + 1}`)}: var(--${r.light});`))
  lines.push('}')
  const darkRoles = roles.filter((r) => r.dark && r.dark !== r.light)
  if (darkRoles.length) {
    lines.push('', '@media (prefers-color-scheme: dark) {', '  :root {')
    darkRoles.forEach((r) => lines.push(`    --${safe(r.name, 'role')}: var(--${r.dark});`))
    lines.push('  }', '}')
  }
  return lines.join('\n')
}

function generateTailwind4(base: BaseColor[], roles: RoleColor[]): string {
  const lines = [
    '/* Tailwind CSS v4：CSS Variables タブの CSS を読み込んだうえで、これを CSS に足す。',
    '   bg-bg・text-text・text-accent のようなクラスが使え、ダークモードでは自動で切り替わる */',
    '@theme inline {',
  ]
  base.forEach((c, i) => {
    const n = safe(c.name, `color-${i + 1}`)
    lines.push(`  --color-${n}: var(--${n});`)
  })
  roles.forEach((r, i) => {
    const n = safe(r.name, `role-${i + 1}`)
    lines.push(`  --color-${n}: var(--${n});`)
  })
  lines.push('}')
  return lines.join('\n')
}

function generateTailwind3(base: BaseColor[], roles: RoleColor[]): string {
  // ⚠ 以前は theme.colors に書いていたため、Tailwind の既定の色（slate・blue など）が全部消えていた。extend に足す
  const entries = [
    ...base.map((c, i) => safe(c.name, `color-${i + 1}`)),
    ...roles.map((r, i) => safe(r.name, `role-${i + 1}`)),
  ].map((n) => `        '${n}': 'var(--${n})',`)
  return [
    '// tailwind.config.js（v3）：CSS Variables タブの CSS と一緒に使う',
    'module.exports = {',
    '  theme: {',
    '    extend: {',
    '      colors: {',
    ...entries,
    '      },',
    '    },',
    '  },',
    '}',
  ].join('\n')
}

function generateSass(base: BaseColor[], roles: RoleColor[]): string {
  const lines = ['// 素材の色', ...base.map((c, i) => `$${safe(c.name, `color-${i + 1}`)}: ${c.hex};`), '']
  lines.push('// 役割の色は CSS 変数にする（Sass の変数はビルド時に値が固定され、ダークモードで切り替えられない）')
  lines.push(':root {')
  roles.forEach((r, i) => lines.push(`  --${safe(r.name, `role-${i + 1}`)}: #{$${r.light}};`))
  lines.push('}')
  const darkRoles = roles.filter((r) => r.dark && r.dark !== r.light)
  if (darkRoles.length) {
    lines.push('@media (prefers-color-scheme: dark) {', '  :root {')
    darkRoles.forEach((r) => lines.push(`    --${safe(r.name, 'role')}: #{$${r.dark}};`))
    lines.push('  }', '}')
  }
  return lines.join('\n')
}

function generateStyleDictionary(base: BaseColor[], roles: RoleColor[]): string {
  const tokens = {
    color: {
      base: Object.fromEntries(base.map((c, i) => [safe(c.name, `color-${i + 1}`), { value: c.hex }])),
      role: Object.fromEntries(roles.map((r, i) => [safe(r.name, `role-${i + 1}`), { value: `{color.base.${r.light}}` }])),
      'role-dark': Object.fromEntries(roles.map((r, i) => [safe(r.name, `role-${i + 1}`), { value: `{color.base.${r.dark}}` }])),
    },
  }
  return JSON.stringify(tokens, null, 2)
}

export function ColorTokenGenerator() {
  const [base, setBase] = useState<BaseColor[]>(INITIAL_BASE)
  const [roles, setRoles] = useState<RoleColor[]>(INITIAL_ROLES)
  const [activeTab, setActiveTab] = useState<Tab>('CSS Variables')
  const [copied, setCopied] = useState(false)

  const baseNames = base.map((c, i) => safe(c.name, `color-${i + 1}`))
  const hexOf = (name: string) => base.find((c, i) => safe(c.name, `color-${i + 1}`) === name)?.hex

  const output = useMemo(() => {
    switch (activeTab) {
      case 'CSS Variables': return generateCss(base, roles)
      case 'Tailwind v4': return generateTailwind4(base, roles)
      case 'Tailwind v3': return generateTailwind3(base, roles)
      case 'Sass': return generateSass(base, roles)
      case 'Style Dictionary': return generateStyleDictionary(base, roles)
    }
  }, [base, roles, activeTab])

  // 背景の役割（名前が bg / background のもの）に対する文字のコントラスト
  const bgRole = roles.find((r) => /^(bg|background)$/i.test(r.name.trim()))

  const updateBase = (id: string, field: 'name' | 'hex', value: string) => {
    setBase((prev) => {
      const old = prev.find((c) => c.id === id)
      const next = prev.map((c) => (c.id === id ? { ...c, [field]: value } : c))
      // 素材の名前を変えたら、それを参照している役割も追従させる
      if (field === 'name' && old) {
        setRoles((rs) => rs.map((r) => ({ ...r, light: r.light === old.name ? value : r.light, dark: r.dark === old.name ? value : r.dark })))
      }
      return next
    })
  }

  const copy = async () => {
    await navigator.clipboard.writeText(output)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const inputCls = 'rounded border border-[var(--border)] bg-[var(--bg)] px-2 py-1 font-mono text-xs text-[var(--primary)] outline-none transition-colors focus:border-[var(--teal)]'

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-6 lg:grid-cols-2">
        {/* 素材の色 */}
        <div className="flex flex-col gap-3">
          <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--muted)]">1. 素材の色（見た目の名前）</span>
          <div className="flex flex-col gap-2">
            {base.map((color, index) => (
              <div key={color.id} className="flex items-center gap-2">
                <input
                  type="color"
                  value={isValidHex(color.hex) ? color.hex : '#000000'}
                  onChange={(e) => updateBase(color.id, 'hex', e.target.value)}
                  className="h-7 w-8 shrink-0 cursor-pointer rounded border border-[var(--border)] bg-transparent p-px"
                />
                <input
                  type="text"
                  value={color.hex}
                  onChange={(e) => updateBase(color.id, 'hex', e.target.value)}
                  className={`w-24 ${inputCls} ${isValidHex(color.hex) ? '' : '!border-red-500/50 !text-red-400'}`}
                />
                <input
                  type="text"
                  value={color.name}
                  onChange={(e) => updateBase(color.id, 'name', e.target.value)}
                  placeholder={`color-${index + 1}`}
                  className={`min-w-0 flex-1 ${inputCls}`}
                />
                <button
                  onClick={() => setBase(base.filter((c) => c.id !== color.id))}
                  disabled={base.length <= 1}
                  aria-label="削除"
                  className="shrink-0 rounded border border-[var(--border)] px-2 py-1 font-mono text-xs text-[var(--muted)] hover:text-red-400 disabled:opacity-20"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          <button
            onClick={() => base.length < 20 && setBase([...base, { id: `b${Date.now()}`, name: '', hex: '#000000' }])}
            disabled={base.length >= 20}
            className="self-start rounded border border-[var(--border)] px-3 py-1 font-mono text-xs text-[var(--dim)] hover:border-[var(--teal)] hover:text-[var(--teal)] disabled:opacity-30"
          >
            + 素材を追加 ({base.length}/20)
          </button>
        </div>

        {/* 役割の色 */}
        <div className="flex flex-col gap-3">
          <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--muted)]">2. 役割の色（ライト／ダークで参照する素材）</span>
          <div className="flex flex-col gap-2">
            {roles.map((role, index) => {
              const lightHex = hexOf(role.light)
              const darkHex = hexOf(role.dark)
              const bgLight = bgRole ? hexOf(bgRole.light) : undefined
              const bgDark = bgRole ? hexOf(bgRole.dark) : undefined
              const showRatio = bgRole && role.id !== bgRole.id
              return (
                <div key={role.id} className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={role.name}
                      onChange={(e) => setRoles(roles.map((r) => (r.id === role.id ? { ...r, name: e.target.value } : r)))}
                      placeholder={`role-${index + 1}`}
                      className={`w-28 ${inputCls}`}
                    />
                    {(['light', 'dark'] as const).map((mode) => (
                      <select
                        key={mode}
                        value={role[mode]}
                        onChange={(e) => setRoles(roles.map((r) => (r.id === role.id ? { ...r, [mode]: e.target.value } : r)))}
                        className={`min-w-0 flex-1 ${inputCls}`}
                        aria-label={mode === 'light' ? 'ライト' : 'ダーク'}
                      >
                        {!baseNames.includes(role[mode]) && <option value={role[mode]}>（未定義）</option>}
                        {baseNames.map((n) => <option key={n} value={n}>{mode === 'light' ? '☀ ' : '☾ '}{n}</option>)}
                      </select>
                    ))}
                    <button
                      onClick={() => setRoles(roles.filter((r) => r.id !== role.id))}
                      disabled={roles.length <= 1}
                      aria-label="削除"
                      className="shrink-0 rounded border border-[var(--border)] px-2 py-1 font-mono text-xs text-[var(--muted)] hover:text-red-400 disabled:opacity-20"
                    >
                      ✕
                    </button>
                  </div>
                  {showRatio && lightHex && darkHex && bgLight && bgDark && (
                    <div className="flex gap-3 pl-1 font-mono text-[10px]">
                      {[['☀', lightHex, bgLight], ['☾', darkHex, bgDark]].map(([icon, fg, bg]) => {
                        const ratio = contrast(fg, bg)
                        return (
                          <span key={icon} className={ratio >= 4.5 ? 'text-teal/80' : ratio >= 3 ? 'text-amber-300' : 'text-red-400'}>
                            {icon} 背景に対して {ratio.toFixed(2)}:1 {ratio >= 4.5 ? '（本文OK）' : ratio >= 3 ? '（大きい文字のみ）' : '（不足）'}
                          </span>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          <button
            onClick={() => roles.length < 20 && setRoles([...roles, { id: `r${Date.now()}`, name: '', light: baseNames[0], dark: baseNames[0] }])}
            disabled={roles.length >= 20}
            className="self-start rounded border border-[var(--border)] px-3 py-1 font-mono text-xs text-[var(--dim)] hover:border-[var(--teal)] hover:text-[var(--teal)] disabled:opacity-30"
          >
            + 役割を追加 ({roles.length}/20)
          </button>
          <p className="font-mono text-[10px] leading-relaxed text-[var(--muted)]">
            名前が bg（または background）の役割を背景とみなし、ほかの役割の文字色としてのコントラスト比をライト・ダークそれぞれで表示します（WCAG：本文 4.5:1、大きい文字 3:1）。
          </p>
        </div>
      </div>

      {/* Output */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1">
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`rounded px-3 py-1 font-mono text-xs transition-colors ${
                  activeTab === tab
                    ? 'bg-[var(--teal)] font-semibold text-[var(--bg)]'
                    : 'border border-[var(--border)] text-[var(--dim)] hover:border-[var(--teal)] hover:text-[var(--teal)]'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
          <button
            onClick={copy}
            className="rounded border border-[var(--border)] px-2.5 py-0.5 font-mono text-xs text-[var(--dim)] transition-colors hover:border-[var(--teal)] hover:text-[var(--teal)]"
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>

        <div className="relative overflow-hidden rounded border border-[var(--border)] bg-[var(--bg)]">
          <div className="absolute bottom-0 left-0 top-0 w-[3px] rounded-l bg-[var(--teal)] opacity-30" />
          <pre className="overflow-x-auto p-4 pl-5 font-mono text-sm leading-relaxed text-[var(--primary)]">{output}</pre>
        </div>
      </div>
    </div>
  )
}
