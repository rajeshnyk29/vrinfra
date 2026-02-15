import Link from 'next/link'
import { supabase } from '../../../../lib/supabaseClient'
import { supabaseService } from '../../../../lib/supabase'

export const dynamic = 'force-dynamic'

const MOCK_USER_NAMES: Record<string, string> = {
  'mock-1': 'Rajesh',
  'mock-2': 'Admin',
  'mock-3': 'Vineet',
}

function formatTimestamp(dateString: string | null | undefined): string {
  if (!dateString) return 'N/A'
  try {
    const date = new Date(dateString)
    const dateStr = date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
    const timeStr = date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
    return `${dateStr} at ${timeStr}`
  } catch {
    return dateString
  }
}

export default async function Page(props: any) {
  const params = await props.params
  const expenseNo = params.id

  const expRes = await supabase
    .from('expenses')
    .select('id, expense_no')
    .eq('expense_no', expenseNo)
    .maybeSingle()

  if (!expRes.data) {
    return (
      <div className="p-4">
        <h1 className="text-xl font-bold mb-3">Payment History – {expenseNo}</h1>
        <div className="text-red-600">Expense not found</div>
      </div>
    )
  }

  const expenseId = expRes.data.id

  const { data: payments, error } = await supabase
    .from('expense_payments')
    .select('*')
    .eq('expense_id', expenseId)
    .order('paid_date', { ascending: false })

  const userIds = [...new Set((payments || []).map((p: any) => p.added_by_user_id).filter(Boolean))]
  const realUserIds = userIds.filter((id: string) => !id?.startsWith?.('mock-'))
  const { data: usersData } = realUserIds.length > 0
    ? await supabaseService.from('users').select('id, email, name').in('id', realUserIds)
    : { data: [] }

  const userNames: Record<string, string> = { ...MOCK_USER_NAMES }
  ;(usersData || []).forEach((u: any) => {
    if (u.id) userNames[u.id] = u.name || u.email || 'Unknown'
  })

  return (
    <div className="p-4 max-w-md mx-auto">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 mb-3 block font-medium"
      >
        ← Back to Dashboard
      </Link>
      <h1 className="text-xl font-bold mb-4">Payment History – {expenseNo}</h1>

      {error && (
        <div className="text-red-600 mb-2">{error.message}</div>
      )}

      {payments?.length === 0 && (
        <p className="text-gray-500">No payments added yet</p>
      )}

      <div className="space-y-3">
        {(payments || []).map((p: any) => {
          const timestamp = formatTimestamp(p.paid_date || p.created_at)
          const addedByName = p.added_by_name || (p.added_by_user_id ? (userNames[p.added_by_user_id] || 'Unknown') : null)
          return (
            <div key={p.id} className="border rounded p-3">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-700">{timestamp}</div>
                  {addedByName && (
                    <div className="text-xs text-gray-500 mt-0.5">Added by: {addedByName}</div>
                  )}
                </div>
                <span className="font-bold text-lg">₹{p.amount}</span>
              </div>
              {p.payment_mode && (
                <p className="text-sm mt-1 text-gray-600">Mode: {p.payment_mode}</p>
              )}
              {p.proof_url && (
                <a
                  href={p.proof_url}
                  target="_blank"
                  className="text-blue-700 text-sm mt-2 inline-block"
                >
                  👁 View Proof
                </a>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}