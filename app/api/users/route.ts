import { NextResponse } from 'next/server'
import { supabaseService } from '../../../lib/supabase'

export async function GET() {
  const { data, error } = await supabaseService
    .from('users')
    .select('id, email, name')
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