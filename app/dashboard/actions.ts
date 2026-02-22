'use server'

import { createServerSupabase } from '../../lib/supabase-server'
import { getCurrentUserOrgId } from '../../lib/auth'
import { supabaseService } from '../../lib/supabase'

export type DashboardExpense = {
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
}

export type DashboardSite = { id: string; name: string }
export type DashboardCategory = { id: string; name: string }
export type DashboardVendor = { id: string; name: string }

export type DashboardData = {
  ok: true
  expenses: DashboardExpense[]
  sites: DashboardSite[]
  categories: DashboardCategory[]
  vendors: DashboardVendor[]
  paymentsByExpenseId: Record<string, { proof_url: string }[]>
  siteMap: Record<string, string>
  categoryMap: Record<string, string>
  vendorMap: Record<string, string>
} | { ok: false; error: string }

export async function getDashboardData(): Promise<DashboardData> {
  try {
    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { ok: false, error: 'Please sign in to view the dashboard.' }
    }

    const orgId = await getCurrentUserOrgId()
    if (!orgId) {
      return { ok: false, error: 'Organization not found. Please try signing in again.' }
    }

    const [
      expensesRes,
      sitesRes,
      categoriesRes,
      vendorsRes,
      paymentsRes,
    ] = await Promise.all([
      supabaseService.from('expenses').select('*').eq('org_id', orgId).order('expense_no', { ascending: false }).limit(300),
      supabaseService.from('sites').select('id, name'),
      supabaseService.from('categories').select('id, name'),
      supabaseService.from('vendors').select('id, name'),
      supabaseService.from('expense_payments').select('expense_id, proof_url, paid_date').eq('org_id', orgId).order('paid_date', { ascending: true }),
    ])

    if (expensesRes.error) {
      return { ok: false, error: expensesRes.error.message }
    }

    const expenses = expensesRes.data || []
    const sites = sitesRes.data || []
    const categories = categoriesRes.data || []
    const vendors = vendorsRes.data || []
    const payments = paymentsRes.data || []

    const paymentsByExpenseId: Record<string, { proof_url: string }[]> = {}
    payments.forEach((row: { expense_id?: string; proof_url?: string }) => {
      if (row.expense_id) {
        if (!paymentsByExpenseId[row.expense_id]) {
          paymentsByExpenseId[row.expense_id] = []
        }
        paymentsByExpenseId[row.expense_id].push({ proof_url: row.proof_url || '' })
      }
    })

    const siteMap: Record<string, string> = {}
    sites.forEach((s: { id: string; name: string }) => { siteMap[s.id] = s.name })
    const categoryMap: Record<string, string> = {}
    categories.forEach((c: { id: string; name: string }) => { categoryMap[c.id] = c.name })
    const vendorMap: Record<string, string> = {}
    vendors.forEach((v: { id: string; name: string }) => { vendorMap[v.id] = v.name })

    return {
      ok: true,
      expenses,
      sites,
      categories,
      vendors,
      paymentsByExpenseId,
      siteMap,
      categoryMap,
      vendorMap,
    }
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Failed to load dashboard'
    return { ok: false, error: message }
  }
}