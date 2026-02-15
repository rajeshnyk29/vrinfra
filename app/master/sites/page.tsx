'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '../../../lib/supabase'
import { addSite as addSiteAction, deleteSite as deleteSiteAction } from './actions'

type Site = { id: string; name: string }

export default function SitesPage() {
  const [sites, setSites] = useState<Site[]>([])
  const [newName, setNewName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { loadSites() }, [])

  async function loadSites() {
    const { data, error } = await supabase.from('sites').select('id, name').order('name')
    if (error) {
      console.error('Error loading sites:', error)
      setError('Failed to load sites')
    } else {
      setSites(data || [])
      setError(null)
    }
  }

  async function addSite(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim()) return

    setSaving(true)
    setError(null)

    try {
      await addSiteAction(newName.trim())
      setNewName('')
      await loadSites()
    } catch (err: any) {
      console.error('Error adding site:', err)
      setError(err.message || 'Failed to add site')
    } finally {
      setSaving(false)
    }
  }

  async function deleteSite(id: string) {
    if (!confirm('Delete this site?')) return

    setError(null)

    try {
      await deleteSiteAction(id)
      await loadSites()
    } catch (err: any) {
      console.error('Error deleting site:', err)
      setError(err.message || 'Failed to delete site')
    }
  }

  return (
    <div className="p-4 max-w-md mx-auto">
      <Link href="/master" className="text-sm text-blue-600 hover:text-blue-800 mb-2 block font-medium">← Back to Master Data</Link>
      <h1 className="text-xl font-bold mb-4">Sites</h1>

      {error && (
        <div className="mb-4 p-2 bg-red-100 border border-red-400 text-red-700 rounded text-sm">
          {error}
        </div>
      )}

      <form onSubmit={addSite} className="flex gap-2 mb-4">
        <input
          value={newName}
          onChange={e => setNewName(e.target.value)}
          placeholder="e.g. PNC, GR Infra, DRN"
          className="flex-1 border p-2 rounded text-sm"
        />
        <button type="submit" disabled={saving} className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium disabled:opacity-50">
          {saving ? 'Adding...' : 'Add'}
        </button>
      </form>

      <ul className="space-y-2">
        {sites.map(s => (
          <li key={s.id} className="flex justify-between items-center p-2 border rounded bg-white">
            <span className="text-sm">{s.name}</span>
            <button onClick={() => deleteSite(s.id)} className="text-red-600 text-xs">Delete</button>
          </li>
        ))}
      </ul>
    </div>
  )
}