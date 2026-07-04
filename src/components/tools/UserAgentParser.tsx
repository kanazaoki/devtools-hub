'use client'

import { useState } from 'react'

// ─── UA parser ───────────────────────────────────────────────────────────────

interface ParsedUA {
  browser: string
  browserVersion: string
  engine: string
  os: string
  osVersion: string
  device: 'Desktop' | 'Mobile' | 'Tablet' | 'Bot'
  isBot: boolean
  botName: string
}

function parseUA(ua: string): ParsedUA {
  const s = ua.trim()

  // Bot detection
  const botPatterns: [RegExp, string][] = [
    [/Googlebot\/([\d.]+)/i, 'Googlebot'],
    [/bingbot\/([\d.]+)/i, 'Bingbot'],
    [/Slurp\/([\d.]+)/i, 'Yahoo Slurp'],
    [/DuckDuckBot\/([\d.]+)/i, 'DuckDuckBot'],
    [/Baiduspider/i, 'Baiduspider'],
    [/YandexBot\/([\d.]+)/i, 'YandexBot'],
    [/facebookexternalhit/i, 'Facebook Bot'],
    [/Twitterbot\/([\d.]+)/i, 'Twitterbot'],
    [/LinkedInBot\/([\d.]+)/i, 'LinkedInBot'],
    [/Applebot\/([\d.]+)/i, 'Applebot'],
    [/\bbot\b/i, 'Bot'],
    [/\bcrawler\b/i, 'Crawler'],
    [/\bspider\b/i, 'Spider'],
  ]
  for (const [re, name] of botPatterns) {
    if (re.test(s)) {
      return {
        browser: name, browserVersion: '', engine: '', os: 'N/A', osVersion: '', device: 'Bot', isBot: true, botName: name,
      }
    }
  }

  // Browser
  let browser = 'Unknown', browserVersion = ''
  const browserPatterns: [RegExp, string][] = [
    [/Edg\/([\d.]+)/i, 'Microsoft Edge'],
    [/OPR\/([\d.]+)/i, 'Opera'],
    [/Opera\/([\d.]+)/i, 'Opera'],
    [/SamsungBrowser\/([\d.]+)/i, 'Samsung Browser'],
    [/UCBrowser\/([\d.]+)/i, 'UC Browser'],
    [/YaBrowser\/([\d.]+)/i, 'Yandex Browser'],
    [/CriOS\/([\d.]+)/i, 'Chrome (iOS)'],
    [/FxiOS\/([\d.]+)/i, 'Firefox (iOS)'],
    [/Firefox\/([\d.]+)/i, 'Firefox'],
    [/Chrome\/([\d.]+)/i, 'Chrome'],
    [/Safari\/([\d.]+)/i, 'Safari'],
    [/MSIE ([\d.]+)/i, 'Internet Explorer'],
    [/Trident\/.*rv:([\d.]+)/i, 'Internet Explorer'],
  ]
  for (const [re, name] of browserPatterns) {
    const m = s.match(re)
    if (m) { browser = name; browserVersion = m[1]; break }
  }
  // Safari version fix
  if (browser === 'Safari') {
    const vm = s.match(/Version\/([\d.]+)/)
    if (vm) browserVersion = vm[1]
  }

  // Engine
  let engine = 'Unknown'
  if (/Trident\//i.test(s)) engine = 'Trident'
  else if (/Gecko\//i.test(s) && /Firefox\//i.test(s)) engine = 'Gecko'
  else if (/AppleWebKit\//i.test(s) && !/Chrome\//i.test(s)) engine = 'WebKit'
  else if (/AppleWebKit\//i.test(s)) engine = 'Blink'

  // OS
  let os = 'Unknown', osVersion = ''
  if (/Windows NT ([\d.]+)/i.test(s)) {
    const m = s.match(/Windows NT ([\d.]+)/i)!
    os = 'Windows'
    const map: Record<string, string> = { '10.0': '10/11', '6.3': '8.1', '6.2': '8', '6.1': '7', '6.0': 'Vista', '5.1': 'XP' }
    osVersion = map[m[1]] ?? m[1]
  } else if (/Mac OS X ([\d_]+)/i.test(s)) {
    const m = s.match(/Mac OS X ([\d_]+)/i)!
    os = 'macOS'; osVersion = m[1].replace(/_/g, '.')
  } else if (/Android ([\d.]+)/i.test(s)) {
    const m = s.match(/Android ([\d.]+)/i)!
    os = 'Android'; osVersion = m[1]
  } else if (/iPhone OS ([\d_]+)/i.test(s)) {
    const m = s.match(/iPhone OS ([\d_]+)/i)!
    os = 'iOS'; osVersion = m[1].replace(/_/g, '.')
  } else if (/iPad.*OS ([\d_]+)/i.test(s)) {
    const m = s.match(/iPad.*OS ([\d_]+)/i)!
    os = 'iPadOS'; osVersion = m[1].replace(/_/g, '.')
  } else if (/Linux/i.test(s)) {
    os = 'Linux'
  } else if (/CrOS/i.test(s)) {
    os = 'ChromeOS'
  }

  // Device
  let device: ParsedUA['device'] = 'Desktop'
  if (/iPad/i.test(s) || (/Tablet/i.test(s) && !/Mobile/i.test(s))) device = 'Tablet'
  else if (/Mobile|iPhone|iPod|Android.*Mobile|Windows Phone/i.test(s)) device = 'Mobile'

  return { browser, browserVersion, engine, os, osVersion, device, isBot: false, botName: '' }
}

// ─── Presets ─────────────────────────────────────────────────────────────────

const PRESETS = [
  {
    label: 'Chrome / Windows',
    ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  },
  {
    label: 'Safari / iPhone',
    ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4.1 Mobile/15E148 Safari/604.1',
  },
  {
    label: 'Firefox / Mac',
    ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:125.0) Gecko/20100101 Firefox/125.0',
  },
  {
    label: 'Googlebot',
    ua: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
  },
  {
    label: 'Edge / Windows',
    ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.0.0',
  },
  {
    label: 'Android Chrome',
    ua: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.6367.82 Mobile Safari/537.36',
  },
]

// ─── Device badge ─────────────────────────────────────────────────────────────

function DeviceBadge({ device }: { device: ParsedUA['device'] }) {
  const map = {
    Desktop: { label: 'Desktop', color: 'text-blue-400 bg-blue-400/10 border-blue-400/30' },
    Mobile: { label: 'Mobile', color: 'text-green-400 bg-green-400/10 border-green-400/30' },
    Tablet: { label: 'Tablet', color: 'text-purple-400 bg-purple-400/10 border-purple-400/30' },
    Bot: { label: 'Bot / Crawler', color: 'text-orange-400 bg-orange-400/10 border-orange-400/30' },
  }
  const { label, color } = map[device]
  return (
    <span className={`rounded border px-2 py-0.5 text-xs font-semibold ${color}`}>{label}</span>
  )
}

// ─── Result card ──────────────────────────────────────────────────────────────

function ResultCard({ ua, index }: { ua: string; index: number }) {
  if (!ua.trim()) return null
  const p = parseUA(ua)
  return (
    <div className="rounded-lg border border-border bg-base p-4">
      <div className="mb-3 flex items-center gap-2">
        {index > 0 && (
          <span className="font-mono text-xs text-muted">UA {index + 1}</span>
        )}
        <DeviceBadge device={p.device} />
      </div>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
        <Row label="ブラウザ" value={`${p.browser}${p.browserVersion ? ` ${p.browserVersion}` : ''}`} />
        <Row label="エンジン" value={p.engine || '—'} />
        <Row label="OS" value={`${p.os}${p.osVersion ? ` ${p.osVersion}` : ''}`} />
        <Row label="デバイス" value={p.device} />
        {p.isBot && <Row label="Bot 名" value={p.botName} highlight />}
      </dl>
    </div>
  )
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className={`font-mono text-sm font-medium ${highlight ? 'text-orange-400' : 'text-bright'}`}>
        {value}
      </dd>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function UserAgentParser() {
  const [entries, setEntries] = useState<string[]>([''])
  const [gotCurrentUA, setGotCurrentUA] = useState(false)

  function updateEntry(index: number, val: string) {
    setEntries((prev) => prev.map((e, i) => (i === index ? val : e)))
  }

  function addEntry() {
    if (entries.length < 3) setEntries((prev) => [...prev, ''])
  }

  function removeEntry(index: number) {
    setEntries((prev) => prev.filter((_, i) => i !== index))
  }

  function getCurrentUA() {
    setEntries((prev) => {
      const next = [...prev]
      next[0] = navigator.userAgent
      return next
    })
    setGotCurrentUA(true)
  }

  const isCompareMode = entries.length > 1

  return (
    <div className="space-y-5">
      {/* Presets */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted">プリセット</p>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              onClick={() => updateEntry(0, p.ua)}
              className="rounded border border-border bg-surface px-3 py-1 text-xs text-primary transition-colors hover:border-teal hover:text-teal"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Input areas */}
      <div className="space-y-3">
        {entries.map((entry, i) => (
          <div key={i} className="space-y-1.5">
            {isCompareMode && (
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted">UA {i + 1}</p>
                {entries.length > 1 && (
                  <button
                    onClick={() => removeEntry(i)}
                    className="text-xs text-muted transition-colors hover:text-red-400"
                  >
                    削除
                  </button>
                )}
              </div>
            )}
            <div className="flex gap-2">
              <textarea
                value={entry}
                onChange={(e) => updateEntry(i, e.target.value)}
                rows={2}
                spellCheck={false}
                placeholder="User-Agent 文字列を貼り付けてください..."
                className="flex-1 resize-none rounded border border-border bg-base p-3 font-mono text-xs text-primary focus:border-teal focus:outline-none"
              />
              {i === 0 && (
                <button
                  onClick={getCurrentUA}
                  className="shrink-0 self-start rounded border border-border bg-surface px-3 py-2 text-xs font-medium text-primary transition-colors hover:border-teal hover:text-teal"
                  title="現在のブラウザの UA を取得"
                >
                  {gotCurrentUA ? '✓ 取得済み' : '現在の UA を取得'}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Add compare button */}
      {entries.length < 3 && (
        <button
          onClick={addEntry}
          className="text-xs text-muted transition-colors hover:text-teal"
        >
          + UA を追加して比較
        </button>
      )}

      {/* Results */}
      <div className={`grid gap-4 ${isCompareMode ? 'lg:grid-cols-2' : ''}`}>
        {entries.map((ua, i) => (
          <ResultCard key={i} ua={ua} index={isCompareMode ? i : 0} />
        ))}
      </div>
    </div>
  )
}
