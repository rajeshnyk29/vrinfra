'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { createExpense } from '../actions'

export default function NewExpense() {

  const [sites, setSites] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [paid, setPaid] = useState(0)

  const [invoiceFileName, setInvoiceFileName] = useState('')
  const [paymentFileName, setPaymentFileName] = useState('')

  const invoiceCamera = useRef<any>()
  const invoiceGallery = useRef<any>()
  const payCamera = useRef<any>()
  const payGallery = useRef<any>()

  useEffect(() => {
    loadSites()
  }, [])

  async function loadSites() {
    const { data } = await supabase.from('sites').select('*')
    setSites(data || [])
  }

  const balance = total - paid

  let credit = 'NO CREDIT'
  if (paid === 0 && balance > 0) credit = 'FULL CREDIT'
  if (paid > 0 && balance > 0) credit = 'PARTIAL CREDIT'

  const loopStatus = balance === 0 ? 'CLOSED' : 'OPEN'

  async function handleSubmit(e: any) {
    e.preventDefault()
    const form = new FormData(e.target)

    try {
      await createExpense(form)
      alert('Expense Saved')
      window.location.href = '/dashboard'
    } catch (err: any) {
      alert(err.message)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 p-3">
      <div className="max-w-xl mx-auto bg-white rounded-xl shadow p-4">

        <h2 className="text-xl font-bold text-blue-900 mb-3">
          New Expense
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* DATE */}
          <div>
            <label className="font-semibold">Expense Date</label>
            <input
              name="expense_date"
              type="date"
              max={new Date().toISOString().split('T')[0]}
              className="w-full border p-2 rounded mt-1"
              required
            />
          </div>

          {/* SITE */}
          <div>
            <label className="font-semibold">Site</label>
            <select
              name="site_id"
              className="w-full border p-2 rounded mt-1"
              required
            >
              <option value="">Choose Site</option>
              {sites.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* INVOICE */}
          <div className="bg-blue-50 p-3 rounded">
            <div className="font-bold mb-2">Invoice</div>

            <input
              name="total_amount"
              type="number"
              placeholder="Total Amount"
              className="w-full border p-2 rounded mb-2"
              onChange={e => setTotal(Number(e.target.value))}
              required
            />

            <div className="text-sm font-semibold mb-1">Invoice Proof</div>

            <input
              ref={invoiceCamera}
              name="invoice"
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e:any) => setInvoiceFileName(e.target.files?.[0]?.name || '')}
            />

            <input
              ref={invoiceGallery}
              name="invoice"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e:any) => setInvoiceFileName(e.target.files?.[0]?.name || '')}
            />

            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => invoiceCamera.current.click()} className="bg-blue-700 text-white p-2 rounded font-semibold">
                📷 Take Photo
              </button>
              <button type="button" onClick={() => invoiceGallery.current.click()} className="bg-gray-700 text-white p-2 rounded font-semibold">
                🖼 From Gallery
              </button>
            </div>

            {invoiceFileName && (
              <div className="text-xs text-gray-700 mt-1">
                📎 {invoiceFileName}
              </div>
            )}
          </div>

          {/* PAYMENT */}
          <div className="bg-green-50 p-3 rounded">
            <div className="font-bold mb-2">Payment Done Now</div>

            <input
              name="paid_amount"
              type="number"
              placeholder="Paid Amount"
              className="w-full border p-2 rounded mb-2"
              onChange={e => setPaid(Number(e.target.value))}
              required
            />

            <select name="payment_method" className="w-full border p-2 rounded mb-2">
              <option value="cash">Cash</option>
              <option value="upi">UPI</option>
            </select>

            <div className="text-sm font-semibold mb-1">Payment Proof</div>

            <input
              ref={payCamera}
              name="payment_proof"
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e:any) => setPaymentFileName(e.target.files?.[0]?.name || '')}
            />

            <input
              ref={payGallery}
              name="payment_proof"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e:any) => setPaymentFileName(e.target.files?.[0]?.name || '')}
            />

            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => payCamera.current.click()} className="bg-green-700 text-white p-2 rounded font-semibold">
                📷 Take Photo
              </button>
              <button type="button" onClick={() => payGallery.current.click()} className="bg-gray-700 text-white p-2 rounded font-semibold">
                🖼 From Gallery
              </button>
            </div>

            {paymentFileName && (
              <div className="text-xs text-gray-700 mt-1">
                📎 {paymentFileName}
              </div>
            )}
          </div>

          {/* SYSTEM */}
          <div className="bg-gray-100 p-3 rounded">
            <div>Balance: <b>{balance}</b></div>
            <div>Credit Status: <b>{credit}</b></div>
            <div>
              Transactional Loop:
              <b className={`ml-1 ${loopStatus === 'OPEN' ? 'text-orange-700' : 'text-green-700'}`}>
                {loopStatus}
              </b>
            </div>
          </div>

          <input name="category" placeholder="Category" className="w-full border p-2 rounded" />
          <textarea name="description" placeholder="Description" className="w-full border p-2 rounded" />

          <button className="w-full bg-blue-800 text-white p-3 rounded font-bold">
            SAVE EXPENSE
          </button>

        </form>
      </div>
    </div>
  )
}
