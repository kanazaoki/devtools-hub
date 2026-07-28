'use client'

import React, { useState, useCallback, useEffect, useRef, useImperativeHandle, forwardRef } from 'react'
import JSZip from 'jszip'
import { drawPreview } from './mockup/previewRenderer'

// ── Export sizes ─────────────────────────────────────────────────────────
const SIZES: Record<string, { width: number; height: number; folder: string; label: string }> = {
  iphone_67:    { width: 1290, height: 2796, folder: 'appstore',   label: 'iPhone_6.7in' },
  iphone_65:    { width: 1242, height: 2688, folder: 'appstore',   label: 'iPhone_6.5in' },
  iphone_55:    { width: 1242, height: 2208, folder: 'appstore',   label: 'iPhone_5.5in' },
  android_play: { width: 1080, height: 1920, folder: 'googleplay', label: 'Android_Play' },
  ipad_129:     { width: 2048, height: 2732, folder: 'appstore',   label: 'iPad_12.9in' },
  ipad_11:      { width: 1668, height: 2388, folder: 'appstore',   label: 'iPad_11in' },
}

const PREVIEW_DEVICES: Record<string, { w: number; h: number; label: string }> = {
  iphone:  { w: 1290, h: 2796, label: 'iPhone' },
  ipad:    { w: 2048, h: 2732, label: 'iPad' },
  android: { w: 1080, h: 1920, label: 'Android' },
}

const STORAGE_KEY    = 'mockupbuilder-web-v1'
const TEMPLATES_KEY  = 'mockupbuilder-web-templates-v1'

const DEFAULT_PILL              = { enabled: false, color: '#000000', opacity: 50 }
const DEFAULT_OUTLINE           = { enabled: false, color: '#000000', width: 2 }
const DEFAULT_OVERLAY           = { enabled: false, color: '#000000', opacity: 30 }
const DEFAULT_FRAME_SHADOW      = { enabled: false, color: '#000000', blur: 20, offsetY: 10, opacity: 60 }
const DEFAULT_SCREENSHOT_FILTER = { brightness: 100, contrast: 100, saturation: 100 }
const DEFAULT_TEXT_SHADOW       = { enabled: true, color: '#000000', opacity: 60, blur: 8 }

function loadSaved(): any {
  if (typeof window === 'undefined') return {}
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') } catch { return {} }
}

// ═══════════════════════════════════════════════════════════════════════
// Small building blocks
// ═══════════════════════════════════════════════════════════════════════

function CollapsibleSection({ label, defaultOpen = true, children }: any) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o: boolean) => !o)}
        className={['w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-all duration-150 group',
          open ? 'bg-zinc-800/50' : 'hover:bg-zinc-800/25'].join(' ')}
      >
        <span className={['w-[2px] h-3 rounded-full shrink-0 transition-all duration-200',
          open ? 'bg-teal/70' : 'bg-zinc-700'].join(' ')} />
        <span className={['text-[10px] font-semibold tracking-[0.14em] uppercase flex-1 transition-colors',
          open ? 'text-zinc-300' : 'text-zinc-500 group-hover:text-zinc-400'].join(' ')}>{label}</span>
        <svg width="9" height="5" viewBox="0 0 9 5" fill="none"
          className={['shrink-0 transition-transform duration-200', open ? 'text-zinc-500' : 'text-zinc-700 -rotate-90'].join(' ')}>
          <path d="M1 1l3.5 3L8 1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && <div className="px-3 pb-3.5 pt-2">{children}</div>}
    </div>
  )
}

// ── MultiDropZone ────────────────────────────────────────────────────────
function MultiDropZone({ images, activeIndex, onImages, onActiveChange }: any) {
  const inputRef = useRef<HTMLInputElement>(null)
  const addInputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const MAX = 8

  const processFiles = (files: FileList) => {
    const valid = Array.from(files).filter((f) => /^image\/(png|jpeg)$/.test(f.type))
    if (!valid.length) return
    const toAdd = valid.slice(0, MAX - images.length)
    const pending: any[] = []
    toAdd.forEach((file) => {
      const url = URL.createObjectURL(file)
      const el = new Image()
      el.onload = () => {
        pending.push({ id: Date.now() + Math.random(), file, url, el })
        if (pending.length === toAdd.length) {
          onImages((prev: any[]) => {
            const next = [...prev, ...pending]
            onActiveChange(next.length - 1)
            return next
          })
        }
      }
      el.src = url
    })
  }

  const removeImage = (id: number, e: React.MouseEvent) => {
    e.stopPropagation()
    onImages((prev: any[]) => {
      const next = prev.filter((img) => img.id !== id)
      onActiveChange(Math.min(activeIndex, Math.max(0, next.length - 1)))
      return next
    })
  }

  if (images.length === 0) {
    return (
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); processFiles(e.dataTransfer.files) }}
        onClick={() => inputRef.current?.click()}
        className={['flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed cursor-pointer transition-all min-h-[140px]',
          dragging ? 'border-teal/60 bg-teal/5 scale-[1.01]' : 'border-zinc-700 hover:border-zinc-600 bg-zinc-800/20'].join(' ')}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-zinc-500">
          <path d="M12 4v12M7 9l5-5 5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M4 18v1a2 2 0 002 2h12a2 2 0 002-2v-1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
        <div className="text-center">
          <p className="text-sm text-zinc-400 font-medium">PNG・JPG をドロップ</p>
          <p className="text-xs text-zinc-600 mt-1">複数まとめてドロップも可（最大{MAX}枚）</p>
        </div>
        <input ref={inputRef} type="file" accept="image/png,image/jpeg" multiple className="hidden"
          onChange={(e) => { if (e.target.files) processFiles(e.target.files); e.target.value = '' }} />
      </div>
    )
  }

  const active = images[activeIndex] || images[0]
  return (
    <div className="flex flex-col gap-2">
      <div className="relative rounded-xl overflow-hidden border border-zinc-700/60 bg-zinc-800/30 flex items-center justify-center min-h-[130px] cursor-pointer group"
        onClick={() => inputRef.current?.click()}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={active.url} alt="active" className="max-h-36 w-auto object-contain" />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
          <span className="opacity-0 group-hover:opacity-100 text-xs text-white transition-all">クリックで追加</span>
        </div>
        <input ref={inputRef} type="file" accept="image/png,image/jpeg" multiple className="hidden"
          onChange={(e) => { if (e.target.files) processFiles(e.target.files); e.target.value = '' }} />
      </div>
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {images.map((img: any, i: number) => (
          <div key={img.id} className="relative shrink-0 cursor-pointer" onClick={() => onActiveChange(i)}>
            <div className={['w-14 h-14 rounded-lg overflow-hidden border-2 transition-all',
              i === activeIndex ? 'border-teal' : 'border-zinc-700 opacity-60 hover:opacity-100'].join(' ')}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.url} alt={`scene ${i + 1}`} className="w-full h-full object-cover" />
            </div>
            <button type="button" onClick={(e) => removeImage(img.id, e)}
              className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-zinc-900 border border-zinc-700 flex items-center justify-center text-zinc-500 hover:text-red-400 hover:border-red-700 transition-colors text-[10px] leading-none">×</button>
            <span className="absolute bottom-0.5 left-0 right-0 text-center text-[8px] text-zinc-500">{i + 1}</span>
          </div>
        ))}
        {images.length < MAX && (
          <button type="button" onClick={() => addInputRef.current?.click()}
            className="shrink-0 w-14 h-14 rounded-lg border-2 border-dashed border-zinc-700 flex items-center justify-center text-zinc-600 hover:border-zinc-500 hover:text-zinc-400 transition-all">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
            <input ref={addInputRef} type="file" accept="image/png,image/jpeg" multiple className="hidden"
              onChange={(e) => { if (e.target.files) processFiles(e.target.files); e.target.value = '' }} />
          </button>
        )}
      </div>
      {images.length > 1 && (
        <p className="text-[10px] text-zinc-600 text-center">{images.length}枚 — ZIPに scene-1/, scene-2/... で振り分け</p>
      )}
    </div>
  )
}

// ── TextBlock ────────────────────────────────────────────────────────────
const ALIGN_OPTIONS = [
  { id: 'left', icon: '⇤' },
  { id: 'center', icon: '⇔' },
  { id: 'right', icon: '⇥' },
]

function CoordInput({ label, value, onChange }: any) {
  return (
    <label className="flex items-center gap-1">
      <span className="text-[10px] text-zinc-400 w-3">{label}</span>
      <input type="number" min={0} max={100} value={value}
        onChange={(e) => onChange(Math.max(0, Math.min(100, Number(e.target.value))))}
        className="w-11 rounded bg-zinc-800 border border-zinc-700/80 text-zinc-200 text-xs px-1.5 py-0.5 text-center tabular-nums font-mono focus:outline-none focus:border-teal/50 transition-colors" />
    </label>
  )
}

function TextBlock({
  label, placeholder, visible = true, onVisibleChange, onRemove,
  text, onTextChange, fontSize, onFontSizeChange, fontColor, onFontColorChange,
  fontBold, onFontBoldChange, align = 'center', onAlignChange,
  pill, onPillChange, outline, onOutlineChange, shadow, onShadowChange,
  x, onXChange, y, onYChange,
}: any) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1">
        <span className={['text-[10px] font-semibold tracking-[0.12em] uppercase flex-1 transition-colors', visible ? 'text-zinc-400' : 'text-zinc-700'].join(' ')}>{label}</span>
        {onRemove && (
          <button type="button" onClick={onRemove} title="削除"
            className="w-5 h-5 rounded flex items-center justify-center text-[13px] leading-none text-zinc-700 hover:text-red-400 hover:bg-red-900/20 transition-all">×</button>
        )}
        {onVisibleChange && (
          <button type="button" onClick={() => onVisibleChange(!visible)} title={visible ? '非表示' : '表示'}
            className={['w-5 h-5 rounded flex items-center justify-center transition-all', visible ? 'text-zinc-600 hover:text-zinc-300' : 'text-zinc-800 hover:text-zinc-600'].join(' ')}>
            {visible ? (
              <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M1 7s2.5-4 6-4 6 4 6 4-2.5 4-6 4-6-4-6-4z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" /><circle cx="7" cy="7" r="1.8" stroke="currentColor" strokeWidth="1.3" /></svg>
            ) : (
              <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M1 7s2.5-4 6-4 6 4 6 4-2.5 4-6 4-6-4-6-4z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" opacity="0.35" /><circle cx="7" cy="7" r="1.8" stroke="currentColor" strokeWidth="1.3" opacity="0.35" /><line x1="2.5" y1="2.5" x2="11.5" y2="11.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>
            )}
          </button>
        )}
      </div>

      <div className={visible ? '' : 'opacity-25 pointer-events-none select-none'}>
        <textarea value={text} onChange={(e) => onTextChange(e.target.value)} placeholder={placeholder} rows={2}
          className="w-full rounded-lg bg-zinc-900 border border-zinc-700/60 text-zinc-100 placeholder-zinc-700 px-2.5 py-2 text-[13px] resize-none leading-relaxed focus:outline-none focus:border-teal/40 transition-colors mb-1.5" />

        <div className="flex items-center gap-1.5">
          <input type="range" min={14} max={200} value={fontSize} onChange={(e) => onFontSizeChange(Number(e.target.value))} className="flex-1 min-w-0 accent-teal" />
          <span className="text-[10px] text-zinc-500 font-mono w-6 text-right tabular-nums shrink-0">{fontSize}</span>
          <input type="color" value={fontColor} onChange={(e) => onFontColorChange(e.target.value)} title="文字色" className="w-6 h-6 rounded-md cursor-pointer shrink-0" style={{ colorScheme: 'dark' }} />
          <button type="button" title="太字" onClick={() => onFontBoldChange(!fontBold)}
            className={['w-6 h-6 rounded-md flex items-center justify-center text-[11px] font-black border transition-all shrink-0',
              fontBold ? 'border-teal/40 bg-teal/12 text-teal' : 'border-zinc-700/80 bg-zinc-800/40 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300'].join(' ')}>B</button>
          <div className="flex shrink-0 rounded-md overflow-hidden border border-zinc-700/80">
            {ALIGN_OPTIONS.map(({ id, icon }) => (
              <button key={id} type="button" title={id} onClick={() => onAlignChange?.(id)}
                className={['w-6 h-6 flex items-center justify-center text-[12px] border-r last:border-r-0 border-zinc-700/80 transition-all',
                  align === id ? 'bg-teal/12 text-teal' : 'bg-zinc-800/40 text-zinc-500 hover:bg-zinc-700/50 hover:text-zinc-300'].join(' ')}>{icon}</button>
            ))}
          </div>
        </div>

        {typeof x !== 'undefined' && (
          <div className="flex items-center gap-2 mt-1.5">
            <CoordInput label="X" value={x} onChange={onXChange} />
            <CoordInput label="Y" value={y} onChange={onYChange} />
            <span className="text-[9px] text-zinc-600">%（プレビュー上をドラッグでも移動）</span>
          </div>
        )}

        {/* Pill / Outline */}
        <div className="flex items-center gap-1.5 mt-1.5">
          <button type="button" onClick={() => onPillChange({ ...(pill || {}), enabled: !pill?.enabled })}
            className={['px-2 py-0.5 rounded-md text-[10px] font-medium border transition-all shrink-0',
              pill?.enabled ? 'border-teal/40 bg-teal/10 text-teal' : 'border-zinc-700/80 bg-zinc-800/40 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300'].join(' ')}>背景</button>
          {pill?.enabled && (
            <>
              <input type="color" value={pill?.color || '#000000'} onChange={(e) => onPillChange({ ...(pill || {}), color: e.target.value })} className="w-6 h-6 rounded-md cursor-pointer shrink-0" style={{ colorScheme: 'dark' }} />
              <input type="range" min={0} max={100} value={pill?.opacity ?? 50} onChange={(e) => onPillChange({ ...(pill || {}), opacity: Number(e.target.value) })} className="flex-1 min-w-0 accent-teal" />
              <span className="text-[10px] text-zinc-500 font-mono w-6 text-right shrink-0">{pill?.opacity ?? 50}</span>
            </>
          )}
          {!pill?.enabled && (
            <>
              <button type="button" onClick={() => onOutlineChange({ ...(outline || {}), enabled: !outline?.enabled })}
                className={['px-2 py-0.5 rounded-md text-[10px] font-medium border transition-all shrink-0',
                  outline?.enabled ? 'border-sky-500/40 bg-sky-500/10 text-sky-400' : 'border-zinc-700/80 bg-zinc-800/40 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300'].join(' ')}>縁取</button>
              {outline?.enabled && (
                <>
                  <input type="color" value={outline?.color || '#000000'} onChange={(e) => onOutlineChange({ ...(outline || {}), color: e.target.value })} className="w-6 h-6 rounded-md cursor-pointer shrink-0" style={{ colorScheme: 'dark' }} />
                  <input type="range" min={1} max={10} value={outline?.width ?? 2} onChange={(e) => onOutlineChange({ ...(outline || {}), width: Number(e.target.value) })} className="flex-1 min-w-0 accent-sky-500" />
                  <span className="text-[10px] text-zinc-500 font-mono w-4 text-right shrink-0">{outline?.width ?? 2}</span>
                </>
              )}
            </>
          )}
        </div>

        {/* Shadow */}
        <div className="flex items-center gap-1.5 mt-1.5">
          <button type="button" onClick={() => onShadowChange({ ...(shadow || {}), enabled: !shadow?.enabled })}
            className={['px-2 py-0.5 rounded-md text-[10px] font-medium border transition-all shrink-0',
              shadow?.enabled !== false ? 'border-violet-500/40 bg-violet-500/10 text-violet-400' : 'border-zinc-700/80 bg-zinc-800/40 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300'].join(' ')}>影</button>
          {shadow?.enabled !== false && (
            <>
              <input type="color" value={shadow?.color || '#000000'} onChange={(e) => onShadowChange({ ...(shadow || {}), color: e.target.value })} className="w-6 h-6 rounded-md cursor-pointer shrink-0" style={{ colorScheme: 'dark' }} />
              <input type="range" min={0} max={30} value={shadow?.blur ?? 8} onChange={(e) => onShadowChange({ ...(shadow || {}), blur: Number(e.target.value) })} className="flex-1 min-w-0 accent-violet-500" />
              <span className="text-[10px] text-zinc-500 font-mono w-4 text-right shrink-0">{shadow?.blur ?? 8}</span>
            </>
          )}
        </div>

        {/* Outline row when pill active */}
        {pill?.enabled && (
          <div className="flex items-center gap-1.5 mt-1.5">
            <button type="button" onClick={() => onOutlineChange({ ...(outline || {}), enabled: !outline?.enabled })}
              className={['px-2 py-0.5 rounded-md text-[10px] font-medium border transition-all shrink-0',
                outline?.enabled ? 'border-sky-500/40 bg-sky-500/10 text-sky-400' : 'border-zinc-700/80 bg-zinc-800/40 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300'].join(' ')}>縁取</button>
            {outline?.enabled && (
              <>
                <input type="color" value={outline?.color || '#000000'} onChange={(e) => onOutlineChange({ ...(outline || {}), color: e.target.value })} className="w-6 h-6 rounded-md cursor-pointer shrink-0" style={{ colorScheme: 'dark' }} />
                <input type="range" min={1} max={10} value={outline?.width ?? 2} onChange={(e) => onOutlineChange({ ...(outline || {}), width: Number(e.target.value) })} className="flex-1 min-w-0 accent-sky-500" />
                <span className="text-[10px] text-zinc-500 font-mono w-4 text-right shrink-0">{outline?.width ?? 2}</span>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── FrameSelector ────────────────────────────────────────────────────────
const FRAMES = [
  { id: 'dynamic_island', label: 'Dynamic', sub: 'iPhone 15/16' },
  { id: 'notch', label: 'ノッチ', sub: 'iPhone X〜13' },
  { id: 'punchhole', label: '中央穴', sub: 'Android' },
  { id: 'home_button', label: 'ホームボタン', sub: 'iPhone SE/8' },
  { id: 'corner_hole', label: '角穴', sub: 'Galaxy S' },
  { id: 'none', label: 'なし', sub: 'スクリーンのみ' },
]
const FRAME_PRESETS = [
  { id: 'black', label: '黒', swatch: '#2a2a2a' },
  { id: 'silver', label: 'Silver', swatch: '#c8c8cf' },
  { id: 'gold', label: 'Gold', swatch: '#b8935a' },
  { id: 'purple', label: 'Purple', swatch: '#4d3f6c' },
]
const FRAME_PRESET_IDS = FRAME_PRESETS.map((p) => p.id)
const BUTTON_LAYOUTS = [
  { id: 'standard', label: '標準' },
  { id: 'right', label: '右のみ' },
  { id: 'left', label: '左のみ' },
  { id: 'none', label: 'なし' },
]

function FrameSelector({ frameType, onChange, frameColor = 'black', onColorChange, buttonLayout = 'standard', onButtonLayoutChange }: any) {
  const isPreset = FRAME_PRESET_IDS.includes(frameColor)
  const lastCustomRef = useRef(!isPreset ? frameColor : '#888888')
  if (!isPreset) lastCustomRef.current = frameColor
  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-3 gap-1.5">
        {FRAMES.map(({ id, label, sub }) => {
          const active = frameType === id
          return (
            <button key={id} type="button" onClick={() => onChange(id)}
              className={['flex flex-col items-center gap-1 py-2 px-1 rounded-xl border transition-all',
                active ? 'border-teal/50 bg-teal/8' : 'border-zinc-700 bg-zinc-800/40 hover:border-zinc-600'].join(' ')}>
              <div className="text-center leading-tight">
                <div className={`text-[10px] font-semibold ${active ? 'text-teal' : 'text-zinc-300'}`}>{label}</div>
                <div className="text-[8px] text-zinc-500 mt-0.5">{sub}</div>
              </div>
            </button>
          )
        })}
      </div>
      <div className="grid grid-cols-4 gap-1">
        {BUTTON_LAYOUTS.map(({ id, label }) => {
          const active = buttonLayout === id
          return (
            <button key={id} type="button" onClick={() => onButtonLayoutChange?.(id)}
              className={['py-1.5 px-0.5 rounded-lg border text-[9px] font-semibold transition-all',
                active ? 'border-teal/50 bg-teal/8 text-teal' : 'border-zinc-700 bg-zinc-800/40 text-zinc-400 hover:border-zinc-600'].join(' ')}>{label}</button>
          )
        })}
      </div>
      <div className="flex gap-1">
        {FRAME_PRESETS.map(({ id, label, swatch }) => (
          <button key={id} type="button" title={label} onClick={() => onColorChange?.(id)}
            className={['flex-1 flex items-center justify-center py-1 rounded-lg border transition-all',
              frameColor === id ? 'border-teal/50 bg-teal/8' : 'border-zinc-700 bg-zinc-800/40 hover:border-zinc-600'].join(' ')}>
            <span className="w-3 h-3 rounded-full border border-zinc-600/50" style={{ backgroundColor: swatch }} />
          </button>
        ))}
        <label title="カスタム" onClick={() => { if (isPreset) onColorChange?.(lastCustomRef.current) }}
          className={['flex-1 flex items-center justify-center py-1 rounded-lg border cursor-pointer transition-all',
            !isPreset ? 'border-teal/50 bg-teal/8' : 'border-zinc-700 bg-zinc-800/40 hover:border-zinc-600'].join(' ')}>
          <span className="w-3 h-3 rounded-full border border-zinc-600/50 overflow-hidden shrink-0">
            {isPreset
              ? <span className="block w-full h-full" style={{ background: 'conic-gradient(red,yellow,lime,cyan,blue,magenta,red)' }} />
              : <span className="block w-full h-full" style={{ backgroundColor: frameColor }} />}
          </span>
          <input type="color" value={lastCustomRef.current} onChange={(e) => onColorChange?.(e.target.value)} className="sr-only" />
        </label>
      </div>
    </div>
  )
}

// ── BgControls ───────────────────────────────────────────────────────────
const BG_DIRECTIONS = [
  { id: 'vertical', label: '縦', icon: '↕' },
  { id: 'horizontal', label: '横', icon: '↔' },
  { id: 'diagonal', label: '斜め', icon: '↗' },
]
function BgControls({ bgType, onBgTypeChange, bgColor, onBgColorChange, bgColor2, onBgColor2Change, bgDirection, onBgDirectionChange, blurSigma, onBlurSigmaChange, bgImageName, onBgImageChange, bgImageOffsetY, onBgImageOffsetYChange }: any) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith('image/')) onBgImageChange(file)
  }
  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-0.5 p-0.5 bg-zinc-800/80 rounded-lg border border-zinc-700/50">
        {[{ id: 'solid', label: '単色' }, { id: 'gradient', label: 'グラデ' }, { id: 'blur', label: 'ぼかし' }, { id: 'image', label: '画像' }].map(({ id, label }) => (
          <button key={id} type="button" onClick={() => onBgTypeChange(id)}
            className={['flex-1 py-1.5 px-0.5 rounded-md text-[11px] font-medium transition-all',
              bgType === id ? 'bg-teal/15 border border-teal/40 text-teal' : 'text-zinc-500 hover:text-zinc-400 border border-transparent'].join(' ')}>{label}</button>
        ))}
      </div>

      {bgType === 'blur' && (
        <div className="flex flex-col gap-2.5">
          <p className="text-[11px] text-teal/80 leading-relaxed rounded-lg bg-teal/6 border border-teal/20 px-3 py-2">スクリーンショットを自動的にぼかして背景に使います。</p>
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-zinc-500 w-14 shrink-0">ぼかし強度</span>
            <input type="range" min={5} max={60} value={blurSigma} onChange={(e) => onBlurSigmaChange(Number(e.target.value))} className="flex-1 accent-teal" />
            <span className="text-[10px] text-zinc-500 w-12 text-right shrink-0">{blurSigma <= 15 ? 'うっすら' : blurSigma <= 35 ? '標準' : 'ガッツリ'}</span>
          </div>
        </div>
      )}

      {bgType === 'image' && (
        <div className="flex flex-col gap-2">
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onBgImageChange(f) }} />
          <div onClick={() => fileRef.current?.click()} onDragOver={(e) => { e.preventDefault(); setDragging(true) }} onDragLeave={() => setDragging(false)} onDrop={handleDrop}
            className={['w-full py-3 rounded-lg border border-dashed cursor-pointer transition-all text-xs flex flex-col items-center justify-center gap-1',
              dragging ? 'border-teal/70 bg-teal/8 text-teal' : bgImageName ? 'border-zinc-600 bg-zinc-800/40 text-zinc-400 hover:border-zinc-500' : 'border-zinc-700 text-zinc-500 hover:border-teal/40 hover:text-teal'].join(' ')}>
            <span className="text-lg leading-none">{dragging ? '📥' : '🖼'}</span>
            <span>{dragging ? 'ここにドロップ' : bgImageName || 'クリックまたはドロップで選択'}</span>
          </div>
          {bgImageName && (
            <>
              <div className="flex items-center gap-3">
                <span className="text-[10px] text-zinc-500 shrink-0">表示位置</span>
                <input type="range" min={0} max={100} value={bgImageOffsetY ?? 50} onChange={(e) => onBgImageOffsetYChange?.(Number(e.target.value))} className="flex-1 accent-teal" />
                <span className="text-[10px] text-zinc-500 font-mono w-6 text-right shrink-0">{(bgImageOffsetY ?? 50) === 0 ? '上' : (bgImageOffsetY ?? 50) === 100 ? '下' : `${bgImageOffsetY ?? 50}%`}</span>
              </div>
              <button type="button" onClick={() => onBgImageChange(null)} className="text-[10px] text-zinc-600 hover:text-zinc-400 text-center transition-colors">削除</button>
            </>
          )}
        </div>
      )}

      {(bgType === 'solid' || bgType === 'gradient') && (
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <input type="color" value={bgColor} onChange={(e) => onBgColorChange(e.target.value)} className="w-8 h-8 rounded-lg cursor-pointer shrink-0" style={{ colorScheme: 'dark' }} />
            <span className="text-[10px] text-zinc-500 font-mono truncate">{bgColor.toUpperCase()}</span>
          </div>
          {bgType === 'gradient' && (
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="text-zinc-700">→</span>
              <input type="color" value={bgColor2} onChange={(e) => onBgColor2Change(e.target.value)} className="w-8 h-8 rounded-lg cursor-pointer shrink-0" style={{ colorScheme: 'dark' }} />
              <span className="text-[10px] text-zinc-500 font-mono truncate">{bgColor2.toUpperCase()}</span>
            </div>
          )}
        </div>
      )}

      {bgType === 'gradient' && (
        <div className="flex gap-1.5">
          {BG_DIRECTIONS.map((d) => (
            <button key={d.id} type="button" onClick={() => onBgDirectionChange(d.id)}
              className={['flex-1 py-1.5 rounded-lg text-xs font-medium border transition-all flex items-center justify-center gap-1',
                bgDirection === d.id ? 'border-teal/50 bg-teal/10 text-teal' : 'border-zinc-700 bg-zinc-800/40 text-zinc-500 hover:border-zinc-600 hover:text-zinc-400'].join(' ')}>
              <span className="text-base leading-none">{d.icon}</span><span>{d.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── LogoPanel ────────────────────────────────────────────────────────────
function LogoPanel({ logoName, onLogo, onReset, logoSize, onLogoSizeChange, logoCornerRadius, onLogoCornerRadiusChange }: any) {
  const inputRef = useRef<HTMLInputElement>(null)
  const handleDrop = (e: React.DragEvent) => { e.preventDefault(); const file = e.dataTransfer.files[0]; if (file && file.type.startsWith('image/')) onLogo(file) }
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (file) onLogo(file); e.target.value = '' }
  if (logoName) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-zinc-800/60 border border-zinc-700">
          <span className="text-[10px] text-zinc-300 truncate flex-1">{logoName}</span>
          <button type="button" onClick={onReset} className="text-zinc-500 hover:text-zinc-300 transition-colors text-xs leading-none px-1">✕</button>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-zinc-500 w-10 shrink-0">サイズ</span>
          <input type="range" min={5} max={40} value={logoSize} onChange={(e) => onLogoSizeChange(Number(e.target.value))} className="flex-1 accent-teal" />
          <span className="text-[10px] text-zinc-500 font-mono w-6 text-right shrink-0">{logoSize}%</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-zinc-500 w-10 shrink-0">角丸</span>
          <input type="range" min={0} max={50} value={logoCornerRadius} onChange={(e) => onLogoCornerRadiusChange(Number(e.target.value))} className="flex-1 accent-teal" />
          <span className="text-[10px] text-zinc-500 font-mono w-6 text-right shrink-0">{logoCornerRadius === 0 ? '□' : logoCornerRadius === 50 ? '○' : `${logoCornerRadius}%`}</span>
        </div>
        <p className="text-[9px] text-zinc-600">プレビュー上の緑ハンドルをドラッグで位置調整</p>
      </div>
    )
  }
  return (
    <div onDrop={handleDrop} onDragOver={(e) => e.preventDefault()} onClick={() => inputRef.current?.click()}
      className="flex flex-col items-center justify-center gap-1.5 py-3 px-2 rounded-xl border border-dashed border-zinc-700 bg-zinc-800/20 cursor-pointer hover:border-zinc-500 hover:bg-zinc-800/40 transition-all">
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="text-zinc-500"><rect x="1" y="1" width="16" height="16" rx="4" stroke="currentColor" strokeWidth="1.2" /><path d="M9 5.5v7M5.5 9h7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>
      <span className="text-[10px] text-zinc-500">アイコン / ロゴをドロップ（PNG/JPG）</span>
      <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={handleFile} />
    </div>
  )
}

// ── FontDropZone ─────────────────────────────────────────────────────────
function FontDropZone({ fontList, selectedFont, onFontAdd, onFontRemove, onFontSelect }: any) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const processFile = async (file: File) => {
    if (!file || !/\.(ttf|otf)$/i.test(file.name)) { setError('.ttf または .otf ファイルを選択してください'); return }
    setError(''); setLoading(true)
    try {
      const url = URL.createObjectURL(file)
      const familyName = `UserFont_${Date.now()}`
      const face = new FontFace(familyName, `url(${url})`)
      await face.load()
      ;(document as any).fonts.add(face)
      onFontAdd(familyName, file.name.replace(/\.(ttf|otf)$/i, ''))
    } catch { setError('フォントの読み込みに失敗しました') } finally { setLoading(false) }
  }
  return (
    <div className="flex flex-col gap-2">
      {fontList.length > 0 && (
        <div className="flex flex-col gap-0.5 rounded-lg bg-zinc-800/30 border border-zinc-700/50 overflow-hidden">
          <label className="flex items-center gap-2 px-2.5 py-2 cursor-pointer hover:bg-zinc-800/60 transition-colors">
            <input type="radio" checked={!selectedFont} onChange={() => onFontSelect('')} className="w-3 h-3 accent-teal shrink-0" />
            <span className={['text-xs flex-1 transition-colors', !selectedFont ? 'text-zinc-300' : 'text-zinc-500'].join(' ')}>デフォルト</span>
          </label>
          <div className="border-t border-zinc-700/40" />
          {fontList.map(({ family, name }: any) => (
            <label key={family} className="flex items-center gap-2 px-2.5 py-2 cursor-pointer hover:bg-zinc-800/60 transition-colors group">
              <input type="radio" checked={selectedFont === family} onChange={() => onFontSelect(family)} className="w-3 h-3 accent-teal shrink-0" />
              <span className={['text-xs flex-1 truncate transition-colors', selectedFont === family ? 'text-teal' : 'text-zinc-400'].join(' ')}>{name}</span>
              <button type="button" onClick={(e) => { e.preventDefault(); onFontRemove(family) }} className="w-4 h-4 text-zinc-700 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all text-xs leading-none rounded flex items-center justify-center shrink-0">×</button>
            </label>
          ))}
        </div>
      )}
      <div onDragOver={(e) => { e.preventDefault(); setDragging(true) }} onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragging(false) }}
        onDrop={(e) => { e.preventDefault(); setDragging(false); if (e.dataTransfer.files[0]) processFile(e.dataTransfer.files[0]) }}
        onClick={() => !loading && inputRef.current?.click()}
        className={['flex items-center gap-3 rounded-lg border border-dashed px-3 py-2.5 transition-all', loading ? 'cursor-wait opacity-60' : 'cursor-pointer',
          dragging ? 'border-teal/50 bg-teal/5' : 'border-zinc-700 hover:border-zinc-600 bg-zinc-800/20'].join(' ')}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-zinc-600 shrink-0"><path d="M3 13L6.5 3h3L13 13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /><path d="M4.5 9.5h7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
        <div>
          <p className="text-xs text-zinc-400">{loading ? '読み込み中...' : '.ttf / .otf を追加'}</p>
          {fontList.length === 0 && <p className="text-[10px] text-zinc-600 mt-0.5">なければシステムフォントを使用</p>}
        </div>
        <input ref={inputRef} type="file" accept=".ttf,.otf" className="hidden" onChange={(e) => { if (e.target.files?.[0]) processFile(e.target.files[0]); e.target.value = '' }} />
      </div>
      {error && <p className="text-[10px] text-red-400 pl-1">{error}</p>}
    </div>
  )
}

// ── TemplatePanel ────────────────────────────────────────────────────────
function loadTemplates(): any[] {
  if (typeof window === 'undefined') return []
  try { return JSON.parse(localStorage.getItem(TEMPLATES_KEY) || '[]') } catch { return [] }
}
function TemplatePanel({ currentSettings, onLoad }: any) {
  const [name, setName] = useState('')
  const [templates, setTemplates] = useState<any[]>(loadTemplates)
  const persist = (next: any[]) => { localStorage.setItem(TEMPLATES_KEY, JSON.stringify(next)); setTemplates(next) }
  const handleSave = () => {
    const trimmed = name.trim() || `テンプレート ${templates.length + 1}`
    persist([{ id: Date.now(), name: trimmed, settings: currentSettings }, ...templates].slice(0, 20))
    setName('')
  }
  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-1.5">
        <input value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSave()} placeholder="テンプレート名"
          className="flex-1 min-w-0 rounded-lg bg-zinc-800 border border-zinc-700/80 text-zinc-100 placeholder-zinc-600 px-2.5 py-1.5 text-xs focus:outline-none focus:border-teal/50 transition-colors" />
        <button type="button" onClick={handleSave} className="px-2.5 py-1.5 rounded-lg bg-teal/15 border border-teal/40 text-teal text-xs font-medium hover:bg-teal/25 transition-all shrink-0">保存</button>
      </div>
      {templates.length > 0 ? (
        <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
          {templates.map((t) => (
            <div key={t.id} className="flex items-center gap-1 rounded-lg border border-zinc-700/60 bg-zinc-800/50 px-2 py-1.5">
              <span className="flex-1 min-w-0 text-xs text-zinc-300 truncate">{t.name}</span>
              <button type="button" onClick={() => onLoad(t.settings)} className="text-[10px] text-zinc-500 hover:text-teal transition-colors shrink-0 px-1.5 py-0.5 rounded hover:bg-teal/10">読込</button>
              <button type="button" onClick={() => persist(templates.filter((x) => x.id !== t.id))} className="text-[10px] text-zinc-600 hover:text-red-400 transition-colors shrink-0 w-4 text-center">×</button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-[10px] text-zinc-600 text-center py-1">保存済みのテンプレートなし</p>
      )}
    </div>
  )
}

// ── PreviewCanvas ────────────────────────────────────────────────────────
const EXTRA_COLORS = [
  { border: 'border-green-400/70', bg: 'bg-green-500/20', text: 'text-green-400' },
  { border: 'border-violet-400/70', bg: 'bg-violet-500/20', text: 'text-violet-400' },
  { border: 'border-orange-400/70', bg: 'bg-orange-500/20', text: 'text-orange-400' },
  { border: 'border-rose-400/70', bg: 'bg-rose-500/20', text: 'text-rose-400' },
]
function DragHandle({ x, y, colorClass, borderClass, bgClass, label, draggingRef, which }: any) {
  return (
    <div style={{ left: `${x}%`, top: `${y}%`, transform: 'translate(-50%, -50%)' }}
      className={['absolute z-10 w-5 h-5 rounded-full border flex items-center justify-center cursor-grab active:cursor-grabbing select-none hover:scale-125 transition-transform duration-100', borderClass, bgClass].join(' ')}
      title={label}
      onMouseDown={(e) => { e.preventDefault(); draggingRef.current = which }}
      onTouchStart={(e) => { e.preventDefault(); draggingRef.current = which }}>
      <span className={`text-[8px] font-bold pointer-events-none ${colorClass}`}>{label}</span>
    </div>
  )
}
const PreviewCanvas = forwardRef(function PreviewCanvas(props: any, ref: any) {
  const {
    extraTexts = [], textX, textY, onTextPosChange, subTextX, subTextY, onSubTextPosChange,
    onExtraTextPosChange, logoEl, logoPosX = 50, logoPosY = 15, onLogoPosChange,
    previewW = 220, previewH = 476,
  } = props
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const draggingRef = useRef<string | null>(null)
  const callbacksRef = useRef<any>({})
  callbacksRef.current = { onTextPosChange, onSubTextPosChange, onExtraTextPosChange, onLogoPosChange }

  useImperativeHandle(ref, () => ({
    downloadPng: () => {
      const canvas = canvasRef.current
      if (!canvas) return
      Object.assign(document.createElement('a'), { href: canvas.toDataURL('image/png'), download: 'preview.png' }).click()
    },
  }))

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    drawPreview(canvas, props)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify({ ...props, imageEl: props.imageEl?.src, bgImageEl: props.bgImageEl?.src, logoEl: props.logoEl?.src })])

  const getPct = useCallback((clientX: number, clientY: number) => {
    const wrapper = wrapperRef.current
    if (!wrapper) return null
    const rect = wrapper.getBoundingClientRect()
    return {
      x: Math.round(Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100))),
      y: Math.round(Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100))),
    }
  }, [])

  useEffect(() => {
    const onMove = (e: any) => {
      if (!draggingRef.current) return
      const { clientX, clientY } = e.touches ? e.touches[0] : e
      const pos = getPct(clientX, clientY)
      if (!pos) return
      const { onTextPosChange, onSubTextPosChange, onExtraTextPosChange, onLogoPosChange } = callbacksRef.current
      const which = draggingRef.current
      if (which === 'text') onTextPosChange(pos.x, pos.y)
      else if (which === 'subText') onSubTextPosChange(pos.x, pos.y)
      else if (which === 'logo' && onLogoPosChange) onLogoPosChange(pos.x, pos.y)
      else if (which.startsWith('extra:') && onExtraTextPosChange) onExtraTextPosChange(Number(which.slice(6)), pos.x, pos.y)
    }
    const onUp = () => { draggingRef.current = null }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    window.addEventListener('touchmove', onMove, { passive: false })
    window.addEventListener('touchend', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend', onUp)
    }
  }, [getPct])

  return (
    <div className="flex flex-col items-center gap-2">
      <div ref={wrapperRef} className="relative" style={{ lineHeight: 0 }}>
        <canvas ref={canvasRef} width={previewW} height={previewH}
          className="relative rounded-2xl shadow-2xl shadow-black/60 border border-zinc-800"
          style={{ width: `${previewW}px`, height: `${previewH}px`, maxWidth: '100%', display: 'block' }} />
        {logoEl && <DragHandle x={logoPosX} y={logoPosY} colorClass="text-lime-400" borderClass="border-lime-400/70" bgClass="bg-lime-500/20" label="◈" draggingRef={draggingRef} which="logo" />}
        <DragHandle x={textX} y={textY} colorClass="text-teal" borderClass="border-teal/70" bgClass="bg-teal/20" label="T" draggingRef={draggingRef} which="text" />
        <DragHandle x={subTextX} y={subTextY} colorClass="text-sky-400" borderClass="border-sky-400/70" bgClass="bg-sky-500/20" label="S" draggingRef={draggingRef} which="subText" />
        {extraTexts.map((et: any, i: number) => {
          const c = EXTRA_COLORS[i % EXTRA_COLORS.length]
          return <DragHandle key={et.id} x={et.x} y={et.y} colorClass={c.text} borderClass={c.border} bgClass={c.bg} label={String(i + 1)} draggingRef={draggingRef} which={`extra:${et.id}`} />
        })}
      </div>
      <div className="flex items-center gap-3 flex-wrap justify-center text-[11px] text-zinc-400">
        {logoEl && <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-lime-500/70 border border-lime-400/80 inline-block" />ロゴ</span>}
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-teal/70 border border-teal/80 inline-block" />キャッチ</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-sky-500/70 border border-sky-400/80 inline-block" />サブ</span>
      </div>
    </div>
  )
})

// ── GeneratePanel ────────────────────────────────────────────────────────
const SIZE_GROUPS = [
  { label: 'App Store', sub: 'iPhone', items: [
    { id: 'iphone_67', label: 'iPhone 6.7"', detail: '1290×2796' },
    { id: 'iphone_65', label: 'iPhone 6.5"', detail: '1242×2688' },
    { id: 'iphone_55', label: 'iPhone 5.5"', detail: '1242×2208' },
  ] },
  { label: 'App Store', sub: 'iPad', items: [
    { id: 'ipad_129', label: 'iPad 12.9"', detail: '2048×2732' },
    { id: 'ipad_11', label: 'iPad 11"', detail: '1668×2388' },
  ] },
  { label: 'Google Play', sub: null, items: [
    { id: 'android_play', label: 'Android', detail: '1080×1920' },
  ] },
]
function DownloadIcon() {
  return (<svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M5 6.5V1.5M3 4.5l2 2 2-2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /><path d="M1 8.5h8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>)
}
function GeneratePanel({ sizes, onSizeChange, loading, error, onGenerate, imageCount, onDownloadPng, onDownloadSingle }: any) {
  const selectedCount = Object.values(sizes).filter(Boolean).length
  const anySelected = selectedCount > 0
  const imgCnt = imageCount || 1
  const totalImages = imgCnt * selectedCount
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3.5">
        {SIZE_GROUPS.map((group) => {
          const allChecked = group.items.every((i) => sizes[i.id])
          return (
            <div key={group.label + group.sub}>
              <div className="flex items-center gap-1.5 mb-1.5">
                <span className="text-[9px] font-semibold tracking-[0.15em] uppercase text-zinc-600">{group.label}</span>
                {group.sub && (<><span className="text-zinc-700">·</span><span className="text-[9px] font-semibold tracking-[0.12em] uppercase text-zinc-600">{group.sub}</span></>)}
                <div className="flex-1 h-px bg-zinc-800/80 ml-1" />
                <button type="button" onClick={() => group.items.forEach((i) => onSizeChange(i.id, !allChecked))} className="text-[9px] text-zinc-600 hover:text-teal transition-colors font-medium">{allChecked ? '全解除' : '全選択'}</button>
              </div>
              <div className="flex flex-col gap-0.5">
                {group.items.map((item) => (
                  <label key={item.id} className="flex items-center gap-2.5 cursor-pointer group rounded-md px-2 py-1.5 -mx-2 transition-colors hover:bg-zinc-800/60">
                    <input type="checkbox" checked={!!sizes[item.id]} onChange={(e) => onSizeChange(item.id, e.target.checked)} className="w-3.5 h-3.5 rounded cursor-pointer shrink-0 accent-teal" />
                    <span className={['text-[13px] flex-1 transition-colors', sizes[item.id] ? 'text-zinc-200' : 'text-zinc-500 group-hover:text-zinc-300'].join(' ')}>{item.label}</span>
                    <span className="text-[10px] text-zinc-700 font-mono tabular-nums">{item.detail}</span>
                    <button type="button" onClick={(e) => { e.preventDefault(); onDownloadSingle?.(item.id) }} title={`${item.label} PNG 1枚保存`}
                      className="flex items-center gap-1 pl-1.5 pr-2 py-0.5 rounded-md border border-zinc-700/80 text-zinc-500 hover:border-teal/50 hover:text-teal hover:bg-teal/6 transition-all shrink-0 text-[9px] font-medium">
                      <DownloadIcon /><span>PNG</span>
                    </button>
                  </label>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {onDownloadPng && (
        <button type="button" onClick={onDownloadPng} className="w-full py-1.5 px-3 rounded-lg text-[11px] font-medium border border-zinc-700/80 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/40 transition-all flex items-center justify-center gap-1.5">
          <DownloadIcon />プレビューを PNG 保存
        </button>
      )}

      {error && <div className="text-[11px] text-red-400 bg-red-950/20 border border-red-900/30 rounded-lg px-3 py-2 leading-relaxed">{error}</div>}

      <button type="button" onClick={onGenerate} disabled={loading || !anySelected}
        className={['w-full py-3 px-4 rounded-xl font-bold text-[13px] tracking-wide transition-all select-none flex items-center justify-center gap-2',
          loading || !anySelected ? 'bg-zinc-800/60 text-zinc-600 cursor-not-allowed border border-zinc-700/50' : 'bg-teal hover:opacity-90 active:scale-[0.97] text-zinc-950 shadow-[0_4px_24px_rgba(0,200,150,0.25)]'].join(' ')}>
        {loading ? (
          <><span className="inline-block w-4 h-4 border-2 border-zinc-600 border-t-zinc-300 rounded-full animate-spin" /><span>生成中...</span></>
        ) : (
          <><svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 9.5V2M4 6.5L7 9.5 10 6.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /><path d="M1.5 11v.5A1.5 1.5 0 003 13.5h8A1.5 1.5 0 0012.5 12v-.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
            <span>ZIP を書き出す{anySelected && <span className="ml-1.5 font-normal opacity-60">({selectedCount})</span>}</span></>
        )}
      </button>

      {totalImages > selectedCount ? (
        <p className="text-[10px] text-teal/50 text-center leading-relaxed">{imgCnt > 1 && `${imgCnt}シーン × `}{selectedCount}サイズ = <span className="font-semibold text-teal/80">{totalImages}枚</span>を一括生成</p>
      ) : (
        <p className="text-[10px] text-zinc-600 text-center leading-relaxed">ストア申請対応の高解像度PNG<br />フォルダ分けしてZIPで出力</p>
      )}
    </div>
  )
}

// ── Toast ────────────────────────────────────────────────────────────────
function Toast({ message, onClose }: any) {
  useEffect(() => { const t = setTimeout(onClose, 2600); return () => clearTimeout(t) }, [onClose])
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl bg-zinc-900 border border-teal/30 text-teal text-[13px] shadow-2xl shadow-black/60">{message}</div>
  )
}

// ═══════════════════════════════════════════════════════════════════════
// Main component
// ═══════════════════════════════════════════════════════════════════════
export function MockupBuilder() {
  const saved = useRef(loadSaved()).current

  const [images, setImages] = useState<any[]>([])
  const [activeImageIndex, setActiveImageIndex] = useState(0)

  const [text, setText] = useState<string>(saved.text ?? '')
  const [textVisible, setTextVisible] = useState<boolean>(saved.textVisible ?? true)
  const [fontSize, setFontSize] = useState<number>(saved.fontSize ?? 60)
  const [fontColor, setFontColor] = useState<string>(saved.fontColor ?? '#ffffff')
  const [fontBold, setFontBold] = useState<boolean>(saved.fontBold ?? true)
  const [textAlign, setTextAlign] = useState<string>(saved.textAlign ?? 'center')
  const [textPill, setTextPill] = useState<any>(saved.textPill ?? DEFAULT_PILL)
  const [textOutline, setTextOutline] = useState<any>(saved.textOutline ?? DEFAULT_OUTLINE)
  const [textShadow, setTextShadow] = useState<any>(saved.textShadow ?? DEFAULT_TEXT_SHADOW)

  const [subText, setSubText] = useState<string>(saved.subText ?? '')
  const [subTextVisible, setSubTextVisible] = useState<boolean>(saved.subTextVisible ?? true)
  const [subFontSize, setSubFontSize] = useState<number>(saved.subFontSize ?? 40)
  const [subFontColor, setSubFontColor] = useState<string>(saved.subFontColor ?? '#ffffff')
  const [subFontBold, setSubFontBold] = useState<boolean>(saved.subFontBold ?? false)
  const [subTextAlign, setSubTextAlign] = useState<string>(saved.subTextAlign ?? 'center')
  const [subTextPill, setSubTextPill] = useState<any>(saved.subTextPill ?? DEFAULT_PILL)
  const [subTextOutline, setSubTextOutline] = useState<any>(saved.subTextOutline ?? DEFAULT_OUTLINE)
  const [subTextShadow, setSubTextShadow] = useState<any>(saved.subTextShadow ?? DEFAULT_TEXT_SHADOW)

  const [extraTexts, setExtraTexts] = useState<any[]>(saved.extraTexts ?? [])

  const [frameType, setFrameType] = useState<string>(saved.frameType ?? 'dynamic_island')
  const [frameColor, setFrameColor] = useState<string>(saved.frameColor ?? 'black')
  const [buttonLayout, setButtonLayout] = useState<string>(saved.buttonLayout ?? 'standard')
  const [frameScale, setFrameScale] = useState<number>(saved.frameScale ?? 100)
  const [frameOffsetY, setFrameOffsetY] = useState<number>(saved.frameOffsetY ?? 20)
  const [frameShadow, setFrameShadow] = useState<any>(saved.frameShadow ?? DEFAULT_FRAME_SHADOW)
  const [screenshotOverlay, setScreenshotOverlay] = useState<any>(saved.screenshotOverlay ?? DEFAULT_OVERLAY)
  const [screenshotFilter, setScreenshotFilter] = useState<any>(saved.screenshotFilter ?? DEFAULT_SCREENSHOT_FILTER)
  const [textX, setTextX] = useState<number>(saved.textX ?? 50)
  const [textY, setTextY] = useState<number>(saved.textY ?? 10)
  const [subTextX, setSubTextX] = useState<number>(saved.subTextX ?? 50)
  const [subTextY, setSubTextY] = useState<number>(saved.subTextY ?? 94)
  const [screenshotOffsetY, setScreenshotOffsetY] = useState<number>(saved.screenshotOffsetY ?? 0)

  const [bgType, setBgType] = useState<string>(saved.bgType ?? 'gradient')
  const [bgColor, setBgColor] = useState<string>(saved.bgColor ?? '#1a1a2e')
  const [bgColor2, setBgColor2] = useState<string>(saved.bgColor2 ?? '#0f3460')
  const [bgDirection, setBgDirection] = useState<string>(saved.bgDirection ?? 'vertical')
  const [blurSigma, setBlurSigma] = useState<number>(saved.blurSigma ?? 25)
  const [bgImageFile, setBgImageFile] = useState<File | null>(null)
  const [bgImageEl, setBgImageEl] = useState<HTMLImageElement | null>(null)
  const [bgImageOffsetY, setBgImageOffsetY] = useState<number>(saved.bgImageOffsetY ?? 50)

  const [fontList, setFontList] = useState<any[]>([])
  const [selectedFont, setSelectedFont] = useState('')

  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoEl, setLogoEl] = useState<HTMLImageElement | null>(null)
  const [logoPosX, setLogoPosX] = useState(50)
  const [logoPosY, setLogoPosY] = useState(15)
  const [logoSize, setLogoSize] = useState(15)
  const [logoCornerRadius, setLogoCornerRadius] = useState(22)

  const [previewDevice, setPreviewDevice] = useState('iphone')
  const _pd = PREVIEW_DEVICES[previewDevice] ?? PREVIEW_DEVICES.iphone
  const previewH = 476
  const previewW = Math.round((previewH * _pd.w) / _pd.h)

  const [sizes, setSizes] = useState<any>(saved.sizes ?? { iphone_67: true, iphone_65: true, iphone_55: true, android_play: true, ipad_129: false, ipad_11: false })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState<string | null>(null)

  const previewRef = useRef<any>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const jsonInputRef = useRef<HTMLInputElement>(null)

  // Undo / Redo
  const histRef = useRef<any[]>([])
  const hIdxRef = useRef(-1)
  const suppressRef = useRef(false)
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)

  // load bg image
  useEffect(() => {
    if (!bgImageFile) { setBgImageEl(null); return }
    const url = URL.createObjectURL(bgImageFile)
    const img = new Image()
    img.onload = () => setBgImageEl(img)
    img.src = url
    return () => URL.revokeObjectURL(url)
  }, [bgImageFile])

  // load logo
  useEffect(() => {
    if (!logoFile) { setLogoEl(null); return }
    const url = URL.createObjectURL(logoFile)
    const img = new Image()
    img.onload = () => setLogoEl(img)
    img.src = url
    return () => URL.revokeObjectURL(url)
  }, [logoFile])

  const activeImageEl = images[activeImageIndex]?.el ?? null

  const addExtraText = () => setExtraTexts((prev) => [...prev, { id: Date.now(), text: '', fontSize: 40, fontColor: '#ffffff', fontBold: false, align: 'center', pill: { ...DEFAULT_PILL }, outline: { ...DEFAULT_OUTLINE }, shadow: { ...DEFAULT_TEXT_SHADOW }, x: 50, y: 50, visible: true }])
  const updateExtraText = useCallback((id: number, updates: any) => setExtraTexts((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t))), [])
  const removeExtraText = useCallback((id: number) => setExtraTexts((prev) => prev.filter((t) => t.id !== id)), [])

  const applySnapshot = useCallback((s: any) => {
    suppressRef.current = true
    setText(s.text); setTextVisible(s.textVisible ?? true); setFontSize(s.fontSize); setFontColor(s.fontColor); setFontBold(s.fontBold)
    setTextAlign(s.textAlign); setTextPill(s.textPill); setTextOutline(s.textOutline); setTextShadow(s.textShadow ?? DEFAULT_TEXT_SHADOW); setTextX(s.textX); setTextY(s.textY)
    setSubText(s.subText); setSubTextVisible(s.subTextVisible ?? true); setSubFontSize(s.subFontSize); setSubFontColor(s.subFontColor); setSubFontBold(s.subFontBold)
    setSubTextAlign(s.subTextAlign); setSubTextPill(s.subTextPill); setSubTextOutline(s.subTextOutline); setSubTextShadow(s.subTextShadow ?? DEFAULT_TEXT_SHADOW); setSubTextX(s.subTextX); setSubTextY(s.subTextY)
    setExtraTexts(s.extraTexts); setFrameType(s.frameType); setFrameColor(s.frameColor); setButtonLayout(s.buttonLayout ?? 'standard')
    setFrameScale(s.frameScale ?? 100); setFrameOffsetY(s.frameOffsetY ?? 20); setFrameShadow(s.frameShadow ?? DEFAULT_FRAME_SHADOW)
    setScreenshotOverlay(s.screenshotOverlay); setScreenshotFilter(s.screenshotFilter ?? DEFAULT_SCREENSHOT_FILTER)
    setBgType(s.bgType); setBgColor(s.bgColor); setBgColor2(s.bgColor2); setBgDirection(s.bgDirection); setBlurSigma(s.blurSigma); setBgImageOffsetY(s.bgImageOffsetY); setScreenshotOffsetY(s.screenshotOffsetY)
    requestAnimationFrame(() => requestAnimationFrame(() => { suppressRef.current = false }))
  }, [])

  const undo = useCallback(() => {
    const idx = hIdxRef.current
    if (idx <= 0) return
    hIdxRef.current = idx - 1
    applySnapshot(histRef.current[idx - 1])
    setCanUndo(hIdxRef.current > 0); setCanRedo(true)
  }, [applySnapshot])
  const redo = useCallback(() => {
    const hist = histRef.current, idx = hIdxRef.current
    if (idx >= hist.length - 1) return
    hIdxRef.current = idx + 1
    applySnapshot(hist[idx + 1])
    setCanUndo(true); setCanRedo(hIdxRef.current < hist.length - 1)
  }, [applySnapshot])

  const templateSettings = {
    fontSize, fontColor, fontBold, textAlign, textPill, textOutline, textX, textY,
    subFontSize, subFontColor, subFontBold, subTextAlign, subTextPill, subTextOutline, subTextX, subTextY,
    extraTexts, frameType, frameColor, buttonLayout, frameScale, frameOffsetY, frameShadow, screenshotOverlay,
    bgType, bgColor, bgColor2, bgDirection, blurSigma, bgImageOffsetY, screenshotOffsetY,
  }

  const loadTemplate = useCallback((s: any) => {
    const set = (k: string, fn: any) => { if (s[k] !== undefined) fn(s[k]) }
    set('fontSize', setFontSize); set('fontColor', setFontColor); set('fontBold', setFontBold); set('textAlign', setTextAlign)
    set('textPill', setTextPill); set('textOutline', setTextOutline); set('textX', setTextX); set('textY', setTextY)
    set('subFontSize', setSubFontSize); set('subFontColor', setSubFontColor); set('subFontBold', setSubFontBold); set('subTextAlign', setSubTextAlign)
    set('subTextPill', setSubTextPill); set('subTextOutline', setSubTextOutline); set('subTextX', setSubTextX); set('subTextY', setSubTextY)
    set('extraTexts', setExtraTexts); set('frameType', setFrameType); set('frameColor', setFrameColor); set('buttonLayout', setButtonLayout)
    set('frameScale', setFrameScale); set('frameOffsetY', setFrameOffsetY); set('frameShadow', setFrameShadow); set('screenshotOverlay', setScreenshotOverlay)
    set('bgType', setBgType); set('bgColor', setBgColor); set('bgColor2', setBgColor2); set('bgDirection', setBgDirection)
    set('blurSigma', setBlurSigma); set('bgImageOffsetY', setBgImageOffsetY); set('screenshotOffsetY', setScreenshotOffsetY)
  }, [])

  // localStorage autosave
  const saveTimer = useRef<any>(null)
  useEffect(() => {
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          text, textVisible, fontSize, fontColor, fontBold, textAlign, textPill, textOutline, textShadow,
          subText, subTextVisible, subFontSize, subFontColor, subFontBold, subTextAlign, subTextPill, subTextOutline, subTextShadow,
          extraTexts, frameType, frameColor, buttonLayout, frameScale, frameOffsetY, frameShadow, screenshotOverlay, screenshotFilter,
          textX, textY, subTextX, subTextY, screenshotOffsetY,
          bgType, bgColor, bgColor2, bgDirection, blurSigma, bgImageOffsetY, sizes,
        }))
      } catch { /* quota */ }
    }, 600)
    return () => clearTimeout(saveTimer.current)
  })

  // history push (debounced)
  const histTimer = useRef<any>(null)
  useEffect(() => {
    if (suppressRef.current) return
    clearTimeout(histTimer.current)
    histTimer.current = setTimeout(() => {
      if (suppressRef.current) return
      const snap = {
        text, textVisible, fontSize, fontColor, fontBold, textAlign, textPill, textOutline, textShadow, textX, textY,
        subText, subTextVisible, subFontSize, subFontColor, subFontBold, subTextAlign, subTextPill, subTextOutline, subTextShadow, subTextX, subTextY,
        extraTexts, frameType, frameColor, buttonLayout, frameScale, frameOffsetY, frameShadow, screenshotOverlay, screenshotFilter,
        bgType, bgColor, bgColor2, bgDirection, blurSigma, bgImageOffsetY, screenshotOffsetY,
      }
      const hist = histRef.current.slice(0, hIdxRef.current + 1)
      hist.push(snap)
      if (hist.length > 50) hist.shift()
      histRef.current = hist
      hIdxRef.current = hist.length - 1
      setCanUndo(hIdxRef.current > 0); setCanRedo(false)
    }, 500)
  })

  // keyboard shortcuts, scoped to the tool
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = navigator.platform.includes('Mac') ? e.metaKey : e.ctrlKey
      if (!mod) return
      const ae = document.activeElement
      if (!rootRef.current || !rootRef.current.contains(ae)) return
      const tag = (ae?.tagName || '').toLowerCase()
      if (tag === 'textarea' || tag === 'input') return
      if (e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo() }
      if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) { e.preventDefault(); redo() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [undo, redo])

  const handleExportJson = () => {
    const data = {
      version: 1, text, textVisible, fontSize, fontColor, fontBold, textAlign, textPill, textOutline, textShadow, textX, textY,
      subText, subTextVisible, subFontSize, subFontColor, subFontBold, subTextAlign, subTextPill, subTextOutline, subTextShadow, subTextX, subTextY,
      extraTexts, frameType, frameColor, buttonLayout, frameScale, frameOffsetY, frameShadow, screenshotOverlay, screenshotFilter,
      bgType, bgColor, bgColor2, bgDirection, blurSigma, bgImageOffsetY, screenshotOffsetY, sizes,
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    Object.assign(document.createElement('a'), { href: url, download: 'mockup-settings.json' }).click()
    setTimeout(() => URL.revokeObjectURL(url), 2000)
  }

  const handleImportJson = (file?: File) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const s = JSON.parse(String(e.target?.result))
        const set = (k: string, fn: any) => { if (s[k] !== undefined) fn(s[k]) }
        set('text', setText); set('textVisible', setTextVisible); set('fontSize', setFontSize); set('fontColor', setFontColor); set('fontBold', setFontBold); set('textAlign', setTextAlign)
        set('textPill', setTextPill); set('textOutline', setTextOutline); set('textShadow', setTextShadow); set('textX', setTextX); set('textY', setTextY)
        set('subText', setSubText); set('subTextVisible', setSubTextVisible); set('subFontSize', setSubFontSize); set('subFontColor', setSubFontColor); set('subFontBold', setSubFontBold); set('subTextAlign', setSubTextAlign)
        set('subTextPill', setSubTextPill); set('subTextOutline', setSubTextOutline); set('subTextShadow', setSubTextShadow); set('subTextX', setSubTextX); set('subTextY', setSubTextY)
        set('extraTexts', setExtraTexts); set('frameType', setFrameType); set('frameColor', setFrameColor); set('buttonLayout', setButtonLayout)
        set('frameScale', setFrameScale); set('frameOffsetY', setFrameOffsetY); set('frameShadow', setFrameShadow); set('screenshotOverlay', setScreenshotOverlay); set('screenshotFilter', setScreenshotFilter)
        set('bgType', setBgType); set('bgColor', setBgColor); set('bgColor2', setBgColor2); set('bgDirection', setBgDirection); set('blurSigma', setBlurSigma); set('bgImageOffsetY', setBgImageOffsetY); set('screenshotOffsetY', setScreenshotOffsetY)
        set('sizes', setSizes)
        setToast('設定をインポートしました')
      } catch { setError('JSONの読み込みに失敗しました') }
    }
    reader.readAsText(file)
  }

  const handleFontAdd = useCallback((family: string, name: string) => { setFontList((prev) => [...prev, { family, name }]); setSelectedFont(family) }, [])
  const handleFontRemove = useCallback((family: string) => { setFontList((prev) => prev.filter((f) => f.family !== family)); setSelectedFont((prev) => (prev === family ? '' : prev)) }, [])

  const commonDrawProps = () => ({
    text: textVisible ? text : '', fontSize, fontColor, fontBold, textAlign, textPill, textOutline,
    subText: subTextVisible ? subText : '', subFontSize, subFontColor, subFontBold, subTextAlign, subTextPill, subTextOutline,
    extraTexts: extraTexts.map((et) => (et.visible === false ? { ...et, text: '' } : et)),
    frameType, frameColor, buttonLayout, frameScale, frameOffsetY, frameShadow,
    screenshotOverlay, screenshotFilter, textShadow, subTextShadow,
    bgType, bgColor, bgColor2, bgDirection, blurSigma, bgImageEl, bgImageOffsetY, screenshotOffsetY,
    logoEl, logoPosX, logoPosY, logoSize, logoCornerRadius,
    textX, textY, subTextX, subTextY, customFontFamily: selectedFont,
  })

  const handleDownloadSinglePng = async (sizeId: string) => {
    if (!images.length) { setError('まず画像をアップロードしてください'); return }
    const size = SIZES[sizeId]
    if (!size) return
    setLoading(true); setError('')
    try {
      await (document as any).fonts.ready
      const canvas = document.createElement('canvas')
      canvas.width = size.width; canvas.height = size.height
      drawPreview(canvas, { imageEl: activeImageEl, ...commonDrawProps() })
      const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/png'))
      if (blob) {
        const dlUrl = URL.createObjectURL(blob)
        Object.assign(document.createElement('a'), { href: dlUrl, download: `${size.label}.png` }).click()
        setTimeout(() => URL.revokeObjectURL(dlUrl), 2000)
      }
      canvas.width = 0
    } catch (err: any) { setError(`保存に失敗しました: ${err.message}`) } finally { setLoading(false) }
  }

  const handleGenerate = async () => {
    if (!images.length) { setError('まず画像をアップロードしてください'); return }
    const selectedSizes = Object.entries(sizes).filter(([, v]) => v).map(([k]) => k)
    if (!selectedSizes.length) { setError('少なくとも1つのサイズを選択してください'); return }
    setLoading(true); setError('')
    try {
      await (document as any).fonts.ready
      const zip = new JSZip()
      const multiScene = images.length > 1
      const base = commonDrawProps()
      const effectiveExtra = extraTexts.map((et) => (et.visible === false ? { ...et, text: '' } : et))
      for (let imgIdx = 0; imgIdx < images.length; imgIdx++) {
        const scenePrefix = multiScene ? `scene-${imgIdx + 1}/` : ''
        const imageEl = images[imgIdx].el
        for (const sizeId of selectedSizes) {
          const size = SIZES[sizeId as string]
          const canvas = document.createElement('canvas')
          canvas.width = size.width; canvas.height = size.height
          drawPreview(canvas, { ...base, imageEl, extraTexts: effectiveExtra })
          const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/png'))
          if (blob) zip.file(`${scenePrefix}${size.folder}/${size.label}.png`, await blob.arrayBuffer())
          canvas.width = 0
        }
      }
      const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } })
      const dlUrl = URL.createObjectURL(zipBlob)
      const a = Object.assign(document.createElement('a'), { href: dlUrl, download: 'mockup-screenshots.zip' })
      document.body.appendChild(a); a.click(); document.body.removeChild(a)
      setTimeout(() => URL.revokeObjectURL(dlUrl), 2000)
      setToast(`${images.length * selectedSizes.length}枚の画像を生成してZIPに保存しました`)
    } catch (err: any) { setError(`生成に失敗しました: ${err.message}`) } finally { setLoading(false) }
  }

  return (
    <div ref={rootRef} className="text-zinc-100">
      {/* Toolbar */}
      <div className="flex items-center gap-1.5 flex-wrap mb-3">
        <button type="button" onClick={undo} disabled={!canUndo} title="元に戻す (Ctrl+Z)"
          className="w-7 h-7 rounded-md flex items-center justify-center transition-all text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 disabled:opacity-20 disabled:cursor-not-allowed">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 6.5C2 6.5 3.5 3 7 3c2.5 0 4.5 1.5 5 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /><path d="M2 3v3.5H5.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        <button type="button" onClick={redo} disabled={!canRedo} title="やり直し (Ctrl+Y)"
          className="w-7 h-7 rounded-md flex items-center justify-center transition-all text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 disabled:opacity-20 disabled:cursor-not-allowed">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M12 6.5C12 6.5 10.5 3 7 3c-2.5 0-4.5 1.5-5 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /><path d="M12 3v3.5H8.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        <div className="w-px h-4 bg-zinc-800 mx-1" />
        <button type="button" onClick={handleExportJson} className="px-2.5 py-1 rounded-md text-[11px] font-medium border border-zinc-700/80 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200 transition-all">JSON 書き出し</button>
        <button type="button" onClick={() => jsonInputRef.current?.click()} className="px-2.5 py-1 rounded-md text-[11px] font-medium border border-zinc-700/80 text-zinc-400 hover:border-teal/40 hover:text-teal transition-all">JSON 読み込み</button>
        <input ref={jsonInputRef} type="file" accept=".json" className="hidden" onChange={(e) => { handleImportJson(e.target.files?.[0]); e.target.value = '' }} />
      </div>

      {/* Body */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* Controls */}
        <div className="flex flex-col rounded-xl border border-zinc-800 bg-zinc-900/40 divide-y divide-zinc-800 overflow-hidden order-2 lg:order-1">
          <CollapsibleSection label="スクリーンショット" defaultOpen>
            <MultiDropZone images={images} activeIndex={activeImageIndex} onImages={setImages} onActiveChange={setActiveImageIndex} />
            {images.length > 0 && (
              <>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[10px] text-zinc-500 shrink-0">表示位置</span>
                  <input type="range" min={0} max={100} value={screenshotOffsetY} onChange={(e) => setScreenshotOffsetY(Number(e.target.value))} className="flex-1 accent-teal" />
                  <span className="text-[10px] text-zinc-500 font-mono w-5 text-right shrink-0">{screenshotOffsetY === 0 ? '上' : screenshotOffsetY === 100 ? '下' : screenshotOffsetY}</span>
                </div>
                <div className="flex flex-col gap-1.5 mt-2 pt-2 border-t border-zinc-800/60">
                  {[{ key: 'brightness', label: '明るさ', min: 50, max: 150 }, { key: 'contrast', label: 'コントラスト', min: 50, max: 150 }, { key: 'saturation', label: '彩度', min: 0, max: 200 }].map(({ key, label, min, max }) => (
                    <div key={key} className="flex items-center gap-2">
                      <span className="text-[10px] text-zinc-500 w-16 shrink-0">{label}</span>
                      <input type="range" min={min} max={max} value={screenshotFilter[key]} onChange={(e) => setScreenshotFilter((v: any) => ({ ...v, [key]: Number(e.target.value) }))} className="flex-1 accent-teal" />
                      <span className="text-[10px] text-zinc-500 font-mono w-7 text-right shrink-0">{screenshotFilter[key]}</span>
                    </div>
                  ))}
                  {(screenshotFilter.brightness !== 100 || screenshotFilter.contrast !== 100 || screenshotFilter.saturation !== 100) && (
                    <button type="button" onClick={() => setScreenshotFilter(DEFAULT_SCREENSHOT_FILTER)} className="text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors self-end">リセット</button>
                  )}
                </div>
              </>
            )}
          </CollapsibleSection>

          <CollapsibleSection label="端末フレーム" defaultOpen>
            <FrameSelector frameType={frameType} onChange={setFrameType} frameColor={frameColor} onColorChange={setFrameColor} buttonLayout={buttonLayout} onButtonLayoutChange={setButtonLayout} />
            {frameType !== 'none' && (
              <div className="flex flex-col gap-1.5 mt-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-zinc-500 w-12 shrink-0">サイズ</span>
                  <input type="range" min={60} max={100} value={frameScale} onChange={(e) => setFrameScale(Number(e.target.value))} className="flex-1 accent-teal" />
                  <span className="text-[10px] text-zinc-500 font-mono w-7 text-right shrink-0">{frameScale}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-zinc-500 w-12 shrink-0">上マージン</span>
                  <input type="range" min={0} max={50} value={frameOffsetY} onChange={(e) => setFrameOffsetY(Number(e.target.value))} className="flex-1 accent-teal" />
                  <span className="text-[10px] text-zinc-500 font-mono w-7 text-right shrink-0">{frameOffsetY}%</span>
                </div>
                <div className="flex items-center gap-2 pt-0.5">
                  <span className="text-[10px] text-zinc-500 flex-1">シャドウ</span>
                  <button type="button" onClick={() => setFrameShadow((v: any) => ({ ...v, enabled: !v.enabled }))}
                    className={['relative w-8 h-4 rounded-full transition-colors duration-200', frameShadow.enabled ? 'bg-teal' : 'bg-zinc-700'].join(' ')}>
                    <span className={['absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform duration-200', frameShadow.enabled ? 'translate-x-4' : 'translate-x-0.5'].join(' ')} />
                  </button>
                </div>
                {frameShadow.enabled && (
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-2">
                      <input type="color" value={frameShadow.color} onChange={(e) => setFrameShadow((v: any) => ({ ...v, color: e.target.value }))} className="w-6 h-6 rounded cursor-pointer shrink-0" style={{ colorScheme: 'dark' }} />
                      <span className="text-[10px] text-zinc-500 w-8 shrink-0">ぼかし</span>
                      <input type="range" min={0} max={80} value={frameShadow.blur} onChange={(e) => setFrameShadow((v: any) => ({ ...v, blur: Number(e.target.value) }))} className="flex-1 accent-teal" />
                      <span className="text-[10px] text-zinc-500 font-mono w-5 text-right shrink-0">{frameShadow.blur}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-zinc-500 w-14 shrink-0">オフセット</span>
                      <input type="range" min={-40} max={80} value={frameShadow.offsetY} onChange={(e) => setFrameShadow((v: any) => ({ ...v, offsetY: Number(e.target.value) }))} className="flex-1 accent-teal" />
                      <span className="text-[10px] text-zinc-500 font-mono w-5 text-right shrink-0">{frameShadow.offsetY}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-zinc-500 w-14 shrink-0">不透明度</span>
                      <input type="range" min={0} max={100} value={frameShadow.opacity} onChange={(e) => setFrameShadow((v: any) => ({ ...v, opacity: Number(e.target.value) }))} className="flex-1 accent-teal" />
                      <span className="text-[10px] text-zinc-500 font-mono w-6 text-right shrink-0">{frameShadow.opacity}%</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CollapsibleSection>

          <CollapsibleSection label="スクリーンオーバーレイ" defaultOpen={false}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] text-zinc-400 flex-1">スクリーンに色を重ねる</span>
              <button type="button" onClick={() => setScreenshotOverlay((v: any) => ({ ...v, enabled: !v.enabled }))}
                className={['relative w-8 h-4 rounded-full transition-colors duration-200', screenshotOverlay.enabled ? 'bg-teal' : 'bg-zinc-700'].join(' ')}>
                <span className={['absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform duration-200', screenshotOverlay.enabled ? 'translate-x-4' : 'translate-x-0.5'].join(' ')} />
              </button>
            </div>
            {screenshotOverlay.enabled && (
              <div className="flex items-center gap-2">
                <input type="color" value={screenshotOverlay.color} onChange={(e) => setScreenshotOverlay((v: any) => ({ ...v, color: e.target.value }))} className="w-7 h-7 rounded cursor-pointer shrink-0" style={{ colorScheme: 'dark' }} />
                <input type="range" min={0} max={100} value={screenshotOverlay.opacity} onChange={(e) => setScreenshotOverlay((v: any) => ({ ...v, opacity: Number(e.target.value) }))} className="flex-1 accent-teal" />
                <span className="text-[10px] text-zinc-500 font-mono w-6 text-right shrink-0">{screenshotOverlay.opacity}%</span>
              </div>
            )}
          </CollapsibleSection>

          <CollapsibleSection label="背景" defaultOpen>
            <BgControls bgType={bgType} onBgTypeChange={setBgType} bgColor={bgColor} onBgColorChange={setBgColor} bgColor2={bgColor2} onBgColor2Change={setBgColor2}
              bgDirection={bgDirection} onBgDirectionChange={setBgDirection} blurSigma={blurSigma} onBlurSigmaChange={setBlurSigma}
              bgImageName={bgImageFile?.name || ''} onBgImageChange={(f: File | null) => { setBgImageFile(f); if (!f) setBgImageEl(null) }}
              bgImageOffsetY={bgImageOffsetY} onBgImageOffsetYChange={setBgImageOffsetY} />
          </CollapsibleSection>

          <CollapsibleSection label="ロゴ / アイコン" defaultOpen={false}>
            <LogoPanel logoName={logoFile?.name || ''} onLogo={(f: File) => { setLogoFile(f); setLogoPosX(50); setLogoPosY(15) }} onReset={() => setLogoFile(null)}
              logoSize={logoSize} onLogoSizeChange={setLogoSize} logoCornerRadius={logoCornerRadius} onLogoCornerRadiusChange={setLogoCornerRadius} />
          </CollapsibleSection>

          <CollapsibleSection label="フォント" defaultOpen={false}>
            <FontDropZone fontList={fontList} selectedFont={selectedFont} onFontAdd={handleFontAdd} onFontRemove={handleFontRemove} onFontSelect={setSelectedFont} />
          </CollapsibleSection>

          <CollapsibleSection label="テンプレート" defaultOpen={false}>
            <TemplatePanel currentSettings={templateSettings} onLoad={loadTemplate} />
          </CollapsibleSection>

          <CollapsibleSection label="テキスト" defaultOpen>
            <div className="flex flex-col gap-4">
              <TextBlock label="キャッチコピー" placeholder="爽快アクション！全100ステージ！"
                visible={textVisible} onVisibleChange={setTextVisible} text={text} onTextChange={setText}
                fontSize={fontSize} onFontSizeChange={setFontSize} fontColor={fontColor} onFontColorChange={setFontColor}
                fontBold={fontBold} onFontBoldChange={setFontBold} align={textAlign} onAlignChange={setTextAlign}
                pill={textPill} onPillChange={setTextPill} outline={textOutline} onOutlineChange={setTextOutline} shadow={textShadow} onShadowChange={setTextShadow}
                x={textX} onXChange={setTextX} y={textY} onYChange={setTextY} />
              <div className="border-t border-zinc-800/70" />
              <TextBlock label="サブテキスト" placeholder="無料でダウンロード"
                visible={subTextVisible} onVisibleChange={setSubTextVisible} text={subText} onTextChange={setSubText}
                fontSize={subFontSize} onFontSizeChange={setSubFontSize} fontColor={subFontColor} onFontColorChange={setSubFontColor}
                fontBold={subFontBold} onFontBoldChange={setSubFontBold} align={subTextAlign} onAlignChange={setSubTextAlign}
                pill={subTextPill} onPillChange={setSubTextPill} outline={subTextOutline} onOutlineChange={setSubTextOutline} shadow={subTextShadow} onShadowChange={setSubTextShadow}
                x={subTextX} onXChange={setSubTextX} y={subTextY} onYChange={setSubTextY} />
              {extraTexts.map((et, i) => (
                <React.Fragment key={et.id}>
                  <div className="border-t border-zinc-800/70" />
                  <TextBlock label={`テキスト ${i + 1}`} placeholder="追加テキスト" onRemove={() => removeExtraText(et.id)}
                    visible={et.visible ?? true} onVisibleChange={(v: boolean) => updateExtraText(et.id, { visible: v })}
                    text={et.text} onTextChange={(v: string) => updateExtraText(et.id, { text: v })}
                    fontSize={et.fontSize} onFontSizeChange={(v: number) => updateExtraText(et.id, { fontSize: v })}
                    fontColor={et.fontColor} onFontColorChange={(v: string) => updateExtraText(et.id, { fontColor: v })}
                    fontBold={et.fontBold} onFontBoldChange={(v: boolean) => updateExtraText(et.id, { fontBold: v })}
                    align={et.align || 'center'} onAlignChange={(v: string) => updateExtraText(et.id, { align: v })}
                    pill={et.pill || DEFAULT_PILL} onPillChange={(v: any) => updateExtraText(et.id, { pill: v })}
                    outline={et.outline || DEFAULT_OUTLINE} onOutlineChange={(v: any) => updateExtraText(et.id, { outline: v })}
                    shadow={et.shadow || DEFAULT_TEXT_SHADOW} onShadowChange={(v: any) => updateExtraText(et.id, { shadow: v })}
                    x={et.x} onXChange={(v: number) => updateExtraText(et.id, { x: v })} y={et.y} onYChange={(v: number) => updateExtraText(et.id, { y: v })} />
                </React.Fragment>
              ))}
              <button type="button" onClick={addExtraText}
                className="w-full py-2 rounded-lg border border-dashed border-zinc-700/50 text-zinc-600 text-[11px] font-medium hover:border-teal/30 hover:text-teal/60 transition-all flex items-center justify-center gap-1.5">
                <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M5.5 1v9M1 5.5h9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>テキスト追加
              </button>
            </div>
          </CollapsibleSection>
        </div>

        {/* Preview + Generate */}
        <div className="order-1 lg:order-2 lg:sticky lg:top-4 self-start flex flex-col gap-3">
          <div className="flex items-center justify-center gap-0.5 bg-zinc-900 rounded-xl p-1 border border-zinc-800/80">
            {Object.entries(PREVIEW_DEVICES).map(([id, dev]) => (
              <button key={id} type="button" onClick={() => setPreviewDevice(id)}
                className={['px-3 py-1.5 rounded-lg text-[10px] font-medium transition-all', previewDevice === id ? 'bg-zinc-700/90 text-zinc-100 shadow-sm' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'].join(' ')}>{dev.label}</button>
            ))}
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 flex justify-center">
            <PreviewCanvas ref={previewRef} previewW={previewW} previewH={previewH} imageEl={activeImageEl}
              {...commonDrawProps()}
              onTextPosChange={(x: number, y: number) => { setTextX(x); setTextY(y) }}
              onSubTextPosChange={(x: number, y: number) => { setSubTextX(x); setSubTextY(y) }}
              onExtraTextPosChange={(id: number, x: number, y: number) => updateExtraText(id, { x, y })}
              onLogoPosChange={(x: number, y: number) => { setLogoPosX(x); setLogoPosY(y) }} />
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
            <GeneratePanel sizes={sizes} onSizeChange={(id: string, val: boolean) => setSizes((prev: any) => ({ ...prev, [id]: val }))}
              loading={loading} error={error} onGenerate={handleGenerate}
              onDownloadPng={() => previewRef.current?.downloadPng()} onDownloadSingle={handleDownloadSinglePng} imageCount={images.length} />
          </div>
        </div>
      </div>

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  )
}
