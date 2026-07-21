import { NextResponse, type NextRequest } from 'next/server'

const CANONICAL = 'https://devtools-hub-koma26.vercel.app'
const NON_CANONICAL_HOSTS = [
  'devtools-hub-nanan-s-projects.vercel.app',
  'devtools-hub-kanazaoki-nanan-s-projects.vercel.app',
  'web-site-three-phi.vercel.app',
]

export function middleware(request: NextRequest) {
  const host = request.headers.get('host') ?? ''
  if (NON_CANONICAL_HOSTS.includes(host)) {
    const target = CANONICAL + request.nextUrl.pathname + request.nextUrl.search
    return NextResponse.redirect(target, { status: 301 })
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
