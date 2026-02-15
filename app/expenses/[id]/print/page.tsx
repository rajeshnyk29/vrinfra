import Link from 'next/link'
import { supabase } from '../../../../lib/supabaseClient'
import { redirect } from 'next/navigation'
import { PrintButton } from './PrintButton'

export const dynamic = 'force-dynamic'

function fmtDate(s: string | null | undefined) {
  if (!s) return 'N/A'
  try {
    return new Date(s).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  } catch { return s }
}

export default async function PrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: expenseNo } = await params
  if (!expenseNo) redirect('/dashboard')

  const expRes = await supabase
    .from('expenses')
    .select('*')
    .eq('expense_no', expenseNo)
    .single()

  if (expRes.error || !expRes.data) {
    return (
      <div className="p-4">
        <h1 className="text-xl font-bold mb-3">Print – {expenseNo}</h1>
        <div className="text-red-600">{expRes.error?.message || 'Expense not found'}</div>
      </div>
    )
  }

  const exp = expRes.data
  const siteRes = exp.site_id ? await supabase.from('sites').select('name').eq('id', exp.site_id).single() : { data: null }
  const catRes = exp.category_id ? await supabase.from('categories').select('name').eq('id', exp.category_id).single() : { data: null }
  const venRes = exp.vendor_id ? await supabase.from('vendors').select('name').eq('id', exp.vendor_id).single() : { data: null }

  const { data: payments } = await supabase
    .from('expense_payments')
    .select('amount, payment_mode, proof_url, paid_date')
    .eq('expense_id', exp.id)
    .order('paid_date', { ascending: true })

  const siteName = siteRes.data?.name || 'Unassigned'
  const catName = catRes.data?.name || '—'
  const venName = venRes.data?.name || '—'

  const images: { url: string; label: string }[] = []
  if (exp.bill_image_url) images.push({ url: exp.bill_image_url, label: 'Invoice' })
  ;(payments || []).forEach((p: { proof_url: string; amount: number; payment_mode: string }, i: number) => {
    if (p.proof_url) images.push({ url: p.proof_url, label: `₹${p.amount} ${p.payment_mode}` })
  })

  const n = images.length
  const isThree = n === 3

  return (
    <>
      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 8mm; }
          .no-print { display: none !important; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
        .proof-img { width: 100%; max-height: 100%; object-fit: contain; border: 1px solid #ccc; }
        .dossier-side { background: #f8fafc; border-right: 1px solid #e2e8f0; }
        .print-one-page { max-height: 277mm; overflow: hidden; }
      `}</style>
      <div className="no-print p-4 bg-gray-100 min-h-screen">
        <div className="max-w-2xl mx-auto bg-white rounded shadow p-4">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 mb-3 block font-medium"
          >
            ← Back to Dashboard
          </Link>
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-lg font-bold">Print Preview – {expenseNo}</h1>
            <PrintButton />
          </div>
          <p className="text-sm text-gray-600">Fits one page. Click Print.</p>
        </div>
      </div>
      <div id="print-content" className="print-one-page flex border border-gray-200">
        <aside className="dossier-side w-[22%] min-w-[42mm] p-2 flex flex-col gap-1.5 text-[9px] shrink-0">
          <div className="font-bold text-[11px] tracking-tight">{expenseNo}</div>
          <div className={`px-1.5 py-0.5 rounded text-[8px] font-semibold w-fit ${exp.status === 'CLOSED' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>{exp.status}</div>
          <div className="border-t border-gray-200 pt-1.5 space-y-0.5">
            <div><span className="text-gray-500">Date</span><br />{fmtDate(exp.expense_date || exp.created_at)}</div>
            <div><span className="text-gray-500">Site</span><br />{siteName}</div>
            <div><span className="text-gray-500">Cat</span><br />{catName}</div>
            <div><span className="text-gray-500">Vendor</span><br />{venName}</div>
          </div>
          <div className="border-t border-gray-200 pt-1.5 font-semibold">
            <div>Total ₹{exp.total_amount}</div>
            <div>Paid ₹{exp.paid_amount}</div>
            <div className={exp.balance_amount === 0 ? 'text-green-700' : ''}>Bal ₹{exp.balance_amount} {exp.balance_amount === 0 ? '✓' : ''}</div>
          </div>
          {(payments && payments.length) > 0 && (
            <div className="border-t border-gray-200 pt-1.5">
              <div className="text-gray-500 mb-0.5">Payments</div>
              {(payments || []).map((p: { amount: number; payment_mode: string; paid_date: string }, i: number) => (
                <div key={i} className="text-[8px]">{fmtDate(p.paid_date)} ₹{p.amount} {p.payment_mode}</div>
              ))}
            </div>
          )}
          {exp.description && (
            <div className="border-t border-gray-200 pt-1.5">
              <div className="text-gray-500">Desc</div>
              <div className="text-[8px] line-clamp-4">{exp.description}</div>
            </div>
          )}
        </aside>
        <main className="flex-1 grid gap-1 p-1.5 min-w-0 min-h-0 overflow-hidden">
          {isThree ? (
            <>
              <div className="overflow-hidden" style={{ maxHeight: '135mm' }}>
                <div className="text-[9px] font-medium mb-0.5">{images[0].label}</div>
                <div style={{ height: '125mm' }} className="overflow-hidden">
                  <img src={images[0].url} alt="" className="proof-img" style={{ maxHeight: '125mm' }} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-1 overflow-hidden" style={{ maxHeight: '128mm' }}>
                {images.slice(1).map((img, i) => (
                  <div key={i} className="overflow-hidden">
                    <div className="text-[9px] font-medium mb-0.5">Proof {i + 1} · {img.label}</div>
                    <div style={{ height: '118mm' }} className="overflow-hidden">
                      <img src={img.url} alt="" className="proof-img" style={{ maxHeight: '118mm' }} />
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="grid gap-1 overflow-hidden" style={{ gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', maxHeight: '275mm' }}>
              {images.map((img, i) => (
                <div key={i} className="overflow-hidden min-h-0">
                  <div className="text-[9px] font-medium mb-0.5">{i === 0 ? img.label : `Proof ${i} · ${img.label}`}</div>
                  <div className="overflow-hidden" style={{ maxHeight: '125mm' }}>
                    <img src={img.url} alt="" className="proof-img" style={{ maxHeight: '125mm' }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </>
  )
}