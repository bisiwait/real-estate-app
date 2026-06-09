import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { assertAdminApi } from '@/lib/admin/api-auth'

/** 管理者: ユーザー一覧（プロフィール + 物件数） */
export async function GET() {
    const gate = await assertAdminApi()
    if (gate.error) return gate.error

    try {
        const admin = await createAdminClient()
        const [{ data: profiles, error: profilesError }, { data: propertyRows, error: propsError }] =
            await Promise.all([
                admin.from('profiles').select('*').order('updated_at', { ascending: false }),
                admin.from('properties').select('user_id'),
            ])

        if (profilesError) {
            console.error('[api/admin/users] GET profiles', profilesError)
            return NextResponse.json({ error: profilesError.message }, { status: 500 })
        }
        if (propsError) {
            console.error('[api/admin/users] GET properties', propsError)
            return NextResponse.json({ error: propsError.message }, { status: 500 })
        }

        const countByUser = new Map<string, number>()
        for (const row of propertyRows ?? []) {
            const uid = row.user_id as string
            if (uid) countByUser.set(uid, (countByUser.get(uid) ?? 0) + 1)
        }

        const users = (profiles ?? []).map((user) => ({
            ...user,
            property_count: countByUser.get(user.id as string) ?? 0,
        }))

        return NextResponse.json({ users })
    } catch (e) {
        console.error('[api/admin/users] GET unexpected', e)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
