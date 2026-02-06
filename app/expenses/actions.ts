'use server'

import { supabaseService } from '../../lib/supabase'

/* =========================
   CREATE EXPENSE
========================= */
export async function createExpense(form: FormData) {

  const seq = await supabaseService
    .from('vr_sequence')
    .select('last_no')
    .eq('id', 1)
    .single()

  const last = seq.data?.last_no ?? 1000
  const next = last + 1
  const expense_no = `EX-${next}`

  await supabaseService
    .from('vr_sequence')
    .update({ last_no: next })
    .eq('id', 1)

  const total = Number(form.get('total_amount'))
  const paid = Number(form.get('paid_amount'))

  if (paid > total) {
    throw new Error('Paid amount cannot exceed total')
  }

  const balance = total - paid

  let credit_status = 'NO_CREDIT'
  if (paid === 0) credit_status = 'FULL_CREDIT'
  if (paid > 0 && balance > 0) credit_status = 'PARTIAL_CREDIT'

  const status = balance === 0 ? 'CLOSED' : 'OPEN'

  let bill_image_url = ''
  const invoice = form.get('invoice') as File

  if (invoice && invoice.size > 0) {
    const name = Date.now() + '-' + invoice.name
    await supabaseService.storage.from('expenses-bills').upload(name, invoice)
    bill_image_url =
      supabaseService.storage.from('expenses-bills').getPublicUrl(name).data.publicUrl
  }

  let first_payment_proof = ''
  const proof = form.get('payment_proof') as File

  if (proof && proof.size > 0) {
    const name = Date.now() + '-' + proof.name
    await supabaseService.storage.from('expenses-bills').upload(name, proof)
    first_payment_proof =
      supabaseService.storage.from('expenses-bills').getPublicUrl(name).data.publicUrl
  }

  const ins = await supabaseService.from('expenses').insert({
    expense_no,
    expense_date: form.get('expense_date'),
    site_id: form.get('site_id'),
    total_amount: total,
    paid_amount: paid,
    balance_amount: balance,
    credit_status,
    status,
    bill_image_url,
    first_payment_proof,
    category: form.get('category'),
    description: form.get('description')
  }).select().single()

  if (ins.error) throw new Error(ins.error.message)

  if (paid > 0 && first_payment_proof) {
    const paymentMode = form.get('payment_method') || 'Cash'
    
    const paymentIns = await supabaseService.from('expense_payments').insert({
      expense_id: ins.data.id,
      amount: paid,
      payment_mode: paymentMode,
      proof_url: first_payment_proof,
      paid_date: new Date().toISOString()
    })

    if (paymentIns.error) {
      console.error('Failed to insert payment:', paymentIns.error)
      throw new Error(`Failed to save payment record: ${paymentIns.error.message}`)
    }
  }

  return { success: true, expense_no }
}

/* =========================
   ADD PAYMENT
========================= */
export async function addPayment(expenseNo: string, form: FormData) {

  const amount = Number(form.get('amount'))
  const mode = form.get('payment_mode')
  const file = form.get('proof') as File

  const exp = await supabaseService
    .from('expenses')
    .select('id, total_amount, paid_amount, balance_amount')
    .eq('expense_no', expenseNo)
    .single()

  if (!exp.data) throw new Error('Expense not found')

  if (amount > exp.data.balance_amount) {
    throw new Error('Amount exceeds invoice balance')
  }

  const name = Date.now() + '-' + file.name
  await supabaseService.storage.from('expenses-bills').upload(name, file)

  const proofUrl =
    supabaseService.storage.from('expenses-bills').getPublicUrl(name).data.publicUrl

  const paymentIns = await supabaseService.from('expense_payments').insert({
    expense_id: exp.data.id,
    amount,
    payment_mode: mode,
    proof_url: proofUrl,
    paid_date: new Date().toISOString()
  })

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

  return { success: true }
}