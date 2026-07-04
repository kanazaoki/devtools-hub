'use client'

import { useState, useMemo } from 'react'

// ─── Templates ────────────────────────────────────────────────────────────────

const TEMPLATES: Record<string, { label: string; category: string; content: string }> = {
  node: {
    label: 'Node.js',
    category: 'Language',
    content: `node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*
.pnpm-store/
.npm
.yarn/cache
.yarn/unplugged
.yarn/build-state.yml
.yarn/install-state.gz
.pnp.*
dist/
build/
out/
.env
.env.local
.env.development.local
.env.test.local
.env.production.local
coverage/
.nyc_output/
*.log`,
  },
  python: {
    label: 'Python',
    category: 'Language',
    content: `__pycache__/
*.py[cod]
*$py.class
*.so
.Python
build/
develop-eggs/
dist/
downloads/
eggs/
.eggs/
lib/
lib64/
parts/
sdist/
var/
wheels/
share/python-wheels/
*.egg-info/
.installed.cfg
*.egg
MANIFEST
.env
.venv
env/
venv/
ENV/
env.bak/
venv.bak/
.mypy_cache/
.dmypy.json
dmypy.json
.pytest_cache/
.coverage
htmlcov/
*.log`,
  },
  go: {
    label: 'Go',
    category: 'Language',
    content: `# Binaries
*.exe
*.exe~
*.dll
*.so
*.dylib

# Test binary
*.test

# Output of the go coverage tool
*.out

# Dependency directories
vendor/

# Go workspace file
go.work
go.work.sum`,
  },
  rust: {
    label: 'Rust',
    category: 'Language',
    content: `/target/
Cargo.lock
**/*.rs.bk
*.pdb`,
  },
  java: {
    label: 'Java',
    category: 'Language',
    content: `*.class
*.log
*.ctxt
.mtj.tmp/
*.jar
*.war
*.nar
*.ear
*.zip
*.tar.gz
*.rar
hs_err_pid*
replay_pid*
target/
.gradle/
build/
out/
.idea/
*.iml`,
  },
  swift: {
    label: 'Swift',
    category: 'Language',
    content: `.DS_Store
/.build
/Packages
/Package.resolved
/*.xcodeproj
xcuserdata/
DerivedData/
.swiftpm/
*.playground/xcuserdata/
.build/`,
  },
  kotlin: {
    label: 'Kotlin',
    category: 'Language',
    content: `*.class
*.log
.gradle/
build/
out/
.idea/
*.iml
*.kapt
kotlin-js-store/`,
  },
  cpp: {
    label: 'C++',
    category: 'Language',
    content: `# Prerequisites
*.d

# Compiled Object files
*.slo
*.lo
*.o
*.obj

# Precompiled Headers
*.gch
*.pch

# Compiled Dynamic libraries
*.so
*.dylib
*.dll

# Compiled Static libraries
*.lai
*.la
*.a
*.lib

# Executables
*.exe
*.out
*.app

# Build directories
build/
cmake-build-*/`,
  },
  csharp: {
    label: 'C#',
    category: 'Language',
    content: `*.user
*.suo
*.userosscache
*.sln.docstates
[Dd]ebug/
[Dd]ebugPublic/
[Rr]elease/
[Rr]eleases/
x64/
x86/
[Ww][Ii][Nn]32/
[Aa][Rr][Mm]/
[Aa][Rr][Mm]64/
bld/
[Bb]in/
[Oo]bj/
[Ll]og/
[Ll]ogs/
*.pidb
*.svclog
*.scc
.vs/
*.ncrunchproject
*.ncrunchsolution
project.lock.json
project.fragment.lock.json
artifacts/`,
  },
  react: {
    label: 'React',
    category: 'Framework',
    content: `node_modules/
build/
.env
.env.local
.env.development.local
.env.test.local
.env.production.local
npm-debug.log*
yarn-debug.log*
yarn-error.log*
coverage/`,
  },
  nextjs: {
    label: 'Next.js',
    category: 'Framework',
    content: `node_modules/
.next/
out/
build/
dist/
.env
.env.local
.env.development.local
.env.test.local
.env.production.local
.vercel
npm-debug.log*
yarn-debug.log*`,
  },
  electron: {
    label: 'Electron',
    category: 'Framework',
    content: `node_modules/
dist/
out/
.webpack/
.env
*.log
release/
app/dist/`,
  },
  unity: {
    label: 'Unity',
    category: 'Engine',
    content: `/[Ll]ibrary/
/[Tt]emp/
/[Oo]bj/
/[Bb]uild/
/[Bb]uilds/
/[Ll]ogs/
/[Uu]ser[Ss]ettings/
/[Mm]emoryCaptures/
/[Aa]ssets/AssetStoreTools*
/[Aa]ssets/Plugins/Editor/JetBrains*
sysinfo.txt
*.stackdump
[Dd]esktop.ini
/[Pp]roject[Ss]ettings/ProjectVersion.txt
/[Aa]ssets/AutoBuild/`,
  },
  macos: {
    label: 'macOS',
    category: 'OS',
    content: `.DS_Store
.AppleDouble
.LSOverride
Icon
._*
.DocumentRevisions-V100
.fseventsd
.Spotlight-V100
.TemporaryItems
.Trashes
.VolumeIcon.icns
.com.apple.timemachine.donotpresent
.AppleDB
.AppleDesktop
Network Trash Folder
Temporary Items
.apdisk`,
  },
  windows: {
    label: 'Windows',
    category: 'OS',
    content: `Thumbs.db
Thumbs.db:encryptable
ehthumbs.db
ehthumbs_vista.db
*.stackdump
[Dd]esktop.ini
$RECYCLE.BIN/
*.cab
*.msi
*.msix
*.msm
*.msp
*.lnk`,
  },
  linux: {
    label: 'Linux',
    category: 'OS',
    content: `*~
.fuse_hidden*
.directory
.Trash-*
.nfs*`,
  },
  jetbrains: {
    label: 'JetBrains',
    category: 'IDE',
    content: `.idea/
*.iml
*.iws
*.ipr
out/
.idea_modules/
atlassian-ide-plugin.xml
com_crashlytics_export_strings.xml
crashlytics.properties
crashlytics-build.properties
fabric.properties`,
  },
  vscode: {
    label: 'VSCode',
    category: 'IDE',
    content: `.vscode/*
!.vscode/settings.json
!.vscode/tasks.json
!.vscode/launch.json
!.vscode/extensions.json
!.vscode/*.code-snippets
.history/
*.vsix`,
  },
  xcode: {
    label: 'Xcode',
    category: 'IDE',
    content: `build/
*.pbxuser
!default.pbxuser
*.mode1v3
!default.mode1v3
*.mode2v3
!default.mode2v3
*.perspectivev3
!default.perspectivev3
xcuserdata/
*.moved-aside
*.xccheckout
*.xcscmblueprint
DerivedData/
*.hmap
*.ipa
*.xcarchive`,
  },
}

const CATEGORIES = ['Language', 'Framework', 'Engine', 'OS', 'IDE']

// ─── Merge helper ─────────────────────────────────────────────────────────────

function mergeTemplates(keys: string[]): string {
  if (keys.length === 0) return ''
  const lines = new Set<string>()
  const sections: string[] = []

  for (const key of keys) {
    const tpl = TEMPLATES[key]
    if (!tpl) continue
    sections.push(`# ${tpl.label}`)
    for (const line of tpl.content.split('\n')) {
      if (!lines.has(line)) {
        lines.add(line)
        sections.push(line)
      }
    }
    sections.push('')
  }

  return sections.join('\n').trim()
}

// ─── Component ───────────────────────────────────────────────────────────────

export function GitignoreGenerator() {
  const [selected, setSelected] = useState<Set<string>>(new Set(['node']))
  const [copied, setCopied] = useState(false)

  const output = useMemo(() => mergeTemplates(Array.from(selected)), [selected])

  function toggle(key: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function handleCopy() {
    if (!output) return
    navigator.clipboard.writeText(output).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  function handleDownload() {
    if (!output) return
    const blob = new Blob([output], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = '.gitignore'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      {/* Template selector */}
      <div className="space-y-4">
        {CATEGORIES.map((cat) => {
          const entries = Object.entries(TEMPLATES).filter(([, v]) => v.category === cat)
          return (
            <div key={cat}>
              <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-muted">{cat}</p>
              <div className="flex flex-wrap gap-2">
                {entries.map(([key, { label }]) => (
                  <button
                    key={key}
                    onClick={() => toggle(key)}
                    className={`rounded border px-3 py-1 text-xs font-mono transition-colors ${
                      selected.has(key)
                        ? 'border-teal bg-teal/10 text-teal'
                        : 'border-border text-dim hover:border-teal/50 hover:text-primary'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Output */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="font-mono text-xs uppercase tracking-widest text-muted">
            生成結果
            {selected.size > 0 && (
              <span className="ml-2 text-teal">({selected.size} テンプレート選択中)</span>
            )}
          </p>
          <div className="flex gap-3">
            <button
              onClick={handleCopy}
              disabled={!output}
              className="text-xs text-muted transition-colors hover:text-teal disabled:opacity-40"
            >
              {copied ? '✓ コピー済み' : 'コピー'}
            </button>
            <button
              onClick={handleDownload}
              disabled={!output}
              className="text-xs text-muted transition-colors hover:text-teal disabled:opacity-40"
            >
              ダウンロード (.gitignore)
            </button>
          </div>
        </div>
        <pre className="h-80 overflow-auto rounded border border-border bg-base p-4 text-xs leading-relaxed text-primary">
          {output || <span className="text-muted">テンプレートを選択してください</span>}
        </pre>
      </div>
    </div>
  )
}
