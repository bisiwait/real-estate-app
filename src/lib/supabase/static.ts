import { createClient as createBaseClient } from '@supabase/supabase-js'

/**
 * Creates a Supabase client that doesn't use cookies.
 * This is safe for both Server and Client Components to fetch PUBLIC data.
 * It will NOT have access to the user's session.
 */
export function createStaticClient() {
    return createBaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
}
