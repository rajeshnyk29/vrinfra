'use client'
import { Button } from '@/components/ui/button'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import imageCompression from 'browser-image-compression'
import { supabase } from '../../../lib/supabaseClient'
import { createExpense, getSignedUploadUrl } from '../actions'
import { getUsers } from '../../master/users/actions'

type Site = { id: string; name: string }
type Category = { id: string; name: string }
type Vendor = { id: string; name: string }
type User = { id: string; name: string }

const inputClass = "w-full border border-gray-300 rounded-md px-2.5 py-1.5 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-shadow duration-200"
const labelClass = "block text-xs font-semibold text-gray-700 mb-1"
const MAX_FILE_SIZE = 10 * 1024 * 1024
const MAX_COMPRESSED_SIZE = 1 * 1024 * 1024
const MAX_WIDTH_OR_HEIGHT = 1920

function roundMoney(n: number | string): number {
  const x = Number(n)
  if (Number.isNaN(x)) return 0
  return Math.round(x * 100) / 100
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
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
  const [invoiceFileSize, setInvoiceFileSize] = useState<number>(0)
  const [invoiceOriginalSize, setInvoiceOriginalSize] = useState<number>(0)
  const [paymentFileName, setPaymentFileName] = useState('')
  const [paymentFileSize, setPaymentFileSize] = useState<number>(0)
  const [paymentOriginalSize, setPaymentOriginalSize] = useState<number>(0)
  const [compressingInvoice, setCompressingInvoice] = useState(false)
  const [compressingPayment, setCompressingPayment] = useState(false)
  const invoiceCamera = useRef<any>(null)
  const invoiceGallery = useRef<any>(null)
  const payCamera = useRef<any>(null)
  const payGallery = useRef<any>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState<{ expense_no: string; total: number; paid: number; balance: number } | null>(null)
  const compressedInvoiceFile = useRef<File | null>(null)
  const compressedPaymentFile = useRef<File | null>(null)

  useEffect(() => { checkAuth() }, [])
  useEffect(() => { if (success) window.scrollTo(0, 0) }, [success])

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
      toast.error('Authentication failed. Please sign in again.')
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
      toast.error(e?.message || 'Failed to load data. Please refresh the page.')
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
    if (!Number.isNaN(Number(v))) setTotal(v)
  }

  function handleTotalBlur(e: React.FocusEvent<HTMLInputElement>) {
    const v = e.target.value
    if (v && v !== '-') setTotal(String(roundMoney(v)))
  }

  function handlePaidChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value
    if (v === '' || v === '-') { setPaid(v); return }
    if (!Number.isNaN(Number(v))) setPaid(v)
  }

  function handlePaidBlur(e: React.FocusEvent<HTMLInputElement>) {
    const v = e.target.value
    if (v && v !== '-') setPaid(String(roundMoney(v)))
  }

  async function handleInvoiceFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > MAX_FILE_SIZE) {
      toast.error(`Invoice file too large (${formatFileSize(file.size)}). Max ${formatFileSize(MAX_FILE_SIZE)}.`)
      e.target.value = ''
      setInvoiceFileName('')
      setInvoiceFileSize(0)
      setInvoiceOriginalSize(0)
      compressedInvoiceFile.current = null
      return
    }
    setInvoiceFileName(file.name)
    setInvoiceOriginalSize(file.size)
    setCompressingInvoice(true)
    try {
      const options = { maxSizeMB: MAX_COMPRESSED_SIZE / (1024 * 1024), maxWidthOrHeight: MAX_WIDTH_OR_HEIGHT, useWebWorker: true, fileType: 'image/jpeg', initialQuality: 0.8 }
      const blob = await imageCompression(file, options)
      const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, '') + '.jpg', { type: 'image/jpeg', lastModified: Date.now() })
      setInvoiceFileSize(compressedFile.size)
      compressedInvoiceFile.current = compressedFile
      const dt = new DataTransfer()
      dt.items.add(compressedFile)
      if (invoiceCamera.current) invoiceCamera.current.files = dt.files
      if (invoiceGallery.current) invoiceGallery.current.files = dt.files
    } catch (err: any) {
      console.error('Compression error:', err)
      toast.error('Failed to compress image. Please try again.')
      e.target.value = ''
      setInvoiceFileName('')
      setInvoiceFileSize(0)
      setInvoiceOriginalSize(0)
      compressedInvoiceFile.current = null
    } finally {
      setCompressingInvoice(false)
    }
  }

  async function handlePaymentFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > MAX_FILE_SIZE) {
      toast.error(`Payment proof too large (${formatFileSize(file.size)}). Max ${formatFileSize(MAX_FILE_SIZE)}.`)
      e.target.value = ''
      setPaymentFileName('')
      setPaymentFileSize(0)
      setPaymentOriginalSize(0)
      compressedPaymentFile.current = null
      return
    }
    setPaymentFileName(file.name)
    setPaymentOriginalSize(file.size)
    setCompressingPayment(true)
    try {
      const options = { maxSizeMB: MAX_COMPRESSED_SIZE / (1024 * 1024), maxWidthOrHeight: MAX_WIDTH_OR_HEIGHT, useWebWorker: true, fileType: 'image/jpeg', initialQuality: 0.8 }
      const blob = await imageCompression(file, options)
      const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, '') + '.jpg', { type: 'image/jpeg', lastModified: Date.now() })
      setPaymentFileSize(compressedFile.size)
      compressedPaymentFile.current = compressedFile
      const dt = new DataTransfer()
      dt.items.add(compressedFile)
      if (payCamera.current) payCamera.current.files = dt.files
      if (payGallery.current) payGallery.current.files = dt.files
    } catch (err: any) {
      console.error('Compression error:', err)
      toast.error('Failed to compress image. Please try again.')
      e.target.value = ''
      setPaymentFileName('')
      setPaymentFileSize(0)
      setPaymentOriginalSize(0)
      compressedPaymentFile.current = null
    } finally {
      setCompressingPayment(false)
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSuccess(null)
    if (totalNum <= 0) { toast.error('Total amount must be greater than 0'); return }
    if (paidNum < 0) { toast.error('Paid amount cannot be negative'); return }
    if (paidNum > totalNum) { toast.error('Paid amount cannot exceed total amount'); return }

    setSaving(true)
    const formData = new FormData(e.currentTarget)
    let invoiceFile: File | null = compressedInvoiceFile.current ?? (formData.get('invoice') as File | null)
    if (!invoiceFile?.size) invoiceFile = invoiceCamera.current?.files?.[0] ?? invoiceGallery.current?.files?.[0] ?? null
    let paymentFile: File | null = compressedPaymentFile.current ?? (formData.get('payment_proof') as File | null)
    if (!paymentFile?.size) paymentFile = payCamera.current?.files?.[0] ?? payGallery.current?.files?.[0] ?? null

    if (!invoiceFile?.size) { toast.error('Invoice proof is required.'); setSaving(false); return }
    if (paidNum > 0 && !paymentFile?.size) { toast.error('Payment proof is required when paid > 0.'); setSaving(false); return }
    if (invoiceFile.size > MAX_FILE_SIZE) { toast.error(`Invoice too large. Max ${formatFileSize(MAX_FILE_SIZE)}.`); setSaving(false); return }
    if (paymentFile && paymentFile.size > MAX_FILE_SIZE) { toast.error(`Payment proof too large. Max ${formatFileSize(MAX_FILE_SIZE)}.`); setSaving(false); return }

    try {
      let bill_image_url = ''
      let payment_proof_url = ''

      if (invoiceFile?.size) {
        const urlResult = await getSignedUploadUrl(invoiceFile.name)
        if (!urlResult.success) { toast.error('error' in urlResult ? urlResult.error : 'Failed to prepare invoice upload'); setSaving(false); return }
        const { error: uploadErr } = await supabase.storage.from('expenses-bills').uploadToSignedUrl(urlResult.path, urlResult.token, invoiceFile)
        if (uploadErr) { toast.error(uploadErr.message || 'Failed to upload invoice'); setSaving(false); return }
        bill_image_url = urlResult.publicUrl
      }

      if (paymentFile?.size) {
        const urlResult = await getSignedUploadUrl(paymentFile.name)
        if (!urlResult.success) { toast.error('error' in urlResult ? urlResult.error : 'Failed to prepare payment proof upload'); setSaving(false); return }
        const { error: uploadErr } = await supabase.storage.from('expenses-bills').uploadToSignedUrl(urlResult.path, urlResult.token, paymentFile)
        if (uploadErr) { toast.error(uploadErr.message || 'Failed to upload payment proof'); setSaving(false); return }
        payment_proof_url = urlResult.publicUrl
      }

      const expenseFormData = new FormData()
      expenseFormData.set('total_amount', String(totalNum))
      expenseFormData.set('paid_amount', String(paidNum))
      expenseFormData.set('bill_image_url', bill_image_url)
      expenseFormData.set('payment_proof_url', payment_proof_url)
      expenseFormData.set('expense_date', formData.get('expense_date') as string)
      expenseFormData.set('site_id', formData.get('site_id') as string)
      expenseFormData.set('category_id', formData.get('category_id') as string || '')
      expenseFormData.set('vendor_id', formData.get('vendor_id') as string || '')
      expenseFormData.set('payment_method', formData.get('payment_method') as string)
      expenseFormData.set('added_by_user_id', formData.get('added_by_user_id') as string)
      expenseFormData.set('added_by_name', users.find(u => u.id === formData.get('added_by_user_id'))?.name || '')
      expenseFormData.set('description', formData.get('description') as string || '')

      const result = await createExpense(expenseFormData)
      if (result.success && result.expense_no) {
        formRef.current?.reset()
        setTotal('')
        setPaid('')
        setPaymentMode('Cash')
        setInvoiceFileName('')
        setInvoiceFileSize(0)
        setInvoiceOriginalSize(0)
        setPaymentFileName('')
        setPaymentFileSize(0)
        setPaymentOriginalSize(0)
        compressedInvoiceFile.current = null
        compressedPaymentFile.current = null
        setSuccess({ expense_no: result.expense_no, total: totalNum, paid: paidNum, balance })
        toast.success('Expense saved successfully')
      } else {
        toast.error(!result.success && 'error' in result ? result.error : 'Failed to save expense')
      }
    } catch (err: any) {
      console.error('Error submitting expense:', err)
      toast.error(err?.message || (err?.toString?.()?.includes('network') || err?.toString?.()?.includes('fetch') ? 'Network error. Try again.' : err?.toString?.()?.includes('timeout') ? 'Request timed out.' : 'Failed to save expense'))
    } finally {
      setSaving(false)
    }
  }

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-2" />
          <div className="text-lg text-slate-600">Loading...</div>
        </motion.div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen min-h-[100dvh] bg-gradient-to-b from-slate-50 to-slate-100 flex flex-col justify-center p-4 pt-8 pb-8 safe-area-inset">
        <div className="max-w-md mx-auto w-full flex-shrink-0">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="bg-white rounded-xl shadow-lg shadow-slate-200/50 p-4 sm:p-5 space-y-4">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200, damping: 15 }} className="text-center">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: "spring", stiffness: 200, damping: 15 }} className="w-14 h-14 rounded-full bg-emerald-500 flex items-center justify-center mx-auto shadow-md shadow-emerald-500/30">
                <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.3 }} className="text-2xl text-white">✓</motion.span>
              </motion.div>
              <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="text-lg font-bold text-emerald-800 mt-3">Expense Saved Successfully</motion.h1>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="text-xs text-slate-600 mt-0.5">Expense No: <span className="font-semibold text-slate-800">{success.expense_no}</span></motion.div>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="bg-amber-50 border border-amber-200/80 rounded-lg p-3 text-xs">
              <div className="flex justify-between py-1"><span className="text-slate-700">Total</span><span className="font-semibold text-slate-900">₹{success.total}</span></div>
              <div className="flex justify-between py-1"><span className="text-slate-700">Paid</span><span className="font-semibold text-emerald-700">₹{success.paid}</span></div>
              <div className="flex justify-between mt-1.5 pt-2 border-t border-amber-200">
                <span className="text-slate-800 font-semibold">Pending Balance</span>
                <span className={`font-bold text-base ${success.balance > 0 ? 'text-red-600' : 'text-emerald-700'}`}>₹{success.balance}</span>
              </div>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }} className="space-y-2 pt-1">
              {success.balance > 0 && <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2" onClick={() => router.push(`/expenses/${success.expense_no}/add-payment`)}>+ Add Payment</Button>}
              <Button variant="outline" className="w-full border-2 border-blue-600 text-blue-700 hover:bg-blue-50 py-2" onClick={() => router.push(`/expenses/${success.expense_no}/history`)}>View Payment History</Button>
              <Button variant="outline" className="w-full py-2" onClick={() => router.push('/dashboard')}>Go to Dashboard</Button>
            </motion.div>
          </motion.div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 p-3 sm:p-4">
      <div className="max-w-md mx-auto">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}>
          <Link href="/" className="mb-3 inline-block">
            <Button variant="link" className="text-blue-600 hover:text-blue-800 p-0 h-auto font-medium">← Back to Home</Button>
          </Link>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="bg-white rounded-xl shadow-lg shadow-slate-200/50 p-4 sm:p-5 space-y-4">
          <h1 className="text-lg font-bold text-slate-900">New Expense</h1>
          <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <label className={labelClass}>Expense Date</label>
              <input name="expense_date" type="date" max={new Date().toISOString().split('T')[0]} className={inputClass} required />
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
              <label className={labelClass}>Added by</label>
              <select name="added_by_user_id" className={inputClass} required>
                <option value="">Choose user</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
              {!loadingMaster && users.length === 0 && <p className="text-xs text-amber-600 mt-1">Add users in Master → Users, then have them sign in.</p>}
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <label className={labelClass}>Site</label>
              {loadingMaster ? <div className="text-xs text-slate-500 py-1">Loading...</div> : <select name="site_id" className={inputClass} required><option value="">Choose Site</option>{sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select>}
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
              <label className={labelClass}>Category</label>
              {loadingMaster ? <div className="text-xs text-slate-500 py-1">Loading...</div> : <select name="category_id" className={inputClass}><option value="">Choose Category</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>}
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <label className={labelClass}>Vendor</label>
              {loadingMaster ? <div className="text-xs text-slate-500 py-1">Loading...</div> : <select name="vendor_id" className={inputClass}><option value="">Choose Vendor</option>{vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}</select>}
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="bg-blue-50/80 border border-blue-200/80 rounded-lg p-3 space-y-3">
              <span className="text-sm font-bold text-blue-900">Invoice</span>
              <div>
                <label className={labelClass}>Total Amount</label>
                <input name="total_amount" type="number" inputMode="decimal" step="0.01" placeholder="Enter total amount" className={inputClass} value={total} onChange={handleTotalChange} onBlur={handleTotalBlur} required />
              </div>
              <div>
                <label className={labelClass}>Invoice Proof <span className="text-red-600">*</span></label>
                <input ref={invoiceCamera} name="invoice" type="file" accept="image/*" capture="environment" className="hidden" onChange={handleInvoiceFileChange} />
                <input ref={invoiceGallery} name="invoice" type="file" accept="image/*" className="hidden" onChange={handleInvoiceFileChange} />
                <div className="grid grid-cols-2 gap-2">
                  <motion.button type="button" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => invoiceCamera.current?.click()} disabled={compressingInvoice} className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-3 rounded-md font-semibold text-xs transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed">{compressingInvoice ? '⏳ Compressing...' : '📷 Take Photo'}</motion.button>
                  <motion.button type="button" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => invoiceGallery.current?.click()} disabled={compressingInvoice} className="bg-slate-600 hover:bg-slate-700 text-white py-2 px-3 rounded-md font-semibold text-xs transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed">{compressingInvoice ? '⏳ Compressing...' : '🖼 From Gallery'}</motion.button>
                </div>
                {compressingInvoice && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-blue-600 mt-2 flex items-center gap-2"><motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full" />Compressing image...</motion.div>}
                {invoiceFileName && !compressingInvoice && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-slate-600 mt-1">📎 {invoiceFileName}{invoiceOriginalSize > 0 && invoiceFileSize > 0 && <span className="text-slate-500"> ({invoiceOriginalSize !== invoiceFileSize ? `${formatFileSize(invoiceOriginalSize)} → ${formatFileSize(invoiceFileSize)}` : formatFileSize(invoiceFileSize)})</span>}</motion.div>}
                <p className="text-xs text-slate-500 mt-1">Max {formatFileSize(MAX_FILE_SIZE)} (compressed automatically)</p>
              </div>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="bg-emerald-50/80 border border-emerald-200/80 rounded-lg p-3 space-y-3">
              <span className="text-sm font-bold text-emerald-900">Payment Done Now</span>
              <div>
                <label className={labelClass}>Paid Amount</label>
                <input name="paid_amount" type="number" inputMode="decimal" step="0.01" placeholder="Enter paid amount" className={inputClass} value={paid} onChange={handlePaidChange} onBlur={handlePaidBlur} required />
              </div>
              <div>
                <label className={labelClass}>Payment Method</label>
                <select name="payment_method" className={inputClass} value={paymentMode} onChange={e => setPaymentMode(e.target.value)} required><option value="Cash">Cash</option><option value="UPI">UPI</option><option value="Bank">Bank</option></select>
              </div>
              <div>
                <label className={labelClass}>Payment Proof {paidNum > 0 && <span className="text-red-600">*</span>}</label>
                <input ref={payCamera} name="payment_proof" type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePaymentFileChange} />
                <input ref={payGallery} name="payment_proof" type="file" accept="image/*" className="hidden" onChange={handlePaymentFileChange} />
                <div className="grid grid-cols-2 gap-2">
                  <motion.button type="button" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => payCamera.current?.click()} disabled={compressingPayment} className="bg-emerald-600 hover:bg-emerald-700 text-white py-2 px-3 rounded-md font-semibold text-xs transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed">{compressingPayment ? '⏳ Compressing...' : '📷 Take Photo'}</motion.button>
                  <motion.button type="button" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => payGallery.current?.click()} disabled={compressingPayment} className="bg-slate-600 hover:bg-slate-700 text-white py-2 px-3 rounded-md font-semibold text-xs transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed">{compressingPayment ? '⏳ Compressing...' : '🖼 From Gallery'}</motion.button>
                </div>
                {compressingPayment && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-emerald-600 mt-2 flex items-center gap-2"><motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full" />Compressing image...</motion.div>}
                {paymentFileName && !compressingPayment && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-slate-600 mt-1">📎 {paymentFileName}{paymentOriginalSize > 0 && paymentFileSize > 0 && <span className="text-slate-500"> ({paymentOriginalSize !== paymentFileSize ? `${formatFileSize(paymentOriginalSize)} → ${formatFileSize(paymentFileSize)}` : formatFileSize(paymentFileSize)})</span>}</motion.div>}
                {paidNum > 0 && <p className="text-xs text-slate-500 mt-1">Max {formatFileSize(MAX_FILE_SIZE)} (compressed automatically)</p>}
              </div>
            </motion.div>
            <AnimatePresence>
              {(totalNum > 0 || paidNum > 0) && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="bg-amber-50 border border-amber-200/80 rounded-lg p-3 text-xs overflow-hidden">
                  <div className="flex justify-between py-1"><span className="text-slate-700">Total</span><span className="font-semibold text-slate-900">₹{totalNum}</span></div>
                  <div className="flex justify-between py-1"><span className="text-slate-700">Paid</span><span className="font-semibold text-emerald-700">₹{paidNum}</span></div>
                  <div className="flex justify-between mt-1.5 pt-2 border-t border-amber-200">
                    <span className="text-slate-800 font-semibold">Balance</span>
                    <span className={`font-bold text-base ${balance > 0 ? 'text-red-600' : balance < 0 ? 'text-red-700' : 'text-emerald-700'}`}>₹{balance}</span>
                  </div>
                  {balance < 0 && <div className="text-xs text-red-600 mt-1">⚠️ Paid exceeds total</div>}
                </motion.div>
              )}
            </AnimatePresence>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
              <label className={labelClass}>Description <span className="text-slate-500 font-normal">(optional)</span></label>
              <textarea name="description" placeholder="Additional notes..." rows={2} className={`${inputClass} resize-none`} />
            </motion.div>
            <Button
              type="submit"
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white"
              disabled={saving || loadingMaster || compressingInvoice || compressingPayment}
            >
              {saving ? 'Saving Expense...' : 'Save Expense'}
            </Button>
          </form>
        </motion.div>
      </div>
    </div>
  )
}