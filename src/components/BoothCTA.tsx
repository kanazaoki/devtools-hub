interface BoothCTAProps {
  boothUrl: string
  toolName: string
}

export function BoothCTA({ boothUrl, toolName }: BoothCTAProps) {
  return (
    <div className="rounded-lg border border-teal/30 bg-teal/5 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-mono uppercase tracking-widest text-teal mb-1">
            Desktop App
          </p>
          <h3 className="text-base font-semibold text-bright">
            デスクトップ版を入手する
          </h3>
          <p className="mt-1 text-sm text-dim">
            Windows 向けアプリ版はすべての機能をフルで使えます。BOOTH で配布中。
          </p>
        </div>
        <a
          href={boothUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex shrink-0 items-center gap-2 rounded-md bg-teal px-5 py-2.5 text-sm font-semibold text-bg transition-opacity hover:opacity-80"
        >
          BOOTH で見る
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
          </svg>
        </a>
      </div>
    </div>
  )
}
