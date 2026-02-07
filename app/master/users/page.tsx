'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '../../../lib/supabase'

type User = { id: string; name: string }

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [newName, setNewName] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadUsers() }, [])

  async function loadUsers() {
    const { data } = await supabase.from('users').select('id, name').order('name')
    setUsers(data || [])
  }

  async function addUser(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim()) return
    setSaving(true)
    await supabase.from('users').insert({ name: newName.trim() })
    setNewName('')
    loadUsers()
    setSaving(false)
  }

  async function deleteUser(id: string) {
    if (!confirm('Delete?')) return
    await supabase.from('users').delete().eq('id', id)
    loadUsers()
  }

  return (
    <div className="p-4 max-w-md mx-auto">
      <Link href="/master" className="text-sm text-blue-600 mb-2 block">← Master Data</Link>
      <h1 className="text-xl font-bold mb-4">Users</h1>
      <form onSubmit={addUser} className="flex gap-2 mb-4">
        <input
          value={newName}
          onChange={e => setNewName(e.target.value)}
          placeholder="e.g. Rithesh, Vineet"
          className="flex-1 border p-2 rounded text-sm"
        />
        <button type="submit" disabled={saving} className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium">
          Add
        </button>
      </form>
      <ul className="space-y-2">
        {users.map(u => (
          <li key={u.id} className="flex justify-between items-center p-2 border rounded bg-white">
            <span className="text-sm">{u.name}</span>
            <button onClick={() => deleteUser(u.id)} className="text-red-600 text-xs">Delete</button>
          </li>
        ))}
      </ul>
    </div>
  )
}