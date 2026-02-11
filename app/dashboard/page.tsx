import { supabase } from '../../lib/supabaseClient'
import { DashboardContent } from './DashboardContent'

export const dynamic = 'force-dynamic'

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
}

type Site = { id: string; name: string }

type Category = { id: string; name: string }

type Vendor = { id: string; name: string }

export default async function Dashboard() {
  const { data: expenses, error } = await supabase
    .from('expenses')
    .select('*')
    .order('expense_no', { ascending: false })

  const { data: sites } = await supabase
    .from('sites')
    .select('id, name')

  const { data: categories } = await supabase
    .from('categories')
    .select('id, name')

  const { data: vendors } = await supabase
    .from('vendors')
    .select('id, name')

  const { data: payments } = await supabase
    .from('expense_payments')
    .select('expense_id, proof_url, paid_date')
    .order('paid_date', { ascending: true })

  const paymentsByExpenseId: Record<string, { proof_url: string }[]> = {}
  ;(payments || []).forEach((row: any) => {
    if (row.expense_id) {
      if (!paymentsByExpenseId[row.expense_id]) {
        paymentsByExpenseId[row.expense_id] = []
      }
      paymentsByExpenseId[row.expense_id].push({ proof_url: row.proof_url || '' })
    }
  })

  const siteMap: Record<string, string> = {}
  ;(sites || []).forEach((s: Site) => {
    siteMap[s.id] = s.name
  })

  const categoryMap: Record<string, string> = {}
  ;(categories || []).forEach((c: Category) => {
    categoryMap[c.id] = c.name
  })

  const vendorMap: Record<string, string> = {}
  ;(vendors || []).forEach((v: Vendor) => {
    vendorMap[v.id] = v.name
  })

  if (error) {
    return (
      <div className="p-4">
        <h1 className="text-xl font-bold mb-3">Dashboard</h1>
        <div className="text-red-600">{error.message}</div>
      </div>
    )
  }

  return (
    <DashboardContent
      expenses={expenses || []}
      sites={sites || []}
      paymentsByExpenseId={paymentsByExpenseId}
      siteMap={siteMap}
      categoryMap={categoryMap}
      vendorMap={vendorMap}
    />
  )
}