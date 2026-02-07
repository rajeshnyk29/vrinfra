'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '../../../lib/supabase'

type Vendor = { id: string; name: string }

export default function VendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [newName, setNewName] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadVendors() }, [])

  async function loadVendors() {
    const { data } = await supabase.from('vendors').select('id, name').order('name')
    setVendors(data || [])
  }

  async function addVendor(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim()) return
    setSaving(true)
    await supabase.from('vendors').insert({ name: newName.trim() })
    setNewName('')
    loadVendors()
    setSaving(false)
  }

  async function deleteVendor(id: string) {
    if (!confirm('Delete?')) return
    await supabase.from('vendors').delete().eq('id', id)
    loadVendors()
  }

  return (
    <div className="p-4 max-w-md mx-auto">
      <Link href="/master" className="text-sm text-blue-600 mb-2 block">← Master Data</Link>
      <h1 className="text-xl font-bold mb-4">Vendors</h1>
      <form onSubmit={addVendor} className="flex gap-2 mb-4">
        <input
          value={newName}
          onChange={e => setNewName(e.target.value)}
          placeholder="e.g. Balaji Fuels"
          className="flex-1 border p-2 rounded text-sm"
        />
        <button type="submit" disabled={saving} className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium">
          Add
        </button>
      </form>
      <ul className="space-y-2">
        {vendors.map(v => (
          <li key={v.id} className="flex justify-between items-center p-2 border rounded bg-white">
            <span className="text-sm">{v.name}</span>
            <button onClick={() => deleteVendor(v.id)} className="text-red-600 text-xs">Delete</button>
          </li>
        ))}
      </ul>
    </div>
  )
}