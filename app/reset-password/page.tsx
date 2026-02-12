'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '../../lib/supabaseClient'

const inputClass = "w-full border border-gray-300 rounded-md px-2.5 py-1.5 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
const labelClass = "block text-xs font-semibold text-gray-700 mb-1"

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isValidSession, setIsValidSession] = useState(false)

  useEffect(() => {
    async function checkSession() {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError || !session) {
          const hash = window.location.hash
          if (hash.includes('access_token')) {
            const params = new URLSearchParams(hash.substring(1))
            const accessToken = params.get('access_token')
            const refreshToken = params.get('refresh_token')
            
            if (accessToken && refreshToken) {
              const { error: setSessionError } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken
              })
              
              if (!setSessionError) {
                setIsValidSession(true)
                window.history.replaceState(null, '', window.location.pathname)
                return
              }
            }
          }
          
          setError('Invalid or expired reset link. Please request a new password reset.')
          return
        }
        
        setIsValidSession(true)
      } catch (err: any) {
        setError('Failed to verify reset link. Please try again.')
      }
    }

    checkSession()
  }, [])

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

    setLoading(true)

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: password
      })

      if (updateError) {
        setError(updateError.message)
        return
      }

      setSuccess(true)
      setTimeout(() => {
        router.push('/signin')
      }, 2000)
    } catch (err: any) {
      setError(err?.message || 'Failed to reset password')
    } finally {
      setLoading(false)
    }
  }

  if (!isValidSession && !error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg shadow-slate-200/50 p-6 w-full max-w-md">
          <div className="text-center">
            <div className="text-lg text-slate-600">Verifying reset link...</div>
          </div>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg shadow-slate-200/50 p-6 w-full max-w-md">
          <div className="text-center">
            <div className="w-14 h-14 rounded-full bg-green-500 flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl text-white">✓</span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 mb-2">Password Reset Successful</h1>
            <p className="text-xs text-slate-600 mb-4">Redirecting to sign in...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg shadow-slate-200/50 p-6 w-full max-w-md">
        <h1 className="text-xl font-bold text-slate-900 mb-1">Reset Password</h1>
        <p className="text-xs text-slate-600 mb-4">Enter your new password</p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-xs mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={labelClass}>New Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Minimum 6 characters"
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
              minLength={6}
            />
          </div>

          <button
            type="submit"
            disabled={loading || !isValidSession}
            className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-semibold text-sm disabled:opacity-60 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
          >
            {loading ? 'Resetting...' : 'Reset Password'}
          </button>
        </form>

        <p className="mt-4 text-xs text-slate-600 text-center">
          <Link href="/signin" className="text-blue-600 hover:underline font-medium">Back to Sign In</Link>
        </p>
      </div>
    </div>
  )
}