'use server'

import { supabaseService } from '../../lib/supabase'
import { getCurrentUserOrgId } from '../../lib/auth'

const BUCKET = 'expenses-bills'

export type MasterData = {
  users: { id: string; name: string }[]
  sites: { id: string; name: string }[]
  categories: { id: string; name: string }[]
  vendors: { id: string; name: string }[]
}

export async function getNewExpenseMasterData(): Promise<MasterData | null> {
  const orgId = await getCurrentUserOrgId()
  if (!orgId) return null

  const [usersRes, sitesRes, categoriesRes, vendorsRes] = await Promise.all([
    supabaseService.from('users').select('id, name, email').eq('org_id', orgId).order('name'),
    supabaseService.from('sites').select('id, name').order('name'),
    supabaseService.from('categories').select('id, name').order('name'),
    supabaseService.from('vendors').select('id, name').order('name'),
  ])

  const users = (usersRes.data || []).map((u: { id: string; name: string | null; email: string }) => ({
    id: u.id,
    name: (u.name && u.name.trim()) || u.email || 'Unknown'
  }))
  return {
    users,
    sites: sitesRes.data || [],
    categories: categoriesRes.data || [],
    vendors: vendorsRes.data || [],
  }
}

export async function getSignedUploadUrl(fileName: string): Promise<
  { success: true; path: string; token: string; publicUrl: string } | { success: false; error: string }
> {
  const orgId = await getCurrentUserOrgId()
  if (!orgId) return { success: false, error: 'Not signed in or organization not found' }

  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-80)
  const path = `${orgId}/${Date.now()}-${safeName}`

  const { data, error } = await supabaseService.storage
    .from(BUCKET)
    .createSignedUploadUrl(path)

  if (error) return { success: false, error: error.message }
  if (!data?.path || !data?.token) return { success: false, error: 'Failed to create upload URL' }

  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const publicUrl = `${baseUrl}/storage/v1/object/public/${BUCKET}/${data.path}`

  return { success: true, path: data.path, token: data.token, publicUrl }
}

export async function createExpense(formData: FormData): Promise<
  { success: true; expense_no: string } | { success: false; error: string }
> {
  const orgId = await getCurrentUserOrgId()
  if (!orgId) return { success: false, error: 'Not signed in or organization not found' }

  const { data: seq } = await supabaseService
    .from('vr_sequence')
    .select('last_no')
    .eq('org_id', orgId)
    .single()

  const nextNo = (seq?.last_no ?? 1000) + 1
  await supabaseService
    .from('vr_sequence')
    .update({ last_no: nextNo })
    .eq('org_id', orgId)

  const expense_no = 'VR-' + nextNo
  const total_amount = Number(formData.get('total_amount')) || 0
  const paid_amount = Number(formData.get('paid_amount')) || 0
  const balance_amount = total_amount - paid_amount
  const status = balance_amount <= 0 ? 'CLOSED' : 'OPEN'

  const { data: newExpense, error } = await supabaseService.from('expenses').insert({
    org_id: orgId,
    expense_no,
    total_amount,
    paid_amount,
    balance_amount,
    status,
    bill_image_url: (formData.get('bill_image_url') as string) || null,
    payment_proof_url: (formData.get('payment_proof_url') as string) || null,
    expense_date: (formData.get('expense_date') as string) || null,
    site_id: (formData.get('site_id') as string) || null,
    category_id: (formData.get('category_id') as string) || null,
    vendor_id: (formData.get('vendor_id') as string) || null,
    payment_method: (formData.get('payment_method') as string) || null,
    added_by_user_id: (formData.get('added_by_user_id') as string) || null,
    description: (formData.get('description') as string) || null,
  }).select('id').single()

  if (error) return { success: false, error: error.message }

  if (paid_amount > 0 && newExpense?.id) {
    const paidDate = (formData.get('expense_date') as string) || new Date().toISOString().slice(0, 10)
    const paidAt = paidDate.length === 10 ? paidDate + 'T' + new Date().toTimeString().slice(0, 8) : paidDate
    await supabaseService.from('expense_payments').insert({
      org_id: orgId,
      expense_id: newExpense.id,
      amount: paid_amount,
      payment_mode: (formData.get('payment_method') as string) || 'Cash',
      proof_url: (formData.get('payment_proof_url') as string) || null,
      paid_date: paidAt,
      added_by_user_id: (formData.get('added_by_user_id') as string) || null,
      added_by_name: (formData.get('added_by_name') as string) || null,
    })
  }

  return { success: true, expense_no }
}

export async function addPayment(expenseNo: string, formData: FormData): Promise<void> {
  const orgId = await getCurrentUserOrgId()
  if (!orgId) throw new Error('Not signed in or organization not found')

  const { data: expense, error: expErr } = await supabaseService
    .from('expenses')
    .select('id, org_id, total_amount, paid_amount, balance_amount')
    .eq('expense_no', expenseNo)
    .eq('org_id', orgId)
    .single()

  if (expErr || !expense) throw new Error('Expense not found')

  const amount = Number(formData.get('amount')) || 0
  if (amount <= 0) throw new Error('Invalid amount')
  if (amount > Number(expense.balance_amount)) throw new Error('Amount exceeds balance')

  const expenseOrgId = expense.org_id ?? orgId
  const proofFile = formData.get('proof') as File | null
  let proof_url = ''
  if (proofFile?.size) {
    const path = `${expenseOrgId}/payments/${expense.id}/${Date.now()}-proof.jpg`
    const { error: upErr } = await supabaseService.storage
      .from(BUCKET)
      .upload(path, proofFile, { contentType: proofFile.type || 'image/jpeg', upsert: true })
    if (upErr) throw new Error(upErr.message || 'Failed to upload proof')
    const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    proof_url = `${baseUrl}/storage/v1/object/public/${BUCKET}/${path}`
  }

  const paid_date = new Date().toISOString()
  const { error: payErr } = await supabaseService.from('expense_payments').insert({
    org_id: expenseOrgId,
    expense_id: expense.id,
    amount,
    payment_mode: (formData.get('payment_mode') as string) || 'Cash',
    proof_url: proof_url || null,
    paid_date,
    added_by_user_id: (formData.get('added_by_user_id') as string) || null,
    added_by_name: (formData.get('added_by_name') as string) || null,
  })

  if (payErr) throw new Error(payErr.message)

  const newPaid = Number(expense.paid_amount) + amount
  const newBalance = Number(expense.total_amount) - newPaid
  const status = newBalance <= 0 ? 'CLOSED' : 'OPEN'

  const { error: updErr } = await supabaseService
    .from('expenses')
    .update({ paid_amount: newPaid, balance_amount: newBalance, status })
    .eq('id', expense.id)

  if (updErr) throw new Error(updErr.message)
}