import { getUsersList } from './actions'
import UsersClient from './UsersClient'

export const dynamic = 'force-dynamic'

export default async function UsersPage() {
  const initialUsers = await getUsersList()
  return <UsersClient initialUsers={initialUsers} />
}
