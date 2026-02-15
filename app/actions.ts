'use server'

import { createServerSupabase } from '../lib/supabase-server'
import { supabaseService } from '../lib/supabase'

export async function getMyRole(): Promise<'admin' | 'user' | null> {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabaseService
    .from('users')
    .select('role')
    .eq('auth_user_id', user.id)
    .single()
  const role = data?.role
  if (role === 'admin' || role === 'user') return role
  return null
}