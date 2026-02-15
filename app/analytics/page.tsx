import { createServerSupabase } from '../../lib/supabase-server'
import AnalyticsContent from './AnalyticsContent'

export const dynamic = 'force-dynamic'

type Site = { id: string; name: string }
type Category = { id: string; name: string }

type ExpenseRow = {
  id: string
  expense_date: string | null
  created_at?: string
  site_id: string | null
  category_id: string | null
  category: string | null
  total_amount: number
}

export default async function AnalyticsPage() {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return (
      <div className="p-4">
        <h1 className="text-xl font-bold mb-3">Analytics</h1>
        <div className="text-red-600">Please sign in to view analytics.</div>
      </div>
    )
  }

  const { data: expenses, error: expError } = await supabase
    .from('expenses')
    .select('id, expense_date, created_at, site_id, category_id, category, total_amount')

  const { data: sites } = await supabase
    .from('sites')
    .select('id, name')
    .order('name')

  const { data: categories } = await supabase
    .from('categories')
    .select('id, name')
    .order('name')

  if (expError) {
    return (
      <div className="p-4">
        <h1 className="text-xl font-bold mb-3">Analytics</h1>
        <div className="text-red-600">{expError.message}</div>
      </div>
    )
  }

  const siteMap: Record<string, string> = {}
  ;(sites || []).forEach((s: Site) => {
    siteMap[s.id] = s.name
  })

  const categoryMap: Record<string, string> = {}
  ;(categories || []).forEach((c: Category) => {
    categoryMap[c.id] = c.name
  })

  const expensesData = (expenses || []) as ExpenseRow[]

  return (
    <AnalyticsContent
      expenses={expensesData}
      sites={sites || []}
      siteMap={siteMap}
      categoryMap={categoryMap}
    />
  )
}