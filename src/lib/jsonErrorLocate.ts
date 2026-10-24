// JSON の構文エラーが「どこで」「なぜ」起きたかを返す。
//
// JSON.parse のエラーは環境によって位置が付かない（Chrome でも配列の末尾カンマは
// 「Unexpected token ']'」だけで位置が出ない）。1行に圧縮された JSON では位置が
// 分からないとどこを直せばよいか見つからないので、JSON の文法どおりに先頭から
// 読み、最初に文法から外れた位置と理由を自前で出す。

export interface JsonErrorLocation {
  offset: number
  line: number
  column: number
  reason: string
}

class Stop extends Error {
  constructor(
    public offset: number,
    public reason: string,
  ) {
    super(reason)
  }
}

export function locateJsonError(text: string): JsonErrorLocation | null {
  let i = 0
  const n = text.length

  const ws = () => {
    while (i < n && (text[i] === ' ' || text[i] === '\t' || text[i] === '\n' || text[i] === '\r')) i++
  }
  const show = (c: string | undefined) => (c === undefined ? '文末' : c === '\n' ? '改行' : `「${c}」`)

  const string = () => {
    i++ // "
    while (i < n) {
      const c = text[i]
      if (c === '"') {
        i++
        return
      }
      if (c === '\\') {
        const e = text[i + 1]
        if (e === 'u') {
          if (!/^[0-9a-fA-F]{4}$/.test(text.slice(i + 2, i + 6))) throw new Stop(i, '\\u の後ろは16進数4桁が必要です')
          i += 6
          continue
        }
        if (!e || !'"\\/bfnrt'.includes(e)) throw new Stop(i, `使えないエスケープ \\${e ?? ''} です`)
        i += 2
        continue
      }
      if (c.charCodeAt(0) < 0x20) throw new Stop(i, '文字列の中に改行やタブがそのまま入っています（\\n や \\t と書く必要があります）')
      i++
    }
    throw new Stop(n, '文字列が閉じられていません（" が足りません）')
  }

  const number = () => {
    const m = /^-?(0|[1-9]\d*)(\.\d+)?([eE][+-]?\d+)?/.exec(text.slice(i))
    if (!m) throw new Stop(i, '数値の書き方が正しくありません')
    if (/^-?0\d/.test(text.slice(i))) throw new Stop(i, '数値の先頭に 0 は付けられません')
    i += m[0].length
  }

  const value = (): void => {
    ws()
    const c = text[i]
    if (c === '{') return object()
    if (c === '[') return array()
    if (c === '"') return string()
    if (c === '-' || (c >= '0' && c <= '9')) return number()
    for (const lit of ['true', 'false', 'null']) {
      if (text.startsWith(lit, i)) {
        i += lit.length
        return
      }
    }
    if (c === "'") throw new Stop(i, '文字列はシングルクォートでなくダブルクォート（"）で囲む必要があります')
    if (c === undefined) throw new Stop(i, '値が来るべきところで JSON が終わっています')
    throw new Stop(i, `値が来るべきところに ${show(c)} があります`)
  }

  const object = () => {
    i++ // {
    ws()
    if (text[i] === '}') {
      i++
      return
    }
    for (;;) {
      ws()
      const c = text[i]
      if (c === "'") throw new Stop(i, 'キーはシングルクォートでなくダブルクォート（"）で囲む必要があります')
      if (c !== '"') throw new Stop(i, c === undefined ? 'オブジェクトが閉じられていません（} が足りません）' : `キーはダブルクォートで囲む必要があります。${show(c)} があります`)
      string()
      ws()
      if (text[i] !== ':') throw new Stop(i, `キーの後ろに「:」が必要です。${show(text[i])} があります`)
      i++
      value()
      ws()
      if (text[i] === ',') {
        const comma = i
        i++
        ws()
        if (text[i] === '}') throw new Stop(comma, '最後の要素の後ろに余分なカンマがあります')
        continue
      }
      if (text[i] === '}') {
        i++
        return
      }
      throw new Stop(i, text[i] === undefined ? 'オブジェクトが閉じられていません（} が足りません）' : `「,」か「}」が必要です。${show(text[i])} があります（カンマの付け忘れが多いです）`)
    }
  }

  const array = () => {
    i++ // [
    ws()
    if (text[i] === ']') {
      i++
      return
    }
    for (;;) {
      value()
      ws()
      if (text[i] === ',') {
        const comma = i
        i++
        ws()
        if (text[i] === ']') throw new Stop(comma, '最後の要素の後ろに余分なカンマがあります')
        continue
      }
      if (text[i] === ']') {
        i++
        return
      }
      throw new Stop(i, text[i] === undefined ? '配列が閉じられていません（] が足りません）' : `「,」か「]」が必要です。${show(text[i])} があります（カンマの付け忘れが多いです）`)
    }
  }

  try {
    value()
    ws()
    if (i < n) throw new Stop(i, `JSON の後ろに余分な ${show(text[i])} があります`)
    return null
  } catch (e) {
    if (!(e instanceof Stop)) throw e
    const before = text.slice(0, e.offset)
    const line = before.split('\n').length
    const column = e.offset - before.lastIndexOf('\n')
    return { offset: e.offset, line, column, reason: e.reason }
  }
}
