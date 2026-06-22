interface PricingComparisonTableProps {
  webFeatures: string[]
  desktopFeatures: string[]
  boothUrl: string
}

export function PricingComparisonTable({ webFeatures, desktopFeatures, boothUrl }: PricingComparisonTableProps) {
  return (
    <section className="mb-8">
      <h2 className="mb-4 font-mono text-xs font-semibold uppercase tracking-widest text-muted">
        Free vs Paid
      </h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {/* 無料・Web版 */}
        <div className="rounded-lg border border-border bg-surface p-5">
          <div className="mb-3 flex items-center gap-2">
            <span className="rounded bg-border px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-dim">
              無料
            </span>
            <span className="text-sm font-semibold text-bright">Web 版</span>
          </div>
          <ul className="space-y-2">
            {webFeatures.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm text-primary">
                <span className="mt-0.5 shrink-0 text-teal" aria-hidden="true">✓</span>
                {f}
              </li>
            ))}
          </ul>
        </div>

        {/* 有料・デスクトップ版 */}
        <div className="rounded-lg border border-teal/40 bg-teal/5 p-5">
          <div className="mb-3 flex items-center gap-2">
            <span className="rounded bg-teal/20 px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-teal">
              有料
            </span>
            <span className="text-sm font-semibold text-bright">デスクトップ版</span>
          </div>
          <p className="mb-2 text-xs text-dim">Web 版の全機能に加えて：</p>
          <ul className="space-y-2">
            {desktopFeatures.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm text-primary">
                <span className="mt-0.5 shrink-0 font-semibold text-teal" aria-hidden="true">+</span>
                {f}
              </li>
            ))}
          </ul>
          <a
            href={boothUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-md bg-teal px-4 py-2.5 text-sm font-semibold text-bg transition-opacity hover:opacity-80"
          >
            BOOTH で購入する
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          </a>
        </div>
      </div>
    </section>
  )
}
