import type { Tool } from '@/data/tools'

interface Props {
  tool: Tool
}

export function DesktopOnlyFeatures({ tool }: Props) {
  if (!tool.desktopFeatures.length) return null

  return (
    <section className="mb-8 overflow-hidden rounded-lg border border-border bg-surface">
      <div className="flex items-center justify-between border-b border-border px-5 py-3">
        <p className="font-mono text-xs uppercase tracking-widest text-muted">Desktop Only</p>
        <span className="rounded border border-teal/30 bg-teal/10 px-2 py-0.5 font-mono text-[10px] text-teal">
          有料版のみ
        </span>
      </div>
      <div className="px-5 py-4">
        <p className="mb-3 text-xs text-dim">
          デスクトップ版（BOOTH）でのみ使える機能
        </p>
        <ul className="grid gap-2 sm:grid-cols-2">
          {tool.desktopFeatures.map((feature) => (
            <li key={feature} className="flex items-start gap-2.5 text-sm text-primary">
              <span className="mt-0.5 shrink-0 font-mono text-xs font-bold text-teal" aria-hidden="true">
                +
              </span>
              {feature}
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
