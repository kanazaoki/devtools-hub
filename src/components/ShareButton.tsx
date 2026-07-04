'use client'

import { useState } from 'react'

export function ShareButton() {
  const [copied, setCopied] = useState(false)

  function share() {
    const url = window.location.href
    const title = document.title.split(' | ')[0]
    const text = `${title} — devtools-hub で無料で使えます`
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`
    window.open(twitterUrl, '_blank', 'width=550,height=450')
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // ignore
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={share}
        className="inline-flex items-center gap-1.5 rounded border border-border bg-surface px-3 py-1.5 font-mono text-xs text-muted transition-colors hover:border-border-hi hover:text-dim"
        aria-label="X (Twitter) でシェア"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.748l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
        </svg>
        シェア
      </button>
      <button
        onClick={copyLink}
        className="inline-flex items-center gap-1.5 rounded border border-border bg-surface px-3 py-1.5 font-mono text-xs text-muted transition-colors hover:border-border-hi hover:text-dim"
        aria-label="リンクをコピー"
      >
        {copied ? (
          <>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            Copied
          </>
        ) : (
          <>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
            </svg>
            リンクをコピー
          </>
        )}
      </button>
    </div>
  )
}
