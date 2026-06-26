'use client'

import { useState, useRef, useCallback } from 'react'

interface KeyEntry {
  id: number
  key: string
  code: string
  keyCode: number
  charCode: number
  which: number
  altKey: boolean
  ctrlKey: boolean
  shiftKey: boolean
  metaKey: boolean
  type: string
  repeat: boolean
  combo: string
  timestamp: string
}

function formatTimestamp(date: Date): string {
  const h = date.getHours().toString().padStart(2, '0')
  const m = date.getMinutes().toString().padStart(2, '0')
  const s = date.getSeconds().toString().padStart(2, '0')
  const ms = date.getMilliseconds().toString().padStart(3, '0')
  return `${h}:${m}:${s}.${ms}`
}

function buildCombo(e: React.KeyboardEvent): string {
  const parts: string[] = []
  if (e.ctrlKey && e.key !== 'Control') parts.push('Ctrl')
  if (e.altKey && e.key !== 'Alt') parts.push('Alt')
  if (e.shiftKey && e.key !== 'Shift') parts.push('Shift')
  if (e.metaKey && e.key !== 'Meta') parts.push('Meta')
  parts.push(e.key === ' ' ? 'Space' : e.key)
  return parts.join(' + ')
}

const KEY_REFERENCE = [
  { key: 'Enter',  code: 'Enter',      keyCode: 13  },
  { key: 'Escape', code: 'Escape',     keyCode: 27  },
  { key: 'Tab',    code: 'Tab',        keyCode: 9   },
  { key: 'Space',  code: 'Space',      keyCode: 32  },
  { key: '↑',      code: 'ArrowUp',    keyCode: 38  },
  { key: '↓',      code: 'ArrowDown',  keyCode: 40  },
  { key: '←',      code: 'ArrowLeft',  keyCode: 37  },
  { key: '→',      code: 'ArrowRight', keyCode: 39  },
  { key: 'F1',     code: 'F1',         keyCode: 112 },
  { key: 'F2',     code: 'F2',         keyCode: 113 },
  { key: 'F3',     code: 'F3',         keyCode: 114 },
  { key: 'F4',     code: 'F4',         keyCode: 115 },
  { key: 'F5',     code: 'F5',         keyCode: 116 },
  { key: 'F6',     code: 'F6',         keyCode: 117 },
  { key: 'F7',     code: 'F7',         keyCode: 118 },
  { key: 'F8',     code: 'F8',         keyCode: 119 },
  { key: 'F9',     code: 'F9',         keyCode: 120 },
  { key: 'F10',    code: 'F10',        keyCode: 121 },
  { key: 'F11',    code: 'F11',        keyCode: 122 },
  { key: 'F12',    code: 'F12',        keyCode: 123 },
]

export function KeyboardEventTester() {
  const [lastEvent, setLastEvent] = useState<KeyEntry | null>(null)
  const [history, setHistory] = useState<KeyEntry[]>([])
  const [isActive, setIsActive] = useState(false)
  const idRef = useRef(0)
  const areaRef = useRef<HTMLDivElement>(null)

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Tab') e.preventDefault()
    const entry: KeyEntry = {
      id: ++idRef.current,
      key: e.key,
      code: e.code,
      keyCode: e.keyCode,
      charCode: e.charCode,
      which: e.which,
      altKey: e.altKey,
      ctrlKey: e.ctrlKey,
      shiftKey: e.shiftKey,
      metaKey: e.metaKey,
      type: e.type,
      repeat: e.repeat,
      combo: buildCombo(e),
      timestamp: formatTimestamp(new Date()),
    }
    setLastEvent(entry)
    setHistory(prev => [entry, ...prev].slice(0, 20))
  }, [])

  const MOD_KEYS = lastEvent
    ? [
        { label: 'Ctrl',  active: lastEvent.ctrlKey  },
        { label: 'Alt',   active: lastEvent.altKey   },
        { label: 'Shift', active: lastEvent.shiftKey },
        { label: 'Meta',  active: lastEvent.metaKey  },
      ]
    : []

  const PROPS = lastEvent
    ? [
        { prop: 'key',      value: lastEvent.key === ' ' ? '" "' : JSON.stringify(lastEvent.key) },
        { prop: 'code',     value: JSON.stringify(lastEvent.code)    },
        { prop: 'keyCode',  value: String(lastEvent.keyCode)         },
        { prop: 'charCode', value: String(lastEvent.charCode)        },
        { prop: 'which',    value: String(lastEvent.which)           },
        { prop: 'altKey',   value: String(lastEvent.altKey)          },
        { prop: 'ctrlKey',  value: String(lastEvent.ctrlKey)         },
        { prop: 'shiftKey', value: String(lastEvent.shiftKey)        },
        { prop: 'metaKey',  value: String(lastEvent.metaKey)         },
        { prop: 'repeat',   value: String(lastEvent.repeat)          },
        { prop: 'type',     value: JSON.stringify(lastEvent.type)    },
      ]
    : []

  const keyLabel = lastEvent
    ? (lastEvent.key === ' ' ? 'Space' : lastEvent.key.length > 8 ? lastEvent.key.slice(0, 8) + '…' : lastEvent.key)
    : null

  return (
    <div className="flex flex-col gap-5">

      {/* Focus capture area */}
      <div
        ref={areaRef}
        tabIndex={0}
        role="application"
        aria-label="キーボードイベントキャプチャエリア"
        onFocus={() => setIsActive(true)}
        onBlur={() => setIsActive(false)}
        onKeyDown={handleKeyDown}
        onClick={() => areaRef.current?.focus()}
        className={`relative flex h-24 cursor-pointer select-none items-center justify-center rounded-lg border-2 outline-none transition-all duration-200 ${
          isActive
            ? 'border-teal bg-teal/5'
            : 'border-dashed border-border bg-bg hover:border-teal/50'
        }`}
      >
        {isActive && (
          <span className="absolute inset-0 animate-ping rounded-lg border border-teal/30 opacity-75" />
        )}
        <div className="relative text-center">
          {isActive ? (
            <>
              <p className="font-mono text-xs font-medium text-teal">● LISTENING</p>
              <p className="mt-1 text-xs text-teal/60">どのキーでも押してください</p>
            </>
          ) : (
            <>
              <p className="text-sm text-muted">クリックしてキーを押す</p>
              <p className="mt-1 text-xs text-muted/50">クリックしてフォーカスを当てる</p>
            </>
          )}
        </div>
      </div>

      {/* Main 2-panel area */}
      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">

        {/* Left: key display + props */}
        <div className="flex flex-col gap-4">

          {/* Keycap + modifier display */}
          {lastEvent ? (
            <div className="rounded-lg border border-border bg-bg p-5">
              <div className="flex items-start gap-5">
                {/* Keycap */}
                <div className="flex min-w-[120px] flex-col items-center justify-center rounded-lg border-2 border-border bg-surface px-4 py-5 shadow-[0_4px_0_0_rgba(0,0,0,0.4)] transition-all">
                  <span className="font-mono text-5xl font-bold leading-none text-bright">
                    {keyLabel}
                  </span>
                  <span className="mt-2 font-mono text-xs text-teal">{lastEvent.combo}</span>
                </div>

                {/* Modifier badges + meta */}
                <div className="flex flex-1 flex-col gap-3">
                  <div>
                    <p className="mb-1.5 text-xs text-muted">修飾キー</p>
                    <div className="flex flex-wrap gap-1.5">
                      {MOD_KEYS.map(({ label, active }) => (
                        <span
                          key={label}
                          className={`rounded border px-2.5 py-1 font-mono text-xs font-semibold transition-all ${
                            active
                              ? 'border-teal bg-teal/10 text-teal shadow-[0_0_8px_rgba(20,184,166,0.3)]'
                              : 'border-border text-dim'
                          }`}
                        >
                          {label}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <span className={`rounded border px-2 py-0.5 font-mono text-xs ${
                      lastEvent.repeat
                        ? 'border-amber-500/40 bg-amber-500/10 text-amber-400'
                        : 'border-border text-dim'
                    }`}>
                      repeat: {lastEvent.repeat ? 'true' : 'false'}
                    </span>
                    <span className="rounded border border-border px-2 py-0.5 font-mono text-xs text-dim">
                      type: {lastEvent.type}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex h-[132px] items-center justify-center rounded-lg border border-dashed border-border bg-bg text-sm text-muted">
              キーを押すとここに表示されます
            </div>
          )}

          {/* Properties table */}
          <div className="rounded-lg border border-border bg-bg">
            <p className="border-b border-border px-4 py-2 font-mono text-xs text-muted">
              KeyboardEvent properties
            </p>
            {lastEvent ? (
              <div className="divide-y divide-border">
                {PROPS.map(({ prop, value }) => (
                  <div key={prop} className="flex items-center px-4 py-2">
                    <span className="w-24 shrink-0 font-mono text-xs text-muted">{prop}</span>
                    <span className={`font-mono text-xs ${
                      value === 'true' ? 'text-teal' : value === 'false' ? 'text-dim' : 'text-primary'
                    }`}>{value}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="px-4 py-6 text-center text-xs text-muted">—</p>
            )}
          </div>
        </div>

        {/* Right: history */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <p className="font-mono text-xs uppercase tracking-widest text-muted">
              履歴 <span className="text-teal">{history.length}</span>/20
            </p>
            <button
              onClick={() => { setHistory([]); setLastEvent(null) }}
              disabled={history.length === 0}
              className="rounded border border-border px-2 py-0.5 text-xs text-dim transition-colors hover:text-primary disabled:cursor-not-allowed disabled:opacity-30"
            >
              クリア
            </button>
          </div>
          <div className="h-[360px] overflow-y-auto rounded-lg border border-border bg-bg">
            {history.length === 0 ? (
              <div className="flex h-full items-center justify-center text-xs text-muted">
                履歴なし
              </div>
            ) : (
              <div className="divide-y divide-border">
                {history.map((item, i) => (
                  <div
                    key={item.id}
                    className={`px-3 py-2 font-mono text-xs transition-colors ${
                      i === 0 ? 'bg-teal/5' : 'hover:bg-surface/30'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {i === 0 && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-teal" />}
                      <span className={`truncate font-semibold ${i === 0 ? 'text-teal' : 'text-primary'}`}>
                        {item.combo}
                      </span>
                    </div>
                    <div className="mt-0.5 flex gap-2 text-muted">
                      <span>{item.timestamp}</span>
                      <span className="text-dim">{item.code}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Key reference: compact 2-col grid */}
      <div>
        <p className="mb-2 font-mono text-xs uppercase tracking-widest text-muted">
          よく使うキーコード早見表
        </p>
        <div className="grid gap-1 sm:grid-cols-2">
          {KEY_REFERENCE.map((row) => (
            <div
              key={row.code}
              className="flex items-center gap-3 rounded border border-border bg-bg px-3 py-1.5 font-mono text-xs transition-colors hover:bg-surface/50"
            >
              <span className="w-10 shrink-0 font-semibold text-bright">{row.key}</span>
              <span className="flex-1 text-dim">{row.code}</span>
              <span className="shrink-0 text-teal">{row.keyCode}</span>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}
