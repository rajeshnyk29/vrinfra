'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabaseClient'

type InviteStatus = 'processing' | 'success' | 'error'

export default function InviteSignUpPage() {
  const router = useRouter()
  const [status, setStatus] = useState<InviteStatus>('processing')
  const [message, setMessage] = useState<string>('Validating your invitation...')

  useEffect(() => {
    let cancelled = false

    async function handleInvite() {
      try {
        if (typeof window === 'undefined') return

        const hash = window.location.hash.startsWith('#')
          ? window.location.hash.slice(1)
          : window.location.hash
        const search = window.location.search.startsWith('?')
          ? window.location.search.slice(1)
          : window.location.search

        const hashParams = new URLSearchParams(hash)
        const queryParams = new URLSearchParams(search)

        const accessToken = hashParams.get('access_token') || queryParams.get('access_token')
        const refreshToken = hashParams.get('refresh_token') || queryParams.get('refresh_token')
        const type = hashParams.get('type') || queryParams.get('type')

        if (!accessToken || !refreshToken) {
          setStatus('error')
          setMessage('Invalid or expired invitation link. Please ask the admin to send a new invite.')
          return
        }

        if (type && type !== 'invite') {
          setStatus('error')
          setMessage('This link is not a valid invitation link.')
          return
        }

        setStatus('processing')
        setMessage('Activating your account...')

        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        })

        if (cancelled) return

        if (error) {
          console.error('Error setting Supabase session from invite:', error)
          setStatus('error')
          setMessage(error.message || 'Failed to activate your invitation. Please try again or request a new invite.')
          return
        }

        setStatus('success')
        setMessage('Your invitation has been accepted! Redirecting to complete your account...')

        setTimeout(() => {
          if (!cancelled) {
            router.replace('/signup/complete')
          }
        }, 1500)
      } catch (err: any) {
        if (cancelled) return
        console.error('Unexpected error handling invite:', err)
        setStatus('error')
        setMessage(err?.message || 'Something went wrong while processing your invitation.')
      }
    }

    handleInvite()

    return () => {
      cancelled = true
    }
  }, [router])

  const isProcessing = status === 'processing'
  const isError = status === 'error'
  const isSuccess = status === 'success'

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg shadow-slate-200/50 p-6 w-full max-w-md text-center">
        <h1 className="text-xl font-bold text-slate-900 mb-2">
          {isProcessing && 'Processing Invitation'}
          {isSuccess && 'Invitation Accepted'}
          {isError && 'Invitation Problem'}
        </h1>
        <p className="text-sm text-slate-600 mb-4">{message}</p>

        {isProcessing && (
          <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
            <div className="h-4 w-4 border-2 border-slate-300 border-t-blue-500 rounded-full animate-spin" />
            <span>Just a moment...</span>
          </div>
        )}

        {isError && (
          <div className="mt-4">
            <p className="text-xs text-slate-500">
              If this keeps happening, your invite link may have expired. Please contact the admin for a new invitation.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}