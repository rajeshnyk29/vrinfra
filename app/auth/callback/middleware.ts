import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const publicPaths = ['/', '/signup', '/signup/invite', '/signup/complete', '/signin', '/auth/callback', '/reset-password']
const masterPaths = ['/master', '/master/categories', '/master/sites', '/master/vendors', '/master/users']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (publicPaths.some(p => pathname === p || pathname.startsWith('/auth/'))) {
    return NextResponse.next()
  }

  const supabase = createClient(url, anon, {
    global: { headers: { Cookie: request.headers.get('cookie') || '' } }
  })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    const signIn = new URL('/signin', request.url)
    signIn.searchParams.set('redirect', pathname)
    return NextResponse.redirect(signIn)
  }

  const isMaster = masterPaths.some(p => pathname === p || pathname.startsWith(p + '/'))

  if (isMaster) {
    const service = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!service) return NextResponse.next()

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

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}