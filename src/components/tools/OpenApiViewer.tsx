'use client'

import { useState, useMemo, useCallback } from 'react'
import jsYaml from 'js-yaml'

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS'

interface ParsedParameter {
  name: string
  in: string
  required: boolean
  type: string
  description: string
}

interface ParsedResponse {
  statusCode: string
  description: string
  schema: string
}

interface ParsedEndpoint {
  method: HttpMethod
  path: string
  summary: string
  description: string
  tags: string[]
  parameters: ParsedParameter[]
  requestBody: string | null
  responses: ParsedResponse[]
}

const METHOD_COLORS: Record<HttpMethod, string> = {
  GET: 'bg-green-500/10 text-green-400 border-green-500/30',
  POST: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  PUT: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
  DELETE: 'bg-red-500/10 text-red-400 border-red-500/30',
  PATCH: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
  HEAD: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
  OPTIONS: 'bg-gray-500/10 text-gray-400 border-gray-500/30',
}

const SAMPLE_YAML = `openapi: "3.0.0"
info:
  title: Sample API
  version: "1.0.0"
paths:
  /users:
    get:
      summary: List users
      parameters:
        - name: limit
          in: query
          schema:
            type: integer
      responses:
        "200":
          description: A list of users
    post:
      summary: Create a user
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                name:
                  type: string
                email:
                  type: string
      responses:
        "201":
          description: User created
  /users/{id}:
    get:
      summary: Get user by ID
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
      responses:
        "200":
          description: A single user
        "404":
          description: Not found
    delete:
      summary: Delete user
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
      responses:
        "204":
          description: Deleted
`

function resolveRef(ref: string, root: any): any {
  if (!ref.startsWith('#/')) return {}
  const parts = ref.slice(2).split('/')
    let current: any = root
  for (const part of parts) {
    if (current == null) return {}
    current = current[decodeURIComponent(part.replace(/~1/g, '/').replace(/~0/g, '~'))]
  }
  return current ?? {}
}

function schemaToString(schema: any, root: any, depth = 0): string {
  if (!schema) return 'any'
  if (schema.$ref) schema = resolveRef(schema.$ref, root)
  if (schema.type === 'array') return `Array<${schemaToString(schema.items, root, depth)}>`
  if (schema.type === 'object' || schema.properties) {
    if (depth > 2) return 'object'
    const props = schema.properties
    if (!props) return 'object'
    const entries = Object.entries(props)
      .map(([k, v]) => `${k}: ${schemaToString(v as object, root, depth + 1)}`)
      .join(', ')
    return `{ ${entries} }`
  }
  return schema.type || schema.format || 'any'
}

function parseEndpoints(spec: any): ParsedEndpoint[] {
  const endpoints: ParsedEndpoint[] = []
  const paths = spec.paths || {}
  const isSwagger2 = !!spec.swagger

  for (const [path, pathItem] of Object.entries(paths)) {
        const item = pathItem as any
    const methods: HttpMethod[] = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS']
    for (const method of methods) {
      const op = item[method.toLowerCase()]
      if (!op) continue

      // Parameters
      const allParams = [...(item.parameters || []), ...(op.parameters || [])]
      const parameters: ParsedParameter[] = allParams.map((p: any) => {
        const resolved = p.$ref ? resolveRef(p.$ref, spec) : p
        const schema = resolved.schema || resolved
        return {
          name: resolved.name || '',
          in: resolved.in || '',
          required: !!resolved.required,
          type: schemaToString(schema, spec),
          description: resolved.description || '',
        }
      })

      // Request body
      let requestBody: string | null = null
      if (!isSwagger2 && op.requestBody) {
        const rb = op.requestBody.$ref ? resolveRef(op.requestBody.$ref, spec) : op.requestBody
        const content = rb.content || {}
        const firstKey = Object.keys(content)[0]
        if (firstKey && content[firstKey]?.schema) {
          requestBody = schemaToString(content[firstKey].schema, spec)
        } else {
          requestBody = firstKey || 'body'
        }
      } else if (isSwagger2) {
        const bodyParam = allParams.find((p: any) => p.in === 'body')
        if (bodyParam) {
          const resolved = bodyParam.$ref ? resolveRef(bodyParam.$ref, spec) : bodyParam
          requestBody = schemaToString(resolved.schema, spec)
        }
      }

      // Responses
      const responses: ParsedResponse[] = Object.entries(op.responses || {}).map(([code, res]) => {
                const r = (res as any).$ref ? resolveRef((res as any).$ref, spec) : res as any
        let schemaStr = ''
        if (!isSwagger2 && r.content) {
          const firstKey = Object.keys(r.content)[0]
          if (firstKey && r.content[firstKey]?.schema) {
            schemaStr = schemaToString(r.content[firstKey].schema, spec)
          }
        } else if (isSwagger2 && r.schema) {
          schemaStr = schemaToString(r.schema, spec)
        }
        return {
          statusCode: String(code),
          description: r.description || '',
          schema: schemaStr,
        }
      })

      endpoints.push({
        method,
        path,
        summary: op.summary || '',
        description: op.description || '',
        tags: op.tags || [],
        parameters,
        requestBody,
        responses,
      })
    }
  }
  return endpoints
}

const HTTP_METHODS: (HttpMethod | 'ALL')[] = ['ALL', 'GET', 'POST', 'PUT', 'DELETE', 'PATCH']

const METHOD_FILTER_COLORS: Record<string, string> = {
  GET:    'border-green-500/40 bg-green-500/10 text-green-400',
  POST:   'border-blue-500/40 bg-blue-500/10 text-blue-400',
  PUT:    'border-yellow-500/40 bg-yellow-500/10 text-yellow-400',
  DELETE: 'border-red-500/40 bg-red-500/10 text-red-400',
  PATCH:  'border-orange-500/40 bg-orange-500/10 text-orange-400',
  ALL:    'border-teal/40 bg-teal/10 text-teal',
}

const IN_BADGE: Record<string, string> = {
  path:   'bg-purple-500/10 text-purple-400',
  query:  'bg-blue-500/10 text-blue-400',
  header: 'bg-yellow-500/10 text-yellow-400',
  cookie: 'bg-orange-500/10 text-orange-400',
  body:   'bg-teal/10 text-teal',
}

export function OpenApiViewer() {
  const [input, setInput] = useState(SAMPLE_YAML)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [methodFilter, setMethodFilter] = useState<HttpMethod | 'ALL'>('ALL')
  const [openIdx, setOpenIdx] = useState<number | null>(null)
  const [showInput, setShowInput] = useState(true)

  const endpoints = useMemo(() => {
    if (!input.trim()) return []
    try {
      let spec: any
      try { spec = JSON.parse(input) } catch { spec = jsYaml.load(input) }
      if (!spec || typeof spec !== 'object') { setError('パースできませんでした'); return [] }
      if (!spec.paths && !spec.openapi && !spec.swagger) { setError('OpenAPI / Swagger 仕様書ではありません'); return [] }
      setError(null)
      return parseEndpoints(spec)
    } catch (e) {
      setError(String(e))
      return []
    }
  }, [input])

  const filtered = useMemo(() => endpoints.filter(ep => {
    if (methodFilter !== 'ALL' && ep.method !== methodFilter) return false
    if (search && !ep.path.toLowerCase().includes(search.toLowerCase()) && !ep.summary.toLowerCase().includes(search.toLowerCase())) return false
    return true
  }), [endpoints, methodFilter, search])

  const handleToggle = useCallback((i: number) => setOpenIdx(prev => prev === i ? null : i), [])

  return (
    <div className="space-y-4">

      {/* Input panel */}
      <div className="overflow-hidden rounded-xl border border-border">
        <div className="flex items-center justify-between border-b border-border bg-surface px-4 py-2.5">
          <span className="font-mono text-xs text-muted">OpenAPI YAML / JSON</span>
          <div className="flex items-center gap-2">
            {endpoints.length > 0 && (
              <span className="rounded-full bg-teal/10 px-2 py-0.5 font-mono text-[11px] text-teal">
                {endpoints.length} endpoints
              </span>
            )}
            <button
              onClick={() => setShowInput(v => !v)}
              className="font-mono text-xs text-muted hover:text-primary transition-colors"
            >
              {showInput ? '▲ 折りたたむ' : '▼ 展開する'}
            </button>
          </div>
        </div>
        {showInput && (
          <div className="relative">
            <textarea
              value={input}
              onChange={e => { setInput(e.target.value); setOpenIdx(null) }}
              rows={10}
              className="w-full bg-bg px-4 py-3 font-mono text-xs text-primary outline-none transition-colors focus:ring-1 focus:ring-teal/30"
              spellCheck={false}
            />
          </div>
        )}
        {error && (
          <div className="border-t border-red-500/20 bg-red-500/5 px-4 py-2">
            <p className="font-mono text-xs text-red-400">⚠ {error}</p>
          </div>
        )}
      </div>

      {endpoints.length > 0 && (
        <>
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-40">
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="パス / サマリーで絞り込み..."
                className="w-full rounded-lg border border-border bg-bg px-3 py-2 font-mono text-xs text-primary outline-none focus:border-teal"
              />
            </div>
            <div className="flex gap-1">
              {HTTP_METHODS.map(m => (
                <button
                  key={m}
                  onClick={() => setMethodFilter(m)}
                  className={`rounded-full border px-2.5 py-1 font-mono text-xs font-bold transition-all ${
                    methodFilter === m
                      ? (METHOD_FILTER_COLORS[m] ?? 'border-teal/40 bg-teal/10 text-teal')
                      : 'border-border text-muted hover:border-border-hi hover:text-primary'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          <p className="font-mono text-xs text-muted">{filtered.length} / {endpoints.length} エンドポイント</p>

          {/* Endpoint list */}
          <div className="space-y-1.5">
            {filtered.length === 0 ? (
              <p className="py-10 text-center font-mono text-sm text-muted">該当なし</p>
            ) : (
              filtered.map((ep, i) => (
                <div key={i} className="overflow-hidden rounded-xl border border-border transition-colors hover:border-border-hi">
                  <button
                    onClick={() => handleToggle(i)}
                    className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
                  >
                    <span className={`shrink-0 rounded border px-2.5 py-1 font-mono text-xs font-bold tracking-wide ${METHOD_COLORS[ep.method] ?? 'bg-surface text-muted border-border'}`}>
                      {ep.method}
                    </span>
                    <span className="flex-1 min-w-0 font-mono text-sm text-bright truncate">{ep.path}</span>
                    {ep.summary && (
                      <span className="hidden sm:block shrink-0 text-xs text-muted">{ep.summary}</span>
                    )}
                    {ep.tags.length > 0 && (
                      <span className="hidden lg:block rounded bg-surface px-1.5 py-0.5 font-mono text-[10px] text-muted">
                        {ep.tags[0]}
                      </span>
                    )}
                    <span className={`shrink-0 font-mono text-xs text-border transition-transform ${openIdx === i ? 'rotate-180' : ''}`}>▼</span>
                  </button>

                  {openIdx === i && (
                    <div className="border-t border-border bg-bg px-4 py-4 space-y-4">
                      {ep.summary && <p className="text-sm font-semibold text-primary">{ep.summary}</p>}
                      {ep.description && <p className="text-xs text-dim leading-relaxed">{ep.description}</p>}

                      {/* Parameters */}
                      {ep.parameters.length > 0 && (
                        <div>
                          <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-muted">Parameters</p>
                          <div className="overflow-x-auto rounded-lg border border-border">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="bg-surface">
                                  {['Name', 'In', 'Type', 'Req', 'Description'].map(h => (
                                    <th key={h} className="px-3 py-2 text-left font-mono text-[10px] uppercase tracking-widest text-muted">{h}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-border">
                                {ep.parameters.map((p, pi) => (
                                  <tr key={pi} className="transition-colors hover:bg-surface/40">
                                    <td className="px-3 py-2.5 font-mono font-semibold text-bright">{p.name}</td>
                                    <td className="px-3 py-2.5">
                                      <span className={`rounded px-1.5 py-0.5 font-mono text-[11px] ${IN_BADGE[p.in] ?? 'bg-surface text-muted'}`}>{p.in}</span>
                                    </td>
                                    <td className="px-3 py-2.5 font-mono text-teal">{p.type}</td>
                                    <td className="px-3 py-2.5 text-center">
                                      {p.required ? <span className="text-red-400 text-xs">●</span> : <span className="text-border text-xs">○</span>}
                                    </td>
                                    <td className="px-3 py-2.5 text-dim">{p.description}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* Request body */}
                      {ep.requestBody && (
                        <div>
                          <p className="mb-1.5 font-mono text-[10px] uppercase tracking-widest text-muted">Request Body</p>
                          <code className="block rounded-lg border border-teal/20 bg-teal/5 px-3 py-2 font-mono text-xs text-teal">{ep.requestBody}</code>
                        </div>
                      )}

                      {/* Responses */}
                      {ep.responses.length > 0 && (
                        <div>
                          <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-muted">Responses</p>
                          <div className="space-y-1.5">
                            {ep.responses.map((r, ri) => {
                              const code = parseInt(r.statusCode)
                              const col = code >= 500 ? 'text-red-400 bg-red-500/10 border-red-500/20'
                                : code >= 400 ? 'text-orange-400 bg-orange-500/10 border-orange-500/20'
                                : code >= 300 ? 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20'
                                : 'text-green-400 bg-green-500/10 border-green-500/20'
                              return (
                                <div key={ri} className="flex items-center gap-3 rounded-lg border border-border px-3 py-2.5">
                                  <span className={`shrink-0 rounded px-2 py-0.5 font-mono text-xs font-bold border ${col}`}>{r.statusCode}</span>
                                  <span className="flex-1 text-xs text-dim">{r.description}</span>
                                  {r.schema && <code className="shrink-0 font-mono text-xs text-teal">{r.schema}</code>}
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  )
}
