import { supabase } from './supabase'
import { supabaseService } from './supabase'
import { createServerSupabase } from './supabase-server'

export type UserRole = 'admin' | 'user'

export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function getUserProfile(userId: string) {
  const { data } = await supabaseService
    .from('users')
    .select('id, email, name, role, org_id')
    .eq('auth_user_id', userId)
    .single()
  return data
}

export async function getCurrentUserOrgId(): Promise<string | null> {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabaseService
    .from('users')
    .select('org_id')
    .eq('auth_user_id', user.id)
    .single()

  if (data?.org_id) return data.org_id

  try {
    await ensureProfile(user)
  } catch {
    return null
  }

  const { data: retry } = await supabaseService
    .from('users')
    .select('org_id')
    .eq('auth_user_id', user.id)
    .single()

  if (retry?.org_id) return retry.org_id

  const email = (user.email || '').trim().toLowerCase()
  if (email) {
    const { data: byEmail } = await supabaseService
      .from('users')
      .select('id, org_id')
      .ilike('email', email)
      .maybeSingle()

    if (byEmail?.org_id) {
      await supabaseService
        .from('users')
        .update({ auth_user_id: user.id })
        .eq('id', byEmail.id)
      return byEmail.org_id
    }
  }

  const { data: org } = await supabaseService
    .from('organizations')
    .insert({ name: 'My Organization' })
    .select('id')
    .single()
  if (!org?.id) return null

  await supabaseService
    .from('users')
    .update({ org_id: org.id })
    .eq('auth_user_id', user.id)

  await supabaseService
    .from('vr_sequence')
    .upsert({ org_id: org.id, last_no: 1000 }, { onConflict: 'org_id' })

  return org.id
}

export async function ensureProfile(authUser: { id: string; email?: string; user_metadata?: { name?: string; organization_name?: string } }) {
  const { data: existing } = await supabaseService
    .from('users')
    .select('id, role, org_id')
    .eq('auth_user_id', authUser.id)
    .single()

  if (existing?.org_id) return existing

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
      .update({ auth_user_id: authUser.id, name, role: 'user' })
      .eq('id', invitedRow.id)
    return { id: invitedRow.id, role: 'user' }
  }

  const orgName = organizationName || 'My Organization'
  const { data: org } = await supabaseService
    .from('organizations')
    .insert({ name: orgName })
    .select('id')
    .single()
  if (!org?.id) {
    throw new Error('Failed to create organization')
  }
  await supabaseService
    .from('vr_sequence')
    .insert({ org_id: org.id, last_no: 1000 })

  if (existing) {
    await supabaseService
      .from('users')
      .update({ org_id: org.id })
      .eq('id', existing.id)
    return { id: existing.id, role: existing.role }
  }

  const { data: inserted } = await supabaseService
    .from('users')
    .insert({ email: email || authUser.email, auth_user_id: authUser.id, name, role: 'admin', org_id: org.id })
    .select('id, role')
    .single()

  return inserted
}