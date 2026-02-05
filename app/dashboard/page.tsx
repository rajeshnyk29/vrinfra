import { supabase } from '../../lib/supabaseClient'

export const dynamic = 'force-dynamic'

export default async function Dashboard() {

  const res = await supabase
    .from('expenses')
    .select('*')

  const data = res.data
  const error = res.error
  const status = res.status

  return (
    <div className="p-4">

      <h1 className="text-xl font-bold mb-2">
        Dashboard Debug
      </h1>

      <div className="bg-black text-green-300 p-3 text-xs">

        <div>STATUS: {status}</div>

        <div>
          ERROR: {error ? error.message : 'null'}
        </div>

        <pre>
          {JSON.stringify(data, null, 2)}
        </pre>

      </div>

    </div>
  )
}
