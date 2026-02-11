'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'
import { checkCanSignUp } from './actions'

const inputClass = "w-full border border-gray-300 rounded-md px-2.5 py-1.5 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
const labelClass = "block text-xs font-semibold text-gray-700 mb-1"

export default function SignUpPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setMessage(null)

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    const { allowed, reason } = await checkCanSignUp(email)
    if (!allowed) {
      setError(reason)
      return
    }

    setLoading(true)

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name }
        }
      })

      if (signUpError) {
        setError(signUpError.message)
        return
      }

      if (data?.user?.identities?.length === 0) {
        setError('An account with this email already exists')
        return
      }

      if (data?.user?.confirmed_at) {
        setMessage('Account created! Redirecting...')
        router.push('/dashboard')
        router.refresh()
      } else {
        setMessage('Check your email for the confirmation link, then sign in.')
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to create account')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg shadow-slate-200/50 p-6 w-full max-w-md">
        <h1 className="text-xl font-bold text-slate-900 mb-1">Create Account</h1>
        <p className="text-xs text-slate-600 mb-4">Sign up to access VR Infra Expense</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={labelClass}>Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Rajesh Nayak"
              className={inputClass}
              required
            />
          </div>

          <div>
            <label className={labelClass}>Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="e.g. rajesh.nyk29@gmail.com"
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

          {message && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-3 py-2 rounded-lg text-xs">
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-semibold text-sm disabled:opacity-60 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p className="mt-4 text-xs text-slate-600 text-center">
          Already have an account?{' '}
          <Link href="/signin" className="text-blue-600 hover:underline font-medium">Sign in</Link>
        </p>
      </div>
    </div>
  )
}