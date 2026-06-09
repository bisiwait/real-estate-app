import { NextResponse } from 'next/server'
import { isAdmin } from '@/lib/admin'

export async function assertAdminApi() {
    const ok = await isAdmin()
    if (!ok) {
        return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
    }
    return { error: null as null }
}
