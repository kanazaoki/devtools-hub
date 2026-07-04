'use client'

import { useState } from 'react'

// ─── Types ───────────────────────────────────────────────────────────────────

interface PermBits {
  r: boolean
  w: boolean
  x: boolean
}

interface Permissions {
  special: { setuid: boolean; setgid: boolean; sticky: boolean }
  owner: PermBits
  group: PermBits
  others: PermBits
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function bitsToOctal(bits: PermBits): number {
  return (bits.r ? 4 : 0) + (bits.w ? 2 : 0) + (bits.x ? 1 : 0)
}

function octalToBits(n: number): PermBits {
  return { r: !!(n & 4), w: !!(n & 2), x: !!(n & 1) }
}

function permToSymbol(bits: PermBits, sbit: boolean, schar: string): string {
  return (
    (bits.r ? 'r' : '-') +
    (bits.w ? 'w' : '-') +
    (bits.x ? (sbit ? schar : 'x') : sbit ? schar.toUpperCase() : '-')
  )
}

function permissionsToOctalString(p: Permissions): string {
  const special =
    (p.special.setuid ? 4 : 0) + (p.special.setgid ? 2 : 0) + (p.special.sticky ? 1 : 0)
  const owner = bitsToOctal(p.owner)
  const group = bitsToOctal(p.group)
  const others = bitsToOctal(p.others)
  if (special > 0) return `${special}${owner}${group}${others}`
  return `${owner}${group}${others}`
}

function permissionsToSymbolic(p: Permissions): string {
  return (
    permToSymbol(p.owner, p.special.setuid, 's') +
    permToSymbol(p.group, p.special.setgid, 's') +
    permToSymbol(p.others, p.special.sticky, 't')
  )
}

function octalStringToPermissions(val: string): Permissions | null {
  const trimmed = val.trim()
  if (!/^\d{3,4}$/.test(trimmed)) return null

  let specialDigit = 0
  let ownerDigit: number
  let groupDigit: number
  let othersDigit: number

  if (trimmed.length === 4) {
    specialDigit = parseInt(trimmed[0], 10)
    ownerDigit = parseInt(trimmed[1], 10)
    groupDigit = parseInt(trimmed[2], 10)
    othersDigit = parseInt(trimmed[3], 10)
  } else {
    ownerDigit = parseInt(trimmed[0], 10)
    groupDigit = parseInt(trimmed[1], 10)
    othersDigit = parseInt(trimmed[2], 10)
  }

  if (
    [specialDigit, ownerDigit, groupDigit, othersDigit].some((d) => d > 7)
  ) return null

  return {
    special: {
      setuid: !!(specialDigit & 4),
      setgid: !!(specialDigit & 2),
      sticky: !!(specialDigit & 1),
    },
    owner: octalToBits(ownerDigit),
    group: octalToBits(groupDigit),
    others: octalToBits(othersDigit),
  }
}

function describePerms(bits: PermBits, label: string): string {
  const parts: string[] = []
  if (bits.r) parts.push('読み取り')
  if (bits.w) parts.push('書き込み')
  if (bits.x) parts.push('実行')
  if (parts.length === 0) return `${label}: アクセス不可`
  return `${label}: ${parts.join('・')}`
}

// ─── Default state ────────────────────────────────────────────────────────────

const DEFAULT_OCTAL = '755'

const DEFAULT_PERMS: Permissions = octalStringToPermissions(DEFAULT_OCTAL)!

// ─── Presets ─────────────────────────────────────────────────────────────────

const PRESETS = [
  { label: '644', value: '644', note: 'ファイル標準' },
  { label: '755', value: '755', note: 'ディレクトリ/実行ファイル' },
  { label: '777', value: '777', note: '全権限（非推奨）' },
  { label: '600', value: '600', note: '秘密鍵など' },
  { label: '700', value: '700', note: '個人用ディレクトリ' },
  { label: '400', value: '400', note: '読み取り専用' },
]

// ─── Component ───────────────────────────────────────────────────────────────

export function ChmodCalculator() {
  const [perms, setPerms] = useState<Permissions>(DEFAULT_PERMS)
  const [octalInput, setOctalInput] = useState(DEFAULT_OCTAL)
  const [octalError, setOctalError] = useState('')
  const [filename, setFilename] = useState('filename')
  const [copied, setCopied] = useState(false)

  const octalStr = permissionsToOctalString(perms)
  const symbolicStr = permissionsToSymbolic(perms)
  const command = `chmod ${octalStr} ${filename}`

  function applyPerms(p: Permissions, octal: string) {
    setPerms(p)
    setOctalInput(octal)
    setOctalError('')
  }

  function handleOctalChange(val: string) {
    setOctalInput(val)
    if (val === '') { setOctalError(''); return }
    if (!/^\d{1,4}$/.test(val)) { setOctalError('数字のみ入力可'); return }
    if (/[89]/.test(val)) { setOctalError('各桁は 0〜7 で入力してください'); return }
    if (val.length < 3) { setOctalError('3〜4桁で入力してください'); return }
    const p = octalStringToPermissions(val)
    if (!p) { setOctalError('無効な値です'); return }
    setOctalError('')
    setPerms(p)
  }

  function toggleBit(
    section: 'owner' | 'group' | 'others',
    bit: keyof PermBits,
  ) {
    const next = {
      ...perms,
      [section]: { ...perms[section], [bit]: !perms[section][bit] },
    }
    setPerms(next)
    setOctalInput(permissionsToOctalString(next))
    setOctalError('')
  }

  function toggleSpecial(bit: 'setuid' | 'setgid' | 'sticky') {
    const next = { ...perms, special: { ...perms.special, [bit]: !perms.special[bit] } }
    setPerms(next)
    setOctalInput(permissionsToOctalString(next))
    setOctalError('')
  }

  function handleCopy() {
    navigator.clipboard.writeText(command).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  const sections: Array<{ key: 'owner' | 'group' | 'others'; label: string }> = [
    { key: 'owner', label: '所有者 (Owner)' },
    { key: 'group', label: 'グループ (Group)' },
    { key: 'others', label: 'その他 (Others)' },
  ]

  return (
    <div className="space-y-6">
      {/* Presets */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted">プリセット</p>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.value}
              onClick={() => applyPerms(octalStringToPermissions(p.value)!, p.value)}
              className="group flex flex-col items-center rounded border border-border bg-surface px-3 py-1.5 text-left transition-colors hover:border-teal hover:bg-teal/10"
            >
              <span className="font-mono text-sm font-bold text-bright">{p.label}</span>
              <span className="text-[10px] text-muted group-hover:text-teal">{p.note}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Octal input */}
      <div>
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-muted">
          Octal 値
        </label>
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={octalInput}
            onChange={(e) => handleOctalChange(e.target.value)}
            maxLength={4}
            placeholder="755"
            className="w-24 rounded border border-border bg-base px-3 py-2 font-mono text-xl font-bold text-bright focus:border-teal focus:outline-none"
          />
          <span className="font-mono text-lg text-dim">=</span>
          <span className="font-mono text-lg font-medium text-primary">{symbolicStr}</span>
        </div>
        {octalError && (
          <p className="mt-1.5 text-xs text-red-400">{octalError}</p>
        )}
      </div>

      {/* Checkboxes */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted">パーミッション設定</p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[400px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="pb-2 text-left text-xs text-muted font-normal w-40">対象</th>
                <th className="pb-2 text-center text-xs text-muted font-normal w-20">読み取り (r)</th>
                <th className="pb-2 text-center text-xs text-muted font-normal w-20">書き込み (w)</th>
                <th className="pb-2 text-center text-xs text-muted font-normal w-20">実行 (x)</th>
                <th className="pb-2 text-right text-xs text-muted font-normal">Octal</th>
              </tr>
            </thead>
            <tbody>
              {sections.map(({ key, label }) => (
                <tr key={key} className="border-b border-border/50">
                  <td className="py-2.5 pr-4 text-xs font-medium text-dim">{label}</td>
                  {(['r', 'w', 'x'] as const).map((bit) => (
                    <td key={bit} className="py-2.5 text-center">
                      <input
                        type="checkbox"
                        checked={perms[key][bit]}
                        onChange={() => toggleBit(key, bit)}
                        className="h-4 w-4 cursor-pointer accent-teal"
                      />
                    </td>
                  ))}
                  <td className="py-2.5 text-right font-mono text-base font-bold text-teal">
                    {bitsToOctal(perms[key])}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Special bits */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted">特殊ビット</p>
        <div className="flex flex-wrap gap-4">
          {(
            [
              { key: 'setuid', label: 'Setuid (4xxx)', desc: '実行時に所有者権限で動作' },
              { key: 'setgid', label: 'Setgid (2xxx)', desc: '実行時にグループ権限で動作' },
              { key: 'sticky', label: 'Sticky Bit (1xxx)', desc: '/tmp など: 作成者のみ削除可' },
            ] as const
          ).map(({ key, label, desc }) => (
            <label key={key} className="flex cursor-pointer items-start gap-2">
              <input
                type="checkbox"
                checked={perms.special[key]}
                onChange={() => toggleSpecial(key)}
                className="mt-0.5 h-4 w-4 cursor-pointer accent-teal"
              />
              <div>
                <span className="text-sm font-medium text-primary">{label}</span>
                <p className="text-xs text-muted">{desc}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Readable */}
      <div className="rounded-lg border border-border bg-base p-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted">説明</p>
        <ul className="space-y-1.5 text-sm">
          <li className="text-primary">{describePerms(perms.owner, '所有者')}</li>
          <li className="text-primary">{describePerms(perms.group, 'グループ')}</li>
          <li className="text-primary">{describePerms(perms.others, 'その他')}</li>
          {perms.special.setuid && (
            <li className="text-yellow-400">Setuid: 実行時に所有者権限で動作</li>
          )}
          {perms.special.setgid && (
            <li className="text-yellow-400">Setgid: 実行時にグループ権限で動作</li>
          )}
          {perms.special.sticky && (
            <li className="text-yellow-400">Sticky Bit: ファイル作成者のみ削除・リネーム可</li>
          )}
        </ul>
      </div>

      {/* Command output */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted">chmod コマンド</p>
        <div className="flex items-center gap-2">
          <div className="flex flex-1 items-center gap-3 rounded border border-border bg-base px-4 py-2.5">
            <span className="font-mono text-sm text-dim">$</span>
            <span className="font-mono text-sm text-bright">chmod {octalStr}</span>
            <input
              type="text"
              value={filename}
              onChange={(e) => setFilename(e.target.value || 'filename')}
              className="min-w-0 flex-1 bg-transparent font-mono text-sm text-teal focus:outline-none"
            />
          </div>
          <button
            onClick={handleCopy}
            className="shrink-0 rounded border border-border bg-surface px-4 py-2.5 text-sm font-medium text-primary transition-colors hover:border-teal hover:text-teal"
          >
            {copied ? '✓ コピー済み' : 'コピー'}
          </button>
        </div>
        <p className="mt-1.5 text-xs text-muted">ファイル名部分は編集できます</p>
      </div>
    </div>
  )
}
