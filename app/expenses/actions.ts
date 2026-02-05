'use server'

import { supabaseService } from '../../lib/supabase'

export async function getNextEX() {

  const { data, error } = await supabaseService
    .from('vr_sequence')
    .select('*')
    .eq('id', 1)
    .maybeSingle()

  // ---- SAFETY FALLBACK ----
  let last = 1000

  if (data && typeof data.last_no === 'number') {
    last = data.last_no
  }

  const next = last + 1

  // update sequence safely
  await supabaseService
    .from('vr_sequence')
    .update({ last_no: next })
    .eq('id', 1)

  return `EX-${next}`
}

export async function createExpense(form: FormData) {

  const expense_no = await getNextEX()

  const total = Number(form.get('total_amount'))
  const paid = Number(form.get('paid_amount'))

  if (paid > total) {
    throw new Error('Paid cannot exceed total')
  }

  const balance = total - paid

  let credit_status = 'NO_CREDIT'

  if (paid === 0) credit_status = 'FULL_CREDIT'
  if (paid > 0 && balance > 0) credit_status = 'PARTIAL_CREDIT'

  const status = balance === 0 ? 'CLOSED' : 'OPEN'

  // ----- Invoice Upload -----
  let bill_image_url = ''

  const invoice = form.get('invoice') as File

  if (invoice && invoice.size > 0) {

    const fileName = Date.now() + '-' + invoice.name

    await supabaseService
      .storage
      .from("expenses-bills")
      .upload(fileName, invoice)

    bill_image_url =
      supabaseService
        .storage
        .from("expenses-bills")
        .getPublicUrl(fileName).data.publicUrl
  }

  // ----- First Payment Proof -----
  let first_payment_proof = ''

  const proof = form.get('payment_proof') as File

  if (proof && proof.size > 0) {

    const fileName = Date.now() + '-' + proof.name

    await supabaseService
      .storage
      .from("expenses-bills")
      .upload(fileName, proof)

    first_payment_proof =
      supabaseService
        .storage
        .from("expenses-bills")
        .getPublicUrl(fileName).data.publicUrl
  }

  // ----- INSERT EXPENSE -----
  const { error: insertError } = await supabaseService
    .from("expenses")
    .insert({

      expense_no: expense_no,

      expense_date: form.get("expense_date"),
      site_id: form.get("site_id"),

      total_amount: total,
      paid_amount: paid,
      balance_amount: balance,

      credit_status: credit_status,
      status: status,

      bill_image_url: bill_image_url,
      first_payment_proof: first_payment_proof,

      category: form.get("category"),
      description: form.get("description")
    })

  if (insertError) {
    throw new Error(insertError.message)
  }

  return { success: true }
}
