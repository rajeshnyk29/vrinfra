'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

type Payment = {
  id: number
  payment_date: string
  amount: number
  remarks: string
  payment_proof: string
}

export default function PaymentHistory({ params }: any) {

  const expenseId = params.id

  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadPayments()
  }, [])

  async function loadPayments() {

    const { data } = await supabase
      .from('expense_payments')
      .select('*')
      .eq('expense_id', expenseId)
      .order('payment_date', { ascending: false })

    setPayments(data || [])
    setLoading(false)
  }

  if (loading) {
    return <div className="p-4">Loading...</div>
  }

  return (
    <div className="p-4 max-w-md mx-auto">

      <h1 className="text-xl font-bold mb-4">
        Payment History – {expenseId}
      </h1>

      {payments.length === 0 && (
        <p className="text-gray-500">
          No payments added yet
        </p>
      )}

      <div className="space-y-3">

        {payments.map(p => (

          <div
            key={p.id}
            className="border rounded p-3 shadow-sm"
          >

            <div className="flex justify-between">
              <span className="text-sm text-gray-600">
                {p.payment_date}
              </span>

              <span className="font-bold">
                ₹{p.amount}
              </span>
            </div>

            {p.remarks && (
              <p className="text-sm mt-1">
                {p.remarks}
              </p>
            )}

            {p.payment_proof && (
              <a
                href={p.payment_proof}
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
