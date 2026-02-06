import { addPayment } from '../../actions'
import { supabase } from '../../../../lib/supabaseClient'

export const dynamic = 'force-dynamic'

export default async function Page(props: any) {

  const params = await props.params
  const expenseNo = params.id

  // ---- Fetch expense for balance display ----
  const exp = await supabase
    .from('expenses')
    .select('balance_amount')
    .eq('expense_no', expenseNo)
    .single()

  if (!exp.data) {
    return <div className="p-4">Expense not found</div>
  }

  async function handle(form: FormData) {
    'use server'
    try {
      await addPayment(expenseNo, form)
      return { success: true }
    } catch (e: any) {
      return { error: e.message }
    }
  }

  return (
    <div className="p-4 max-w-md mx-auto">

      <h1 className="text-xl font-bold mb-2">
        Add Payment – {expenseNo}
      </h1>

      {/* Pending balance display */}
      <div className="mb-3 text-sm">
        Pending Balance:{' '}
        <span className="font-bold text-red-600">
          ₹{exp.data.balance_amount}
        </span>
      </div>

      <form action={handle} className="space-y-3">

        <input
          name="amount"
          type="number"
          placeholder="Payment amount"
          className="w-full border p-2 rounded"
          required
        />

        <input
          name="payment_mode"
          placeholder="Payment mode (Cash / UPI / Bank)"
          className="w-full border p-2 rounded"
          required
        />

        <input
          name="proof"
          type="file"
          required
        />

        <button
          className="w-full bg-blue-600 text-white p-2 rounded"
        >
          Save Payment
        </button>

      </form>

      {/* Messages */}
      {/* These appear ONLY after submit */}
      {props?.actionResult?.error && (
        <div className="mt-3 text-red-600">
          {props.actionResult.error}
        </div>
      )}

      {props?.actionResult?.success && (
        <div className="mt-3 text-green-700">
          Payment saved successfully
        </div>
      )}

    </div>
  )
}
