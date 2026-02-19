'use client'

import { useRef, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import imageCompression from 'browser-image-compression'
import toast from 'react-hot-toast'
import { addPayment } from '../../actions'

type ExpenseInfo = {
  id: string
  expense_no: string
  total_amount: number
  paid_amount: number
  balance_amount: number
}

type User = { id: string; name: string }

type Props = { expense: ExpenseInfo; users: User[]; expenseNo: string }

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}

function roundMoney(n: number): number {
  if (!Number.isFinite(n)) return 0
  return Math.round(n * 100) / 100
}

// Same limits as New Expense
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const MAX_COMPRESSED_SIZE = 1 * 1024 * 1024 // ~1MB
const MAX_WIDTH_OR_HEIGHT = 1920

export function AddPaymentForm({ expense, users, expenseNo }: Props) {
  const router = useRouter()
  const [expenseState, setExpenseState] = useState(expense)
  const [amount, setAmount] = useState('')
  const [paymentMode, setPaymentMode] = useState('Cash')
  const [addedByUserId, setAddedByUserId] = useState(users[0]?.id || '')
  const [proofFileName, setProofFileName] = useState('')
  const [proofFileSize, setProofFileSize] = useState<number>(0)
  const [proofOriginalSize, setProofOriginalSize] = useState<number>(0)
  const [compressingProof, setCompressingProof] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const proofInputRef = useRef<HTMLInputElement>(null)
  const compressedProofFile = useRef<File | null>(null)

  useEffect(() => {
    if (success) window.scrollTo(0, 0)
  }, [success])

  async function handleProofFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // Hard limit (same as New Expense)
    if (file.size > MAX_FILE_SIZE) {
      toast.error(
        `Payment proof too large (${formatFileSize(file.size)}). Max ${formatFileSize(MAX_FILE_SIZE)}.`
      )
      e.target.value = ''
      setProofFileName('')
      setProofFileSize(0)
      setProofOriginalSize(0)
      compressedProofFile.current = null
      return
    }

    setProofFileName(file.name)
    setProofOriginalSize(file.size)
    setCompressingProof(true)

    try {
      const options = {
        maxSizeMB: MAX_COMPRESSED_SIZE / (1024 * 1024),
        maxWidthOrHeight: MAX_WIDTH_OR_HEIGHT,
        useWebWorker: true,
        fileType: 'image/jpeg',
        initialQuality: 0.8,
      }

      const blob = await imageCompression(file, options)
      const compressedFile = new File(
        [blob],
        file.name.replace(/\.[^/.]+$/, '') + '.jpg',
        { type: 'image/jpeg', lastModified: Date.now() }
      )

      setProofFileSize(compressedFile.size)
      compressedProofFile.current = compressedFile

      // Reflect compressed file back into the input (like New Expense)
      if (proofInputRef.current) {
        const dt = new DataTransfer()
        dt.items.add(compressedFile)
        proofInputRef.current.files = dt.files
      }
    } catch (err: any) {
      console.error('Compression error (payment proof):', err)
      toast.error('Failed to compress image. Please try again.')
      e.target.value = ''
      setProofFileName('')
      setProofFileSize(0)
      setProofOriginalSize(0)
      compressedProofFile.current = null
    } finally {
      setCompressingProof(false)
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    const raw = Number(amount)
    const amt = roundMoney(raw)

    if (!amt || amt <= 0) {
      setError('Enter a valid amount greater than 0')
      return
    }

    const currentBalance = roundMoney(expenseState.balance_amount)
    if (amt > currentBalance) {
      setError('Amount exceeds invoice balance')
      return
    }

    setSaving(true)
    const formEl = e.currentTarget
    const formData = new FormData(formEl)
    formData.set(
      'added_by_name',
      users.find(u => u.id === formData.get('added_by_user_id'))?.name || ''
    )

    if (compressedProofFile.current) {
      formData.set('proof', compressedProofFile.current)
    }

    try {
      await addPayment(expenseNo, formData)

      const newPaid = roundMoney(expenseState.paid_amount + amt)
      const newBalance = roundMoney(expenseState.total_amount - newPaid)

      setExpenseState({
        ...expenseState,
        paid_amount: newPaid,
        balance_amount: newBalance,
      })

      setSuccess('Payment saved successfully')
      setAmount('')
      setPaymentMode('Cash')
      setProofFileName('')
      setProofFileSize(0)
      setProofOriginalSize(0)
      compressedProofFile.current = null
      formEl.reset()
    } catch (err: any) {
      setError(err?.message || 'Failed to save payment')
    } finally {
      setSaving(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen min-h-[100dvh] bg-gradient-to-b from-slate-50 to-slate-100 flex flex-col justify-center p-4 pt-8 pb-8">
        <div className="max-w-md mx-auto w-full flex-shrink-0">
          <div className="bg-white rounded-xl shadow-lg shadow-slate-200/50 p-4 sm:p-5 space-y-4">
            <div className="text-center success-animate">
              <div className="w-14 h-14 rounded-full bg-emerald-500 flex items-center justify-center mx-auto success-pulse shadow-md shadow-emerald-500/30">
                <span className="text-2xl text-white">✓</span>
              </div>
              <h1 className="text-lg font-bold text-emerald-800 mt-3">
                Payment Saved Successfully
              </h1>
              <p className="text-sm text-slate-600 mt-0.5">{success}</p>
            </div>
            <div className="bg-amber-50 border border-amber-200/80 rounded-lg p-3 text-xs">
              <div className="flex justify-between py-1">
                <span className="text-slate-700">Total</span>
                <span className="font-semibold text-slate-900">
                  ₹{expenseState.total_amount}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-700">Paid</span>
                <span className="font-semibold text-emerald-700">
                  ₹{expenseState.paid_amount}
                </span>
              </div>
              <div className="flex justify-between mt-1.5 pt-2 border-t border-amber-200">
                <span className="text-slate-800 font-semibold">
                  Pending Balance
                </span>
                <span
                  className={`font-bold text-base ${
                    expenseState.balance_amount > 0
                      ? 'text-red-600'
                      : 'text-emerald-700'
                  }`}
                >
                  ₹{expenseState.balance_amount}
                </span>
              </div>
            </div>
            <div className="space-y-2 pt-1">
              <button
                className="w-full border-2 border-blue-600 text-blue-700 hover:bg-blue-50 py-2 rounded-lg text-xs font-semibold transition-colors duration-200"
                onClick={() => router.push(`/expenses/${expenseNo}/history`)}
              >
                View Payment History
              </button>
              <button
                className="w-full border border-slate-300 text-slate-700 hover:bg-slate-50 py-2 rounded-lg text-xs font-medium transition-colors duration-200"
                onClick={() => router.push('/dashboard')}
              >
                Back to Dashboard
              </button>
            </div>
          </div>
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
            Expense No:{' '}
            <span className="font-semibold">{expenseState.expense_no}</span>
          </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-700">Total</span>
            <span className="font-semibold">
              ₹{expenseState.total_amount}
            </span>
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-gray-700">Paid</span>
            <span className="font-semibold text-green-700">
              ₹{expenseState.paid_amount}
            </span>
          </div>
          <div className="flex justify-between mt-2 pt-2 border-t border-yellow-200">
            <span className="text-gray-800 font-semibold">
              Pending Balance
            </span>
            <span className="font-extrabold text-red-600 text-lg">
              ₹{expenseState.balance_amount}
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-1">
              Added by
            </label>
            <select
              name="added_by_user_id"
              className="w-full border p-2 rounded text-base"
              value={addedByUserId}
              onChange={e => setAddedByUserId(e.target.value)}
              required
            >
              <option value="">Choose user</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
            {users.length === 0 && (
              <p className="text-xs text-amber-600 mt-1">
                No users yet. Add users in Master → Users and have them sign
                up.
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              Payment Amount
            </label>
            <input
              name="amount"
              type="number"
              inputMode="decimal"
              step="0.01"
              placeholder="Enter amount"
              className="w-full border p-2 rounded text-base"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              Payment Method
            </label>
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
            <label className="block text-sm font-semibold mb-1">
              Payment Proof
            </label>
            <input
              ref={proofInputRef}
              name="proof"
              type="file"
              accept="image/*"
              className="w-full text-sm"
              required
              onChange={handleProofFileChange}
            />
            {compressingProof && (
              <div className="text-xs text-blue-600 mt-1">Compressing...</div>
            )}
            {proofFileName && !compressingProof && (
              <div className="text-xs text-gray-600 mt-1">
                📎 {proofFileName}
                {proofFileSize > 0 && (
                  <span className="text-gray-500">
                    {' '}
                    (
                    {proofOriginalSize > 0 && proofOriginalSize !== proofFileSize
                      ? `${formatFileSize(proofOriginalSize)} → ${formatFileSize(proofFileSize)}`
                      : formatFileSize(proofFileSize)}
                    )
                  </span>
                )}
              </div>
            )}
            <p className="text-xs text-gray-500 mt-1">
              Max {formatFileSize(MAX_FILE_SIZE)} (compressed automatically)
            </p>
          </div>

          <button
            type="submit"
            className="w-full bg-blue-700 text-white p-3 rounded font-semibold text-base disabled:opacity-60"
            disabled={saving || compressingProof}
          >
            {saving ? 'Saving…' : 'Save Payment'}
          </button>
        </form>

        {error && <div className="mt-1 text-sm text-red-600">{error}</div>}
      </div>
    </div>
  )
}