import { createBrowserClient } from '@supabase/ssr'

// Client-side Supabase client (gunakan di 'use client' components)
export function createClient() {
  return createBrowserClient<any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
