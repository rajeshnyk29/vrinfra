'use server'

import { supabaseService } from '../../lib/supabase'
import { createServerSupabase } from '../../lib/supabase-server'

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

export type CompleteAccountResult = { ok: boolean; error?: string }

export async function completeAccount(name: string): Promise<CompleteAccountResult> {
  const trimmed = name?.trim()
  if (!trimmed) {
    return { ok: false, error: 'Name is required' }
  }

  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { ok: false, error: 'Not signed in' }
  }

  const { error } = await supabaseService
    .from('users')
    .update({ name: trimmed })
    .eq('auth_user_id', user.id)

  if (error) {
    return { ok: false, error: error.message }
  }

  return { ok: true }
}