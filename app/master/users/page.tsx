'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '../../../lib/supabase'
import { inviteUser } from './actions'

type User = { id: string; email: string; name: string | null; role: string | null }

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [email, setEmail] = useState('')
  const [saving, setSaving] = useState(false)
  const [inviteSuccess, setInviteSuccess] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)

  useEffect(() => {
    loadUsers()
  }, [])

  async function loadUsers() {
    const { data } = await supabase
      .from('users')
      .select('id, email, name, role')
      .order('email')
    setUsers(data || [])
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    setInviteError(null)
    setInviteSuccess(false)

    const trimmed = email.trim().toLowerCase()
    if (!trimmed) return

    setSaving(true)
    const result = await inviteUser(trimmed)
    setSaving(false)

    if (!result.ok) {
      setInviteError(result.error || 'Failed to send invitation')
      return
    }

    setInviteSuccess(true)
    setEmail('')
    loadUsers()
  }

  async function deleteUser(id: string) {
    if (!confirm('Delete this invite/user?')) return
    await supabase.from('users').delete().eq('id', id)
    loadUsers()
  }

  return (
    <div className="p-4 max-w-md mx-auto">
      <Link href="/master" className="text-sm text-blue-600 hover:text-blue-800 mb-2 block font-medium">
        ← Back to Master Data
      </Link>

      <h1 className="text-xl font-bold mb-2">Users</h1>
      <p className="text-xs text-slate-600 mb-3">
        Add email to send an invitation. User will confirm via email and
        complete signup with name &amp; password.
      </p>

      <form onSubmit={handleInvite} className="flex flex-col gap-2 mb-3">
        <div className="flex gap-2">
          <input
            type="email"
            value={email}
            onChange={e => {
              setEmail(e.target.value)
              setInviteSuccess(false)
              setInviteError(null)
            }}
            placeholder="e.g. user@example.com"
            className="flex-1 border p-2 rounded text-sm"
          />
          <button
            type="submit"
            disabled={saving}
            className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium disabled:opacity-60"
          >
            {saving ? 'Inviting...' : 'Invite'}
          </button>
        </div>

        {inviteSuccess && (
          <div className="flex items-center gap-2 text-xs text-emerald-600">
            <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-emerald-500 text-white text-[10px]">
              ✓
            </span>
            <span>Invitation sent.</span>
          </div>
        )}

        {inviteError && (
          <div className="text-xs text-red-600">
            {inviteError}
          </div>
        )}
      </form>

      <ul className="space-y-2">
        {users.map(u => (
          <li
            key={u.id}
            className="flex justify-between items-center p-2 border rounded bg-white"
          >
            <div className="flex flex-col">
              <span className="text-sm">{u.email}</span>
              {u.name && (
                <span className="text-xs text-slate-500">
                  {u.name}{u.role ? ` · ${u.role}` : ''}
                </span>
              )}
            </div>
            <button
              onClick={() => deleteUser(u.id)}
              className="text-red-600 text-xs"
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}