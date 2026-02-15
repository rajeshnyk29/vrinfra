'use server'

import { supabaseService } from '../../../lib/supabase'
import { getCurrentUserOrgId } from '../../../lib/auth'

export async function getVendors() {
  const orgId = await getCurrentUserOrgId()
  if (!orgId) return []

  const { data, error } = await supabaseService
    .from('vendors')
    .select('id, name')
    .eq('org_id', orgId)
    .order('name')

  if (error) {
    throw new Error(error.message)
  }

  return data || []
}

export async function addVendor(name: string) {
  if (!name.trim()) {
    throw new Error('Vendor name is required')
  }

  const orgId = await getCurrentUserOrgId()
  if (!orgId) throw new Error('Not signed in or organization not found')

  const { data, error } = await supabaseService
    .from('vendors')
    .insert({ name: name.trim(), org_id: orgId })
    .select('id, name')
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export async function deleteVendor(id: string) {
  const orgId = await getCurrentUserOrgId()
  if (!orgId) throw new Error('Not signed in or organization not found')

  const { count, error: countError } = await supabaseService
    .from('expenses')
    .select('*', { count: 'exact', head: true })
    .eq('vendor_id', id)
    .eq('org_id', orgId)

  if (countError) {
    throw new Error('Failed to check linked expenses')
  }

  if (count && count > 0) {
    throw new Error(
      `Cannot delete vendor. ${count} expense(s) use this vendor. Reassign those expenses first.`
    )
  }

  const { error } = await supabaseService
    .from('vendors')
    .delete()
    .eq('id', id)
    .eq('org_id', orgId)

  if (error) {
    throw new Error(error.message)
  }
}