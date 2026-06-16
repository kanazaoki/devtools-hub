'use client'

import { useState, useCallback, useRef } from 'react'

type Mode = 'encode' | 'decode'
type EncodeTab = 'text' | 'image'
type OutputFormat = 'pure' | 'datauri'
type Encoding = 'standard' | 'urlsafe'

function toBase64(input: string, urlSafe: boolean): string {
  const bytes = new TextEncoder().encode(input)
  let binary = ''
  bytes.forEach((b) => (binary += String.fromCharCode(b)))
  const b64 = btoa(binary)
  return urlSafe ? b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '') : b64
}

function fromBase64(input: string): string {
  let normalized = input.replace(/-/g, '+').replace(/_/g, '/')
  while (normalized.length % 4) normalized += '='
  const binary = atob(normalized)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new TextDecoder().decode(bytes)
}

function stripDataPrefix(s: string): string {
  const m = s.match(/^data:[^;]+;base64,([\s\S]+)/)
  return m ? m[1].trim() : s
}

type DecodeResult =
  | { type: 'empty' }
  | { type: 'text'; text: string }
  | { type: 'image'; src: string }
  | { type: 'error'; message: string }

export function Base64Studio() {
  const [mode, setMode] = useState<Mode>('encode')
  const [encodeTab, setEncodeTab] = useState<EncodeTab>('text')
  const [outputFormat, setOutputFormat] = useState<OutputFormat>('pure')
  const [encoding, setEncoding] = useState<Encoding>('standard')

  const [textInput, setTextInput] = useState('')
  const [imageDataUri, setImageDataUri] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)

  const [decodeInput, setDecodeInput] = useState('')

  const [copiedEncode, setCopiedEncode] = useState(false)
  const [copiedDecode, setCopiedDecode] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const encodeOutput = (() => {
    if (encodeTab === 'text') {
      if (!textInput) return ''
      try {
        const b64 = toBase64(textInput, encoding === 'urlsafe')
        return outputFormat === 'datauri' ? `data:text/plain;base64,${b64}` : b64
      } catch { return '' }
    } else {
      if (!imageDataUri) return ''
      if (outputFormat === 'pure') {
        const b64 = imageDataUri.split(',')[1] ?? ''
        return encoding === 'urlsafe'
          ? b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
          : b64
      }
      return imageDataUri
    }
  })()

  const decodeResult: DecodeResult = (() => {
    const raw = decodeInput.trim()
    if (!raw) return { type: 'empty' }
    if (raw.startsWith('data:image/')) return { type: 'image', src: raw }
    try {
      return { type: 'text', text: fromBase64(stripDataPrefix(raw)) }
    } catch (e) {
      return { type: 'error', message: (e as Error).message }
    }
  })()

  const handleImageFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = (e) => setImageDataUri(e.target?.result as string)
    reader.readAsDataURL(file)
  }, [])

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleImageFile(file)
  }

  const copyEncode = () => {
    if (!encodeOutput) return
    navigator.clipboard.writeText(encodeOutput)
    setCopiedEncode(true)
    setTimeout(() => setCopiedEncode(false), 1500)
  }

  const copyDecode = () => {
    if (decodeResult.type !== 'text') return
    navigator.clipboard.writeText(decodeResult.text)
    setCopiedDecode(true)
    setTimeout(() => setCopiedDecode(false), 1500)
  }

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-surface-hi px-4 py-2.5">
        <div className="flex gap-1 rounded-md border border-border p-1">
          {(['encode', 'decode'] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`rounded px-4 py-1 font-mono text-xs font-semibold transition-all ${
                mode === m ? 'bg-teal text-bg' : 'text-muted hover:text-primary'
              }`}
            >
              {m === 'encode' ? '⬆ Encode' : '⬇ Decode'}
            </button>
          ))}
        </div>

        <div className="flex gap-1 rounded-md border border-border p-1">
          {(['standard', 'urlsafe'] as Encoding[]).map((e) => (
            <button
              key={e}
              onClick={() => setEncoding(e)}
              className={`rounded px-3 py-1 font-mono text-xs transition-all ${
                encoding === e ? 'bg-teal/20 text-teal' : 'text-muted hover:text-primary'
              }`}
            >
              {e === 'standard' ? 'Standard' : 'URL-safe'}
            </button>
          ))}
        </div>
      </div>

      {/* Encode */}
      {mode === 'encode' && (
        <div className="grid gap-3 lg:grid-cols-2">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted">Input</p>
              <div className="ml-1 flex gap-1 rounded border border-border p-0.5">
                {(['text', 'image'] as EncodeTab[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => setEncodeTab(t)}
                    className={`rounded px-2.5 py-0.5 font-mono text-[10px] transition-all ${
                      encodeTab === t ? 'bg-teal/20 text-teal' : 'text-muted hover:text-primary'
                    }`}
                  >
                    {t === 'text' ? 'Text' : 'Image'}
                  </button>
                ))}
              </div>
              <button
                onClick={() => { setTextInput(''); setImageDataUri(null) }}
                className="ml-auto font-mono text-[10px] text-muted/50 transition-colors hover:text-red-400"
              >
                Clear
              </button>
            </div>

            {encodeTab === 'text' ? (
              <textarea
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="テキストを入力 → リアルタイムで Base64 に変換"
                spellCheck={false}
                className="h-64 w-full resize-y rounded-lg border border-border bg-[#111827] p-4 font-mono text-xs leading-relaxed text-primary outline-none transition-colors focus:border-teal/40"
              />
            ) : (
              <div
                onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`flex h-64 cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed transition-all ${
                  dragging ? 'border-teal bg-teal/5' : 'border-border hover:border-border-hi'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) handleImageFile(f)
                    e.target.value = ''
                  }}
                />
                {imageDataUri ? (
                  <img src={imageDataUri} alt="preview" className="max-h-52 max-w-full rounded object-contain" />
                ) : (
                  <>
                    <span className="text-2xl opacity-30">⤓</span>
                    <span className="font-mono text-xs text-muted">PNG / JPG をドロップ / クリック</span>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted">Output</p>
              <div className="ml-1 flex gap-1 rounded border border-border p-0.5">
                {(['pure', 'datauri'] as OutputFormat[]).map((f) => (
                  <button
                    key={f}
                    onClick={() => setOutputFormat(f)}
                    className={`rounded px-2.5 py-0.5 font-mono text-[10px] transition-all ${
                      outputFormat === f ? 'bg-teal/20 text-teal' : 'text-muted hover:text-primary'
                    }`}
                  >
                    {f === 'pure' ? 'Pure Base64' : 'Data URI'}
                  </button>
                ))}
              </div>
              <button
                onClick={copyEncode}
                disabled={!encodeOutput}
                className="ml-auto rounded-md bg-teal px-3 py-1 font-mono text-xs font-semibold text-bg transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-30"
              >
                {copiedEncode ? '✓ コピー済み' : 'コピー'}
              </button>
            </div>
            <textarea
              readOnly
              value={encodeOutput}
              placeholder="Base64 の出力がここに表示されます..."
              className="h-64 w-full resize-y rounded-lg border border-border bg-[#111827] p-4 font-mono text-xs leading-relaxed text-dim outline-none"
            />
          </div>
        </div>
      )}

      {/* Decode */}
      {mode === 'decode' && (
        <div className="grid gap-3 lg:grid-cols-2">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted">Base64 Input</p>
              <button
                onClick={() => setDecodeInput(stripDataPrefix(decodeInput.trim()))}
                className="ml-auto rounded border border-border px-2 py-0.5 font-mono text-[10px] text-muted transition-colors hover:border-border-hi hover:text-primary"
              >
                Strip prefix
              </button>
              <button
                onClick={() => setDecodeInput('')}
                className="font-mono text-[10px] text-muted/50 transition-colors hover:text-red-400"
              >
                Clear
              </button>
            </div>
            <textarea
              value={decodeInput}
              onChange={(e) => setDecodeInput(e.target.value)}
              placeholder={'Base64 文字列を貼り付け...\nData URI (data:image/...) → 画像として表示'}
              spellCheck={false}
              className="h-64 w-full resize-y rounded-lg border border-border bg-[#111827] p-4 font-mono text-xs leading-relaxed text-primary outline-none transition-colors focus:border-teal/40"
            />
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted">Output</p>
              {decodeResult.type === 'text' && (
                <button
                  onClick={copyDecode}
                  className="ml-auto rounded-md bg-teal px-3 py-1 font-mono text-xs font-semibold text-bg transition-opacity hover:opacity-80"
                >
                  {copiedDecode ? '✓ コピー済み' : 'コピー'}
                </button>
              )}
            </div>

            {decodeResult.type === 'empty' && (
              <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-border font-mono text-xs text-muted/30">
                出力がここに表示されます
              </div>
            )}
            {decodeResult.type === 'text' && (
              <textarea
                readOnly
                value={decodeResult.text}
                className="h-64 w-full resize-y rounded-lg border border-border bg-[#111827] p-4 font-mono text-xs leading-relaxed text-dim outline-none"
              />
            )}
            {decodeResult.type === 'image' && (
              <div className="flex h-64 items-center justify-center rounded-lg border border-border bg-[#111827] p-3">
                <img src={decodeResult.src} alt="decoded" className="max-h-full max-w-full rounded object-contain" />
              </div>
            )}
            {decodeResult.type === 'error' && (
              <div className="flex h-64 flex-col gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-4">
                <span className="font-mono text-xs text-red-400">✕ デコードエラー</span>
                <p className="font-mono text-xs text-red-400/70">{decodeResult.message}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
