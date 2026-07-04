import { VisitTracker } from '@/components/VisitTracker'
import { ShareButton } from '@/components/ShareButton'

export default function ToolsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <VisitTracker />
      {children}
      <div className="mt-8 mb-4 flex items-center justify-between border-t border-border pt-6">
        <p className="font-mono text-xs text-muted">このツールを共有する</p>
        <ShareButton />
      </div>
    </>
  )
}
