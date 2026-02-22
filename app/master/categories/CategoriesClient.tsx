'use client'

import { useState } from 'react'
import Link from 'next/link'
import { getCategories, addCategory as addCategoryAction, deleteCategory as deleteCategoryAction } from './actions'

type Category = { id: string; name: string }

export default function CategoriesClient({ initialCategories }: { initialCategories: Category[] }) {
  const [categories, setCategories] = useState<Category[]>(initialCategories)
  const [newName, setNewName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function loadCategories() {
    try {
      const data = await getCategories()
      setCategories(data)
      setError(null)
    } catch (err: any) {
      console.error('Error loading categories:', err)
      setError(err?.message || 'Failed to load categories')
    }
  }

  async function addCategory(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim()) return

    setSaving(true)
    setError(null)

    try {
      await addCategoryAction(newName.trim())
      setNewName('')
      await loadCategories()
    } catch (err: any) {
      console.error('Error adding category:', err)
      setError(err?.message || 'Failed to add category')
    } finally {
      setSaving(false)
    }
  }

  async function deleteCategory(id: string) {
    if (!confirm('Delete?')) return

    setError(null)

    try {
      await deleteCategoryAction(id)
      await loadCategories()
    } catch (err: any) {
      console.error('Error deleting category:', err)
      setError(err?.message || 'Failed to delete category')
    }
  }

  return (
    <div className="p-4 max-w-md mx-auto">
      <Link href="/master" className="text-sm text-blue-600 hover:text-blue-800 mb-2 block font-medium">← Back to Master Data</Link>
      <h1 className="text-xl font-bold mb-4">Categories</h1>

      {error && (
        <div className="mb-4 p-2 bg-red-100 border border-red-400 text-red-700 rounded text-sm">
          {error}
        </div>
      )}

      <form onSubmit={addCategory} className="flex gap-2 mb-4">
        <input
          value={newName}
          onChange={e => setNewName(e.target.value)}
          placeholder="e.g. Labour payment, Cement"
          className="flex-1 border p-2 rounded text-sm"
        />
        <button type="submit" disabled={saving} className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium disabled:opacity-50">
          {saving ? 'Adding...' : 'Add'}
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
