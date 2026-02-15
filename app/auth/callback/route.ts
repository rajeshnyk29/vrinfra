import { NextResponse } from 'next/server'
import { createServerSupabase } from '../../../lib/supabase-server'
import { supabaseService } from '../../../lib/supabase'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = await createServerSupabase()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      const authUser = data.user
      const { data: existing } = await supabaseService
        .from('users')
        .select('id, role')
        .eq('auth_user_id', authUser.id)
        .single()

      if (!existing) {
        const email = (authUser.email || '').trim().toLowerCase()
        const name = authUser.user_metadata?.name || ''
        const organizationName = (authUser.user_metadata?.organization_name as string)?.trim() || ''

        const { data: invitedRow } = await supabaseService
          .from('users')
          .select('id, org_id')
          .ilike('email', email)
          .maybeSingle()

        if (invitedRow?.org_id) {
          await supabaseService
            .from('users')
            .update({
              auth_user_id: authUser.id,
              name,
              role: 'user'
            })
            .eq('id', invitedRow.id)
        } else {
          const orgName = organizationName || 'My Organization'
          const { data: org } = await supabaseService
            .from('organizations')
            .insert({ name: orgName })
            .select('id')
            .single()
          if (!org?.id) {
            return NextResponse.redirect(`${origin}/signin?error=org_creation_failed`)
          }
          await supabaseService
            .from('users')
            .insert({
              email: email || authUser.email,
              auth_user_id: authUser.id,
              name,
              role: 'admin',
              org_id: org.id
            })
          await supabaseService
            .from('vr_sequence')
            .insert({ org_id: org.id, last_no: 1000 })
        }
      }
    }
  }

  return NextResponse.redirect(`${origin}/`)
}