import Link from 'next/link'
import { createServerSupabase } from '../../../../lib/supabase-server'
import { supabaseService } from '../../../../lib/supabase'
import { redirect } from 'next/navigation'
import { FormattedPaymentDate } from './FormattedPaymentDate'

export const dynamic = 'force-dynamic'

export default async function Page(props: any) {
  const params = await props.params
  const expenseNo = params.id

  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/signin')

  const expRes = await supabase
    .from('expenses')
    .select('id, expense_no, org_id')
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
  const orgId = expRes.data.org_id

  const { data: payments, error } = await supabase
    .from('expense_payments')
    .select('*')
    .eq('expense_id', expenseId)
    .order('paid_date', { ascending: false })

  const userIds = [...new Set((payments || []).map((p: any) => p.added_by_user_id).filter(Boolean))]
  const realUserIds = userIds.filter((id: string) => !id?.startsWith?.('mock-'))
  const { data: usersData } = realUserIds.length > 0 && orgId
    ? await supabaseService.from('users').select('id, email, name').in('id', realUserIds).eq('org_id', orgId)
    : { data: [] }

  const userNames: Record<string, string> = {}
  ;(usersData || []).forEach((u: any) => {
    if (u.id) userNames[u.id] = u.name || u.email || 'Unknown'
  })

  return (
    <div className="p-4 max-w-md mx-auto">
      <Link
        href="/dashboard"
        className="inline-flex gap-2 text-sm text-blue-600 hover:text-blue-800 mb-3 block font-medium"
      >
        ← Back to Dashboard
      </Link>
      <h1 className="text-xl font-bold mb-4">Payment History – {expenseNo}</h1>
      {error && <p className="text-red-600 text-sm mb-2">Failed to load payments.</p>}
      <ul className="space-y-3">
        {(payments || []).map((p: any) => (
          <li key={p.id} className="p-3 border rounded bg-white">
            <div className="flex justify-between text-sm">
              <span className="font-medium">₹{Number(p.amount).toLocaleString('en-IN')}</span>
              <FormattedPaymentDate isoString={p.created_at || p.paid_date} />
            </div>
            <div className="text-xs text-slate-500 mt-1">{p.payment_mode}</div>
            {p.added_by_user_id && (
              <div className="text-xs text-slate-500 mt-0.5">
                Added by: {userNames[p.added_by_user_id] ?? p.added_by_name ?? 'Unknown'}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}