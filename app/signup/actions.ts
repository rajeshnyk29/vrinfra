'use server'

import { supabaseService } from '../../lib/supabase'
import { createServerSupabase } from '../../lib/supabase-server'

export async function checkCanSignUp(email: string): Promise<{ allowed: boolean; reason?: string; requireOrgName?: boolean }> {
  const normalizedEmail = email.trim().toLowerCase()

  const { count: confirmedCount } = await supabaseService
    .from('users')
    .select('*', { count: 'exact', head: true })
    .not('auth_user_id', 'is', null)

  const hasAnyConfirmedUser = (confirmedCount ?? 0) > 0

  if (!hasAnyConfirmedUser) {
    return { allowed: true, requireOrgName: true }
  }

  const { data } = await supabaseService
    .from('users')
    .select('id')
    .ilike('email', normalizedEmail)
    .maybeSingle()

  if (!data) {
    return { allowed: false, reason: 'Contact admin for invitation' }
  }

  return { allowed: true, requireOrgName: false }
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

  const { data: updated, error: updateByAuthError } = await supabaseService
    .from('users')
    .update({ name: trimmed })
    .eq('auth_user_id', user.id)
    .select('id')
    .maybeSingle()

  if (updateByAuthError) {
    return { ok: false, error: updateByAuthError.message }
  }

  if (updated?.id) {
    return { ok: true }
  }

  const email = (user.email || '').trim().toLowerCase()
  if (!email) {
    return { ok: false, error: 'Email not found' }
  }

  const { data: byEmail, error: fetchError } = await supabaseService
    .from('users')
    .select('id')
    .ilike('email', email)
    .maybeSingle()

  if (fetchError || !byEmail?.id) {
    return { ok: true }
  }

  const { error: linkError } = await supabaseService
    .from('users')
    .update({ auth_user_id: user.id, name: trimmed })
    .eq('id', byEmail.id)

  if (linkError) {
    return { ok: false, error: linkError.message }
  }

  return { ok: true }
}