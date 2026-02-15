'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '../lib/supabaseClient'
import ProfileButton from './components/ProfileButton'
import { getMyRole } from './actions'

export default function HomePage() {
  const router = useRouter()
  const [orgName, setOrgName] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<'admin' | 'user' | null>(null)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    total: 0,
    open: 0,
    closed: 0,
    totalAmount: 0,
    totalPaid: 0
  })

  useEffect(() => {
    async function checkAuthAndLoadStats() {
      try {
        const { data: { session } } = await supabase.auth.getSession()

        if (!session) {
          router.push('/signin')
          return
        }

        const [orgRes, expensesRes, role] = await Promise.all([
          supabase.from('organizations').select('name').single(),
          supabase.from('expenses').select('total_amount, paid_amount, balance_amount, status'),
          getMyRole()
        ])

        setOrgName(orgRes.data?.name ?? null)
        setUserRole(role ?? null)

        const expenses = expensesRes.data ?? []
        const total = expenses.length
        const open = expenses.filter((e: { status: string }) => e.status === 'OPEN').length
        const closed = expenses.filter((e: { status: string }) => e.status === 'CLOSED').length
        const totalAmount = expenses.reduce((sum: number, e: { total_amount?: number }) => sum + (e.total_amount ?? 0), 0)
        const totalPaid = expenses.reduce((sum: number, e: { paid_amount?: number }) => sum + (e.paid_amount ?? 0), 0)

        setStats({ total, open, closed, totalAmount, totalPaid })
      } catch {
        router.push('/signin')
      } finally {
        setLoading(false)
      }
    }

    checkAuthAndLoadStats()
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-lg">Loading...</div>
      </div>
    )
  }

  const isMasterLocked = userRole !== 'admin'

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:48px_48px]" />

      <div className="relative p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Expense Manager
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Manage Expenses, track payments and view analytics
            </p>
          </div>
          <ProfileButton />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          <Link
            href="/expenses/new"
            className="group block p-6 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10 hover:bg-white/15 hover:border-white/20 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-emerald-500/10"
          >
            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center mb-4 group-hover:bg-emerald-500/30 transition-colors">
              <span className="text-2xl">➕</span>
            </div>
            <h2 className="text-lg font-bold text-white mb-1">Create New Expense</h2>
            <p className="text-sm text-slate-400 mb-4">
              Add invoice, payment proof
            </p>
            <span className="text-xs text-emerald-400 font-medium group-hover:underline">
              Add Expense →
            </span>
          </Link>

          <Link
            href="/dashboard"
            className="group block p-6 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10 hover:bg-white/15 hover:border-white/20 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-indigo-500/10"
          >
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center mb-4 group-hover:bg-amber-500/30 transition-colors">
              <span className="text-2xl">📊</span>
            </div>
            <h2 className="text-lg font-bold text-white mb-1">Dashboard</h2>
            <p className="text-sm text-slate-400 mb-4">
              View all expenses, filter by status
            </p>
            <span className="text-xs text-amber-400 font-medium group-hover:underline">
              Open Dashboard →
            </span>
          </Link>

          {isMasterLocked ? (
            <div
              className="block p-6 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 opacity-75 cursor-not-allowed"
              title="Only organization admin can access"
            >
              <div className="w-12 h-12 rounded-xl bg-slate-500/20 flex items-center justify-center mb-4">
                <span className="text-2xl">🔒</span>
              </div>
              <h2 className="text-lg font-bold text-slate-400 mb-1 flex items-center gap-2">
                Master Data
                <span className="text-sm font-normal">(admin only)</span>
              </h2>
              <p className="text-sm text-slate-500 mb-4">
                Categories, Sites, Vendors, Users
              </p>
              <span className="text-xs text-slate-500">
                Only organization admin can access
              </span>
            </div>
          ) : (
            <Link
              href="/master"
              className="group block p-6 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10 hover:bg-white/15 hover:border-white/20 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-blue-500/10"
            >
              <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center mb-4 group-hover:bg-blue-500/30 transition-colors">
                <span className="text-2xl">📁</span>
              </div>
              <h2 className="text-lg font-bold text-white mb-1">Master Data</h2>
              <p className="text-sm text-slate-400 mb-4">
                Categories, Sites, Vendors, Users
              </p>
              <span className="text-xs text-blue-400 font-medium group-hover:underline">
                Manage Master →
              </span>
            </Link>
          )}

          <Link
            href="/analytics"
            className="group block p-6 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10 hover:bg-white/15 hover:border-white/20 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-violet-500/10"
          >
            <div className="w-12 h-12 rounded-xl bg-violet-500/20 flex items-center justify-center mb-4 group-hover:bg-violet-500/30 transition-colors">
              <span className="text-2xl">📈</span>
            </div>
            <h2 className="text-lg font-bold text-white mb-1">Analytics</h2>
            <p className="text-sm text-slate-400 mb-3">
              Summary of your expenses
            </p>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-300">
                <span>Total Expenses</span>
                <span className="font-semibold text-white">{stats.total}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Open</span>
                <span className="font-semibold text-amber-400">{stats.open}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Closed</span>
                <span className="font-semibold text-emerald-400">{stats.closed}</span>
              </div>
              <div className="flex justify-between text-slate-300 pt-1 border-t border-white/10">
                <span>Total Amount</span>
                <span className="font-bold text-white">₹{stats.totalAmount.toLocaleString('en-IN')}</span>
              </div>
            </div>
            <span className="text-xs text-violet-400 font-medium mt-3 inline-block group-hover:underline">
              View Analytics →
            </span>
          </Link>
        </div>
      </div>
    </div>
  )
}