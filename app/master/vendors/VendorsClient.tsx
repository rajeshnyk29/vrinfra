'use client'

import { useState } from 'react'
import Link from 'next/link'
import { getVendors, addVendor as addVendorAction, deleteVendor as deleteVendorAction } from './actions'

type Vendor = { id: string; name: string }

export default function VendorsClient({ initialVendors }: { initialVendors: Vendor[] }) {
  const [vendors, setVendors] = useState<Vendor[]>(initialVendors)
  const [newName, setNewName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function loadVendors() {
    try {
      const data = await getVendors()
      setVendors(data)
      setError(null)
    } catch (err: any) {
      console.error('Error loading vendors:', err)
      setError(err?.message || 'Failed to load vendors')
    }
  }

  async function addVendor(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim()) return

    setSaving(true)
    setError(null)

    try {
      await addVendorAction(newName.trim())
      setNewName('')
      await loadVendors()
    } catch (err: any) {
      console.error('Error adding vendor:', err)
      setError(err?.message || 'Failed to add vendor')
    } finally {
      setSaving(false)
    }
  }

  async function deleteVendor(id: string) {
    if (!confirm('Delete?')) return

    setError(null)

    try {
      await deleteVendorAction(id)
      await loadVendors()
    } catch (err: any) {
      console.error('Error deleting vendor:', err)
      setError(err?.message || 'Failed to delete vendor')
    }
  }

  return (
    <div className="p-4 max-w-md mx-auto">
      <Link href="/master" className="text-sm text-blue-600 hover:text-blue-800 mb-2 block font-medium">← Back to Master Data</Link>
      <h1 className="text-xl font-bold mb-4">Vendors</h1>

      {error && (
        <div className="mb-4 p-2 bg-red-100 border border-red-400 text-red-700 rounded text-sm">
          {error}
        </div>
      )}

      <form onSubmit={addVendor} className="flex gap-2 mb-4">
        <input
          value={newName}
          onChange={e => setNewName(e.target.value)}
          placeholder="e.g. Balaji Fuels"
          className="flex-1 border p-2 rounded text-sm"
        />
        <button type="submit" disabled={saving} className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium disabled:opacity-50">
          {saving ? 'Adding...' : 'Add'}
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
