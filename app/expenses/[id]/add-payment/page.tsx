import { supabaseService } from '../../../../lib/supabase'
import { redirect } from 'next/navigation'
import { AddPaymentForm } from './AddPaymentForm'

export const dynamic = 'force-dynamic'

const MOCK_USERS = [
  { id: 'mock-1', name: 'Rajesh' },
  { id: 'mock-2', name: 'Admin' },
  { id: 'mock-3', name: 'Vineet' },
]

export default async function AddPaymentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: expenseNo } = await params
  if (!expenseNo) redirect('/dashboard')

  const expRes = await supabaseService
    .from('expenses')
    .select('id, expense_no, total_amount, paid_amount, balance_amount')
    .eq('expense_no', expenseNo)
    .single()

  if (expRes.error || !expRes.data) {
    return (
      <div className="min-h-screen bg-gray-100 p-3">
        <div className="max-w-md mx-auto bg-white rounded-xl shadow p-4">
          <h1 className="text-xl font-bold mb-3">Add Payment – {expenseNo}</h1>
          <div className="text-red-600 text-sm">{expRes.error?.message || 'Expense not found'}</div>
        </div>
      </div>
    )
  }

  return (
    <AddPaymentForm
      expense={expRes.data}
      users={MOCK_USERS}
      expenseNo={expenseNo}
    />
  )
}