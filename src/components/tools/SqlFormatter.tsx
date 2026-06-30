'use client'

import { useState, useCallback } from 'react'

type Dialect = 'mysql' | 'postgresql' | 'bigquery'
type Mode = 'format' | 'minify'

const KEYWORDS = [
  'SELECT', 'DISTINCT', 'FROM', 'WHERE', 'AND', 'OR', 'NOT', 'IN', 'BETWEEN', 'LIKE', 'IS', 'NULL',
  'ORDER', 'BY', 'GROUP', 'HAVING', 'LIMIT', 'OFFSET', 'AS',
  'INSERT', 'INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE',
  'CREATE', 'TABLE', 'DROP', 'ALTER', 'ADD', 'COLUMN', 'INDEX',
  'JOIN', 'INNER', 'LEFT', 'RIGHT', 'FULL', 'OUTER', 'CROSS', 'ON',
  'UNION', 'ALL', 'INTERSECT', 'EXCEPT',
  'CASE', 'WHEN', 'THEN', 'ELSE', 'END',
  'WITH', 'RECURSIVE',
  'PRIMARY', 'KEY', 'FOREIGN', 'REFERENCES', 'UNIQUE', 'DEFAULT', 'NOT', 'AUTO_INCREMENT',
  'COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'COALESCE', 'NULLIF', 'CAST', 'CONVERT',
  'IF', 'IFNULL', 'IIF',
  'EXISTS', 'ANY', 'SOME',
  'ASC', 'DESC',
  'TRUNCATE', 'BEGIN', 'COMMIT', 'ROLLBACK', 'TRANSACTION',
  'EXPLAIN', 'ANALYZE',
]

const NEWLINE_BEFORE = new Set([
  'SELECT', 'FROM', 'WHERE', 'ORDER', 'GROUP', 'HAVING', 'LIMIT', 'OFFSET',
  'JOIN', 'INNER', 'LEFT', 'RIGHT', 'FULL', 'CROSS',
  'INSERT', 'INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE',
  'UNION', 'INTERSECT', 'EXCEPT',
  'WITH',
])

function tokenize(sql: string): string[] {
  const tokens: string[] = []
  let i = 0
  while (i < sql.length) {
    // string literal
    if (sql[i] === "'" || sql[i] === '"' || sql[i] === '`') {
      const q = sql[i]
      let j = i + 1
      while (j < sql.length && sql[j] !== q) {
        if (sql[j] === '\\') j++
        j++
      }
      tokens.push(sql.slice(i, j + 1))
      i = j + 1
      continue
    }
    // line comment
    if (sql[i] === '-' && sql[i + 1] === '-') {
      let j = i
      while (j < sql.length && sql[j] !== '\n') j++
      tokens.push(sql.slice(i, j))
      i = j
      continue
    }
    // block comment
    if (sql[i] === '/' && sql[i + 1] === '*') {
      let j = i + 2
      while (j < sql.length && !(sql[j] === '*' && sql[j + 1] === '/')) j++
      tokens.push(sql.slice(i, j + 2))
      i = j + 2
      continue
    }
    // whitespace
    if (/\s/.test(sql[i])) {
      i++
      continue
    }
    // punctuation
    if (/[(),;]/.test(sql[i])) {
      tokens.push(sql[i])
      i++
      continue
    }
    // word or operator
    let j = i
    while (j < sql.length && !/[\s(),;'"` ]/.test(sql[j])) j++
    if (j > i) tokens.push(sql.slice(i, j))
    i = j
  }
  return tokens
}

function formatSql(sql: string, _dialect: Dialect): string {
  const tokens = tokenize(sql)
  if (tokens.length === 0) return ''

  const lines: string[] = []
  let indent = 0
  let line = ''
  let parenDepth = 0

  const flush = (newLine: string) => {
    if (line.trim()) lines.push('  '.repeat(Math.max(0, indent)) + line.trim())
    line = newLine
  }

  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i]
    const upper = tok.toUpperCase()
    const isKw = KEYWORDS.includes(upper)

    if (tok === '(') {
      line += tok
      parenDepth++
      continue
    }
    if (tok === ')') {
      line += tok
      parenDepth--
      continue
    }
    if (tok === ',') {
      line += tok
      if (parenDepth === 0) flush('')
      continue
    }
    if (tok === ';') {
      flush('')
      lines.push(';')
      continue
    }

    const display = isKw ? upper : tok

    if (isKw && NEWLINE_BEFORE.has(upper) && parenDepth === 0) {
      flush(display + ' ')
      if (upper === 'SELECT') indent = 0
      if (['FROM', 'WHERE', 'ORDER', 'GROUP', 'HAVING', 'LIMIT', 'OFFSET', 'UNION', 'INTERSECT', 'EXCEPT', 'WITH'].includes(upper)) indent = 0
      if (['JOIN', 'INNER', 'LEFT', 'RIGHT', 'FULL', 'CROSS'].includes(upper)) indent = 0
      if (['INSERT', 'UPDATE', 'DELETE'].includes(upper)) indent = 0
    } else if (upper === 'AND' || upper === 'OR') {
      if (parenDepth === 0) {
        flush(display + ' ')
      } else {
        line += display + ' '
      }
    } else {
      if (line && !line.endsWith(' ')) line += ' '
      line += display
    }
  }
  flush('')
  return lines.filter((l) => l.trim()).join('\n')
}

function minifySql(sql: string): string {
  return tokenize(sql)
    .map((t) => {
      const u = t.toUpperCase()
      return KEYWORDS.includes(u) ? u : t
    })
    .join(' ')
    .replace(/ ([,);]) /g, '$1 ')
    .replace(/ ([,);])/g, '$1')
    .replace(/\( /g, '(')
    .trim()
}

const DIALECT_LABELS: { key: Dialect; label: string }[] = [
  { key: 'mysql', label: 'MySQL' },
  { key: 'postgresql', label: 'PostgreSQL' },
  { key: 'bigquery', label: 'BigQuery' },
]

const SAMPLE = `select id, name, email from users where id = 1 and status = 'active' order by name`

export function SqlFormatter() {
  const [input, setInput] = useState(SAMPLE)
  const [dialect, setDialect] = useState<Dialect>('mysql')
  const [mode, setMode] = useState<Mode>('format')
  const [copied, setCopied] = useState(false)

  const output = useCallback(() => {
    if (!input.trim()) return ''
    return mode === 'format' ? formatSql(input, dialect) : minifySql(input)
  }, [input, dialect, mode])

  const result = output()

  const handleCopy = () => {
    if (!result) return
    navigator.clipboard.writeText(result).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  const taClass = 'w-full rounded border border-border bg-[#070d1a] px-3 py-3 font-mono text-xs text-bright outline-none transition-colors focus:border-teal resize-none placeholder:text-border leading-relaxed'

  return (
    <div className="flex flex-col gap-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex rounded border border-border p-0.5">
          {DIALECT_LABELS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setDialect(key)}
              className={`rounded px-3 py-1.5 text-xs font-medium transition-colors ${
                dialect === key ? 'bg-teal/20 text-teal' : 'text-dim hover:text-primary'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex rounded border border-border p-0.5">
          {(['format', 'minify'] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`rounded px-3 py-1.5 text-xs font-medium transition-colors ${
                mode === m ? 'bg-teal/20 text-teal' : 'text-dim hover:text-primary'
              }`}
            >
              {m === 'format' ? 'Format' : 'Minify'}
            </button>
          ))}
        </div>
      </div>

      {/* Editor */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label className="font-mono text-[10px] font-semibold uppercase tracking-widest text-muted">入力</label>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="SQL を入力してください..."
            rows={16}
            className={taClass}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label className="font-mono text-[10px] font-semibold uppercase tracking-widest text-muted">出力</label>
            <button
              onClick={handleCopy}
              disabled={!result}
              className={`rounded border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-30 ${
                copied ? 'border-teal/50 text-teal' : 'border-border text-dim hover:border-teal/50 hover:text-teal'
              }`}
            >
              {copied ? '✓ コピー済み' : 'コピー'}
            </button>
          </div>
          <div className="h-full min-h-[16rem] overflow-auto rounded border border-border bg-[#070d1a] p-3">
            {result ? (
              <pre className="font-mono text-xs leading-relaxed text-bright whitespace-pre-wrap">{result}</pre>
            ) : (
              <p className="font-mono text-xs text-border">SQL を入力すると整形結果が表示されます</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
