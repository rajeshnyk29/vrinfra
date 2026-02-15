import { NextResponse } from 'next/server'
import { createServerSupabase } from '../../../lib/supabase-server'
import { supabaseService } from '../../../lib/supabase'

export async function GET() {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: me } = await supabaseService
    .from('users')
    .select('org_id')
    .eq('auth_user_id', user.id)
    .single()
  if (!me?.org_id) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 403 })
  }

  const { data, error } = await supabaseService
    .from('users')
    .select('id, email, name')
    .eq('org_id', me.org_id)
    .not('auth_user_id', 'is', null)
    .order('name', { nullsFirst: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const users = (data || []).map(u => ({
    id: u.id,
    name: u.name || u.email || 'Unknown'
  }))

  return NextResponse.json(users)
}