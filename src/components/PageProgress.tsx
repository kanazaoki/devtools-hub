'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

export function PageProgress() {
  const pathname = usePathname()
  const [progress, setProgress] = useState(0)
  const [visible, setVisible] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isFirst = useRef(true)

  useEffect(() => {
    if (isFirst.current) {
      isFirst.current = false
      return
    }

    if (timerRef.current) clearTimeout(timerRef.current)

    setProgress(0)
    setVisible(true)

    // 素早く80%まで伸ばしてから完成
    const t1 = setTimeout(() => setProgress(80), 20)
    const t2 = setTimeout(() => setProgress(100), 200)
    const t3 = setTimeout(() => setVisible(false), 600)

    timerRef.current = t3
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
    }
  }, [pathname])

  if (!visible) return null

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[200] h-[2px] bg-teal origin-left pointer-events-none"
      style={{
        width: `${progress}%`,
        transition: progress === 0 ? 'none' : 'width 300ms ease-out, opacity 200ms ease',
        opacity: progress === 100 ? 0 : 1,
      }}
    />
  )
}
