'use server'

import { supabaseService } from '../../../lib/supabase'

export async function addSite(name: string) {
  if (!name.trim()) {
    throw new Error('Site name is required')
  }

  const { data, error } = await supabaseService
    .from('sites')
    .insert({ name: name.trim() })
    .select('id, name')
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export async function deleteSite(id: string) {
  const { count, error: countError } = await supabaseService
    .from('expenses')
    .select('*', { count: 'exact', head: true })
    .eq('site_id', id)

  if (countError) {
    throw new Error('Failed to check linked expenses')
  }

  if (count && count > 0) {
    throw new Error(
      `Cannot delete site. ${count} expense(s) use this site. Reassign those expenses to another site first.`
    )
  }

  const { error } = await supabaseService
    .from('sites')
    .delete()
    .eq('id', id)

  if (error) {
    throw new Error(error.message)
  }
}

export async function getSites() {
  const { data, error } = await supabaseService
    .from('sites')
    .select('id, name')
    .order('name')

  if (error) {
    throw new Error(error.message)
  }

  return data || []
}