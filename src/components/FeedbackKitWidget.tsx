'use client'
import { useEffect } from 'react'

export function FeedbackKitWidget({ projectId }: { projectId: string }) {
  useEffect(() => {
    const s = document.createElement('script')
    s.src = 'https://feedback-kit.vercel.app/widget.js'
    s.setAttribute('data-project', projectId)
    document.body.appendChild(s)
    return () => {
      document.getElementById('fk-btn')?.remove()
      document.getElementById('fk-panel')?.remove()
      document.getElementById('fk-toast')?.remove()
    }
  }, [projectId])
  return null
}
