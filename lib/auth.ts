import { supabase } from './supabase'
import { supabaseService } from './supabase'

export type UserRole = 'admin' | 'user'

export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function getUserProfile(userId: string) {
  const { data } = await supabaseService
    .from('users')
    .select('id, email, name, role')
    .eq('auth_user_id', userId)
    .single()
  return data
}

export async function ensureProfile(authUser: { id: string; email?: string; user_metadata?: { name?: string } }) {
  const { data: existing } = await supabaseService
    .from('users')
    .select('id, role')
    .eq('auth_user_id', authUser.id)
    .single()

  if (existing) return existing

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

  const role: UserRole = (count ?? 0) === 0 ? 'admin' : 'user'

  if (invitedRow) {
    await supabaseService
      .from('users')
      .update({ auth_user_id: authUser.id, name, role })
      .eq('id', invitedRow.id)
    return { id: invitedRow.id, role }
  }

  const { data: inserted } = await supabaseService
    .from('users')
    .insert({ email, auth_user_id: authUser.id, name, role })
    .select('id, role')
    .single()

  return inserted
}

export async function isEmailInvited(email: string): Promise<boolean> {
  const { data } = await supabaseService
    .from('users')
    .select('id')
    .eq('email', email)
    .maybeSingle()
  return !!data
}

export async function hasAnyAdmin(): Promise<boolean> {
  const { count } = await supabaseService
    .from('users')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'admin')
  return (count ?? 0) > 0
}