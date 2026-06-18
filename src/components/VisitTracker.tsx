'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

export function VisitTracker() {
  const pathname = usePathname()

  useEffect(() => {
    const match = pathname.match(/^\/tools\/([^/]+)/)
    if (!match) return
    const slug = match[1]

    try {
      const raw = localStorage.getItem('dth_visited')
      const visited: string[] = raw ? JSON.parse(raw) : []
      if (!visited.includes(slug)) {
        localStorage.setItem('dth_visited', JSON.stringify([...visited, slug]))
      }
    } catch {
      // localStorage が使えない環境（プライベートモードなど）は無視
    }
  }, [pathname])

  return null
}
