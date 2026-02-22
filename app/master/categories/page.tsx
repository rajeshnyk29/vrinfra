import { getCategories } from './actions'
import CategoriesClient from './CategoriesClient'

export const dynamic = 'force-dynamic'

export default async function CategoriesPage() {
  const initialCategories = await getCategories()
  return <CategoriesClient initialCategories={initialCategories} />
}
