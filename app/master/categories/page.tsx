'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '../../../lib/supabase'

type Category = { id: string; name: string }

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [newName, setNewName] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadCategories() }, [])

  async function loadCategories() {
    const { data } = await supabase.from('categories').select('id, name').order('name')
    setCategories(data || [])
  }

  async function addCategory(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim()) return
    setSaving(true)
    await supabase.from('categories').insert({ name: newName.trim() })
    setNewName('')
    loadCategories()
    setSaving(false)
  }

  async function deleteCategory(id: string) {
    if (!confirm('Delete?')) return
    await supabase.from('categories').delete().eq('id', id)
    loadCategories()
  }

  return (
    <div className="p-4 max-w-md mx-auto">
      <Link href="/master" className="text-sm text-blue-600 mb-2 block">← Master Data</Link>
      <h1 className="text-xl font-bold mb-4">Categories</h1>
      <form onSubmit={addCategory} className="flex gap-2 mb-4">
        <input
          value={newName}
          onChange={e => setNewName(e.target.value)}
          placeholder="e.g. Labour payment, Cement"
          className="flex-1 border p-2 rounded text-sm"
        />
        <button type="submit" disabled={saving} className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium">
          Add
        </button>
      </form>
      <ul className="space-y-2">
        {categories.map(c => (
          <li key={c.id} className="flex justify-between items-center p-2 border rounded bg-white">
            <span className="text-sm">{c.name}</span>
            <button onClick={() => deleteCategory(c.id)} className="text-red-600 text-xs">Delete</button>
          </li>
        ))}
      </ul>
    </div>
  )
}