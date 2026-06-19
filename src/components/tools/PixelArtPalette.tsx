'use client'

import { useRef, useEffect, useState, useCallback } from 'react'

const INITIAL_PALETTE = [
  '#1a1c2c', '#5d275d', '#b13e53', '#ef7d57',
  '#ffcd75', '#a7f070', '#38b764', '#29366f',
]

type Tool = 'pen' | 'eraser' | 'fill'
type GridSize = 16 | 32

const CANVAS_PX = 320

const TOOL_CONFIG: { key: Tool; label: string; icon: string; short: string }[] = [
  { key: 'pen',    label: 'ペン',       icon: '✏',  short: 'P' },
  { key: 'eraser', label: '消しゴム',   icon: '◻',  short: 'E' },
  { key: 'fill',   label: '塗りつぶし', icon: '▣',  short: 'F' },
]

export function PixelArtPalette() {
  const [gridSize, setGridSize] = useState<GridSize>(16)
  const [pixels, setPixels] = useState<string[][]>(() =>
    Array.from({ length: 16 }, () => Array(16).fill(''))
  )
  const [palette, setPalette] = useState<string[]>(INITIAL_PALETTE)
  const [activeColor, setActiveColor] = useState(INITIAL_PALETTE[0])
  const [tool, setTool] = useState<Tool>('pen')
  const [hexInput, setHexInput] = useState('')
  const [extractedColors, setExtractedColors] = useState<string[]>([])
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const isDrawingRef = useRef(false)

  const cellSize = CANVAS_PX / gridSize

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, CANVAS_PX, CANVAS_PX)
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        const color = pixels[r]?.[c]
        if (color) {
          ctx.fillStyle = color
          ctx.fillRect(c * cellSize, r * cellSize, cellSize, cellSize)
        }
      }
    }

    ctx.strokeStyle = 'rgba(255,255,255,0.07)'
    ctx.lineWidth = 0.5
    for (let i = 0; i <= gridSize; i++) {
      ctx.beginPath()
      ctx.moveTo(i * cellSize, 0)
      ctx.lineTo(i * cellSize, CANVAS_PX)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(0, i * cellSize)
      ctx.lineTo(CANVAS_PX, i * cellSize)
      ctx.stroke()
    }
  }, [pixels, gridSize, cellSize])

  const getPixelPos = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current
      if (!canvas) return null
      const rect = canvas.getBoundingClientRect()
      const x = (e.clientX - rect.left) * (CANVAS_PX / rect.width)
      const y = (e.clientY - rect.top) * (CANVAS_PX / rect.height)
      const c = Math.floor(x / cellSize)
      const r = Math.floor(y / cellSize)
      if (r < 0 || r >= gridSize || c < 0 || c >= gridSize) return null
      return { r, c }
    },
    [cellSize, gridSize]
  )

  const drawPixel = useCallback(
    (r: number, c: number) => {
      setPixels((prev) => {
        const next = prev.map((row) => [...row])
        next[r][c] = tool === 'eraser' ? '' : activeColor
        return next
      })
    },
    [tool, activeColor]
  )

  const floodFill = useCallback(
    (startR: number, startC: number) => {
      setPixels((prev) => {
        const targetColor = prev[startR][startC]
        if (targetColor === activeColor) return prev
        const next = prev.map((row) => [...row])
        const queue: [number, number][] = [[startR, startC]]
        const visited = new Set<string>()
        visited.add(`${startR},${startC}`)
        while (queue.length > 0) {
          const [r, c] = queue.shift()!
          next[r][c] = activeColor
          for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
            const nr = r + dr
            const nc = c + dc
            const key = `${nr},${nc}`
            if (
              nr >= 0 && nr < gridSize &&
              nc >= 0 && nc < gridSize &&
              !visited.has(key) &&
              next[nr][nc] === targetColor
            ) {
              visited.add(key)
              queue.push([nr, nc])
            }
          }
        }
        return next
      })
    },
    [activeColor, gridSize]
  )

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      e.preventDefault()
      isDrawingRef.current = true
      const pos = getPixelPos(e)
      if (!pos) return
      if (tool === 'fill') {
        floodFill(pos.r, pos.c)
      } else {
        drawPixel(pos.r, pos.c)
      }
    },
    [getPixelPos, tool, floodFill, drawPixel]
  )

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isDrawingRef.current || tool === 'fill') return
      const pos = getPixelPos(e)
      if (!pos) return
      drawPixel(pos.r, pos.c)
    },
    [getPixelPos, tool, drawPixel]
  )

  const handleMouseUp = useCallback(() => {
    isDrawingRef.current = false
  }, [])

  const addColor = () => {
    const hex = hexInput.trim().toLowerCase()
    if (!/^#[0-9a-f]{6}$/.test(hex)) return
    if (palette.includes(hex)) { setActiveColor(hex); setHexInput(''); return }
    setPalette((prev) => [...prev, hex])
    setActiveColor(hex)
    setHexInput('')
  }

  const removeColor = (color: string) => {
    setPalette((prev) => prev.filter((c) => c !== color))
    if (activeColor === color) {
      setActiveColor(palette.filter((c) => c !== color)[0] ?? '')
    }
  }

  const changeGridSize = (size: GridSize) => {
    setGridSize(size)
    setPixels(Array.from({ length: size }, () => Array(size).fill('')))
    setExtractedColors([])
  }

  const clearCanvas = () => {
    setPixels(Array.from({ length: gridSize }, () => Array(gridSize).fill('')))
    setExtractedColors([])
  }

  const extractColors = () => {
    const colors = new Set<string>()
    for (const row of pixels) {
      for (const c of row) {
        if (c) colors.add(c)
      }
    }
    setExtractedColors([...colors])
  }

  const exportPng = (scale: number) => {
    const size = gridSize * scale
    const exportCanvas = document.createElement('canvas')
    exportCanvas.width = size
    exportCanvas.height = size
    const ctx = exportCanvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, size, size)
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        const color = pixels[r]?.[c]
        if (color) {
          ctx.fillStyle = color
          ctx.fillRect(c * scale, r * scale, scale, scale)
        }
      }
    }
    const url = exportCanvas.toDataURL('image/png')
    const a = document.createElement('a')
    a.href = url
    a.download = `pixel-art-${gridSize}x${gridSize}${scale > 1 ? `@${scale}x` : ''}.png`
    a.click()
  }

  return (
    <div className="overflow-hidden rounded border border-border">
      <div className="flex flex-col lg:flex-row">

        {/* ── Left panel ── */}
        <div className="w-full shrink-0 border-b border-border lg:w-52 lg:border-b-0 lg:border-r">

          {/* Active color */}
          <div className="flex items-center gap-3 border-b border-border px-4 py-3">
            <div
              style={{ background: activeColor || 'transparent' }}
              className="h-9 w-9 shrink-0 border border-white/20"
            />
            <div className="min-w-0">
              <p className="font-mono text-[9px] uppercase tracking-widest text-muted">Active</p>
              <p className="font-mono text-sm font-semibold text-bright truncate">{activeColor || '—'}</p>
            </div>
          </div>

          {/* Palette */}
          <div className="border-b border-border px-4 py-3">
            <p className="mb-2.5 font-mono text-[9px] uppercase tracking-widest text-muted">Palette</p>
            <div className="mb-3 grid grid-cols-4 gap-1.5">
              {palette.map((color) => (
                <div key={color} className="group relative">
                  <button
                    onClick={() => setActiveColor(color)}
                    style={{ background: color }}
                    className={`block w-full aspect-square transition-all duration-100 ${
                      activeColor === color
                        ? 'ring-2 ring-white ring-offset-1 ring-offset-bg'
                        : 'ring-1 ring-transparent hover:ring-border hover:ring-offset-1 hover:ring-offset-bg'
                    }`}
                    title={color}
                    aria-label={`色 ${color} を選択`}
                  />
                  <button
                    onClick={() => removeColor(color)}
                    className="absolute -right-1 -top-1 hidden h-4 w-4 items-center justify-center border border-border bg-bg text-[9px] leading-none text-muted hover:text-primary group-hover:flex"
                    aria-label={`${color} を削除`}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-1.5">
              <input
                type="color"
                value={hexInput.match(/^#[0-9a-fA-F]{6}$/) ? hexInput : '#000000'}
                onChange={(e) => setHexInput(e.target.value)}
                className="h-7 w-7 shrink-0 cursor-pointer border border-border bg-bg p-0.5"
                aria-label="カラーピッカー"
              />
              <input
                type="text"
                value={hexInput}
                onChange={(e) => setHexInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addColor()}
                placeholder="#rrggbb"
                maxLength={7}
                className="min-w-0 flex-1 border border-border bg-bg px-2 font-mono text-[11px] text-primary placeholder:text-muted/60 focus:border-teal/40 focus:outline-none"
              />
              <button
                onClick={addColor}
                className="shrink-0 border border-border px-2 text-xs text-dim transition-colors hover:bg-surface hover:text-primary"
              >
                +
              </button>
            </div>
          </div>

          {/* Tools */}
          <div className="border-b border-border px-4 py-3">
            <p className="mb-2.5 font-mono text-[9px] uppercase tracking-widest text-muted">Tool</p>
            <div className="grid grid-cols-3 gap-1">
              {TOOL_CONFIG.map(({ key, label, icon, short }) => (
                <button
                  key={key}
                  onClick={() => setTool(key)}
                  title={label}
                  className={`flex flex-col items-center gap-0.5 py-2 text-center transition-colors ${
                    tool === key
                      ? 'border border-teal/50 bg-teal/[0.08] text-teal'
                      : 'border border-border text-dim hover:bg-surface hover:text-primary'
                  }`}
                >
                  <span className="text-base leading-none">{icon}</span>
                  <span className="font-mono text-[9px] uppercase tracking-wider">{short}</span>
                </button>
              ))}
            </div>
            <p className="mt-2 text-[9px] text-muted/60 text-center">
              {TOOL_CONFIG.find(t => t.key === tool)?.label}
            </p>
          </div>

          {/* Grid size + Clear */}
          <div className="px-4 py-3">
            <p className="mb-2.5 font-mono text-[9px] uppercase tracking-widest text-muted">Size</p>
            <div className="mb-2 flex gap-1">
              {([16, 32] as GridSize[]).map((s) => (
                <button
                  key={s}
                  onClick={() => changeGridSize(s)}
                  className={`flex-1 py-1.5 font-mono text-[11px] transition-colors ${
                    gridSize === s
                      ? 'border border-teal/50 bg-teal/[0.08] text-teal'
                      : 'border border-border text-dim hover:bg-surface hover:text-primary'
                  }`}
                >
                  {s}×{s}
                </button>
              ))}
            </div>
            <button
              onClick={clearCanvas}
              className="w-full border border-border py-1.5 text-[11px] text-dim transition-colors hover:border-border/60 hover:text-primary"
            >
              Clear
            </button>
          </div>
        </div>

        {/* ── Center: Canvas ── */}
        <div className="flex flex-col border-b border-border lg:border-b-0 lg:border-r">
          <div className="flex items-center justify-between border-b border-border px-4 py-2">
            <span className="font-mono text-[9px] uppercase tracking-widest text-muted">Canvas</span>
            <span className="font-mono text-[9px] text-dim">{gridSize} × {gridSize} px</span>
          </div>

          <div
            style={{
              background:
                'repeating-conic-gradient(#1c1c1c 0% 25%, #232323 0% 50%) 0 0 / 12px 12px',
            }}
          >
            <canvas
              ref={canvasRef}
              width={CANVAS_PX}
              height={CANVAS_PX}
              style={{
                display: 'block',
                width: '320px',
                height: '320px',
                cursor: tool === 'fill' ? 'cell' : 'crosshair',
                imageRendering: 'pixelated',
              }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            />
          </div>

          <div className="flex gap-0 border-t border-border">
            <button
              onClick={() => exportPng(1)}
              className="flex-1 border-r border-border py-2.5 text-[11px] font-mono text-dim transition-colors hover:bg-surface hover:text-primary"
            >
              1× PNG
            </button>
            <button
              onClick={() => exportPng(8)}
              className="flex-1 bg-teal/[0.10] py-2.5 text-[11px] font-mono font-semibold text-teal transition-colors hover:bg-teal/[0.18]"
            >
              8× PNG ↓
            </button>
          </div>
        </div>

        {/* ── Right: Color extraction ── */}
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center justify-between border-b border-border px-4 py-2">
            <span className="font-mono text-[9px] uppercase tracking-widest text-muted">
              Used Colors
              {extractedColors.length > 0 && (
                <span className="ml-2 text-teal">{extractedColors.length}</span>
              )}
            </span>
            <button
              onClick={extractColors}
              className="font-mono text-[10px] text-dim transition-colors hover:text-teal"
            >
              使用色を抽出
            </button>
          </div>

          <div className="flex-1 p-4">
            {extractedColors.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
                <span className="text-2xl opacity-20">◻</span>
                <p className="font-mono text-[10px] text-muted">描いてからスキャン</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {extractedColors.map((color) => (
                  <div
                    key={color}
                    className="flex items-center gap-2.5 rounded-none border border-border bg-bg/60 px-2.5 py-1.5"
                  >
                    <div
                      style={{ background: color }}
                      className="h-5 w-5 shrink-0 border border-white/10"
                    />
                    <span className="font-mono text-[11px] text-primary">{color}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
