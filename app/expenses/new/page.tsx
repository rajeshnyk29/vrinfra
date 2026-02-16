'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabaseClient'
import { createExpense } from '../actions'
import { getUsers } from '../../master/users/actions'

type Site = { id: string; name: string }
type Category = { id: string; name: string }
type Vendor = { id: string; name: string }
type User = { id: string; name: string }

const inputClass = "w-full border border-gray-300 rounded-md px-2.5 py-1.5 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-shadow duration-200"
const labelClass = "block text-xs font-semibold text-gray-700 mb-1"

function roundMoney(n: number | string): number {
  const x = Number(n)
  if (Number.isNaN(x)) return 0
  return Math.round(x * 100) / 100
}

export default function NewExpense() {
  const router = useRouter()
  const [sites, setSites] = useState<Site[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loadingMaster, setLoadingMaster] = useState(true)
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [total, setTotal] = useState('')
  const [paid, setPaid] = useState('')
  const [paymentMode, setPaymentMode] = useState('Cash')
  const [invoiceFileName, setInvoiceFileName] = useState('')
  const [paymentFileName, setPaymentFileName] = useState('')
  const invoiceCamera = useRef<any>(null)
  const invoiceGallery = useRef<any>(null)
  const payCamera = useRef<any>(null)
  const payGallery = useRef<any>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<{ expense_no: string; total: number; paid: number; balance: number } | null>(null)

  useEffect(() => { checkAuth() }, [])

  useEffect(() => {
    if (success) window.scrollTo(0, 0)
  }, [success])

  async function checkAuth() {
    try {
      const { data: { session }, error: authError } = await supabase.auth.getSession()
      if (authError || !session) {
        router.push('/signin?redirect=/expenses/new')
        return
      }
      await loadMasterData()
    } catch (e) {
      console.error('Auth check failed:', e)
      setError('Authentication failed. Please sign in again.')
      router.push('/signin?redirect=/expenses/new')
    } finally {
      setCheckingAuth(false)
    }
  }

  async function loadMasterData() {
    try {
      const [sitesRes, categoriesRes, vendorsRes, usersList] = await Promise.all([
        supabase.from('sites').select('id, name').order('name'),
        supabase.from('categories').select('id, name').order('name'),
        supabase.from('vendors').select('id, name').order('name'),
        getUsers()
      ])
      if (sitesRes.error) throw new Error(`Failed to load sites: ${sitesRes.error.message}`)
      if (categoriesRes.error) throw new Error(`Failed to load categories: ${categoriesRes.error.message}`)
      if (vendorsRes.error) throw new Error(`Failed to load vendors: ${vendorsRes.error.message}`)
      setSites(sitesRes.data || [])
      setCategories(categoriesRes.data || [])
      setVendors(vendorsRes.data || [])
      setUsers(Array.isArray(usersList) ? usersList : [])
    } catch (e: any) {
      console.error('Failed to load master data', e)
      setError(e?.message || 'Failed to load data. Please refresh the page.')
    } finally {
      setLoadingMaster(false)
    }
  }

  const totalNum = roundMoney(total)
  const paidNum = roundMoney(paid)
  const balance = roundMoney(totalNum - paidNum)

  function handleTotalChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value
    if (v === '' || v === '-') { setTotal(v); return }
    const n = roundMoney(v)
    setTotal(Number.isNaN(Number(v)) ? v : String(n))
  }

  function handlePaidChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value
    if (v === '' || v === '-') { setPaid(v); return }
    const n = roundMoney(v)
    setPaid(Number.isNaN(Number(v)) ? v : String(n))
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    if (totalNum <= 0) { setError('Total amount must be greater than 0'); return }
    if (paidNum < 0) { setError('Paid amount cannot be negative'); return }
    if (paidNum > totalNum) { setError('Paid amount cannot exceed total amount'); return }
    if (!invoiceFileName) { setError('Invoice proof is required. Please upload a photo or select from gallery.'); return }
    if (paidNum > 0 && !paymentFileName) { setError('Payment proof is required when paid amount is greater than 0.'); return }
    setSaving(true)
    const formData = new FormData(e.currentTarget)
    formData.set('total_amount', String(totalNum))
    formData.set('paid_amount', String(paidNum))
    formData.set('added_by_name', users.find(u => u.id === formData.get('added_by_user_id'))?.name || '')
    try {
      const result = await createExpense(formData)
      if (result.success && result.expense_no) {
        setSuccess({ expense_no: result.expense_no, total: totalNum, paid: paidNum, balance })
        e.currentTarget.reset()
        setTotal('')
        setPaid('')
        setPaymentMode('Cash')
        setInvoiceFileName('')
        setPaymentFileName('')
      } else {
        const msg = !result.success ? (result as { error: string }).error : 'Failed to save expense'
        setError(msg)
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to save expense')
    } finally {
      setSaving(false)
    }
  }

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <div className="text-center"><div className="text-lg text-slate-600">Loading...</div></div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen min-h-[100dvh] bg-gradient-to-b from-slate-50 to-slate-100 flex flex-col justify-center p-4 pt-8 pb-8 safe-area-inset">
        <div className="max-w-md mx-auto w-full flex-shrink-0">
          <div className="bg-white rounded-xl shadow-lg shadow-slate-200/50 p-4 sm:p-5 space-y-4">
            <div className="text-center success-animate">
              <div className="w-14 h-14 rounded-full bg-emerald-500 flex items-center justify-center mx-auto success-pulse shadow-md shadow-emerald-500/30">
                <span className="text-2xl text-white">✓</span>
              </div>
              <h1 className="text-lg font-bold text-emerald-800 mt-3">Expense Saved Successfully</h1>
              <div className="text-xs text-slate-600 mt-0.5">Expense No: <span className="font-semibold text-slate-800">{success.expense_no}</span></div>
            </div>
            <div className="bg-amber-50 border border-amber-200/80 rounded-lg p-3 text-xs">
              <div className="flex justify-between py-1"><span className="text-slate-700">Total</span><span className="font-semibold text-slate-900">₹{success.total}</span></div>
              <div className="flex justify-between py-1"><span className="text-slate-700">Paid</span><span className="font-semibold text-emerald-700">₹{success.paid}</span></div>
              <div className="flex justify-between mt-1.5 pt-2 border-t border-amber-200">
                <span className="text-slate-800 font-semibold">Pending Balance</span>
                <span className={`font-bold text-base ${success.balance > 0 ? 'text-red-600' : 'text-emerald-700'}`}>₹{success.balance}</span>
              </div>
            </div>
            <div className="space-y-2 pt-1">
              {success.balance > 0 && (
                <button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-lg font-semibold text-sm transition-colors duration-200" onClick={() => router.push(`/expenses/${success.expense_no}/add-payment`)}>+ Add Payment</button>
              )}
              <button className="w-full border-2 border-blue-600 text-blue-700 hover:bg-blue-50 py-2 rounded-lg text-xs font-semibold transition-colors duration-200" onClick={() => router.push(`/expenses/${success.expense_no}/history`)}>View Payment History</button>
              <button className="w-full border border-slate-300 text-slate-700 hover:bg-slate-50 py-2 rounded-lg text-xs font-medium transition-colors duration-200" onClick={() => router.push('/dashboard')}>Go to Dashboard</button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 p-3 sm:p-4">
      <div className="max-w-md mx-auto">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 mb-3 font-medium transition-colors">← Back to Home</Link>
        <div className="bg-white rounded-xl shadow-lg shadow-slate-200/50 p-4 sm:p-5 space-y-4">
          <h1 className="text-lg font-bold text-slate-900">New Expense</h1>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-xs flex items-center gap-2"><span>⚠️</span>{error}</div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className={labelClass}>Expense Date</label>
              <input name="expense_date" type="date" max={new Date().toISOString().split('T')[0]} className={inputClass} required />
            </div>
            <div>
              <label className={labelClass}>Added by</label>
              <select name="added_by_user_id" className={inputClass} required>
                <option value="">Choose user</option>
                {users.map(u => (<option key={u.id} value={u.id}>{u.name}</option>))}
              </select>
              {!loadingMaster && users.length === 0 && <p className="text-xs text-amber-600 mt-1">Add users in Master → Users, then have them sign in.</p>}
            </div>
            <div>
              <label className={labelClass}>Site</label>
              {loadingMaster ? <div className="text-xs text-slate-500 py-1">Loading...</div> : (
                <select name="site_id" className={inputClass} required>
                  <option value="">Choose Site</option>
                  {sites.map(s => (<option key={s.id} value={s.id}>{s.name}</option>))}
                </select>
              )}
            </div>
            <div>
              <label className={labelClass}>Category</label>
              {loadingMaster ? <div className="text-xs text-slate-500 py-1">Loading...</div> : (
                <select name="category_id" className={inputClass}>
                  <option value="">Choose Category</option>
                  {categories.map(c => (<option key={c.id} value={c.id}>{c.name}</option>))}
                </select>
              )}
            </div>
            <div>
              <label className={labelClass}>Vendor</label>
              {loadingMaster ? <div className="text-xs text-slate-500 py-1">Loading...</div> : (
                <select name="vendor_id" className={inputClass}>
                  <option value="">Choose Vendor</option>
                  {vendors.map(v => (<option key={v.id} value={v.id}>{v.name}</option>))}
                </select>
              )}
            </div>
            <div className="bg-blue-50/80 border border-blue-200/80 rounded-lg p-3 space-y-3">
              <span className="text-sm font-bold text-blue-900">Invoice</span>
              <div>
                <label className={labelClass}>Total Amount</label>
                <input name="total_amount" type="number" inputMode="decimal" step="0.01" placeholder="Enter total amount" className={inputClass} value={total} onChange={handleTotalChange} required />
              </div>
              <div>
                <label className={labelClass}>Invoice Proof <span className="text-red-600">*</span></label>
                <input ref={invoiceCamera} name="invoice" type="file" accept="image/*" capture="environment" className="hidden" onChange={(e: any) => setInvoiceFileName(e.target.files?.[0]?.name || '')} />
                <input ref={invoiceGallery} name="invoice" type="file" accept="image/*" className="hidden" onChange={(e: any) => setInvoiceFileName(e.target.files?.[0]?.name || '')} />
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => invoiceCamera.current?.click()} className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-3 rounded-md font-semibold text-xs transition-colors duration-200">📷 Take Photo</button>
                  <button type="button" onClick={() => invoiceGallery.current?.click()} className="bg-slate-600 hover:bg-slate-700 text-white py-2 px-3 rounded-md font-semibold text-xs transition-colors duration-200">🖼 From Gallery</button>
                </div>
                {invoiceFileName && <div className="text-xs text-slate-600 mt-1">📎 {invoiceFileName}</div>}
              </div>
            </div>
            <div className="bg-emerald-50/80 border border-emerald-200/80 rounded-lg p-3 space-y-3">
              <span className="text-sm font-bold text-emerald-900">Payment Done Now</span>
              <div>
                <label className={labelClass}>Paid Amount</label>
                <input name="paid_amount" type="number" inputMode="decimal" step="0.01" placeholder="Enter paid amount" className={inputClass} value={paid} onChange={handlePaidChange} required />
              </div>
              <div>
                <label className={labelClass}>Payment Method</label>
                <select name="payment_method" className={inputClass} value={paymentMode} onChange={e => setPaymentMode(e.target.value)} required>
                  <option value="Cash">Cash</option>
                  <option value="UPI">UPI</option>
                  <option value="Bank">Bank</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Payment Proof {paidNum > 0 && <span className="text-red-600">*</span>}</label>
                <input ref={payCamera} name="payment_proof" type="file" accept="image/*" capture="environment" className="hidden" onChange={(e: any) => setPaymentFileName(e.target.files?.[0]?.name || '')} />
                <input ref={payGallery} name="payment_proof" type="file" accept="image/*" className="hidden" onChange={(e: any) => setPaymentFileName(e.target.files?.[0]?.name || '')} />
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => payCamera.current?.click()} className="bg-emerald-600 hover:bg-emerald-700 text-white py-2 px-3 rounded-md font-semibold text-xs transition-colors duration-200">📷 Take Photo</button>
                  <button type="button" onClick={() => payGallery.current?.click()} className="bg-slate-600 hover:bg-slate-700 text-white py-2 px-3 rounded-md font-semibold text-xs transition-colors duration-200">🖼 From Gallery</button>
                </div>
                {paymentFileName && <div className="text-xs text-slate-600 mt-1">📎 {paymentFileName}</div>}
              </div>
            </div>
            {(totalNum > 0 || paidNum > 0) && (
              <div className="bg-amber-50 border border-amber-200/80 rounded-lg p-3 text-xs">
                <div className="flex justify-between py-1"><span className="text-slate-700">Total</span><span className="font-semibold text-slate-900">₹{totalNum}</span></div>
                <div className="flex justify-between py-1"><span className="text-slate-700">Paid</span><span className="font-semibold text-emerald-700">₹{paidNum}</span></div>
                <div className="flex justify-between mt-1.5 pt-2 border-t border-amber-200">
                  <span className="text-slate-800 font-semibold">Balance</span>
                  <span className={`font-bold text-base ${balance > 0 ? 'text-red-600' : balance < 0 ? 'text-red-700' : 'text-emerald-700'}`}>₹{balance}</span>
                </div>
                {balance < 0 && <div className="text-xs text-red-600 mt-1 flex items-center gap-1">⚠️ Paid amount exceeds total</div>}
              </div>
            )}
            <div>
              <label className={labelClass}>Description <span className="text-slate-500 font-normal">(optional)</span></label>
              <textarea name="description" placeholder="Additional notes..." rows={2} className={`${inputClass} resize-none`} />
            </div>
            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg font-semibold text-sm disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200" disabled={saving || loadingMaster}>
              {saving ? 'Saving Expense...' : 'Save Expense'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}