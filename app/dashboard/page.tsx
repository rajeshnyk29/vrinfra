import { supabase } from '../../lib/supabaseClient'

export const dynamic = 'force-dynamic'

export default async function Dashboard() {

  const { data: expenses, error } = await supabase
    .from('expenses')
    .select('*')
    .order('expense_no', { ascending: false })

  return (
    <div className="p-4">

      <h1 className="text-xl font-bold mb-3">
        Dashboard
      </h1>

      {error && (
        <div className="text-red-600 mb-3">
          {error.message}
        </div>
      )}

      {expenses?.length === 0 && (
        <div className="text-gray-500">
          No expenses found
        </div>
      )}

      <div className="space-y-3">

        {expenses?.map((exp: any) => (

          <div
            key={exp.id}
            className="border rounded p-3 shadow-sm"
          >

            {/* HEADER */}
            <div className="flex justify-between">

              <span className="font-bold">
                {exp.expense_no}
              </span>

              <span
                className={
                  exp.status === 'OPEN'
                    ? 'bg-orange-200 text-xs px-2 py-1 rounded'
                    : 'bg-green-200 text-xs px-2 py-1 rounded'
                }
              >
                {exp.status}
              </span>

            </div>

            {/* CATEGORY */}
            <p className="text-sm mt-1">
              {exp.category}
            </p>

            {/* AMOUNTS */}
            <div className="grid grid-cols-3 text-sm mt-2">

              <div>
                Total: ₹{exp.total_amount}
              </div>

              <div>
                Paid: ₹{exp.paid_amount}
              </div>

              <div>
                Bal: ₹{exp.balance_amount}
              </div>

            </div>

            {/* ACTIONS */}
            <div className="mt-3 flex gap-2 text-xs">

              {exp.bill_image_url && (
                <a
                  href={exp.bill_image_url}
                  target="_blank"
                  className="bg-gray-200 px-2 py-1 rounded"
                >
                  👁 Invoice
                </a>
              )}

              {exp.first_payment_proof && (
                <a
                  href={exp.first_payment_proof}
                  target="_blank"
                  className="bg-gray-200 px-2 py-1 rounded"
                >
                  💰 Payment
                </a>
              )}

              {exp.status === 'OPEN' && (
                <a
                  href={`/expenses/${exp.expense_no}/add-payment`}
                  className="bg-green-600 text-white px-2 py-1 rounded"
                >
                  + Payment
                </a>
              )}

              <a
                href={`/expenses/${exp.expense_no}/history`}
                className="bg-blue-100 px-2 py-1 rounded"
              >
                History
              </a>

            </div>

          </div>

        ))}

      </div>

    </div>
  )
}
