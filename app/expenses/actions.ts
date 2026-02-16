'use server'

import { supabaseService } from '../../lib/supabase'
import { getCurrentUserOrgId } from '../../lib/auth'

function isValidUuid(id: string | null | undefined): boolean {
  if (!id || typeof id !== 'string') return false
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(id)
}

export async function createExpense(form: FormData): Promise<{ success: true; expense_no: string } | { success: false; error: string }> {
  try {
    const orgId = await getCurrentUserOrgId()
    if (!orgId) return { success: false, error: 'Not signed in or organization not found' }

    const seq = await supabaseService
      .from('vr_sequence')
      .select('last_no')
      .eq('org_id', orgId)
      .single()

    const last = seq.data?.last_no ?? 1000
    const next = last + 1
    const expense_no = `EX-${next}`

    const updateSeq = await supabaseService
      .from('vr_sequence')
      .update({ last_no: next })
      .eq('org_id', orgId)

    if (updateSeq.error) return { success: false, error: updateSeq.error.message }

    const total = Number(form.get('total_amount'))
    const paid = Number(form.get('paid_amount'))

    if (paid > total) {
      return { success: false, error: 'Paid amount cannot exceed total' }
    }

    const invoice = form.get('invoice') as File
    if (!invoice || invoice.size === 0) {
      return { success: false, error: 'Invoice proof is required' }
    }

    if (paid > 0) {
      const proof = form.get('payment_proof') as File
      if (!proof || proof.size === 0) {
        return { success: false, error: 'Payment proof is required when paid amount is greater than 0' }
      }
    }

    const balance = total - paid

    let credit_status = 'NO_CREDIT'
    if (paid === 0) credit_status = 'FULL_CREDIT'
    if (paid > 0 && balance > 0) credit_status = 'PARTIAL_CREDIT'

    const status = balance === 0 ? 'CLOSED' : 'OPEN'

    let bill_image_url = ''
    if (invoice && invoice.size > 0) {
      const name = Date.now() + '-' + invoice.name
      const uploadRes = await supabaseService.storage.from('expenses-bills').upload(name, invoice)
      if (uploadRes.error) return { success: false, error: `Invoice upload failed: ${uploadRes.error.message}` }
      bill_image_url =
        supabaseService.storage.from('expenses-bills').getPublicUrl(name).data.publicUrl
    }

    let first_payment_proof = ''
    const proof = form.get('payment_proof') as File

    if (proof && proof.size > 0) {
      const name = Date.now() + '-' + proof.name
      const proofUpload = await supabaseService.storage.from('expenses-bills').upload(name, proof)
      if (proofUpload.error) return { success: false, error: `Payment proof upload failed: ${proofUpload.error.message}` }
      first_payment_proof =
        supabaseService.storage.from('expenses-bills').getPublicUrl(name).data.publicUrl
    }

    const categoryId = form.get('category_id') as string
    const vendorId = form.get('vendor_id') as string

    const ins = await supabaseService.from('expenses').insert({
      org_id: orgId,
      expense_no,
      expense_date: form.get('expense_date'),
      site_id: form.get('site_id'),
      category_id: categoryId || null,
      vendor_id: vendorId || null,
      total_amount: total,
      paid_amount: paid,
      balance_amount: balance,
      credit_status,
      status,
      bill_image_url,
      first_payment_proof,
      description: form.get('description')
    }).select().single()

    if (ins.error) return { success: false, error: ins.error.message }

    if (paid > 0 && first_payment_proof) {
      const paymentMode = form.get('payment_method') || 'Cash'
      const addedByUserId = form.get('added_by_user_id') as string | null
      const addedByName = (form.get('added_by_name') as string)?.trim() || null

      const paymentData: Record<string, unknown> = {
        org_id: orgId,
        expense_id: ins.data.id,
        amount: paid,
        payment_mode: paymentMode,
        proof_url: first_payment_proof,
        paid_date: new Date().toISOString(),
        added_by_name: addedByName
      }

      if (isValidUuid(addedByUserId)) {
        paymentData.added_by_user_id = addedByUserId
      }

      const paymentIns = await supabaseService.from('expense_payments').insert(paymentData)

      if (paymentIns.error) {
        return { success: false, error: `Failed to save payment record: ${paymentIns.error.message}` }
      }
    }

    return { success: true, expense_no }
  } catch (err: any) {
    const message = err?.message || String(err) || 'Failed to save expense'
    return { success: false, error: message }
  }
}

export async function addPayment(expenseNo: string, form: FormData) {
  const orgId = await getCurrentUserOrgId()
  if (!orgId) throw new Error('Not signed in or organization not found')

  const amount = Number(form.get('amount'))
  const mode = form.get('payment_mode')
  const file = form.get('proof') as File
  const addedByUserId = form.get('added_by_user_id') as string | null
  const addedByName = (form.get('added_by_name') as string)?.trim() || null

  const exp = await supabaseService
    .from('expenses')
    .select('id, total_amount, paid_amount, balance_amount, org_id')
    .eq('expense_no', expenseNo)
    .eq('org_id', orgId)
    .single()

  if (!exp.data) throw new Error('Expense not found')

  if (amount > exp.data.balance_amount) {
    throw new Error('Amount exceeds invoice balance')
  }

  const name = Date.now() + '-' + file.name
  await supabaseService.storage.from('expenses-bills').upload(name, file)

  const proofUrl =
    supabaseService.storage.from('expenses-bills').getPublicUrl(name).data.publicUrl

  const paymentData: Record<string, unknown> = {
    org_id: exp.data.org_id,
    expense_id: exp.data.id,
    amount,
    payment_mode: mode,
    proof_url: proofUrl,
    paid_date: new Date().toISOString(),
    added_by_name: addedByName
  }

  if (isValidUuid(addedByUserId)) {
    paymentData.added_by_user_id = addedByUserId
  }

  const paymentIns = await supabaseService.from('expense_payments').insert(paymentData)

  if (paymentIns.error) {
    throw new Error(`Failed to save payment: ${paymentIns.error.message}`)
  }

  const newPaid = exp.data.paid_amount + amount
  const newBalance = exp.data.total_amount - newPaid

  await supabaseService
    .from('expenses')
    .update({
      paid_amount: newPaid,
      balance_amount: newBalance,
      status: newBalance === 0 ? 'CLOSED' : 'OPEN'
    })
    .eq('id', exp.data.id)
    .eq('org_id', orgId)

  return { success: true }
}