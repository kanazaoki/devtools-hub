'use client'

import { useState, useMemo } from 'react'

const VOID_ELEMENTS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'param', 'source', 'track', 'wbr',
])

const ATTR_MAP: Record<string, string> = {
  'class': 'className',
  'for': 'htmlFor',
  'htmlfor': 'htmlFor',
  'tabindex': 'tabIndex',
  'readonly': 'readOnly',
  'maxlength': 'maxLength',
  'minlength': 'minLength',
  'cellspacing': 'cellSpacing',
  'cellpadding': 'cellPadding',
  'colspan': 'colSpan',
  'rowspan': 'rowSpan',
  'enctype': 'encType',
  'accesskey': 'accessKey',
  'crossorigin': 'crossOrigin',
  'contenteditable': 'contentEditable',
  'frameborder': 'frameBorder',
  'spellcheck': 'spellCheck',
  'autofocus': 'autoFocus',
  'autoplay': 'autoPlay',
  'novalidate': 'noValidate',
  'datetime': 'dateTime',
  'allowfullscreen': 'allowFullScreen',
  'autocomplete': 'autoComplete',
  'autocorrect': 'autoCorrect',
  'autosave': 'autoSave',
  'classid': 'classID',
  'contextmenu': 'contextMenu',
  'controlslist': 'controlsList',
  'defaultchecked': 'defaultChecked',
  'defaultvalue': 'defaultValue',
  'disablepictureinpicture': 'disablePictureInPicture',
  'disableremoteplayback': 'disableRemotePlayback',
  'formaction': 'formAction',
  'formenctype': 'formEncType',
  'formmethod': 'formMethod',
  'formnovalidate': 'formNoValidate',
  'formtarget': 'formTarget',
  'hreflang': 'hrefLang',
  'httpequiv': 'httpEquiv',
  'inputmode': 'inputMode',
  'marginheight': 'marginHeight',
  'marginwidth': 'marginWidth',
  'mediagroup': 'mediaGroup',
  'noshade': 'noShade',
  'noresize': 'noResize',
  'nowrap': 'noWrap',
  'radiogroup': 'radioGroup',
  'referrerpolicy': 'referrerPolicy',
  'srcdoc': 'srcDoc',
  'srclang': 'srcLang',
  'srcset': 'srcSet',
  'usemap': 'useMap',
  'valuetype': 'valueType',
}

const EVENT_MAP: Record<string, string> = {
  'onclick': 'onClick',
  'onchange': 'onChange',
  'onsubmit': 'onSubmit',
  'onreset': 'onReset',
  'onkeydown': 'onKeyDown',
  'onkeyup': 'onKeyUp',
  'onkeypress': 'onKeyPress',
  'onmousedown': 'onMouseDown',
  'onmouseup': 'onMouseUp',
  'onmouseover': 'onMouseOver',
  'onmouseout': 'onMouseOut',
  'onmousemove': 'onMouseMove',
  'onmouseenter': 'onMouseEnter',
  'onmouseleave': 'onMouseLeave',
  'onfocus': 'onFocus',
  'onblur': 'onBlur',
  'oninput': 'onInput',
  'ondblclick': 'onDoubleClick',
  'ontouchstart': 'onTouchStart',
  'ontouchend': 'onTouchEnd',
  'ontouchmove': 'onTouchMove',
  'ontouchcancel': 'onTouchCancel',
  'ondragstart': 'onDragStart',
  'ondragend': 'onDragEnd',
  'ondragover': 'onDragOver',
  'ondragenter': 'onDragEnter',
  'ondragleave': 'onDragLeave',
  'ondrag': 'onDrag',
  'ondrop': 'onDrop',
  'onscroll': 'onScroll',
  'onresize': 'onResize',
  'onload': 'onLoad',
  'onerror': 'onError',
  'onpaste': 'onPaste',
  'oncopy': 'onCopy',
  'oncut': 'onCut',
  'oncontextmenu': 'onContextMenu',
  'onwheel': 'onWheel',
  'onpointerdown': 'onPointerDown',
  'onpointerup': 'onPointerUp',
  'onpointermove': 'onPointerMove',
  'onpointerenter': 'onPointerEnter',
  'onpointerleave': 'onPointerLeave',
  'onpointercancel': 'onPointerCancel',
  'onpointerout': 'onPointerOut',
  'onpointerover': 'onPointerOver',
  'ongotpointercapture': 'onGotPointerCapture',
  'onlostpointercapture': 'onLostPointerCapture',
  'onanimationstart': 'onAnimationStart',
  'onanimationend': 'onAnimationEnd',
  'onanimationiteration': 'onAnimationIteration',
  'ontransitionend': 'onTransitionEnd',
  'onselect': 'onSelect',
  'onauxclick': 'onAuxClick',
  'oncanplay': 'onCanPlay',
  'oncanplaythrough': 'onCanPlayThrough',
  'ondurationchange': 'onDurationChange',
  'onemptied': 'onEmptied',
  'onended': 'onEnded',
  'onpause': 'onPause',
  'onplay': 'onPlay',
  'onplaying': 'onPlaying',
  'onprogress': 'onProgress',
  'onratechange': 'onRateChange',
  'onseeked': 'onSeeked',
  'onseeking': 'onSeeking',
  'onstalled': 'onStalled',
  'onsuspend': 'onSuspend',
  'ontimeupdate': 'onTimeUpdate',
  'onvolumechange': 'onVolumeChange',
  'onwaiting': 'onWaiting',
  'onloadstart': 'onLoadStart',
  'onloadeddata': 'onLoadedData',
  'onloadedmetadata': 'onLoadedMetadata',
  'oninvalid': 'onInvalid',
  'onbeforeinput': 'onBeforeInput',
  'oncompositionstart': 'onCompositionStart',
  'oncompositionend': 'onCompositionEnd',
  'oncompositionupdate': 'onCompositionUpdate',
}

function cssPropToCamel(prop: string): string {
  return prop.trim().replace(/-([a-z])/g, (_, c: string) => c.toUpperCase())
}

function convertStyle(value: string): string {
  const pairs = value.split(';').map((s) => s.trim()).filter(Boolean)
  const entries = pairs
    .map((pair) => {
      const idx = pair.indexOf(':')
      if (idx === -1) return null
      const key = cssPropToCamel(pair.slice(0, idx))
      const val = pair.slice(idx + 1).trim()
      return `${key}: '${val}'`
    })
    .filter(Boolean)
  if (entries.length === 0) return `{{}}`
  return `{{ ${entries.join(', ')} }}`
}

function convertAttrName(name: string): string {
  const lower = name.toLowerCase()
  if (ATTR_MAP[lower]) return ATTR_MAP[lower]
  if (EVENT_MAP[lower]) return EVENT_MAP[lower]
  if (lower.startsWith('on') && lower.length > 2) {
    return 'on' + lower[2].toUpperCase() + lower.slice(3)
  }
  if (name.includes('-')) {
    return name.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase())
  }
  return name
}

function convertAttributes(attrsStr: string): string {
  const attrRegex = /(\s+)([a-zA-Z][a-zA-Z0-9:_-]*)(?:=(?:"([^"]*?)"|'([^']*?)'|(\S+?(?=[\s>]))?))?(?=[\s>]|$)/g
  return attrsStr.replace(attrRegex, (_match, space, name, dq, sq, unquoted) => {
    const jsxName = convertAttrName(name)
    const rawValue = dq !== undefined ? dq : sq !== undefined ? sq : unquoted
    if (rawValue === undefined) {
      return `${space}${jsxName}`
    }
    if (name.toLowerCase() === 'style') {
      return `${space}${jsxName}=${convertStyle(rawValue)}`
    }
    return `${space}${jsxName}="${rawValue}"`
  })
}

function htmlToJsx(html: string): string {
  if (!html.trim()) return ''

  let result = html

  // HTML comments → {/* ... */}
  result = result.replace(/<!--([\s\S]*?)-->/g, (_: string, content: string) => `{/*${content}*/}`)

  // Opening tags: convert attributes and handle void/self-closing
  result = result.replace(/<([a-zA-Z][a-zA-Z0-9-]*)(\s[^>]*?)?\s*(\/?)>/g, (_match: string, tagName: string, attrs: string | undefined, selfClose: string) => {
    const lower = tagName.toLowerCase()
    const isVoid = VOID_ELEMENTS.has(lower)
    const processedAttrs = attrs ? convertAttributes(attrs) : ''
    const closing = isVoid || selfClose ? ' />' : '>'
    return `<${tagName}${processedAttrs}${closing}`
  })

  return result
}

const SAMPLE = `<div class="container" tabindex="0">
  <h1 class="title">Hello World</h1>
  <label for="email">Email</label>
  <input type="email" id="email" readonly maxlength="100">
  <img src="logo.png" alt="Logo">
  <br>
  <button onclick="handleClick()" class="btn btn-primary">
    Click me
  </button>
  <!-- This is a comment -->
  <p style="color: red; font-size: 14px; font-weight: bold;">
    Styled text
  </p>
</div>`

export function HtmlToJsx() {
  const [input, setInput] = useState(SAMPLE)
  const [copied, setCopied] = useState(false)

  const jsx = useMemo(() => htmlToJsx(input), [input])

  const handleCopy = () => {
    if (!jsx) return
    navigator.clipboard.writeText(jsx).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  const handleClear = () => setInput('')

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <button
            onClick={handleClear}
            className="rounded border border-border px-3 py-1.5 font-mono text-xs text-dim transition-colors hover:border-red-400/40 hover:text-red-400"
          >
            クリア
          </button>
          {jsx && (
            <span className="font-mono text-[10px] text-border tabular-nums">
              {input.length} → {jsx.length} 字
            </span>
          )}
        </div>
        <button
          onClick={handleCopy}
          disabled={!jsx}
          className={`rounded border px-4 py-1.5 font-mono text-xs font-semibold transition-all disabled:opacity-30 ${
            copied
              ? 'border-teal/60 bg-teal/15 text-teal'
              : 'border-teal/30 text-teal/70 hover:border-teal hover:bg-teal/10 hover:text-teal'
          }`}
        >
          {copied ? '✓ コピー済み' : '⬇ JSX をコピー'}
        </button>
      </div>

      {/* Two-pane editor */}
      <div className="grid gap-0 lg:grid-cols-[1fr_28px_1fr] items-start">
        {/* HTML input */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400" />
              <p className="font-mono text-[10px] font-semibold uppercase tracking-widest text-amber-400/70">HTML</p>
            </div>
            <span className="font-mono text-[10px] tabular-nums text-border">{input.length} 字</span>
          </div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="HTMLを貼り付けてください..."
            rows={18}
            spellCheck={false}
            className="w-full rounded-lg border border-amber-400/15 bg-[#060a12] px-4 py-3 font-mono text-xs text-bright outline-none transition-colors focus:border-amber-400/40 resize-none placeholder:text-border leading-5"
          />
        </div>

        {/* Arrow divider */}
        <div className="hidden lg:flex items-center justify-center pt-7">
          <span className="font-mono text-sm text-border">→</span>
        </div>

        {/* JSX output */}
        <div className="flex flex-col gap-1.5 mt-4 lg:mt-0">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-teal" />
              <p className="font-mono text-[10px] font-semibold uppercase tracking-widest text-teal/70">JSX</p>
            </div>
            {jsx && <span className="font-mono text-[10px] tabular-nums text-border">{jsx.length} 字</span>}
          </div>
          {input.trim() === '' ? (
            <div className="flex-1 min-h-[18rem] flex items-center justify-center rounded-lg border border-border/30 bg-[#070d1a]">
              <p className="font-mono text-xs text-border">HTML を入力すると JSX が表示されます</p>
            </div>
          ) : (
            <div className="flex-1 min-h-[18rem] overflow-auto rounded-lg border border-teal/20 bg-[#060a12] py-3 px-4">
              <pre className="font-mono text-xs leading-5 text-bright whitespace-pre-wrap break-words">{jsx}</pre>
            </div>
          )}
        </div>
      </div>

      {/* Conversion legend */}
      <div className="rounded-lg border border-border/40 bg-[#070d1a] overflow-hidden">
        <div className="border-b border-border/40 px-4 py-2">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-widest text-muted">変換ルール</p>
        </div>
        <div className="p-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {[
            ['class', 'className', '属性'],
            ['for', 'htmlFor', '属性'],
            ['tabindex', 'tabIndex', '属性'],
            ['readonly', 'readOnly', '属性'],
            ['maxlength', 'maxLength', '属性'],
            ['onclick', 'onClick', 'イベント'],
            ['onchange', 'onChange', 'イベント'],
            ['style="..."', 'style={{ ... }}', 'スタイル'],
            ['<!-- -->', '{/* */}', 'コメント'],
            ['<br>', '<br />', 'void要素'],
            ['<img>', '<img />', 'void要素'],
            ['<input>', '<input />', 'void要素'],
          ].map(([from, to]) => (
            <div key={from} className="flex items-center gap-1 rounded border border-border/30 bg-[#060a12] px-2 py-1.5">
              <span className="font-mono text-[10px] text-amber-400 truncate">{from}</span>
              <span className="shrink-0 font-mono text-[8px] text-border">→</span>
              <span className="font-mono text-[10px] text-teal truncate">{to}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
