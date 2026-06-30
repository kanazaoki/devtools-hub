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
  'PRIMARY', 'KEY', 'FOREIGN', 'REFERENCES', 'UNIQUE', 'DEFAULT', 'AUTO_INCREMENT',
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
    if (sql[i] === "'" || sql[i] === '"' || sql[i] === '`') {
      const q = sql[i]; let j = i + 1
      while (j < sql.length && sql[j] !== q) { if (sql[j] === '\\') j++; j++ }
      tokens.push(sql.slice(i, j + 1)); i = j + 1; continue
    }
    if (sql[i] === '-' && sql[i + 1] === '-') {
      let j = i
      while (j < sql.length && sql[j] !== '\n') j++
      tokens.push(sql.slice(i, j)); i = j; continue
    }
    if (sql[i] === '/' && sql[i + 1] === '*') {
      let j = i + 2
      while (j < sql.length && !(sql[j] === '*' && sql[j + 1] === '/')) j++
      tokens.push(sql.slice(i, j + 2)); i = j + 2; continue
    }
    if (/\s/.test(sql[i])) { i++; continue }
    if (/[(),;]/.test(sql[i])) { tokens.push(sql[i]); i++; continue }
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
  const lines: string[] = []; let indent = 0; let line = ''; let parenDepth = 0
  const flush = (newLine: string) => {
    if (line.trim()) lines.push('  '.repeat(Math.max(0, indent)) + line.trim())
    line = newLine
  }
  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i]; const upper = tok.toUpperCase(); const isKw = KEYWORDS.includes(upper)
    if (tok === '(') { line += tok; parenDepth++; continue }
    if (tok === ')') { line += tok; parenDepth--; continue }
    if (tok === ',') { line += tok; if (parenDepth === 0) flush(''); continue }
    if (tok === ';') { flush(''); lines.push(';'); continue }
    const display = isKw ? upper : tok
    if (isKw && NEWLINE_BEFORE.has(upper) && parenDepth === 0) {
      flush(display + ' ')
      if (['SELECT','FROM','WHERE','ORDER','GROUP','HAVING','LIMIT','OFFSET','UNION','INTERSECT','EXCEPT','WITH','JOIN','INNER','LEFT','RIGHT','FULL','CROSS','INSERT','UPDATE','DELETE'].includes(upper)) indent = 0
    } else if ((upper === 'AND' || upper === 'OR') && parenDepth === 0) {
      flush(display + ' ')
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
    .map((t) => { const u = t.toUpperCase(); return KEYWORDS.includes(u) ? u : t })
    .join(' ')
    .replace(/ ([,);])/g, '$1')
    .replace(/\( /g, '(')
    .trim()
}

function highlightSql(sql: string): React.ReactNode[] {
  const lines = sql.split('\n')
  return lines.map((line, li) => {
    const parts: React.ReactNode[] = []
    let remaining = line
    let key = 0
    while (remaining.length > 0) {
      // string literals
      const strMatch = remaining.match(/^(['"`][^'"`]*['"`])/)
      if (strMatch) {
        parts.push(<span key={key++} className="text-amber-300">{strMatch[1]}</span>)
        remaining = remaining.slice(strMatch[1].length); continue
      }
      // comment
      const cmtMatch = remaining.match(/^(--[^\n]*)/)
      if (cmtMatch) {
        parts.push(<span key={key++} className="text-border italic">{cmtMatch[1]}</span>)
        remaining = remaining.slice(cmtMatch[1].length); continue
      }
      // keyword (word boundary)
      const kwMatch = remaining.match(/^([A-Za-z_][A-Za-z0-9_]*)/)
      if (kwMatch) {
        const word = kwMatch[1]
        if (KEYWORDS.includes(word.toUpperCase())) {
          parts.push(<span key={key++} className="text-teal font-semibold">{word}</span>)
        } else {
          parts.push(<span key={key++} className="text-bright">{word}</span>)
        }
        remaining = remaining.slice(word.length); continue
      }
      // punctuation
      const pMatch = remaining.match(/^([(),;])/)
      if (pMatch) {
        parts.push(<span key={key++} className="text-blue-400">{pMatch[1]}</span>)
        remaining = remaining.slice(1); continue
      }
      // operators / numbers
      const numMatch = remaining.match(/^([0-9]+(?:\.[0-9]*)?)/)
      if (numMatch) {
        parts.push(<span key={key++} className="text-violet-300">{numMatch[1]}</span>)
        remaining = remaining.slice(numMatch[1].length); continue
      }
      // fallback: one char
      parts.push(<span key={key++} className="text-dim">{remaining[0]}</span>)
      remaining = remaining.slice(1)
    }
    return (
      <div key={li} className="flex">
        <span className="select-none w-8 shrink-0 text-right pr-3 font-mono text-[10px] text-border/50 leading-5 tabular-nums">{li + 1}</span>
        <span className="flex-1 leading-5 whitespace-pre">{parts.length ? parts : ' '}</span>
      </div>
    )
  })
}

const DIALECT_LABELS: { key: Dialect; label: string }[] = [
  { key: 'mysql', label: 'MySQL' },
  { key: 'postgresql', label: 'PostgreSQL' },
  { key: 'bigquery', label: 'BigQuery' },
]

const SAMPLE = `select id, name, email from users left join orders on users.id = orders.user_id where orders.total > 100 and users.status = 'active' order by name asc`

export function SqlFormatter() {
  const [input, setInput] = useState(SAMPLE)
  const [dialect, setDialect] = useState<Dialect>('mysql')
  const [mode, setMode] = useState<Mode>('format')
  const [copied, setCopied] = useState(false)

  const result = useCallback(() => {
    if (!input.trim()) return ''
    return mode === 'format' ? formatSql(input, dialect) : minifySql(input)
  }, [input, dialect, mode])()

  const handleCopy = () => {
    if (!result) return
    navigator.clipboard.writeText(result).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 1500)
    })
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Controls bar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded border border-border p-0.5">
          {DIALECT_LABELS.map(({ key, label }) => (
            <button key={key} onClick={() => setDialect(key)}
              className={`rounded px-3 py-1.5 text-xs font-medium transition-colors ${dialect === key ? 'bg-teal/20 text-teal' : 'text-dim hover:text-primary'}`}
            >{label}</button>
          ))}
        </div>
        <div className="flex rounded border border-border p-0.5">
          {(['format', 'minify'] as Mode[]).map((m) => (
            <button key={m} onClick={() => setMode(m)}
              className={`rounded px-3 py-1.5 text-xs font-medium transition-colors ${mode === m ? 'bg-teal/20 text-teal' : 'text-dim hover:text-primary'}`}
            >{m === 'format' ? '✦ Format' : '⟨⟩ Minify'}</button>
          ))}
        </div>
        <button
          onClick={handleCopy} disabled={!result}
          className={`ml-auto rounded border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-30 ${copied ? 'border-teal/50 text-teal' : 'border-border text-dim hover:border-teal/50 hover:text-teal'}`}
        >{copied ? '✓ コピー済み' : 'コピー'}</button>
      </div>

      {/* Two-pane editor */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Input */}
        <div className="flex flex-col gap-1.5">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-widest text-muted">入力</p>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="SQL を入力してください..."
            rows={16}
            spellCheck={false}
            className="w-full rounded-lg border border-border bg-[#060a12] px-4 py-3 font-mono text-xs text-bright outline-none transition-colors focus:border-teal resize-none placeholder:text-border leading-5"
          />
        </div>

        {/* Output with syntax highlight */}
        <div className="flex flex-col gap-1.5">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-widest text-muted">出力</p>
          <div className="flex-1 min-h-[16rem] overflow-auto rounded-lg border border-border bg-[#060a12] py-3 pr-3">
            {result ? (
              <div className="font-mono text-xs">
                {highlightSql(result)}
              </div>
            ) : (
              <p className="px-4 py-2 font-mono text-xs text-border">SQL を入力すると整形結果が表示されます</p>
            )}
          </div>
        </div>
      </div>

      {/* Stats bar */}
      {result && (
        <div className="flex gap-4 rounded border border-border/50 bg-[#070d1a] px-4 py-2">
          <span className="font-mono text-[10px] text-muted">
            入力 <span className="text-bright">{input.trim().length}</span> 字
          </span>
          <span className="font-mono text-[10px] text-muted">
            出力 <span className="text-bright">{result.length}</span> 字
          </span>
          <span className="font-mono text-[10px] text-muted">
            {mode === 'format' ? (
              <><span className="text-bright">{result.split('\n').length}</span> 行</>
            ) : (
              <>圧縮率 <span className="text-teal">{Math.round((1 - result.length / input.trim().length) * 100)}%</span></>
            )}
          </span>
          <span className="font-mono text-[10px] text-muted ml-auto uppercase">{dialect}</span>
        </div>
      )}
    </div>
  )
}
