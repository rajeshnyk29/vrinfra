import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const service = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = createClient(url, anon)
    const supabaseService = createClient(url, service)
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      const authUser = data.user
      const { data: existing } = await supabaseService
        .from('users')
        .select('id, role')
        .eq('auth_user_id', authUser.id)
        .single()

      if (!existing) {
        const email = authUser.email || ''
        const name = authUser.user_metadata?.name || ''

        const { data: invitedRow } = await supabaseService
          .from('users')
          .select('id')
          .eq('email', email)
          .maybeSingle()

        const { count } = await supabaseService
          .from('users')
          .select('*', { count: 'exact', head: true })
          .not('auth_user_id', 'is', null)

        const role = (count ?? 0) === 0 ? 'admin' : 'user'

        if (invitedRow) {
          await supabaseService
            .from('users')
            .update({ auth_user_id: authUser.id, name, role })
            .eq('id', invitedRow.id)
        } else {
          await supabaseService
            .from('users')
            .insert({ email, auth_user_id: authUser.id, name, role })
        }
      }
    }
  }

  return NextResponse.redirect(`${origin}/`)
}