'use server'

import { supabaseService } from '../../../lib/supabase'
import { getCurrentUserOrgId } from '../../../lib/auth'

type InviteResult = { ok: boolean; error?: string }

export async function getUsers(): Promise<{ id: string; name: string }[]> {
  const orgId = await getCurrentUserOrgId()
  if (!orgId) return []

  const { data, error } = await supabaseService
    .from('users')
    .select('id, name, email')
    .eq('org_id', orgId)
    .order('name')

  if (error) {
    throw new Error(error.message)
  }

  return (data || []).map((u: { id: string; name: string | null; email: string }) => ({
    id: u.id,
    name: (u.name && u.name.trim()) || u.email || 'Unknown'
  }))
}

export type UserListItem = { id: string; email: string; name: string | null; role: string | null }

export async function getUsersList(): Promise<UserListItem[]> {
  const orgId = await getCurrentUserOrgId()
  if (!orgId) return []

  const { data, error } = await supabaseService
    .from('users')
    .select('id, email, name, role')
    .eq('org_id', orgId)
    .order('email')

  if (error) throw new Error(error.message)
  return data || []
}

export async function inviteUser(email: string): Promise<InviteResult> {
  const normalizedEmail = email.trim().toLowerCase()

  if (!normalizedEmail) {
    return { ok: false, error: 'Email is required' }
  }

  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!re.test(normalizedEmail)) {
    return { ok: false, error: 'Please enter a valid email' }
  }

  const orgId = await getCurrentUserOrgId()
  if (!orgId) {
    return { ok: false, error: 'Not signed in or organization not found' }
  }

  const { data: org } = await supabaseService
    .from('organizations')
    .select('name')
    .eq('id', orgId)
    .single()

  const orgName = org?.name?.trim() || 'our organization'

  const { error: upsertError } = await supabaseService
    .from('users')
    .upsert(
      { email: normalizedEmail, org_id: orgId, role: 'user' },
      { onConflict: 'email' }
    )

  if (upsertError) {
    return { ok: false, error: upsertError.message }
  }

  const redirectBase =
    process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

  const { error: inviteError } =
    await supabaseService.auth.admin.inviteUserByEmail(
      normalizedEmail,
      {
        redirectTo: `${redirectBase}/signup/invite`,
        data: {
          organization_name: orgName
        }
      }
    )

  if (inviteError) {
    return { ok: false, error: inviteError.message }
  }

  return { ok: true }
}

export async function deleteUser(id: string): Promise<{ ok: boolean; error?: string }> {
  const orgId = await getCurrentUserOrgId()
  if (!orgId) {
    return { ok: false, error: 'Not signed in or organization not found' }
  }

  const { error } = await supabaseService
    .from('users')
    .delete()
    .eq('id', id)
    .eq('org_id', orgId)

  if (error) {
    return { ok: false, error: error.message }
  }
  return { ok: true }
}