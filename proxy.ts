import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const publicPaths = ['/', '/signup', '/signup/invite', '/signup/complete', '/signin', '/auth/callback', '/reset-password']
const masterPaths = ['/master', '/master/categories', '/master/sites', '/master/vendors', '/master/users']

const AUTH_TIMEOUT_MS = 5000

function toNextCookieOptions(opts: Record<string, unknown> = {}) {
  const allowed: Record<string, unknown> = {}
  const keys = ['path', 'maxAge', 'domain', 'secure', 'httpOnly', 'sameSite', 'expires']
  keys.forEach((k) => { if (opts[k] !== undefined) allowed[k] = opts[k] })
  return allowed
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('Auth timeout')), ms))
  ])
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (publicPaths.some(p => pathname === p || pathname.startsWith('/auth/'))) {
    return NextResponse.next()
  }

  let response = NextResponse.next({ request })

  

  try {
    const supabase = createServerClient(url, anon, {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: Record<string, unknown> }>) {
          cookiesToSet.forEach(({ name, value, options }) => {
            try {
              response.cookies.set(name, value, toNextCookieOptions(options))
            } catch {
              // ignore
            }
          })
        },
      },
    })

    const { data: { session } } = await withTimeout(supabase.auth.getSession(), AUTH_TIMEOUT_MS)
const user = session?.user ?? null
    if (!user) {
      const signIn = new URL('/signin', request.url)
      signIn.searchParams.set('redirect', pathname)
      return NextResponse.redirect(signIn)
    }

    const isMaster = masterPaths.some(p => pathname === p || pathname.startsWith(p + '/'))

    if (isMaster) {
      const service = process.env.SUPABASE_SERVICE_ROLE_KEY
      if (!service) return response

      const supabaseService = createClient(url, service)
      const { data: profile } = await supabaseService
        .from('users')
        .select('role')
        .eq('auth_user_id', user.id)
        .single()

      if (profile?.role !== 'admin') {
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }
    }

    return response
  } catch {
    return response
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon-192\\.png|icon-512\\.png|manifest\\.json|sw\\.js).*)'],
}