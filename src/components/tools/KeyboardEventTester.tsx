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

  return (
    <div className="flex flex-col gap-6">

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
        className={`flex h-28 cursor-pointer select-none items-center justify-center rounded-lg border-2 outline-none transition-all ${
          isActive
            ? 'border-teal bg-teal/5 text-teal'
            : 'border-border bg-bg text-muted hover:border-teal/40 hover:text-primary'
        }`}
      >
        {isActive ? (
          <div className="text-center">
            <p className="text-sm font-medium">キー入力を待機中...</p>
            <p className="mt-1 text-xs opacity-60">どのキーでも押してください</p>
          </div>
        ) : (
          <div className="text-center">
            <p className="text-sm">クリックしてキーを押す</p>
            <p className="mt-1 text-xs opacity-50">クリックしてフォーカスを当てる</p>
          </div>
        )}
      </div>

      {/* Last key display */}
      {lastEvent ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {/* Big key display */}
          <div className="rounded-lg border border-border bg-bg p-4">
            <p className="mb-1 text-xs text-muted">最後に押したキー</p>
            <p className="font-mono text-4xl font-bold text-bright leading-none">
              {lastEvent.key === ' ' ? 'Space' : lastEvent.key.length > 6 ? lastEvent.key.slice(0, 6) + '…' : lastEvent.key}
            </p>
            <p className="mt-2 font-mono text-sm text-teal">{lastEvent.combo}</p>
          </div>

          {/* Modifier keys */}
          <div className="rounded-lg border border-border bg-bg p-4">
            <p className="mb-2 text-xs text-muted">修飾キー</p>
            <div className="flex flex-wrap gap-2">
              {MOD_KEYS.map(({ label, active }) => (
                <span
                  key={label}
                  className={`rounded px-3 py-1 font-mono text-xs font-semibold transition-colors ${
                    active ? 'bg-teal text-bg' : 'border border-border text-muted'
                  }`}
                >
                  {label}
                </span>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <span
                className={`rounded px-2 py-0.5 font-mono text-xs ${
                  lastEvent.repeat
                    ? 'bg-amber-500/20 text-amber-400'
                    : 'border border-border text-muted'
                }`}
              >
                repeat: {lastEvent.repeat ? 'true' : 'false'}
              </span>
              <span className="rounded border border-border px-2 py-0.5 font-mono text-xs text-dim">
                type: {lastEvent.type}
              </span>
            </div>
          </div>

          {/* All properties */}
          <div className="col-span-full rounded-lg border border-border bg-bg p-4">
            <p className="mb-3 text-xs text-muted">KeyboardEvent プロパティ</p>
            <div className="grid grid-cols-2 gap-x-8 gap-y-1.5 sm:grid-cols-3">
              {PROPS.map(({ prop, value }) => (
                <div key={prop} className="flex items-baseline gap-1.5 min-w-0">
                  <span className="shrink-0 font-mono text-xs text-muted">{prop}:</span>
                  <span
                    className={`truncate font-mono text-xs ${
                      value === 'true'
                        ? 'text-teal'
                        : value === 'false'
                        ? 'text-dim'
                        : 'text-primary'
                    }`}
                  >
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-border bg-bg px-6 py-8 text-center text-sm text-muted">
          キーを押すとプロパティがここに表示されます
        </div>
      )}

      {/* History */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="font-mono text-xs uppercase tracking-widest text-muted">
            履歴 ({history.length} / 20)
          </p>
          <button
            onClick={() => { setHistory([]); setLastEvent(null) }}
            disabled={history.length === 0}
            className="rounded border border-border px-2.5 py-1 text-xs text-dim transition-colors hover:border-border hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed"
          >
            クリア
          </button>
        </div>
        {history.length === 0 ? (
          <div className="rounded border border-border bg-bg px-4 py-3 text-center text-xs text-muted">
            履歴なし
          </div>
        ) : (
          <div className="overflow-x-auto rounded border border-border bg-bg">
            {history.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 border-b border-border px-4 py-2 last:border-b-0 font-mono text-xs"
              >
                <span className="shrink-0 text-muted">{item.timestamp}</span>
                <span className="shrink-0 w-32 truncate text-primary">{item.combo}</span>
                <span className="text-dim">code: {item.code}</span>
                <span className="ml-auto shrink-0 text-muted">keyCode: {item.keyCode}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Key reference table */}
      <div>
        <p className="mb-2 font-mono text-xs uppercase tracking-widest text-muted">
          よく使うキーコード早見表
        </p>
        <div className="overflow-x-auto rounded border border-border">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-surface">
                <th className="px-4 py-2 text-left font-mono font-semibold text-muted">key</th>
                <th className="px-4 py-2 text-left font-mono font-semibold text-muted">code</th>
                <th className="px-4 py-2 text-left font-mono font-semibold text-muted">keyCode</th>
              </tr>
            </thead>
            <tbody>
              {KEY_REFERENCE.map((row) => (
                <tr key={row.code} className="border-b border-border last:border-b-0 hover:bg-surface/50 transition-colors">
                  <td className="px-4 py-2 font-mono text-bright">{row.key}</td>
                  <td className="px-4 py-2 font-mono text-primary">{row.code}</td>
                  <td className="px-4 py-2 font-mono text-teal">{row.keyCode}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  )
}
