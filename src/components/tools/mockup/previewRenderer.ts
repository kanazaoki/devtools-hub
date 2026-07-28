// Ported from the BOOTH desktop version of MockupBuilder (framework-agnostic canvas renderer).

export const PREVIEW_W = 260
export const PREVIEW_H = Math.round((PREVIEW_W * 2796) / 1290)

if (
  typeof CanvasRenderingContext2D !== 'undefined' &&
  !CanvasRenderingContext2D.prototype.roundRect
) {
  ;(CanvasRenderingContext2D.prototype as any).roundRect = function (
    x: number, y: number, w: number, h: number, r: number
  ) {
    r = Math.min(r, w / 2, h / 2)
    this.moveTo(x + r, y); this.lineTo(x + w - r, y)
    this.quadraticCurveTo(x + w, y, x + w, y + r)
    this.lineTo(x + w, y + h - r)
    this.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
    this.lineTo(x + r, y + h)
    this.quadraticCurveTo(x, y + h, x, y + h - r)
    this.lineTo(x, y + r)
    this.quadraticCurveTo(x, y, x + r, y); this.closePath()
  }
}

export const FRAME_COLORS: Record<string, { border: string; feature: string; buttons: string }> = {
  black:  { border: '#1c1c1e', feature: '#0a0a0a', buttons: '#2a2a2a' },
  silver: { border: '#b8b8bf', feature: '#8a8a94', buttons: '#c8c8cf' },
  gold:   { border: '#b8935a', feature: '#8a6830', buttons: '#c8a870' },
  purple: { border: '#3d2f5c', feature: '#231840', buttons: '#4d3f6c' },
}

function resolveFrameColors(frameColor: string) {
  if (FRAME_COLORS[frameColor]) return FRAME_COLORS[frameColor]
  const h = frameColor.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16) || 0
  const g = parseInt(h.slice(2, 4), 16) || 0
  const b = parseInt(h.slice(4, 6), 16) || 0
  const adj = (v: number, f: number) =>
    Math.min(255, Math.max(0, Math.round(v * f))).toString(16).padStart(2, '0')
  return {
    border: frameColor,
    feature: `#${adj(r, 0.45)}${adj(g, 0.45)}${adj(b, 0.45)}`,
    buttons: `#${adj(r, 1.25)}${adj(g, 1.25)}${adj(b, 1.25)}`,
  }
}

function getLayout(w: number, h: number, opts: any = {}) {
  const { frameScale = 100, frameOffsetY = 20 } = opts
  const S = frameScale / 100
  const isIpad = w / h > 0.65

  let frameW: number, frameX: number, frameH: number, frameY: number, borderThick: number, cornerR: number

  if (isIpad) {
    const hMargin = Math.round(w * 0.04)
    frameW = Math.round((w - 2 * hMargin) * S)
    frameX = Math.round((w - frameW) / 2)
    frameH = Math.round((frameW * h) / w)
    const spaceY = h - frameH
    frameY = Math.round((spaceY * frameOffsetY) / 100)
    borderThick = Math.round(frameW * 0.028)
    cornerR = Math.round(frameW * 0.06)
  } else {
    frameW = Math.round(w * 0.84 * S)
    frameX = Math.round((w - frameW) / 2)
    frameH = Math.round(h * 0.76 * S)
    frameY = Math.round((h * frameOffsetY) / 100)
    borderThick = Math.round(frameW * 0.035)
    cornerR = Math.round(frameW * 0.09)
  }

  const screenX = frameX + borderThick
  const screenY = frameY + borderThick
  const screenW = frameW - 2 * borderThick
  const screenH = frameH - 2 * borderThick
  const screenCornerR = Math.max(2, cornerR - borderThick)
  return { frameX, frameY, frameW, frameH, borderThick, cornerR, screenX, screenY, screenW, screenH, screenCornerR, isIpad }
}

function wrapTextCanvas(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const words = text.split(/\s+/)
  const lines: string[] = []
  let cur = ''
  for (const w of words) {
    const c = cur ? `${cur} ${w}` : w
    if (ctx.measureText(c).width <= maxWidth) cur = c
    else { if (cur) lines.push(cur); cur = w }
  }
  if (cur) lines.push(cur)
  return lines.length ? lines : ['']
}

function hexToRgba(hex: string, alpha: number) {
  const h = hex.replace('#', '')
  return `rgba(${parseInt(h.slice(0, 2), 16)},${parseInt(h.slice(2, 4), 16)},${parseInt(h.slice(4, 6), 16)},${alpha.toFixed(3)})`
}

function drawText(
  ctx: CanvasRenderingContext2D, w: number, h: number,
  text: string, fontSize: number, fontColor: string, fontBold: boolean, fontFam: string,
  centerX: number, centerY: number, align: CanvasTextAlign = 'center',
  pill: any = null, outline: any = null, shadow: any = null
) {
  if (!text || !text.trim()) return
  const scale = w / 1290
  const scaledSz = Math.max(6, Math.round(fontSize * scale))
  ctx.font = `${fontBold ? 'bold' : 'normal'} ${scaledSz}px ${fontFam}`
  ctx.textAlign = align
  ctx.textBaseline = 'alphabetic'

  const maxW = Math.round(w * 0.85)
  const lines = wrapTextCanvas(ctx, text.trim(), maxW)
  const lineH = scaledSz * 1.35
  const totalH = lineH * lines.length
  const startY = centerY - totalH / 2 + scaledSz

  if (pill?.enabled) {
    ctx.save()
    let maxLineW = 0
    for (const line of lines) maxLineW = Math.max(maxLineW, ctx.measureText(line).width)
    const padH = scaledSz * 0.55, padV = scaledSz * 0.3, r = scaledSz * 0.4
    const pillW = maxLineW + padH * 2, pillH = totalH + padV * 2
    const pillX = align === 'left' ? centerX - padH : align === 'right' ? centerX - pillW + padH : centerX - pillW / 2
    ctx.fillStyle = hexToRgba(pill.color || '#000000', (pill.opacity ?? 50) / 100)
    ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0
    ctx.beginPath(); ctx.roundRect(pillX, startY - scaledSz - padV, pillW, pillH, r); ctx.fill()
    ctx.restore()
  }

  if (outline?.enabled && (outline.width ?? 0) > 0) {
    ctx.save()
    ctx.strokeStyle = outline.color || '#000000'
    ctx.lineWidth = Math.max(0.5, (outline.width || 2) * scale * 2)
    ctx.lineJoin = 'round'
    ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0
    let y = startY
    for (const line of lines) { ctx.strokeText(line, centerX, y); y += lineH }
    ctx.restore()
  }

  ctx.fillStyle = fontColor
  if (shadow?.enabled !== false) {
    ctx.shadowColor = hexToRgba(shadow?.color || '#000000', (shadow?.opacity ?? 60) / 100)
    ctx.shadowBlur = Math.round((shadow?.blur ?? 8) * scale)
    ctx.shadowOffsetY = Math.round((shadow?.blur ?? 8) * scale * 0.35)
  } else {
    ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0
  }
  let y = startY
  for (const line of lines) { ctx.fillText(line, centerX, y); y += lineH }
  ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0
}

function getButtonRects(
  layout: string, frameX: number, frameY: number, frameW: number, frameH: number, btnW: number
): number[][] {
  const lx = frameX - btnW, rx = frameX + frameW
  const h = frameH, rnd = Math.round
  switch (layout) {
    case 'right':
      return [
        [rx, frameY + rnd(h * 0.10), btnW, rnd(h * 0.05)],
        [rx, frameY + rnd(h * 0.17), btnW, rnd(h * 0.08)],
        [rx, frameY + rnd(h * 0.27), btnW, rnd(h * 0.08)],
        [rx, frameY + rnd(h * 0.38), btnW, rnd(h * 0.12)],
      ]
    case 'left':
      return [
        [lx, frameY + rnd(h * 0.10), btnW, rnd(h * 0.05)],
        [lx, frameY + rnd(h * 0.17), btnW, rnd(h * 0.08)],
        [lx, frameY + rnd(h * 0.27), btnW, rnd(h * 0.08)],
        [lx, frameY + rnd(h * 0.38), btnW, rnd(h * 0.12)],
      ]
    case 'none':
      return []
    default:
      return [
        [lx, frameY + rnd(h * 0.10), btnW, rnd(h * 0.05)],
        [lx, frameY + rnd(h * 0.17), btnW, rnd(h * 0.08)],
        [lx, frameY + rnd(h * 0.27), btnW, rnd(h * 0.08)],
        [rx, frameY + rnd(h * 0.22), btnW, rnd(h * 0.12)],
      ]
  }
}

export function drawPreview(canvas: HTMLCanvasElement, opts: any) {
  const {
    imageEl,
    text, fontSize, fontColor, fontBold, textAlign = 'center', textPill, textOutline,
    subText, subFontSize, subFontColor, subFontBold, subTextAlign = 'center', subTextPill, subTextOutline,
    extraTexts = [],
    frameType, frameColor = 'black',
    buttonLayout = 'standard',
    frameScale = 100, frameOffsetY = 20,
    frameShadow = null,
    bgType, bgColor, bgColor2, bgDirection, blurSigma, bgImageEl, bgImageOffsetY = 50,
    screenshotOffsetY = 0,
    screenshotOverlay,
    screenshotFilter = null,
    textShadow = null, subTextShadow = null,
    logoEl, logoPosX = 50, logoPosY = 15, logoSize = 15, logoCornerRadius = 22,
    textX = 50, textY = 10,
    subTextX = 50, subTextY = 94,
    customFontFamily,
  } = opts

  const ctx = canvas.getContext('2d')!
  const w = canvas.width, h = canvas.height
  const l = getLayout(w, h, { frameScale, frameOffsetY })
  const { frameX, frameY, frameW, frameH, borderThick, cornerR, screenX, screenY, screenW, screenH, screenCornerR, isIpad } = l
  const fc = resolveFrameColors(frameColor)

  ctx.clearRect(0, 0, w, h)

  // 1. Background
  if (bgType === 'image' && bgImageEl) {
    const iw = bgImageEl.naturalWidth, ih = bgImageEl.naturalHeight
    const scale = Math.max(w / iw, h / ih) * 1.1
    const srcW = w / scale, srcH = h / scale
    ctx.drawImage(bgImageEl, (iw - srcW) * 0.5, (ih - srcH) * Math.max(0, Math.min(1, bgImageOffsetY / 100)), srcW, srcH, 0, 0, w, h)
  } else if (bgType === 'blur' && imageEl) {
    ctx.save()
    const blurPx = Math.max(4, Math.round(((blurSigma || 25) / 30) * w * 0.055))
    ctx.filter = `blur(${blurPx}px)`
    const ia = imageEl.naturalHeight / imageEl.naturalWidth, ca = h / w
    let bsx = 0, bsy = 0, bsw = imageEl.naturalWidth, bsh = imageEl.naturalHeight
    if (ia > ca) { bsh = imageEl.naturalWidth * ca; bsy = (imageEl.naturalHeight - bsh) / 2 }
    else { bsw = imageEl.naturalHeight / ca; bsx = (imageEl.naturalWidth - bsw) / 2 }
    const pad = blurPx * 2
    ctx.drawImage(imageEl, bsx, bsy, bsw, bsh, -pad, -pad, w + pad * 2, h + pad * 2)
    ctx.filter = 'none'
    ctx.fillStyle = 'rgba(0,0,0,0.42)'; ctx.fillRect(0, 0, w, h)
    ctx.restore()
  } else if (bgType === 'gradient') {
    const dirs: Record<string, number[]> = { vertical: [w / 2, 0, w / 2, h], horizontal: [0, h / 2, w, h / 2], diagonal: [0, 0, w, h] }
    const [x0, y0, x1, y1] = dirs[bgDirection] || dirs.vertical
    const grad = ctx.createLinearGradient(x0, y0, x1, y1)
    grad.addColorStop(0, bgColor); grad.addColorStop(1, bgColor2 || bgColor)
    ctx.fillStyle = grad; ctx.fillRect(0, 0, w, h)
  } else {
    ctx.fillStyle = bgType === 'blur' || bgType === 'image' ? '#14141e' : bgColor
    ctx.fillRect(0, 0, w, h)
  }

  // 1.5 Frame shadow
  if (frameType !== 'none' && frameShadow?.enabled) {
    const sScale = w / 1290
    ctx.save()
    ctx.shadowColor = hexToRgba(frameShadow.color || '#000000', (frameShadow.opacity ?? 60) / 100)
    ctx.shadowBlur = Math.round((frameShadow.blur ?? 20) * sScale)
    ctx.shadowOffsetX = 0
    ctx.shadowOffsetY = Math.round((frameShadow.offsetY ?? 10) * sScale)
    ctx.fillStyle = fc.border
    ctx.beginPath(); ctx.roundRect(frameX, frameY, frameW, frameH, cornerR); ctx.fill()
    ctx.restore()
  }

  // 2. Screenshot
  if (imageEl) {
    ctx.save()
    ctx.beginPath(); ctx.roundRect(screenX, screenY, screenW, screenH, screenCornerR); ctx.clip()
    const imgAR = imageEl.naturalHeight / imageEl.naturalWidth, areaAR = screenH / screenW
    let sx: number, sy: number, sw: number, sh: number
    if (imgAR > areaAR) { sw = imageEl.naturalWidth; sh = sw * areaAR; sx = 0; sy = (imageEl.naturalHeight - sh) * Math.max(0, Math.min(1, screenshotOffsetY / 100)) }
    else { sh = imageEl.naturalHeight; sw = sh / areaAR; sx = (imageEl.naturalWidth - sw) * 0.5; sy = 0 }
    if (screenshotFilter) {
      const f = screenshotFilter
      ctx.filter = `brightness(${f.brightness ?? 100}%) contrast(${f.contrast ?? 100}%) saturate(${f.saturation ?? 100}%)`
    }
    ctx.drawImage(imageEl, sx, sy, sw, sh, screenX, screenY, screenW, screenH)
    ctx.filter = 'none'
    if (screenshotOverlay?.enabled && (screenshotOverlay.opacity ?? 0) > 0) {
      ctx.fillStyle = hexToRgba(screenshotOverlay.color || '#000000', (screenshotOverlay.opacity ?? 0) / 100)
      ctx.fillRect(screenX, screenY, screenW, screenH)
    }
    ctx.restore()
  }

  // 3. Frame border
  if (frameType !== 'none') {
    ctx.beginPath()
    ctx.roundRect(frameX, frameY, frameW, frameH, cornerR)
    ctx.roundRect(screenX, screenY, screenW, screenH, screenCornerR)
    ctx.fillStyle = fc.border; ctx.fill('evenodd')

    // 4. Device feature
    ctx.fillStyle = fc.feature
    if (isIpad) {
      const camR = Math.round(frameW * 0.012)
      ctx.beginPath(); ctx.arc(screenX + Math.round(screenW / 2), screenY + Math.round(camR * 2.5), camR, 0, Math.PI * 2); ctx.fill()
    } else if (frameType === 'dynamic_island') {
      const iW = Math.round(screenW * 0.28), iH = Math.round(iW * 0.28)
      ctx.beginPath(); ctx.roundRect(screenX + Math.round((screenW - iW) / 2), screenY + Math.round(borderThick * 0.5), iW, iH, iH / 2); ctx.fill()
    } else if (frameType === 'notch') {
      const nW = Math.round(screenW * 0.42), nH = Math.round(borderThick * 1.3)
      ctx.beginPath(); ctx.roundRect(screenX + Math.round((screenW - nW) / 2), frameY, nW, nH, nH * 0.4); ctx.fill()
    } else if (frameType === 'punchhole') {
      const hR = Math.round(screenW * 0.035)
      ctx.beginPath(); ctx.arc(screenX + Math.round(screenW / 2), screenY + Math.round(hR * 2.8), hR, 0, Math.PI * 2); ctx.fill()
    } else if (frameType === 'home_button') {
      const spW = Math.round(screenW * 0.22), spH = Math.round(borderThick * 0.45)
      ctx.beginPath(); ctx.roundRect(screenX + Math.round((screenW - spW) / 2), frameY + Math.round(borderThick * 0.3), spW, spH, spH / 2); ctx.fill()
      const hbR = Math.round(borderThick * 0.72)
      ctx.beginPath(); ctx.arc(screenX + Math.round(screenW / 2), frameY + frameH - Math.round(borderThick * 0.75), hbR, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = fc.border
      ctx.beginPath(); ctx.arc(screenX + Math.round(screenW / 2), frameY + frameH - Math.round(borderThick * 0.75), Math.round(hbR * 0.55), 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = fc.feature
    } else if (frameType === 'corner_hole') {
      const hR = Math.round(screenW * 0.03)
      ctx.beginPath(); ctx.arc(screenX + Math.round(hR * 2.8), screenY + Math.round(hR * 2.8), hR, 0, Math.PI * 2); ctx.fill()
    }

    // 5. Side buttons
    ctx.fillStyle = fc.buttons
    const btnW = Math.round(borderThick * 0.7), btnR = Math.round(btnW / 2)
    const btnRects = isIpad
      ? [
          [frameX + frameW, frameY + Math.round(frameH * 0.10), btnW, Math.round(frameH * 0.05)],
          [frameX + frameW, frameY + Math.round(frameH * 0.18), btnW, Math.round(frameH * 0.07)],
          [frameX + frameW, frameY + Math.round(frameH * 0.27), btnW, Math.round(frameH * 0.07)],
        ]
      : getButtonRects(buttonLayout, frameX, frameY, frameW, frameH, btnW)
    btnRects.forEach(([bx, by, bw, bh]) => { ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, btnR); ctx.fill() })
  }

  // 6. Logo overlay
  if (logoEl) {
    const logoW = Math.round((w * logoSize) / 100)
    const lx = Math.round((w * logoPosX) / 100 - logoW / 2)
    const ly = Math.round((h * logoPosY) / 100 - logoW / 2)
    const r = Math.round((logoW * logoCornerRadius) / 100)
    ctx.save()
    ctx.beginPath(); ctx.roundRect(lx, ly, logoW, logoW, r); ctx.clip()
    ctx.drawImage(logoEl, lx, ly, logoW, logoW)
    ctx.restore()
  }

  // 7. Text
  const fontFam = customFontFamily
    ? `"${customFontFamily}", Arial, "Yu Gothic UI", sans-serif`
    : 'Arial, "Yu Gothic UI", sans-serif'

  drawText(ctx, w, h, text, fontSize || 60, fontColor || '#fff', fontBold ?? true, fontFam, w * (textX / 100), h * (textY / 100), textAlign, textPill, textOutline, textShadow)
  drawText(ctx, w, h, subText, subFontSize || 40, subFontColor || '#fff', subFontBold ?? false, fontFam, w * (subTextX / 100), h * (subTextY / 100), subTextAlign, subTextPill, subTextOutline, subTextShadow)

  for (const et of extraTexts) {
    if (!et.text?.trim()) continue
    drawText(ctx, w, h, et.text, et.fontSize || 40, et.fontColor || '#fff', et.fontBold ?? false, fontFam,
      w * ((et.x ?? 50) / 100), h * ((et.y ?? 50) / 100), et.align || 'center', et.pill, et.outline, et.shadow)
  }
}
