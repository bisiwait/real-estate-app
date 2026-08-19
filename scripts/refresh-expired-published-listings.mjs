/**
 * 公開中・承認済みで掲載期限切れの物件の expiry_date を延長する（運用用）。
 * 用法: node scripts/refresh-expired-published-listings.mjs
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const envPath = resolve(root, '.env.local')

function loadEnv() {
    const raw = readFileSync(envPath, 'utf8')
    const env = {}
    for (const line of raw.split('\n')) {
        const trimmed = line.trim()
        if (!trimmed || trimmed.startsWith('#')) continue
        const i = trimmed.indexOf('=')
        if (i <= 0) continue
        env[trimmed.slice(0, i)] = trimmed.slice(i + 1)
    }
    return env
}

function listingExpiryIsoFromNow(days = 30) {
    return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()
}

const env = loadEnv()
const url = env.NEXT_PUBLIC_SUPABASE_URL
const key = env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
    console.error('NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY が .env.local に必要です')
    process.exit(1)
}

const sb = createClient(url, key)
const now = new Date().toISOString()
const newExpiry = listingExpiryIsoFromNow()

const { data: expired, error: listErr } = await sb
    .from('properties')
    .select('id, title, expiry_date')
    .eq('status', 'published')
    .eq('is_approved', true)
    .not('expiry_date', 'is', null)
    .lte('expiry_date', now)

if (listErr) {
    console.error('list failed:', listErr.message)
    process.exit(1)
}

console.log(`expired published listings: ${expired?.length ?? 0}`)
if (!expired?.length) {
    console.log('nothing to update')
    process.exit(0)
}

const ids = expired.map((r) => r.id)
const { data: updated, error: updErr } = await sb
    .from('properties')
    .update({
        expiry_date: newExpiry,
        last_confirmed_at: now,
        updated_at: now,
    })
    .in('id', ids)
    .select('id')

if (updErr) {
    console.error('update failed:', updErr.message)
    process.exit(1)
}

console.log(`updated ${updated?.length ?? 0} properties; new expiry ~ ${newExpiry.slice(0, 10)}`)

const { count } = await sb
    .from('properties')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'published')
    .eq('is_approved', true)
    .or(`expiry_date.is.null,expiry_date.gt.${now}`)

console.log(`visible on site (list query): ${count ?? 0}`)
