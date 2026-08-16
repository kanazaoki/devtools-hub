'use client'

import { useEffect, useMemo, useState } from 'react'

const SAMPLE = `<?xml version="1.0" encoding="UTF-8"?>
<catalog>
  <book id="b1" category="tech">
    <title>入門 XPath</title>
    <author>山田太郎</author>
    <price currency="JPY">2800</price>
  </book>
  <book id="b2" category="tech">
    <title>実践 XML</title>
    <author>佐藤花子</author>
    <price currency="JPY">3200</price>
  </book>
  <book id="b3" category="design">
    <title>配色の基本</title>
    <author>鈴木一郎</author>
    <price currency="JPY">1980</price>
  </book>
</catalog>`

const PRESETS: { label: string; expr: string }[] = [
  { label: 'すべてのbook', expr: '//book' },
  { label: 'タイトルの文字列', expr: '//book/title/text()' },
  { label: '属性で絞る', expr: '//book[@category="tech"]' },
  { label: '数値で絞る', expr: '//book[price>2000]/title' },
  { label: '最初の1件', expr: '//book[1]' },
  { label: '最後の1件', expr: '//book[last()]' },
  { label: '属性値を取る', expr: '//book/@id' },
  { label: '件数を数える', expr: 'count(//book)' },
  { label: '部分一致', expr: '//title[contains(text(),"XML")]' },
  { label: '親をたどる', expr: '//title[text()="配色の基本"]/..' },
]

interface Row {
  type: string
  value: string
}

function serialize(node: Node): string {
  if (node.nodeType === Node.ATTRIBUTE_NODE) {
    const a = node as Attr
    return `${a.name}="${a.value}"`
  }
  if (node.nodeType === Node.TEXT_NODE) return node.nodeValue ?? ''
  if (node.nodeType === Node.ELEMENT_NODE) {
    return new XMLSerializer().serializeToString(node)
  }
  return node.textContent ?? ''
}

function nodeLabel(node: Node): string {
  if (node.nodeType === Node.ATTRIBUTE_NODE) return '属性'
  if (node.nodeType === Node.TEXT_NODE) return 'テキスト'
  if (node.nodeType === Node.ELEMENT_NODE) return `<${(node as Element).nodeName}>`
  return 'ノード'
}

export function XpathTester() {
  const [doc, setDoc] = useState(SAMPLE)
  const [expr, setExpr] = useState('//book/title/text()')
  const [copied, setCopied] = useState(false)
  // DOMParser / evaluate はブラウザのみ。サーバー描画時に実行しないよう待つ
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const result = useMemo<{ rows: Row[]; error: string | null; summary: string }>(() => {
    if (!mounted) return { rows: [], error: null, summary: '' }
    if (!doc.trim()) return { rows: [], error: null, summary: '' }
    if (!expr.trim()) return { rows: [], error: null, summary: '' }

    // XML と HTML の両方を受け付ける（宣言やタグから推測する）
    const looksHtml = /^\s*<!doctype html/i.test(doc) || /<html[\s>]/i.test(doc)
    const parser = new DOMParser()
    const parsed = parser.parseFromString(doc, looksHtml ? 'text/html' : 'application/xml')

    const parseError = parsed.querySelector('parsererror')
    if (parseError && !looksHtml) {
      return {
        rows: [],
        error: `構文エラー: ${(parseError.textContent ?? '').trim().split('\n')[0]}`,
        summary: '',
      }
    }

    try {
      const evaluated = parsed.evaluate(expr, parsed, null, 0 /* ANY_TYPE */, null)
      switch (evaluated.resultType) {
        case 1: // NUMBER
          return {
            rows: [{ type: '数値', value: String(evaluated.numberValue) }],
            error: null,
            summary: '数値が返りました',
          }
        case 2: // STRING
          return {
            rows: [{ type: '文字列', value: evaluated.stringValue }],
            error: null,
            summary: '文字列が返りました',
          }
        case 3: // BOOLEAN
          return {
            rows: [{ type: '真偽値', value: String(evaluated.booleanValue) }],
            error: null,
            summary: '真偽値が返りました',
          }
        default: {
          const rows: Row[] = []
          let n = evaluated.iterateNext()
          while (n && rows.length < 200) {
            rows.push({ type: nodeLabel(n), value: serialize(n) })
            n = evaluated.iterateNext()
          }
          return {
            rows,
            error: null,
            summary: rows.length === 0 ? 'マッチしませんでした' : `${rows.length} 件マッチ`,
          }
        }
      }
    } catch (e) {
      return {
        rows: [],
        error: `式のエラー: ${e instanceof Error ? e.message : String(e)}`,
        summary: '',
      }
    }
  }, [doc, expr, mounted])

  async function copyAll() {
    if (result.rows.length === 0) return
    try {
      await navigator.clipboard.writeText(result.rows.map((r) => r.value).join('\n'))
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* クリップボードが使えない環境では何もしない */
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* XPath 式 */}
      <div>
        <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-widest text-muted">
          XPath 式
        </label>
        <input
          value={expr}
          onChange={(e) => setExpr(e.target.value)}
          spellCheck={false}
          placeholder="//book/title/text()"
          className={`w-full rounded border bg-bg px-3 py-2.5 font-mono text-sm text-primary outline-none ${
            result.error ? 'border-red-500/60' : 'border-border focus:border-teal/60'
          }`}
        />
        <div className="mt-2 flex flex-wrap gap-1.5">
          {PRESETS.map((p) => (
            <button
              key={p.expr}
              onClick={() => setExpr(p.expr)}
              title={p.expr}
              className="rounded border border-border bg-surface px-2 py-0.5 text-[11px] text-dim transition-colors hover:border-teal/40 hover:text-teal"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* 入力と結果 */}
      <div className="grid grid-cols-1 overflow-hidden rounded-lg border border-border sm:grid-cols-2">
        <div className="flex flex-col border-b border-border sm:border-b-0 sm:border-r">
          <div className="flex items-center justify-between border-b border-border bg-surface px-3 py-2">
            <span className="font-mono text-[11px] uppercase tracking-widest text-muted">
              XML / HTML
            </span>
            <button
              onClick={() => setDoc(SAMPLE)}
              className="font-mono text-[11px] text-dim transition-colors hover:text-teal"
            >
              サンプルに戻す
            </button>
          </div>
          <textarea
            value={doc}
            onChange={(e) => setDoc(e.target.value)}
            spellCheck={false}
            className="h-80 w-full resize-none bg-bg p-3 font-mono text-sm text-primary outline-none"
          />
        </div>

        <div className="flex flex-col">
          <div className="flex items-center justify-between border-b border-border bg-surface px-3 py-2">
            <span className="font-mono text-[11px] uppercase tracking-widest text-muted">結果</span>
            <div className="flex items-center gap-3">
              <span className="font-mono text-[11px] text-dim">{result.summary}</span>
              <button
                onClick={copyAll}
                disabled={result.rows.length === 0}
                className="rounded border border-border px-2 py-0.5 font-mono text-[11px] text-dim transition-colors hover:border-teal/50 hover:text-teal disabled:opacity-40"
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>

          <div className="h-80 overflow-auto bg-bg p-3">
            {result.error ? (
              <p className="font-mono text-sm text-red-400">{result.error}</p>
            ) : result.rows.length === 0 ? (
              <p className="text-sm text-muted">
                式にマッチする要素はありません。上のプリセットから試せます。
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {result.rows.map((r, i) => (
                  <li key={i} className="rounded border border-border bg-surface px-2.5 py-2">
                    <span className="font-mono text-[10px] uppercase tracking-widest text-teal">
                      {r.type}
                    </span>
                    <pre className="mt-1 whitespace-pre-wrap break-all font-mono text-xs text-primary">
                      {r.value}
                    </pre>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      <p className="text-xs leading-relaxed text-muted">
        ブラウザの XPath エンジンで評価しています。名前空間を使う文書では、既定の名前空間に属する要素は接頭辞なしでは選択できない点にご注意ください。
      </p>
    </div>
  )
}
