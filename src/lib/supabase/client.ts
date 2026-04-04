import { createBrowserClient } from '@supabase/ssr'
import { SupabaseClient } from '@supabase/supabase-js'
import { getBrowserSupabasePublicConfig } from '@/lib/env/supabase-data-plane'

let client: SupabaseClient | undefined
let cachedUrl: string | undefined

export function createClient() {
  const { url, anonKey } = getBrowserSupabasePublicConfig()
  if (client && cachedUrl === url) return client

  client = createBrowserClient(url, anonKey, {
    auth: {
      persistSession: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
    },
  })
  cachedUrl = url

  return client
}

