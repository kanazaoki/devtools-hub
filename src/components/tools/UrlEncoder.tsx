'use client'

import { useState, useMemo } from 'react'

type EncodeMode = 'component' | 'uri'
type TransformMode = 'encode' | 'decode'

function safeEncode(text: string, mode: EncodeMode): { result: string; error: null } | { result: null; error: string } {
  try {
    const result = mode === 'component' ? encodeURIComponent(text) : encodeURI(text)
    return { result, error: null }
  } catch {
    return { result: null, error: 'エンコードに失敗しました' }
  }
}

function safeDecode(text: string): { result: string; error: null } | { result: null; error: string } {
  try {
    const result = decodeURIComponent(text)
    return { result, error: null }
  } catch {
    return { result: null, error: '不正なパーセントエンコードが含まれています（例: %ZZ）' }
  }
}

function parseQueryParams(input: string): Array<{ key: string; value: string }> | null {
  try {
    const questionIdx = input.indexOf('?')
    if (questionIdx === -1) return null
    const queryString = input.slice(questionIdx + 1).split('#')[0]
    if (!queryString) return null
    const params = new URLSearchParams(queryString)
    const result: Array<{ key: string; value: string }> = []
    params.forEach((value, key) => result.push({ key, value }))
    return result.length > 0 ? result : null
  } catch {
    return null
  }
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
      }}
      className={`inline-flex items-center gap-1.5 rounded border px-2.5 py-1 font-mono text-[10px] transition-all duration-150 ${
        copied
          ? 'border-teal/40 bg-teal/10 text-teal'
          : 'border-border text-muted hover:border-border-hi hover:text-dim'
      }`}
    >
      {copied ? (
        <>
          <svg width="9" height="9" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Copied
        </>
      ) : 'Copy'}
    </button>
  )
}

export function UrlEncoder() {
  const [input, setInput] = useState('')
  const [transformMode, setTransformMode] = useState<TransformMode>('encode')
  const [encodeMode, setEncodeMode] = useState<EncodeMode>('component')

  const output = useMemo(() => {
    if (!input.trim()) return null
    return transformMode === 'encode'
      ? safeEncode(input, encodeMode)
      : safeDecode(input)
  }, [input, transformMode, encodeMode])

  const queryParams = useMemo(() => parseQueryParams(input), [input])

  return (
    <div className="space-y-5">

      {/* Encode / Decode セグメント */}
      <div className="flex items-center gap-4">
        <div className="inline-flex rounded-lg border border-border bg-surface p-0.5">
          {(['encode', 'decode'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setTransformMode(mode)}
              className={`rounded-md px-5 py-1.5 font-mono text-xs font-semibold transition-all duration-150 ${
                transformMode === mode
                  ? 'bg-surface-hi text-bright shadow-sm'
                  : 'text-muted hover:text-dim'
              }`}
            >
              {mode === 'encode' ? 'Encode' : 'Decode'}
            </button>
          ))}
        </div>

        {/* encodeURIComponent / encodeURI */}
        {transformMode === 'encode' && (
          <div className="flex items-center gap-2">
            {([
              { value: 'component', label: 'encodeURIComponent', sub: 'クエリ値' },
              { value: 'uri', label: 'encodeURI', sub: 'フルURL' },
            ] as const).map(({ value, label, sub }) => (
              <button
                key={value}
                onClick={() => setEncodeMode(value)}
                className={`flex items-center gap-1.5 rounded border px-2.5 py-1 font-mono text-[10px] transition-colors duration-150 ${
                  encodeMode === value
                    ? 'border-teal/40 bg-teal/10 text-teal'
                    : 'border-border text-muted hover:border-border-hi hover:text-dim'
                }`}
              >
                {label}
                <span className={`rounded px-1 py-px text-[9px] ${
                  encodeMode === value ? 'bg-teal/20 text-teal/70' : 'bg-surface-hi text-muted/60'
                }`}>
                  {sub}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Input */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted">
            {transformMode === 'encode' ? 'Input' : 'Encoded Input'}
          </span>
          <div className="flex items-center gap-3">
            {input && (
              <span className="font-mono text-[10px] tabular-nums text-muted/40">
                {input.length} chars
              </span>
            )}
            {input && (
              <button
                onClick={() => setInput('')}
                className="font-mono text-[10px] text-muted/40 transition-colors hover:text-muted"
              >
                Clear
              </button>
            )}
          </div>
        </div>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={
            transformMode === 'encode'
              ? 'エンコードしたいテキストや URL を入力...'
              : 'デコードしたい %xx 形式のテキストを入力...'
          }
          spellCheck={false}
          rows={4}
          className="w-full resize-y rounded-lg border border-border bg-bg p-4 font-mono text-xs leading-relaxed text-primary outline-none transition-colors duration-150 placeholder:text-muted/30 focus:border-teal/40 focus:ring-1 focus:ring-teal/10"
        />
      </div>

      {/* 変換インジケーター */}
      {input && (
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="font-mono text-[10px] text-muted/40">
            {transformMode === 'encode' ? '↓ encoded' : '↓ decoded'}
          </span>
          <div className="h-px flex-1 bg-border" />
        </div>
      )}

      {/* Output */}
      {input && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted">
              {transformMode === 'encode' ? 'Encoded' : 'Decoded'}
            </span>
            <div className="flex items-center gap-3">
              {output?.result && (
                <span className="font-mono text-[10px] tabular-nums text-muted/40">
                  {output.result.length} chars
                </span>
              )}
              {output?.result && <CopyButton text={output.result} />}
            </div>
          </div>

          {output?.error ? (
            <div className="rounded-lg border border-red-500/30 bg-red-500/5 px-4 py-3">
              <p className="font-mono text-xs text-red-400">✕ {output.error}</p>
            </div>
          ) : (
            <div className="relative min-h-[72px] overflow-hidden rounded-lg border border-border bg-bg">
              {/* 左アクセントライン */}
              <span
                aria-hidden="true"
                className="absolute inset-y-0 left-0 w-[2px] bg-teal/40"
              />
              <p className="break-all p-4 pl-5 font-mono text-xs leading-relaxed text-teal">
                {output?.result ?? ''}
              </p>
            </div>
          )}
        </div>
      )}

      {/* クエリパラメータパーサー */}
      {queryParams && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted">Query Parameters</span>
            <span className="rounded bg-surface-hi px-1.5 py-px font-mono text-[9px] text-muted/60">
              {queryParams.length}
            </span>
          </div>
          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-surface-hi">
                  <th className="w-2/5 px-4 py-2 text-left font-mono text-[9px] uppercase tracking-widest text-muted/60">Key</th>
                  <th className="px-4 py-2 text-left font-mono text-[9px] uppercase tracking-widest text-muted/60">Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {queryParams.map(({ key, value }, i) => (
                  <tr key={i} className="transition-colors hover:bg-surface-hi/50">
                    <td className="px-4 py-2.5 font-mono text-[11px] text-sky-400">{key}</td>
                    <td className="break-all px-4 py-2.5 font-mono text-[11px] text-primary">
                      {(() => { try { return decodeURIComponent(value) } catch { return value } })()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 空状態 */}
      {!input && (
        <div className="flex flex-col items-center gap-2 py-8">
          <p className="font-mono text-[11px] text-muted/30">
            テキストを入力するとリアルタイムで変換されます
          </p>
          <p className="font-mono text-[10px] text-muted/20">
            URL に ? が含まれるとクエリパラメータも自動で解析されます
          </p>
        </div>
      )}
    </div>
  )
}
