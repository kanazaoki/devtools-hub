// cURL コマンドを読み取る。シェルと同じ規則で引用符を外す（bash の '...' / "..." / $'...' と、Windows の cmd の ^）。
// ⚠ 以前は前後の引用符を1文字ずつ削るだけで、'it'\''s' や Chrome の「Copy as cURL」が使う $'...' を読めなかった

export interface ParsedCurl {
  method: string
  url: string
  headers: [string, string][]
  /** 本文（-d・--data-raw・--json など）。複数の -d は & でつなぐ */
  body: string | null
  /** -F のフォーム項目。値が @ で始まるものはファイル */
  form: [string, string][]
  user: string | null
  cookies: string | null
  insecure: boolean
  /** 読んだが変換先に反映できないオプション */
  ignored: string[]
}

// bash の規則で単語に分ける
function bashSplit(s: string): string[] {
  const out: string[] = []
  let cur = ''
  let has = false
  let i = 0
  while (i < s.length) {
    const c = s[i]
    if (c === '\\' && (s[i + 1] === '\n' || (s[i + 1] === '\r' && s[i + 2] === '\n'))) { i += s[i + 1] === '\r' ? 3 : 2; continue }
    if (/\s/.test(c)) { if (has) { out.push(cur); cur = ''; has = false } i++; continue }
    has = true
    if (c === "'") {
      const end = s.indexOf("'", i + 1)
      cur += s.slice(i + 1, end === -1 ? s.length : end)
      i = end === -1 ? s.length : end + 1
      continue
    }
    if (c === '$' && s[i + 1] === "'") {
      i += 2
      while (i < s.length && s[i] !== "'") {
        if (s[i] === '\\' && i + 1 < s.length) {
          const n = s[i + 1]
          const map: Record<string, string> = { n: '\n', t: '\t', r: '\r', '\\': '\\', "'": "'", '"': '"', a: '\x07', b: '\b', e: '\x1b', f: '\f', v: '\v', '0': '\0' }
          if (n === 'x') { const h = /^[0-9a-fA-F]{1,2}/.exec(s.slice(i + 2))![0]; cur += String.fromCharCode(parseInt(h, 16)); i += 2 + h.length; continue }
          if (n === 'u' || n === 'U') { const h = /^[0-9a-fA-F]{1,8}/.exec(s.slice(i + 2))![0]; cur += String.fromCodePoint(parseInt(h, 16)); i += 2 + h.length; continue }
          cur += map[n] ?? '\\' + n
          i += 2
          continue
        }
        cur += s[i++]
      }
      i++
      continue
    }
    if (c === '"') {
      i++
      while (i < s.length && s[i] !== '"') {
        if (s[i] === '\\' && '"\\$`\n'.includes(s[i + 1] ?? '')) { if (s[i + 1] !== '\n') cur += s[i + 1]; i += 2; continue }
        cur += s[i++]
      }
      i++
      continue
    }
    if (c === '\\' && i + 1 < s.length) { cur += s[i + 1]; i += 2; continue }
    cur += c
    i++
  }
  if (has) out.push(cur)
  return out
}

// Windows の cmd（Chrome の「Copy as cURL (cmd)」）：^ が次の1文字を逃がし、行末の ^ は行の継続
// 1段目で cmd の ^ を外し、2段目で curl.exe が受け取る引数の規則（\" は "、引用符の外の空白で区切る）で分ける
function cmdSplit(s: string): string[] {
  let line = ''
  let inQ = false
  const t = s.replace(/\^\r?\n/g, ' ')
  for (let i = 0; i < t.length; i++) {
    const c = t[i]
    if (c === '"') inQ = !inQ
    if (c === '^' && !inQ && i + 1 < t.length) { line += t[++i]; continue }
    line += c
  }
  const out: string[] = []
  let cur = ''
  let has = false
  let q = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (c === '\\') {
      let n = 0
      while (line[i] === '\\') { n++; i++ }
      if (line[i] === '"') {
        cur += '\\'.repeat(Math.floor(n / 2))
        if (n % 2) cur += '"'
        else { q = !q; has = true }
      } else {
        cur += '\\'.repeat(n)
        i--
      }
      has = true
      continue
    }
    if (c === '"') { q = !q; has = true; continue }
    if (!q && /\s/.test(c)) { if (has) { out.push(cur); cur = ''; has = false } continue }
    cur += c
    has = true
  }
  if (has) out.push(cur)
  return out
}

// 値を取るオプション（変換には使わないが、次の語を URL と取り違えないように読み飛ばす）
const SKIP_WITH_ARG = new Set(['-o', '--output', '-m', '--max-time', '--connect-timeout', '-x', '--proxy', '-w', '--write-out', '--retry', '-c', '--cookie-jar', '--cacert', '--cert', '-E', '--key', '-r', '--range', '--limit-rate', '-T', '--upload-file', '--resolve', '-K', '--config'])
const NO_ARG = new Set(['-s', '--silent', '-S', '--show-error', '-L', '--location', '--compressed', '-v', '--verbose', '-i', '--include', '-f', '--fail', '-#', '--progress-bar', '--http1.1', '--http2', '-N', '--no-buffer'])

export function parseCurl(input: string): ParsedCurl | null {
  const src = input.trim()
  if (!/^curl(\.exe)?\s/.test(src)) return null
  const cmd = /\^\r?\n|\^"/.test(src)
  const tok = (cmd ? cmdSplit(src) : bashSplit(src)).slice(1)
  const r: ParsedCurl = { method: '', url: '', headers: [], body: null, form: [], user: null, cookies: null, insecure: false, ignored: [] }
  const data: string[] = []
  let get = false
  let head = false
  let json = false
  for (let i = 0; i < tok.length; i++) {
    let t = tok[i]
    let val: string | undefined
    // --opt=value と -Xvalue（短いオプションに値がくっついた形）
    const eq = /^(--[a-z0-9-]+)=(.*)$/s.exec(t)
    if (eq) { t = eq[1]; val = eq[2] }
    else if (/^-[XHdbuAeF]./.test(t)) { val = t.slice(2); t = t.slice(0, 2) }
    const arg = () => (val !== undefined ? val : tok[++i] ?? '')
    switch (t) {
      case '-X': case '--request': r.method = arg().toUpperCase(); break
      case '-H': case '--header': {
        const h = arg()
        const c = h.indexOf(':')
        if (c > 0) r.headers.push([h.slice(0, c).trim(), h.slice(c + 1).trim()])
        break
      }
      case '-d': case '--data': case '--data-ascii': case '--data-raw': case '--data-binary': {
        const v = arg()
        if (v.startsWith('@') && t !== '--data-raw') r.ignored.push(`${t} ${v}（ファイルの中身は読めないので、そのまま文字列として扱いました）`)
        // -d と --data-ascii は改行を取り除く（curl の挙動）
        data.push(t === '-d' || t === '--data' || t === '--data-ascii' ? v.replace(/\r?\n/g, '') : v)
        break
      }
      case '--data-urlencode': {
        const v = arg()
        const k = v.indexOf('=')
        data.push(k > 0 ? `${v.slice(0, k)}=${encodeURIComponent(v.slice(k + 1))}` : encodeURIComponent(v.replace(/^=/, '')))
        break
      }
      case '--json': data.push(arg()); json = true; break
      case '-F': case '--form': {
        const v = arg()
        const k = v.indexOf('=')
        if (k > 0) r.form.push([v.slice(0, k), v.slice(k + 1)])
        break
      }
      case '-u': case '--user': r.user = arg(); break
      case '-b': case '--cookie': r.cookies = arg(); break
      case '-A': case '--user-agent': r.headers.push(['User-Agent', arg()]); break
      case '-e': case '--referer': r.headers.push(['Referer', arg()]); break
      case '-k': case '--insecure': r.insecure = true; break
      case '-G': case '--get': get = true; break
      case '-I': case '--head': head = true; break
      case '--url': r.url = arg(); break
      default:
        if (SKIP_WITH_ARG.has(t)) { arg(); break }
        if (NO_ARG.has(t)) break
        if (t.startsWith('-') && t.length > 1) { r.ignored.push(t); break }
        if (!r.url) r.url = t
    }
  }
  if (!r.url) return null
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(r.url)) r.url = 'http://' + r.url
  const hasHeader = (n: string) => r.headers.some(([k]) => k.toLowerCase() === n.toLowerCase())
  if (json) {
    if (!hasHeader('Content-Type')) r.headers.push(['Content-Type', 'application/json'])
    if (!hasHeader('Accept')) r.headers.push(['Accept', 'application/json'])
  }
  if (data.length) {
    const joined = data.join('&')
    if (get) r.url += (r.url.includes('?') ? '&' : '?') + joined
    else {
      r.body = joined
      if (!json && !hasHeader('Content-Type')) r.headers.push(['Content-Type', 'application/x-www-form-urlencoded'])
    }
  }
  r.method = r.method || (head ? 'HEAD' : get ? 'GET' : r.body !== null || r.form.length ? 'POST' : 'GET')
  return r
}

export function basicAuth(user: string): string {
  const bytes = new TextEncoder().encode(user.includes(':') ? user : user + ':')
  let bin = ''
  bytes.forEach((b) => (bin += String.fromCharCode(b)))
  return btoa(bin)
}
