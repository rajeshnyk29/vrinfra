'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import ExcelJS from 'exceljs'

type Expense = {
  id: string
  expense_no: string
  site_id: string | null
  category_id: string | null
  category: string | null
  vendor_id: string | null
  description: string | null
  total_amount: number
  paid_amount: number
  balance_amount: number
  status: string
  bill_image_url: string | null
  expense_date?: string | null
  created_at?: string | null
}

type Site = { id: string; name: string }

type Template = 'card' | 'table'

type Props = {
  expenses: Expense[]
  sites: Site[]
  paymentsByExpenseId: Record<string, { proof_url: string }[]>
  siteMap: Record<string, string>
  categoryMap: Record<string, string>
  vendorMap: Record<string, string>
}

function getMonthKey(exp: Expense): string | null {
  const dateStr = exp.expense_date || exp.created_at
  if (!dateStr) return null
  const d = new Date(dateStr)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

export function DashboardContent({ expenses, sites, paymentsByExpenseId, siteMap, categoryMap, vendorMap }: Props) {
  const [statusFilter, setStatusFilter] = useState<'all' | 'OPEN' | 'CLOSED'>('all')
  const [siteFilter, setSiteFilter] = useState<string>('all')
  const [monthFilter, setMonthFilter] = useState<string>('')
  const [categoryFilter, setCategoryFilter] = useState<Set<string>>(new Set())
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false)
  const categoryDropdownRef = useRef<HTMLDivElement>(null)
  const [template, setTemplate] = useState<Template>('table')

  const categories = Object.entries(categoryMap).map(([id, name]) => ({ id, name }))

  const filtered = expenses.filter((e) => {
    const matchStatus = statusFilter === 'all' || e.status === statusFilter
    const matchSite = siteFilter === 'all' || e.site_id === siteFilter
    const matchMonth = !monthFilter || getMonthKey(e) === monthFilter
    const matchCategory =
      categoryFilter.size === 0 ||
      (e.category_id !== null && categoryFilter.has(e.category_id)) ||
      (e.category && categories.some((c) => categoryFilter.has(c.id) && c.name === e.category))
    return matchStatus && matchSite && matchMonth && matchCategory
  })

  const totals = filtered.reduce(
    (acc, exp) => ({
      total_amount: acc.total_amount + exp.total_amount,
      paid_amount: acc.paid_amount + exp.paid_amount,
      balance_amount: acc.balance_amount + exp.balance_amount,
    }),
    { total_amount: 0, paid_amount: 0, balance_amount: 0 }
  )

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(e.target as Node)) {
        setCategoryDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function toggleCategory(id: string) {
    setCategoryFilter((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectAllCategories() {
    if (categoryFilter.size === categories.length) {
      setCategoryFilter(new Set())
    } else {
      setCategoryFilter(new Set(categories.map((c) => c.id)))
    }
  }

  function getSiteName(exp: Expense) {
    return exp.site_id ? siteMap[exp.site_id] || 'Unknown' : 'Unassigned'
  }

  function getCategoryName(exp: Expense) {
    if (exp.category_id && categoryMap[exp.category_id]) return categoryMap[exp.category_id]
    if (exp.category) return exp.category
    return '—'
  }

  function getVendorName(exp: Expense) {
    return exp.vendor_id && vendorMap[exp.vendor_id] ? vendorMap[exp.vendor_id] : '—'
  }

  function ProofChips({ expId }: { expId: string }) {
    const paymentList = paymentsByExpenseId[expId] || []
    return (
      <div className="flex flex-wrap gap-1">
        {paymentList.length > 0 ? (
          paymentList.map((p, idx) =>
            p.proof_url ? (
              <a
                key={idx}
                href={p.proof_url}
                target="_blank"
                rel="noopener noreferrer"
                className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center text-[9px] font-bold text-white hover:scale-110"
                title={`Proof #${idx + 1}`}
              >
                {idx + 1}
              </a>
            ) : (
              <span key={idx} className="w-5 h-5 rounded-full border border-gray-300 flex items-center justify-center text-[9px] text-gray-400">
                {idx + 1}
              </span>
            )
          )
        ) : (
          <span className="text-xs text-gray-400">0</span>
        )}
      </div>
    )
  }

  function ActionLinks({ exp }: { exp: Expense }) {
    return (
      <div className="flex gap-1 flex-wrap">
        {exp.bill_image_url && (
          <a
            href={exp.bill_image_url}
            target="_blank"
            className="bg-gray-200 px-1.5 py-0.5 rounded text-xs"
            title="Invoice proof"
          >
            👁
          </a>
        )}
        {exp.status === 'OPEN' && (
          <Link
            href={`/expenses/${exp.expense_no}/add-payment`}
            className="bg-green-600 text-white px-1.5 py-0.5 rounded text-xs"
            title="Add payment"
          >
            +
          </Link>
        )}
        <Link
          href={`/expenses/${exp.expense_no}/history`}
          className="bg-blue-100 px-1.5 py-0.5 rounded text-xs"
          title="Payment history"
        >
          History
        </Link>
        {exp.status === 'CLOSED' && (
          <Link
            href={`/expenses/${exp.expense_no}/print`}
            className="bg-gray-300 px-1.5 py-0.5 rounded text-xs"
            title="Print"
          >
            🖨️
          </Link>
        )}
      </div>
    )
  }

  const summaryBar = (
    <div className="bg-indigo-50 border border-indigo-200 rounded p-3 flex flex-wrap justify-between items-center gap-2 text-sm font-semibold">
      <span>Summary</span>
      <div className="flex gap-6">
        <span>Total: ₹{totals.total_amount}</span>
        <span>Paid: ₹{totals.paid_amount}</span>
        <span>Bal: ₹{totals.balance_amount}</span>
      </div>
    </div>
  )

  async function handleExportCurrentView() {
    if (filtered.length === 0) {
      alert('No expenses to export for current filters.')
      return
    }

    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('Dashboard')

    worksheet.columns = [
      { header: 'Expense No', key: 'expense_no', width: 15 },
      { header: 'Site', key: 'site', width: 20 },
      { header: 'Category', key: 'category', width: 20 },
      { header: 'Vendor', key: 'vendor', width: 20 },
      { header: 'Description', key: 'description', width: 40 },
      { header: 'Total Amount', key: 'total', width: 15 },
      { header: 'Paid Amount', key: 'paid', width: 15 },
      { header: 'Balance Amount', key: 'balance', width: 15 },
      { header: 'Status', key: 'status', width: 12 },
    ]

    filtered.forEach((exp) => {
      worksheet.addRow({
        expense_no: exp.expense_no,
        site: getSiteName(exp),
        category: getCategoryName(exp),
        vendor: getVendorName(exp),
        description: exp.description ?? '',
        total: exp.total_amount,
        paid: exp.paid_amount,
        balance: exp.balance_amount,
        status: exp.status,
      })
    })

    const totalsRow = worksheet.addRow({
      description: 'Totals',
      total: totals.total_amount,
      paid: totals.paid_amount,
      balance: totals.balance_amount,
    })
    totalsRow.font = { bold: true }

    const buffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'dashboard-expenses.xlsx'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }

  return (
    <div className="p-4 pb-8">
      <h1 className="text-xl font-bold mb-3">Dashboard</h1>

      <div className="mb-4 space-y-3">
        <div className="hidden md:block">
          <label className="block text-xs text-gray-500 mb-1">Layout (desktop)</label>
          <div className="flex gap-2">
            {(['table', 'card'] as Template[]).map((t) => (
              <button
                key={t}
                onClick={() => setTemplate(t)}
                className={`px-3 py-1.5 rounded text-sm font-medium capitalize ${
                  template === t ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 items-end">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded text-sm font-medium ${statusFilter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
          >
            All
          </button>
          <button
            onClick={() => setStatusFilter('OPEN')}
            className={`px-3 py-1.5 rounded text-sm font-medium ${statusFilter === 'OPEN' ? 'bg-orange-600 text-white' : 'bg-gray-200 text-gray-700'}`}
          >
            Open
          </button>
          <button
            onClick={() => setStatusFilter('CLOSED')}
            className={`px-3 py-1.5 rounded text-sm font-medium ${statusFilter === 'CLOSED' ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700'}`}
          >
            Closed
          </button>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Month</label>
            <input
              type="month"
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              className="border p-2 rounded text-sm"
            />
          </div>

          <div className="relative" ref={categoryDropdownRef}>
            <label className="block text-xs text-gray-500 mb-1">Category</label>
            <button
              type="button"
              onClick={() => setCategoryDropdownOpen(!categoryDropdownOpen)}
              className="w-full min-w-[180px] border p-2 rounded text-sm text-left bg-white flex justify-between items-center"
            >
              <span>
                {categoryFilter.size === 0
                  ? 'All categories'
                  : `${categoryFilter.size} selected`}
              </span>
              <span className="text-gray-400">{categoryDropdownOpen ? '▲' : '▼'}</span>
            </button>
            {categoryDropdownOpen && (
              <div className="absolute top-full left-0 mt-1 z-10 bg-white border rounded shadow-lg max-h-60 overflow-y-auto min-w-[180px]">
                <button
                  type="button"
                  onClick={toggleSelectAllCategories}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 border-b"
                >
                  {categoryFilter.size === categories.length ? 'Deselect all' : 'Select all'}
                </button>
                {categories.map(({ id, name }) => (
                  <label
                    key={id}
                    className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={categoryFilter.has(id)}
                      onChange={() => toggleCategory(id)}
                      className="rounded"
                    />
                    <span>{name}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Filter by site</label>
            <select
              value={siteFilter}
              onChange={(e) => setSiteFilter(e.target.value)}
              className="w-full max-w-xs border p-2 rounded text-sm"
            >
              <option value="all">All sites</option>
              {sites.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <button
            onClick={handleExportCurrentView}
            className="ml-auto px-3 py-1.5 rounded text-sm font-medium bg-emerald-600 text-white"
          >
            Export to Excel
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-gray-500 text-sm">No expenses match the filters</div>
      ) : (
        <>
          <div className="md:hidden space-y-3">
            {summaryBar}
            {filtered.map((exp) => {
              const siteName = getSiteName(exp)
              const categoryName = getCategoryName(exp)
              const vendorName = getVendorName(exp)
              return (
                <div key={exp.id} className="border rounded p-3 shadow-sm bg-white">
                  <div className="flex justify-between">
                    <span className="font-bold">{exp.expense_no}</span>
                    <span className={exp.status === 'OPEN' ? 'bg-orange-200 text-xs px-2 py-1 rounded' : 'bg-green-200 text-xs px-2 py-1 rounded'}>
                      {exp.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{siteName}</p>
                  <div className="mt-1.5 pl-3 border-l-4 border-blue-500">
                    <span className="inline-block px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-xs font-medium">{categoryName}</span>
                    {vendorName !== '—' && <span className="ml-1 text-xs text-gray-600">• {vendorName}</span>}
                    {exp.description && <p className="text-sm text-gray-500 mt-1.5 line-clamp-2">{exp.description}</p>}
                  </div>
                  <div className="grid grid-cols-3 text-sm mt-2">
                    <div>Total: ₹{exp.total_amount}</div>
                    <div>Paid: ₹{exp.paid_amount}</div>
                    <div>Bal: ₹{exp.balance_amount}</div>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-xs text-gray-600 font-medium">Proofs:</span>
                    <ProofChips expId={exp.id} />
                  </div>
                  <div className="mt-3 flex gap-2 text-xs">
                    {exp.bill_image_url && (
                      <a href={exp.bill_image_url} target="_blank" className="bg-gray-200 px-2 py-1 rounded" title="Invoice proof">👁 Invoice</a>
                    )}
                    {exp.status === 'OPEN' && (
                      <Link href={`/expenses/${exp.expense_no}/add-payment`} className="bg-green-600 text-white px-2 py-1 rounded" title="Add payment">+ Payment</Link>
                    )}
                    <Link href={`/expenses/${exp.expense_no}/history`} className="bg-blue-100 px-2 py-1 rounded" title="Payment history">History</Link>
                    {exp.status === 'CLOSED' && (
                      <Link href={`/expenses/${exp.expense_no}/print`} className="bg-gray-300 px-2 py-1 rounded" title="Print">🖨️ Print</Link>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          <div className="hidden md:block">
            {template === 'card' && (
              <div className="space-y-3">
                {summaryBar}
                {filtered.map((exp) => {
                  const siteName = getSiteName(exp)
                  const categoryName = getCategoryName(exp)
                  const vendorName = getVendorName(exp)
                  return (
                    <div key={exp.id} className="border rounded p-3 shadow-sm bg-white">
                      <div className="flex justify-between">
                        <span className="font-bold">{exp.expense_no}</span>
                        <span className={exp.status === 'OPEN' ? 'bg-orange-200 text-xs px-2 py-1 rounded' : 'bg-green-200 text-xs px-2 py-1 rounded'}>{exp.status}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{siteName}</p>
                      <div className="mt-1.5 pl-3 border-l-4 border-blue-500">
                        <span className="inline-block px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-xs font-medium">{categoryName}</span>
                        {vendorName !== '—' && <span className="ml-1 text-xs text-gray-600">• {vendorName}</span>}
                        {exp.description && <p className="text-sm text-gray-500 mt-1.5 line-clamp-2">{exp.description}</p>}
                      </div>
                      <div className="grid grid-cols-3 text-sm mt-2">
                        <div>Total: ₹{exp.total_amount}</div>
                        <div>Paid: ₹{exp.paid_amount}</div>
                        <div>Bal: ₹{exp.balance_amount}</div>
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-xs text-gray-600 font-medium">Proofs:</span>
                        <ProofChips expId={exp.id} />
                      </div>
                      <div className="mt-3 flex gap-2 text-xs">
                        {exp.bill_image_url && <a href={exp.bill_image_url} target="_blank" className="bg-gray-200 px-2 py-1 rounded" title="Invoice proof">👁 Invoice</a>}
                        {exp.status === 'OPEN' && <Link href={`/expenses/${exp.expense_no}/add-payment`} className="bg-green-600 text-white px-2 py-1 rounded" title="Add payment">+ Payment</Link>}
                        <Link href={`/expenses/${exp.expense_no}/history`} className="bg-blue-100 px-2 py-1 rounded" title="Payment history">History</Link>
                        {exp.status === 'CLOSED' && (
                          <Link href={`/expenses/${exp.expense_no}/print`} className="bg-gray-300 px-2 py-1 rounded" title="Print">🖨️ Print</Link>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {template === 'table' && (
              <div className="overflow-x-auto border rounded">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-100 border-b">
                      <th className="text-left p-2 font-semibold">Expense</th>
                      <th className="text-left p-2 font-semibold">Site</th>
                      <th className="text-left p-2 font-semibold">Category</th>
                      <th className="text-left p-2 font-semibold">Vendor</th>
                      <th className="text-left p-2 font-semibold">Description</th>
                      <th className="text-right p-2 font-semibold">Total</th>
                      <th className="text-right p-2 font-semibold">Paid</th>
                      <th className="text-right p-2 font-semibold">Bal</th>
                      <th className="text-center p-2 font-semibold">Status</th>
                      <th className="text-center p-2 font-semibold">Proofs</th>
                      <th className="text-center p-2 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((exp) => (
                      <tr key={exp.id} className="border-b hover:bg-gray-50">
                        <td className="p-2 font-medium">{exp.expense_no}</td>
                        <td className="p-2">{getSiteName(exp)}</td>
                        <td className="p-2">{getCategoryName(exp)}</td>
                        <td className="p-2">{getVendorName(exp)}</td>
                        <td className="p-2 max-w-[150px] truncate" title={exp.description || ''}>{exp.description || '—'}</td>
                        <td className="p-2 text-right">₹{exp.total_amount}</td>
                        <td className="p-2 text-right">₹{exp.paid_amount}</td>
                        <td className="p-2 text-right">₹{exp.balance_amount}</td>
                        <td className="p-2 text-center">
                          <span className={exp.status === 'OPEN' ? 'bg-orange-200 px-1.5 py-0.5 rounded text-xs' : 'bg-green-200 px-1.5 py-0.5 rounded text-xs'}>{exp.status}</span>
                        </td>
                        <td className="p-2"><ProofChips expId={exp.id} /></td>
                        <td className="p-2"><ActionLinks exp={exp} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {summaryBar}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}