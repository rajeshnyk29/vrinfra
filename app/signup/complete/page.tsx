'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '../../../lib/supabaseClient'
import { completeAccount } from '../actions'

const inputClass = "w-full border border-gray-300 rounded-md px-2.5 py-1.5 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
const labelClass = "block text-xs font-semibold text-gray-700 mb-1"

export default function CompleteAccountPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    async function loadSession() {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user?.email) {
        setEmail(session.user.email)
        const metaName = session.user.user_metadata?.name
        if (metaName) setName(metaName)
      } else {
        router.replace('/signin')
        return
      }
      setChecking(false)
    }
    loadSession()
  }, [router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    const trimmedName = name.trim()
    if (!trimmedName) {
      setError('Name is required')
      return
    }

    setLoading(true)

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password,
        data: { name: trimmedName },
      })

      if (updateError) {
        setError(updateError.message)
        setLoading(false)
        return
      }

      const result = await completeAccount(trimmedName)
      if (!result.ok) {
        setError(result.error || 'Failed to save profile')
        setLoading(false)
        return
      }

      router.replace('/')
      router.refresh()
    } catch (err: any) {
      setError(err?.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  if (checking) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg shadow-slate-200/50 p-6 w-full max-w-md text-center">
          <div className="text-slate-600 text-sm">Loading...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg shadow-slate-200/50 p-6 w-full max-w-md">
        <h1 className="text-xl font-bold text-slate-900 mb-1">Complete your account</h1>
        <p className="text-xs text-slate-600 mb-4">Set your name and password to finish signing up.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={labelClass}>Email</label>
            <input
              type="email"
              value={email}
              readOnly
              className={inputClass + ' bg-slate-50 cursor-not-allowed'}
              aria-readonly
            />
          </div>

          <div>
            <label className={labelClass}>Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Your full name"
              className={inputClass}
              required
            />
          </div>

          <div>
            <label className={labelClass}>Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Create a password (min 6 characters)"
              className={inputClass}
              required
              minLength={6}
            />
          </div>

          <div>
            <label className={labelClass}>Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="Confirm your password"
              className={inputClass}
              required
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-xs">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-semibold text-sm disabled:opacity-60 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
          >
            {loading ? 'Saving...' : 'Complete account'}
          </button>
        </form>

        <p className="mt-4 text-xs text-slate-600 text-center">
          <Link href="/signin" className="text-blue-600 hover:underline font-medium">Back to Sign In</Link>
        </p>
      </div>
    </div>
  )
}