'use client'

import { useState, useCallback } from 'react'

type Dialect = 'mysql' | 'postgresql' | 'sqlite'
type SqlType = 'TEXT' | 'INTEGER' | 'REAL' | 'BOOLEAN' | 'NULL'

function inferType(value: unknown): SqlType {
  if (value === null) return 'NULL'
  if (typeof value === 'boolean') return 'BOOLEAN'
  if (typeof value === 'number') {
    return Number.isInteger(value) ? 'INTEGER' : 'REAL'
  }
  return 'TEXT'
}

function mysqlType(t: SqlType): string {
  if (t === 'REAL') return 'DOUBLE'
  if (t === 'BOOLEAN') return 'TINYINT(1)'
  return t
}

function quoteIdentifier(name: string, dialect: Dialect): string {
  if (dialect === 'mysql') return `\`${name}\``
  return `"${name}"`
}

function quoteValue(value: unknown, type: SqlType, dialect: Dialect): string {
  if (value === null) return 'NULL'
  if (type === 'BOOLEAN') {
    if (dialect === 'mysql') return value ? '1' : '0'
    return value ? 'TRUE' : 'FALSE'
  }
  if (type === 'INTEGER' || type === 'REAL') return String(value)
  // TEXT: エスケープ
  const str = String(value).replace(/'/g, "''")
  return `'${str}'`
}

interface ColumnInfo {
  name: string
  types: Set<SqlType>
  nullable: boolean
}

function analyzeColumns(rows: Record<string, unknown>[]): ColumnInfo[] {
  const colMap = new Map<string, ColumnInfo>()

  for (const row of rows) {
    for (const [key, val] of Object.entries(row)) {
      const t = inferType(val)
      if (!colMap.has(key)) {
        colMap.set(key, { name: key, types: new Set(), nullable: false })
      }
      const col = colMap.get(key)!
      if (t === 'NULL') {
        col.nullable = true
      } else {
        col.types.add(t)
      }
    }
  }

  return Array.from(colMap.values())
}

function resolveType(col: ColumnInfo): SqlType {
  const types = col.types
  if (types.size === 0) return 'TEXT'
  if (types.has('TEXT')) return 'TEXT'
  if (types.has('REAL')) return 'REAL'
  if (types.has('INTEGER') && types.has('BOOLEAN')) return 'INTEGER'
  return [...types][0]
}

function generateSql(
  rows: Record<string, unknown>[],
  tableName: string,
  schema: string,
  dialect: Dialect
): string {
  if (rows.length === 0) return '-- データが空です'

  const cols = analyzeColumns(rows)
  const tableRef = schema
    ? `${quoteIdentifier(schema, dialect)}.${quoteIdentifier(tableName, dialect)}`
    : quoteIdentifier(tableName, dialect)

  // CREATE TABLE
  const colDefs = cols.map((col) => {
    const baseType = resolveType(col)
    const sqlType = dialect === 'mysql' ? mysqlType(baseType) : baseType
    const nullable = col.nullable ? '' : ' NOT NULL'
    return `  ${quoteIdentifier(col.name, dialect)} ${sqlType}${nullable}`
  })

  const createTable =
    `CREATE TABLE ${tableRef} (\n${colDefs.join(',\n')}\n);`

  // INSERT INTO
  const colNames = cols.map((c) => quoteIdentifier(c.name, dialect)).join(', ')
  const typeMap = new Map(cols.map((c) => [c.name, resolveType(c)]))

  const insertRows = rows.map((row) => {
    const vals = cols.map((col) => {
      const val = col.name in row ? row[col.name] : null
      return quoteValue(val, typeMap.get(col.name) ?? 'TEXT', dialect)
    })
    return `  (${vals.join(', ')})`
  })

  const insertInto =
    `INSERT INTO ${tableRef} (${colNames})\nVALUES\n${insertRows.join(',\n')};`

  return `${createTable}\n\n${insertInto}`
}

const SAMPLE = JSON.stringify(
  [
    { id: 1, name: 'Alice', email: 'alice@example.com', score: 98.5, active: true, note: null },
    { id: 2, name: 'Bob', email: 'bob@example.com', score: 72.0, active: false, note: 'VIP' },
  ],
  null,
  2
)

export function JsonToSql() {
  const [json, setJson] = useState('')
  const [tableName, setTableName] = useState('my_table')
  const [schema, setSchema] = useState('')
  const [dialect, setDialect] = useState<Dialect>('postgresql')
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')

  const output = useCallback((): string => {
    if (!json.trim()) return ''
    try {
      const parsed = JSON.parse(json)
      if (!Array.isArray(parsed)) {
        setError('入力は JSON 配列（[ ... ]）である必要があります')
        return ''
      }
      if (parsed.some((r) => typeof r !== 'object' || r === null || Array.isArray(r))) {
        setError('配列の各要素はオブジェクト（{ ... }）である必要があります')
        return ''
      }
      setError('')
      return generateSql(
        parsed as Record<string, unknown>[],
        tableName || 'my_table',
        schema,
        dialect
      )
    } catch (e) {
      setError(`JSON パースエラー: ${e instanceof Error ? e.message : String(e)}`)
      return ''
    }
  }, [json, tableName, schema, dialect])

  const sql = output()

  const handleCopy = async () => {
    if (!sql) return
    await navigator.clipboard.writeText(sql)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const dialects: { value: Dialect; label: string }[] = [
    { value: 'postgresql', label: 'PostgreSQL' },
    { value: 'mysql', label: 'MySQL' },
    { value: 'sqlite', label: 'SQLite' },
  ]

  return (
    <div className="flex flex-col gap-4">
      {/* 設定バー */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label className="font-mono text-[10px] uppercase tracking-widest text-muted">テーブル名</label>
          <input
            type="text"
            value={tableName}
            onChange={(e) => setTableName(e.target.value)}
            placeholder="my_table"
            className="w-36 rounded border border-border bg-surface px-3 py-1.5 font-mono text-sm text-primary placeholder:text-muted focus:border-teal focus:outline-none"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="font-mono text-[10px] uppercase tracking-widest text-muted">スキーマ（任意）</label>
          <input
            type="text"
            value={schema}
            onChange={(e) => setSchema(e.target.value)}
            placeholder="public"
            className="w-28 rounded border border-border bg-surface px-3 py-1.5 font-mono text-sm text-primary placeholder:text-muted focus:border-teal focus:outline-none"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="font-mono text-[10px] uppercase tracking-widest text-muted">方言</label>
          <div className="flex rounded border border-border overflow-hidden">
            {dialects.map((d) => (
              <button
                key={d.value}
                onClick={() => setDialect(d.value)}
                className={`px-3 py-1.5 font-mono text-xs transition-colors ${
                  dialect === d.value
                    ? 'bg-teal/20 text-teal'
                    : 'bg-surface text-muted hover:text-dim'
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>
        <div className="ml-auto flex gap-2">
          <button
            onClick={() => setJson(SAMPLE)}
            className="rounded border border-border px-3 py-1.5 font-mono text-xs text-muted hover:border-border-hi hover:text-dim transition-colors"
          >
            サンプル
          </button>
          <button
            onClick={handleCopy}
            disabled={!sql}
            className="rounded border border-border px-3 py-1.5 font-mono text-xs text-muted hover:border-teal hover:text-teal disabled:opacity-40 transition-colors"
          >
            {copied ? '✓ コピー済み' : 'SQLをコピー'}
          </button>
        </div>
      </div>

      {/* 2ペイン */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* JSON 入力 */}
        <div className="flex flex-col gap-2">
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted">JSON Input（配列）</span>
          <textarea
            value={json}
            onChange={(e) => setJson(e.target.value)}
            placeholder={'[\n  { "id": 1, "name": "Alice" },\n  { "id": 2, "name": "Bob" }\n]'}
            spellCheck={false}
            className="h-72 w-full resize-y rounded-lg border border-border bg-surface p-4 font-mono text-sm text-primary placeholder:text-muted/50 focus:border-teal focus:outline-none"
          />
          {error && <p className="font-mono text-xs text-red-400">{error}</p>}
        </div>

        {/* SQL 出力 */}
        <div className="flex flex-col gap-2">
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted">SQL Output</span>
          <div className="relative h-72 rounded-lg border border-border bg-surface">
            {sql ? (
              <pre className="h-full overflow-auto p-4 font-mono text-sm text-primary whitespace-pre-wrap break-words">
                {sql}
              </pre>
            ) : (
              <div className="flex h-full items-center justify-center">
                <p className="font-mono text-xs text-muted">JSON配列を入力するとSQLが生成されます</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
