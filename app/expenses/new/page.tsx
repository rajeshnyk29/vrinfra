'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabase'
import { createExpense } from '../actions'

type Site = {
  id: string
  name: string
}

export default function NewExpense() {
  const router = useRouter()
  const [sites, setSites] = useState<Site[]>([])
  const [loadingSites, setLoadingSites] = useState(true)

  const [total, setTotal] = useState('')
  const [paid, setPaid] = useState('')
  const [paymentMode, setPaymentMode] = useState('Cash')

  const [invoiceFileName, setInvoiceFileName] = useState('')
  const [paymentFileName, setPaymentFileName] = useState('')

  const invoiceCamera = useRef<any>()
  const invoiceGallery = useRef<any>()
  const payCamera = useRef<any>()
  const payGallery = useRef<any>()

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<{ expense_no: string; total: number; paid: number; balance: number } | null>(null)

  useEffect(() => {
    loadSites()
  }, [])

  async function loadSites() {
    try {
      const { data } = await supabase.from('sites').select('*')
      setSites(data || [])
    } catch (e) {
      console.error('Failed to load sites', e)
    } finally {
      setLoadingSites(false)
    }
  }

  const totalNum = Number(total) || 0
  const paidNum = Number(paid) || 0
  const balance = totalNum - paidNum

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    setError(null)
    setSuccess(null)

    if (totalNum <= 0) {
      setError('Total amount must be greater than 0')
      return
    }

    if (paidNum < 0) {
      setError('Paid amount cannot be negative')
      return
    }

    if (paidNum > totalNum) {
      setError('Paid amount cannot exceed total amount')
      return
    }

    setSaving(true)
    const formData = new FormData(e.currentTarget)

    try {
      const result = await createExpense(formData)

      if (result.success && result.expense_no) {
        setSuccess({
          expense_no: result.expense_no,
          total: totalNum,
          paid: paidNum,
          balance: balance
        })
        e.currentTarget.reset()
        setTotal('')
        setPaid('')
        setPaymentMode('Cash')
        setInvoiceFileName('')
        setPaymentFileName('')
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to save expense')
    } finally {
      setSaving(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-100 p-3">
        <div className="max-w-md mx-auto bg-white rounded-xl shadow p-4 space-y-4">

          <div className="text-center success-animate">
            <div className="w-20 h-20 rounded-full bg-green-500 flex items-center justify-center mx-auto success-pulse">
              <span className="text-4xl text-white">✓</span>
            </div>
            <h1 className="text-xl font-bold text-green-700 mt-3">
              Expense Saved Successfully
            </h1>
            <div className="text-sm text-gray-600 mt-1">
              Expense No: <span className="font-semibold">{success.expense_no}</span>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-700">Total</span>
              <span className="font-semibold">₹{success.total}</span>
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-gray-700">Paid</span>
              <span className="font-semibold text-green-700">₹{success.paid}</span>
            </div>
            <div className="flex justify-between mt-2 pt-2 border-t border-yellow-200">
              <span className="text-gray-800 font-semibold">Pending Balance</span>
              <span className={`font-extrabold text-lg ${success.balance > 0 ? 'text-red-600' : 'text-green-700'}`}>
                ₹{success.balance}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            {success.balance > 0 && (
              <button
                className="w-full bg-green-600 text-white p-3 rounded font-semibold text-base"
                onClick={() => router.push(`/expenses/${success.expense_no}/add-payment`)}
              >
                + Add Payment
              </button>
            )}
            <button
              className="w-full border border-blue-700 text-blue-700 rounded p-3 text-sm font-semibold"
              onClick={() => router.push(`/expenses/${success.expense_no}/history`)}
            >
              View Payment History
            </button>
            <button
              className="w-full border border-gray-300 text-gray-700 rounded p-3 text-sm"
              onClick={() => router.push('/dashboard')}
            >
              Go to Dashboard
            </button>
          </div>

        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 p-3">
      <div className="max-w-md mx-auto bg-white rounded-xl shadow p-4 space-y-4">

        <h2 className="text-xl font-bold text-blue-900">
          New Expense
        </h2>

        {(totalNum > 0 || paidNum > 0) && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-700">Total</span>
              <span className="font-semibold">₹{totalNum}</span>
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-gray-700">Paid</span>
              <span className="font-semibold text-green-700">₹{paidNum}</span>
            </div>
            <div className="flex justify-between mt-2 pt-2 border-t border-yellow-200">
              <span className="text-gray-800 font-semibold">Balance</span>
              <span className={`font-extrabold text-lg ${balance > 0 ? 'text-red-600' : balance < 0 ? 'text-red-800' : 'text-green-700'}`}>
                ₹{balance}
              </span>
            </div>
            {balance < 0 && (
              <div className="text-xs text-red-600 mt-1">
                ⚠️ Paid amount exceeds total
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">

          <div>
            <label className="block text-sm font-semibold mb-1">Expense Date</label>
            <input
              name="expense_date"
              type="date"
              max={new Date().toISOString().split('T')[0]}
              className="w-full border p-2 rounded text-base"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">Site</label>
            {loadingSites ? (
              <div className="text-sm text-gray-500">Loading sites...</div>
            ) : (
              <select
                name="site_id"
                className="w-full border p-2 rounded text-base"
                required
              >
                <option value="">Choose Site</option>
                {sites.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            )}
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="font-bold mb-2 text-blue-900">Invoice</div>
            <div className="mb-2">
              <label className="block text-sm font-semibold mb-1">Total Amount</label>
              <input
                name="total_amount"
                type="number"
                inputMode="decimal"
                placeholder="Enter total amount"
                className="w-full border p-2 rounded text-base"
                value={total}
                onChange={e => setTotal(e.target.value)}
                required
              />
            </div>
            <div className="text-sm font-semibold mb-1">Invoice Proof</div>
            <input
              ref={invoiceCamera}
              name="invoice"
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e: any) => setInvoiceFileName(e.target.files?.[0]?.name || '')}
            />
            <input
              ref={invoiceGallery}
              name="invoice"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e: any) => setInvoiceFileName(e.target.files?.[0]?.name || '')}
            />
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => invoiceCamera.current?.click()}
                className="bg-blue-700 text-white p-2 rounded font-semibold text-sm"
              >
                📷 Take Photo
              </button>
              <button
                type="button"
                onClick={() => invoiceGallery.current?.click()}
                className="bg-gray-700 text-white p-2 rounded font-semibold text-sm"
              >
                🖼 From Gallery
              </button>
            </div>
            {invoiceFileName && (
              <div className="text-xs text-gray-700 mt-1">📎 {invoiceFileName}</div>
            )}
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="font-bold mb-2 text-green-900">Payment Done Now</div>
            <div className="mb-2">
              <label className="block text-sm font-semibold mb-1">Paid Amount</label>
              <input
                name="paid_amount"
                type="number"
                inputMode="decimal"
                placeholder="Enter paid amount"
                className="w-full border p-2 rounded text-base"
                value={paid}
                onChange={e => setPaid(e.target.value)}
                required
              />
            </div>
            <div className="mb-2">
              <label className="block text-sm font-semibold mb-1">Payment Method</label>
              <select
                name="payment_method"
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
            <div className="text-sm font-semibold mb-1">Payment Proof</div>
            <input
              ref={payCamera}
              name="payment_proof"
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e: any) => setPaymentFileName(e.target.files?.[0]?.name || '')}
            />
            <input
              ref={payGallery}
              name="payment_proof"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e: any) => setPaymentFileName(e.target.files?.[0]?.name || '')}
            />
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => payCamera.current?.click()}
                className="bg-green-700 text-white p-2 rounded font-semibold text-sm"
              >
                📷 Take Photo
              </button>
              <button
                type="button"
                onClick={() => payGallery.current?.click()}
                className="bg-gray-700 text-white p-2 rounded font-semibold text-sm"
              >
                🖼 From Gallery
              </button>
            </div>
            {paymentFileName && (
              <div className="text-xs text-gray-700 mt-1">📎 {paymentFileName}</div>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">Category <span className="text-gray-500 font-normal">(optional)</span></label>
            <input
              name="category"
              placeholder="e.g., Material, Labor, Equipment"
              className="w-full border p-2 rounded text-base"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">Description <span className="text-gray-500 font-normal">(optional)</span></label>
            <textarea
              name="description"
              placeholder="Additional notes..."
              rows={3}
              className="w-full border p-2 rounded text-base"
            />
          </div>

          {error && (
            <div className="text-sm text-red-600">{error}</div>
          )}

          <button
            type="submit"
            className="w-full bg-blue-700 text-white p-3 rounded font-semibold text-base disabled:opacity-60"
            disabled={saving}
          >
            {saving ? 'Saving Expense...' : 'Save Expense'}
          </button>

        </form>

      </div>
    </div>
  )
}