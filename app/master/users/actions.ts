'use server'

import { supabaseService } from '../../../lib/supabase'

type InviteResult = { ok: boolean; error?: string }

export async function inviteUser(email: string): Promise<InviteResult> {
  const normalizedEmail = email.trim().toLowerCase()

  if (!normalizedEmail) {
    return { ok: false, error: 'Email is required' }
  }

  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!re.test(normalizedEmail)) {
    return { ok: false, error: 'Please enter a valid email' }
  }

  const { error: upsertError } = await supabaseService
    .from('users')
    .upsert(
      { email: normalizedEmail },
      { onConflict: 'email' }
    )

  if (upsertError) {
    return { ok: false, error: upsertError.message }
  }

  const redirectBase =
    process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

  const { error: inviteError } =
    await supabaseService.auth.admin.inviteUserByEmail(
      normalizedEmail,
      {
        redirectTo: `${redirectBase}/signup/invite`
      }
    )

  if (inviteError) {
    return { ok: false, error: inviteError.message }
  }

  return { ok: true }
}