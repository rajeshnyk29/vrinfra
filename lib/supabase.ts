import { createClient } from '@supabase/supabase-js'

// Read env safely
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const service = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

// Create clients only if keys exist
export const supabase = createClient(
  url || 'https://placeholder',
  anon || 'placeholder'
)

export const supabaseService = createClient(
  url || 'https://placeholder',
  service || 'placeholder'
)
