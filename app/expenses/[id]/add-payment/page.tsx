'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '../../../../lib/supabaseClient'
import { addPayment } from '../../actions'

export const dynamic = 'force-dynamic'

type ExpenseInfo = {
  id: string
  expense_no: string
  total_amount: number
  paid_amount: number
  balance_amount: number
}

type User = { id: string; name: string }

export default function AddPaymentPage() {
  const params = useParams() as { id?: string }
  const router = useRouter()
  const expenseNo = params?.id || ''

  const [expense, setExpense] = useState<ExpenseInfo | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [amount, setAmount] = useState('')
  const [paymentMode, setPaymentMode] = useState('Cash')
  const [addedByUserId, setAddedByUserId] = useState('')
  const [proofFileName, setProofFileName] = useState('')

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    if (!expenseNo) return

    async function fetchData() {
      setLoading(true)
      setLoadError(null)
      try {
        const [expRes, usersRes] = await Promise.all([
          supabase.from('expenses').select('id, expense_no, total_amount, paid_amount, balance_amount').eq('expense_no', expenseNo).single(),
          supabase.from('users').select('id, name').order('name')
        ])

        if (expRes.error || !expRes.data) {
          setLoadError(expRes.error?.message || 'Expense not found')
          setExpense(null)
        } else {
          setExpense(expRes.data as ExpenseInfo)
        }
        setUsers(usersRes.data || [])
        if (usersRes.data?.length && !addedByUserId) {
          setAddedByUserId(usersRes.data[0].id)
        }
      } catch (e: any) {
        setLoadError(e?.message || 'Failed to load')
        setExpense(null)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [expenseNo])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!expense) return

    const amt = Number(amount)

    setError(null)
    setSuccess(null)

    if (!amt || amt <= 0) {
      setError('Enter a valid amount greater than 0')
      return
    }

    if (amt > expense.balance_amount) {
      setError('Amount exceeds invoice balance')
      return
    }

    setSaving(true)
    const formEl = e.currentTarget
    const formData = new FormData(formEl)

    try {
      await addPayment(expenseNo, formData)

      const newPaid = expense.paid_amount + amt
      const newBalance = expense.total_amount - newPaid

      setExpense({
        ...expense,
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 p-3">
        <div className="max-w-md mx-auto bg-white rounded-xl shadow p-4">
          <div className="text-sm text-gray-600">Loading expense...</div>
        </div>
      </div>
    )
  }

  if (loadError || !expense) {
    return (
      <div className="min-h-screen bg-gray-100 p-3">
        <div className="max-w-md mx-auto bg-white rounded-xl shadow p-4">
          <h1 className="text-xl font-bold mb-3">Add Payment – {expenseNo}</h1>
          <div className="text-red-600 text-sm">{loadError || 'Expense not found'}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 p-3">
      <div className="max-w-md mx-auto bg-white rounded-xl shadow p-4 space-y-4">

        <div>
          <h1 className="text-xl font-bold text-blue-900">Add Payment</h1>
          <div className="text-xs text-gray-600 mt-1">
            Expense No: <span className="font-semibold">{expense.expense_no}</span>
          </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-700">Total</span>
            <span className="font-semibold">₹{expense.total_amount}</span>
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-gray-700">Paid</span>
            <span className="font-semibold text-green-700">₹{expense.paid_amount}</span>
          </div>
          <div className="flex justify-between mt-2 pt-2 border-t border-yellow-200">
            <span className="text-gray-800 font-semibold">Pending Balance</span>
            <span className="font-extrabold text-red-600 text-lg">₹{expense.balance_amount}</span>
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
            <div className="success-animate flex flex-col items-center py-4">
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