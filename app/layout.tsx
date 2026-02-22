import './globals.css'
import Link from 'next/link'
import { Toaster } from 'react-hot-toast'
import { createServerSupabase } from '../lib/supabase-server'
import { supabaseService } from '../lib/supabase'
   export const dynamic = 'force-dynamic'
import { ensureProfile, getCurrentUserOrgId } from '../lib/auth'
import PWARegister from './components/PWARegister'

export const metadata = {
  title: 'Infra Expense Manager',
  description: 'Manage expenses, track payments and view analytics',
}

export const viewport = {
  themeColor: '#0f172a',
  width: 'device-width',
  initialScale: 1,
}

export default async function Layout({ children }: { children: React.ReactNode }) {
  let orgName: string | null = null

  try {
    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      try {
        await ensureProfile(user)
        const { data: profile } = await supabaseService.from('users').select('org_id').eq('auth_user_id', user.id).single()
        const orgId = profile?.org_id ?? await getCurrentUserOrgId()
        if (orgId) {
          const { data: org } = await supabaseService.from('organizations').select('name').eq('id', orgId).single()
          orgName = org?.name ?? null
        }
      } catch (e) {
        console.error('Layout ensureProfile/org fetch:', e)
      }
    }
  } catch (e) {
    console.error('Layout auth:', e)
    orgName = null
  }

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Expense Manager" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body className="min-h-screen">
        <PWARegister />
        <Toaster position="top-center" toastOptions={{ duration: 4000 }} />
        <div className="min-h-screen">
          <header className="bg-slate-900/95 backdrop-blur border-b border-white/10 sticky top-0 z-10">
            <div className="max-w-6xl mx-auto px-4 py-3">
              <Link href="/" prefetch={false} className="block">
                <h1 className="text-xl sm:text-2xl font-bold text-white">{orgName ?? 'Infra Expense Manager'}</h1>
              </Link>
            </div>
          </header>
          {children}
        </div>
      </body>
    </html>
  )
}