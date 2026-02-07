'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '../../../lib/supabase'

type Site = { id: string; name: string }

export default function SitesPage() {
  const [sites, setSites] = useState<Site[]>([])
  const [newName, setNewName] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadSites() }, [])

  async function loadSites() {
    const { data } = await supabase.from('sites').select('id, name').order('name')
    setSites(data || [])
  }

  async function addSite(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim()) return
    setSaving(true)
    await supabase.from('sites').insert({ name: newName.trim() })
    setNewName('')
    loadSites()
    setSaving(false)
  }

  async function deleteSite(id: string) {
    if (!confirm('Delete?')) return
    await supabase.from('sites').delete().eq('id', id)
    loadSites()
  }

  return (
    <div className="p-4 max-w-md mx-auto">
      <Link href="/master" className="text-sm text-blue-600 mb-2 block">← Master Data</Link>
      <h1 className="text-xl font-bold mb-4">Sites</h1>
      <form onSubmit={addSite} className="flex gap-2 mb-4">
        <input
          value={newName}
          onChange={e => setNewName(e.target.value)}
          placeholder="e.g. PNC, GR Infra, DRN"
          className="flex-1 border p-2 rounded text-sm"
        />
        <button type="submit" disabled={saving} className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium">
          Add
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