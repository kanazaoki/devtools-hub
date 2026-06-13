'use client'

import { useEffect } from 'react'

export const ADSENSE_CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT ?? ''

interface AdSenseProps {
  slot: string
  format?: 'auto' | 'rectangle' | 'horizontal' | 'vertical'
  className?: string
}

export function AdSense({ slot, format = 'auto', className = '' }: AdSenseProps) {
  useEffect(() => {
    if (!ADSENSE_CLIENT) return
    try {
      type AdsByGoogle = unknown[]
      const w = window as typeof window & { adsbygoogle?: AdsByGoogle }
      ;(w.adsbygoogle = w.adsbygoogle || []).push({})
    } catch {
      // ignore
    }
  }, [])

  if (!ADSENSE_CLIENT) return null

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <span className="absolute right-2 top-1 z-10 font-mono text-[9px] uppercase tracking-widest text-muted pointer-events-none select-none">
        広告
      </span>
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client={ADSENSE_CLIENT}
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive="true"
      />
    </div>
  )
}
