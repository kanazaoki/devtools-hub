'use client'

import { useState, useEffect, useMemo } from 'react'

// Unicode blocks (20+)
const BLOCKS = [
  { id: 'basic-latin',      name: 'Basic Latin',               start: 0x0020, end: 0x007E },
  { id: 'latin1-supp',      name: 'Latin-1 Supplement',        start: 0x00A0, end: 0x00FF },
  { id: 'latin-ext-a',      name: 'Latin Extended-A',          start: 0x0100, end: 0x017F },
  { id: 'greek',            name: 'Greek & Coptic',            start: 0x0370, end: 0x03FF },
  { id: 'cyrillic',         name: 'Cyrillic',                  start: 0x0400, end: 0x04FF },
  { id: 'hebrew',           name: 'Hebrew',                    start: 0x0590, end: 0x05FF },
  { id: 'arabic',           name: 'Arabic',                    start: 0x0600, end: 0x06FF },
  { id: 'number-forms',     name: 'Number Forms',              start: 0x2150, end: 0x218F },
  { id: 'arrows',           name: 'Arrows',                    start: 0x2190, end: 0x21FF },
  { id: 'math-operators',   name: 'Mathematical Operators',    start: 0x2200, end: 0x22FF },
  { id: 'misc-technical',   name: 'Misc. Technical',           start: 0x2300, end: 0x23FF },
  { id: 'box-drawing',      name: 'Box Drawing',               start: 0x2500, end: 0x257F },
  { id: 'block-elements',   name: 'Block Elements',            start: 0x2580, end: 0x259F },
  { id: 'geometric-shapes', name: 'Geometric Shapes',          start: 0x25A0, end: 0x25FF },
  { id: 'misc-symbols',     name: 'Miscellaneous Symbols',     start: 0x2600, end: 0x26FF },
  { id: 'dingbats',         name: 'Dingbats',                  start: 0x2700, end: 0x27BF },
  { id: 'hiragana',         name: 'Hiragana',                  start: 0x3041, end: 0x309F },
  { id: 'katakana',         name: 'Katakana',                  start: 0x30A0, end: 0x30FF },
  { id: 'cjk',              name: 'CJK Unified Ideographs',    start: 0x4E00, end: 0x9FFF },
  { id: 'hangul',           name: 'Hangul Syllables',          start: 0xAC00, end: 0xD7A3 },
  { id: 'emoticons',        name: 'Emoticons',                 start: 0x1F600, end: 0x1F64F },
  { id: 'symbols-pics',     name: 'Symbols & Pictographs',     start: 0x1F300, end: 0x1F5FF },
  { id: 'transport',        name: 'Transport & Map',           start: 0x1F680, end: 0x1F6FF },
  { id: 'supp-arrows',      name: 'Supplemental Arrows',       start: 0x27F0, end: 0x27FF },
  { id: 'braille',          name: 'Braille Patterns',          start: 0x2800, end: 0x28FF },
]

// Known character names (Basic Latin + key chars)
const KNOWN_NAMES: Record<number, string> = {
  0x0020:'SPACE', 0x0021:'EXCLAMATION MARK', 0x0022:'QUOTATION MARK', 0x0023:'NUMBER SIGN',
  0x0024:'DOLLAR SIGN', 0x0025:'PERCENT SIGN', 0x0026:'AMPERSAND', 0x0027:'APOSTROPHE',
  0x0028:'LEFT PARENTHESIS', 0x0029:'RIGHT PARENTHESIS', 0x002A:'ASTERISK', 0x002B:'PLUS SIGN',
  0x002C:'COMMA', 0x002D:'HYPHEN-MINUS', 0x002E:'FULL STOP', 0x002F:'SOLIDUS',
  0x0030:'DIGIT ZERO', 0x0031:'DIGIT ONE', 0x0032:'DIGIT TWO', 0x0033:'DIGIT THREE',
  0x0034:'DIGIT FOUR', 0x0035:'DIGIT FIVE', 0x0036:'DIGIT SIX', 0x0037:'DIGIT SEVEN',
  0x0038:'DIGIT EIGHT', 0x0039:'DIGIT NINE',
  0x003A:'COLON', 0x003B:'SEMICOLON', 0x003C:'LESS-THAN SIGN', 0x003D:'EQUALS SIGN',
  0x003E:'GREATER-THAN SIGN', 0x003F:'QUESTION MARK', 0x0040:'COMMERCIAL AT',
  0x0041:'LATIN CAPITAL LETTER A', 0x0042:'LATIN CAPITAL LETTER B', 0x0043:'LATIN CAPITAL LETTER C',
  0x0044:'LATIN CAPITAL LETTER D', 0x0045:'LATIN CAPITAL LETTER E', 0x0046:'LATIN CAPITAL LETTER F',
  0x0047:'LATIN CAPITAL LETTER G', 0x0048:'LATIN CAPITAL LETTER H', 0x0049:'LATIN CAPITAL LETTER I',
  0x004A:'LATIN CAPITAL LETTER J', 0x004B:'LATIN CAPITAL LETTER K', 0x004C:'LATIN CAPITAL LETTER L',
  0x004D:'LATIN CAPITAL LETTER M', 0x004E:'LATIN CAPITAL LETTER N', 0x004F:'LATIN CAPITAL LETTER O',
  0x0050:'LATIN CAPITAL LETTER P', 0x0051:'LATIN CAPITAL LETTER Q', 0x0052:'LATIN CAPITAL LETTER R',
  0x0053:'LATIN CAPITAL LETTER S', 0x0054:'LATIN CAPITAL LETTER T', 0x0055:'LATIN CAPITAL LETTER U',
  0x0056:'LATIN CAPITAL LETTER V', 0x0057:'LATIN CAPITAL LETTER W', 0x0058:'LATIN CAPITAL LETTER X',
  0x0059:'LATIN CAPITAL LETTER Y', 0x005A:'LATIN CAPITAL LETTER Z',
  0x005B:'LEFT SQUARE BRACKET', 0x005C:'REVERSE SOLIDUS', 0x005D:'RIGHT SQUARE BRACKET',
  0x005E:'CIRCUMFLEX ACCENT', 0x005F:'LOW LINE', 0x0060:'GRAVE ACCENT',
  0x0061:'LATIN SMALL LETTER A', 0x0062:'LATIN SMALL LETTER B', 0x0063:'LATIN SMALL LETTER C',
  0x0064:'LATIN SMALL LETTER D', 0x0065:'LATIN SMALL LETTER E', 0x0066:'LATIN SMALL LETTER F',
  0x0067:'LATIN SMALL LETTER G', 0x0068:'LATIN SMALL LETTER H', 0x0069:'LATIN SMALL LETTER I',
  0x006A:'LATIN SMALL LETTER J', 0x006B:'LATIN SMALL LETTER K', 0x006C:'LATIN SMALL LETTER L',
  0x006D:'LATIN SMALL LETTER M', 0x006E:'LATIN SMALL LETTER N', 0x006F:'LATIN SMALL LETTER O',
  0x0070:'LATIN SMALL LETTER P', 0x0071:'LATIN SMALL LETTER Q', 0x0072:'LATIN SMALL LETTER R',
  0x0073:'LATIN SMALL LETTER S', 0x0074:'LATIN SMALL LETTER T', 0x0075:'LATIN SMALL LETTER U',
  0x0076:'LATIN SMALL LETTER V', 0x0077:'LATIN SMALL LETTER W', 0x0078:'LATIN SMALL LETTER X',
  0x0079:'LATIN SMALL LETTER Y', 0x007A:'LATIN SMALL LETTER Z',
  0x007B:'LEFT CURLY BRACKET', 0x007C:'VERTICAL LINE', 0x007D:'RIGHT CURLY BRACKET', 0x007E:'TILDE',
  // Arrows
  0x2190:'LEFTWARDS ARROW', 0x2191:'UPWARDS ARROW', 0x2192:'RIGHTWARDS ARROW', 0x2193:'DOWNWARDS ARROW',
  0x2194:'LEFT RIGHT ARROW', 0x21D0:'LEFTWARDS DOUBLE ARROW', 0x21D2:'RIGHTWARDS DOUBLE ARROW', 0x21D4:'LEFT RIGHT DOUBLE ARROW',
  // Math
  0x2200:'FOR ALL', 0x2203:'THERE EXISTS', 0x2208:'ELEMENT OF', 0x2209:'NOT AN ELEMENT OF',
  0x220F:'N-ARY PRODUCT', 0x2211:'N-ARY SUMMATION', 0x221A:'SQUARE ROOT', 0x221E:'INFINITY',
  0x2227:'LOGICAL AND', 0x2228:'LOGICAL OR', 0x2229:'INTERSECTION', 0x222A:'UNION',
  0x2248:'ALMOST EQUAL TO', 0x2260:'NOT EQUAL TO', 0x2264:'LESS-THAN OR EQUAL TO', 0x2265:'GREATER-THAN OR EQUAL TO',
  // Greek
  0x0391:'GREEK CAPITAL LETTER ALPHA', 0x0392:'GREEK CAPITAL LETTER BETA', 0x0393:'GREEK CAPITAL LETTER GAMMA',
  0x0394:'GREEK CAPITAL LETTER DELTA', 0x03B1:'GREEK SMALL LETTER ALPHA', 0x03B2:'GREEK SMALL LETTER BETA',
  0x03B3:'GREEK SMALL LETTER GAMMA', 0x03B4:'GREEK SMALL LETTER DELTA', 0x03C0:'GREEK SMALL LETTER PI',
  0x03A3:'GREEK CAPITAL LETTER SIGMA', 0x03A9:'GREEK CAPITAL LETTER OMEGA', 0x03C9:'GREEK SMALL LETTER OMEGA',
  // Symbols
  0x2600:'BLACK SUN WITH RAYS', 0x2601:'CLOUD', 0x2602:'UMBRELLA', 0x2603:'SNOWMAN',
  0x2605:'BLACK STAR', 0x2606:'WHITE STAR', 0x2610:'BALLOT BOX', 0x2611:'BALLOT BOX WITH CHECK',
  0x2615:'HOT BEVERAGE', 0x2616:'WHITE SHOGI PIECE', 0x261B:'BLACK RIGHT POINTING INDEX',
  0x2665:'BLACK HEART SUIT', 0x2666:'BLACK DIAMOND SUIT', 0x2663:'BLACK CLUB SUIT', 0x2660:'BLACK SPADE SUIT',
  // Emoticons
  0x1F600:'GRINNING FACE', 0x1F601:'BEAMING FACE WITH SMILING EYES', 0x1F602:'FACE WITH TEARS OF JOY',
  0x1F603:'SMILING FACE WITH OPEN MOUTH', 0x1F604:'SMILING FACE WITH OPEN MOUTH AND SMILING EYES',
  0x1F605:'GRINNING FACE WITH SWEAT', 0x1F606:'ROLLING ON THE FLOOR LAUGHING',
  0x1F607:'SMILING FACE WITH HALO', 0x1F608:'SMILING FACE WITH HORNS',
  0x1F609:'WINKING FACE', 0x1F60A:'SMILING FACE WITH SMILING EYES',
  0x1F60B:'FACE SAVORING FOOD', 0x1F60C:'RELIEVED FACE', 0x1F60D:'SMILING FACE WITH HEART-EYES',
  0x1F614:'PENSIVE FACE', 0x1F620:'ANGRY FACE', 0x1F621:'POUTING FACE',
  0x1F622:'CRYING FACE', 0x1F623:'PERSEVERING FACE', 0x1F624:'FACE WITH STEAM FROM NOSE',
  0x1F625:'SAD BUT RELIEVED FACE', 0x1F626:'FROWNING FACE WITH OPEN MOUTH',
  0x1F627:'ANGUISHED FACE', 0x1F628:'FEARFUL FACE', 0x1F629:'WEARY FACE',
  0x1F62A:'SLEEPY FACE', 0x1F62B:'TIRED FACE', 0x1F634:'SLEEPING FACE',
  0x1F635:'DIZZY FACE', 0x1F636:'FACE WITHOUT MOUTH', 0x1F637:'FACE WITH MEDICAL MASK',
}

function getCharName(cp: number): string {
  if (KNOWN_NAMES[cp]) return KNOWN_NAMES[cp]
  if (cp >= 0x4E00 && cp <= 0x9FFF) return `CJK UNIFIED IDEOGRAPH-${cp.toString(16).toUpperCase()}`
  if (cp >= 0xAC00 && cp <= 0xD7A3) return `HANGUL SYLLABLE ${String.fromCodePoint(cp)}`
  if (cp >= 0x3041 && cp <= 0x309F) return `HIRAGANA LETTER ${String.fromCodePoint(cp)}`
  if (cp >= 0x30A0 && cp <= 0x30FF) return `KATAKANA LETTER ${String.fromCodePoint(cp)}`
  if (cp >= 0x1F600 && cp <= 0x1F64F) return `EMOTICON U+${cp.toString(16).toUpperCase()}`
  if (cp >= 0x1F300 && cp <= 0x1F5FF) return `SYMBOL U+${cp.toString(16).toUpperCase()}`
  if (cp >= 0x1F680 && cp <= 0x1F6FF) return `TRANSPORT SYMBOL U+${cp.toString(16).toUpperCase()}`
  if (cp >= 0x2800 && cp <= 0x28FF) return `BRAILLE PATTERN U+${cp.toString(16).toUpperCase()}`
  return `CHARACTER U+${cp.toString(16).toUpperCase().padStart(4, '0')}`
}

function getUTF8Bytes(cp: number): string {
  const bytes: number[] = []
  if (cp < 0x80) {
    bytes.push(cp)
  } else if (cp < 0x800) {
    bytes.push(0xC0 | (cp >> 6), 0x80 | (cp & 0x3F))
  } else if (cp < 0x10000) {
    bytes.push(0xE0 | (cp >> 12), 0x80 | ((cp >> 6) & 0x3F), 0x80 | (cp & 0x3F))
  } else {
    bytes.push(0xF0 | (cp >> 18), 0x80 | ((cp >> 12) & 0x3F), 0x80 | ((cp >> 6) & 0x3F), 0x80 | (cp & 0x3F))
  }
  return bytes.map(b => b.toString(16).toUpperCase().padStart(2, '0')).join(' ')
}

function getUTF16Bytes(cp: number): string {
  if (cp < 0x10000) {
    return [(cp >> 8) & 0xFF, cp & 0xFF]
      .map(b => b.toString(16).toUpperCase().padStart(2, '0')).join(' ')
  }
  const c = cp - 0x10000
  const high = 0xD800 | (c >> 10)
  const low  = 0xDC00 | (c & 0x3FF)
  return [
    (high >> 8) & 0xFF, high & 0xFF,
    (low  >> 8) & 0xFF, low  & 0xFF,
  ].map(b => b.toString(16).toUpperCase().padStart(2, '0')).join(' ')
}

function getJSEscape(cp: number): string {
  if (cp < 0x10000) return `\\u${cp.toString(16).toUpperCase().padStart(4, '0')}`
  return `\\u{${cp.toString(16).toUpperCase()}}`
}

function isRenderableChar(cp: number): boolean {
  if (cp < 0x20) return false
  if (cp >= 0x7F && cp <= 0x9F) return false
  if (cp >= 0xD800 && cp <= 0xDFFF) return false
  return true
}

const PAGE_SIZE = 192

interface CharDetail {
  cp: number
  char: string
  name: string
}

export function UnicodeBrowser() {
  const [query, setQuery]           = useState('')
  const [blockId, setBlockId]       = useState('basic-latin')
  const [page, setPage]             = useState(0)
  const [selected, setSelected]     = useState<CharDetail | null>(null)
  const [favorites, setFavorites]   = useState<number[]>([])
  const [activeTab, setActiveTab]   = useState<'browse' | 'search' | 'favorites'>('browse')
  const [copied, setCopied]         = useState<string | null>(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem('dth_unicode_favs')
      if (raw) setFavorites(JSON.parse(raw) as number[])
    } catch {}
  }, [])

  function saveFavorites(next: number[]) {
    setFavorites(next)
    try { localStorage.setItem('dth_unicode_favs', JSON.stringify(next)) } catch {}
  }

  function toggleFavorite(cp: number) {
    const next = favorites.includes(cp) ? favorites.filter(x => x !== cp) : [...favorites, cp]
    saveFavorites(next)
  }

  // Block browsing
  const block = BLOCKS.find(b => b.id === blockId)!
  const blockChars = useMemo(() => {
    const all: number[] = []
    for (let cp = block.start; cp <= block.end; cp++) {
      if (isRenderableChar(cp)) all.push(cp)
    }
    return all
  }, [block])
  const totalPages = Math.ceil(blockChars.length / PAGE_SIZE)
  const pageChars = blockChars.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  // Search
  const searchResults = useMemo(() => {
    if (!query.trim()) return []
    const q = query.trim().toLowerCase()
    // Code point lookup
    const cpMatch = q.match(/^u\+?([0-9a-f]{1,6})$/i) || q.match(/^([0-9a-f]{4,6})$/)
    if (cpMatch) {
      const cp = parseInt(cpMatch[1], 16)
      if (cp >= 0 && cp <= 0x10FFFF && isRenderableChar(cp)) {
        return [{ cp, char: String.fromCodePoint(cp), name: getCharName(cp) }]
      }
    }
    // Name search across all known chars + all block chars
    const results: CharDetail[] = []
    for (const [cp, name] of Object.entries(KNOWN_NAMES)) {
      if (name.toLowerCase().includes(q) || String.fromCodePoint(Number(cp)).includes(query)) {
        results.push({ cp: Number(cp), char: String.fromCodePoint(Number(cp)), name })
      }
      if (results.length >= 48) break
    }
    return results
  }, [query])

  function openDetail(cp: number) {
    setSelected({ cp, char: String.fromCodePoint(cp), name: getCharName(cp) })
  }

  async function copyToClipboard(text: string, key: string) {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(key)
      setTimeout(() => setCopied(null), 1500)
    } catch {}
  }

  const detailFormats = selected ? [
    { key: 'codepoint', label: 'Code Point',      value: `U+${selected.cp.toString(16).toUpperCase().padStart(4, '0')}` },
    { key: 'utf8',      label: 'UTF-8',            value: getUTF8Bytes(selected.cp) },
    { key: 'utf16',     label: 'UTF-16',           value: getUTF16Bytes(selected.cp) },
    { key: 'html-dec',  label: 'HTML Entity',      value: `&#${selected.cp};` },
    { key: 'js',        label: 'JS Escape',        value: getJSEscape(selected.cp) },
    { key: 'css',       label: 'CSS content',      value: `'\\${selected.cp.toString(16).toUpperCase()}'` },
  ] : []

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {(['browse', 'search', 'favorites'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 font-mono text-xs transition-colors ${activeTab === tab ? 'border-b-2 border-teal text-teal' : 'text-muted hover:text-dim'}`}>
            {tab === 'browse' ? 'ブロック一覧' : tab === 'search' ? '検索' : `お気に入り (${favorites.length})`}
          </button>
        ))}
      </div>

      {/* Browse Tab */}
      {activeTab === 'browse' && (
        <div className="space-y-4">
          <select value={blockId} onChange={e => { setBlockId(e.target.value); setPage(0) }}
            className="w-full rounded border border-border bg-surface px-3 py-2 font-mono text-sm text-primary focus:border-teal focus:outline-none">
            {BLOCKS.map(b => (
              <option key={b.id} value={b.id}>{b.name} (U+{b.start.toString(16).toUpperCase().padStart(4,'0')}–U+{b.end.toString(16).toUpperCase().padStart(4,'0')})</option>
            ))}
          </select>

          <div className="grid grid-cols-8 gap-1 sm:grid-cols-12 md:grid-cols-16">
            {pageChars.map(cp => (
              <button key={cp} onClick={() => openDetail(cp)}
                title={getCharName(cp)}
                className={`relative flex items-center justify-center rounded border p-1.5 font-mono text-base transition-colors
                  ${favorites.includes(cp) ? 'border-amber-400/40 bg-amber-400/5' : 'border-border bg-surface'}
                  hover:border-teal hover:bg-teal/5`}>
                {String.fromCodePoint(cp)}
              </button>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs text-muted">{blockChars.length} 文字 / ページ {page + 1} / {totalPages}</span>
              <div className="flex gap-2">
                <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                  className="rounded border border-border px-3 py-1 font-mono text-xs text-muted hover:border-border-hi hover:text-dim disabled:opacity-30">前</button>
                <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page === totalPages - 1}
                  className="rounded border border-border px-3 py-1 font-mono text-xs text-muted hover:border-border-hi hover:text-dim disabled:opacity-30">次</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Search Tab */}
      {activeTab === 'search' && (
        <div className="space-y-4">
          <input value={query} onChange={e => setQuery(e.target.value)}
            placeholder='文字名 (例: "latin small letter a") または コードポイント (例: "U+0041")'
            className="w-full rounded border border-border bg-surface px-4 py-2.5 font-mono text-sm text-primary placeholder:text-muted focus:border-teal focus:outline-none" />
          {query && (
            searchResults.length > 0 ? (
              <div className="grid grid-cols-8 gap-1 sm:grid-cols-12">
                {searchResults.map(({ cp, char, name }) => (
                  <button key={cp} onClick={() => openDetail(cp)} title={name}
                    className="flex items-center justify-center rounded border border-border bg-surface p-1.5 font-mono text-base hover:border-teal hover:bg-teal/5">
                    {char}
                  </button>
                ))}
              </div>
            ) : (
              <p className="py-8 text-center font-mono text-sm text-muted">一致する文字が見つかりません</p>
            )
          )}
          {!query && (
            <p className="py-8 text-center font-mono text-sm text-muted">文字名またはコードポイントを入力してください</p>
          )}
        </div>
      )}

      {/* Favorites Tab */}
      {activeTab === 'favorites' && (
        <div className="space-y-4">
          {favorites.length === 0 ? (
            <p className="py-8 text-center font-mono text-sm text-muted">お気に入りはまだありません。文字をクリックして詳細パネルから追加できます。</p>
          ) : (
            <div className="grid grid-cols-8 gap-1 sm:grid-cols-12">
              {favorites.map(cp => (
                <button key={cp} onClick={() => openDetail(cp)} title={getCharName(cp)}
                  className="flex items-center justify-center rounded border border-amber-400/40 bg-amber-400/5 p-1.5 font-mono text-base hover:border-teal hover:bg-teal/5">
                  {String.fromCodePoint(cp)}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Detail Panel */}
      {selected && (
        <div className="rounded-lg border border-border bg-surface p-5">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <span className="text-5xl leading-none">{selected.char}</span>
              <div>
                <p className="font-mono text-xs text-muted">U+{selected.cp.toString(16).toUpperCase().padStart(4, '0')}</p>
                <p className="mt-0.5 font-mono text-sm font-semibold text-bright">{selected.name}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => toggleFavorite(selected.cp)}
                className={`rounded border px-3 py-1.5 font-mono text-xs transition-colors ${favorites.includes(selected.cp) ? 'border-amber-400/40 bg-amber-400/10 text-amber-400' : 'border-border text-muted hover:border-border-hi hover:text-dim'}`}>
                {favorites.includes(selected.cp) ? '★ 登録済み' : '☆ お気に入り'}
              </button>
              <button onClick={() => setSelected(null)}
                className="rounded border border-border px-3 py-1.5 font-mono text-xs text-muted hover:border-border-hi hover:text-dim">
                閉じる
              </button>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            {detailFormats.map(({ key, label, value }) => (
              <div key={key} className="flex items-center justify-between rounded border border-border bg-bg px-3 py-2">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-widest text-muted">{label}</p>
                  <p className="mt-0.5 font-mono text-sm text-primary">{value}</p>
                </div>
                <button onClick={() => copyToClipboard(value, key)}
                  className={`ml-3 shrink-0 rounded border px-2.5 py-1 font-mono text-xs transition-colors ${copied === key ? 'border-teal/40 bg-teal/10 text-teal' : 'border-border text-muted hover:border-border-hi hover:text-dim'}`}>
                  {copied === key ? '✓' : 'コピー'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
