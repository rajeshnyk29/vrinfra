import { getVendors } from './actions'
import VendorsClient from './VendorsClient'

export const dynamic = 'force-dynamic'

export default async function VendorsPage() {
  const initialVendors = await getVendors()
  return <VendorsClient initialVendors={initialVendors} />
}
