import { VisitTracker } from '@/components/VisitTracker'

export default function ToolsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <VisitTracker />
      {children}
    </>
  )
}
