'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '../lib/supabaseClient'
import ProfileButton from './components/ProfileButton'

export default function HomePage() {
  const router = useRouter()
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
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        router.push('/signin')
        return
      }

      // Load stats
      const { data: expenses } = await supabase
        .from('expenses')
        .select('total_amount, paid_amount, balance_amount, status')

      const total = expenses?.length ?? 0
      const open = expenses?.filter(e => e.status === 'OPEN').length ?? 0
      const closed = expenses?.filter(e => e.status === 'CLOSED').length ?? 0
      const totalAmount = expenses?.reduce((sum, e) => sum + (e.total_amount ?? 0), 0) ?? 0
      const totalPaid = expenses?.reduce((sum, e) => sum + (e.paid_amount ?? 0), 0) ?? 0

      setStats({ total, open, closed, totalAmount, totalPaid })
      setLoading(false)
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900">
      {/* Subtle grid pattern overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:48px_48px]" />

      <div className="relative p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              VR Infra Expense Manager
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Manage Expenses, track payments and view analytics
            </p>
          </div>
          <ProfileButton />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          {/* Create New Expense Card */}
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

          {/* Dashboard Card */}
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

          {/* Master Data Card */}
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

          {/* Analytics Card */}
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