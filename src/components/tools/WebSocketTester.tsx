'use client'
import { useState, useRef, useEffect, useCallback } from 'react'

type MsgDir = 'sent' | 'recv' | 'info' | 'error'
type MsgEntry = { id: number; dir: MsgDir; text: string; time: string }

const DIR_COLOR: Record<MsgDir, string> = {
  sent: 'text-teal',
  recv: 'text-blue-400',
  info: 'text-muted',
  error: 'text-red-400',
}
const DIR_LABEL: Record<MsgDir, string> = {
  sent: '↑ SENT',
  recv: '↓ RECV',
  info: '── INFO',
  error: '✕ ERROR',
}

export function WebSocketTester() {
  const [url, setUrl] = useState('wss://echo.websocket.org')
  const [status, setStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected')
  const [messages, setMessages] = useState<MsgEntry[]>([])
  const [input, setInput] = useState('')
  const wsRef = useRef<WebSocket | null>(null)
  const idRef = useRef(0)
  const logEndRef = useRef<HTMLDivElement>(null)

  const addMsg = useCallback((dir: MsgDir, text: string) => {
    const time = new Date().toLocaleTimeString('ja-JP', { hour12: false })
    setMessages((prev) => [...prev, { id: idRef.current++, dir, text, time }])
  }, [])

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const connect = () => {
    if (wsRef.current) wsRef.current.close()
    setStatus('connecting')
    addMsg('info', `接続中: ${url}`)
    try {
      const ws = new WebSocket(url)
      wsRef.current = ws
      ws.onopen = () => { setStatus('connected'); addMsg('info', '✓ 接続しました') }
      ws.onmessage = (e) => addMsg('recv', typeof e.data === 'string' ? e.data : '[Binary Data]')
      ws.onerror = () => { setStatus('error'); addMsg('error', '接続エラー') }
      ws.onclose = (e) => {
        setStatus('disconnected')
        addMsg('info', `切断 (code: ${e.code}${e.reason ? ', ' + e.reason : ''})`)
      }
    } catch (err) {
      setStatus('error')
      addMsg('error', String(err))
    }
  }

  const disconnect = () => {
    wsRef.current?.close()
    wsRef.current = null
  }

  const send = () => {
    if (!input.trim() || wsRef.current?.readyState !== WebSocket.OPEN) return
    wsRef.current.send(input)
    addMsg('sent', input)
    setInput('')
  }

  const statusColor = {
    disconnected: 'text-muted',
    connecting: 'text-yellow-400',
    connected: 'text-teal',
    error: 'text-red-400',
  }[status]
  const statusLabel = {
    disconnected: '切断',
    connecting: '接続中…',
    connected: '接続済み',
    error: 'エラー',
  }[status]

  return (
    <div className="space-y-4">
      {/* URL bar */}
      <div className="flex gap-2">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && status === 'disconnected' && connect()}
          placeholder="wss://echo.websocket.org"
          className="flex-1 rounded border border-border bg-bg px-3 py-2 font-mono text-sm text-bright placeholder:text-muted focus:border-teal focus:outline-none"
        />
        {status === 'connected' ? (
          <button
            onClick={disconnect}
            className="rounded bg-red-500/20 px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-500/30"
          >
            切断
          </button>
        ) : (
          <button
            onClick={connect}
            disabled={status === 'connecting'}
            className="rounded bg-teal/20 px-4 py-2 text-sm font-medium text-teal hover:bg-teal/30 disabled:opacity-50"
          >
            接続
          </button>
        )}
      </div>

      {/* Status bar */}
      <div className="flex items-center gap-2">
        <span className={`font-mono text-xs ${statusColor}`}>● {statusLabel}</span>
        {messages.length > 0 && (
          <button
            onClick={() => setMessages([])}
            className="ml-auto text-xs text-muted hover:text-bright"
          >
            ログをクリア
          </button>
        )}
      </div>

      {/* Message log */}
      <div className="h-72 overflow-y-auto rounded border border-border bg-bg p-3 font-mono text-xs">
        {messages.length === 0 ? (
          <p className="text-muted">接続してメッセージを送受信するとここに表示されます</p>
        ) : (
          messages.map((m) => (
            <div key={m.id} className="flex gap-2 py-0.5">
              <span className="shrink-0 text-muted">{m.time}</span>
              <span className={`shrink-0 ${DIR_COLOR[m.dir]}`}>{DIR_LABEL[m.dir]}</span>
              <span className="break-all text-bright">{m.text}</span>
            </div>
          ))
        )}
        <div ref={logEndRef} />
      </div>

      {/* Send bar */}
      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          disabled={status !== 'connected'}
          placeholder='{"type":"ping"} または任意のテキスト'
          className="flex-1 rounded border border-border bg-bg px-3 py-2 font-mono text-sm text-bright placeholder:text-muted focus:border-teal focus:outline-none disabled:opacity-40"
        />
        <button
          onClick={send}
          disabled={status !== 'connected' || !input.trim()}
          className="rounded bg-teal/20 px-4 py-2 text-sm font-medium text-teal hover:bg-teal/30 disabled:opacity-40"
        >
          送信
        </button>
      </div>

      <p className="text-xs text-muted">
        ヒント: <span className="font-mono text-dim">wss://echo.websocket.org</span> はエコーサーバーです（送信した内容がそのまま返ってきます）
      </p>
    </div>
  )
}
