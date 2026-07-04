'use client'

import { useState } from 'react'

// ─── IP math ────────────────────────────────────────────────────────────────

function parseOctets(ip: string): number[] | null {
  const parts = ip.split('.')
  if (parts.length !== 4) return null
  const nums = parts.map((p) => {
    if (p === '' || /\s/.test(p)) return NaN
    const n = parseInt(p, 10)
    return isNaN(n) || String(n) !== p.trim() ? NaN : n
  })
  if (nums.some((n) => isNaN(n) || n < 0 || n > 255)) return null
  return nums
}

function ipToU32(octs: number[]): number {
  return ((octs[0] << 24) | (octs[1] << 16) | (octs[2] << 8) | octs[3]) >>> 0
}

function u32ToIP(n: number): string {
  return [(n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff].join('.')
}

function maskFromPrefix(prefix: number): number {
  if (prefix === 0) return 0
  return (0xffffffff << (32 - prefix)) >>> 0
}

interface CalcResult {
  networkAddress: string
  broadcastAddress: string
  subnetMaskCidr: string
  subnetMaskDot: string
  firstUsable: string
  lastUsable: string
  usableRange: string
  hostCount: number
  ipBinary: string
  networkBinary: string
  maskBinary: string
  prefix: number
}

function calculate(ip: string, prefix: number): CalcResult | string {
  const octs = parseOctets(ip)
  if (!octs) return '無効な IP アドレスです'
  if (prefix < 0 || prefix > 32 || !Number.isInteger(prefix)) return 'CIDR は /0〜/32 の範囲で入力してください'

  const ipNum = ipToU32(octs)
  const mask = maskFromPrefix(prefix)
  const network = (ipNum & mask) >>> 0
  const broadcast = (network | (~mask >>> 0)) >>> 0

  let firstUsable: number
  let lastUsable: number
  let hostCount: number

  if (prefix === 32) {
    firstUsable = network
    lastUsable = network
    hostCount = 1
  } else if (prefix === 31) {
    firstUsable = network
    lastUsable = broadcast
    hostCount = 2
  } else {
    firstUsable = network + 1
    lastUsable = broadcast - 1
    hostCount = Math.pow(2, 32 - prefix) - 2
  }

  const toBin = (n: number) =>
    [(n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff]
      .map((o) => o.toString(2).padStart(8, '0'))
      .join('.')

  return {
    networkAddress: u32ToIP(network),
    broadcastAddress: u32ToIP(broadcast),
    subnetMaskCidr: `/${prefix}`,
    subnetMaskDot: u32ToIP(mask),
    firstUsable: u32ToIP(firstUsable),
    lastUsable: u32ToIP(lastUsable),
    usableRange: `${u32ToIP(firstUsable)} — ${u32ToIP(lastUsable)}`,
    hostCount,
    ipBinary: toBin(ipNum),
    networkBinary: toBin(network),
    maskBinary: toBin(mask),
    prefix,
  }
}

function parseCidrInput(raw: string): { ip: string; prefix: number } | null {
  const trimmed = raw.trim()
  const slashIdx = trimmed.lastIndexOf('/')
  if (slashIdx === -1) return null
  const ip = trimmed.slice(0, slashIdx).trim()
  const prefixStr = trimmed.slice(slashIdx + 1).trim()
  const prefix = parseInt(prefixStr, 10)
  if (isNaN(prefix)) return null
  return { ip, prefix }
}

// ─── Sub-components ──────────────────────────────────────────────────────────

const QUICK_PREFIXES = [8, 16, 24, 32]

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = async () => {
    await navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 1200)
  }
  return (
    <button
      onClick={handleCopy}
      className={`shrink-0 rounded border px-2 py-0.5 font-mono text-[10px] transition-all ${
        copied
          ? 'border-teal/40 bg-teal/10 text-teal'
          : 'border-border text-muted hover:border-border-hi hover:text-dim'
      }`}
    >
      {copied ? '✓' : 'copy'}
    </button>
  )
}

function ResultRow({
  label,
  value,
  accent,
}: {
  label: string
  value: string
  accent?: boolean
}) {
  return (
    <div className="grid grid-cols-[minmax(0,auto)_1fr_auto] items-center gap-x-3 gap-y-0.5 py-2.5 border-b border-border/60 last:border-0">
      <span className="font-mono text-[10px] uppercase tracking-wider text-muted whitespace-nowrap">{label}</span>
      <span
        className={`font-mono text-sm min-w-0 text-right truncate ${
          accent ? 'text-teal font-semibold' : 'text-primary'
        }`}
        title={value}
      >
        {value}
      </span>
      <CopyButton value={value} />
    </div>
  )
}

/** Binary string with network bits in teal, host bits dimmed */
function ColoredBinary({ binary, prefix }: { binary: string; prefix: number }) {
  // binary = "00110000.10101000.00000001.00000000" (35 chars with dots)
  // map char index to bit index (skip dots)
  const chars = binary.split('')
  let bitIndex = 0
  return (
    <span className="font-mono text-xs leading-relaxed tracking-tight break-all">
      {chars.map((ch, i) => {
        if (ch === '.') return <span key={i} className="text-muted/30">.</span>
        const idx = bitIndex++
        const isNetwork = idx < prefix
        return (
          <span key={i} className={isNetwork ? 'text-teal' : 'text-muted/50'}>
            {ch}
          </span>
        )
      })}
    </span>
  )
}

function BinaryRow({ label, binary, prefix }: { label: string; binary: string; prefix: number }) {
  return (
    <div className="py-2.5 border-b border-border/60 last:border-0">
      <div className="flex items-center justify-between mb-1">
        <span className="font-mono text-[10px] uppercase tracking-wider text-muted">{label}</span>
        <CopyButton value={binary} />
      </div>
      <div className="overflow-x-auto">
        <ColoredBinary binary={binary} prefix={prefix} />
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function CidrCalculator() {
  const [input, setInput] = useState('192.168.1.0/24')
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<CalcResult | null>(() => {
    const r = calculate('192.168.1.0', 24)
    return typeof r === 'string' ? null : r
  })

  const isElectron = typeof window !== 'undefined' && !!(window as any).electronAPI?.isElectron

  const handleInput = (val: string) => {
    setInput(val)
    const parsed = parseCidrInput(val)
    if (!parsed) {
      setError('IP/CIDR 形式で入力してください（例: 192.168.1.0/24）')
      setResult(null)
      return
    }
    const r = calculate(parsed.ip, parsed.prefix)
    if (typeof r === 'string') {
      setError(r)
      setResult(null)
    } else {
      setError(null)
      setResult(r)
    }
  }

  const applyQuickPrefix = (prefix: number) => {
    const parsed = parseCidrInput(input)
    const ip = parsed?.ip ?? '0.0.0.0'
    const newInput = `${ip}/${prefix}`
    handleInput(newInput)
    setInput(newInput)
  }

  const exportText = () => {
    if (!result) return
    const lines = [
      `IP / CIDR Calculator — Export`,
      `Input:              ${input}`,
      ``,
      `Network Address:    ${result.networkAddress}`,
      `Broadcast Address:  ${result.broadcastAddress}`,
      `Subnet Mask (CIDR): ${result.subnetMaskCidr}`,
      `Subnet Mask (Dot):  ${result.subnetMaskDot}`,
      `First Usable IP:    ${result.firstUsable}`,
      `Last Usable IP:     ${result.lastUsable}`,
      `Usable Range:       ${result.usableRange}`,
      `Host Count:         ${result.hostCount.toLocaleString()}`,
      ``,
      `IP Binary:          ${result.ipBinary}`,
      `Network Binary:     ${result.networkBinary}`,
      `Mask Binary:        ${result.maskBinary}`,
    ].join('\n')
    ;(window as any).electronAPI.saveTextFile(lines, `cidr-${input.replace('/', '_')}.txt`)
  }

  return (
    <div className="space-y-5">
      {/* Input row */}
      <div className="space-y-2.5">
        <label className="font-mono text-[10px] uppercase tracking-widest text-muted">
          IP / CIDR Notation
        </label>
        <div className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => handleInput(e.target.value)}
            placeholder="192.168.1.0/24"
            spellCheck={false}
            className={`w-full rounded-lg border bg-surface-hi px-4 py-3 font-mono text-base text-primary outline-none transition-colors focus:border-teal/40 ${
              error ? 'border-red-500/40 text-red-300' : 'border-border'
            }`}
          />
        </div>
        {error ? (
          <p className="font-mono text-[11px] text-red-400">{error}</p>
        ) : null}

        <div className="flex flex-wrap items-center gap-1.5">
          <span className="font-mono text-[10px] text-muted/50">Quick prefix:</span>
          {QUICK_PREFIXES.map((p) => (
            <button
              key={p}
              onClick={() => applyQuickPrefix(p)}
              className="rounded border border-border px-2.5 py-1 font-mono text-xs text-dim transition-all hover:border-teal/50 hover:bg-teal/5 hover:text-teal"
            >
              /{p}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      {result && (
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Network info */}
          <div className="rounded-lg border border-border bg-surface-hi overflow-hidden">
            <div className="border-b border-border px-4 py-2 flex items-center justify-between">
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted">Network Info</p>
              <span className="font-mono text-[10px] text-muted/40">{input}</span>
            </div>
            <div className="px-4">
              <ResultRow label="Network" value={result.networkAddress} />
              <ResultRow label="Broadcast" value={result.broadcastAddress} />
              <ResultRow label="Subnet (CIDR)" value={result.subnetMaskCidr} />
              <ResultRow label="Subnet (Dot)" value={result.subnetMaskDot} />
              <ResultRow label="First Host" value={result.firstUsable} />
              <ResultRow label="Last Host" value={result.lastUsable} />
              <ResultRow label="Usable Range" value={result.usableRange} />
              <ResultRow label="Host Count" value={result.hostCount.toLocaleString()} accent />
            </div>
          </div>

          {/* Binary */}
          <div className="rounded-lg border border-border bg-surface-hi overflow-hidden">
            <div className="border-b border-border px-4 py-2 flex items-center justify-between">
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted">Binary</p>
              <span className="font-mono text-[10px]">
                <span className="text-teal">■</span>
                <span className="text-muted/50 ml-1">network</span>
                <span className="text-muted/30 ml-2">■</span>
                <span className="text-muted/50 ml-1">host</span>
              </span>
            </div>
            <div className="px-4">
              <BinaryRow label="IP Address" binary={result.ipBinary} prefix={result.prefix} />
              <BinaryRow label="Network" binary={result.networkBinary} prefix={result.prefix} />
              <BinaryRow label="Subnet Mask" binary={result.maskBinary} prefix={result.prefix} />
            </div>
          </div>
        </div>
      )}

      {/* Export (desktop only) */}
      {result && isElectron && (
        <button
          onClick={exportText}
          className="rounded-lg border border-teal/30 bg-teal/10 px-4 py-2.5 font-mono text-xs text-teal transition-colors hover:bg-teal/20"
        >
          Export as .txt
        </button>
      )}
    </div>
  )
}
