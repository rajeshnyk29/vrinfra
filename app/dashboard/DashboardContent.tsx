'use client'

import { useState } from 'react'
import Link from 'next/link'

type Expense = {
  id: string
  expense_no: string
  site_id: string | null
  category: string
  description: string | null
  total_amount: number
  paid_amount: number
  balance_amount: number
  status: string
  bill_image_url: string | null
}

type Site = { id: string; name: string }

type Template = 'card' | 'table' | 'compact' | 'list'

type Props = {
  expenses: Expense[]
  sites: Site[]
  paymentsByExpenseId: Record<string, { proof_url: string }[]>
  siteMap: Record<string, string>
}

export default function DashboardContent({ expenses, sites, paymentsByExpenseId, siteMap }: Props) {
  const [statusFilter, setStatusFilter] = useState<'all' | 'OPEN' | 'CLOSED'>('all')
  const [siteFilter, setSiteFilter] = useState<string>('all')
  const [template, setTemplate] = useState<Template>('card')

  const filtered = expenses.filter((e) => {
    const matchStatus = statusFilter === 'all' || e.status === statusFilter
    const matchSite = siteFilter === 'all' || e.site_id === siteFilter
    return matchStatus && matchSite
  })

  function getSiteName(exp: Expense) {
    return exp.site_id ? siteMap[exp.site_id] || 'Unknown' : 'Unassigned'
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
          <a href={exp.bill_image_url} target="_blank" className="bg-gray-200 px-1.5 py-0.5 rounded text-xs">
            👁
          </a>
        )}
        {exp.status === 'OPEN' && (
          <Link href={`/expenses/${exp.expense_no}/add-payment`} className="bg-green-600 text-white px-1.5 py-0.5 rounded text-xs">
            +
          </Link>
        )}
        <Link href={`/expenses/${exp.expense_no}/history`} className="bg-blue-100 px-1.5 py-0.5 rounded text-xs">
          Hist
        </Link>
      </div>
    )
  }

  return (
    <div className="p-4 pb-8">
      <h1 className="text-xl font-bold mb-3">Dashboard</h1>

      <div className="mb-4 space-y-3">
        <div className="flex flex-wrap gap-2">
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

        <div className="hidden md:block">
          <label className="block text-xs text-gray-500 mb-1">Layout (desktop)</label>
          <div className="flex gap-2">
            {(['card', 'table', 'compact', 'list'] as Template[]).map((t) => (
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
      </div>

      {filtered.length === 0 ? (
        <div className="text-gray-500 text-sm">No expenses match the filters</div>
      ) : (
        <>
          {/* Mobile: always card */}
          <div className="md:hidden space-y-3">
            {filtered.map((exp) => {
              const siteName = getSiteName(exp)
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
                    <span className="inline-block px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-xs font-medium">{exp.category || '—'}</span>
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
                      <a href={exp.bill_image_url} target="_blank" className="bg-gray-200 px-2 py-1 rounded">👁 Invoice</a>
                    )}
                    {exp.status === 'OPEN' && (
                      <Link href={`/expenses/${exp.expense_no}/add-payment`} className="bg-green-600 text-white px-2 py-1 rounded">+ Payment</Link>
                    )}
                    <Link href={`/expenses/${exp.expense_no}/history`} className="bg-blue-100 px-2 py-1 rounded">History</Link>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Desktop: selected template */}
          <div className="hidden md:block">
            {template === 'card' && (
              <div className="space-y-3">
                {filtered.map((exp) => {
                  const siteName = getSiteName(exp)
                  return (
                    <div key={exp.id} className="border rounded p-3 shadow-sm bg-white">
                      <div className="flex justify-between">
                        <span className="font-bold">{exp.expense_no}</span>
                        <span className={exp.status === 'OPEN' ? 'bg-orange-200 text-xs px-2 py-1 rounded' : 'bg-green-200 text-xs px-2 py-1 rounded'}>{exp.status}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{siteName}</p>
                      <div className="mt-1.5 pl-3 border-l-4 border-blue-500">
                        <span className="inline-block px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-xs font-medium">{exp.category || '—'}</span>
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
                        {exp.bill_image_url && <a href={exp.bill_image_url} target="_blank" className="bg-gray-200 px-2 py-1 rounded">👁 Invoice</a>}
                        {exp.status === 'OPEN' && <Link href={`/expenses/${exp.expense_no}/add-payment`} className="bg-green-600 text-white px-2 py-1 rounded">+ Payment</Link>}
                        <Link href={`/expenses/${exp.expense_no}/history`} className="bg-blue-100 px-2 py-1 rounded">History</Link>
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
                        <td className="p-2">{exp.category || '—'}</td>
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
              </div>
            )}

            {template === 'compact' && (
              <div className="space-y-1">
                {filtered.map((exp) => (
                  <div key={exp.id} className="flex items-center gap-4 py-2 px-3 border rounded hover:bg-gray-50 text-sm">
                    <span className="font-bold w-20">{exp.expense_no}</span>
                    <span className="w-24 truncate">{getSiteName(exp)}</span>
                    <span className="w-20 truncate">{exp.category || '—'}</span>
                    <span className="flex-1 truncate text-gray-500 max-w-[120px]">{exp.description || '—'}</span>
                    <span>₹{exp.total_amount}</span>
                    <span>₹{exp.paid_amount}</span>
                    <span className="font-medium">₹{exp.balance_amount}</span>
                    <span className={exp.status === 'OPEN' ? 'bg-orange-200 px-1.5 py-0.5 rounded text-xs' : 'bg-green-200 px-1.5 py-0.5 rounded text-xs'}>{exp.status}</span>
                    <ProofChips expId={exp.id} />
                    <ActionLinks exp={exp} />
                  </div>
                ))}
              </div>
            )}

            {template === 'list' && (
              <div className="space-y-2">
                {filtered.map((exp) => (
                  <div key={exp.id} className="flex items-center justify-between py-2 px-3 border rounded hover:bg-gray-50">
                    <div className="flex items-center gap-4 min-w-0">
                      <span className="font-bold shrink-0">{exp.expense_no}</span>
                      <span className="text-gray-500 shrink-0">{getSiteName(exp)}</span>
                      <span className="shrink-0">{exp.category || '—'}</span>
                      <span className="truncate text-gray-500">{exp.description || '—'}</span>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      <span>₹{exp.balance_amount} bal</span>
                      <span className={exp.status === 'OPEN' ? 'bg-orange-200 px-1.5 py-0.5 rounded text-xs' : 'bg-green-200 px-1.5 py-0.5 rounded text-xs'}>{exp.status}</span>
                      <ProofChips expId={exp.id} />
                      <ActionLinks exp={exp} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}