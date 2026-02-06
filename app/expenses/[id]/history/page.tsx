import { supabase } from '../../../../lib/supabaseClient'

export const dynamic = 'force-dynamic'

export default async function Page(props: any) {

  // ---- CORRECT WAY ----
  const params = await props.params
  const expenseNo = params.id

  // 1) Find expense by expense_no
  const expRes = await supabase
    .from('expenses')
    .select('id, expense_no')
    .eq('expense_no', expenseNo)
    .maybeSingle()

  if (!expRes.data) {
    return (
      <div className="p-4">
        <h1 className="text-xl font-bold mb-3">
          Payment History – {expenseNo}
        </h1>

        <div className="text-red-600">
          Expense not found
        </div>
      </div>
    )
  }

  const expenseId = expRes.data.id

  // 2) Get payments
  const { data: payments, error } = await supabase
    .from('expense_payments')
    .select('*')
    .eq('expense_id', expenseId)
    .order('paid_date', { ascending: false })

  return (
    <div className="p-4 max-w-md mx-auto">

      <h1 className="text-xl font-bold mb-4">
        Payment History – {expenseNo}
      </h1>

      {error && (
        <div className="text-red-600 mb-2">
          {error.message}
        </div>
      )}

      {payments?.length === 0 && (
        <p className="text-gray-500">
          No payments added yet
        </p>
      )}

      <div className="space-y-3">

        {payments?.map((p: any) => (

          <div key={p.id} className="border rounded p-3">

            <div className="flex justify-between">
              <span className="text-sm">{p.paid_date}</span>
              <span className="font-bold">₹{p.amount}</span>
            </div>

            {p.payment_mode && (
              <p className="text-sm mt-1">
                Mode: {p.payment_mode}
              </p>
            )}

            {p.proof_url && (
              <a
                href={p.proof_url}
                target="_blank"
                className="text-blue-700 text-sm mt-2 inline-block"
              >
                👁 View Proof
              </a>
            )}

          </div>

        ))}

      </div>

    </div>
  )
}
