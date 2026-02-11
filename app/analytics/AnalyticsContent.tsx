'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts'

type ExpenseRow = {
  id: string
  expense_date: string | null
  created_at?: string
  site_id: string | null
  category_id: string | null
  category: string | null
  total_amount: number
}

type Site = { id: string; name: string }

type ChartDataPoint = {
  name: string
  amount: number
  categoryId: string
}

type Props = {
  expenses: ExpenseRow[]
  sites: Site[]
  siteMap: Record<string, string>
  categoryMap: Record<string, string>
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

function getMonthKey(dateStr: string | null, fallback: string | undefined): string | null {
  if (dateStr) {
    const d = new Date(dateStr)
    if (!isNaN(d.getTime())) {
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    }
  }
  if (fallback) {
    const d = new Date(fallback)
    if (!isNaN(d.getTime())) {
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    }
  }
  return null
}

function formatMonth(key: string): string {
  const [y, m] = key.split('-')
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const monthName = months[parseInt(m, 10) - 1] || m
  return `${monthName} ${y}`
}

export default function AnalyticsContent({ expenses, sites, siteMap, categoryMap }: Props) {
  const availableMonths = useMemo(() => {
    const set = new Set<string>()
    expenses.forEach((e) => {
      const key = getMonthKey(e.expense_date, e.created_at)
      if (key) set.add(key)
    })
    return Array.from(set).sort().reverse()
  }, [expenses])

  const defaultMonth = availableMonths[0] || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`

  const [selectedMonth, setSelectedMonth] = useState<string>(defaultMonth)
  const [siteFilter, setSiteFilter] = useState<string>('all')

  const chartData = useMemo(() => {
    const filtered = expenses.filter((e) => {
      const key = getMonthKey(e.expense_date, e.created_at)
      if (key !== selectedMonth) return false
      if (siteFilter !== 'all' && e.site_id !== siteFilter) return false
      return true
    })

    const byCategory: Record<string, number> = {}
    filtered.forEach((e) => {
      const catId = e.category_id || 'uncategorized'
      const catName = categoryMap[catId] || e.category || 'Uncategorized'
      byCategory[catName] = (byCategory[catName] || 0) + (e.total_amount ?? 0)
    })

    const top5: ChartDataPoint[] = Object.entries(byCategory)
      .map(([name, amount]) => ({ name, amount, categoryId: name }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5)

    return top5
  }, [expenses, selectedMonth, siteFilter, categoryMap])

  const siteLabel = siteFilter === 'all' ? 'All Sites' : siteMap[siteFilter] || siteFilter

  return (
    <div className="p-4 pb-8">
      <div className="mb-4">
        <Link href="/" className="text-sm text-blue-600 hover:underline mb-2 inline-block">
          ← Home
        </Link>
        <h1 className="text-xl font-bold">Analytics</h1>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 space-y-4">
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Month</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none min-w-[140px]"
            >
              {availableMonths.length > 0 ? (
                availableMonths.map((m) => (
                  <option key={m} value={m}>
                    {formatMonth(m)}
                  </option>
                ))
              ) : (
                <option value={selectedMonth}>{formatMonth(selectedMonth)}</option>
              )}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Site</label>
            <select
              value={siteFilter}
              onChange={(e) => setSiteFilter(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none min-w-[160px]"
            >
              <option value="all">All Sites</option>
              {sites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <h2 className="text-sm font-semibold text-slate-700">
          Top 5 Categories by Expense ({formatMonth(selectedMonth)} {siteFilter !== 'all' ? `• ${siteLabel}` : ''})
        </h2>

        {chartData.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-gray-500 text-sm border border-dashed border-gray-300 rounded-lg">
            No expense data for this month and site
          </div>
        ) : (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 8, right: 24, left: 80, bottom: 8 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  type="number"
                  tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                  tick={{ fontSize: 12 }}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={70}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip
                  formatter={(value: number) => [`₹${value.toLocaleString('en-IN')}`, 'Amount']}
                  contentStyle={{ fontSize: 12 }}
                />
                <Bar dataKey="amount" name="Amount" radius={[0, 4, 4, 0]}>
                  {chartData.map((_, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  )
}