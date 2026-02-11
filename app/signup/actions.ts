'use server'

import { supabaseService } from '../../lib/supabase'

export async function checkCanSignUp(email: string): Promise<{ allowed: boolean; reason?: string }> {
  const normalizedEmail = email.trim().toLowerCase()

  const { count: confirmedCount } = await supabaseService
    .from('users')
    .select('*', { count: 'exact', head: true })
    .not('auth_user_id', 'is', null)

  const hasAnyConfirmedUser = (confirmedCount ?? 0) > 0

  if (!hasAnyConfirmedUser) {
    return { allowed: true }
  }

  const { data } = await supabaseService
    .from('users')
    .select('id')
    .ilike('email', normalizedEmail)
    .maybeSingle()

  if (!data) {
    return { allowed: false, reason: 'Contact admin for invitation' }
  }

  return { allowed: true }
}