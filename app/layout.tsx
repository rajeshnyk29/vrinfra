import './globals.css'
import { createServerSupabase } from '../lib/supabase-server'
import { supabaseService } from '../lib/supabase'
import { ensureProfile } from '../lib/auth'

export const metadata = {
  title: 'Infra Expense Manager',
  description: 'Manage expenses, track payments and view analytics',
}

export const viewport = {
  themeColor: '#0f172a',
  width: 'device-width',
  initialScale: 1,
}

export default async function Layout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  let orgName: string | null = null

  if (user) {
    try {
      await ensureProfile(user)
      const { data: profile } = await supabaseService
        .from('users')
        .select('org_id')
        .eq('auth_user_id', user.id)
        .single()
      if (profile?.org_id) {
        const { data: org } = await supabaseService
          .from('organizations')
          .select('name')
          .eq('id', profile.org_id)
          .single()
        orgName = org?.name ?? null
      }
    } catch (e) {
      console.error('Layout ensureProfile/org fetch:', e)
    }
  }

  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className="min-h-screen">
        <div className="min-h-screen">
          <header className="bg-slate-900/95 backdrop-blur border-b border-white/10 sticky top-0 z-10">
            <div className="max-w-6xl mx-auto px-4 py-3">
            <a href="/" className="block">
                <h1 className="text-xl sm:text-2xl font-bold text-white">
                  {orgName ?? 'Infra Expense Manager'}
                </h1>
              </a>
            </div>
          </header>
          {children}
        </div>
      </body>
    </html>
  )
}