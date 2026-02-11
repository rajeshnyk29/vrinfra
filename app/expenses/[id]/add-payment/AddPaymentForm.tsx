'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { addPayment } from '../../actions'

type ExpenseInfo = {
  id: string
  expense_no: string
  total_amount: number
  paid_amount: number
  balance_amount: number
}

type User = { id: string; name: string }

type Props = {
  expense: ExpenseInfo
  users: User[]
  expenseNo: string
}

export function AddPaymentForm({ expense, users, expenseNo }: Props) {
  const router = useRouter()
  const [expenseState, setExpenseState] = useState(expense)

  const [amount, setAmount] = useState('')
  const [paymentMode, setPaymentMode] = useState('Cash')
  const [addedByUserId, setAddedByUserId] = useState(users[0]?.id || '')
  const [proofFileName, setProofFileName] = useState('')

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const amt = Number(amount)

    setError(null)
    setSuccess(null)

    if (!amt || amt <= 0) {
      setError('Enter a valid amount greater than 0')
      return
    }

    if (amt > expenseState.balance_amount) {
      setError('Amount exceeds invoice balance')
      return
    }

    setSaving(true)
    const formEl = e.currentTarget
    const formData = new FormData(formEl)
    formData.set('added_by_name', users.find(u => u.id === formData.get('added_by_user_id'))?.name || '')

    try {
      await addPayment(expenseNo, formData)

      const newPaid = expenseState.paid_amount + amt
      const newBalance = expenseState.total_amount - newPaid

      setExpenseState({
        ...expenseState,
        paid_amount: newPaid,
        balance_amount: newBalance
      })

      setSuccess('Payment saved successfully')
      setAmount('')
      setPaymentMode('Cash')
      setProofFileName('')
      if (formEl) formEl.reset()
    } catch (err: any) {
      setError(err?.message || 'Failed to save payment')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 p-3">
      <div className="max-w-md mx-auto bg-white rounded-xl shadow p-4 space-y-4">

        <div>
          <h1 className="text-xl font-bold text-blue-900">Add Payment</h1>
          <div className="text-xs text-gray-600 mt-1">
            Expense No: <span className="font-semibold">{expenseState.expense_no}</span>
          </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-700">Total</span>
            <span className="font-semibold">₹{expenseState.total_amount}</span>
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-gray-700">Paid</span>
            <span className="font-semibold text-green-700">₹{expenseState.paid_amount}</span>
          </div>
          <div className="flex justify-between mt-2 pt-2 border-t border-yellow-200">
            <span className="text-gray-800 font-semibold">Pending Balance</span>
            <span className="font-extrabold text-red-600 text-lg">₹{expenseState.balance_amount}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-1">Added by</label>
            <select
              name="added_by_user_id"
              className="w-full border p-2 rounded text-base"
              value={addedByUserId}
              onChange={e => setAddedByUserId(e.target.value)}
              required
            >
              <option value="">Choose user</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
            {users.length === 0 && (
              <p className="text-xs text-amber-600 mt-1">No users yet. Add users in Master → Users and have them sign up.</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">Payment Amount</label>
            <input
              name="amount"
              type="number"
              inputMode="decimal"
              placeholder="Enter amount"
              className="w-full border p-2 rounded text-base"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">Payment Method</label>
            <select
              name="payment_mode"
              className="w-full border p-2 rounded text-base"
              value={paymentMode}
              onChange={e => setPaymentMode(e.target.value)}
              required
            >
              <option value="Cash">Cash</option>
              <option value="UPI">UPI</option>
              <option value="Bank">Bank</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">Payment Proof</label>
            <input
              name="proof"
              type="file"
              accept="image/*"
              className="w-full text-sm"
              required
              onChange={(e: any) => setProofFileName(e.target.files?.[0]?.name || '')}
            />
            {proofFileName && (
              <div className="text-xs text-gray-600 mt-1">📎 {proofFileName}</div>
            )}
          </div>

          <button
            type="submit"
            className="w-full bg-blue-700 text-white p-3 rounded font-semibold text-base disabled:opacity-60"
            disabled={saving}
          >
            {saving ? 'Saving…' : 'Save Payment'}
          </button>
        </form>

        {error && (
          <div className="mt-1 text-sm text-red-600">{error}</div>
        )}

        {success && (
          <div className="mt-1">
            <div className="success-animate flex-col items-center py-4 flex">
              <div className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center success-pulse">
                <span className="text-3xl text-white">✓</span>
              </div>
              <p className="mt-2 font-semibold text-green-700">{success}</p>
            </div>
            <div className="mt-2 flex gap-2">
              <button
                className="flex-1 border border-blue-700 text-blue-700 rounded p-2 text-sm font-semibold"
                onClick={() => router.push(`/expenses/${expenseNo}/history`)}
              >
                View History
              </button>
              <button
                className="flex-1 border border-gray-300 text-gray-700 rounded p-2 text-sm"
                onClick={() => router.push('/dashboard')}
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}