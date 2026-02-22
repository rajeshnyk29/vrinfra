import { getDashboardData } from './actions'
import { DashboardContent } from './DashboardContent'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const data = await getDashboardData()

  if (!data.ok) {
    const errorMessage = 'error' in data ? data.error : 'Failed to load dashboard'
    return (
      <div className="p-4">
        <h1 className="text-xl font-bold mb-3">Dashboard</h1>
        <div className="text-red-600">{errorMessage}</div>
      </div>
    )
  }

  return (
    <DashboardContent
      expenses={data.expenses}
      sites={data.sites}
      paymentsByExpenseId={data.paymentsByExpenseId}
      siteMap={data.siteMap}
      categoryMap={data.categoryMap}
      vendorMap={data.vendorMap}
    />
  )
}
